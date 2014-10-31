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
define(['jquery', '../util/rest'], function($, rest) {
    var WHOLE_WORD_CLOUD_COLUMNS = [
        {col: 'region', sanitize: false},
        {col: 'name', sanitize: false},
        {col: 'ethnicity', sanitize: false},
        {col: 'age', sanitize: false},
        {col: 'bust', sanitize: false},
        {col: 'incall', sanitize: false},
        {col: 'city', sanitize: true} // Lots of junk in this column
    ];

    var SPLITTABLE_WORD_CLOUD_COLUMNS = [
        {col: 'title', sanitize: true, delim: ' '},
        {col: 'text_field', sanitize: true, delim: ' '},
        {col: 'outcall', sanitize: true, delim: ';'}
    ];

    var baseURL = null;

    // TODO: Make sure these regexps aren't too slow for the client.
    var sanitizeString = function(string) {
//        console.log('Before:\n' + string);
        string = string.toLowerCase();

        string = string.replace(/<(?:.|\n)*?>/gm, ''); // Strip HTML tags
        string = string.replace(/&(?:[a-z\d]+|#\d+|#x[a-f\d]+);/g, ''); // Strip character entities ('&nbsp', etc.)
        string = string.replace(/ad number: \d+/g,' '); // Replace "ad number: 532032"

        // TODO: Where would we like to go with matching phone numbers?
        // Match all phone numbers and add them to a list (do this before stripping special chars)
//        var phoneMatches = string.match(/^\s*([\(]?)\[?\s*\d{3}\s*\]?[\)]?\s*[\-]?[\.]?\s*\d{3}\s*[\-]?[\.]?\s*\d{4}$/g);

        string = string.replace(/\n/g,' '); // Replace newlines
        string = string.replace(/[_\W]/g, ' '); // Replace all non-alphanumeric chars

        string = string.trim();
        string = string.replace(/\s{2,}/g, ' ');

//        if (phoneMatches) {
//            for (var i=0; i<phoneMatches.length; i++) {
//                string += ' '+phoneMatches[i];
//            }
//        }

//        console.log('AFTER:\n'+ '\n------------------------------\n\n' + string );
        return string;
    };

    var createWidget = function(baseUrl, container, data, selection) {
        baseURL = baseUrl;
        var widgetObj = {
            width: null,
            height: null,
            imageCallback: null,
            wordMap: {},
            filteredAdIds : [],
            init: function() {
                this.imageCallback = function(response) {
                    var id = response.id;
                    var url = baseUrl + 'rest/image/' + id;
                    container.css('background-image','url('+url+')');
                };

                this.processRows();
            },

            selectionChanged: function(selectedAdIdArray) {
                if (!selectedAdIdArray || selectedAdIdArray.length == 0) {
                    this.filteredAdIds = [];
                } else {
                    this.filteredAdIds = selectedAdIdArray;
                }
                this.processRows();
                this.fetchImage();
            },
            
            processRows: function() {
                // Compute a map of every word found in the included data fields for this cluster
                this.wordMap = {};
                for (var i = 0; i < data.length; i++) {

                    if (this.filteredAdIds.indexOf(data[i]['id']) == -1 && this.filteredAdIds.length != 0) {
                        continue;
                    }

                    // Handle columns that are treated as whole strings
                    for (var j = 0; j < WHOLE_WORD_CLOUD_COLUMNS.length; j++) {
                        var colName = WHOLE_WORD_CLOUD_COLUMNS[j].col;
                        var doSanitize = WHOLE_WORD_CLOUD_COLUMNS[j].sanitize;

                        var columnValue = data[i][colName];
                        if (columnValue != null) {
                            if (doSanitize) {
                                columnValue = sanitizeString(columnValue);
                            }

                            var count = this.wordMap[columnValue];
                            if (count) {
                                this.wordMap[columnValue] = count+1;
                            } else {
                                this.wordMap[columnValue] = 1;
                            }
                        }
                    }

                    // Handle columns that need to be split into words
                    for (j = 0; j < SPLITTABLE_WORD_CLOUD_COLUMNS.length; j++) {
                        colName = SPLITTABLE_WORD_CLOUD_COLUMNS[j].col;
                        doSanitize = SPLITTABLE_WORD_CLOUD_COLUMNS[j].sanitize;
                        var delim = SPLITTABLE_WORD_CLOUD_COLUMNS[j].delim;
                        var sanitizePostSplit = delim !== ' ';

                        columnValue = data[i][colName];
                        if (columnValue != null) {
                            if (doSanitize && !sanitizePostSplit) {
                                columnValue = sanitizeString(columnValue);
                            }

                            var wordPieces = columnValue.split(delim);
                            for (var w = 0; w < wordPieces.length; w++) {
                                // TODO: Should really take a look at what we're getting here.
                                if (wordPiece == "" || wordPiece == '') {
                                    continue;
                                }

                                var wordPiece = wordPieces[w].trim();
                                if (doSanitize && sanitizePostSplit) {
                                    wordPiece = sanitizeString(wordPiece);
                                }

                                var count = this.wordMap[wordPiece];
                                if (count) {
                                    this.wordMap[wordPiece] = count+1;
                                } else {
                                    this.wordMap[wordPiece] = 1;
                                }
                            }
                        }
                    }
                }
            },

            fetchImage: function() {
                var that = this;

                var getWordCounts = function(wordMap) {
                    var ret = [];
                    for (var word in wordMap) {
                        if (wordMap.hasOwnProperty(word)) {
                            ret.push({
                                word: word,
                                count: wordMap[word]
                            });
                        }
                    }
                    return ret;
                };

                var postData = {
                    width: Math.floor(that.width),
                    height: Math.floor(that.height),
                    wordCounts: getWordCounts(that.wordMap)
                };

                rest.post(baseUrl + 'rest/wordCloud',postData,'Get word cloud', that.imageCallback);
            },

            resize: function(width, height) {
                this.width = width;
                this.height = height;

                this.fetchImage();
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
    }
});