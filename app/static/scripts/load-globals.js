var app = angular.module('covarApp', []);
 
app.config(['$interpolateProvider', function($interpolateProvider) {
    $interpolateProvider.startSymbol('{[');
    $interpolateProvider.endSymbol(']}');
}]);

app.controller('UploadedDataCtrl', function($scope, $http) {
    $http.get('/load_data')
    .then(function(res){
        $scope.data = res.data;                
    });
});

app.directive('sGrid', [function () {
    return {
    restrict: 'EA',
    link : function(scope, element, attrs){
        var data = scope.data;
        console.log(scope);
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

        scope.grid = new Slick.Grid('#data-explorer', data, columns, options);
    }}}]);
