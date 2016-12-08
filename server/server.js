var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var mongoose = require('mongoose');
var morgan = require('morgan');
var db = require('./db-config.js');
var User = require('./app/user-model.js');
var Question = require('./app/question-model.js');
var request = require('request');
var questionApi = 'https://www.opentdb.com/api.php?amount=10&difficulty=easy&type=multiple';

var play = require('./app/play-model.js');
var Room = require('./app/room-model.js');
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

app.get('/api/people', function(req, res) {
  play.Person.find({}, function(err, people) {
    var allPeople = {};
    people.forEach(function(person) {
      people[person._id] = person;
    });
    res.json(allPeople);
  });
});

app.get('/api/stories', function(req, res) {
  play.Story.find({}, function(err, stories) {
    var allStories = {};
    stories.forEach(function(story) {
      stories[story._id] = story;
    });
    res.json(allStories);
  });
});

////////////////////////
app.get('/api/users', function(req, res) {
  User.find({}, function(err, users) {
  	console.log(users)
    var allUsers = {};
    users.forEach(function(user) {
    	console.log('ID', user._id)
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
    	console.log('ID', room._id)
      allrooms[room._id] = room;
    });
    res.json(allrooms);
  });
});


app.post('/api/users/addRoom', function(req, res) {
	var roomname = req.body.roomname;
	console.log("PARSED", roomname)
	var admin = req.body.currentUser;
	Room.findOne({roomname:roomname}).exec(function(err, room) {
		if(err || !roomname) {
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
						// res.status(500).json(new Error('Error on save'));
						reject(err);
					} else {
						resolve(user);
					}
				})
			})

			promise.then(function(user) {
				console.log("USER", user)
				var promise2 = new Promise(function(resolve, reject) {
					Room.findOne({roomname:'Lobby'}, function(err, room) {
						console.log(room)
						if(err) {
							reject(err);
						} else {
							var response = {};
							response.room = {};
							room.users.push(user.username);
							response.room[room.roomname] = {
								roomname: room.roomname,
								usernames: room.users
							}
							response.username = user.username;
							room.save(function () {
								if(err) {
									res.send(err)
								}	else {
									res.json(response)
								}
							})
						}
					})
				})
				promise2.then(function(resp) {
					console.log('RESPONSE 2', resp)
					res.send(resp)
				});
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

function parser (string) {
	return string[0].toUpperCase() + string.slice(1).toLowerCase();
};

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
    var temp = JSON.parse(body).results;
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



http.listen(8080, function() {
  console.log('Listening to port 8080');
});




