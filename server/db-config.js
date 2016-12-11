var mongoose = require('mongoose');

var currentDB = process.env.MONGO_URL || 'mongodb://localhost/users';


//set the connect URL to currentDB;
mongoose.connect(currentDB);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
	// *** uncomment line below to reset db
	// db.dropDatabase();
  console.log('db connected with mongoose');
});


