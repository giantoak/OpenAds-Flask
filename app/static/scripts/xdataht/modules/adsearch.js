
/**
 * Copyright (c) 2013 Oculus Info Inc.
 * http://www.oculusinfo.com/
 *
 * Released under the MIT License.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

define(['jquery', './util/ui_util', './graph/table', './util/rest'],
    function($, ui_util, table, rest) {

    var createWidget = function(container, baseUrl) {
		var adSearchWidgetObj = {
			init: function() {
				var that = this;
				var jqContainer = $(container);
				this.detailsCanvas = $('<div/>');
				this.detailsCanvas.css({
					position:'absolute', 
					top:'20px', 
					right:'0px',
					left:'0px',
					bottom:'0px', 
					overflow:'auto',
					'border-top':'1px solid #DEDEDE', 
					'border-right':'1px solid #DEDEDE'});
				jqContainer.append(this.detailsCanvas);
				
				this.createTipEntry();
			},
			
			createTipEntry: function() {
				var that = this;
				var enterTip = $('<div/>');
                enterTip.css({
                	left: '4px',
                	width: '165px',
                	top: '0px',
                	height: '20px',
                	position: 'absolute',
                	'font-weight':'bold'
                });
                enterTip.text('Enter Tip');
                container.appendChild(enterTip.get(0));

                this.tipInputBox = $('<input/>').attr('type','text');
                $(this.tipInputBox).css({
                    position:'absolute',
                    left:'60px',
                	height: '12px',
                	width: '100px'
                }).keypress(function(event) {
                    if (event.keyCode == 13) {
                        that.onSearchTip();
                    }
                });
                enterTip.append(this.tipInputBox);

                this.searchButton = $('<button/>').text('Search').button({
                    text:false,
                    icons:{
                        primary:'ui-icon-search'
                    }
                }).css({
                    position:'absolute',
                    top:'0px',
                    left:'160px',
                    width:'18px',
                    height:'18px'
                }).click(function() {
                    that.onSearchTip();
                });
                enterTip.append(this.searchButton);
			
			},

			onSearchTip: function() {
				var that = this;
				var tip = this.tipInputBox.val();
            	this.showLoadingDialog('Loading tip data');
		        rest.get(baseUrl + 'rest/tipAdDetails/tip/' + tip,
		        	'Get tip ads', function(adDetails) {
		        		that.hideLoadingDialog();
	                	that.showAdDetails(adDetails, tip);
		        	}, true,
		        	function(failedResult) {
		        		that.hideLoadingDialog();
		        		alert('Failed to get tip data ' + failedResult.status + ': ' + failedResult.message);
		        	});
			},
			
			showLoadingDialog: function(message) {
            	this.dialog = $('<div/>');
            	this.dialog.css({'background' : 'url("./img/ajaxLoader.gif") no-repeat center center'});
            	this.dialog.html(message+'. Please wait...');
				this.dialog.dialog();
			},

			hideLoadingDialog: function() {
	        	$(this.dialog).dialog('destroy');
			},
			
            showAdDetails: function(response, title) {
                var headerList = [];
                var objectData = [];
                for (var i=0; i<response.memberDetails.length; i++) {
                    var fields = response.memberDetails[i].map.entry;
                    var obj = {};
                    for (var j=0; j<fields.length; j++) {
                    	if (i==0) headerList.push(fields[j].key);
                    	obj[fields[j].key] = fields[j].value;
                    }
                    objectData.push(obj);
                }

                this.detailsCanvas.empty();

                if (this.table) {
                    this.table.destroyTable();
                }
				this.table = table.createWidget(baseUrl, this.detailsCanvas, headerList, objectData, title);

            },
            panelResize: function() {
				this.detailsCanvas.css({right:this.sidePanelWidth+'px',height:this.detailsHeight+'px'});
            },
            resize: function(w,h) {
				this.width = w;
				this.height = h;
			},
		    displayDetailsSpinners: function() {
                this.detailsCanvas.empty();
		    	this.detailsCanvas.css({'background' : 'url("./img/ajaxLoader.gif") no-repeat center center'});
		    },
            softClear : function() {
                this.detailsCanvas.empty();
            }
		};
		adSearchWidgetObj.init();
		return adSearchWidgetObj;
	};
	
	return {
		createWidget:createWidget
	}
});
