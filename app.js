(function(angular) {
    'use strict';

    /**
     * @ngdoc overview
     * @name test
     * @description
     * #
     *
     * Main module of the application.
     */
    angular
        .module('test', [
            'ngAnimate',
            'ngCookies',
            'ngResource',
            'ui.router',
            'ui.bootstrap',
            'ui.bootstrap.tpls',
            'ngSanitize',
            'ngTouch',
            'oc.lazyLoad',
            'kendo.directives'
        ])
        .service('loginModal', function ($uibModal) {
            return function() {
                var instance = $uibModal.open({
                    templateUrl: 'modules/login/views/index.html',
                    controller: 'LoginCtrl',
                    controllerAs: 'LoginCtrl'
                });

                return instance.result;
            };
        })
        .service('jsdosessions', function () {
            var that = this;

            this.sessions = {};
            //this.existingSessions = {};
        
            this.logout = function () {
                var promises = [];
                
                for (var key in that.sessions) {
                    var session = that.sessions[key];
                    console.log(session);
                    if (session.loginResult === 1) {
                        promises.push(session.logout());
                    }
                }
                
                // When all the logouts are finished, clear the array of 
                // sessions.
                $.when
                    .apply(null, promises)
                    .done(function () {
                        that.sessions = {};
                        // Clear up ServicesManager
                        progress.data.ServicesManager._services = [];    
                        progress.data.ServicesManager._resources = [];
                        progress.data.ServicesManager._data = [];
                        progress.data.ServicesManager._sessions = [];
                    });
            };
        })
        .filter('formatValue', function() {
            return function(input, format) {
                if (input !== null && input !== undefined) {
                    return kendo.format(format, input);
                } else {
                    return '';
                }
            }
        })
        .run(function ($q, $http, $rootScope, $state, $window, loginModal, jsdosessions) {
            var dataProviders;

            function getProviders() {
                return $q(function (resolve, reject) {
                    if (dataProviders) {
                        resolve(dataProviders);
                    } else {
                        $http.get('data-providers.json')
                            .then(function (res) {
                                dataProviders = res.data;
                                resolve(dataProviders);
                            }, function (res) {
                                reject(new Error(res.data));
                            });
                    }
                });
            }

            $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {
                var dataProviders = toState.data ? toState.data.ensureJsdos : null;

                if (!dataProviders || !dataProviders.length || jsdosessions.sessions[dataProviders[0]]) {
                    return;
                }

                function getProvidersSuccess(providers) {
                    var provider = providers[dataProviders[0]];

                    try {
                        progress.data.getSession({
                            name: provider.name,
                            authenticationModel: provider.authenticationModel,
                            serviceURI: provider.serviceURI,
                            catalogURI: provider.catalogUris,
                            loginCallback: loginModal
                        })
                        .done(function(jsdosession) {
                            jsdosessions.sessions[dataProviders[0]] = jsdosession;
                            $state.go(toState.name, toParams);
                        })
                        .fail(function(result, details) {
                            console.log(details);
                        });
                    } catch(e) {
                        console.log(e);
                    }
                }

                event.preventDefault();

                getProviders()
                    .then(getProvidersSuccess)
                    .catch(function(reason) {
                        console.log(reason);
                    });
            });
        })
        .config(function ($stateProvider, $urlRouterProvider) {
            $stateProvider
                .state('default', {
                    abstract:true,
                    url: '',
                    views: {
                        
                        'header': {
                            templateUrl: 'scripts/layout-components/header/template.html',
                            controller: 'HeaderCtrl'
                        },
                        
                        'side-navigation': {
                            templateUrl: 'scripts/layout-components/side-navigation/template.html',
                            controller: 'SideNavigationCtrl'
                        }
                        
                    },
                    // Injects the jsdosessions service as a dependency
                    resolve: {
                        jsdosessions: "jsdosessions"
                    }
                })
                .state('default.dashboard', {
                    url: '/dashboard',
                    views: {
                        'content@': {
                            templateUrl: 'modules/dashboard/views/index.html',
                            controller: 'DashboardCtrl'
                        }
                    },
                    resolve: {
                        loadModule: ['$ocLazyLoad', function($ocLazyLoad) {
                            return $ocLazyLoad.load('modules/dashboard/controllers/index.js');
                        }]
                    }
                })
                .state('default.ssad', {
                    url: '/ssad',
                    views: {
                        'content@': {
                            templateUrl: 'modules/ssad/views/index.html',
                            controller: 'SsadCtrl'
                        }
                    },
                    resolve: {
                        loadModule: ['$ocLazyLoad', function($ocLazyLoad) {
                            return $ocLazyLoad.load('modules/ssad/controllers/index.js');
                        }]
                    }
                })
                .state('default.ssad.sadasd', {
                    url: '/sadasd',
                    templateUrl: 'modules/ssad/views/sadasd/index.html',
                    controller: 'SsadSadasdCtrl',
                    data: {
                        ensureJsdos: ["anonService"]
                    }
                })
                .state('login', {
                    url: '/login',
                    templateUrl: 'modules/login/views/index.html',
                    controller: 'LoginCtrl'
                });

            // Workaround for infinite loop: (https://github.com/angular-ui/ui-router/issues/600)
            $urlRouterProvider.otherwise(function ($injector) {
                var $state = $injector.get("$state");
                $state.go('default.dashboard');
            });
        });
})(angular);
