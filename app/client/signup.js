var app = angular.module("TimeSlotsApp", []);

app.controller("SignupController", function($scope, $http) {

    $scope.restSuccessData = null;
    $scope.restErrorData = null;
    $scope.message = null;
    $scope.errorMessage = null;

    $scope.slotDefs = [];
    $scope.days = [];
    $scope.memberName = null;
    $scope.duration = "1";

    $scope.loadData = function() {
        $http.get('/api/sheet').then(
            function(res) { // success
                restSuccess(res);
                processSlotData(res);
                $scope.message = null;
            },
            function(res) { // error
                restError(res);
            });
    };

    $scope.signup = function(dayIndex, slotIndex) {
        if (isEmpty($scope.memberName)) {
            $scope.errorMessage = "Please enter your name to sign up";
            return;
        }
        var memberName = $scope.memberName.trim();
        if (memberName.length > 12) {
            $scope.errorMessage = "Name can't be longer than 12 letters";
            return;
        }

        var requestData = {
            dayIndex: dayIndex,
            slotIndex: slotIndex,
            memberName: memberName,
            duration: $scope.duration,
        };

        $http.post('/api/signup', requestData).then(
            function (res) { // success
                restSuccess(res);
                processSlotData(res);
                $scope.message = "Successfully signed up.";
            },
            function (res) { // error
                restError(res);
            });
    };

    $scope.clear = function() {
        if (isEmpty($scope.memberName)) {
            // No name entered
            return;
        }
        var memberName = $scope.memberName.trim();
        if (memberName.length > 12) {
            $scope.errorMessage = "Name can't be longer than 12 letters";
            return;
        }

        var requestData = {
            memberName: memberName,
        };

        $http.post('/api/clear', requestData).then(
            function (res) { // success
                restSuccess(res);
                processSlotData(res);
                $scope.message = "Successfully cleared bookings belonging to " + memberName + ".";
            },
            function (res) { // error
                restError(res);
            });

    };

    function restSuccess(res) {
        $scope.restSuccessData = res;
        $scope.restErrorData = null;
        $scope.message = res.data ? res.data.message : null;
        $scope.errorMessage = null;
    }

    function restError(res) {
        $scope.restSuccessData = null;
        $scope.restErrorData = res;
        $scope.message = null;
        $scope.errorMessage = res.data ? res.data.message : null;
    }

    function processSlotData(responseData) {
        var responseBody = responseData.data;
        $scope.slotDefs = responseBody.slotDefs;
        $scope.days = responseBody.days;
        $scope.memberName = null;
    }

    // do this on controller load
    $scope.loadData();
    
});

function isEmpty(str) {
    return !str || !str.trim();
}

