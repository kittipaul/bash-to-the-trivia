// ADD SERVICES AND FACTORIES HERE

angular.module('app.services', [])
.factory('UserInfo', function($http, $rootScope, $location, $timeout) {
  var socket = io.connect();
  return {
    user: '',
    rooms: {},
    avatar: 'http://www.how-to-draw-funny-cartoons.com/images/draw-a-goose-001.jpg',
    currentRoom: {},
    activeUsers: [],
    getRoom: function(room) {
      socket.emit('changeRoom', room, this.user);
      if (room === 'Profile') {
        this.activeUsers = [];
      }
      return this.currentRoom = this.rooms[room.roomname];
    },


    signUp: function(user) {
      var context = this;
      return $http({
        method: 'POST',
        url: 'api/signup',
        data: user
      }).then(function(resp) {
        if (!resp.data) {
          $location.path('/signin');
        } else {
          context.user = resp.data.username;
          context.rooms = resp.data.room;
          socket.emit('signUp', {username: resp.data.username});
          $location.path('/home/profile');
        }
      }).catch(function(err) {
        console.log('signup error: ', err);
      });
    },
    signIn: function(user) {
      var context = this;
      return $http({
        method: 'POST',
        url: 'api/signin',
        data: user
      }).then(function(resp) {
        console.log('resp', resp);
        if (!resp.data.username) {
          $location.path('/signup');
        } else {
          context.user = resp.data.username;
          socket.emit('signIn', {username: resp.data.username});
          $location.path('/home/profile');
        }
      }).catch(function(err) {
        $location.path('/signin');
        console.log('unauthorized', err);
      });
    },
//RE-IMPLEMENTING SOCKETS.IO METHODS TO USE THEM IN THE CONTROLLERS DUE TO SCOPE ISSUES//
    on: function(eventName, callback) {
      socket.on(eventName, function() {
        var args = arguments;
        $rootScope.$apply(function() {
          callback.apply(socket, args);
        });
      });
    },
    emit: function(eventName, callback) {
      socket.emit(eventName, function() {
        var args = arguments;
        $rootScope.$apply(function() {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      });
    },
/////////////////////////////////////////////////////////////////////
    addNewRoom: function (newRoomName) {
      var context = this;
      socket.emit('addNewRoom', newRoomName);
      return $http({
        method: 'POST',
        url: 'api/users/addRoom',
        data: {roomname: newRoomName, currentUser: this.user}
      }).then(function(resp) {
        console.log('RESP', resp.data);
        context.rooms[newRoomName] = {
          roomname: newRoomName,
          admin: context.user
        };
        context.currentRoom = context.rooms[newRoomName];
      });
    },

    removeActiveUser: function(username) {
      var index = this.activeUsers.indexOf(username);
      this.activeUsers.splice(index, 1);
    },
    addActiveUser: function(username) {
      if (username !== this.user) {
        this.activeUsers.push(username);
      } else {
        //TODO: Emit server request to REDIS DB to get the database of all the active users in the currentroom
      }
    },
    invitedToNewRoom: function(roomInfo) {
      this.rooms[roomInfo.roomname] = roomInfo;
    },
//////ALISSA Starting Game:

    getQuestions: function(cb) {

      function randomizeAnswerChoices(question) {
        var answers = question.incorrect_answers;
        answers.push(question.correct_answer);
        answers = shuffleArr(answers);
        return answers;
      }

      function shuffleArr(arr) {
        for (var i = 0; i < arr.length; i++) {
          var targetIndex = Math.floor(Math.random()*arr.length);
          var temp = arr[targetIndex];
          arr[targetIndex] = arr[i];
          arr[i] = temp;
        }
        return arr;
      }

      //TODO: Emit server request to REDIS DB to get the database of all the active users in the currentroom

      return $http({
        method: 'GET',
        url: '/api/questions',
      }).then(function(resp){

        for (var i = 0; i < resp.data.length; i++) {
          resp.data[i].answerChoices = randomizeAnswerChoices(resp.data[i]);
        }
        $rootScope.questionSet=resp.data;
        console.log('questionSet', JSON.parse(JSON.stringify($rootScope.questionSet)));

        cb();

      })

    },

    playGame: function() {

      function _gameEnd() {
        console.log('game complete')
      }

      function _roundEnd() {
        //checkanswers
        gameStart();
      }

      function _updateQuestion() {
        $rootScope.questionSet.shift();
      }

      function _startTimer() {
        $timeout(function() {
          _roundEnd();
        }, 5000)
      }

      function gameStart() {
        if ($rootScope.questionSet.length >1) {
          _updateQuestion();
          _startTimer();
        } else {
          _gameEnd();
        }
      }

      gameStart();




    },

    sendQuestion: function(){


    },

    submitAnswer: function() {
      console.log('submit answer button has been clicked', $rootScope.$index);
    }

  };
});








