import { Server } from 'socket.io';
import {
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
} from './interface';
import { MServer, SocketData } from './room';

export function createServer(): MServer {
	return new Server<
		ClientToServerEvents,
		ServerToClientEvents,
		InterServerEvents,
		SocketData
	>(3000, {
		cors: {
			origin: ['http://localhost:5173', 'http://192.168.0.8:5173'],
		},
	});
}
