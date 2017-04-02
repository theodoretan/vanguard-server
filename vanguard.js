const express = require('express');
const http = require('http');
const socket = require('socket.io');

const db = require('./lib/db');
let User = db.User,
	Character = db.Character;

let app = express();
let server = http.Server(app);
let io = socket(server);

let port = process.env.PORT;
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
	client.on('findGame', () => {
		placeClient(client); // put the client in one of the queues
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

	// disconnect
	client.on('disconnect', () => {
		disconnectingClient(client);
		console.log('a user disconnected');
	});

});

server.listen(port, () => {
	console.log(`listening on port: ${port}`);
});


function placeClient(client) {
	if (queue.length === 0) {
		console.log('putting in queue');
		queue.push(client);

		// TODO client.emit(header, data) -> waiting for player 2
	} else {
		console.log('pairing clients');
		let client2 = queue.shift();
		let json = { 'client1': client, 'client2': client2 };

		paired.push(json);

		// TODO client, client2 emit -> start game
	}
}


function disconnectingClient(client) {
	// var placement;
	if (queue.indexOf(client) != -1) {
		queue.splice(queue.indexOf(client), 1);
	} else {
		for (let i = 0; i < paired.length; i++) {
			let pair = paired[i];
			if (pair['client1'] == client || pair['client2'] == client) {
				paired.splice(paired.indexOf(pair), 1);

				// TODO dont place them back into the queue -> send them back to the menu
				var message = { 'message': 'User has disconnected, going back to the menu' };
				if (pair['client1'] == client) {
					// placement = placeClient(pair['client2']);
					pair['client2'].emit('menu', message);
				} else {
					// placement = placeClient(pair['client1']);
					pair['client1'].emit('menu', message);
				}
			} else {
				console.error(`where did this client come from ${client}`);
			}
		}
	}
	// return placement;
}
