function SetupDatatableExtensions() {

    //bootstrap sorting headers
    $.extend($.fn.dataTable.ext.oStdClasses, {
        "sSortAsc": "header headerSortDown",
        "sSortDesc": "header headerSortUp",
        "sSortable": "header sortable"
    });

    //Change lenght function
    $.fn.dataTable.ext.oApi.fnLengthChange = function (oSettings, iDisplay) {
        oSettings._iDisplayLength = iDisplay;
        oSettings.oApi._fnCalculateEnd(oSettings);

        /* If we have space to show extra rows (backing up from the end point - then do so */
        if (oSettings._iDisplayEnd === oSettings.aiDisplay.length) {
            oSettings._iDisplayStart = oSettings._iDisplayEnd - oSettings._iDisplayLength;
            if (oSettings._iDisplayStart < 0) {
                oSettings._iDisplayStart = 0;
            }
        }

        if (oSettings._iDisplayLength === -1) {
            oSettings._iDisplayStart = 0;
        }

        oSettings.oApi._fnDraw(oSettings);

        if (oSettings.aanFeatures.l) {
            $('select', oSettings.aanFeatures.l).val(iDisplay);
        }
    };


    //dato sorting
    //Works with format: dd-mm-yyyy HH-mm
    $.extend($.fn.dataTable.ext.oSort, {
        "dateAndTime-dk-pre": function (a) {
            // Format: yyyyMMddHHmm
            return parseInt(a, 10);
        },

        "dateAndTime-dk-asc": function (a, b) {
            return a - b;
        },

        "dateAndTime-dk-desc": function (a, b) {
            return b - a;
        }
    });



    //higlight search text
    $.fn.dataTable.ext.oApi.fnSearchHighlighting = function (oSettings) {
        oSettings.oPreviousSearch.oSearchCaches = {};
        oSettings.oApi._fnCallbackReg(oSettings, 'aoRowCallback', function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
            // Initialize search string array
            var searchStrings = [];
            var oApi = this.oApi;
            var cache = oSettings.oPreviousSearch.oSearchCaches;
            // Global search string
            // If there is a global search string, add it to the search string array
            if (oSettings.oPreviousSearch.sSearch) {
                searchStrings.push(oSettings.oPreviousSearch.sSearch);
            }
            // Individual column search option object
            // If there are individual column search strings, add them to the search string array
            if ((oSettings.aoPreSearchCols) && (oSettings.aoPreSearchCols.length > 0)) {
                for (var i in oSettings.aoPreSearchCols) {
                    if (oSettings.aoPreSearchCols[i].sSearch) {
                        searchStrings.push(oSettings.aoPreSearchCols[i].sSearch);
                    }
                }
            }
            // Create the regex built from one or more search string and cache as necessary
            if (searchStrings.length > 0) {
                var sSregex = searchStrings.join("|");
                if (!cache[sSregex]) {
                    var regRules = "("
                    , regRulesSplit = sSregex.split(' ');

                    regRules += "(" + sSregex + ")";
                    for (let i = 0; i < regRulesSplit.length; i++) {
                        regRules += "|(" + regRulesSplit[i] + ")";
                    }
                    regRules += ")";

                    // This regex will avoid in HTML matches
                    cache[sSregex] = new RegExp(regRules + "(?!([^<]+)?>)", 'ig');
                }
                var regex = cache[sSregex];
            }
            // Loop through the rows/fields for matches
            jQuery('td', nRow).each(function (i) {
                // Take into account that ColVis may be in use
                var j = oApi._fnVisibleToColumnIndex(oSettings, i);
                // Only try to highlight if the cell is not empty or null
                if (aData[j]) {
                    // If there is a search string try to match
                    if ((typeof sSregex !== 'undefined') && (sSregex)) {
                        if(aData[j].display){
                            this.innerHTML = aData[j].display.replace(regex, function (matched) {
                                return "<span class='searchMatches'>" + matched + "</span>";
                            });
                        } else{
                            this.innerHTML = aData[j].replace(regex, function (matched) {
                                return "<span class='searchMatches'>" + matched + "</span>";
                            });
                        }
                    }
                        // Otherwise reset to a clean string
                    else {
                        if(aData[j].display){
                            this.innerHTML = aData[j].display;
                        }
                        else{
                            this.innerHTML = aData[j];
                        }
                    }
                }
            });
            return nRow;
        }, 'row-highlight');
        return this;
    };
