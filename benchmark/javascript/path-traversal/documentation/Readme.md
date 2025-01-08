# Path Traversal

### Symlinks

In theory it is possible to point to symlinks in a directory if they exist. However, their existence is unlikely. Sometimes, attackers may be able to create symlinks, e.g. included in Zip files. As such, this vulnerability can sometimes be a secondary vulnerability. However, this is quite complex to do and therefore, we will consider this secondary vulnerability as safe for now.

### decodeURL

Encoded URLs can contain patterns like %2ef which represents '../'. Therefore, first checking for '../' and then decoding is dangerous. First decoding and then checking is effective.

### ../ and ..\

We will assume that checking for '../' patterns without checking for '..\' patterns is a downgrade, since we don't know on which platform most code is run.

### Normalize & Resolve

Going over all combinations of normalize <> resolve, relative <> absolute, empty basePath <> non-empty basePath):

```
1. console.log(path.normalize("." + path.sep + "../../etc/passwd"));
../../etc/passwd
2. console.log(path.normalize("./some/folder" + path.sep + "../../etc/passwd"));
etc/passwd
3. console.log(path.normalize("" + path.sep + "../../etc/passwd"));
/etc/passwd
4. console.log(path.normalize("/some/folder" + path.sep + "../../etc/passwd"));
/etc/passwd

5. console.log(path.resolve("." + path.sep + "../../etc/passwd"));
/Users/berg/Aikido/lambda-traces/benchmark/etc/passwd
6. console.log(path.resolve("./some/folder" + path.sep + "../../etc/passwd"));
/Users/berg/Aikido/lambda-traces/benchmark/javascript/code_stuff/etc/passwd
7. console.log(path.resolve("" + path.sep + "../../etc/passwd")); 
/etc/passwd
8. console.log(path.resolve("/some/folder" + path.sep + "../../etc/passwd"));
/etc/passwd
```

So, respectively:


1. Sanitization afterwards is effective
2. Sanitization afterwards is ineffective
3. Arguably unsafe practice - this would give access to root. Likely some kind of long userPath is expected, but can of course easily be attacked. For most cases we assume that the user rightfully gets access to a certain folder and all of its subfolders and that only escaping the basePath folder is dangerous, but this should not be assumed when given access to root
4. Sanitization afterwards is ineffective
5. Sanitization afterwards is ineffective
6. Sanitization afterwards is ineffective
7. Same as 3.
8. Sanitization aferwards is ineffective


All of these cases can still be made safe by checking resolvePath.startsWith('intended/path'); but '../' sanitization happens more often in practice.

### The ..\\ Regex

When testing paths with backslashes ('..\') you have to pay attention to character escaping in javascript string literals as the backslash character is reserved to escape characters. E.g. in const s = '..\..\etc\passwd'; the resulting string doesn't contain any backslash characters. You have to write either const s = '..\\..\\etc\\passwd' or use String.raw (which doesn't escape characters): const s = String.raw`..\..\etc\passwd`