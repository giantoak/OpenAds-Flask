$(document).ready(function() {
    var rawdata = $('#locdata').data()['tagged'];
    
    var data = []
    for (var key in rawdata) {
        if (rawdata.hasOwnProperty(key)) {
            data.push($.extend({name: key}, rawdata[key]));
        }
    }

    var dataset = new recline.Model.Dataset({
          records: data
    });


    // get an element from your HTML for the viewer
    var $el = $('#data-explorer');

    /* TODO: switch SlickGrid into recline MultiView. */
    var grid = new recline.View.SlickGrid({
          model: dataset,
            el: $el
            });
    grid.visible = true;
    grid.render();
/*
    var allInOneDataViewer = new recline.View.MultiView({
    model: dataset,
    el: $el
    });
    */
});
