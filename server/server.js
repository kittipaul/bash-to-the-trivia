var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var request = require('request');
var morgan = require('morgan');


var mongoose = require('mongoose');
var db = require('./db-config.js');
var User = require('./app/user-model.js');
var Room = require('./app/room-model.js');
var Question = require('./app/question-model.js');
var questionApi = 'https://www.opentdb.com/api.php?amount=10&difficulty=easy&type=multiple';

var app = express();

//Set up socket.io
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mid1 = require('./middleware.js');
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../client')));
app.use(morgan('dev'));


//SOCKET.IO MANAGEMENT//

io.on('connection', function(socket) {
  socket.on('signUp', function(user) {
    socket.username = user.username;
    //Redirecting users to profile page on sign-up so we create a dummy room 'Profile' in which nothing happens
    socket.room = 'Profile';
    //TODO: add user to the active users of the Profile room in REDIS DB
    socket.join('Profile');
  });

  socket.on('signIn', function(user) {
    socket.username = user.username;
    //Redirecting users to profile page on sign-in so we create a dummy room 'Profile' in which nothing happens
    socket.room = 'Profile';
    //TODO: add user to the active users of the Profile room in REDIS DB
    socket.join('Profile');
  });

  socket.on('changeRoom', function(newRoom) {
    //TODO: Remove socket.username from socket.room in active user db
    if (socket.room !== 'Profile') {
      socket.broadcast.to(socket.room).emit('UserLeft', socket.username);
    }
    socket.leave(socket.room);
    //TODO: Add socket.username to newRoom in active user db
    socket.room = newRoom.roomname;
    socket.join(socket.room);

    if (socket.room !== 'Profile') {
      io.sockets.in(socket.room).emit('UserJoined', socket.username);
    }
  });

  socket.on('addNewRoom', function(newRoom) {
    //TODO: Remove socket.username from socket.room in active user db
    if (socket.room !== 'Profile') {
      socket.broadcast.to(socket.room).emit('UserLeft', socket.username);
    }
    socket.leave(socket.room);
    //TODO: Add socket.username to newRoom in active user db
    socket.room = newRoom.roomname;
    socket.join(socket.room);
  });

  socket.on('addNewPlayer', function(roomname, newPlayerUsername) {
    var savedRoom = {};
    User.findOne({username: newPlayerUsername}).exec(function(err, user) {
      if (err) {
        res.status(400).send('User not found');
      } else {
        var userAlreadyInRoom = false;
        user.rooms.forEach(function(room) {
          if (room === roomname) {
            userAlreadyInRoom = true;
            res.status(400).send('User already in the room');
          }
        });
        if (!userAlreadyInRoom) {
          user.rooms.push(roomname);
          user.save(function(err, user) {
            if (err) {
              return res.status(400).send(new Error('Add new room to user error'));
            }
          }).then(function() {
            Room.findOne({roomname: roomname}).exec(function(err, room) {
              if (err) {
                res.status(400).send('Room doesn\'t exist');
              } else {
                var userAlreadyInRoom = false;
                room.users.forEach(function(user) {
                  if (user === newPlayerUsername) {
                    userAlreadyInRoom = true;
                    res.status(400).send('User already in the room');
                  }
                });
                if (!userAlreadyInRoom) {
                  room.users.push(newPlayerUsername);
                  room.save(function(err, room) {
                    if (err) {
                      return res.status(400).send(new Error('Add new user to room error'));
                    }
                    savedRoom = room;
                  }).then(function(room) {
                    socket.broadcast.emit('PlayerAdded', savedRoom, newPlayerUsername);
                  });
                }
              }
            });
          });
        }
      }
    });
  });

  socket.on('disconnect', function() {
    //TODO: Remove socket.username from socket.room in active user db
    if (socket.room !== 'Profile') {
      socket.broadcast.to(socket.room).emit('UserLeft', socket.username);
    }
    socket.leave(socket.room);
  });

//////ALISSSA Starting Game:

  // socket.on('startGame', function() {


  // });

});

////////////////////////
app.get('/api/users', function(req, res) {
  User.find({}, function(err, users) {
  	console.log(users)
    var allUsers = {};
    users.forEach(function(user) {
      allUsers[user._id] = user;
    });
    res.json(allUsers);
  });
});

app.get('/api/rooms', function(req, res) {
  Room.find({}, function(err, rooms) {
  	console.log(rooms)
    var allrooms = {};
    rooms.forEach(function(room) {
      allrooms[room._id] = room;
    });
    res.json(allrooms);
  });
});

// Gets user info for a specific room
app.get('/api/users/:username', function(req, res) {
	var username = req.params.username;
	User.findOne( {username: username}, function(err, user) {
		res.json({username: username, rooms: user.rooms, avatar: user.avatarUrl})
	})
})

