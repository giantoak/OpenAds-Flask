
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

define(['jquery', '../util/ui_util'],
    function($, ui_util) {

    var createSelectionManager = function() {
		var selectionManager = {
			selectedAds:[],  		// Array of ad ids
			listeners:{},			// Map of name->selection change callback
			set: function(setterName, adids) {
				this.selectedAds.length = 0;
				this.selectedAds.push.apply(this.selectedAds, adids);
				this.notify(setterName);
			},
			toggle: function(setterName, adids) {
				adids.sort();
				var sameAsSelected = false;
				if (adids.length==this.selectedAds.length) {
					sameAsSelected = true;
					for (var i=0; i<adids.length; i++) {
						if (adids[i]!=this.selectedAds[i]) sameAsSelected = false;
					}
				}
				this.selectedAds.length = 0;
				if (!sameAsSelected) {
					this.selectedAds.push.apply(this.selectedAds, adids);
				}
				this.notify(setterName);
			},
			add: function(setterName, adids) {
				adids.sort();
				var allfound = true;
				for (var i=0; i<adids.length; i++) {
					var newid = adids[i];
					var found = false;
					for (var j=0; j<this.selectedAds.length; j++) {
						var oldid = this.selectedAds[j];
						if (oldid==newid) {
							found = true;
							break;
						}
					}
					if (!found) {
						allfound = false;
						this.selectedAds.push(newid);
					}
				}
				if (allfound) {
					var newidx = 0;
					var extras = [];
					for (i=0; i<this.selectedAds.length; i++) {
						if ((newidx<adids.length) && (this.selectedAds[i]==adids[newidx])) newidx++;
						else extras.push(this.selectedAds[i]);
					}
					this.selectedAds.length = 0;
					this.selectedAds.push.apply(this.selectedAds, extras);
				}
				this.notify(setterName);
			},
			listen: function(name, callback) {
				if (callback==null) delete this.listeners[name];
				else this.listeners[name] = callback;
			},
			notify: function(setterName) {
				for (var listener in this.listeners) {
					if (this.listeners.hasOwnProperty(listener) && listener!=setterName) {
						this.listeners[listener](this.selectedAds);
					}
				}
			},
			clear: function() {
				this.selectedAds.length = 0;
			}
		};
		return selectionManager;
	};
	
	return {
		createSelectionManager:createSelectionManager
	}
});
