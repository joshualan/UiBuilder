(function(angular) {
    'use strict';

    /**
     * @ngdoc overview
     * @name test1
     * @description
     * #
     *
     * Main module of the application.
     */
    angular
        .module('test1', [
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
                sessions = {},
                authentications = {};

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

                // TODO: IMPORTANT: Must also handle fail.
                getProviders()
                    .then(function (providers) {
                        // TODO: Check if valid data provider is specified and return an error if not.
                        var provider = providers[dataProviders[0]],
                            authProviderConfig,
                            authProviderInstance,
                            jsdoSession,
                            deferred = $.Deferred(),
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
                            if (authentications[provider.authenticationProvider]) {
                                // set the provider option-object's authImpl property so it has the AuthenticationProvider object
                                provider.authImpl = {                    
                                    provider: authentications[provider.authenticationProvider]                    
                                };
                                
                                jsdoSession = new progress.data.JSDOSession(provider);
                                
                                deferred.resolve(jsdoSession.login(null, null, provider));
 
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
                                        authentications[provider.authenticationProvider] = apInstance;
                                        provider.authImpl = {    
                                            provider: apInstance
                                        };
                                        
                                        jsdoSession = new progress.data.JSDOSession(provider);
                                        deferred.resolve(jsdoSession.login(null, null, provider));
                                    });
                                })
                                .catch(function (reason) {
                                    console.log(reason);
                                });
                            }
                        } else {
                            jsdoSession = new progress.data.JSDOSession(provider);
                            
                            loginModal()
                            .then(function (result) {
                                deferred.resolve(jsdoSession.login(result.email, result.password));
                            });
                        }
                        
                        deferred.then(function(loginPromise) {
                            loginPromise
                            .then(loginSuccessHandler)
                            .then(addCatalogSuccessHandler)
                            .then(undefined, errorHandler);
                        });
                });
            });
        })
        .config(function ($stateProvider, $urlRouterProvider) {
            $stateProvider
                .state('default', {
                    abstract:true,
                    url: '',
                    views: {
                        'header': {"templateUrl":"components/static-header/template.html","controller":"StaticHeaderCtrl"},
                        'main-navigation': {"templateUrl":"components/side-navigation/template.html","controller":"SideNavigationCtrl"},
                        
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
                .state('default.mod1', {
                    url: '/mod-1',
                    views: {
                        'content@': {
                            templateUrl: 'modules/mod-1/views/index.html',
                            controller: 'Mod1Ctrl'
                        }
                    },
                    resolve: {
                        loadModule: ['$ocLazyLoad', function($ocLazyLoad) {
                            return $ocLazyLoad.load('modules/mod-1/controllers/index.js');
                        }]
                    }
                })
                .state('default.mod1.customers-i-guess', {
                    url: '/customers-i-guess',
                    templateUrl: 'modules/mod-1/views/customers-i-guess.html',
                    controller: 'Mod1CustomersIGuessCtrl',
                    data: {
                        ensureJsdos: []
                    }
                })
                .state('default.mod1.cust', {
                    url: '/cust',
                    templateUrl: 'modules/mod-1/views/cust.html',
                    controller: 'Mod1CustCtrl',
                    data: {
                        ensureJsdos: ["test"]
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
