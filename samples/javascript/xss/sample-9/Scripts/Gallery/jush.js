var someName = {
	sql_function: 'mysql_db_query|mysql_query|mysql_unbuffered_query|mysqli_master_query|mysqli_multi_query|mysqli_query|mysqli_real_query|mysqli_rpl_query_type|mysqli_send_query|mysqli_stmt_prepare',
	sqlite_function: 'sqlite_query|sqlite_unbuffered_query|sqlite_single_query|sqlite_array_query|sqlite_exec',
	pgsql_function: 'pg_prepare|pg_query|pg_query_params|pg_send_prepare|pg_send_query|pg_send_query_params',

	style: function (href) {
		var link = document.createElement('link');
		link.rel = 'stylesheet';
		link.type = 'text/css';
		link.href = href;
		document.getElementsByTagName('head')[0].appendChild(link);
	},

	highlight: function (language, text) {
		this.last_tag = '';
		return '<span class="someName">' + this.highlight_states([ language ], text.replace(/\r\n?/g, '\n'), (language != 'htm' && language != 'tag'))[0] + '</span>';
	},

	highlight_tag: function (tag, tab_width) {
		var pre = document.getElementsByTagName(tag);
		var tab = '';
		for (var i = (tab_width !== undefined ? tab_width : 4); i--; ) {
			tab += ' ';
		}
		for (var i=0; i < pre.length; i++) {
			var match = /(^|\s)someName($|\s|-(\S+))/.exec(pre[i].className);
			if (match) {
				var s = this.highlight(match[3] ? match[3] : 'htm', this.html_entity_decode(pre[i].innerHTML.replace(/<br(\s+[^>]*)?>/gi, '\n').replace(/<[^>]*>/g, ''))).replace(/\t/g, tab.length ? tab : '\t').replace(/(^|\n| ) /g, '$1&nbsp;');
				if (pre[i].outerHTML && /^pre$/i.test(tag)) {
					pre[i].outerHTML = pre[i].outerHTML.match(/[^>]+>/)[0] + s + '</' + tag + '>';
				} else {
					pre[i].innerHTML = s.replace(/\n/g, '<br />');
				}
			}
		}
	},

	keywords_links: function (state, s) {
		if (state == 'js_write') {
			state = 'js';
		}
		if (/^(php_quo_var|php_sql|php_sqlite|php_pgsql|php_echo|php_phpini)$/.test(state)) {
			state = 'php';
		}
		if (this.links2 && this.links2[state]) {
			var url = this.urls[state];
			s = s.replace(this.links2[state], function (str) {
				for (var i=arguments.length - 4; i > 0; i--) {
					if (arguments[i]) {
						var link = url[0].replace(/\$key/g, url[i]);
						switch (state) {
							case 'php': link = link.replace(/\$1/g, arguments[i].toLowerCase()); break;
							case 'phpini': link = link.replace(/\$1/g, arguments[i].replace(/_/g, '-')); break;
							case 'sql': link = link.replace(/\$1/g, arguments[i].toLowerCase().replace(/\s+|_/g, '-')); break;
							case 'sqlite': link = link.replace(/\$1/g, arguments[i].toLowerCase().replace(/\s+/g, '')); break;
							case 'pgsql': link = link.replace(/\$1/g, arguments[i].toLowerCase().replace(/\s+/g, (i == 1 ? '-' : ''))); break;
							case 'cnf': link = link.replace(/\$1/g, arguments[i].toLowerCase()); break;
							case 'js': link = link.replace(/\$1/g, arguments[i].replace(/\./g, '/')); break;
							default: link = link.replace(/\$1/g, arguments[i]);
						}
						return '<a' + (url[i] ? ' href="' + link + '"' : '') + '>' + arguments[i] + '</a>' + (arguments[arguments.length - 3] ? arguments[arguments.length - 3] : '');
					}
				}
			});
		}
		return s;
	},

	build_regexp: function (tr1, in_php, state) {
		var re = [];
		for (var k in tr1) {
			var s = tr1[k].toString().replace(/^\/|\/[^\/]*$/g, '');
			if ((!in_php || k != 'php') && (state == 'htm' || (s != '(<)(\\/script)(>)' && s != '(<)(\\/style)(>)'))) {
				re.push(s);
			} else {
				delete tr1[k];
			}
		}
		return new RegExp(re.join('|'), 'gi');
	},
	
	highlight_states: function (states, text, in_php, escape) {
		var php = /<\?(?!xml)(?:php)?|<script\s+language\s*=\s*(?:"php"|'php'|php)\s*>/i; // asp_tags=0, short_open_tag=1
		var num = /(?:\b[0-9]+\.?[0-9]*|\.[0-9]+)(?:[eE][+-]?[0-9]+)?/;
		var tr = { // transitions
			htm: { php: php, tag_css: /(<)(style)\b/i, tag_js: /(<)(script)\b/i, htm_com: /<!--/, 0: /(<!)([^>]*)(>)/, tag: /(<)([^<>\s]+)/, ent: /&/ },
			htm_com: { php: php, 1: /-->/ },
			ent: { php: php, 1: /;/ },
			tag: { php: php, att_css: /(\s+)(style)(\s*=\s*)/i, att_js: /(\s+)(on[^=<>\s]+)(\s*=\s*)/i, att: /(\s+)([^=<>\s]*)(\s*)/, 1: />/ },
			tag_css: { php: php, att: /(\s+)([^=<>\s]*)(\s*)/, css: />/ },
			tag_js: { php: php, att: /(\s+)([^=<>\s]*)(\s*)/, js: />/ },
			att: { php: php, att_quo: /=\s*"/, att_apo: /=\s*'/, att_val: /=\s*/, 1: /\s/, 2: />/ },
			att_css: { php: php, att_quo: /"/, att_apo: /'/, att_val: /\s*/ },
			att_js: { php: php, att_quo: /"/, att_apo: /'/, att_val: /\s*/ },
			att_quo: { php: php, 2: /"/ },
			att_apo: { php: php, 2: /'/ },
			att_val: { php: php, 2: /(?=>|\s)|$/ },
			
			css: { php: php, quo: /"/, apo: /'/, com: /\/\*/, css_at: /(@)([^;\s{]+)/, css_pro: /\{/, 2: /(<)(\/style)(>)/i },
			css_at: { php: php, quo: /"/, apo: /'/, com: /\/\*/, css_at2: /\{/, 1: /;/ },
