var app = angular.module("TimeSlotsApp", []);

app.controller("SignupController", function($scope, $http) {

    $http.get('/api/slots').then(
        function(response) { // on success
            $scope.response = response;
            $scope.responseData = response.data;
            $scope.slots = response.data.slots;
            $scope.days = response.data.days;
        },
        function(error) { // on error
            $scope.errorData = error;
        });
});

