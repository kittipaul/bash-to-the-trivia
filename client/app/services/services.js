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
      this.currentRoom = this.rooms[room.roomname];
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
          console.log("FORMAT", resp.data);
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
      console.log('newRoomName', newRoomName)
      var context = this;
      socket.emit('addNewRoom', newRoomName);
      return $http({
        method: 'POST',
        url: 'api/users/addRoom',
        data: {roomname: newRoomName, currentUser: this.user}
      }).then(function(resp) {
        context.rooms[newRoomName] = {
          roomname: newRoomName,
          admin: context.user
        };
        context.currentRoom = context.rooms[newRoomName];
        $location.path('/home/room/' + newRoomName);
      });
    },
    addNewPlayer: function(roomname, newPlayerUsername) {
      socket.emit('addNewPlayer', roomname, newPlayerUsername);
    },
    addedToNewRoom: function(room) {
      this.rooms[room.roomname] = room;
      //TODO: update rooms object to add the new roomname, admin and users
      console.log('You have been added to', room.roomname);
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

///////////////// ...ALISSA Starting on Game... /////////////////

//getQuestions --> send request to server/API to fetch a set of 10 questions.
//in the meantime, mash up the correct answer and incorrect answers and store them all in the answers array.
    getQuestions: function(cb) {
      function randomizeAnswerChoices(question) {
        var answers = question.incorrect_answers;
        answers.push(question.correct_answer);
        answers = shuffleArr(answers);
        return answers;
      };

      function shuffleArr(arr) {
        for (var i = 0; i < arr.length; i++) {
          var targetIndex = Math.floor(Math.random()*arr.length);
          var temp = arr[targetIndex];
          arr[targetIndex] = arr[i];
          arr[i] = temp;
        }
        return arr;
      };

      //starts with %, and ends with ;
      //find charStart:%* charEnd;
      //2 replace stmt
      //1. '
      //2. ""

      return $http({
          method: 'GET',
          url: '/api/questions',
        }).then(function(resp){

        for (var i = 0; i < resp.data.length; i++) {
          resp.data[i].answerChoices = randomizeAnswerChoices(resp.data[i]);
        };

        $rootScope.questionSet=resp.data;
        console.log('test', $rootScope)

        cb();
      })
    },

    playGame: function(roundEndCb, gameEndCb) {
      var roundDuration = 6000;

      //Triggered at the start of every question. Starts a timer of roundDuration milliseconds.
      function _startTimer(roundDuration) {
        $timeout(function() {
          _roundEnd();
        }, roundDuration)
      }

      //Triggered at the end of every question. starts a new round aka next question.
      function _roundEnd() {
        roundEndCb();
        gameStart();
      }

      //Triggered at the end of every game (aka all questions done)
      function _gameEnd() {
        gameEndCb();
      }

      //starts the whole game. gameStart is recursive as it calls itself inside of startTimer via _roundEnd(). Once game has ended (as determined by there being no more questions in questionSet) _gameEnd is triggered
      function gameStart() {
        if ($rootScope.questionSet.length > 1) {
          _startTimer(roundDuration);
        } else {
          _gameEnd();
        }
      }

      gameStart();
    },

    evaluateAnswer: function(selectedIndex, cb) {
      var activeQuestion = $rootScope.questionSet[0];
      var isCorrect = activeQuestion.answerChoices[selectedIndex] === activeQuestion.correct_answer
      cb(isCorrect);
    }

///////////////// ...ALISSA Ending on Game... /////////////////

  };
});








