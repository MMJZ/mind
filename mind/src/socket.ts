import { io } from 'socket.io-client';

export const socket = io('192.168.0.8:3000', {
	autoConnect: false,
});
