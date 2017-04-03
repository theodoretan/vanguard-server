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
var rooms = [];
var queue = [];
var paired = {};

app.get('/', (req, res) => {
	res.send('hello');
});

io.on('connection', (client) => {
	console.log('a user has connected');

	client.on('register', (data) => {
		let user = new User({ username: data.username, password: data.password });

		user.register()
			.then(res => client.emit('registered', res))
			.catch((e) => {
				if (e.toJSON()['code'] === 11000) client.emit('errorUsernameTaken', e);
				client.emit('error', e);
			});
	});

	client.on('login', (data) => {
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
		let character1 = data.character1;
		let character2 = data.character2;
		let character3 = data.character3;

		console.log(character1);
		console.log(character2);
		console.log(character3);

		let character = new Character({ username: data.username, character1: character1, character2: character2, character3: character3 });

		character.setUserCharacter()
			.then(res => client.emit('setCharacter', res))
			.catch(e => client.emit('error', e));
	});

	client.on('updateCharacter', (data) => {
		Character.updateUserCharacter(data.username, data.character1, data.character2, data.character3)
			.then(res => client.emit('updatedCharacter', res))
			.catch(e => client.emit('error', e));
	});

	// Get characters
	client.on('getCharacter', (data) => {
		Character.getUserCharacter(data.username)
			.then((res) => {
				if (res != null) client.emit('gotCharacter', res);
				else client.emit('noCharacter');
			})
			.catch(e => client.emit('error', e));
	});

	// updateScore
	client.on('updateScore', (data) => {
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


	client.on('getCharacters', (data) => {
		var json = {};

		Character.getUserCharacter(data.opp.username)
			.then((res) => {
				json['oppCharacter'] = res;
				Character.getUserCharacter(data.user.username)
					.then(res => {
						json['userCharacter'] = res;
						client.emit('gotCharacters', json);
					})
					.catch(e => client.emit('error', e));
			})
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
		let json = { 'client' : client, 'gameUser': user };
		queue.push(json);

		client.emit('inqueue', { message: 'waiting for another player' });
	} else {
		console.log('pairing clients');
		let client2 = queue.shift();
		let room = `${user.username}-${client2.gameUser.username}`;
		rooms.push(room);
		client.join(room);
		client2.client.join(room);

		var json = { 'client1': { 'client' : client, 'gameUser': user }, 'client2': client2 };
		paired[room] = json;

		json['room'] = room;

		io.in(room).emit('paired', json);
	}
}


function disconnectingClient(client) {
	var result = queue.filter(obj => obj.client == client);

	if (result != []) {
		queue.splice(queue.indexOf(result[0]), 1);
	} else {
		let message = { 'message': 'User has disconnected, going back to the menu' };
		var rem = null;
		for (var room in paired) {
			let value = paired[room];

			if (value.client1.client == client) {
				rooms.splice(rooms.indexOf(room));
				value.client1.client.leave(room);
				value.client2.client.leave(room);

				rem = room;

				value.client2.client.emit('menu', message);
			} else if (value.client2.client == client) {
				rooms.splice(rooms.indexOf(room));
				value.client1.client.leave(room);
				value.client2.client.leave(room);

				rem = room;

				value.client1.client.emit('menu', message);
			} else {
				console.error(`where did this client come from ${client}`);
			}
		}

		if (rem !== null) {
			delete paired[rem];
		}
	}
}
