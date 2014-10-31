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
define(['jquery', '../util/rest', '../util/ui_util', './aggregatetimemap', './aggregatetime', './clustertable', '../util/menu', '../util/colors'], function($, rest, ui_util, aggregatetimemap, aggregatetime, clustertable, menu, colors) {
	var GLOBAL_START_TIME = new Date("2012/01/01"),
		GLOBAL_END_TIME = new Date(GLOBAL_START_TIME.getTime()+(3600000*24)*365*4),
		WINDOW_START_TIME = new Date(GLOBAL_START_TIME.getTime()+(3600000*24)*(365+212)),
		WINDOW_END_TIME = new Date(),
		TIMELINE_HEIGHT = 24,
		TITLE_HEIGHT = 20,
		MAP_TOP = 40,
		ATTRIBUTE_MODE = false,

	createWidget = function(container, baseUrl) {
		var overviewWidget = {
			mapContainer: null,
			map: null,
			timeData: [],
			timeChartContainer: null,
			timeChart: null,
			timelineContainer: null,
			timeline: null,
			timeChartHeight: amplify.store('timeChartHeight'),
			mapBottom: amplify.store('mapBottom'),
			location:null,
			init: function() {
				if (this.timeChartHeight===undefined) this.timeChartHeight = 100;
				if (this.mapBottom===undefined) this.mapBottom = this.timeChartHeight+TIMELINE_HEIGHT*2+1;
				this.createMap();
				this.createTimeseries();
			    this.timeChart.fetchData();
				this.createTimelineControl();
				this.createTimeline();
                this.titleDiv = $('<div/>');
                this.titleDiv.css({
                	left: '2px',
                	right: '0px',
                	top: '0px',
                	height: TITLE_HEIGHT+'px',
                	position: 'absolute',
                	'font-family': 'Arial,Helvetica,sans-serif',
                	'font-size': '20px'
                });
                this.titleDiv.text('Public Advertisements for Adult Services - Overview');
                container.appendChild(this.titleDiv.get(0));
                this.createTipEntry();
                this.createServerStatus();
                this.createLogout();
                this.showViewSelector();
			},
			onServerStatus: function() {
                window.open(baseUrl + 'status.html','_blank');
			},
			onVersion: function() {
				window.open(baseUrl + 'version.html','_blank');
			},
			createServerStatus: function() {
				var that = this;
				this.statusButton = $('<button/>').text('OpenAds Setup').button({
                    text:false,
                    icons:{
                        primary:'ui-icon-gear'
                    }
                }).css({
                    position:'absolute',
                    top:'1px',
                    right:'-3px',
                    width:'18px',
                    height:'18px'
                }).click(function(event) {
                	menu.createContextMenu(event, [
                       {type: 'action', label:'OpenAds Version', callback:function() {that.onVersion();}},
                       {type: 'action', label:'Server Status', callback:function() {that.onServerStatus();}},
                       {type: 'action', label:'Switch to ' + (ATTRIBUTE_MODE?'Cluster':'Attribute') + ' Mode', callback:function() {
						   ATTRIBUTE_MODE = !ATTRIBUTE_MODE;
						   if (that.clusterTable && that.clusterTable.mainDiv && that.mapHidden){
							   that.showLoadingDialog('Loading location data');
							   var url = baseUrl + 'rest/overview/locationclusterdetails/';
							   if (ATTRIBUTE_MODE) url = baseUrl + 'rest/overview/locationattributedetails/';
							   rest.post(url,
								   that.location,
								   'Get location clusters', function(clusterDetails) {
									   that.hideLoadingDialog();
									   if ((!clusterDetails) || (!clusterDetails.details) || (!clusterDetails.details.length)) {
										   alert("No results found!");
									   } else {
										   that.clusterTable.mainDiv.remove();
										   that.createClusterTable(that.location, clusterDetails);
										   that.showClusterTimeSeries(clusterDetails.details);
										   that.showFocusControl('From: ' + that.location);
									   }
								   }, true,
								   function(failedResult) {
									   that.hideLoadingDialog();
									   ATTRIBUTE_MODE = !ATTRIBUTE_MODE;
									   $(that.tipInputBox.parent()).css('visibility', (ATTRIBUTE_MODE?'hidden':'visible'));
									   alert('Failed to get location data ' + failedResult.status + ': ' + failedResult.message + '\n A refresh may be required.');
								   });
						   }
					   }}
                	]);
                });
                container.appendChild(this.statusButton[0]);
			
			},
			createLogout: function() {
				var that = this;
				this.logoutButton = $('<button/>').text('Logout').button({
                    text:true
                }).addClass('logoutButton').css({
                    position:'absolute',
                    top:'1px',
                    right:'16px',
                    height:'18px',
                    padding: '.1em .5em'
                }).on('click',function(event) { 
                	window.location.href = 'OpenAdsLogout.jsp';
                });
                container.appendChild(this.logoutButton[0]);
			
			},
			onSearchTip: function() {
				var that = this,
					tip = this.tipInputBox.val(),
					fromClusterTable = this.mapHidden;
				if (tip==null) return;
				tip = tip.trim();
				if (tip.length==0) return;
			    if (this.focusControl) this.focusControl.remove();
            	if(!fromClusterTable) this.hideMap();
            	this.showLoadingDialog('Loading tip data');
            	var url = baseUrl + 'rest/overview/tipclusterdetails/';
            	if (ATTRIBUTE_MODE) url =  baseUrl + 'rest/overview/tipattributedetails/';
		        rest.post(url,
		        	tip,
		        	'Get tip clusters', function(clusterDetails) {
	                	that.showClusterDetails(location, clusterDetails, 'Matching: ' + tip, fromClusterTable);
		        	}, true,
		        	function(failedResult) {
		        		that.hideLoadingDialog();
		        		if (!fromClusterTable) that.showMap();
		        		alert('Failed to get tip data ' + failedResult.status + ': ' + failedResult.message + '\n A refresh may be required.');
		        	});
			},
			onSearchCSV: function(csvContents) {
				var that = this,
					fromClusterTable = this.mapHidden;
			    if (this.focusControl) this.focusControl.remove();
            	if(!fromClusterTable) this.hideMap();
            	this.showLoadingDialog('Loading data matching csv contents');
            	var url = baseUrl + 'rest/overview/csvclusterdetails/';
            	if (ATTRIBUTE_MODE) url =  baseUrl + 'rest/overview/csvattributedetails/';
            	var query = '';
            	var isFirst = true;
            	for (var i=0; i<csvContents.length; i++) {
            		if (csvContents[i]==null) continue;
            		var val = csvContents[i].trim();
            		if (val.length>0) {
            			if (isFirst) isFirst = false;
            			else query += ',';
            			query += val;
            		}
            	}
            	rest.post(url,
		        	query,
		        	'Get csv clusters', function(clusterDetails) {
	                	that.showClusterDetails(location, clusterDetails, 'Matching .csv contents', fromClusterTable);
		        	}, true,
		        	function(failedResult) {
		        		that.hideLoadingDialog();
		        		if(!fromClusterTable) that.showMap();
		        		alert('Failed to get data matching csv ' + failedResult.status + ': ' + failedResult.message + '\n A refresh may be required.');
		        	});
			},
			createTipEntry: function() {
				var that = this;
				var enterTip = $('<div/>');
                enterTip.css({
                	right: '20px',
                	width: '165px',
                	top: '20px',
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
				this.tipInputBox.focus();

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

        		function handleFileDrop(csvContents) {
        			that.onSearchCSV(csvContents);
        		}
        		ui_util.makeFileDropTarget(container, handleFileDrop);

				//disable the drop feature for the window, highlight the tip input box.
				$('#rootContainer').bind({
					dragover: function (e) {
						that.tipInputBox.css('background-color',colors.OVERVIEW_HIGHLIGHT);
					},
					dragleave: function(event) {
						that.tipInputBox.css('background-color', '');
					}
				});
			},
			
			showViewSelector: function() {
				var that = this;
				if (this.focusControl) {
					this.focusControl.remove();
					this.focusControl.empty();
				}
				this.focusControl = $('<div/>');
                this.focusControl.css({
                	left: '2px',
                	top: '23px',
                	height: '20px',
                	position: 'absolute',
                	'font-family': 'Arial,Helvetica,sans-serif',
                	'font-weight': 'bold'
                });
                container.appendChild(this.focusControl.get(0));

                var viewMenu = $('<div/>');
                var viewLabel = $('<div/>').text('View').css({position:'relative',float:'left'});
                viewMenu.css({position:'relative',float:'left',cursor:'pointer'});
                viewMenu.append(viewLabel);
                viewMenu.click(function(event) {
                	menu.createContextMenu(event, [
                       {type: 'action', label:'Total Ads', callback:function() {that.map.setMode(0);}},
                       {type: 'action', label:'Total change in Ads', callback:function() {that.map.setMode(1);}},
                       {type: 'action', label:'Percent change in Ads', callback:function() {that.map.setMode(2);}},
                       {type: 'action', label:'Group by proximity', callback:function() {that.map.setMode(3);}},
                       {type: 'action', label:'Show demographics', callback:function() {that.map.showDemographics();}}
                	]);
                });
                var downDiv = $('<div/>');
                downDiv.addClass('ui-icon ui-icon-triangle-1-s');
                downDiv.css({position:'relative',float:'left'});
                viewMenu.append(downDiv);
                this.focusControl.append(viewMenu);

                var sourceMenu = $('<div/>').css({position:'relative',float:'left','padding-left':'10px',cursor:'pointer'});
                var sourceLabel = $('<div/>').text('Sources').css({position:'relative',float:'left'});
                sourceMenu.append(sourceLabel);
                sourceMenu.click(function(event) {
                	if (that.sourcecounts) {
                		that.showSourceCounts(event);
                	} else {
	                	var url = baseUrl + 'rest/overview/sourcecounts/';
	    		        rest.get(url, 'Get source counts', function(sourcecounts) {
	    		        	that.sourcecounts = sourcecounts;
	    		        	that.showSourceCounts(event);
	    		        });
                	}
                });
                var sourceDownDiv = $('<div/>');
                sourceDownDiv.addClass('ui-icon ui-icon-triangle-1-s');
                sourceDownDiv.css({position:'relative',float:'left'});
                sourceMenu.append(sourceDownDiv);
                this.focusControl.append(sourceMenu);
			
			},

			showSourceCounts: function(event) {
	        	var sourcecount, sourcediv, labeldiv, countdiv,
					items = [], totalCount = 0;
	        	for (var i=0; i<this.sourcecounts.sourcecounts.length; i++) {
	        		sourcecount = this.sourcecounts.sourcecounts[i];
	        		sourcediv = $('<div/>').css({position:'relative',overflow:'hidden'}).
	        			on('mouseover',function(event) {
							$(this).css({background:colors.OVERVIEW_HOVER});
						}).
	        			on('mouseout',function(event) {$(this).css({background:''});});
	        		labeldiv = $('<div/>').text(sourcecount.source).css({position:'relative',float:'left'});
	        		countdiv = $('<div/>').text(sourcecount.count).css({position:'relative',float:'right','padding-left':'5px'});
	        		sourcediv.append(labeldiv).append(countdiv);
					items.push({type: 'div', div: sourcediv});
					totalCount += sourcecount.count;
	        	}

				//add Total count
				sourcediv = $('<div/>').css({position:'relative',overflow:'hidden','border-top':'1px solid gray'}).
					on('mouseover',function(event) {$(this).css({background:colors.OVERVIEW_HOVER});}).
					on('mouseout',function(event) {$(this).css({background:''});});
				labeldiv = $('<div/>').text('Total').css({position:'relative',float:'left','font-weight':'bold'});
				countdiv = $('<div/>').text(totalCount).css({position:'relative',float:'right','padding-left':'5px','font-weight':'bold'});
				sourcediv.append(labeldiv).append(countdiv);
				items.push({type: 'div', div: sourcediv});
	        	menu.createContextMenu(event, items);
			},
			
			showFocusControl: function(focusString) {
				var that = this;
				if (this.focusControl) {
					this.focusControl.remove();
					this.focusControl.empty();
				}
				this.focusControl = $('<div/>');
                this.focusControl.css({
                	left: '2px',
                	right: '200px',
                	top: '23px',
                	height: '20px',
                	position: 'absolute',
                	'font-family': 'Arial,Helvetica,sans-serif'
                });
                this.focusControl.text('Characterization of groups');
                container.appendChild(this.focusControl.get(0));
                this.titleDiv.text('List of Ads grouped by (phone,email,website) - ' + focusString);

                var defocusButton = $('<button/>').text('Back to map').button({
                    text:true
                }).css({
                    position:'absolute',
                    top:'0px',
                    right:'0px',
                    width:'120px',
                    height:'16px',
                	'font-size':'12px'
                }).click(function() {
                    that.defocus();
                }).addClass('defocusbutton');
                this.focusControl.append(defocusButton);
			},
			defocus: function() {
                this.titleDiv.text('Public Advertisements for Adult Services - Overview');
            	this.clusterTableContainer.css({top:'',bottom:(this.mapBottom+3)+'px',left:'0px',right:'',width:this.width+'px',height:(this.height-this.mapBottom-MAP_TOP-4)+'px'});
            	this.clusterTableContainer.animate({width:'0px',height:'0px'}, 500);
            	this.showMap();
				this.timeChartContainer.empty();
				var window = this.timelineControl.getControlWindow();
			    this.timeChart = aggregatetime.createWidget(this.timeChartContainer, baseUrl, window.start, window.end);
				this.timeChart.resize(this.width, this.timeChartHeight);
			    this.timeChart.setData(this.fullTimeData);
			    this.showViewSelector();
			},
			openClusterTable: function(location) {
				var that = this;
				this.location = location;
				this.hideMap();
				this.showLoadingDialog('Loading location data');
				var url = baseUrl + 'rest/overview/locationclusterdetails/';
				if (ATTRIBUTE_MODE) url = baseUrl + 'rest/overview/locationattributedetails/';
				rest.post(url,
					location,
					'Get location clusters', function(clusterDetails) {
						that.showClusterDetails(location, clusterDetails, 'From: ' + location);
						that.fetchLocationTimeseries(location);
					}, true,
					function(failedResult) {
						that.hideLoadingDialog();
						that.showMap();
						alert('Failed to get location data ' + failedResult.status + ': ' + failedResult.message + '\n A refresh may be required.');
					});
			},
			showRelated: function(location) {
				var that = this;
				var url = baseUrl + 'rest/overview/locationclusterdetails/';
				if (ATTRIBUTE_MODE) url = baseUrl + 'rest/overview/locationattributedetails/';
				this.showLoadingDialog('Loading location data');
				rest.post(url,
					location,
					'Get location clusters', function(clusterDetails) {
						that.hideLoadingDialog();
						that.showRelatedLocations(location, clusterDetails);
					}, true,
					function(failedResult) {
						that.hideLoadingDialog();
						alert('Failed to get location data ' + failedResult.status + ': ' + failedResult.message + '\n A refresh may be required.');
					});
			},
			showRelatedLocations: function(location,clusterDetails) {
				var mappings = {}, relatedloc, ad, i, count;
				for (i=0; i<clusterDetails.details.length; i++) {
					ad = clusterDetails.details[i];
					for (relatedloc in ad.locationlist) {
						if (ad.locationlist.hasOwnProperty(relatedloc)) {
							count = Number(ad.locationlist[relatedloc]);
							if (!mappings[relatedloc]) mappings[relatedloc] = 1;
							else mappings[relatedloc]++;
						}
					}
				}
				var relatedlist = [];
				for (relatedloc in mappings) {
					if (mappings.hasOwnProperty(relatedloc)) {
						count = Number(mappings[relatedloc]);
						relatedlist.push({location:relatedloc,count:count});
					}
				}
				relatedlist.sort(function(a,b) { return b.count-a.count; });
				this.map.createLinkLayer(location,relatedlist);
			},
			createMap: function() {
				var that = this;
				var id = ui_util.uuid();
                this.mapContainer = $('<div/>', {id:id});
                this.mapContainer.css({
                	left: '0px',
                	right: '0px',
                	top: MAP_TOP+'px',
                	bottom: this.mapBottom+'px',
                	position: 'absolute'
                });
                container.appendChild(this.mapContainer.get(0));
                this.map = aggregatetimemap.createWidget(this.mapContainer, baseUrl, WINDOW_START_TIME, WINDOW_END_TIME);
                this.map.clickFn = function(event) {
					var location =  event.data.location,
						items = [
						    {
							    type: 'collection',
								label: location,
								items: [
									{
										type: 'action',
										label: 'Show Entity List',
										callback: function () {
											ATTRIBUTE_MODE = false;
											that.openClusterTable(location);
										}
									},
									{
										type: 'action',
										label: 'Show Phone/Email/Website List',
										callback: function () {
											ATTRIBUTE_MODE = true;
											that.openClusterTable(location);
										}
									},
									{
										type: 'action',
										label: 'Show Regions Sharing Entities',
										callback: function () {
//											ATTRIBUTE_MODE = false;
//											that.showRelated(location);
											alert('Not yet implemented');
										}
									}
								]
							}
						];
					menu.createContextMenu(event.source, items);
                };
			},

			fetchLocationTimeseries: function(location) {
				var that = this;
				var url = baseUrl + 'rest/overview/locationtimeseries/';
		        rest.post(url,
		        		location,
		        		'Get location timeseries', function(timeseries) {
		        			that.timeChart.addLines(timeseries.features);
		        }, true,
		        function(failedResult) {
		        	alert('Failed to get location timeseries ' + failedResult.status + ': ' + failedResult.message + '\n A refresh may be required.');
		        });
			},
			
			hideMap: function() {
				if (this.mapHidden) return;
				this.mapHidden = true;
		        this.mapContainer.css({top:'',right:'',width:this.width+'px',height:(this.height-this.mapBottom-MAP_TOP-1)+'px'});
            	this.mapContainer.animate({width:'0px',height:'0px'}, 500);
			},

			showMap: function() {
				this.mapHidden = false;
            	this.mapContainer.css({top:MAP_TOP+'px',right:'0px',width:'',height:''});
				this.showViewSelector();
				this.ontimelinesize();
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
			
			showClusterDetails: function(location, clusterDetails, focusText, fromClusterTable) {
        		this.hideLoadingDialog();
				if ((!clusterDetails) || (!clusterDetails.details) || (!clusterDetails.details.length)) {
					alert("No results found!");
	        		if(!fromClusterTable) this.showMap();
					return;
				}
            	this.createClusterTable(location, clusterDetails);
            	this.showClusterTimeSeries(clusterDetails.details);
			    this.showFocusControl(focusText);
			},
			
			createClusterTable: function(location, clusterDetails) {
				if (this.clusterTableContainer) {
					this.clusterTableContainer.remove();
				}
				this.clusterTableContainer = $('<div/>');
            	container.appendChild(this.clusterTableContainer.get(0));
            	this.clusterTableContainer.css({top:MAP_TOP+'px',bottom:(this.mapBottom+3)+'px',left:'0px',right:'0px',position:'absolute',overflow:'auto'});
            	this.clusterTable = clustertable.createWidget(this.clusterTableContainer, clusterDetails, location);
            	this.clusterTable.clickFn = function(clusterid) {
            		if (ATTRIBUTE_MODE) {
            			window.open(baseUrl + 'graph.html?attributeid=' + clusterid,'_blank');
            		} else {
            			window.open(baseUrl + 'graph.html?clusterid=' + clusterid,'_blank');
            		}
            	};
            	this.clusterTable.resize(this.width, this.height-MAP_TOP-this.mapBottom-4);
			},

			showClusterTimeSeries: function(details) {
				var timemap = {};
				for (var i=0; i<details.length; i++) {
					var cluster = details[i];
					for (var day in cluster.timeseries) {
						if (cluster.timeseries.hasOwnProperty(day)) {
							if (timemap[day]) timemap[day] += cluster.timeseries[day];
							else timemap[day] = cluster.timeseries[day];
						}
					}
				}
				var timeseries = [];
				for (day in timemap) {
					if (timemap.hasOwnProperty(day)) {
						timeseries.push({day:Number(day)*1000,count:timemap[day]});
					}
				}
				timeseries.sort(function(a,b){return b.day-a.day;});
				this.timeChartContainer.empty();
				var window = this.timelineControl.getControlWindow();
				this.fullTimeData = this.timeChart.getData();
			    this.timeChart = aggregatetime.createWidget(this.timeChartContainer, baseUrl, window.start, window.end);
				this.timeChart.barsVisible = amplify.store('barsVisible');
				if(this.timeChart.barsVisible === undefined) {
					this.timeChart.barsVisible = true;
					amplify.store('barsVisible', this.timeChart.barsVisible);
				}
				this.timeChart.resize(this.width, this.timeChartHeight);
			    this.timeChart.setData(timeseries);
			},
			
			createTimeseries: function() {
				this.timeChartContainer = $('<div/>', {id:ui_util.uuid()});
                this.timeChartContainer.css({
                	left: '0px',
                	right: '0px',
                	height: this.timeChartHeight+'px',
                	bottom: '0px',
                	position: 'absolute',
                	'border-left': '2px solid ' + colors.OVERVIEW_TIMELINE_BORDER,
                	'border-right': '2px solid ' + colors.OVERVIEW_TIMELINE_BORDER
                });
                container.appendChild(this.timeChartContainer.get(0));
                this.timeChart = aggregatetime.createWidget(this.timeChartContainer, baseUrl, WINDOW_START_TIME, WINDOW_END_TIME);
			},
			
			createTimeline: function() {
				this.timelineContainer = $('<div/>', {id:ui_util.uuid()});
                this.timelineContainer.css({
                	left: '0px',
                	right: '0px',
                	height: '25px',
                	bottom: this.timeChartHeight+'px',
                	position: 'absolute'
                });
                container.appendChild(this.timelineContainer.get(0));

				var data = {band:{
					"start":WINDOW_START_TIME.getTime(),
					"end":WINDOW_END_TIME.getTime()
				}};
				data.allowWheel = true;
				data.color = colors.OVERVIEW_DATA;

				var that = this;
				var linkFn = function(linkData) {
					var timeWindow = that.timeline.getWindow();
					that.timelineControl.setControlWindow(timeWindow);
					that.timeChart.setTimeWindow(timeWindow.start,timeWindow.end);
					that.map.setTimeWindow(timeWindow.start,timeWindow.end);
				};
				
				// Create the timeline in the DOM
				this.timeline = new aperture.timeline.Timeline( {id:this.timelineContainer.get(0).id, data:data, linker:linkFn} );
				//this.timeline.map('border-width').asValue(0);  // this is not needed - causing border to be drawn in latest aperture update
				this.timeline.wheelZoomListener = linkFn;
				this.timeline.dblclickFn = function(event) {
					if (that.tlIconClickFn) that.tlIconClickFn(event);
				};
				this.timeline.clickFn = function(event) {
					that.setSelection(event.data.archiveid);
				};

				this.timelineContainer.addClass('ui-corner-top');
				this.timelineContainer.css({'border-top':'2px solid ' + colors.OVERVIEW_TIMELINE_BORDER,
					'border-left':'2px solid ' + colors.OVERVIEW_TIMELINE_BORDER,
					'border-right':'2px solid ' + colors.OVERVIEW_TIMELINE_BORDER,
					'border-bottom':'none'});
			},

			createTimelineControl: function(elem) {
				var that = this;
				var id = ui_util.uuid();
				this.timelineControlContainer = $('<div/>', {id:id});
                this.timelineControlContainer.css({
                	left: '0px',
                	right: '0px',
                	height: '25px',
                	bottom: this.timeChartHeight+TIMELINE_HEIGHT+'px',
                	position: 'absolute'
                });
                container.appendChild(this.timelineControlContainer.get(0));

                this.resizeBar = $('<div/>');
                this.resizeBar.css({position:'absolute',bottom:this.mapBottom+'px',height:'3px',left:'0px',right:'0px',background:colors.OVERVIEW_BORDER,cursor:'ns-resize'});
                var startY = 0;
                this.resizeBar.draggable({
                	axis:'y',
        			cursor: 'ns-resize',
        			helper: 'clone',
        			start: function(event, ui) {
        				startY = event.clientY;
            		},
            		stop: function(event, ui) {
            			var endY = event.clientY;
            			var h = that.timeChartHeight-(endY-startY);
            			if (h<10) h = 10;
            			that.timeChartHeight = h;
            			that.mapBottom = that.timeChartHeight+TIMELINE_HEIGHT*2+1;
            			that.ontimelinesize();
            		}
                });
                container.appendChild(this.resizeBar.get(0));

				var data = {
					global_start:GLOBAL_START_TIME.getTime(),
					global_end:GLOBAL_END_TIME.getTime(),
					window_start:WINDOW_START_TIME.getTime(),
					window_end:WINDOW_END_TIME.getTime()
				};
				this.timelineControl = new aperture.timelinecontrol.TimelineControl(this.timelineControlContainer.get(0), id, data);
				this.timelineControl.windowListener = function(start,end) {
					that.timeline.setWindow(start,end);
					that.timeChart.setTimeWindow(start,end);
					that.map.setTimeWindow(start,end);
				};
				this.timelineControl.resizeListener = function(start,delta) {
					that.timelineHeight = that.timelineHeight - delta;
					that.timelineHeight = Math.max(Math.min(that.timelineHeight, that.fullheight*MAX_TIMELINE_PORTION), MIN_TIMELINE_HEIGHT);
					that.resize(that.fullwidth, that.fullheight);
				};
			},
			
			ontimelinesize: function() {
				amplify.store('timeChartHeight', this.timeChartHeight);
				amplify.store('mapBottom', this.mapBottom);
                this.resizeBar.css({bottom:this.mapBottom+'px'});
				if (this.map) {
	                if (!this.mapHidden) this.mapContainer.css({bottom:this.mapBottom+'px'});
					this.map.resize(this.width, this.height-this.mapBottom-MAP_TOP-1);
				}
				if (this.timeChart) {
	                this.timeChartContainer.css({height:this.timeChartHeight+'px'});
					this.timeChart.resize(this.width, this.timeChartHeight);
				}
            	if (this.clusterTable) {
                	if (this.mapHidden) this.clusterTableContainer.css({bottom:(this.mapBottom+3)+'px',height:(this.height-this.mapBottom-MAP_TOP-4)+'px'});
            		this.clusterTable.resize(this.width, this.height-this.mapBottom-MAP_TOP-4);
            	}
                this.timelineContainer.css({bottom: this.timeChartHeight+'px'});
                this.timelineControlContainer.css({bottom: this.timeChartHeight+TIMELINE_HEIGHT+'px'});
			},
			
			resize: function(width,height) {
				this.width = width;
				this.height = height;
				if (this.map) this.map.resize(width, height-this.mapBottom-MAP_TOP-1);
				if (this.timeChart) this.timeChart.resize(width, this.timeChartHeight);
				if (this.timelineControl) this.timelineControl.resize(width,25);
				if (this.timeline) this.timeline.resize(width,25);
            	if (this.clusterTable) this.clusterTable.resize(this.width, this.height-this.mapBottom-MAP_TOP-4);
			}
		};
		overviewWidget.init();
		return overviewWidget;
	};
	
	return {
		createWidget:createWidget
	}
});
