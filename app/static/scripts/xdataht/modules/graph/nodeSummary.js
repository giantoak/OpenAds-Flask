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
define(['jquery', '../util/ui_util', '../util/rest', '../util/colors'], function($, ui_util, rest, colors) {
	var createWidget = function(appwidget, baseUrl, graph, nodeId) {
		var container= appwidget.nodeSummaryPanel.canvas,
			nodes = graph.nodes,
			findCenter = function() {
				var node,
					i = 0,
					max = -1;
				if(nodeId) {
					return graph.nodeMap[nodeId];
				} else {
					for (i; i < nodes.length; i++) {
						if (nodes[i].ring == 0 && nodes[i]['Cluster Size'] > max) {
							max = nodes[i]['Cluster Size'];
							node = nodes[i];
						}
					}
				}
				return node;
			},
			centerNode = findCenter(),
			widgetObj = {
				centerNode: centerNode,
				$notifier: $('<div/>'),
				checkNode: function(strs){
					if (!appwidget.graphWidget.ATTRIBUTE_MODE) return null;
					var result = {},
						node = null,
						i=0;
					for(i;i<nodes.length;i++) {
						node = nodes[i];
						if(node.label === strs[1]) {
							node.ATTRIBUTE_MODE = true;
							return node;
						}
					}
					return null;
				},
				init: function() {
					var $dropHere,
						that=this,
						$summaryContents = $('<div/>').css({
							position:'relative',
							'padding-left':'5px',
							width:'100%',
							height:'100%',
							'overflow-x':'hidden',
							'overflow-y':'scroll'
						}),
						$id = $('<div/>')
							.css({
								float:'left',
								clear:'both'
							})
							.append($('<span/>')
								.css('font-weight','bold')
								.text('ID:'))
							.append($('<span/>').css('padding-left','2px')
								.text(centerNode.id.trim())
						),
						$name = $('<div/>')
							.css({
								float:'left',
								clear:'both'
							})
							.append($('<span/>')
								.css('font-weight','bold')
								.text('Name:'))
							.append($('<span/>')
								.css('padding-left','2px')
								.text(centerNode.name.trim())
						),
						$label = $('<div/>')
							.css({
								float:'left',
								clear:'both'
							}).
							append($('<span/>')
								.css('font-weight','bold')
								.text('Label:'))
							.append($('<span/>').css('padding-left','2px')
								.text(centerNode.label.trim())
						),
						$clusterSize,
						$latestAd,
						attributeNames = [
							'Email Addresses',
							'Phone Numbers',
							'Websites',
							'Link Reasons',
							'Common Ads'
						];

					this.$notifier.css({
						position: 'absolute',
						bottom: '0px',
						right: '12px',
						color: colors.SUMMARY_NOTIFIER,
						'text-align': 'right'
					});
					container.append(this.$notifier);

					$summaryContents
						.append($id)
						.append($name)
						.append($label);

					if (centerNode['Cluster Size']) {
						$clusterSize = $('<div/>')
							.css({
								float:'left',
								clear:'both'
							})
							.append($('<span/>').css('font-weight','bold')
								.text('Cluster Size:'))
							.append($('<span/>').css('padding-left','2px')
								.text(centerNode['Cluster Size'])
						);
						$summaryContents.append($clusterSize);
					}

					if (centerNode.latestad) {
						$latestAd = $('<div/>')
							.css({
								float:'left',
								clear:'both'
							})
							.append($('<span/>').css('font-weight','bold')
								.text('Latest Ad:'))
							.append($('<span/>').css('padding-left','2px')
								.text(centerNode.latestad)
						);
						$summaryContents.append($latestAd);
					}

					if (centerNode.attributes) {
						$dropHere = $('<div/>').css({
								position: 'absolute',
								top: '0px',
								border: '3px dashed gray',
								width: 'calc(100% - 6px)',
								height: 'calc(100% - 6px)',
								'text-align': 'center',
								'overflow':'hidden'
							}).append($('<span>Drop Here</span>').css({
								position: 'relative',
								top: 'calc(50% - ' + 12 + 'px)',
								'font-size': '24px',
								color: colors.CASE_DROP_HERE,
								'font-weight': 'bold'
							}));
						//we want the attributes to appear in this order
						for (var j = 0; j<attributeNames.length; j++) {
							var attributeName = attributeNames[j];
							if(centerNode.attributes[attributeName]) {
								var attribute = attributeName,
									$attrContainer = $('<div/>').css({float:'left',clear:'both'}),
									$attrHeader = $('<div/>').css('font-weight','bold').text(attributeName.trim() + ':'),
									val = centerNode.attributes[attribute],
									vals = val.split('\n');
								if (vals.length > 0) {
									$attrContainer.append($attrHeader);
									for (var i = 0; i < vals.length && i < 5; i++) {
										var strs = vals[i].split('\t'),
											$rowContainer = $('<div/>').css({
												overflow:'hidden',
												position:'relative',
												width:'100%',
												height:'15px'
											});
										if (strs.length === 2) {
											var $count = $('<div/>'),
												$attr = $('<div/>');

											$count.css({
												'text-align': 'right',
												float:'left',
												'padding-right':'3px',
												width:'30px'
											});

											if(strs[0] !== "") {
												$count.html('<b>' + strs[0] + '</b>:');
											}
											$attr.css({
												'text-align': 'left',
												width: 'calc(100% - 35px)',
												'white-space': 'nowrap',
												float:'left'
											}).text(strs[1]);

											if (attributeName==='Email Addresses' ||
												attributeName==='Phone Numbers' ||
												attributeName==='Websites') {
												var data = {
														'summary' : {
															'value': strs[1],
															'contents' : this.checkNode(strs)
														}
													};

												if(attributeName==='Email Addresses') {
													data.summary.attribute = 'email';
												} else if (attributeName === 'Phone Numbers') {
													data.summary.attribute = 'phone';
												} else {
													data.summary.attribute = 'website';
												}

												$attr.css('cursor','pointer')
													.mouseenter(function () {
														$(this).css({'background-color': colors.SUMMARY_HOVER});
													}).mouseleave(function () {
														$(this).css({'background-color': ''});
													}).draggable({
														opacity: 0,
														helper: 'clone',
														start: function (event) {
															appwidget.buildCasePanel.canvas.append($dropHere);
														},
														stop: function (event) {
															$dropHere.remove();
														}
													}).data('data', data)
													.bind('dblclick', function() {
														that.openAttribute($(this));
													});
											}
											$rowContainer.append($count).append($attr);
											$attrContainer.append($rowContainer);
										} else if (vals[i].length>0) {
											$rowContainer.text(vals[i]);
											$attrContainer.append($rowContainer);
										}
									}
								}
							}
							$summaryContents.append($attrContainer);
						}
					}
					$(container).append($summaryContents);
				},
				openAttribute: function($attrDiv) {
					var that = this,
						data = $attrDiv.data().data.summary,
						case_id = (appwidget.buildCase.currentCase?appwidget.buildCase.currentCase.case_id:null),
						openURL = function(id) {
							id = parseInt(id);
							if(id) {
								var url = baseUrl + 'graph.html?attributeid='+id;
								if(case_id) {
									url += '&case_id=' + encodeURIComponent(case_id);
								}
								window.open(url, "_self");
							} else {
								that.$notifier.text('Error opening graph for ' + data.attribute + ' attribute ' + data.value);
							}
						};
					if(data.contents) {
						openURL(data.contents.id);
					} else {
						this.$notifier.text('Opening graph for ' + data.attribute + ' attribute ' + data.value);
						rest.post(baseUrl + "rest/casebuilder/getsummarydetails/",
							data,
							"nodeSummary fetchSummaryDetails",
							function(result) {
								if(result.details) {
									openURL(result.details.id);
								} else {
									that.$notifier.text('Error opening graph for ' + data.attribute + ' attribute ' + data.value);
								}
							},
							false,
							function() {
								that.$notifier.text('Error opening graph for ' + data.attribute + ' attribute ' + data.value);
							}
						);
					}

				}
			};
		widgetObj.init();
		return widgetObj;
	};

	return {
		createWidget:createWidget
	}
});