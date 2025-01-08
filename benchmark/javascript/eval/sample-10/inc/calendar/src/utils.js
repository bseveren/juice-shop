someCalendar.Utils.selectOption = function(sel, val, call_default) {
	var a = sel.options, i, o;
	for (i = a.length; --i >= 0;) {
		o = a[i];
		o.selected = (o.val == val);
	}
	sel.value = val;
	if (call_default) {
		if (typeof sel.onchange == "function")
			sel.onchange();
		else if (typeof sel.onchange == "string")
			eval(sel.onchange);
	}
};
