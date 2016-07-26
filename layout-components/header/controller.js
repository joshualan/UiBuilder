'use strict';

angular.module('test')
    .controller('HeaderCtrl', function ($scope, jsdosessions) {
        // There is stuff now, my friend.    
    
        $scope.logout = jsdosessions.logout;
    });
