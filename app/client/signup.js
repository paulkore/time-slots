var app = angular.module("TimeSlotsApp", []);

app.controller("SignupController", function($scope, $http) {

    $http.get('http://rest-service.guides.spring.io/greeting')
        .success(function(data) {
            $scope.greeting = data;
        });
    }
    
);