// Gets spcific room info in current user scope
app.get('/api/users/:username/:roomname', function(req, res) {
	var username = req.params.username;
	var roomname = req.params.roomname;
	Room.findOne({roomname: roomname}).exec(function(err, room) {
		res.send(objectifyResp(room, username))
	})
})


app.post('/api/users/addRoom', function(req, res) {
	var roomname = req.body.roomname;
	console.log("PARSED", roomname)
	var admin = req.body.currentUser;
	Room.findOne({roomname:roomname}).exec(function(err, room) {
		if(err || room) {
			console.log("ROOM ERR", room)
			res.status(400).send('bad request');
		} else {
			var newRoom = Room({
				roomname: roomname,
				admin: admin,
				users: [admin]
			});
			newRoom.save(function(err, room) {
				if(err) {
					return res.status(400).send(new Error('saveRoom error'))
				}
			}).then(function(room) {
				User.findOne({username: admin}).exec(function(err, adminUser) {
					if(err || !adminUser) {
						return res.send(new Error('addRoom error'));
					} else {
						adminUser.rooms.push(newRoom.roomname);
						adminUser.save(function(err, user) {
							if(err) {
								res.status(500).send(new Error('Error on save Admin'));
							}
						}).then(function() {
								res.sendStatus(201);
						})
					}
				});
			})
		}
	})
})


app.post('/api/signup', function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	User.findOne({username: username}).exec(function(err, user) {
		if(err) {
			res.send(err);
		} else if(user) {
			res.send();
		} else {
			var promise = new Promise(function(resolve, reject) {
				var newUser = new User({
					username: username,
					password: password
				})
				newUser.save(function(err, user) {
					console.log("ON SAVE", err, user)
					if(err) {
						reject(err);
					} else {
						resolve(user);
					}
				})
			})
			promise.then(function(user) {
				Room.findOne({roomname:'Lobby'}, function(err, room) {
					if(err) return res.sendStatus(500);
					room.users.push(user.username);
					room.save(function(err) {
						if(err) res.send(err)
							res.json(objectifyResp(room, user.username))
					})
				})
			})
		}
	})
})

app.post('/api/signin', function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	User.findOne({username: username}).exec(function(err, user) {
		if(err || !user) {
			return res.send(new Error('login error'));
		} else {
			user.auth(password, user.password).then(function(match) {
				if(match) {
					res.send(user);
				} else {
					res.status(401).end();
				}
			})
		}
	})
})



app.get('/api/questions', function(req, res) {

  var promise = new Promise(function(resolve, reject) {
    request.get(questionApi, function (error, response, body) {
      if (error && !response.statusCode == 200) {
        reject(err);
      } else {
        resolve(body);
      }
    });
  })
  promise.then(function(body) {
    // console.log(body);
    var temp0 = JSON.parse(body).results;

    function translate(src){
      var result={};
      for (var i =0; i<src.length;i++) {

        var q = src[i].question;
        //two most commonly seen one, see if you can combine them into 1 line of code
        var question = q.replace(/&quot;/gi, '\'').replace(/&#039;/gi,'\'');
        //less comon
        // var question= q2.replace(/&eacute;/gi,'e');
        result['question']=question;

        var ca=src[i].correct_answer;
        var correct_answer=ca.replace(/&quot;/gi, '\'').replace(/&#039;/gi,'\'');
        result['correct_answer']=correct_answer;

        var ia=src[i].incorrect_answers;
        var incorrect_answers = [];
        for (j = 0; j<ia.length; j++) {
          incorrect_answers.push(ia[j].replace(/&quot;/gi, '\'').replace(/&#039;/gi,'\''));
        };
        result['incorrect_answers']=incorrect_answers;
        };
      return result;
    }

    var temp = translate(temp0);

      for(var i = 0; i < 10; i++) {
        var qt = new Question({
          question: temp[i].question,
          correctAnswer: temp[i].correct_answer,
          incorrectAnswer: temp[i].incorrect_answers,
        });
        qt.save();
      }
    res.json(temp);
  }).catch(function(err) {
        console.log(err)
        res.json(err)
    })
})


app.get('/api/questionsdb', function(req, res) {
  Question.find({}, function(err, questions) {
    var allquestions = {};
    questions.forEach(function(question) {
    	console.log('ID', question._id)
      allquestions[question._id] = question;
    });
    res.json(allquestions);
  });
});


// HELPER FUNCTIONS
function objectifyResp(selected, username) {
	var currentRoom = {}
	currentRoom[selected.roomname] = {
		roomname: selected.roomname,
		users: selected.users,
		admin: selected.admin
	};
	return {
		username: username,
		room: currentRoom
	}
}

function parser (string) {
	return string[0].toUpperCase() + string.slice(1).toLowerCase();
};



http.listen(8080, function() {
  console.log('Listening to port 8080');
});




