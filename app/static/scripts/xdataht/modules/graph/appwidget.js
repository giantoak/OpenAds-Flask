
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

define(['jquery', '../util/ui_util', './table', './timeline', './attr_chart', './map', './wordcloud', './buildCase', './nodeSummary', './clusterManager', '../util/rest', './linkCriteria', './refine', './graph', './searchpanel', './simplesearchpanel', './pagingpanel', './selection', '../util/colors'],
	function($, ui_util, table, timeline, attr_chart, map, wordcloud, buildCase, nodeSummary, cluster, rest, linkCriteria, refine, graph, searchpanel, simplesearchpanel, pagingpanel, selection, colors) {
	var SIMPLE_SEARCH_WIDTH = 317,
		SIMPLE_SEARCH_HEIGHT = 27,
		WIDGET_TITLE_HEIGHT = 20,
		TRANSITION_TIME = 700,
		BORDER_STYLE = '1px solid '+ colors.BORDER_DARK,

		getClusterDetails = function(baseUrl, datasetName, clustersetName, clusterId, callback) {
			rest.get(baseUrl + 'rest/clusterDetails/' + datasetName + '/' + clustersetName + "/" + clusterId, 'Get cluster details', function(response) {
				var entityDetails, j, i = 0,
					transformedResponse = {
						memberDetails : []
					};

				for (i; i < response.memberDetails.length; i++) {
					 entityDetails = {};
					for (j = 0; j < response.memberDetails[i].map.entry.length; j++) {
						entityDetails[response.memberDetails[i].map.entry[j].key] = response.memberDetails[i].map.entry[j].value;
					}
					transformedResponse.memberDetails.push(entityDetails);
				}

				callback(transformedResponse);
			});
		},

		detailsCallback = function(response, callback) {
			var entityDetails, j, i = 0,
				transformedResponse = { memberDetails : [] };
			for (i; i < response.memberDetails.length; i++) {
				entityDetails = {};
				for (j = 0; j < response.memberDetails[i].map.entry.length; j++) {
					entityDetails[response.memberDetails[i].map.entry[j].key] = response.memberDetails[i].map.entry[j].value;
				}
				transformedResponse.memberDetails.push(entityDetails);
			}

			callback(transformedResponse);
		},

		searchTipDetailsCallback = function(graph, widget, callback) {
			var entityDetails, j, i, current, nodeId, key,
				nodeDetails={},
				response = graph.response,
				maxNode = {memberDetails: {length: -1}},
				transformedResponse, nodeMap = {};
			for (var h=0; h<graph.nodes.length;h++) {
				nodeMap[graph.nodes[h].id] = {
					label: graph.nodes[h].name,
					ring: graph.nodes[h].ring
				}
			}
			graph.nodeMap=nodeMap;
			for (var k = 0; k<response.memberDetails.entry.length;k++) {
				transformedResponse = { memberDetails : [] };
				key = response.memberDetails.entry[k].key;
				current = [].concat(response.memberDetails.entry[k].value.memberDetails);
				for (i = 0; i < current.length; i++) {
					entityDetails = {};
					for (j = 0; j < current[i].map.entry.length; j++) {
						entityDetails[current[i].map.entry[j].key] = current[i].map.entry[j].value;
					}
					transformedResponse.memberDetails.push(entityDetails);
				}
				if (transformedResponse.memberDetails.length>maxNode.memberDetails.length && nodeMap[key].ring==0) {
					maxNode = transformedResponse;
					nodeId = key;
				}
				nodeDetails[key] = transformedResponse;
				nodeDetails[key].label = nodeMap[key].label;
			}
			widget.nodeDetails = nodeDetails;
			if(callback) {
				callback(nodeId);
			}
		},

		getPreclusterDetails = function(baseUrl, preclusterType, clusterId, callback) {
			rest.get(baseUrl + 'rest/preclusterDetails/' + preclusterType + "/" + clusterId, 'Get precluster details', function(response) {
				detailsCallback(response, callback);
			});
		},

		getPreclusterSearchDetails = function(baseUrl, graph, widget, callback) {
			var attributeIds = [];
			for (var i=0;i<graph.nodes.length;i++) {
				attributeIds.push(graph.nodes[i].id);
			}
			graph.attributeIds = attributeIds;
			rest.post(baseUrl + "rest/preclusterDetails/fetchAds/",
					'{ids:'+ JSON.stringify(graph.attributeIds) + '}',
				"Cluster Search Details",
				function (response) {
					graph.response=response;
					searchTipDetailsCallback(graph, widget, callback);
				},
				false,
				function () {
					alert('error fetching ads');
				});
		},

		getAttributeSearchDetails = function(baseUrl, graph, widget, callback) {
			var attributeIds = [];
			for (var i=0;i<graph.nodes.length;i++) {
				attributeIds.push(graph.nodes[i].id);
			}
			graph.attributeIds = attributeIds;
			rest.post(baseUrl + "rest/attributeDetails/fetchAds/",
				'{ids:'+ JSON.stringify(graph.attributeIds) + '}',
				"Attribute Search Details",
				function (response) {
					graph.response=response;
					searchTipDetailsCallback(graph, widget, callback);
				},
				false,
				function () {
					alert('error fetching ads');
				});
		},

		getAttributeDetails = function(baseUrl, attribute, value, callback) {
			rest.get(baseUrl + 'rest/attributeDetails/' + attribute + "/" + value, 'Get attribute details', function(response) {
				detailsCallback(response, callback);
			});
		},

		getAttributeIdDetails = function(baseUrl, attributeid, callback) {
			rest.get(baseUrl + 'rest/attributeDetails/id/' + attributeid, 'Get attribute id details', function(response) {
				detailsCallback(response, callback);
			});
		},

		createWidget = function(container, baseUrl) {
			var linkWidgetObj = {
				searchPanel: null,
				graphCanvasContainer: null,
				simpleSearchContainer: null,
				simpleSearch: null,
				movementPanel: {},
				mapPanel: {},
				wordCloudPanel: {},
				attributesPanel: {},
				buildCasePanel: {},
				nodeSummaryPanel: {},
				timeline : null,
				wordCloud:null,
				attrChart: null,
				buildCase: null,
				nodeSummary:null,
				searchToggleButton:null,
				isAdvancedSearchMode:false,
				sidePanelWidth:null,
				detailsHeight:null,
				visitedNodes:[],
				nodeDetails:{},
				selection:selection.createSelectionManager(),
				init: function() {
					this.amplifyInit();
					this.createGraphCanvas();
					this.createSimpleSearchCanvas();
					this.pagingPanel = pagingpanel.createWidget(this);
					this.initSidePanels();

					//start with the Case Builder and Summary panels expanded
					/*this.buildCasePanel.collapseDiv.click();
					setTimeout(function() {
							that.nodeSummaryPanel.collapseDiv.click();
					}, 50);*/
				},

				amplifyInit: function() {
					var setPanel = function (panel, amp) {
							panel.height = amp.height;
							panel.uncollapse = amp.uncollapse;
							panel.collapsed = amp.collapsed;
						},
						movementPanelAmp = amplify.store('movementPanel'),
						mapPanelAmp = amplify.store('mapPanel'),
						wordCloudPanelAmp = amplify.store('wordCloudPanel'),
						attributesPanelAmp = amplify.store('attributesPanel'),
						buildCasePanelAmp = amplify.store('buildCasePanel'),
						nodeSummaryPanelAmp = amplify.store('nodeSummaryPanel'),
						sidePanelWidthAmp = amplify.store('sidePanelWidth'),
						detailsHeightAmp = amplify.store('detailsHeight');

					movementPanelAmp?setPanel(this.movementPanel,movementPanelAmp):this.movementPanel = {height:WIDGET_TITLE_HEIGHT,uncollapse:120,collapsed:true};
					mapPanelAmp?setPanel(this.mapPanel,mapPanelAmp):this.mapPanel = {height:WIDGET_TITLE_HEIGHT,uncollapse:233,collapsed:true};
					wordCloudPanelAmp?setPanel(this.wordCloudPanel,wordCloudPanelAmp):this.wordCloudPanel = {height:WIDGET_TITLE_HEIGHT,uncollapse:200,collapsed:true};
					attributesPanelAmp?setPanel(this.attributesPanel,attributesPanelAmp):this.attributesPanel = {height:WIDGET_TITLE_HEIGHT,uncollapse:300,collapsed:true};
					buildCasePanelAmp?setPanel(this.buildCasePanel,buildCasePanelAmp):this.buildCasePanel = {height:WIDGET_TITLE_HEIGHT,uncollapse:316,collapsed:true};
					nodeSummaryPanelAmp?setPanel(this.nodeSummaryPanel,nodeSummaryPanelAmp):this.nodeSummaryPanel = {height:WIDGET_TITLE_HEIGHT,uncollapse:200,collapsed:true};
					this.sidePanelWidth = sidePanelWidthAmp?sidePanelWidthAmp:300;
					this.detailsHeight = detailsHeightAmp?detailsHeightAmp:300;
				},

				initSidePanels: function () {
					var that = this,
						jqContainer = $(container),
						startX = 0, startY = 0,
						sidePanels = [
							{
								panel:this.nodeSummaryPanel,
								label:'Summary'
							},
							{
								panel:this.buildCasePanel,
								label:'Case Builder'
							},
							{
								panel:this.movementPanel,
								label:'Movement'
							},
							{
								panel:this.mapPanel,
								label:'Map'
							},
							{
								panel:this.wordCloudPanel,
								label:'Word Cloud'
							},
							{
								panel:this.attributesPanel,
								label:'Attributes'
							}
						],
						getUpper = function (upperPanelsCount, attr) {
							var upper = 0,
								i = 0;
							for(i;i<upperPanelsCount;i++) {
								upper += parseFloat(sidePanels[i].panel.header.css(attr));
							}
							return upper;
						},
						makeCollapsible = function(sidePanel) {
							sidePanel.collapseDiv = $('<div/>')
								.addClass('ui-icon')
								.addClass(sidePanel.collapsed?'ui-icon-triangle-1-e':'ui-icon-triangle-1-s')
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
								color: colors.SIDEPANEL_LABEL,
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
						},
						createPanel = function(sidePanel) {
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
									'border-left': BORDER_STYLE,
									cursor: 'default'
								});
							jqContainer.append(sidePanel.panel.header).append(sidePanel.panel.canvas);
						},
						makeDraggable = function(upperPanel, sidePanel) {
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

					//add other elements
					this.detailsCanvas = $('<div/>')
						.css({
							'background':'url(\'img/table.png\')',
							'background-position':'center',
							'background-repeat':'no-repeat',
							'background-size':'100% 100%',
							position:'absolute',
							height:this.detailsHeight+'px',
							right:this.sidePanelWidth+'px',
							left:'0px',
							bottom:'0px',
							overflow:'auto',
							'border-top':BORDER_STYLE,
							'border-right':BORDER_STYLE,
							cursor: 'default'
						});
					jqContainer.append(this.detailsCanvas);

					this.searchToggleButton = $('<div/>')
						.button({
							text:false,
							disabled:true,
							icons:{
								primary:'ui-icon-triangle-1-e'
							},
							label:'Advanced controls (disabled)'
						})
						.css({
							position:'absolute',
							top:WIDGET_TITLE_HEIGHT+4+'px',
							left:'2px',
							margin:'0px',
							width:'20px',
							height:'20px',
							display: 'none' //TODO remove
						})
						.click(function() {
							if (that.isAdvancedSearchMode) {
								that.onSimpleSearch();
							} else {
								that.onAdvancedSearch();
							}
						});
					jqContainer.append(this.searchToggleButton);

					//resize for side panel
					this.resizeBar = $('<div/>')
						.css({
							position:'absolute',
							bottom:'0px',
							top:'0px',
							width:'3px',
							right:this.sidePanelWidth+'px',
							background:colors.APPWIDGET_RESIZE_BAR,
							cursor:'ew-resize'
						})
						.draggable({
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
								amplify.store('sidePanelWidth', w);
								that.panelResize();
							}
						});
					jqContainer.append(this.resizeBar);

					//resize for details table
					this.detailResizeBar = $('<div/>')
						.css({
							position:'absolute',
							bottom:this.detailsHeight+'px',
							height:'3px',
							left:'0px',
							right:this.sidePanelWidth+'px',
							background:colors.APPWIDGET_RESIZE_BAR,
							cursor:'ns-resize'
						})
						.draggable({
							axis:'y',
							cursor: 'ns-resize',
							helper: 'clone',
							start: function(event, ui) {
								startY = event.clientY;
							},
							stop: function(event, ui) {
								var endY = event.clientY,
									h = that.detailsHeight-(endY-startY);
								if (h<WIDGET_TITLE_HEIGHT) h = WIDGET_TITLE_HEIGHT;
								that.detailsHeight = h;
								amplify.store('detailsHeight', h);
								that.panelResize();
							}
						});
					jqContainer.append(this.detailResizeBar);
				},

				onSimpleSearch: function() {
					var that = this;
					this.graphHeader.animate({left:'0px'}, TRANSITION_TIME/2);
					this.graphCanvasContainer.animate({left:'0px'}, TRANSITION_TIME/2, function() {
						that.graphCanvasContainer.resize();
					});
					this.searchToggleButton.animate({left:'2px'}, TRANSITION_TIME/2, function() {
						that.searchToggleButton.button({
							icons:{
								primary:'ui-icon-triangle-1-e'
							},
							label:'Show advanced controls'
						});
					});
					this.graphPropertiesCanvas.animate({width:'0px'}, TRANSITION_TIME/2, function() {
						that.simpleSearchContainer.animate({top:WIDGET_TITLE_HEIGHT+'px', opacity:1}, TRANSITION_TIME/2);
					});
					this.isAdvancedSearchMode = false;
				},

				doSimpleSearch: function(searchStr,clusterType) {
					var that = this;
					this.softClear();
					this.graphWidget.displayLoader();
					this.pagingPanel.hidePagingControls();
					this.graphWidget.simpleGraph(baseUrl, searchStr, clusterType, function(graph) {
						that.pagingPanel.setFullGraph(graph, null, null, clusterType);
						that.nodeSummaryPanel.canvas.empty();
						that.nodeSummary = new nodeSummary.createWidget(that,baseUrl,graph);
						var clusterid = that.nodeSummary.centerNode.id;
						that.displayDetailsSpinners();
						that.graphWidget.markSelectedCluster(clusterid);
						getPreclusterDetails(baseUrl, clusterType, clusterid, function(response) {
							that.showClusterDetails(response, that.nodeSummary.centerNode.label);
							that.nodeDetails[clusterid] = response;
						});
					}, function() {
						alert('Error fetching graph');
						that.softClear();
					});
				},

				fetchClusterId: function(clusterid,clusterType) {
					var that = this;
					this.softClear();
					this.graphWidget.displayLoader();
					this.pagingPanel.hidePagingControls();
					this.graphWidget.fetchClusterId(baseUrl, clusterid, clusterType, function(graph) {
						var title = graph.nodes[0].label;
						that.pagingPanel.setFullGraph(graph, null, null, clusterType);
						that.nodeSummaryPanel.canvas.empty();
						that.nodeSummary = new nodeSummary.createWidget(that,baseUrl,graph);
						var clusterid = that.nodeSummary.centerNode.id;
						that.displayDetailsSpinners();
						getPreclusterDetails(baseUrl, clusterType, clusterid, function(response) {
							that.showClusterDetails(response, title);
							that.nodeDetails[clusterid] = response;
						});
						that.graphWidget.markSelectedCluster(clusterid);
					}, function() {
						alert('Error fetching graph');
						that.softClear();
					});
				},

				redirect: function(attribute, value, callback) {
					var that = this,
						$dSpinner = $('#details-spinner');
					this.table.mainDiv.css('display','none');
					$dSpinner.css('display','');
					rest.get(baseUrl + 'rest/attributeDetails/getattrid/'+attribute+'/'+value,
						"get Attribute ID",
						function (response) {
							if(response) {
								var caseid;
								if (that.buildCase.currentCase && that.buildCase.currentCase.case_id) {
									caseid = that.buildCase.currentCase.case_id;
								}
								window.open(baseUrl + 'graph.html?attributeid=' + response + (caseid ? '&case_id=' + caseid : ''), '_self');
							} else {
								that.table.mainDiv.css('display','inline');
								$dSpinner.css('display','none');
								alert('cluster for ' + attribute + ': ' + value + ' could not be found.');
								callback(false);
							}
						},
						function () {
							alert('error fetching cluster for ' + attribute + ': ' + value);
							callback(false);
						});
				},

				fetchAttribute: function(attribute, value) {
					var that = this;
					this.softClear();
					this.graphWidget.displayLoader();
					this.pagingPanel.hidePagingControls();
					this.graphWidget.fetchAttribute(baseUrl, attribute, value, function(graph) {
						that.graphWidget.ATTRIBUTE_MODE = true;
						that.graphWidget.createControlsCanvas();
						that.pagingPanel.setFullGraph(graph, null, null, "attribute");
						that.graphWidget.selectNode(graph.nodes[0].id);
						that.displayDetailsSpinners();
						getAttributeDetails(baseUrl, attribute, value, function(response) {
							that.showClusterDetails(response, graph.nodes[0].label);
						});
					}, function() {
						alert('Error fetching graph');
						that.softClear();
					});
				},

				fetchAttributeId: function(attributeid) {
					var that = this;
					this.softClear();
					this.graphWidget.displayLoader();
					this.pagingPanel.hidePagingControls();
					this.graphWidget.fetchAttributeId(baseUrl, attributeid, function(graph) {
						if (graph) {
							var title = graph.nodes[0].label;
							that.pagingPanel.setFullGraph(graph, null, null, "attribute");
							that.nodeSummaryPanel.canvas.empty();
							that.nodeSummary = new nodeSummary.createWidget(that, baseUrl, graph);
							that.displayDetailsSpinners();
							that.visitedNodes.push(attributeid);
							getAttributeIdDetails(baseUrl, attributeid, function (response) {
								that.showClusterDetails(response, title);
								that.nodeDetails[attributeid] = response;
							});
							that.graphWidget.markSelectedCluster(attributeid);
							that.graphWidget.markVisitedNodes(that.visitedNodes);
						} else {
							alert('Error fetching graph');
							that.softClear();
						}
					}, function() {
						alert('Error fetching graph');
						that.softClear();
					});
				},

				fetchImageGraph: function(imageid) {
					var that = this;
					this.softClear();
					this.graphWidget.displayLoader();
					this.pagingPanel.hidePagingControls();
					this.graphWidget.fetchImageId(baseUrl, imageid, function(graph) {
						var title = graph.nodes[0].label;
						that.pagingPanel.setFullGraph(graph, null, null, 'org');
						that.nodeSummaryPanel.canvas.empty();
						that.nodeSummary = new nodeSummary.createWidget(that,baseUrl,graph);
						that.displayDetailsSpinners();
						var clusterid = that.nodeSummary.centerNode.id;
						getPreclusterDetails(baseUrl, 'org', clusterid, function(response) {
							that.showClusterDetails(response, title);
							that.nodeDetails[clusterid] = response;
							that.table.filterImage(imageid);
						});
						that.graphWidget.markSelectedCluster(clusterid);
					}, function() {
						alert('Error fetching graph');
						that.softClear();
					});
				},
				
				onAdvancedSearch: function() {
					var that = this;
					this.simpleSearchContainer.animate({top:'-50px', opacity:0}, TRANSITION_TIME/2, function() {
						that.graphHeader.animate({left:'300px'}, TRANSITION_TIME/2);
						that.graphCanvasContainer.animate({left:'300px'}, TRANSITION_TIME/2, function() {
							that.graphCanvasContainer.resize();
						});
						that.graphPropertiesCanvas.animate({width:'300px'}, TRANSITION_TIME/2);
						that.searchToggleButton.animate({left:(300+2)+'px'}, TRANSITION_TIME/2,function(){
							that.searchToggleButton.button({
								icons:{
									primary:'ui-icon-triangle-1-w'
								},
								label:'Show simple controls'
							});
						});
					});
					this.isAdvancedSearchMode = true;
				},

				createGraphCanvas: function() {
					var that = this,
						jqContainer = $(container),
						$logout = $('<div/>')
							.text('Logout')
							.button()
							.addClass('logoutButton')
							.css({
								position:'absolute',
								top:'1px',
								right:'-3.5px',
								height:'14px',
								padding: '.1em .5em'
							})
							.on('click',function(event) {
								window.location.href = 'OpenAdsLogout.jsp';
							});

					this.graphHeader = $('<div/>')
						.css({
							height:WIDGET_TITLE_HEIGHT+'px',
							top:'0px',
							left:'0px',
							right:this.sidePanelWidth,
							position:'absolute',
							'border-left': BORDER_STYLE,
							'border-right': BORDER_STYLE
						}).addClass('moduleHeader');
					this.graphLabel = $('<div/>')
						.css({
							position:'absolute',
							left:'2px',
							top:'1px'
						});
					this.graphHeader.append(this.graphLabel).append($logout);
					jqContainer.append(this.graphHeader);

					this.graphCanvasContainer = $('<div/>')
						.css({
							'background':'url(\'img/graph.png\')',
							'background-position':'center',
							'background-repeat':'no-repeat',
							position:'absolute',
							top:WIDGET_TITLE_HEIGHT+'px',
							left:'0px',
							right:this.sidePanelWidth+'px',
							bottom:this.detailsHeight+'px',
							'border-left': BORDER_STYLE,
							'border-right': BORDER_STYLE,
							overflow:'hidden'
						});
					jqContainer.append(this.graphCanvasContainer);

					this.graphWidget = graph.createWidget(this, baseUrl, function(event, datasetName, clustersetName, preclusterType) {
						var clusterId = event.data.id;
						if (event.eventType === 'dblclick') {
							if (datasetName && clustersetName) {
								that.displayDetailsSpinners();
								getClusterDetails(baseUrl, datasetName, clustersetName, clusterId, function (response) {
									that.showClusterDetails(response, clustersetName);
								});
							} else if (preclusterType) {
								if (preclusterType == 'attribute') {
									that.fetchAttributeId(clusterId);
								} else {
									that.fetchClusterId(clusterId, preclusterType);
								}
							} else if (event.data.fields) {
								var html = '';
								for (var field in event.data.fields) {
									html += '<BR/><B>' + field + ':</B>' + ui_util.escapeHtml(event.data.fields[field]);
								}
								that.detailsCanvas.html(html);
							}
						} else if (event.eventType === 'click') {
							that.updatePanels(clusterId);
						}
					});
					this.graphLabel.text('Ads grouped by ' + (this.graphWidget.ATTRIBUTE_MODE?'Attribute':'Entity'))
				},

				updatePanels: function(nodeId) {
					var that = this,
						update = function () {
							that.nodeSummaryPanel.canvas.empty();
							that.nodeSummary = new nodeSummary.createWidget(that,baseUrl,that.graphWidget.linkData, nodeId);
							if(!that.nodeDetails[nodeId].label) {
								that.nodeDetails[nodeId].label = that.graphWidget.linkData.nodeMap[nodeId].label;
							}
							that.showClusterDetails(that.nodeDetails[nodeId]);
						};
					this.displayDetailsSpinners();
					setTimeout(function() {
						if(!that.nodeDetails[nodeId]) {
							if(that.graphWidget.ATTRIBUTE_MODE) {
								getAttributeIdDetails(baseUrl, nodeId, function(response) {
									that.nodeDetails[nodeId] = response;
									update();
								});
							} else {
								getPreclusterDetails(baseUrl, 'org', nodeId, function(response) {
									that.nodeDetails[nodeId] = response;
									update();
								});
							}
						} else {
							update();
						}
					}, 10);
				},

				createSimpleSearchCanvas: function() {
					this.simpleSearchContainer = $('<div/>')
						.css({
						position:'absolute',
						top:WIDGET_TITLE_HEIGHT+'px',
						left:'26px',
						width:SIMPLE_SEARCH_WIDTH + 'px',
						height:SIMPLE_SEARCH_HEIGHT + 'px',
						border:'1px solid ' + colors.BORDER_DARK,
						overflow:'hidden',
						opacity:1,
						display: 'none' //TODO remove
					});
					$(container).append(this.simpleSearchContainer);

					this.simpleSearch = simplesearchpanel.createWidget(this.simpleSearchContainer, this, baseUrl);
				},

				createGraphPropertiesCanvas: function() {
					var jqContainer = $(container);

					this.graphPropertiesHeader = $('<div/>')
						.css({
							height:WIDGET_TITLE_HEIGHT+'px',
							width:'300px',
							top:'0px',
							left:'0px',
							position:'absolute'
						}).addClass('moduleHeader');
					this.graphPropertiesLabel = $('<div/>')
						.css({
							position:'absolute',
							left:'2px',
							top:'1px'
						}).text('Advanced Search');
					this.graphPropertiesHeader.append(this.graphPropertiesLabel);
					jqContainer.append(this.graphPropertiesHeader);

					this.graphPropertiesCanvas = $('<div/>')
						.css({
							top:WIDGET_TITLE_HEIGHT+'px',
							width:'0px',
							bottom:this.detailsHeight+'px',
							left:'0px',
							position:'absolute',
							'overflow-y':'auto'
						});
					jqContainer.append(this.graphPropertiesCanvas);

					this.searchPanel = searchpanel.createWidget(this.graphPropertiesCanvas, this, baseUrl);
				},

				displayLoader: function() {
					this.graphWidget.displayLoader();
				},

				showClusterDetails: function(response, title) {
					var headerList = [],
						objectData = [],
						that = this,
						i = 0, fields;

					if (!title && response.label) {
						title = response.label;
					}

					for (i; i<response.memberDetails.length; i++) {
						fields = response.memberDetails[i];
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

					//add node link click function
					this.graphWidget.selectLinksFn = function(event) {
						var i, j, detailsList, found1, found2,
							val1 = event.data.source.label,
							val2 = event.data.target.label,
							attributes = ['phone', 'email', 'websites'],
							result = [];

						for(i=0;i<objectData.length;i++) {
							found1 = found2 = false;
							for(j=0;j<attributes.length;j++) {
								detailsList = objectData[i][attributes[j]];
								if (!found1 && detailsList && detailsList.indexOf(val1) > -1) {
									found1 = true;
								}
								if (!found2 && detailsList && detailsList.indexOf(val2) > -1) {
									found2 = true;
								}
								if (found1 && found2) {
									result.push(objectData[i].id);
									break;
								}
							}
						}
						that.selection.set('graph', result);
					};

					this.movementPanel.canvas.css('background-image', '');
					this.wordCloudPanel.canvas.css('background-image', '');
					this.mapPanel.canvas.css('background-image', '');
					this.attributesPanel.canvas.css('background-image', '');
					this.detailsCanvas.css('background-image', '');

					this.detailsCanvas.empty();

					if (this.table) {
						this.table.destroyTable();
					}
					this.table = table.createWidget(baseUrl, this.detailsCanvas, headerList, objectData, title, this.selection);
					this.table.searchFn = function(attribute, value, callback) {
						if (attribute=='images') {
							that.fetchImageGraph(value);
						} else {
							that.redirect(attribute, value, callback);
						}
					};

					if (!this.buildCase) {
						var caseId = decodeURIComponent(ui_util.getParameter('case_id'));
						this.buildCase = new buildCase.createWidget(this.buildCasePanel.canvas, baseUrl);
						if(caseId && caseId!=undefined && caseId!=null && caseId!='null') {
							this.buildCase.loadCaseContentsURL(caseId);
						}
					}
					this.buildCase.resize(this.sidePanelWidth, this.buildCasePanel.canvas.height());

					this.movementPanel.canvas.empty();
					if (this.timeline) {
						this.timeline.destroy();
					}
					this.timeline = new timeline.createWidget(this.movementPanel.canvas.get(0), objectData, this.selection);
					this.timeline.resize(this.sidePanelWidth, this.movementPanel.height);

					this.mapPanel.canvas.empty();
					this.mapObj = new map.createWidget(baseUrl, this.mapPanel.canvas.get(0), objectData, this.selection);
					this.mapObj.resize(this.sidePanelWidth, this.mapPanel.height);

					this.wordCloudPanel.canvas.empty();
					if (this.wordCloud) {
						this.wordCloud.destroy();
					}
					this.wordCloud = new wordcloud.createWidget(baseUrl, this.wordCloudPanel.canvas, objectData, this.selection);
					this.wordCloud.resize(this.sidePanelWidth, this.wordCloudPanel.canvas.height());

					this.attributesPanel.canvas.empty();
					if (this.attrChart) {
						this.attrChart.destroy();
					}
					this.attrChart = new attr_chart.createWidget(this.attributesPanel.canvas, objectData);
					this.attrChart.resize(this.sidePanelWidth, this.attributesPanel.canvas.height());

					this.selection.listen('table', function(selectedIds) { that.table.selectionChanged(selectedIds);});
					this.selection.listen('timeline', function(selectedIds) { that.timeline.selectionChanged(selectedIds);});
					this.selection.listen('map', function(selectedIds) { that.mapObj.selectionChange(selectedIds) });
				},

				panelResize: function() {
					var totalHeight =  this.nodeSummaryPanel.height + this.buildCasePanel.height + this.movementPanel.height + this.mapPanel.height + this.wordCloudPanel.height + this.attributesPanel.height,
						overflow,
						delta;
					if (totalHeight>this.height && this.nodeSummaryPanel.height>WIDGET_TITLE_HEIGHT) {
						overflow = totalHeight-this.height;
						delta = Math.min(overflow,this.nodeSummaryPanel.height-WIDGET_TITLE_HEIGHT);
						this.nodeSummaryPanel.height -= delta;
						totalHeight -= delta;
					}
					if (totalHeight>this.height && this.buildCasePanel.height>WIDGET_TITLE_HEIGHT) {
						overflow = totalHeight-this.height;
						delta = Math.min(overflow,this.buildCasePanel.height-WIDGET_TITLE_HEIGHT);
						this.buildCasePanel.height -= delta;
						totalHeight -= delta;
					}
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
					if (totalHeight<this.height && !this.nodeSummaryPanel.collapsed) {
						this.nodeSummaryPanel.height += this.height-totalHeight;
						totalHeight = this.height;
					}
					if (totalHeight<this.height && !this.buildCasePanel.collapsed) {
						this.buildCasePanel.height += this.height-totalHeight;
						totalHeight = this.height;
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

					this.nodeSummaryPanel.header.css({width:this.sidePanelWidth + 'px'});
					this.nodeSummaryPanel.canvas.css({width:this.sidePanelWidth + 'px', height:(this.nodeSummaryPanel.height-WIDGET_TITLE_HEIGHT) + 'px'});
					this.buildCasePanel.header.css({width:this.sidePanelWidth + 'px', top:this.nodeSummaryPanel.height + 'px'});
					this.buildCasePanel.canvas.css({width:this.sidePanelWidth + 'px', top:this.nodeSummaryPanel.height+WIDGET_TITLE_HEIGHT + 'px',height:(this.buildCasePanel.height-WIDGET_TITLE_HEIGHT) + 'px'});
					this.movementPanel.header.css({width:this.sidePanelWidth + 'px', top:this.nodeSummaryPanel.height+this.buildCasePanel.height + 'px'});
					this.movementPanel.canvas.css({width:this.sidePanelWidth+'px', top:this.nodeSummaryPanel.height+this.buildCasePanel.height+WIDGET_TITLE_HEIGHT + 'px', height:(this.movementPanel.height-WIDGET_TITLE_HEIGHT) + 'px'});
					this.mapPanel.header.css({width:this.sidePanelWidth+'px', top:this.nodeSummaryPanel.height+this.buildCasePanel.height+this.movementPanel.height+'px'});
					this.mapPanel.canvas.css({width:this.sidePanelWidth+'px', top:this.nodeSummaryPanel.height+this.buildCasePanel.height+this.movementPanel.height+WIDGET_TITLE_HEIGHT + 'px', height:(this.mapPanel.height-WIDGET_TITLE_HEIGHT)+'px'});
					this.wordCloudPanel.header.css({width:this.sidePanelWidth+'px', top:this.nodeSummaryPanel.height+this.buildCasePanel.height+this.movementPanel.height+this.mapPanel.height+'px'});
					this.wordCloudPanel.canvas.css({width:this.sidePanelWidth+'px', top:this.nodeSummaryPanel.height+this.buildCasePanel.height+this.movementPanel.height+this.mapPanel.height + WIDGET_TITLE_HEIGHT + 'px', height:(this.wordCloudPanel.height-WIDGET_TITLE_HEIGHT)+'px'});
					this.detailsCanvas.css({right:this.sidePanelWidth+'px',height:this.detailsHeight+'px'});
					this.attributesPanel.header.css({width:this.sidePanelWidth+'px', top:this.nodeSummaryPanel.height+this.buildCasePanel.height+this.movementPanel.height+this.mapPanel.height+this.wordCloudPanel.height+'px'});
					this.attributesPanel.canvas.css({width:this.sidePanelWidth+'px', top:this.nodeSummaryPanel.height+this.buildCasePanel.height+this.movementPanel.height+this.mapPanel.height+this.wordCloudPanel.height+WIDGET_TITLE_HEIGHT+'px', height:(this.attributesPanel.height-WIDGET_TITLE_HEIGHT)+'px'});
					this.resizeBar.css({right:this.sidePanelWidth+'px'});
					this.detailResizeBar.css({bottom:this.detailsHeight+'px',right:this.sidePanelWidth+'px'});
					if(this.table) this.table.updateSelectedOverlay();

					if (this.timeline) this.timeline.resize(this.sidePanelWidth, this.movementPanel.canvas.height());
					if (this.mapObj) this.mapObj.resize(this.sidePanelWidth, this.mapPanel.canvas.height());
					if (this.wordCloud) this.wordCloud.resize(this.sidePanelWidth, this.wordCloudPanel.canvas.height());
					if (this.attrChart) this.attrChart.resize(this.sidePanelWidth, this.attributesPanel.canvas.height());

					this.graphHeader.css({right:this.sidePanelWidth});
					this.graphCanvasContainer.css({right:this.sidePanelWidth+'px',bottom:this.detailsHeight+'px'});
					if (this.graphWidget) this.graphWidget.resize(this.width-this.sidePanelWidth, this.graphCanvasContainer.height());
					if (this.graphPropertiesCanvas) this.graphPropertiesCanvas.css({bottom:this.detailsHeight+'px'});

					this.amplifyUpdate();
				},

				amplifyUpdate: function() {
					var amplifyStore = function (panel, amp) {
							var amplifyStore = {
									height: panel.height,
									uncollapse: panel.uncollapse,
									collapsed: panel.collapsed
								};

							amplify.store(amp, amplifyStore);
						};

					amplifyStore(this.nodeSummaryPanel, 'nodeSummaryPanel');
					amplifyStore(this.buildCasePanel, 'buildCasePanel');
					amplifyStore(this.movementPanel, 'movementPanel');
					amplifyStore(this.mapPanel, 'mapPanel');
					amplifyStore(this.wordCloudPanel,'wordCloudPanel');
					amplifyStore(this.attributesPanel,'attributesPanel');
				},

				resize: function(w,h) {
					this.width = w;
					this.height = h;
					this.panelResize();
					if (this.graphWidget) {
						this.graphWidget.resize(w,h);
					}
				},

				displayDetailsSpinners: function() {
					this.movementPanel.canvas.empty();
					this.wordCloudPanel.canvas.empty();
					this.mapPanel.canvas.empty();
					this.attributesPanel.canvas.empty();
					this.detailsCanvas.empty();
					this.movementPanel.canvas.css({'background' : 'url("./img/ajaxLoader.gif") no-repeat center center'});
					this.wordCloudPanel.canvas.css({'background' : 'url("./img/ajaxLoader.gif") no-repeat center center'});
					this.mapPanel.canvas.css({'background' : 'url("./img/ajaxLoader.gif") no-repeat center center'});
					this.attributesPanel.canvas.css({'background' : 'url("./img/ajaxLoader.gif") no-repeat center center'});
					this.detailsCanvas.css({'background' : 'url("./img/ajaxLoader.gif") no-repeat center center'});
				},

				softClear : function() {
					this.graphWidget.empty();
					this.movementPanel.canvas.empty();
					this.mapPanel.canvas.empty();
					this.attributesPanel.canvas.empty();
					this.detailsCanvas.empty();

					this.graphCanvasContainer.css('background-image', '');
					this.movementPanel.canvas.css('background-image', '');
					this.wordCloudPanel.canvas.css('background-image', '');
					this.mapPanel.canvas.css('background-image', '');
					this.attributesPanel.canvas.css('background-image', '');
					this.detailsCanvas.css('background-image', '');

					//this.movementPanel.canvas.append(this.movementPanel.description);

					this.selection.clear();
				}
			};
			linkWidgetObj.init();
			return linkWidgetObj;
	};
	
	return {
		createWidget:createWidget
	}
});
