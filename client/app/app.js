angular.module('app', ['app.auth', 'app.user', 'ui.router'])


.config(function($stateProvider, $httpProvider) {

  $stateProvider
  .state('signinState', {
    url: '/signin',
    templateUrl: 'app/auth/signin.html',
    controller: 'AuthController'
  })
  .state('signupState', {
    url: '/signup',
    templateUrl: 'app/auth/signup.html',
    controller: 'AuthController'
  })
  .state('homeState', {
    url: '/home',
    abstract: true,
    templateUrl: 'app/user/home.html',
    controller: 'HomeController'
  })
  .state('homeState.profile', {
    url: '/profile',
    templateUrl: 'app/user/home.profile.html', //#1 view
    controller: 'HomeController'
  })
  .state('homeState.room', {
    url: '/room/:roomname',
    templateUrl: 'app/user/home.room.html',
    controller: 'HomeController'
  })
  .state('homeState.game', {
    url: '/game',
    templateUrl: 'app/user/home.game.html',
    controller: 'HomeController'
  })
  .state('otherwise', {
    url: '*path',
    templateUrl: 'app/user/landing-page.html',
  });

  // $httpProvider.interceptors.push('AttachTokens');

})
// .factory('AttachTokens', function($window) {

//   var attach = {
//     request: function(object) {
//       var jwt = $window.localStorage.getItem('com.trivia');
//       if (jwt) {
//         object.headers['x-access-token'] = jwt;
//       }
//       object.headers['Allow-Control-Allow-Origin'] = '*';
//       return object;
//     }
//   };
//   return attach;
// }).run(function($rootScope, $location, UserInfo) {

//   $rootScope.$on('$stateChandeStart', function(event, next, current) {
//     if (next.$$state && next.$$state.authenticate &&)
//   })

// });