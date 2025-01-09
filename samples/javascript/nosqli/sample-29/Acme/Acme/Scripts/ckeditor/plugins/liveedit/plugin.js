CKEDITOR.plugins.add( 'liveedit', {
    init: function( editor ) {
		/**************************************
		 * VISIBILITY STATE FUNCTIONS 
		 * - support CROSS BROWSER visibilitychange events to disable and restart polling 
		 *************************************/
		 // determine which vendor prefixed property is available
		function getHiddenProp(){
			var prefixes = ['webkit','moz','ms','o'];
			
			// if 'hidden' is natively supported just return it
			if ('hidden' in document) return 'hidden';
			
			// otherwise loop over all the known prefixes until we find one
			for (var i = 0; i < prefixes.length; i++){
				if ((prefixes[i] + 'Hidden') in document) 
					return prefixes[i] + 'Hidden';
			}

			// otherwise it's not supported
			return null;
		}
		// check if the document is currently hidden
		function isHidden() {
			var prop = getHiddenProp();
			if (!prop) return false;
			
			return document[prop];
		} 
		// called on visibility change event
		//function visChange() {
		//	if (isHidden()) {
		//		 updatePollActive=false;
		//	} else {
		//		updatePollActive=true;
		//		startUpdatePoll(editor);
		//	}
	//	}
		// BIND visibility change event
		// use the property name to generate the prefixed event name
		//var visProp = getHiddenProp();
		//if (visProp) {
	//	  var evtname = visProp.replace(/[H|h]idden/,'') + 'visibilitychange';
	//	  document.addEventListener(evtname, visChange);
	//	}


		/**************************************************
		 * POLLING
		 **************************************************/
		var updatePollActive=true;
		liveEditDataVersion=0;
		// ensure configuration								
		//if (!editor.config.pollUrl) alert("Invalid configuration, you must provide configuration option pollUrl to the editor.");
		//if (!editor.config.saveUrl) alert("Invalid configuration, you must provide configuration option saveUrl to the editor.");
		if (!editor.config.pollTimeOut) editor.config.pollTimeOut=4000;
		if (!editor.config.saveTimeOut) editor.config.saveTimeOut=500;
		if (!editor.config.requestParameters) editor.config.requestParameters='';
		// recursive timeout function is called when a request completes
		var callUpdateCallBack=function(record) {
			if (window[editor.config.updateCallBack]) window[editor.config.updateCallBack](record);
		}
		
		function replaceContent(editor,content,record) {
			// save cursor position/selection
			var selection = editor.getSelection();
			var range = selection.getRanges()[0];
			if (range) {
				var startPath=CSSelector(range.startContainer.$);
				var startPathParts=startPath.split('>');
				if (range.startContainer.$.nodeType ==3 ) {
					startPath=startPathParts.slice(0,startPathParts.length-1).join('>');
				}
				var endPath=CSSelector(range.startContainer.$);
				var endPathParts=endPath.split('>');
				if (range.endContainer.$.nodeType ==3 ) {
					endPath=endPathParts.slice(0,endPathParts.length-1).join('>');
				}
				var savedSelection={
					startPath : startPath.toString(),
					startOffset : range.startOffset,
					endPath : endPath.toString(),
					endOffset : range.endOffset
				
                };
				// modify texts
				editor.setData(DOMPurify.sanitize(record.description, domPurifyConfig));
                liveEditDataVersion=record.version;
				callUpdateCallBack(record);
				// restore selection
              //  editor.focus();

                var startPathElem = editor.document.findOne(savedSelection.startPath);
                var endPathElem = editor.document.findOne(savedSelection.endPath);
                if (startPathElem !== null && endPathElem !== null) {
                    var startElement = editor.document.findOne(savedSelection.startPath).getFirst();
                    var endElement = editor.document.findOne(savedSelection.endPath).getFirst();
                    // replace full selection
                    if (startElement && endElement) { 
                    	var range = editor.createRange();
                    	try {
                    		range.setStart( startElement,savedSelection.startOffset );
                    		range.setEnd( startElement,savedSelection.endOffset );
                    		selection.selectRanges( [ range ] );
                    	} catch (e) {
                    		console.log(['FAIL REPLACE RANGE',e]);
                    	}
                    }
                }
               setTimeout(function(){
                    var range = editor.createRange();
                    range.moveToElementEditEnd( range.root );
                    editor.getSelection().selectRanges( [ range ] );
                },100);
			} else {
				// no selection exists so just modify text
				editor.setData(DOMPurify.sanitize(record.description, domPurifyConfig));
                setTimeout(function(){
                    var range = editor.createRange();
                    range.moveToElementEditEnd( range.root );
                    editor.getSelection().selectRanges( [ range ] );
                },100);
                liveEditDataVersion=record.version;
				callUpdateCallBack(record);
			}
		}

		var startUpdatePoll = function(editor) {
            pollUrl = editor.config.pollUrl;
            var res = pollUrl.split("id=");
            if(res[1] != '' && res[1] != '00000000-0000-0000-0000-000000000000' && res[1] != 'undefined' && res[1] != 'null'){
			if (updateTimer) clearTimeout(updateTimer);
			updateTimer=setTimeout(function() {
				if (updatePollActive) {  
					$.ajax(
                        pollUrl + "&currentVersion=" + liveEditDataVersion,
						{
							cache: false,
							dataType:"json"
						}
					).done(function(content) {
						if (content && content.success ) {
                            if (content.success.length > 0 && content.success[0].description) {
                                if (liveEditDataVersion != content.success[0].version) {
                                    MODULES.saveConfirmation($("#liveEditEditorUpdated").val());
                                }
								replaceContent(editor,content,content.success[0]);
							}
						}	
					}).always(function() {
						startUpdatePoll(editor);											
					});										
				}
                    else {
		            startUpdatePoll(editor);
				}
			},editor.config.pollTimeOut);
        }
		}

		function bindKeyUp(editor) {
            editor.on('contentDom', function() {
              
				var editable = editor.editable();
				var callChangeCallBack=function() {
					if (window[editor.config.changeCallBack]) window[editor.config.changeCallBack]();
				}
				var callSaveCallBack=function(record) {
					if (window[editor.config.saveCallBack]) window[editor.config.saveCallBack](record);
                }
				editable.attachListener( editor.document, 'keyup', function() {
					updatePollActive=false;
					callChangeCallBack();
					if (saveTimer) clearTimeout(saveTimer);                    
                 //    console.log(editor.config.pollUrl);
                    var pollURL = editor.config.pollUrl;
                    var res = pollURL.split("id=");
                    if(res[1] != '' && res[1] != '00000000-0000-0000-0000-000000000000' && res[1] != 'undefined' && res[1] != 'null'){
					saveTimer=setTimeout(function() {
                        var doSave = function () {
                            var val = editor.getData();
                            var data = editor.config.saveData;
                            // first check if there are any recent saves we might overwrite
                       $.ajax({
                           url: pollURL + "&currentVersion=" + liveEditDataVersion,
                                dataType: 'json',
                                cache: false,
                                success: function (resp) {
                                },
                                error: function (resp) {
                                    console.log('error');
                                    console.log(resp);
                                }
                            }).done(
                                function (response) {
									var requestSave = function(body) {
										data.description = UTILS.encodeHtml(body);
                                        $.ajax(
                                            editor.config.saveUrl,//  + "?" + editor.config.requestParameters,
                                            {
                                                data: JSON.stringify(data),
                                                dataType: 'json',
                                                cache: false,
                                                method: 'POST',
                                                contentType: 'application/json; charset=utf-8'
                                            }
										).done(
											function(response) {
                                                if (response.success && response.success.id) {
												//	replaceContent(editor,response,response.success); 
													updatePollActive=true;
                                                    liveEditDataVersion = response.success.version;
												}
												startUpdatePoll(editor);
											}
										).fail(function() {MODULES.errorConfirmation([$("#liveEditEditorFailSave").val()])}) ;
                                    }
									// no results means we can just save
                                    if (response.success) {
                                      //  alert('insuccess');
										if (response.success.length==0)  {
												requestSave(editor.getData());
										// existing changes - ask the user to reload or force overwrite	
										} else if (response.success && response.success.length > 0) {


                                        dataConfirmWindow.data("kendoWindow").content($("#msgLiveEditConfirmation").html()).center().open();
                                            $(".k-window-titlebar").nextAll('.row').empty();
                                            $(".live-edit-user").empty();
                                            $(".live-edit-user").text(response.success[0].userFirstName +'  '+response.success[0].userLastName);
                                            dataConfirmWindow.parent().find(".k-window-action").css("visibility", "hidden");
                                            $(".liveedit-confirm-ok").click(function () {    
                                                replaceContent(editor,response,response.success[0]); 
                                                liveEditDataVersion=response.success[0].version;
												callUpdateCallBack(response.success[0]);
												startUpdatePoll(editor);
                                                dataConfirmWindow.data("kendoWindow").close();
                                            });

                                            $(".liveedit-confirm-cancel").click(function () {
                                                dataConfirmWindow.data("kendoWindow").close();
                                                return false;
                                            });

    
											// reload with other changes
                                          //  alert('confirm');
										/*	if (confirm($("#liveEditGetConflictMessage").val())) {

												replaceContent(editor,response,response.success[0]); 
                                                liveEditDataVersion=response.success[0].version;
												callUpdateCallBack(response.success[0]);
												startUpdatePoll(editor);

											// force these changes
											} else {
												requestSave(editor.getData());
											}*/








										}
									} else {
										MODULES.errorConfirmation([$("#liveEditEditorFailSave").val()]);
									}
								}
							) // end done
						}
						doSave();
					},editor.config.saveTimeOut);
                }

        if(editor.config.pollUrl){
		    bindKeyUp(editor);
            dataConfirmWindow = $("<div />").kendoWindow({
                width: "450px",
                title: localStorage.getItem("confirm"),
                resizable: false,
                modal: true
            });
        }
