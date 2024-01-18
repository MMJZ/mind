import { Server } from 'socket.io';
import {
	ClientToServerEvents,
	InterServerEvents,
	PlayerPosition,
	ServerToClientEvents,
	SocketData,
} from './model';
import { Room } from './room';

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

	socket.on('disconnect', async (reason: string) => {
		const room = socket.data.room;
		if (room) {
			room.leave(socket);
			if (room.players.length === 0) {
				rooms.delete(room.name);
			}
		}
		console.log(reason);
	});

	socket.on('joinRoom', (name: string) => {
		if (socket.data.room) {
			return socket.emit('joinRoomFailure', 'already in a room');
		}
		const room = rooms.get(name);
		if (room) {
			room.join(socket);
			return;
		}
		if (rooms.size < maxRooms) {
			const newRoom = new Room(io, name);
			rooms.set(name, newRoom);
			newRoom.join(socket);
		} else {
			socket.emit('joinRoomFailure', 'room limit reached');
			return;
		}
	});

	socket.on('leaveRoom', () => {
		if (!socket.data.room) {
			return socket.emit('leaveRoomFailure', 'not in a room');
		}
		socket.data.room.leave(socket);
	});

	socket.on('setName', (name: string) => {
		socket.data.name = name;
		socket.data.room?.sendRoomPosition();
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

	socket.on('roundStart', async () => {
		if (socket.data.room) {
			await socket.data.room.startRound(socket);
		}
	});
});
