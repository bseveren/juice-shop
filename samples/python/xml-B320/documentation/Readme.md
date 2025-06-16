

# Python `xml.etree` Vulnerability in the `lxml` Library

## Version Documentation

Bandit no longer flags `lxml.etree.<function>` calls as vulnerable. Here's my investigation into why:

📂 **Source code**: https://github.com/lxml/lxml

### 🔍 Default Parser Definition

- **Version 5.0**: [`definition`](https://github.com/lxml/lxml/blob/lxml-5.0/src/lxml/parser.pxi#L1566)
- **Version 4.9.4**: [`definition`](https://github.com/lxml/lxml/blob/lxml-4.9.4/src/lxml/parser.pxi#L1480)

From the definitions:
- In **5.0**, the default parser has `resolve_entities` set to [`"internal"`](https://github.com/lxml/lxml/blob/lxml-5.0/src/lxml/parser.pxi#L1605), meaning **only internal entities** are allowed.
- In **4.9.4**, the default value is `True`, meaning **external entities are also resolved**, making it **potentially vulnerable**.

---

### 🧬 Commit Introducing the Change

- Commit: https://github.com/lxml/lxml/commit/b38cebf2f846e92bd63de4488fd3d1c8b568f397
- Related bug: https://bugs.launchpad.net/lxml/+bug/1742885

---

### 🔐 Bandit Update

- Bandit commit: https://github.com/PyCQA/bandit/commit/e4da0b351f89a82b5de8dd791cbdd963476b5a11
- From **version 1.8.1**, Bandit no longer flags `lxml.etree` calls without custom parsers.

---

## Function Behavior Analysis

Two commonly used methods in `lxml.etree` were analyzed:


### 1. `fromstring`

Even if no parser is explicitly passed, `fromstring()` uses a **default parser**.

Steps:
1. [`fromstring` definition](https://github.com/lxml/lxml/blob/master/src/lxml/etree.pyx#L3411)
2. Calls `__parseMemoryDocument(text, base_url, parser)` ; ([source](https://github.com/lxml/lxml/blob/master/src/lxml/etree.pyx#L3426))
3. `__parseMemoryDocument` calls [`_parseMemoryDocument`](https://github.com/lxml/lxml/blob/fe271a4b5a32e6e54d10983683f2f32b0647209a/src/lxml/parser.pxi#L2047), which calls `_documentFactory(c_doc, parser)`
4. [`_documentFactory`](https://github.com/lxml/lxml/blob/fe271a4b5a32e6e54d10983683f2f32b0647209a/src/lxml/etree.pyx#L632) uses `__GLOBAL_PARSER_CONTEXT.getDefaultParser()` when no parser is provided
5. [`getDefaultParser()`](https://github.com/lxml/lxml/blob/fe271a4b5a32e6e54d10983683f2f32b0647209a/src/lxml/parser.pxi#L97) uses `__DEFAULT_XML_PARSER._copy()`
6. [`__DEFAULT_XML_PARSER = XMLParser()`](https://github.com/lxml/lxml/blob/fe271a4b5a32e6e54d10983683f2f32b0647209a/src/lxml/parser.pxi#L1751)

**Conclusion**: If no parser is passed, the default parser is used, which in **version 4.9.4 has `resolve_entities=True`**, making it vulnerable.


### 2. `parse`

1. [`parse` method definition](https://github.com/lxml/lxml/blob/master/src/lxml/etree.pyx#L2009)
2. Calls [`_parseDocument`](https://github.com/lxml/lxml/blob/fe271a4b5a32e6e54d10983683f2f32b0647209a/src/lxml/parser.pxi#L2013)
3. Eventually also calls `_documentFactory`, as above

**Conclusion**: Same vulnerability risk as `fromstring`.


## ⚠️ Key Points

`lxml.etree.<function>` is vulnerable to **XML External Entity (XXE)** attacks if:

- Using **version ≤ 4.9.4**, and **no parser** is provided with `resolve_entities=False`
- Using **version ≥ 5.0**, but a **custom parser** with `resolve_entities=True` is passed
