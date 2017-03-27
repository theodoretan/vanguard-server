const mongoose = require('mongoose');

let user = process.env.USER;
let pass = process.env.PASS;

mongoose.connect(`mongodb://${user}:${pass}@ds141450.mlab.com:41450/vanguard`);

console.log('connected to the database');

let Schema = mongoose.Schema,
	Mixed = Schema.Types.Mixed;

var exports = {};
var userSchema, characterSchema;
var User, Character;

userSchema = new Schema({
	username: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	score: {type: Number, default: 0},
	wins: {type: Number, default: 0},
	losses: {type: Number, default: 0},
	streak: {type: Number, default: 0}
});

characterSchema = new Schema({
	username: { type: String, required: true, unique: true },
	character1: { type: Mixed, required: true},
	character2: { type: Mixed, required: true},
	character3: { type: Mixed, required: true}
});

// define schema functions
// TODO: look at Trello

userSchema.methods.register = function() {
	return new Promise((resolve, reject) => {
		this.save((err, created) => {
			if (err) reject(err);
			resolve(created);
		});
	});
};

userSchema.statics.login = function(username, password) {
	return new Promise((resolve, reject) => {
		this.model('User').findOne({ 'username': username, 'password': password }, (err, user) => {
			if (err) reject(err);
			resolve(user);
		});
	});
};

userSchema.statics.getUserById = function(id) {
	return new Promise((resolve, reject) => {
		this.model('User').findById(id, (err, user) => {
			if (err) reject(err);
			resolve(user);
		});
	});
};

userSchema.statics.updateScore = function(id, wins, losses, disconnect = false) {
	return new Promise((resolve, reject) => {
		this.model('User').findById(id, (err, user) => {
			if (err) reject(err);

			if (disconnect) {
				user.streak = 0;
				user.losses = user.losses + 1;
				user.score = user.score - 10; // penalty for d/c
			} else {
				user.wins = user.wins + wins;
				user.losses = user.losses + losses;
				if (wins === 1) {
					user.streak = user.streak + 1;
					user.score = user.score + 10;
				} else {
					user.streak = 0;
					user.score = user.score - 5;
				}
			}

			user.save((err, updated) => {
				if (err) reject(err);
				resolve(updated);
			});
		});
	});
};


characterSchema.methods.setUserCharacter = function() {
	return new Promise((resolve, reject) => {
		this.save((err, result) => {
			if (err) reject(err);
			resolve(result);
		});
	});
};

characterSchema.statics.getUserCharacer = function(username) {
	return new Promise((resolve, reject) => {
		this.model('Character').findOne({ 'username': username }, (err, result) => {
			if (err) reject(err);
			resolve(result);
		});
	});
};

// make models
User = mongoose.model('User', userSchema);
Character = mongoose.model('Character', characterSchema);

exports.User = User;
exports.Character = Character;

module.exports = exports;
