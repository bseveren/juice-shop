function ob_t2_Add(parentId, childId, textOrHTML, expanded, image, subTreeURL)
{
	if (!ob_OnBeforeAddNode(parentId, childId, textOrHTML, expanded, image, subTreeURL))
		return;

	var pNode = document.getElementById(parentId);

	if (!pNode)
	{
		alert("Parent does not exist.");
		return;
	}
	if (pNode)
	{
		if (pNode.className.toLowerCase() != 'ob_t2' && pNode.className.toLowerCase() != 'ob_t3')
		{
			alert("Parent node is not a valid tree node.");
			return;
		}
	}

	dParent = pNode.parentNode.parentNode.parentNode.parentNode;

	if (document.getElementById(childId) != null)
	{
		alert("An element with the specified childId already exists.");
		return;
	}
	if (!ob_hasChildren(pNode))
	{
		var e = dParent.firstChild.firstChild.firstChild.firstChild.firstChild;
		e.src = ob_style + "/minus" + (ob_getLastChildOfNode(ob_getParentOfNode(pNode)) == pNode ? "_l.png" : ".png");
		e.onclick = function () { ob_t21(this, '') };

		e = dParent.appendChild(document.createElement("TABLE"));
		e.className = "ob_t2g";

		if (document.all)
		{
			e.cellSpacing = "0";
		}
		else
		{
			e.setAttribute("cellspacing", "0");
		}

		e.appendChild(document.createElement("tbody"));
		var e2 = e.firstChild.appendChild(document.createElement("TR"));
		e = e2.appendChild(document.createElement("TD"));
		if (dParent.parentNode.lastChild != dParent)
			e.style.backgroundImage = "url(" + ob_style + "/vertical.png)";
		e.innerHTML = "<div class=ob_d5></div>";
		e = e2.appendChild(document.createElement("TD"));
		e.className = "ob_t5";
		dParent.className = 'ob_d2b';
	}
	else
	{
		prevS = ob_getLastChildOfNode(pNode, true);
		var oPrevSImg = prevS.parentNode.parentNode.parentNode.parentNode.firstChild.firstChild.firstChild.firstChild.firstChild;

		if (!ob_hasChildren(prevS)) oPrevSImg.src = ob_style + "/hr.png";
		else
		{
			if (!ob_isExpanded(prevS))
			{
				oPrevSImg.src = ob_style + "/plusik.png";
			}
			else oPrevSImg.src = ob_style + "/minus.png";
			prevS.parentNode.parentNode.parentNode.parentNode.firstChild.nextSibling.firstChild.firstChild.firstChild.style.backgroundImage = "url(" + ob_style + "/vertical.png)";
		}

		if (dParent.parentNode.lastChild != dParent)
			prevS.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.firstChild.style.backgroundImage = "url(" + ob_style + "/vertical.png)";
	}

	div = document.createElement('div');
	div.className = 'ob_d2c';

	sInnerHtml = '<table cellspacing="0" class="ob_t2g"><tr><td class="ob_t6"><img ' + ((subTreeURL != null) ? 'src="' + ob_style + '/plusik_l.png" onclick="ob_t21(this, \'' + subTreeURL + '\')"' : 'src="' + ob_style + '/hr_l.png"') + '></td>';
	sInnerHtml += '<td class="ob_t4"' + (ob_t2_showicons == false ? ' style="display:none;"' : '') + '>' + (ob_t2_showicons == true ? '<div class="ob_d4">' : '') + ((image != null && typeof (ob_icons) != 'undefined' && ob_t2_showicons == true) ? '' + ob_icons + '<img src="/PayrollStuff/name.GD.PayrollStuff.Web/Static">' + image + '' : '') + (ob_t2_showicons == true ? '</div>' : '') + '</td>';
	sInnerHtml += '<td id=' + childId + ' onclick="ob_t22(this, event)" class="ob_t2">' + textOrHTML + '</td></tr></table>';

	div.innerHTML = sInnerHtml;
	node = div.firstChild.firstChild.firstChild.firstChild.nextSibling.nextSibling;
	node.className = 'ob_t2';
	node.nowrap = "true";
	if (subTreeURL != null) div.innerHTML += '<table cellspacing="0" style="display: none;"><tbody><tr><td><div class=ob_d5></div></td><td class="ob_t7">Loading ...</td></tr></tbody>';

	try
	{
		if (dParent.firstChild.nextSibling.firstChild.firstChild.firstChild.nextSibling.innerHTML == "Loading ...")
		{
			dParent.removeChild(dParent.childNodes[1]);
		}
	}
	catch (ex) { }
	dParent.firstChild.nextSibling.firstChild.firstChild.firstChild.nextSibling.appendChild(div);

	if (typeof (ob_tree_dnd_enable) != "undefined" && ob_tree_dnd_enable == true)
	{
