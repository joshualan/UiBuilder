(function(angular) {
    'use strict';

    /**
     * @ngdoc overview
     * @name builderTest
     * @description
     * #
     *
     * Main module of the application.
     */
    angular
        .module('builderTest', [
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

            function getProvidersHandler(providers) {
                // TODO: Check if valid data provider is specified and retrun an error if not.
                var provider = providers[dataProviders[0]],
                    authProviderFromDataProvidersFile,
                    authProviderInstance,
                    jsdoSession;
                
                function loginSuccessHandler(jsdosession) {
                    jsdosession.addCatalog(provider.catalogUris[0])
                        .then(function () {
                            sessions[dataProviders[0]] = true;
                            $state.go(toState.name, toParams);
                        }, function (jsdosession, result, details) {
                            console.log(details);
                        });
                }
                
                function loginFailureHandler(jsdosession, result, info) {
                    console.log(info);
                }

                function authenticateSuccessHandler(apInstance) {
                    sessions[provider.authenticationProvider] = apInstance;
                    provider.authImpl = {
                        provider: apInstance
                    };

                    jsdoSession = new progress.data.JSDOSession(provider);
                    jsdoSession.login()
                        .then(loginSuccessHandler, loginFailureHandler);
                }
                
                function authenticateFailureHandler(ap, result, info) {
                    console.log("Failed to get token \n" + info);                    
                }
                
                function loginModalCatch(reason) {            
                    console.log(reason);
                }
                
                if (provider.authenticationModel === progress.data.Session.AUTH_TYPE_OECP) {
                    // has the data provider's AuthenticationProvider already been created?
                    if (sessions[provider.authenticationProvider]) {
                        // set the provider option-object's authImpl property so it has the AuthenticationProvider object
                        provider.authImpl = {
                            provider: sessions[provider.authenticationProvider]
                        };

                        jsdoSession = new progress.data.JSDOSession(provider);
                        jsdoSession.login()
                            .then(loginSuccessHandler, loginFailureHandler);

                    } else {
                        authProviderFromDataProvidersFile = providers[provider.authenticationProvider];
                        authProviderInstance =
                            new progress.data.AuthenticationProvider(authProviderFromDataProvidersFile.authenticationURI);
                        
                        loginModal()
                            .then(function (result) {

                                if (!authProviderInstance.isAuthenticated()) {
                                    authProviderInstance.authenticate(result.email, result.password)
                                        .then(authenticateSuccessHandler, authenticateFailureHandler);
                                }
                            })
                            .catch(loginModalCatch);
                    }
                } else {
                    // TODO: Optimize the code block below
                    jsdoSession = new progress.data.JSDOSession(provider);

                    loginModal()
                        .then(function (result) {
                            jsdoSession.login(result.email, result.password)
                                .then(loginSuccessHandler, loginFailureHandler);
                        })
                        .catch(loginModalCatch);
                }
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
                    .then(getProvidersHandler);
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
                .state('default.mod1.view-1', {
                    url: '/view-1',
                    templateUrl: 'modules/mod-1/views/view-1.html',
                    controller: 'Mod1View1Ctrl',
                    data: {
                        ensureJsdos: ["SSOConsumer"]
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
