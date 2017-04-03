const express = require('express');
const http = require('http');
const socket = require('socket.io');

const db = require('./lib/db');
let User = db.User,
	Character = db.Character;

let app = express();
let server = http.Server(app);
let io = socket(server);

let port = process.env.PORT || 8080;
var queue = [];
var paired = [];

app.get('/', (req, res) => {
	res.send('hello');
});

io.on('connection', (client) => {
	console.log('a user has connected');

	client.on('register', (data) => {
		// maybe dont need??
		// data = JSON.parse(data);

		let user = new User({ username: data.username, password: data.password });

		// TODO: this will emit back 1. registered -> go to menu 2. username in use -> try another username 3. a different error: email this in
		user.register()
			.then(res => client.emit('registered', res))
			.catch((e) => {
				if (e.toJSON()['code'] === 11000) client.emit('errorUsernameTaken', e);
				client.emit('error', e);
			});
	});

	client.on('login', (data) => {
		// maybe we don't need this
		// console.log(data);

		User.login(data.username, data.password)
			.then(res => client.emit('loggedIn', res))
			.catch(e => client.emit('error', e));
	});

	// find game
	client.on('findGame', (user) => {
		placeClient(client, user); // put the client in one of the queues
	});

	// set users character
	client.on('setCharacter', (data) => {
		let character1 = JSON.parse(data.character1);
		let character2 = JSON.parse(data.character2);
		let character3 = JSON.parse(data.character3);

		let character = new Character({ username: data.username, character1: character1, character2: character2, character3: character3 });

		character.setUserCharacter()
			.then(res => client.emit('setCharacter', res))
			.catch(e => client.emit('error', e));
	});


	// Get characters
	client.on('getCharacter', (data) => {

		// data = JSON.parse(data);

		Character.getUserCharacter(data.username)
			.then(res => client.emit('gotCharacter', res))
			.catch(e => client.emit('error', e));
	});

	// updateScore
	client.on('updateScore', (data) => {
		// data = JSON.parse(data);

		User.updateScore(data.id, data.wins, data.losses)
			.then(res => client.emit('scoreUpdated', res))
			.catch(e => client.emit('error',e));

	});


	// get score
	client.on('getScore', (data) => {

		User.getUserById(data.id)
			.then(res => client.emit('gotScore', res))
			.catch(e => client.emit('error', e));
	});

	// disconnect
	client.on('disconnect', () => {
		disconnectingClient(client);
		console.log('a user disconnected');
	});

});

server.listen(port, () => {
	console.log(`listening on port: ${port}`);
});


function placeClient(client, user) {
	if (queue.length === 0) {
		console.log('putting in queue');
		let json = { 'client' : client, 'game-user': user };
		queue.push(json);

		client.emit('inqueue', { message: 'waiting for another player' });
	} else {
		console.log('pairing clients');
		let client2 = queue.shift();
		let json = { 'client1': { 'client' : client, 'game-user': user }, 'client2': client2 };

		paired.push(json);

		// TODO client, client2 emit -> start game

	}
}


function disconnectingClient(client) {
	var result = queue.filter(obj => obj.client == client);

	if (result != []) {
		queue.splice(queue.indexOf(result[0]), 1);
	} else {
		result = paired.filter(obj => obj.client1.client == client || obj.client2.client == client);
		if (result != []) {
			result = result[0];
			paired.splice(paired.indexOf(result), 1);

			var message = { 'message': 'User has disconnected, going back to the menu' };
			if (result.client1.client == client) {
				result.client2.client.emit('menu', message);
			} else {
				result.client1.client.emit('menu', message);
			}
		} else {
			console.error(`where did this client come from ${client}`);
		}
	}
}
