import { getLogger } from './log';
import { Room } from './room';
import {
	PlayerPosition,
	type MServer,
	createServer,
	IRoom
} from 'shared';

const logger = getLogger();

const io: MServer = createServer();

const maxRooms = 3;

const rooms = new Map<string, IRoom>();

// https://socket.io/docs/v4/memory-usage/
io.engine.on('connection', (rawSocket) => {
	rawSocket.request = null;
});

io.on('connection', async (socket) => {
	socket.data = {
		name: 'Player',
		position: {
			r: 0,
			θ: 0,
			star: false,
			pressing: false,
		},
		focussed: false,
		cards: [],
	};

	logger.info(`p:'${socket.id}' connected`);

	socket.on('disconnect', async (reason: string) => {

		logger.info(`p:'${socket.id}' disconnected reason:'${reason}'`);

		const room = socket.data.room;
		if (room) {
			room.leave(socket);
			if (room.players.length === 0) {
				rooms.delete(room.name);
				
				logger.info(`r:'${room.name} empty; deleting`);
			}
		}
	});

	socket.on('joinRoom', (name: string) => {

		logger.info(`p:'${socket.id}' join room r:'${name}'`);

		if (socket.data.room) {

			logger.warn(`p:'${socket.id}' already in room r:'${name}'`);

			return socket.emit('joinRoomFailure', 'already in a room');
		}
		const room = rooms.get(name);
		if (room) {
			room.join(socket);
		} else if (rooms.size < maxRooms) {

			const newRoom = new Room(io, name, logger);
			rooms.set(name, newRoom);
			newRoom.join(socket);
		} else {
			socket.emit('joinRoomFailure', 'room limit reached');
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
		socket.emit('setNameSuccess', name);
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
