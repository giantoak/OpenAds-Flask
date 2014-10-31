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
define(['jquery', 'jquery-ui', '../util/ui_util', './tag', '../util/menu', '../util/colors'], function($, ui, ui_util, tag, menu, colors) {
	var OPEN_BUTTON_WIDTH = 17,
		POPROX_URL = 'http://localhost/roxy/ads/view/',
		BORDER_STYLE = '1px solid ' + colors.TABLE_BORDER,
		fullUrl = document.location.href;
	if (fullUrl.indexOf('localhost')<0) {
//		var domainUrl = fullUrl.match('^.+?[^/:](?=[?/]|$)') + '/';
//		var domainUrlSplit = domainUrl.split(':');
//		domainUrl = domainUrlSplit[0] + ':' + domainUrlSplit[1] + '/';
//		POPROX_URL = domainUrl + 'roxy/ads/view/';
		POPROX_URL = 'https://roxy.istresearch.com/roxy/ads/view/';
	}

	var ID_STR = 'id',
		URL_STR = 'url',
		BODY_STR = 'text',
		TIME_STR = 'posttime',
		PHONE_STR = 'phone';
	if (document.HT_SCHEMA) {
		ID_STR = 'parent_id';
		URL_STR = 'websites';
		BODY_STR = 'body';
		TIME_STR = 'post_timestamp';
		PHONE_STR = 'phone_numbers';
	}

	var getTableWidth = function(columns) {
		var result = columns.length + OPEN_BUTTON_WIDTH + 1;
		for (var i=0; i<columns.length; i++) result += columns[i].visible?columns[i].width:0;
		return result;
	};

	var setupImageDialog = function(widget, $attr) {
		var $dialog;
		$attr.mouseenter(function (event) {
			//add background-color style to attribute class
			var attributeClass,
				attrSelector = '.' + $(this).data()['attribute'] + '_' + $(this).data()['image_id'];
			$(attrSelector).css('background-color', colors.TABLE_ATTRIBUTE_HOVER);
			var image_hash = $(this).data()['image_hash'];
			if (image_hash && image_hash.length>0) {
				attributeClass = widget.attributeMap[image_hash];
				attrSelector = '.' + $(this).data()['attribute'] + '_' + attributeClass;
				$(attrSelector).css('background-color', colors.TABLE_ATTRIBUTE_HOVER);
			}

			var similar = $(attrSelector).size()-1;
            aperture.tooltip.showTooltip({event:{source:event}, html:
            	'<B>' + ((similar<1)?'No':similar) + '</B> similar images in this cluster<BR/>' +
            	'<B>Click To Select All</B><BR/>' +
            	'<B>Double Click To Search</B>'
            	});
			
			$dialog = $('<div/>');

			var url = $(this).data().url;
			if (url!=null && url!='null') {
				$dialog.css({
					background: 'url("./img/ajaxLoader.gif") no-repeat center center',
					'overflow': 'hidden'
				})
				.attr('title', 'Press the x key to toggle blur');
				var $img = $('<img/>').attr('src', url).css({
					'width': 'auto',
					'-webkit-filter': widget.blur ? 'blur(10px)' : ''
				}).addClass('img-dialog');
				$dialog.append($img);
				$img.on('load', function () {
					$dialog
						.css({'background':''})
						.dialog('option', 'width', $(window).width() - $(widget.mainDiv[0]).width() - 5.4 + 'px');
					$img.css('width', '100%');
					$dialog.dialog('option','position',{
						my: 'right bottom',
						at: 'right bottom',
						of: window
					});
				});
			} else {
				$dialog.css({
					background: '',
					'overflow': 'hidden'
				})
				.attr('title', 'No Cached Image Available');
			}

			$dialog.dialog({
				'max-height': $(window).height() + 'px',
				'width': $(window).width() - $(widget.mainDiv[0]).width() - 5.4 + 'px',
				position: {
					my: 'right bottom',
					at: 'right bottom',
					of: window
				},
				show: {
					effect: "fade",
					duration: 250
				},
				hide: {
					effect: "fade",
					duration: 250
				}
			});

			$(this).data('dialog',$dialog);
		})
		.mouseleave(function() {
            aperture.tooltip.hideTooltip();
			$dialog.dialog('close')
				.remove();
			var attrSelector = '.' + $(this).data()['attribute'] + '_' + $(this).data()['image_id'];
			$(attrSelector).css('background-color', $(this).parent().css('background-color'));
			var image_hash = $(this).data()['image_hash'];
			if (image_hash && image_hash.length>0) {
				attrSelector = '.' + $(this).data()['attribute'] + '_' + widget.attributeMap[image_hash];
				$(attrSelector).css('background-color', $(this).parent().css('background-color'));
			}
		});

	};

	var makeClickableTableCell = function(widget, column, $cellDiv, details, text) {
		var i, $attr,
			values = text.split(','),
			value,
			attributeClass,
			attribute = column.accessor;
		if(attribute === 'images') {
			var images_ids = details['images_id'].split(','),
				images_hashes = details['images_hash']?details['images_hash'].split(','):null;
			for (i = 0; i < values.length; i++) {
				var image_id = images_ids[i];
				var image_hash = images_hashes?images_hashes[i]:null;
				var imageHashUUID = null;
				if (image_hash && image_hash.length>0) {
					if(widget.attributeMap[image_hash]) {
						attributeClass = widget.attributeMap[image_hash];
					} else {
						attributeClass = ui_util.uuid(image_hash);
						widget.attributeMap[image_hash] = attributeClass;
					}
					imageHashUUID = attributeClass;
				}						
				value = values[i];
				$attr = $('<div/>').css({
					float:'left',
					height:'18px',
					width:'18px',
					'margin-left': '4px'
				})
				.addClass(attribute + '_' + image_id + ' ui-icon ui-icon-image')
				.dblclick(function () {
					if (widget.searchFn) {
						var dialog = $(this).data('dialog');
						if(dialog) {
							dialog.dialog('close');
							setTimeout(function () {
								dialog.remove();
							}, 250);
						}
						widget.searchFn($(this).data()['attribute'], $(this).data()['image_id']);
					}
					aperture.tooltip.hideTooltip();
				})
				.click(function (e) {
						e.stopPropagation();
						if(!widget.dblClick) {
							var ads = $('.' + $(this).data()['attribute'] + '_' + $(this).data()['image_id']),
								imageHashUUID = $(this).data()['image_uuid'];
							if (imageHashUUID) {
								ads = ads.add('.' + $(this).data()['attribute'] + '_' + imageHashUUID);
							}
							publishAdSelection(widget, ads, e.ctrlKey);
						}
				})
				.data('url',value)
				.data('image_id', image_id)
				.data('attribute',attribute)
				.data('adid', details.id);

				if (imageHashUUID) {
					$attr.data('image_hash',image_hash);
					$attr.data('image_uuid',imageHashUUID);
					$attr.addClass(attribute + '_' + imageHashUUID);
				}
				
				setupImageDialog(widget, $attr);
				$cellDiv.append($attr);
			}
		} else {
			for (i = 0; i < values.length; i++) {
				value = values[i];
				if(widget.attributeMap[value]) {
					attributeClass = widget.attributeMap[value];
				} else {
					attributeClass = ui_util.uuid(value);
					widget.attributeMap[value] = attributeClass;
				}
				$attr = $('<div/>')
					.text(value)
					.addClass(attributeClass)
					.css('float','left')
					.mouseenter(function () {
						var attrSelector = '.'+ $(this).data()['class'];
						$(attrSelector).css('background-color',colors.TABLE_ATTRIBUTE_HOVER);
			            aperture.tooltip.showTooltip({event:{source:event}, html:
			            	'' + attribute + ' <B>' +  $(this).data()['value'] + '</B><BR/>' +
			            	'Appears <B>' + $(attrSelector).size() + '</B> times in this cluster<BR/>' +
			            	'<B>Click To Select All</B><BR/>' +
			            	'<B>Double Click To Search</B>'
			            	});
					})
					.mouseleave(function () {
			            aperture.tooltip.hideTooltip();
						$('.'+ $(this).data()['class'])
							.css('background-color', $(this).parent().css('background-color'));
					})
					.click(function (e) {
						var attrSelector = '.'+ $(this).data()['class'];
						e.stopPropagation();
						setTimeout(function () {
							if (!widget.dblClick) {
								publishAdSelection(widget, $(attrSelector), e.ctrlKey);
							}
						},150);
					})
					.data('value', value)
					.data('attribute',attribute)
					.data('class',attributeClass)
					.data('adid', details.id);

				//search only on hard attributes
				if((attribute === 'phone' ||
					attribute === 'email' ||
					attribute === 'website' ||
					attribute === 'websites') ) {
					$attr.dblclick(function (e) {
							e.stopPropagation();
							if(widget.searchFn) {
								widget.dblClick = true;
								widget.searchFn($(this).data()['attribute'], $(this).data()['value'], function (result) {
									widget.dblClick = result;
								});
							}
							aperture.tooltip.hideTooltip();
						});
				}
				$cellDiv.append($attr);
				if (i != values.length - 1) {
					$cellDiv.append($('<div/>').text(',').css('float','left'));
				}
			}
		}
	};
	
	
	var createTableCell = function(widget, rowDiv, details, column) {
		var sites, $cellDiv, i,
			attribute = column.accessor,
			text = details[attribute];
		var loadAttribute = function(value) {
				if (widget.searchFn && ui_util.getParameter('tip') !== value) {
					widget.searchFn(attribute, value);
				}
			};

		if (attribute==TIME_STR) {
			text = ui_util.makeDateString(new Date(Number(text)*(document.HT_SCHEMA?1000:1)));
		} else if ((attribute=='websites') && (text!=null || details.website)) {
			if(details.website) {
				if(text) {
					text += "," + details.website;
				} else {
					text = details.website;
				}
			}
			sites = text.split(',');
			var site,
				externalSiteText = '',
				urlText = sites.length>0?sites[0]:'',
				isFirst = true;
			for (i=0; i<sites.length; i++) {
				site = sites[i];
				if (site.indexOf('backpage')>0 || site.indexOf('craigslist')>0 || site.indexOf('myproviderguide')>0) {
				} else {
					if (isFirst) isFirst = false;
					else externalSiteText += ',';
					externalSiteText += site;
				}
			}
			if (attribute=='websites') text = externalSiteText;
			else text = urlText;
		} else if (attribute=='url') {
			if(details.url) {
				text = details.url;
			} else {
				text = details['websites'];
				if (text != null) {
					sites = text.split(',');
					text = sites[0];
				}
			}
		}
		$cellDiv = $('<div/>')
			.css({
				'border-right': BORDER_STYLE,
				width: column.width+'px',
				height: '20px',
				overflow:'hidden',
				float:'left',
				display:column.visible?'block':'none'
			});
		if(text && (attribute === 'phone' ||
					attribute === 'email' ||
					attribute === 'website' ||
					attribute === 'websites' ||
					attribute === 'ethnicity' ||
					attribute === 'images' ||
					attribute === 'imageFeatures')) {
			var $innerCellDiv = $('<div/>').css({
				height:'20px',
				width: widget.width+'px',
				position:'relative'
			});
			$cellDiv.append($innerCellDiv);
			makeClickableTableCell(widget, column, $innerCellDiv, details, text);
		} else {
			$cellDiv.text(text);
			$cellDiv.attr('title',text);
		}
		rowDiv.append($cellDiv);
		rowDiv.cells[attribute] = $cellDiv;
	};

	var createTableRow = function(widget, details, columns, tableWidth) {
		var rowDiv = $('<div/>');
		rowDiv.cells = {};
		rowDiv.css({
			'border-bottom': BORDER_STYLE,
			width:tableWidth+'px',
			height:'15px',
			overflow:'hidden'
		});

		var openButton = $('<button/>').text('Open').button({
			text:false,
			icons:{
				primary:'ui-icon-search'
			}
		}).css({
			float:'left',
			width:'14px',
			height:'14px',
			margin:'1px 2px 0px 2px'
		}).click(function(e) {
			e.stopPropagation();
			menu.createContextMenu(e,[
				{
					type:'action',
					label:'Launch in Poprox',
					callback: function() {
						var id = details[ID_STR],
							url = POPROX_URL + id + '?oculus=0aca893fbfa448fb64bb165c09abe62410e51d360f9b4c9817199c0af21f4750';
						window.open(url,'_blank');
					}
				},
				{
					type:'action',
					label:'Open URL',
					callback: function() {
						var url = details[URL_STR];
						window.open(url,'_blank');
					}
				},
				{
					type:'action',
					label:'Show Contents',
					callback: function() {
						$('<div/>')
							.html(details[BODY_STR])
							.dialog({position: {my: 'left bottom', at: 'right top', of: openButton}});
					}
				}
			]);
		});
		rowDiv.append(openButton);
		rowDiv.sortValue = details[TIME_STR];

		for (var i=0; i<columns.length; i++) createTableCell(widget, rowDiv, details, columns[i]);

		return {
			rowDiv:rowDiv,
			details:details,
			filtered: false
		}
	};

	var createColumnHideButton = function(widget, cellDiv, labelDiv, column, oncolumnsize) {
		labelDiv.hidebutton = $('<button/>').text('Hide').button({
			text:false,
			icons:{
				primary:'ui-icon-closethick'
			}
		}).css({
			position:'absolute',
			right:'2px',
			top:'0px',
			width:'14px',
			height:'14px',
			margin:'1px 2px 0px 2px',
			display: 'none'
		}).click(function(e) {
			e.stopPropagation();
			column.visible = false;
			cellDiv.css({display:'none'});
			oncolumnsize();
		});
		labelDiv.append(labelDiv.hidebutton);

	};
	
	var createHeaderCell = function(widget, rowDiv, columns, idx, onsort, oncolumnsize) {
		var cellDiv = $('<div/>');
		cellDiv.css({'border-right': BORDER_STYLE, width: columns[idx].width+'px', height: '16px',
			overflow:'hidden', float:'left',display:columns[idx].visible?'block':'none'});
		var labelDiv = $('<div/>');
		if(columns[idx].accessor === widget.sortColumn) {
			widget.sortColumnHeaderDiv = labelDiv;
		}
		labelDiv.text(columns[idx].label);
		labelDiv.css({position:'relative',width:columns[idx].width+'px',height:'16px',cursor:'pointer'});
		cellDiv.append(labelDiv);
		createColumnHideButton(widget, cellDiv, labelDiv, columns[idx], oncolumnsize);
		cellDiv.click(function(event) {
			onsort(event, columns[idx].accessor, labelDiv);
		});
		cellDiv.mouseover(function(event) {
			var removeHideButton = function() {
				if (widget.columnHideButton) {
					widget.mainDiv.unbind('mouseover');
					widget.columnHideButton.css({display:'none'});
					widget.columnHideButton = null;
				}
			};
			removeHideButton();
			widget.columnHideButton = labelDiv.hidebutton;
			labelDiv.hidebutton.css({display:'block'});
			widget.mainDiv.mouseover(function(event) {
				var pos = labelDiv.offset();
				if (event.clientX<pos.left || event.clientX>pos.left+cellDiv.width() || event.clientY<pos.top || event.clientY>pos.top+cellDiv.height()) {
					removeHideButton();
				}
			});
		});
		var resizeDiv = $('<div/>');
		resizeDiv.css({position:'absolute',right:'0px',top:'0px',height:'16px',width:'5px',opacity:0,background: + colors.TABLE_BORDER,cursor:'ew-resize','z-index':1});
		var startX = 0;
		var w = columns[idx].width;
		resizeDiv.draggable({axis:'x',
			cursor: 'ew-resize',
			helper: 'clone',
			appendTo: rowDiv,
			start: function(event, ui) {
				startX = event.clientX;
			},
			drag:function(event,ui) {
				var endX = event.clientX;
				var w = columns[idx].width+(endX-startX);
				if (w<10) w = 10;
				columns[idx].width = w;
				cellDiv.css({width:columns[idx].width+'px'});
				labelDiv.css({width:columns[idx].width+'px'});
				oncolumnsize();
				startX = endX;
			},
			stop: function(event, ui) {
				var endX = event.clientX;
				var w = columns[idx].width+(endX-startX);
				if (w<10) w = 10;
				columns[idx].width = w;
				cellDiv.css({width:columns[idx].width+'px'});
				labelDiv.css({width:columns[idx].width+'px'});
				oncolumnsize();
			}
		});
		labelDiv.append(resizeDiv);
		rowDiv.append(cellDiv);
		rowDiv.cells[columns[idx].accessor] = cellDiv;
	};

	var createCheckboxItem = function(widget, parent, column) {
		var itemElem = $('<li>').css({'cursor':'pointer',overflow:'hidden',clear:'both'});
		var checkElem = $('<input type="checkbox"/>').css({float:'left'});
		checkElem.prop('checked', column.visible);
		itemElem.append(checkElem);
		var textElem = $('<div/>');
		textElem.text(column.label);
		itemElem.append(textElem);
		parent.append(itemElem);
		checkElem.click(function(event) {
			column.visible = checkElem.get(0).checked;
			widget.columnResize();
		});
		itemElem.mouseenter(function() {
			$(this).css({'background-color':colors.TABLE_HOVER});
		}).mouseleave(function() {
			$(this).css({'background-color':''});
		});
	};
	
	var createColumnMenu = function(widget, event) {
		var items = [];
		for (var i=0; i<widget.columns.length; i++) {
			var column = widget.columns[i];
			(function(column) {
				items.push({
					type: 'checkbox',
					label: column.label,
					checked: column.visible,
					callback: function(checked) {
						column.visible = checked;
						widget.columnResize();
					}
				});
			})(column);
		}
		menu.createContextMenu(event, items);
	};
	
	var createColumnDisplayButton = function(widget, parent) {
		var cdButton = $('<button/>').text('Show Columns').button({
			text:false,
			icons:{
				primary:'ui-icon-triangle-1-e'
			}
		}).css({
			position:'absolute',
			right:'0px',
			top:'0px',
			width:'14px',
			height:'14px',
			margin:'1px 2px 0px 2px'
		}).click(function(e) {
			createColumnMenu(widget, e);
		});
		parent.append(cdButton);
		
	};
	
	var createHeaderRow = function(widget, onsort, oncolumnsize, columns) {
		var width = getTableWidth(columns);
		var rowDiv = $('<div/>');
		rowDiv.cells = {};
		rowDiv.css({border: BORDER_STYLE, 'border-right': '', width:width+'px', height:'16px', overflow:'hidden',
			'font-weight':'bold', 'text-align':'center',top:'25px',left:'0px',position:'absolute'});

		var cellDiv = $('<div/>');
		cellDiv.css({'border-right': BORDER_STYLE, width: OPEN_BUTTON_WIDTH+'px', height: '20px', overflow:'hidden', float:'left', position:'relative'});
		createColumnDisplayButton(widget, cellDiv);
		rowDiv.append(cellDiv);

		for (var i=0; i<columns.length; i++) createHeaderCell(widget, rowDiv, columns, i, onsort, oncolumnsize);

		return {
			rowDiv:rowDiv
		}
	};

	var publishAdSelection = function (widget, ads, ctrlKey) {
		var adids = [];
		ads.each(function() {adids.push($(this).data()['adid']);});
		if (ctrlKey) {
			widget.selection.add('table', adids);
		} else {
			widget.selection.toggle('table', adids);
		}
		widget.selectionChanged(widget.selection.selectedAds);
	};

	var createWidget = function(baseUrl, container, headers, data, title, selection) {
		var widgetObj = {
			columns: amplify.store('tablecolumns'),
			selectedRows: [],
			rows: [],
			sortColumn: amplify.store('tableSortColumn'),
			reverseSort: amplify.store('tableReverseSort'),
			blur: amplify.store('blur'),
			attributeMap:{},
			dblClick:false,
			selection:selection,
			init: function() {
				var that=this;
				this.amplifyInit();
				this.width = container.width();
				this.height = container.height();
				this.createRows();
				this.createButtons();

				$(window).unbind('keypress');
				$(window).keypress(function(e){
					if(e.charcode == 88 || e.charcode == 120 || e.which == 88 || e.which == 120) {
						that.toggleBlurred();
					}
				});
			},
			amplifyInit: function() {
				//sets and stores defaults if any are previously undefined
				if(this.columns===undefined) {
					this.columns = [
						{label: 'Post Time', accessor: TIME_STR, width: 105, visible: true},
						{label: 'Source', accessor: 'source', width: 80, visible: true},
						{label: 'Location', accessor: 'location', width: 120, visible: true},
						{label: 'Phone', accessor: PHONE_STR, width: 100, visible: true},
						{label: 'Title', accessor: 'title', width: 200, visible: true},
						{label: 'Hourly Rate', accessor: 'Cost_hour_mean', width: 80, visible: true},
						{label: 'Images', accessor: 'images', width: 80, visible: true},
						{label: 'Image Features', accessor: 'imageFeatures', width: 80, visible: true},
						{label: 'External Websites', accessor: 'websites', width: 200, visible: true},
						{label: 'Email', accessor: 'email', width: 100, visible: true},
						{label: 'Name', accessor: 'name', width: 80, visible: true},
						{label: 'Ethnicity', accessor: 'ethnicity', width: 80, visible: true},
						{label: 'Full Text', accessor: BODY_STR, width: 200, visible: true},
						{label: 'First ID', accessor: 'first_id', width: 80, visible: true},
						{label: 'ID', accessor: 'id', width: 80, visible: true},
						{label: 'URL', accessor: 'url', width: 200, visible: true},
						{label: 'Tags', accessor: 'tags', width: 80, visible: true}
					];
					amplify.store('tablecolumns', this.columns);
				}
				if(this.blur===undefined) {
					this.blur = true;
					amplify.store('blur', this.blur);
				}
				if(this.reverseSort===undefined) {
					this.reverseSort = false;
					amplify.store('tableReverseSort', this.reverseSort);
				}
				if(this.sortColumn===undefined) {
					this.sortColumn = TIME_STR;
					amplify.store('tableSortColumn', this.sortColumn);
				}
			},
			createRows: function() {
				var that = this,
					$loaderDiv = $('<div id="details-spinner"/>').css({
						'background' : 'url("./img/ajaxLoader.gif") no-repeat center center',
						'display' : 'none',
						'width' : container.width(),
						'height' : container.height()
					});
				this.mainDiv = $('<div id="details-table"/>');
				this.mainDiv.css({position:'absolute',top:'0px',bottom:'0px',left:'0px',right:'0px',overflow:'hidden'});

				this.topDiv = $('<div/>');
				this.topDiv.css({height:'25px',top:'0px',right:'0px',left:'0px', position:'absolute',
					background:colors.TABLE_TITLE_BAR, color:colors.TABLE_LABEL, 'font-weight':'bold'});
				this.mainDiv.append(this.topDiv);

				this.filterArea = $('<div/>');
				this.filterArea.css({height:'20px',top:'0px',right:'0px',position:'absolute',
					background:colors.TABLE_TITLE_BAR, color:colors.TABLE_LABEL, 'font-weight':'bold'});
				this.topDiv.append(this.filterArea);

				this.titleDiv = $('<div/>');
				this.titleDiv.css({position:'absolute',top:'0px',height:'21px',left:'0px',overflow:'hidden',
					'padding-top':'4px', 'padding-left':'3px'});
				this.titleDiv.text('Ads in group <' + title + '>: ' + data.length);
				this.topDiv.append(this.titleDiv);

				this.headerRow = createHeaderRow(this, function(event, accessor, headerDiv) {
					// on sort
					that.sortColumnHeaderDiv = headerDiv;
					that.sortByColumn(accessor);
				}, function() {
					// on column resize
					that.columnResize();
				}, this.columns);
				this.mainDiv.append(this.headerRow.rowDiv);

				// Create a scrollable div for the content rows
				this.scrollDiv = $('<div id="details-table-scrollDiv"/>');
				this.scrollDiv.css({
					overflow:'auto',
					bottom:'0px',
					top:'43px',
					left:'0px',
					right:'0px',
					position:'absolute',
					'border-left': BORDER_STYLE,
					'white-space':'nowrap'
				}).scroll(function() {
					that.headerRow.rowDiv.css({'margin-left':'-'+that.scrollDiv.get(0).scrollLeft+'px'});
				});

				var width = getTableWidth(this.columns);
				this.mainDiv.append(this.scrollDiv);
				for (var i=0; i<data.length; i++) {
					var row = createTableRow(this, data[i], this.columns, width);
					this.rows.push(row);
					(function(row) {
						row.rowDiv.click(function(event) {
							if (event.ctrlKey) {
								selection.add('table', [row.details.id]);
							} else {
								selection.toggle('table', [row.details.id]);
							}
							that.selectionChanged(selection.selectedAds);
							$(this).mouseenter();
						}).mouseenter(function() {
							$(this).css({'cursor':'pointer', 'background-color':(row.filtered?colors.TABLE_SELECTED_HOVER:colors.TABLE_HOVER)});
						}).mouseleave(function() {
							$(this).css({'cursor':'default', 'background-color':(row.filtered?colors.TABLE_HIGHLIGHT:'')});
						});
					})(row);
				}
				this.rows.sort(function(a,b) {
					if (a.filtered&&!b.filtered) return -1;
					if (b.filtered&&!a.filtered) return 1;
					return b.rowDiv.sortValue-a.rowDiv.sortValue;
				});
				for (i=0; i<this.rows.length; i++) {
					row = this.rows[i];
					this.scrollDiv.append(row.rowDiv);
				}
				container.append(this.mainDiv).append($loaderDiv);

				var scrollbar = {
						width: this.scrollDiv[0].offsetWidth - this.scrollDiv[0].clientWidth,
						height: this.scrollDiv[0].offsetHeight - this.scrollDiv[0].clientHeight
					};
				this.selectedOverlay = $('<div/>')
					.css({
						position: 'absolute',
						'pointer-events': 'none',
						top: parseInt(this.scrollDiv.css('top')) + scrollbar.height + 'px',
						width: scrollbar.width - 2 + 'px',
						right:'0px',
						bottom: scrollbar.height + scrollbar.width + 'px'
					});
				this.mainDiv.append(this.selectedOverlay);
				this.sortByColumn();
			},
			columnResize: function() {
				var width = getTableWidth(this.columns),
					i = 0, j = 0, row;
				this.headerRow.rowDiv.css({width:width});
				for (j; j<this.columns.length; j++) {
					this.headerRow.rowDiv.cells[this.columns[j].accessor]
						.css({width:this.columns[j].width+'px', display: this.columns[j].visible?'block':'none'});
				}
				for (i; i<this.rows.length; i++) {
					row = this.rows[i];
					row.rowDiv.css({width:width});
					for (j = 0; j<this.columns.length; j++) {
						row.rowDiv.cells[this.columns[j].accessor]
							.css({width:this.columns[j].width+'px', display: this.columns[j].visible?'block':'none'});
					}
				}
				amplify.store("tablecolumns", this.columns);
			},
			sortByColumn: function(accessor, fromPubSub) {
				if (!fromPubSub) {
					if (this.sortColumn && accessor == this.sortColumn) {
						this.reverseSort = !this.reverseSort;
						amplify.store('tableReverseSort', this.reverseSort);
					} else if (accessor) {
						this.reverseSort = false;
						amplify.store('tableReverseSort', this.reverseSort);
					}
				}

				if(accessor===undefined) {
					accessor = this.sortColumn;
				}
				if(this.sortColumn !== accessor) {
					this.sortColumn = accessor;
					amplify.store('tableSortColumn', this.sortColumn);
				}

				if (this.sortIndicator) this.sortIndicator.remove();
				if (this.sortColumnHeaderDiv) {
					this.sortIndicator = $('<div/>');
					this.sortIndicator.addClass('ui-icon');
					this.sortIndicator.addClass('ui-icon-carat-1-'+(this.reverseSort?'s':'n'));
					this.sortIndicator.css({position:'absolute',left:'-2px',top:'-4px'});
					this.sortColumnHeaderDiv.append(this.sortIndicator);
				}

				var sortMultiplier = this.reverseSort?-1:1;
				this.rows.sort(function(a,b) {
//					if (a.filtered&&!b.filtered) return -1;
//					if (b.filtered&&!a.filtered) return 1;
					var v1 = a.details[accessor];
					var v2 = b.details[accessor];
					if (v1==null || v1.length==0) return 1*sortMultiplier;
					if (v2==null || v2.length==0) return -1*sortMultiplier;
					if(accessor==='images'){
						var temp = v1.split(',').length;
						v1 = v2.split(',').length;
						v2 = temp;
					}
					if ($.isNumeric(v1)&&$.isNumeric(v2)) return (v1-v2)*sortMultiplier;
					return (v2<v1?1:-1)*sortMultiplier;
				});
				for (var i=0; i<this.rows.length; i++) {
					var row = this.rows[i];
					this.scrollDiv.append(row.rowDiv);
				}
			},
			
			selectionChanged: function(selectedAdIdArray) {
				if (this.dblClick) return;

				this.selectedOverlay.empty();
				var width = parseInt(this.selectedOverlay.width()) - 5 + 'px',
					increment = (parseInt(this.selectedOverlay.height())/this.rows.length);
				for (var rowIndex = 0; rowIndex < this.rows.length; rowIndex++) {
					var row = this.rows[rowIndex],
						removeIdx = this.selectedRows.indexOf(row);
					if (selectedAdIdArray && (selectedAdIdArray.indexOf(row.details.id) > -1)) {
						if (removeIdx < 0) this.selectedRows.push(row);
						row.filtered = true;
						row.rowDiv.css('background-color',colors.TABLE_HIGHLIGHT);
						this.selectedOverlay.append($('<div/>')
							.css({
								position: 'absolute',
								height: '1px',
								border: '1px solid ' + colors.TABLE_OVERLAY_BORDER,
								right: '2px',
								top: (rowIndex * increment) + 'px',
								width: width,
								'background-color': colors.TABLE_HIGHLIGHT
							})
						);
					} else {
						if (removeIdx > -1) this.selectedRows.splice(removeIdx, 1);
						row.filtered = false;
						row.rowDiv.css('background-color','');
					}
					$(row.rowDiv).mouseleave();
				}

				if (this.selectedRows.length == 0) {
					this.selectAllButton.button('option', 'disabled', false);
					this.deselectAllButton.button('option', 'disabled', true);
					this.openButton.button('option', 'disabled', true);
					this.tagButton.button('option', 'disabled', true);
				} else {
					if (this.selectedRows.length == this.rows.length) {
						this.selectAllButton.button('option', 'disabled', true)
					} else {
						this.selectAllButton.button('option', 'disabled', false);
					}
					this.deselectAllButton.button('option', 'disabled', false);
					this.openButton.button('option', 'disabled', false);
					this.tagButton.button('option', 'disabled', false);
				}

//				if (this.sortColumn) {
//					this.sortByColumn(this.sortColumn, true);
//				} else {
//					this.reverseSort = true;
//					this.sortByColumn('posttime', true);
//				}
			},

			toggleBlurred: function() {
				this.blur = !this.blur;
				amplify.store('blur', this.blur);
				this.blurButton
					.attr('title', this.blur?'click to unblur images':'click to blur images')
					.button('option', 'label', this.blur?'BLURRED':'UNBLURRED')
					.css('background',this.blur?colors.TABLE_HIGHLIGHT:colors.TABLE_BLURRED);
				$('.img-dialog').css('-webkit-filter',this.blur?'blur(10px)':'');
			},

			destroyTable: function() {
			},

			filterImage: function(imageId) {
				var hashed,
					ads = $('.images_'+imageId);
				ads.each(function() {
					if($(this).data()['image_uuid']) {
						hashed = $('.'+$(this).data()['attribute']+'_'+$(this).data()['image_uuid']);
						return false;
					}
				});
				if (hashed) {
					ads = ads.add(hashed);
				}
				publishAdSelection(this, ads, false);
			},

			createButtons: function() {
				var that = this;

				this.blurButton = $('<button/>')
					.button()
					.button('option', 'label', this.blur?'BLURRED':'UNBLURRED')
					.attr('title', this.blur?'click to unblur images':'click to blur images')
					.css({
						'background':this.blur?colors.TABLE_HIGHLIGHT:colors.TABLE_BLURRED,
						width:'76px'
					})
					.click(function() {
						that.toggleBlurred();
					}).appendTo(this.filterArea);

				this.selectAllButton = $('<button/>')
					.text("Select All")
					.button()
					.click(function() {
						var adids = [];
						for (var rowIndex = 0; rowIndex < that.rows.length; rowIndex++) {
							var row = that.rows[rowIndex];
							adids.push(row.details.id);
						}
						selection.set('table', adids);
						that.selectionChanged(selection.selectedAds);
					}).appendTo(this.filterArea);

				this.deselectAllButton = $('<button/>')
					.text("Deselect All")
					.button()
					.click(function() {
						selection.set('table', []);
						that.selectionChanged(selection.selectedAds);
					}).appendTo(this.filterArea);
				this.deselectAllButton.button('option', 'disabled', true);

				this.openButton = $('<button/>')
					.text('Open')
					.button()
					.click(function() {
						var urlStrings = [],
							parent_id,
							data_source;
						for (var i = 0; i < that.rows.length; i++) {
							var row = that.rows[i];
							if (row && row.details['id'] && row.selected) {
								if(row.details['parent_id']) {
									parent_id = row.details['parent_id'];
								} else {
									parent_id = row.details['id'];
								}
								data_source = row.details['source'];
								urlStrings.push(POPROX_URL + parent_id +
									'?oculus=0aca893fbfa448fb64bb165c09abe62410e51d360f9b4c9817199c0af21f4750');
							}
						}
						// TODO:  display a warning if we have too many ads selected?
						for (i = 0; i < urlStrings.length; i++) {
							window.open(urlStrings[i],'_blank');
						}
					}).appendTo(this.filterArea);
				this.openButton.button('option', 'disabled', true);

				this.tagButton = $('<button/>')
					.text("Tag Ads")
					.button()
					.click(function() {
						var highlightedAdIds = [];
						for (var i = 0; i < that.rows.length; i++) {
							var row = that.rows[i];
							if (row.selected) highlightedAdIds.push(row.details['id']);
						}
						tag.showTagDialog(baseUrl, highlightedAdIds, function(tagsToAdd, tagsToRemove) {
							for (var i=0; i<that.rows.length; i++) {
								var row = that.rows[i];
								if (!row.selected) continue;
								// Grab existing data
								var currentTagString = row.details['tags'];
								var currentTags = [];
								if (currentTagString && currentTagString != '') {
									currentTags = currentTagString.split(',');
								}

								// Remove tagsToRemove
								for (var j = 0; j < tagsToRemove.length; j++) {
									var removeIdx = currentTags.indexOf(tagsToRemove[j]);
									if (removeIdx != -1) {
										currentTags.splice(removeIdx,1);
									}
								}

								// Add tags to add
								for (j = 0; j < tagsToAdd.length; j++) {
									currentTags.push(tagsToAdd[j]);
								}

								// Rebuild string
								currentTagString = '';
								if (currentTags.length > 0 ) {
									for (j = 0; j < currentTags.length-1; j++) {
										currentTagString += currentTags[j] + ',';
									}
									currentTagString += currentTags[ currentTags.length -1 ];
								}

								// Update data row
								row.details['tags'] = currentTagString;
								row.rowDiv.cells['tags'].text(currentTagString);
							}
						});
					}).appendTo(this.filterArea);
				this.tagButton.button('option', 'disabled', true);

				this.resetTagsButton = $('<button/>')
					.text('Reset Tags')
					.button()
					.click(function() {
						tag.resetAllTags(baseUrl, function() {
							// Update data row
							for (var i = 0; i < that.rows.length; i++) {
								var row = that.rows[i];
								row.details['tags'] = '';
								row.rowDiv.cells['tags'].text('');
							}
						});
					}).appendTo(this.filterArea);
			},
			updateSelectedOverlay: function(){
				this.selectedOverlay.empty();
				var width = parseInt(this.selectedOverlay.width()) - 5 + 'px',
					increment = (parseInt(this.selectedOverlay.height())/this.rows.length),
					selectedAdIdArray = selection.selectedAds;
				if(!selectedAdIdArray || selectedAdIdArray.length===0) return;
				for (var rowIndex = 0; rowIndex < this.rows.length; rowIndex++) {
					if (selectedAdIdArray.indexOf(this.rows[rowIndex].details.id) > -1) {
						this.selectedOverlay.append($('<div/>')
							.css({
								position: 'absolute',
								height: '1px',
								border: '1px solid ' + colors.TABLE_OVERLAY_BORDER,
								right: '2px',
								top: (rowIndex * increment) + 'px',
								width: width,
								'background-color': colors.TABLE_HIGHLIGHT
							})
						);
					}
				}
			},
			resize: function(width,height) {
			}
		};
		widgetObj.init();
		return widgetObj;
	};

	return {
		createWidget:createWidget
	};

});