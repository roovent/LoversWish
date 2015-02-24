angular.module('starter', ['ionic', 'starter.controllers', 'app.services'])

.run(function($ionicPlatform) {
    console.log('Platform: ', ionic.Platform.platform());

    $ionicPlatform.ready(function() {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }
        if (window.StatusBar) {
            // org.apache.cordova.statusbar required
            StatusBar.styleDefault();
        }
    });
})

.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state('auth', {
            url: "/auth",
            template: "",
            controller: 'AuthCtrl'
        })
        .state('app', {
            url: "/app",
            abstract: true,
            templateUrl: "templates/menu.html",
            controller: 'AppCtrl',
            resolve: {
                authData: ["Auth", function(Auth) {
                    return Auth.$requireAuth();
                }]
            }
        })
        .state('app.wishlist', {
            url: "/wishlist/:uid",
            views: {
                'content': {
                    templateUrl: "templates/wishlist.html",
                    controller: 'WishlistCtrl',
                    resolve: {
                        authData: ["Auth", function(Auth) {
                            return Auth.$requireAuth();
                        }]
                    }
                }
            }
        })
        .state('app.wish', {
            url: "/wish?wishId",
            views: {
                'content': {
                    templateUrl: "templates/wish.html",
                    controller: 'WishCtrl',
                    resolve: {
                        authData: ["Auth", function(Auth) {
                            return Auth.$requireAuth();
                        }]
                    }
                }
            }
        })
        .state('app.share', {
            url: "/share",
            views: {
                'content': {
                    templateUrl: "templates/share.html",
                    controller: 'ShareCtrl',
                    resolve: {
                        authData: ["Auth", function(Auth) {
                            return Auth.$requireAuth();
                        }]
                    }
                }
            }
        })
        .state('app.account', {
            url: "/account",
            views: {
                'content': {
                    templateUrl: "templates/account.html",
                    controller: 'AccountCtrl',
                    resolve: {
                        authData: ["Auth", function(Auth) {
                            return Auth.$requireAuth();
                        }]
                    }
                }
            }
        })
        .state('app.pictures', {
            url: "/picture/:uid/:wishId",
            views: {
                'content': {
                    templateUrl: "templates/picture.html",
                    controller: 'WishCtrl',
                    resolve: {
                        authData: ["Auth", function(Auth) {
                            return Auth.$requireAuth();
                        }]
                    }
                }
            }
        });

    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/auth');
});
