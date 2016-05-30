var app = angular.module("TimeSlotsApp", []);

app.controller("SignupController", function($scope, $http) {

    $scope.restSuccessData = null;
    $scope.restErrorData = null;
    $scope.message = null;
    $scope.errorMessage = null;

    $scope.slots = [];
    $scope.days = [];
    $scope.memberName = null;
    $scope.duration = "1";

    $scope.loadData = function() {
        $http.get('/api/slots').then(
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
            // No name entered
            return;
        }

        var requestData = {
            dayIndex: dayIndex,
            slotIndex: slotIndex,
            memberName: $scope.memberName.trim(),
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
            })
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
        $scope.slots = responseBody.slots;
        $scope.days = responseBody.days;
        $scope.memberName = null;
    }

    // do this on controller load
    $scope.loadData();
    
});

function isEmpty(str) {
    return !str || !str.trim();
}

