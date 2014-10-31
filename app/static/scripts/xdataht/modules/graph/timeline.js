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
define(['jquery', '../util/ui_util', '../util/colors'], function($, ui_util, colors) {
	var TIME_AXIS_HEIGHT = 25,
		LINE_OFFSET = 19,
		timeLabelWidth = 100,

		extractLocations = function(dataRows) {
			var ad,	locationName, timeStr, l,
				locationMap = {},
				i= 0,
				result = [];

			for (i; i<dataRows.length; i++) {
				ad = dataRows[i];
				locationName = ad['incall'];
				if (!locationName) locationName = ad['locationLabel'];
				if (!locationMap[locationName]) {
					locationMap[locationName] = [];
				}
				timeStr = ad['posttime'];
				if (timeStr==null) timeStr = ad['post_time'];
				if (timeStr==null) timeStr = ad['timestamp'];
				if (timeStr==null) timeStr = Number(ad['post_timestamp'])*1000;
				if (timeStr!=null) timeStr = Number(timeStr);
				if (timeStr==null || timeStr==0) continue;
				locationMap[locationName].push({ad:ad, time:new Date(timeStr), id:ad.id});
			}
			for (l in locationMap) {
				locationMap[l].sort(function(a,b) {
					if (!ui_util.isValidDate(a.time)) return 1;
					if (!ui_util.isValidDate(b.time)) return -1;
					return a.time-b.time;
				});
				result.push({name:l,ads:locationMap[l]});
			}
			result.sort(function(a,b) {
				if (a.ads.length==0) return 1;
				if (b.ads.length==0) return -1;
				if (!ui_util.isValidDate(a.ads[0].time)) return 1;
				if (!ui_util.isValidDate(b.ads[0].time)) return -1;
				return a.ads[0].time-b.ads[0].time;
			});
			return result;
		},

		/**
		 * FIELDS should be an array of {accessor, header, width}
		 * frame implements getTablePage and tableRowClicked
		 */
		createWidget = function(container, data, selection) {
			var widgetObj = {
				minTime:-1,
				maxTime:-1,
				centerTime:null,
				timeSpan:null,
				locationData:null,
				adIds : {},
				ticks:[],
				timeline:null,
				$lineAxisContainer:null,
				$linesContainer:null,
				init: function() {
					var that = this;
					this.initData();
					this.locationData = extractLocations(data);
					this.setMinMaxTime(this.locationData);
					this.initTimeline();
					this.draw();

					//add a reset button
					$(container).append($('<div/>').text('Clear Selected Ads')
							.button({
								disabled: false,
								text: false,
								icons:{
									primary:'ui-icon-arrowrefresh-1-e'
								}
							}).css({
								position: 'absolute',
								bottom:'1px',
								left:'-4px'
							}).click(function() {
								selection.set('timeline', []);
								that.selectionChanged(selection.selectedAds);
							})
					);
				},
				
				selectionChanged: function(selectedAdIdArray) {
					var ad,	i;
					//reset the adIds to unselected (false)
					for (ad in this.adIds) {
						this.adIds[ad].highlighted = false;
					}
					//if the adId in selectedAdIdArray exists in the adIds, set it to selected (true)
					for (i=0; i<selectedAdIdArray.length; i++) {
						ad = selectedAdIdArray[i];
						if (this.adIds[ad]) this.adIds[ad].highlighted = true;
					}
					//trigger event to set styling
					for (i=0;i<this.ticks.length;i++) {
						this.ticks[i].$tick.trigger('mouseleave');
					}
				},
				
				initData: function() {
					var i= 0;
					this.minTime = new Date("2012/01/01");
					this.maxTime = new Date(this.minTime.getTime()+(3600000*24)*365*2);
					for(i;i<data.length;i++){
						this.adIds[data[i].id] = {
							highlighted : false,
							ad : data[i]
						};
					}
				},
				setMinMaxTime: function(locationData) {
					var time, j,
						tmin = -1,
						tmax = -1,
						i = 0;
					for (i; i<locationData.length; i++) {
						for (j=0; j<locationData[i].ads.length; j++) {
							time = locationData[i].ads[j].time;
							if (ui_util.isValidDate(time)) {
								if (tmin==-1||tmin>time) tmin = time;
								if (tmax==-1||tmax<time) tmax = time;
							}
						}
					}
					if (tmin<0) {
						tmin = new Date();
						tmax = new Date();
					}
					this.minTime = new Date(tmin.getFullYear(), tmin.getMonth(), 0);
					if (tmax.getMonth()==11) {
						this.maxTime = new Date(tmax.getFullYear()+1, 0, 0);
					} else {
						this.maxTime = new Date(tmax.getFullYear(), tmax.getMonth()+1, 0);
					}
				},
				initTimeline: function() {
					var that = this,
						id = ui_util.uuid(),
						timelineData = {
							band:{
								"start":Date.parse(this.minTime),
								"end":Date.parse(this.maxTime)
							},
							allowWheel: true,
							color: colors.MOVEMENT_TIMELINE_BACKGROUND
						},
						linkFn = function(linkData) {
							//wheelZoomListener
							if(!linkData ) {
								that.timeSpan = this.getWindow().end - this.getWindow().start;
								that.centerTime = this.centerTime;
								that.pan();
								that.redraw();
							} else if (linkData.action==='dragmove') {
								that.pan();
							}
						};
					//add container div for timeline
					$(container).append($('<div/>')
							.attr('id', id)
							.attr('title','Scroll to zoom')
							.css({
								position:'absolute',
								width:'calc(100% - ' + timeLabelWidth + 'px)',
								height:TIME_AXIS_HEIGHT + 'px',
								right:'0px',
								bottom:'1.5px',
								'z-index':10
							})
					);
					this.timeline = new aperture.timeline.Timeline( {id:id, data:timelineData, linker:linkFn} );
					this.timeline.wheelZoomListener = linkFn;
					this.timeline.resize($(container).width()-timeLabelWidth,TIME_AXIS_HEIGHT);
					this.timeSpan = this.timeline.getWindow().end - this.timeline.getWindow().start;
					this.centerTime = this.timeline.centerTime;
				},
				draw: function() {
					var $cityLabel, $lineContainer, startX, startY,
						that = this,
						locationData = this.locationData,
						i = 0,
						panning=false,
						splitting=false,
						getMousePos = function(e) {
							var clientX = e.clientX,
								clientY = e.clientY;
							if (clientX==undefined) {
								if (e.originalEvent) {
									clientX = e.originalEvent.clientX;
									clientY = e.originalEvent.clientY;
								} else if (e.source) {
									clientX = e.source.clientX;
									clientY = e.source.clientY;
								}
							}
							return {x:clientX,y:clientY};
						},
						$cities = $('<div/>').css({
							position: 'relative',
							background: colors.MOVEMENT_CITY_LABEL_DEFAULT,
							width: timeLabelWidth + 'px',
							height: '100%',
							float: 'left',
							clear: 'left',
							'z-index': 8
						}),
						$splitter = $('<div id="movementSplitter"/>').css({
							position:'absolute',
							height:'100%',
							width:'4px',
							cursor:'w-resize',
							left:(timeLabelWidth-2)+'px',
							'z-index':8,
							opacity:0
						}).draggable({
							axis:'x',
							start: function(e, ui) {
								if (!panning) {
									splitting=true;
									startX = getMousePos(e).x;
									that.$linesContainer.css('display','none');
									return true;
								}
							},
							drag: function(e, ui) {
								if(splitting && !panning && timeLabelWidth>=25) {
									var mp = getMousePos(e),
										newTimeLabelWidth = timeLabelWidth+(mp.x-startX);
									newTimeLabelWidth>25?timeLabelWidth=newTimeLabelWidth:timeLabelWidth=25;
									startX = mp.x;
									$cities.css('width',timeLabelWidth+'px');
								} else {
									splitting=false;
									timeLabelWidth=26;
								}
							},
							stop: function(e, ui) {
								splitting = false;
								$splitter.css('left',+(timeLabelWidth-2)+'px');
								$('#'+that.timeline.uuid).css('width',$locationContainer.width()-timeLabelWidth+'px');
								that.$linesContainer.css({
									width: 'calc(100% - ' + timeLabelWidth + 'px)',
									display:''
								});
								that.resize(that.$linesContainer.width(),$locationContainer.height());
							}
						}),
						$locationContainer = $('<div id="locationContainer"/>').css({
							top:'0px',
							float:'left',
							width:'100%',
							'overflow-y':'scroll',
							'overflow-x':'hidden',
							height:'calc(100% - ' + (LINE_OFFSET + 3) + 'px)'
						}).bind('mousedown', function(e){
							if($(e.target).attr('id')!=='movementSplitter') {
								var mp = getMousePos(e);
								panning = true;
								startX = mp.x;
								startY = mp.y;
								that.timeline.handleDragEvent({eventType: 'dragstart'});
								e.preventDefault();
							}
						}).bind('mousemove', function(e){
							if(!splitting && panning) {
								var s = $locationContainer.scrollTop(),
									mp = getMousePos(e);
								$locationContainer.scrollTop(s-(mp.y-startY));
								startY=mp.y;
								e.preventDefault();
								that.timeline.handleDragEvent({
									eventType:'drag',
									dx: mp.x-startX
								});
							}
						}).bind('mouseup', function() {
							panning=false;
						}).bind("mousewheel DOMMouseScroll", null, function(e) {
							e.preventDefault();
						});
					$(container).append($locationContainer);
					this.timeline.bindMouseWheel('locationContainer');
					this.$linesContainer = $('<div/>').css({
						position: 'relative',
						'overflow': 'none',
						width: 'calc(100% - ' + timeLabelWidth + 'px)',
						height: '100%',
						float:'left',
						left:'0px'
					});
					this.$lineAxisContainer = $('<div/>').css({
						position: 'absolute',
						'overflow': 'none',
						width: '100%',
						height: '100%',
						float:'left',
						left:'0px'
					});
					for (i; i < locationData.length; i++) {
						$cityLabel = $('<div class="cityLabel"/>').css({
							'overflow-x': 'hidden',
							'white-space': 'nowrap',
							'padding-top': '4px',
							'background-color':colors.MOVEMENT_CITY_LABEL_DEFAULT,
							position: 'relative',
							width: '100%',
							float: 'left',
							clear: 'left'
						})
							.text(locationData[i].name)
							.attr('title', function() {
								var ads = locationData[i].ads.length,
									tooltip = locationData[i].name + '\n' + ads + ' ad';
								return (ads != 1)? tooltip + 's' : tooltip;
							})
							.mouseenter(function() {
								if(!panning && !splitting) {
									$(this).css({
										'background-color': colors.MOVEMENT_HOVER,
										cursor: 'pointer'
									});
								}
							})
							.mouseleave(function(e) {
								if(!panning && !splitting) {
									$(this).css({
										'background-color': colors.MOVEMENT_CITY_LABEL_DEFAULT,
										cursor: 'default'
									});
								}
							}).bind('click', function(e) {
								var $locationData = $(this).data(),
									adids = [];
								for (var i=0; i<$locationData.ads.ads.length; i++) {
									adids.push($locationData.ads.ads[i].id);
								}
								if(e.ctrlKey) {
									selection.add('timeline', adids);
								} else {
									selection.toggle('timeline', adids);
								}
								that.selectionChanged(selection.selectedAds);
							}).data('ads', locationData[i]).data('highlighted',false);
						$cities.append($cityLabel);
						//the container for the ticks
						$lineContainer = $('<div/>').css({
							position: 'absolute',
							top: (LINE_OFFSET * i) + 'px',
							width: '100%',
							height: LINE_OFFSET + 'px',
							left: '-5px', //offset for the UTF8 char ('\u25bc');// 2666
							'font-size':'20px'
						});
						this.createTicks($lineContainer, locationData[i]);
						this.$linesContainer.append($lineContainer);
						//add an axis line
						this.$lineAxisContainer.append($('<div/>').css({
							'border-top': '1px solid '+ colors.MOVEMENT_TICK_DEFAULT,
							position: 'absolute',
							top: ((LINE_OFFSET / 2) + (LINE_OFFSET * i)) + 'px',
							width: '100%',
							height: '1px',
							left:'0px',
							overflow:'hidden'
						}));
					}
					this.$linesContainer.append(this.$lineAxisContainer);
					$locationContainer.append($cities).append($splitter).append(this.$linesContainer);
				},
				contains: function(arr, value) {
					var j = arr.length;
					while (j--) {
						if (arr[j] === value) return j;
					}
					return false;
				},
				createTicks: function($lineContainer, data) {
					var $tick, posttime, title,	location, ad, highlighted, adId, leftOffset,
						that = this,
						i = 0,
						left = this.timeline.getWindow().start,
						offsetFactor = 100/this.timeSpan;
					for(i;i<data.ads.length;i++) {
						ad = data.ads[i].ad;
						posttime = parseFloat(ad.posttime);
						location = ad.location;
						title = ad.title;
						adId = data.ads[i].id;
						highlighted = this.adIds[adId].highlighted;
						leftOffset = (posttime-left)*offsetFactor+'%';
						$tick = $('<div class="tick"/>').css({
							position:'absolute',
							top:'-1px',
							cursor:'pointer',
							height:'11px',
							clear:'none',
							width:'5px',
							'z-index':highlighted?3:1,
							color:(highlighted?colors.MOVEMENT_HIGHLIGHT:colors.MOVEMENT_TICK_DEFAULT),
							left:leftOffset
						})
						//tick tooltip stuff
						.attr('title', 'ID: ' + adId +
							(location && location.length>0?'\nLocation: ' + location:'') +
							(posttime?'\nTimestamp: ' + (new Date(posttime)).toString():'') +
							(title && title.length>0?'\nTitle: ' + title:''))
						//.attr('highlighted',false)
						.attr('id',adId)
						//hover css changes
						.mouseenter(function(e) {
							var highlighted = that.adIds[e.currentTarget.id].highlighted;
							$(this).css({
								color:highlighted?colors.MOVEMENT_SELECTED_HOVER:colors.MOVEMENT_HOVER,
								'z-index':4
							});
						})
						.mouseleave(function(e) {
							var highlighted = that.adIds[e.currentTarget.id].highlighted;
							$(this).css({
								color:(highlighted?colors.MOVEMENT_HIGHLIGHT:colors.MOVEMENT_TICK_DEFAULT),
								'z-index':(highlighted?3:1)
							});
						})
						.click(function(e) {
							if (e.ctrlKey) {
								selection.add('timeline', [e.currentTarget.id]);
							} else {
								selection.toggle('timeline', [e.currentTarget.id]);
							}
							that.selectionChanged(selection.selectedAds);
							$(this).mouseenter();
						}).text('\u25bc');// 2666
						this.ticks.push({
							ad: ad,
							$tick:$tick
						});
						$lineContainer.append($tick);
					}
				},
				redraw: function() {
					var $tick, posttime, leftOffset,
						that = this,
						i = 0,
						range = this.timeline.getWindow(),
						left = range.start,
						offsetFactor = 100/this.timeSpan;
					for(i;i<that.ticks.length;i++) {
						posttime = parseFloat(that.ticks[i].ad.posttime);
						leftOffset = (posttime-left)*offsetFactor;
						$tick = that.ticks[i].$tick;
						$tick.css('left',leftOffset+'%');
					}
				},
				resize: function(width,height) {
					this.height = height;
					if(this.width !== width) {
						this.timeline.resize($(container).width()-timeLabelWidth,TIME_AXIS_HEIGHT);
						var oldLeft = parseFloat(this.$linesContainer.css('left')),
							left = ((width/this.width)*oldLeft);
						this.$linesContainer.css('left',left + 'px');
						this.$lineAxisContainer.css('left', (this.timeline.centerRatio<0)?left:(-1*left) + 'px');
						this.width = width;
					}
				},
				pan: function() {
					var range = this.timeline.getWindow(),
						width = this.$linesContainer.width(),
						left = (((this.centerTime-range.start)/(range.end-range.start))*width)-(width/2);
					this.$linesContainer.css('left',left + 'px');
					this.$lineAxisContainer.css('left', (this.timeline.centerRatio<0)?left:(-1*left) + 'px');
				},
				destroy: function() {
					this.filteredAdIds = [];
				}
			};
			widgetObj.init();
			return widgetObj;
		};

	return {
		createWidget:createWidget
	};
});