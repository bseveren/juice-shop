function editSomething(id,opisTxt,efektTxt,dataSomeName){
	var editPrzyc=document.getElementById("someRandomLettersIdPrefix"+id);
	editPrzyc.style.display='none';
	
	var adataSomeName=new Array();
	var aData=new Array();
	var aCzas=new Array();
	adataSomeName=dataSomeName.split(' ');
	aData=adataSomeName[0].split('-');
	aCzas=adataSomeName[1].split(':');
	var spanData=document.getElementById('dataSomeName'+id);
	spanData.innerHTML='<input style="margin-left: 3px; width:30px" type="text" value="'+aData[0]+'"/>-<input style="margin-left: 3px; width:20px" type="text" value="'+aData[1]+'"/>-<input style="margin-left: 3px; width:20px" type="text" value="'+aData[2]+'"/><input style="margin-left: 3px; width:20px" type="text" value="'+aCzas[0]+'"/>:<input style="margin-left: 3px; width:20px" type="text" value="'+aCzas[1]+'"/>';
	if(opisTxt.length>0){
		p=document.getElementById('someRandomLettersIdPrefix'+id);
		p.style.marginTop="5px";
		p.innerHTML = '<textarea style="background-image: url(images/back-opis.png);background-repeat:no-repeat" rows="5" cols="45" id="someRandomLettersIdPrefix'+id+'">'+opisTxt+'</textarea>';
	}
	newP = document.createElement("p");
	newP.id="someRandomLettersIdPrefix"+id;
	newP.style.marginLeft="10px";
	newP.innerHTML = '<textarea style="background-image: url(images/back-efekt.png);background-repeat:no-repeat" rows="5" cols="45" id="someRandomLettersIdPrefix'+id+'">'+efektTxt+'</textarea><img class="formButton" width="16" height="16" alt="someName efekt" title="someName efekt" src="images/save.png" onClick="saveEfekt('+id+',document.getElementById(\'opisTxt'+id+'\').value, document.getElementById(\'efektTxt'+id+'\').value)"/>';
	opis = document.getElementById("opis"+id);
	opis.parentNode.insertBefore(newP,opis.nextSibling);		//insertAfter
}
