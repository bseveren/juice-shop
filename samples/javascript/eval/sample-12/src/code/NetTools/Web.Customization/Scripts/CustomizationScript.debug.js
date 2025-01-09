CustomizationScript.Selection.showContextMenuItem = function CustomizationScript_Selection$showContextMenuItem(index, isVisible) {
    var script = String.format('web_all[customizationContextMenuId].items.getItem({0}).setVisible({1})', index.toString(), (isVisible) ? 'true' : 'false');
    eval(script);
}
