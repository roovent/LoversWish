angular.module('starter.controllers', ['app.services', 'ngStorage', 'firebase'])

.controller('AuthCtrl', function($scope, $state, $ionicModal, $ionicHistory, Auth, Utils) {
    function gotoMainView(uid) {
        $ionicHistory.nextViewOptions({
            disableAnimate: true,
            disableBack: true,
            // historyRoot: true
        });
        $state.go("app.wishlist", {
            uid: uid
        });
    }

    $scope.$on('$ionicView.beforeEnter', function() {
        console.log('$ionicView.beforeEnter');
        var authData = Auth.$getAuth();
        if (authData) {
            gotoMainView(authData.uid);
        }
    });

    Auth.$onAuth(function(authData) {
        if (!authData) {
            if ($scope.modal) {
                $scope.modal.show();
            } else {
                /* Create the login modal that we will use later */
                $ionicModal.fromTemplateUrl('templates/login.html', {
                    scope: $scope,
                    hardwareBackButtonClose: false
                }).then(function(modal) {
                    $scope.modal = modal;
                    modal.show();
                });
            }
        } else {
            gotoMainView(authData.uid);
        }
    });

    $scope.loginData = {};
    $scope.loginMode = true;

    $scope.closeLogin = function() {
        $scope.modal.hide();
        $scope.loginMode = true;
    };

    $scope.setLoginMode = function(loginMode) {
        $scope.loginMode = loginMode;
    };

    // Perform the login action when the user submits the login form
    $scope.doLogin = function() {
        if ($scope.loginMode) { /* Login */
            Auth.$authWithPassword($scope.loginData).then(function(authData) {
                $scope.closeLogin();
            }).catch(function(error) {
                Utils.toastLong(error.message);
            });
        } else { /* sign up */
            Auth.$createUser($scope.loginData).then(function(userData) {
                console.log("User " + userData.uid + " created successfully!");
                $firebase(ref.emailUidMap().child(Utils.emailToKey($scope.loginData.email))).$set(userData.uid);
                $firebase(ref.displayName(userData.uid)).$set($scope.loginData.displayName);

                $scope.loginMode = true;
                $scope.doLogin();
            }).catch(function(error) {
                Utils.toastLong(error.message);
            });
        }
    };
})

.controller('AppCtrl', function($scope, $state, $ionicModal, $ionicHistory, $firebase, $firebaseAuth, authData, Utils, Ref, Auth) {
    $scope.uid = authData.uid;

    var list = $firebase(Ref.beSharedList(authData.uid)).$asArray();
    list.$watch(function(event) {
        if (event.event == 'child_added') {
            var rec = list.$getRecord(event.key);
            $firebase(Ref.displayName(rec.$value)).$asObject().$loaded().then(function(dName) {
                rec.uid = rec.$value;
                rec.displayName = dName.$value;
            });
        }
    });
    $scope.beSharedList = list;
})

.controller('WishlistCtrl', function($scope, $state, $stateParams, $ionicPopup, $firebase, $firebaseAuth, authData, Utils, Ref) {
    console.log($stateParams.uid);
    $scope.editable = ($stateParams.uid == authData.uid);
    var uid = $stateParams.uid || authData.uid;
    $scope.uid = uid;

    $scope.wishlist = $firebase(Ref.wishlist(uid)).$asArray();

    $scope.removeWish = function(wishId) {
        $ionicPopup.confirm({
            title: 'Delete?',
            template: 'Your wish will be removed from you wishlist.'
        }).then(function(res) {
            if (res) {
                var wishlist = $scope.wishlist;
                wishlist.$remove(wishlist.$indexFor(wishId));
                $firebase(Ref.wishPictures(uid, wishId)).$asObject().$remove();
            }
        });
    };

    $scope.clickUrl = function(url) {
        window.open(url, '_system');
    };

    $scope.addWish = function() {
        $state.go('app.wish');
    };
})

