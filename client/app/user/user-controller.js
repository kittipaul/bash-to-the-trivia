angular.module('app.user', ['app.services'])


.controller('HomeController', function($scope,$rootScope, UserInfo, $interval) {
  //Passing data from the UserInfo factory
  $scope.user = UserInfo.user;
  $scope.rooms = UserInfo.rooms;
  $scope.avatar = UserInfo.avatar;
  $scope.users = {};
  $scope.newPlayer = {};
  //gameState properties MUST be nested inside gameState for ng-model to work here
  $scope.gameState = {
    index: -1, //index that user has selected.
    isCorrect: "pending",//pending = no answer yet. "yes"/"no" self explanatory
    numCorrect: 0,
    questionsAttempted: 0, //total num of questions
    gameFinished: false
  };

  $scope.goToRoom = function(roomName) {
    $scope.room = UserInfo.getRoom(roomName);
    $scope.users.usernames = UserInfo.currentRoom.users;
  };

  $scope.addRoom = function(newRoomName) {
    // $scope.rooms[newRoomName] = {roomname: newRoomName, admin: $scope.user};
    UserInfo.addNewRoom(newRoomName);
  };

  $scope.addPlayer = function() {
    var roomname = UserInfo.currentRoom.roomname;
    var newPlayerUsername = $scope.newPlayer.username;
    UserInfo.addNewPlayer(roomname, newPlayerUsername);
  };




//SOCKET.IO EVENT LISTENNERS//
  UserInfo.on('PlayerAdded', function(room, newPlayerUsername) {
    //Making sure we are on the right user/socket before we update the view
    if (newPlayerUsername === UserInfo.user) {
      var promise = new Promise(function(resolve, reject) {
        UserInfo.addedToNewRoom(room);
      });

      return promise.then(function() {
        $scope.rooms = UserInfo.rooms;
      });

    }
  //TODO: promisify addedtoNewRoom and in the then statement update $scope.rooms to re-render

  });

  UserInfo.on('newUserSignedUp', function(data) {
    console.log(data.username, ' got connected');
  });

  UserInfo.on('UserLeft', function(username) {
    console.log(username, ' has left the room');
    UserInfo.removeActiveUser(username);
  });

  UserInfo.on('UserJoined', function(username) {
    console.log(username, ' has joined the room');
    UserInfo.addActiveUser(username);
  });

  UserInfo.on('InvitetoNewRoom', function(roomInfo) {
    UserInfo.invitedToNewRoom(roomname);
  });



///ALISSA Starting Game:
  // UserInfo.on('startGame', function(){
  //   UserInfo.startGame();

  // });

  // UserInfo.on('submitAnswer', function() {
  //   console.log('socket fired on ctrl side')
  //   UserInfo.submitAnswer();
  // })

  $scope.startGame = function() {
    _resetGameState();

    UserInfo.getQuestions(function() {
        UserInfo.playGame(handleRoundEnd, handleGameEnd);
    });

    //function is called at the end of every round
    function handleRoundEnd(answerCorrect) {
      $scope.gameState.questionsAttempted++;
      $scope.gameState.isCorrect = "pending";
    }

    //function is called at the end of every game
    function handleGameEnd() {
      console.log('you got ' + $scope.gameState.numCorrect + '/' + $scope.gameState.questionsAttempted + ' correct');
      $scope.gameState.gameFinished = true;
    }

    //resets the game state to the initial values. called at the start of every game
    function _resetGameState() {
      $scope.gameState = {
        index: -1,
        isCorrect: "pending",
        numCorrect: 0,
        questionsAttempted: 0,
        gameFinished: false
      };
    }
  };

  //no longer used
  $scope.sendQuestion = function() {
    UserInfo.sendQuestion();
  };

  // var len = $scope.questionSet.length;
  //   if (len === 0 ) {
  //     console.log(len,'length checki')
  //     return;

  //     // $interval.cancel();
  //   }

  $scope.submitAnswer=function() {
    UserInfo.evaluateAnswer($scope.gameState.index, function(isCorrect) {
      if (isCorrect) {
        $scope.gameState.numCorrect++;
        $scope.gameState.isCorrect = "yes";
      } else {
        $scope.gameState.isCorrect = "no";
      }
    });
  }

//after an answer has been submited, check if it is right or wrong
  // $scope.submitAnswer=function() {
  //   UserInfo.submitAnswer();
  // };


//////////////////////////////

})


.controller('ProfileController', function($scope, UserInfo, $rootScope) {

  $scope.activeUsers = [];
  $scope.questions = [];
  $scope.answers = [];

})


.controller('GameController', function($scope, UserInfo) {

  //Local scope variable
  $scope.activeUsers = ['dummy1', 'dummy2'];
  $scope.questions = ['what\'s your name?'];
  $scope.answers = [];
  $scope.choices=['A','B','C','D']


})

.controller('RoomController', function($scope, $stateParams, UserInfo) {

  $scope.RoomName = $stateParams.RoomName;
  $scope.users.usernames = UserInfo.currentRoom.usernames;


})

;










