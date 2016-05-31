(function(angular) {
    'use strict';

    /**
     * @ngdoc overview
     * @name SSO-0506
     * @description
     * #
     *
     * Main module of the application.
     * whenshaw temporary comment: Stage one for SSO -- connect/log in to data providers on demand,
     *     rather than all at once when the app starts
     */
    angular
        .module('SSO-0506', [
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
        .run(function ($q, $http, $rootScope, $state, $window, loginModal) {
            var dataProviders,
                sessions = {};

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
                 var dataProviders = toState.data ? toState.data.ensureJsdos : null,
                 loginSuccessHandler,
                 loginFailHandler;
                 
                // TODO: IMPORTANT: Authenticaton logic must change to handle mutiple providers.
                if (!dataProviders || !dataProviders.length || sessions[dataProviders[0]]) {
                    return;
                }

                event.preventDefault();

         // whenshaw  The code that Alan and Wayne changed begins here, ends at line 147
                // TODO: IMPORTANT: Must also handle fail.
                getProviders()
                    .then(function (providers) {
                        // TODO: Check if valid data provider is specified and return an error if not.
                        var provider = providers[dataProviders[0]],
                            authProviderConfig,
                            authProviderInstance,
                            jsdoSession,
                            loginSuccessHandler = function (jsdosession) {
                                return jsdosession.addCatalog(provider.catalogUris[0]);
                            }, 
                            addCatalogSuccessHandler = function() {
                                        sessions[dataProviders[0]] = true;
                                        $state.go(toState.name, toParams);
                            },
                            errorHandler = function(errorSource, result, info){
                                if (errorSource instanceof progress.data.JSDOSession) {
                                    console.log("failed to initialize session manager \n" + info);
                                } else if (errorSource instanceof progress.data.AuthenticationProvider) {
                                    console.log("failed to get token \n" + info);
                                } else if (errorSource instanceof Error) {
                                    console.log("failed to initialize session manager \n" + errorSource);
                                } else if ((info instanceof Array) && info[0] && info[0].hasOwnProperty("catalogURI")) {
                                    console.log("error getting catalog \n" + info[0].errorObject); // or whatever
                                } else if (typeof errorSource === "string") {
                                    console.log("failed to initialize session manager \n" + errorSource);
                                } else {
                                    throw new Error("unexpected error initializing session manager");
                                }
                            };
                            
                            
                            
                        if (provider.authenticationModel === progress.data.Session.AUTH_TYPE_SSO) {
                            // has the data provider's AuthenticationProvider already been created?
                            if (sessions[provider.authenticationProvider]) {
                                // set the provider option-object's authImpl property so it has the AuthenticationProvider object
                                provider.authImpl = {                    
                                    provider: sessions[provider.authenticationProvider]                    
                                };
                                
                                jsdoSession = new progress.data.JSDOSession(provider);
                                
                                jsdoSession.login(null, null, provider)
                                .then(loginSuccessHandler)
                                .then(addCatalogSuccessHandler)
                                .then(undefined, errorHandler);
                                
                            } else {
                                authProviderConfig = providers[provider.authenticationProvider];
                                authProviderInstance = 
                                     new progress.data.AuthenticationProvider(authProviderConfig.authenticationURI);
                                
                                loginModal()
                                .then(function (result) {
                                    
                                    // App fails if you refresh the page since we get an "Already authenticated" error.
                                    // I'm invalidating the token just as a temporary fix.
                                    authProviderInstance.invalidate();
                                    
                                    authProviderInstance.authenticate(result.email, result.password)
                                    .then(function (apInstance, result, info) {
                                        sessions[provider.authenticationProvider] = apInstance;
                                        provider.authImpl = {    
                                            provider: apInstance
                                        };
                                        jsdoSession = new progress.data.JSDOSession(provider);
                                        return jsdoSession.login(null, null, provider);
                                    })
                                    .then(loginSuccessHandler)
                                    .then(addCatalogSuccessHandler)
                                    .then(undefined,
                                          errorHandler
                                    );
                                })
                                .catch(function (reason) {
                                    console.log(reason);
                                });
                            }
                        } else {
                            jsdoSession = new progress.data.JSDOSession(provider);
                            
                            loginModal()
                            .then(function (result) {
                                return jsdoSession.login(result.email, result.password);
                            })
                            .then(loginSuccessHandler)
                            .then(addCatalogSuccessHandler)
                            .then(undefined, errorHandler)
                            .catch(function (reason) {
                                console.log(reason);
                            });
                
                        }
                });
            });
        })
         // whenshaw  The line above is the end of the code that Alan and Wayne modified
        .config(function ($stateProvider, $urlRouterProvider) {
            $stateProvider
                .state('default', {
                    abstract:true,
                    url: '',
                    views: {
                        
                        'header': {
                            templateUrl: 'components/header/template.html',
                            controller: 'HeaderCtrl'
                        },
                        
                        'side-navigation': {
                            templateUrl: 'components/side-navigation/template.html',
                            controller: 'SideNavigationCtrl'
                        }
                        
                    }
                })
                .state('default.bin', {
                    url: '/bin',
                    views: {
                        'content@': {
                            templateUrl: 'modules/bin/views/index.html',
                            controller: 'BinCtrl'
                        }
                    },
                    resolve: {
                        loadModule: ['$ocLazyLoad', function($ocLazyLoad) {
                            return $ocLazyLoad.load('modules/bin/controllers/index.js');
                        }]
                    }
                })
                .state('default.bin.bin-view', {
                    url: '/bin-view',
                    templateUrl: 'modules/bin/views/bin-view.html',
                    controller: 'BinBinViewCtrl',
                    data: {
                        ensureJsdos: ["Bin"]
                    }
                })
                .state('default.customer', {
                    url: '/customer',
                    views: {
                        'content@': {
                            templateUrl: 'modules/customer/views/index.html',
                            controller: 'CustomerCtrl'
                        }
                    },
                    resolve: {
                        loadModule: ['$ocLazyLoad', function($ocLazyLoad) {
                            return $ocLazyLoad.load('modules/customer/controllers/index.js');
                        }]
                    }
                })
                .state('default.customer.customer-view', {
                    url: '/customer-view',
                    templateUrl: 'modules/customer/views/customer-view.html',
                    controller: 'CustomerCustomerViewCtrl',
                    data: {
                        ensureJsdos: ["SSOwh0331"]
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
                .state('default.employee', {
                    url: '/employee',
                    views: {
                        'content@': {
                            templateUrl: 'modules/employee/views/index.html',
                            controller: 'EmployeeCtrl'
                        }
                    },
                    resolve: {
                        loadModule: ['$ocLazyLoad', function($ocLazyLoad) {
                            return $ocLazyLoad.load('modules/employee/controllers/index.js');
                        }]
                    }
                })
                .state('default.employee.employee-view', {
                    url: '/employee-view',
                    templateUrl: 'modules/employee/views/employee-view.html',
                    controller: 'EmployeeEmployeeViewCtrl',
                    data: {
                        ensureJsdos: ["SSOwhTwo"]
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
