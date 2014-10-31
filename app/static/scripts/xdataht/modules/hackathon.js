
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

define(['jquery', './util/ui_util', './graph/table', './util/rest', './graph/timeline', './graph/attr_chart', './graph/map', './graph/wordcloud'],
    function($, ui_util, table, rest, timeline, attr_chart, map, wordcloud) {
	var WIDGET_TITLE_HEIGHT = 20,
		TRANSITION_TIME = 700;

    var createWidget = function(container, baseUrl, tip, type) {
		var adSearchWidgetObj = {
			movementPanel: {height:WIDGET_TITLE_HEIGHT,uncollapse:120,collapsed:true},
			mapPanel: {height:WIDGET_TITLE_HEIGHT,uncollapse:233,collapsed:true},
			wordCloudPanel: {height:WIDGET_TITLE_HEIGHT,uncollapse:200,collapsed:true},
			attributesPanel: {height:WIDGET_TITLE_HEIGHT,uncollapse:300,collapsed:true},
			timeline : null,
			wordCloud:null,
			attrChart: null,
			sidePanelWidth:300,

			init: function() {
				var that = this;
				var jqContainer = $(container);
				this.detailsCanvas = $('<div/>');
				this.detailsCanvas.css({
					position:'absolute',
					top:'22px',
					right:'0px',
					left:'0px',
					bottom:'0px', 
					overflow:'auto',
					'border-top':'1px solid #DEDEDE', 
					'border-right':'1px solid #DEDEDE'});
				jqContainer.append(this.detailsCanvas);
				
				this.createTipEntry();
				
				if (tip && tip.length>1) {
					this.tipInputBox.val(tip);
					this.onSearchTip(type);
				}
				this.initSidePanels();

			},

			initSidePanels: function () {
				var that = this,
					jqContainer = $(container),
					startX = 0, startY = 0;
				var sidePanels = [
					{panel:this.movementPanel, label:'Movement'},
					{panel:this.mapPanel, label:'Map'},
					{panel:this.wordCloudPanel,label:'Word Cloud'},
					{panel:this.attributesPanel,label:'Attributes'}
				];
				var getUpper = function (upperPanelsCount, attr) {
					var upper = 0, i = 0;
					for(i;i<upperPanelsCount;i++) {
						upper += parseFloat(sidePanels[i].panel.header.css(attr));
					}
					return upper;
				};
				var	makeCollapsible = function(sidePanel) {
					sidePanel.collapseDiv = $('<div/>').addClass('ui-icon ui-icon-triangle-1-e')
						.css({
							position:'relative',
							float:'left',
							cursor:'pointer',
							width:'16px',
							height:'16px'
						});
					sidePanel.label.css({
						height:WIDGET_TITLE_HEIGHT+'px',
						cursor:'pointer',
						position:'relative',
						width: 'calc(100% - 17px)',
						float:'left',
						'padding-top':'1.5px',
						'font-weight':'bold',
						'white-space': 'nowrap',
						color: '#076B88',
						overflow:'hidden'
					});
					sidePanel.header.append(sidePanel.collapseDiv);
					sidePanel.header.append(sidePanel.label);
					sidePanel.header.on('click', function(event) {
						var i,
							numUncollapsed = 0;
						if (sidePanel.collapsed) {
							var heightToSteal = 0,
								heightTaken = 0,
								curHeightTaken;

							sidePanel.collapsed = false;
							sidePanel.collapseDiv.removeClass('ui-icon-triangle-1-e').addClass('ui-icon-triangle-1-s');

							for (i=0; i<sidePanels.length; i++) {
								if (sidePanels[i].panel==sidePanel) continue;
								if (!sidePanels[i].panel.collapsed) {
									numUncollapsed++;
									heightToSteal += sidePanels[i].panel.height;
								}
							}

							if (numUncollapsed>0) {
								for (i=0; i<sidePanels.length; i++) {
									if (sidePanels[i].panel==sidePanel) continue;
									if (!sidePanels[i].panel.collapsed) {
										curHeightTaken = sidePanels[i].panel.height/(numUncollapsed+1);
										sidePanels[i].panel.height -= curHeightTaken;
										heightTaken += curHeightTaken;
									}
								}
								sidePanel.height += heightTaken;
							} else {
								sidePanel.height = sidePanel.uncollapse;
							}
						} else {
							sidePanel.collapsed = true;
							sidePanel.collapseDiv.removeClass('ui-icon-triangle-1-s').addClass('ui-icon-triangle-1-e');

							for (i=0; i<sidePanels.length; i++) {
								if (sidePanels[i].panel==sidePanel) continue;
								if (!sidePanels[i].panel.collapsed) numUncollapsed++;
							}
							if (numUncollapsed>0) {
								for (i=0; i<sidePanels.length; i++) {
									if (sidePanels[i].panel==sidePanel) continue;
									if (!sidePanels[i].panel.collapsed) sidePanels[i].panel.height += sidePanel.height/numUncollapsed;
								}
							}
							sidePanel.uncollapse = sidePanel.height;
							sidePanel.height = WIDGET_TITLE_HEIGHT;
						}
						that.panelResize();
					});
				};
				var	createPanel = function(sidePanel) {
					sidePanel.panel.header = $('<div/>')
						.css({
							width:that.sidePanelWidth+'px',
							top:sidePanel.top+'px',
							position:'absolute'
						}).addClass('moduleHeader');
					sidePanel.panel.label = $('<div/>')
						.css({
							position:'absolute',
							left:'2px',
							top:'1px'
						}).text(sidePanel.label);
					sidePanel.panel.canvas = $('<div/>')
						.css({
							position:'absolute',
							top:WIDGET_TITLE_HEIGHT+'px',
							right:'0px',
							'padding-top':'1.5px',
							width:that.sidePanelWidth+'px',
							height:(sidePanel.height-WIDGET_TITLE_HEIGHT)+'px',
							overflow:'hidden',
							'border-left': '1px solid #DEDEDE',
							cursor: 'default'
						});
					jqContainer.append(sidePanel.panel.header).append(sidePanel.panel.canvas);
				};
				var	makeDraggable = function(upperPanel, sidePanel) {
					sidePanel.header.draggable({
						axis:'y',
						helper: 'clone',
						start: function(event, ui) {
							if (upperPanel.collapsed||sidePanel.collapsed) return false;
							startY = event.clientY;
						},
						stop: function(event, ui) {
							var endY = event.clientY,
								delta = endY-startY;
							if (sidePanel.height-delta<WIDGET_TITLE_HEIGHT) delta = sidePanel.height-WIDGET_TITLE_HEIGHT;
							if (upperPanel.height+delta<WIDGET_TITLE_HEIGHT) delta = WIDGET_TITLE_HEIGHT-upperPanel.height;
							sidePanel.height -= delta;
							upperPanel.height += delta;
							that.panelResize();
						}
					});
				};

				//add the side panels
				for (var i=0; i<sidePanels.length; i++) {
					var panel = sidePanels[i];
					panel.top = getUpper(panel,'top');
					panel.height = getUpper(panel,'height');
					createPanel(panel);
					makeCollapsible(sidePanels[i].panel);
					if (i>0) {
						makeDraggable(sidePanels[i-1].panel,panel.panel);
					}
				}
				
				//resize for side panel
				this.resizeBar = $('<div/>')
					.css({
						position:'absolute',
						bottom:'0px',
						top:'0px',
						width:'3px',
						right:this.sidePanelWidth+'px',
						background:'#EEE',
						cursor:'ew-resize'
					}).draggable({
						axis:'x',
						cursor: 'ew-resize',
						helper: 'clone',
						start: function(event, ui) {
							startX = event.clientX;
						},
						stop: function(event, ui) {
							var endX = event.clientX,
								w = that.sidePanelWidth-(endX-startX);
							if (w<10) w = 10;
							that.sidePanelWidth = w;
							that.panelResize();
						}
					});
				jqContainer.append(this.resizeBar);
				
			},			
			
			createTipEntry: function() {
				var that = this;
				var enterTipContainer = $('<div/>')
						.css({
							'margin':'2px',
							width: '800px',
							height: '22px',
							position: 'relative',
							float:'left',
							'font-weight':'bold'
						}),
				enterTip = $('<div/>')
					.css({
						width:'57px',
						position:'relative',
						float:'left',
						'padding-top':'1px'
					});
                enterTip.text('Enter Tip');
                container.appendChild(enterTipContainer.get(0));
				enterTipContainer.append(enterTip);

                this.tipInputBox = $('<input/>').attr('type','text');
                $(this.tipInputBox).css({
                    position:'relative',
					float:'left',
                	height: '12px',
                	width: '600px'
                }).keypress(function(event) {
                    if (event.keyCode == 13) {
                        that.onSearchTip();
                    }
                });
				enterTipContainer.append(this.tipInputBox);

                this.searchButton = $('<button/>').text('Search').button({
                    text:false,
                    icons:{
                        primary:'ui-icon-search'
                    }
                }).css({
                    position:'relative',
                    top:'0px',
					float:'left',
                    width:'18px',
                    height:'18px'
                }).click(function() {
                    that.onSearchTip();
                });
				enterTipContainer.append(this.searchButton);
			},

			onSearchTip: function(type) {
				var that = this,
					newTip = this.tipInputBox.val();
				if(newTip!==tip&&!type) {
					tip = newTip;
				}
            	this.showLoadingDialog('Loading tip data');
		        rest.get(baseUrl + 'rest/tipAdDetails/' + ((type===null||type===undefined)?'tip':type) + '/' + tip,
		        	'Get tip ads', function(adDetails) {
		        		that.hideLoadingDialog();

						that.detailsCanvas.empty();
						if (that.table) {
							that.table.destroyTable();
						}

						if(adDetails) {
							that.showAdDetails(adDetails, tip);
						} else {
							alert('No ads found for search tip: ' + tip);
						}
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
                var i, j,
					headerList = [],
					objectData = [];
                for (i=0; i<response.memberDetails.length; i++) {
                    var fields = response.memberDetails[i].map.entry;
                    var obj = {};
                    for (j=0; j<fields.length; j++) {
                    	if (i==0) headerList.push(fields[j].key);
                    	obj[fields[j].key] = fields[j].value;
                    }
                    objectData.push(obj);
                }

				this.table = table.createWidget(baseUrl, this.detailsCanvas, headerList, objectData, title);
				this.table.searchFn = function(attribute, value) {
					window.open('http://localhost:8080/openads/hackathon.html?tip='+value)
				};
				
				var entityDetails,
					transformedResponse = { memberDetails : [] };
				for (i=0; i < response.memberDetails.length; i++) {
					entityDetails = {};
					for (j = 0; j < response.memberDetails[i].map.entry.length; j++) {
						entityDetails[response.memberDetails[i].map.entry[j].key] = response.memberDetails[i].map.entry[j].value;
					}
					transformedResponse.memberDetails.push(entityDetails);
				}

				this.showClusterDetails(transformedResponse, title);
            },
            
			showClusterDetails: function(response, title) {
				var headerList = [],
					objectData = [];
				for (var i=0; i<response.memberDetails.length; i++) {
					var fields = response.memberDetails[i];
					if (i==0) {
						for (var field in fields) {
							if (fields.hasOwnProperty(field)) {
								headerList.push(field);
							}
						}
					}
					fields.locationLabel = fields.location;
					objectData.push(fields);
				}

				this.movementPanel.canvas.css('background-image', '');
				this.wordCloudPanel.canvas.css('background-image', '');
				this.mapPanel.canvas.css('background-image', '');
				this.attributesPanel.canvas.css('background-image', '');

				this.movementPanel.canvas.empty();
				if (this.timeline) {
					this.timeline.destroy();
				}
				this.timeline = new timeline.widget(this.movementPanel.canvas.get(0), objectData);
				this.timeline.resize(this.sidePanelWidth, this.movementPanel.height);

				this.mapPanel.canvas.empty();
				this.mapObj = new map.widget(baseUrl, this.mapPanel.canvas.get(0), objectData);
				this.mapObj.resize(this.sidePanelWidth, this.mapPanel.height);

				this.wordCloudPanel.canvas.empty();
				if (this.wordCloud) {
					this.wordCloud.destroy();
				}
				this.wordCloud = new wordcloud.createWidget(baseUrl, this.wordCloudPanel.canvas, objectData);
				this.wordCloud.resize(this.sidePanelWidth, this.wordCloudPanel.canvas.height());

				this.attributesPanel.canvas.empty();
				if (this.attrChart) {
					this.attrChart.destroy();
				}
				this.attrChart = new attr_chart.createWidget(this.attributesPanel.canvas, objectData);
				this.attrChart.resize(this.sidePanelWidth, this.attributesPanel.canvas.height());
			},

			panelResize: function() {
				var totalHeight =  this.movementPanel.height + this.mapPanel.height + this.wordCloudPanel.height + this.attributesPanel.height,
					overflow,
					delta;
				if (totalHeight>this.height && this.wordCloudPanel.height>WIDGET_TITLE_HEIGHT) {
					overflow = totalHeight-this.height;
					delta = Math.min(overflow,this.wordCloudPanel.height-WIDGET_TITLE_HEIGHT);
					this.wordCloudPanel.height -= delta;
					totalHeight -= delta;
				}
				if (totalHeight>this.height && this.attributesPanel.height>WIDGET_TITLE_HEIGHT) {
					overflow = totalHeight-this.height;
					delta = Math.min(overflow,this.attributesPanel.height-WIDGET_TITLE_HEIGHT);
					this.attributesPanel.height -= delta;
					totalHeight -= delta;
				}
				if (totalHeight>this.height && this.mapPanel.height>WIDGET_TITLE_HEIGHT) {
					overflow = totalHeight-this.height;
					delta = Math.min(overflow,this.mapPanel.height-WIDGET_TITLE_HEIGHT);
					this.mapPanel.height -= delta;
					totalHeight -= delta;
				}
				if (totalHeight>this.height && this.movementPanel.height>WIDGET_TITLE_HEIGHT) {
					overflow = totalHeight-this.height;
					delta = Math.min(overflow,this.movementPanel.height-WIDGET_TITLE_HEIGHT);
					this.movementPanel.height -= delta;
					totalHeight -= delta;
				}
				if (totalHeight<this.height && !this.attributesPanel.collapsed) {
					this.attributesPanel.height += this.height-totalHeight;
					totalHeight = this.height;
				}
				if (totalHeight<this.height && !this.wordCloudPanel.collapsed) {
					this.wordCloudPanel.height += this.height-totalHeight;
					totalHeight = this.height;
				}
				if (totalHeight<this.height && !this.mapPanel.collapsed) {
					this.mapPanel.height += this.height-totalHeight;
					totalHeight = this.height;
				}
				if (totalHeight<this.height && !this.movementPanel.collapsed) {
					this.movementPanel.height += this.height-totalHeight;
					totalHeight = this.height;
				}

				this.movementPanel.header.css({width:this.sidePanelWidth + 'px', top:'0px'});
				this.movementPanel.canvas.css({width:this.sidePanelWidth+'px', top:WIDGET_TITLE_HEIGHT + 'px', height:(this.movementPanel.height-WIDGET_TITLE_HEIGHT) + 'px'});
				this.mapPanel.header.css({width:this.sidePanelWidth+'px', top:this.movementPanel.height+'px'});
				this.mapPanel.canvas.css({width:this.sidePanelWidth+'px', top:this.movementPanel.height+WIDGET_TITLE_HEIGHT + 'px', height:(this.mapPanel.height-WIDGET_TITLE_HEIGHT)+'px'});
				this.wordCloudPanel.header.css({width:this.sidePanelWidth+'px', top:this.movementPanel.height+this.mapPanel.height+'px'});
				this.wordCloudPanel.canvas.css({width:this.sidePanelWidth+'px', top:this.movementPanel.height+this.mapPanel.height + WIDGET_TITLE_HEIGHT + 'px', height:(this.wordCloudPanel.height-WIDGET_TITLE_HEIGHT)+'px'});
				this.detailsCanvas.css({right:this.sidePanelWidth+'px',height:this.detailsHeight+'px'});
				this.attributesPanel.header.css({width:this.sidePanelWidth+'px', top:this.movementPanel.height+this.mapPanel.height+this.wordCloudPanel.height+'px'});
				this.attributesPanel.canvas.css({width:this.sidePanelWidth+'px', top:this.movementPanel.height+this.mapPanel.height+this.wordCloudPanel.height+WIDGET_TITLE_HEIGHT+'px', height:(this.attributesPanel.height-WIDGET_TITLE_HEIGHT)+'px'});
				this.resizeBar.css({right:this.sidePanelWidth+'px'});

				if (this.timeline) this.timeline.resize(this.sidePanelWidth, this.movementPanel.canvas.height());
				if (this.mapObj) this.mapObj.resize(this.sidePanelWidth, this.mapPanel.canvas.height());
				if (this.wordCloud) this.wordCloud.resize(this.sidePanelWidth, this.wordCloudPanel.canvas.height());
				if (this.attrChart) this.attrChart.resize(this.sidePanelWidth, this.attributesPanel.canvas.height());

			},
			resize: function(w,h) {
				this.width = w;
				this.height = h;
				this.panelResize();
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
