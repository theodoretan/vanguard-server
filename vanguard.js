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

	// find game
	client.on('findGame', () => {
		placeClient(client); // put the client in one of the queues
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

		// client.emit(header, data) -> waiting for player 2
	} else {
		console.log('pairing clients');
		let client2 = queue.shift();
		let json = { 'client1': client, 'client2': client2 };

		paired.push(json);

		// client, client2 emit -> start game
	}
}


function disconnectingClient(client) {
	var placement;
	if (queue.indexOf(client) != -1) {
		queue.splice(queue.indexOf(client), 1);
	} else {
		for (let i = 0; i < paired.length; i++) {
			let pair = paired[i];
			if (pair['client1'] == client || pair['client2'] == client) {
				paired.splice(paired.indexOf(pair), 1);
				if (pair['client1'] == client) {
					placement = placeClient(pair['client2']);
				} else {
					placement = placeClient(pair['client1']);
				}
			} else {
				console.error(`where did this client come from ${client}`);
			}
		}
	}
	return placement;
}
