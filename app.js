(function(angular) {
    'use strict';

    /**
     * @ngdoc overview
     * @name SSO
     * @description
     * #
     *
     * Main module of the application.
     */
    angular
        .module('SSO', [
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
                 var dataProviders = toState.data ? toState.data.ensureJsdos : null;

                // TODO: IMPORTANT: Authenticaton logic must change to handle mutiple providers.
                if (!dataProviders || !dataProviders.length || sessions[dataProviders[0]]) {
                    return;
                }

                event.preventDefault();

                loginSuccessHandler = function (jsdosession) {                    
                    promise = jsdosession.addCatalog(provider.catalogUris[0]);
                    promise.done(function() {                        
                        sessions[dataProviders[0]] = true;
                        $state.go(toState.name, toParams);
                    }).fail(function(jsdosession, result, details){
                        console.log(details);
                    });
                };
                
                loginFailHandler = function(jsdosession, result, info){                  
                    console.log(info);
                };
                
                // TODO: IMPORTANT: Must also handle fail.
                getProviders().then(function (providers) {
                        
                    // TODO: Check if valid data provider is specified and retrun an error if not.
                    var provider = providers[dataProviders[0]],
                        authProviderFromDataProvidersFile,
                        authProviderInstance,
                        jsdoSession;
                            
                    if (provider.authenticationModel === progress.data.Session.AUTH_TYPE_OECP) {
                        // has the data provider's AuthenticationProvider already been created?
                        if (sessions[provider.authenticationProvider]) {
                            // set the provider option-object's authImpl property so it has the AuthenticationProvider object
                            provider.authImpl = {                    
                                provider: sessions[provider.authenticationProvider]                    
                            };
                                
                            jsdoSession = new progress.data.JSDOSession(provider);
                            return jsdoSession.login();
                        } else {
                            authProviderFromDataProvidersFile = providers[provider.authenticationProvider];
                            authProviderInstance = 
                                new progress.data.AuthenticationProvider(authProviderFromDataProvidersFile.authenticationURI);
                            
                            loginModal().then(function (result) {
                                authProviderInstance.authenticate(result.email, result.password).
                                done(function (apInstance) {
                                    sessions[provider.authenticationProvider] = apInstance;
                                    provider.authImpl = {
                                        provider: apInstance
                                    };
                                    
                                    jsdoSession = new progress.data.JSDOSession(provider);
                                    return jsdoSession.login();
                                }).fail(function(ap, result, info){
                                    console.log("failed to get token \n" + info);
                                });
                            }).catch(function (reason) {
                                console.log(reason);
                            });
                        }
                    } else {
                        // TODO: Optimize the code block below
                        loginModal().then(function (result) {
                            return jsdoSession.login(result.email, result.password);
                        }).catch(function (reason) {
                            console.log(reason);
                        });
                    }
                }).then(function (jsdosession) {                    
                    promise = jsdosession.addCatalog(provider.catalogUris[0]);
                    promise.done(function() {                        
                        sessions[dataProviders[0]] = true;
                        $state.go(toState.name, toParams);
                    }).fail(function(jsdosession, result, details){
                        console.log(details);
                    });
                }, function(jsdosession, result, info){                  
                    console.log(info);
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
                            templateUrl: 'components/header/template.html',
                            controller: 'HeaderCtrl'
                        },
                        
                        'side-navigation': {
                            templateUrl: 'components/side-navigation/template.html',
                            controller: 'SideNavigationCtrl'
                        }
                        
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
                .state('default.employee.bin-view', {
                    url: '/bin-view',
                    templateUrl: 'modules/employee/views/bin-view.html',
                    controller: 'EmployeeBinViewCtrl',
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
