var app = angular.module("TimeSlotsApp", []);

app.controller("SignupController", function($scope, $http) {

    $http.get('/api/slots').then(
        function(response) { // on success
            $scope.responseData = response;
        },
        function(error) { // on error
            $scope.errorData = error;
        });
});