.controller('WishCtrl', function($scope, $stateParams, $timeout, $ionicHistory, $ionicLoading, $firebase, $firebaseAuth, authData, Utils, Ref, Camera) {
    var uid = $stateParams.uid || authData.uid;
    var editMode = $stateParams.wishId ? true : false; /* edit or create */

    $scope.wish = {};
    $scope.pics = [];

    var pics = $scope.pics;
    var savedPics = null;

    if (editMode) { /* if edit mode, read existing data. */
        $scope.wish = $firebase(Ref.wishlist(uid).child($stateParams.wishId)).$asObject();
        $timeout(function() {
            /* Downloading pictures takes a while, so delay to avoid interfering UI. */
            $ionicLoading.show({
                template: 'Loading...'
            });

            savedPics = $firebase(Ref.wishPictures(uid, $stateParams.wishId)).$asArray();
            savedPics.$loaded().then(function() {
                for (var i = 0; i < savedPics.length; ++i) {
                    pics.push(savedPics[i]);
                }

                $ionicLoading.hide();
            });
        }, 400);
    }

    $scope.saveWish = function() {
        var url = $scope.wish.url;
        if (url) {
            if (!Utils.validateUrl(url)) {
                $scope.wish.url = 'http://' + url;
            }
        }

        //$scope.wish.hasPicture = ($scope.newPics.length > 0 || ($scope.pictures !== null && $scope.pictures.length > 0));

        if (editMode) {
            $scope.wish.hasPicture = false;
            pics.forEach(function(p) {
                if ('$id' in p) { /* existing picture */
                    if (p.deleted) {
                        savedPics.$remove(savedPics.$indexFor(p.$id));
                    } else {
                        $scope.wish.hasPicture = true;
                    }
                } else { /* new picture */
                    if (!p.deleted) {
                        savedPics.$add(p);
                        $scope.wish.hasPicture = true;
                    }
                }
            });
            $scope.wish.$save();
        } else { /* createMode */
            $scope.wish.hasPicture = false;
            var wishlist = $firebase(Ref.wishlist(uid)).$asArray();
            wishlist.$add($scope.wish).then(function(wish) {
                pics.forEach(function(p) {
                    if (!p.deleted) {
                        $firebase(Ref.wishPictures(uid, wish.key())).$asArray().$add(p);
                        wish.update({
                            hasPicture: true
                        });
                    }
                });

            });
        }

        $ionicHistory.goBack();
    };

    $scope.insertPic = function(camera) {
        Camera.getPicture(camera).then(function(imageURI) {
            pics.push({
                $value: 'data:image/jpeg;base64,' + imageURI
            });
        }, function(err) {
            Utils.toastLong(err);
        });
    };

    $scope.delPic = function(index) {
        pics[index].deleted = true;
    };
})

.controller('ShareCtrl', function($scope, $ionicPopup, $firebase, $firebaseAuth, authData, Utils, Ref) {
    $scope.inputData = {};

    var shareList = $firebase(Ref.shareList(authData.uid)).$asArray();
    $scope.shareList = shareList;

    $scope.add = function() {
        var email = $scope.inputData.email;
        if (email == authData.password.email) { /* user-self */
            Utils.toastLong('Please enter email address other than yours.');
            return;
        }

        for (var i = 0; i < shareList.length; ++i) {
            if (shareList[i].email == email) { /* duplicate */
                Utils.toastLong(email + ' already in your share list.');
                return;
            }
        }

        if (Utils.validateEmail(email)) {
            var emailKey = Utils.emailToKey(email);
            var uidObj = $firebase(Ref.emailUidMap().child(emailKey)).$asObject();
            uidObj.$loaded().then(function() {
                var uid = uidObj.$value;
                if (uid) { /* Successful */
                    $scope.shareList.$add($scope.inputData);

                    var list = $firebase(Ref.beSharedList(uid)).$asArray();
                    list.$add(authData.uid);

                    /* clear */
                    $scope.inputData = {};
                } else { /* Not a registered user */
                    console.log(email + ' is not a registered user.');
                    $ionicPopup.confirm({
                        title: 'Invite ' + email + '?',
                        template: email + ' is not a registered user. Do you want to invite him/her to use Lover\'s Wish?'
                    }).then(function(res) {
                        if (res) {
                            //TODO: send invitation
                        }
                    });
                }

            }).catch(function(error) {
                console.error("Error:", error);
            });
        } else { /* invalid email address */
            Utils.toastLong('Please input a valid email address.');
        }
    };

    $scope.del = function(shareId, shareEmail) {
        var shareList = $scope.shareList;
        shareList.$remove(shareList.$indexFor(shareId));

        var emailKey = Utils.emailToKey(shareEmail);
        $firebase(Ref.emailUidMap().child(emailKey)).$asObject().$loaded().then(function(uidObj) {
            var uid = uidObj.$value;
            if (uid) {
                $firebase(Ref.beSharedList(uid)).$asArray().$loaded().then(function(list) {
                    for (var i = 0; i < list.length; ++i) {
                        if (list[i].$value == authData.uid) {
                            list.$remove(i);
                            break;
                        }
                    }
                });
            }
        });
    };
})

.controller('AccountCtrl', function($scope, $state, $ionicPopup, $firebase, $firebaseAuth, authData, Utils, Ref, Auth) {
    $scope.title = authData.password.email;
    $scope.profile = {};

    $firebase(Ref.profile(authData.uid)).$asObject().$loaded().then(function(obj) {
        var profile = {};
        $scope.profile.name = obj.name || '';
        $scope.profile.gender = obj.gender || 'Male';
        $scope.profile.birthday = new Date(obj.birthday || 631170000000); /* 1/1/1990 is default */
    });

    $scope.saveProfile = function() {
        var profile = JSON.parse(JSON.stringify($scope.profile)); /* copy object */
        profile.birthday = $scope.profile.birthday.getTime();
        $firebase(Ref.profile(authData.uid)).$set(profile).then(function() {
            Utils.toastLong('Profile saved');
        });
    };

    $scope.logout = function() {
        $ionicPopup.confirm({
            title: 'Logout?',
            template: 'Are you going to logout?'
        }).then(function(res) {
            if (res) {
                Auth.$unauth();
                $state.reload();
            }
        });
    };
});
