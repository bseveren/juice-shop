class Helper:
    # These dictionaries map a topic name to either an alias, or a tuple
    # (label, seealso-items).  The "label" is the label of the corresponding
    # section in the .rst file under Doc/ and an index into the dictionary
    # in pydoc_data/topics.py.
    #
    # CAUTION: if you change one of these dictionaries, be sure to adapt the
    #          list of needed labels in Doc/tools/extensions/pyspecific.py and
    #          regenerate the pydoc_data/topics.py file by running
    #              make pydoc-topics
    #          in Doc/ and copying the output file into the Lib/ directory.
    keywords = {
        'False': '',
        'None': '',
        'True': '',
        'and': 'BOOLEAN',
        'as': 'with',
        'assert': ('assert', ''),
        'async': ('async', ''),
        'await': ('await', ''),
        'break': ('break', 'while for'),
        'class': ('class', 'CLASSES SPECIALMETHODS'),
        'continue': ('continue', 'while for'),
        'def': ('function', ''),
        'del': ('del', 'BASICMETHODS'),
        'elif': 'if',
        'else': ('else', 'while for'),
        'except': 'try',
        'finally': 'try',
        'for': ('for', 'break continue while'),
        'from': 'import',

    def getline(self, prompt):
        """Read one line, using input() when appropriate."""
        if self.input is sys.stdin:
            return input(prompt)
        else:
            self.output.write(prompt)
            self.output.flush()
            return self.input.readline()

    def help(self, request, is_cli=False):
        if isinstance(request, str):
            request = request.strip()
            if request == 'keywords': self.listkeywords()
            elif request == 'symbols': self.listsymbols()
            elif request == 'topics': self.listtopics()
            elif request == 'modules': self.listmodules()
            elif request[:8] == 'modules ':
                self.listmodules(request.split()[1])
            elif request in self.symbols: self.showsymbol(request)
            elif request in ['True', 'False', 'None']:
                # special case these keywords since they are objects too
                doc(eval(request), 'Help on %s:', is_cli=is_cli)
            elif request in self.keywords: self.showtopic(request)
            elif request in self.topics: self.showtopic(request)
            elif request: doc(request, 'Help on %s:', output=self._output, is_cli=is_cli)
            else: doc(str, 'Help on %s:', output=self._output, is_cli=is_cli)
        elif isinstance(request, Helper): self()
        else: doc(request, 'Help on %s:', output=self._output, is_cli=is_cli)
        self.output.write('\n')
