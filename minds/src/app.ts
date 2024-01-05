import { Server } from 'socket.io';
import {
	ClientToServerEvents,
	InterServerEvents,
	PlayerPosition,
	Room,
	ServerToClientEvents,
	SocketData,
} from './model';

const io = new Server<
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
>(3000, {
	cors: {
		origin: ['http://localhost:5173', 'http://192.168.0.8:5173'],
	},
});

const maxRooms = 1;

// function deal(players: number, each: number): number[][] {
// 	const deck = [...Array(101).keys()].slice(1);
// 	for (let i = deck.length - 1; i > 0; i--) {
// 		const j = Math.floor(Math.random() * (i + 1));
// 		const temp = deck[i];
// 		deck[i] = deck[j];
// 		deck[j] = temp;
// 	}

// }

const rooms = new Map<string, Room>();

// https://socket.io/docs/v4/memory-usage/
io.engine.on('connection', (rawSocket) => {
	rawSocket.request = null;
});

io.on('connection', async (socket) => {
	socket.data = {
		name: socket.id,
		position: {
			x: 0,
			y: 0,
			star: false,
		},
		focussed: false,
		cards: [],
	};

	socket.on('disconnect', async (reason) => {
		console.log('closed!', reason);
		console.log('connected:', (await io.fetchSockets()).length);
		return 2;
	});

	socket.on('joinRoom', (name: string) => {
		if (socket.data.room) {
			return socket.emit('joinRoomFailure', 'already in a room');
		}
		let room = rooms.get(name);
		if (!room) {
			if (rooms.size < maxRooms) {
				room = new Room(io, name);
				rooms.set(name, room);
			} else {
				socket.emit('joinRoomFailure', 'room limit reached');
				return;
			}
		}
		room.join(socket);
	});

	socket.on('setName', (name: string) => {
		socket.data.name = name;
	});

	socket.on('setFocus', async (focus: boolean | unknown) => {
		if (socket.data.room) {
			await socket.data.room.playerSetFocus(socket, focus);
		}
	});

	socket.on('setPosition', async (position: PlayerPosition) => {
		if (socket.data.room) {
			await socket.data.room.playerSetPosition(socket, position);
		}
	});

	socket.on('playCard', async () => {
		if (socket.data.room) {
			await socket.data.room.cardPlayed(socket);
		}
	});
});
