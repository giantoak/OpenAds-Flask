$(document).ready(function() {
    var rawdata = $('#data').data()['tagged'];
    
    var data = []
    for (var key in rawdata) {
        if (rawdata.hasOwnProperty(key)) {
            data.push($.extend({name: key}, rawdata[key]));
        }
    }
    
    var columns = [], options = {
        enableCellNavigation: true,
        enableColumnReorder: false
    };

    for (var key in data[0]) {
        if (data[0].hasOwnProperty(key)) {
            columns.push({id: key, name: key, field: key, resizable: true});
        }
    }

    var grid = new Slick.Grid('#data-explorer', data, columns, options);
    grid.visible = true;
    grid.render();
});
