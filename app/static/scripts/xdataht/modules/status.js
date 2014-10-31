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
define(['jquery', './util/rest', './util/ui_util'], function($, rest, ui_util) {

	var createWidget = function(container, baseUrl) {
		var statusWidget = {
			init: function() {
				var that = this;
				var statusLabel = document.createTextNode("Server status");
				container.appendChild(statusLabel);
				this.fetchStatus();
			},
			fetchStatus: function() {
				var that = this;
				rest.get(baseUrl + 'rest/server/status/',
		        		'Get server status', function(status) {
					that.showStatus(status);
		        }, function(failedResult) {
		        	alert('Failed to get server status ' + failedResult.status + ': ' + failedResult.message);
		        });
				
			},
			showStatus: function(status) {
				var statusDiv = $('<div/>');
				statusDiv.html('Active: ' + status.active + '<BR/>Staged: ' + status.staged);
				container.appendChild(statusDiv[0]);
			},
			resize: function(width,height) {
			}
		};
		statusWidget.init();
		return statusWidget;
	};
	
	return {
		createWidget:createWidget
	}
});
