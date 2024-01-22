import { Server, Socket } from "socket.io";
import { PlayerPosition } from "./model";
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents } from "./interface";

export interface SocketData {
	room?: IRoom;
	name: string;
	position: PlayerPosition;
	focussed: boolean;
	cards: number[];
}

export type MSocket = Socket<
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
>;

export type MServer = Server<
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	SocketData
>;

export type RoomState =
	| 'lobby' // players leave and join; can set player names; can set ready; return here after round competion
	| 'roundStartPending' // vars decided; awaiting client confirmation
	| 'awaitingFocus' // hanging around after roundStartPending, star, and bust events
	| 'inGame' // cards being played
	| 'star' // star revealed; waiting for all players to ack
	| 'bust'; // bust revealed; waiting for all players to ack

export interface IRoom {
	name: string;
	players: MSocket[];
	roomState: RoomState;
	join(socket: MSocket): void;
	leave(socket: MSocket): void;
	sendRoomPosition(): void;
	close(): void;
	startRound(socket: MSocket): Promise<void>;
	playerSetFocus(socket: MSocket, focus: boolean | unknown): Promise<void>;
	playerSetPosition(socket: MSocket, position: PlayerPosition): Promise<void>;
	cardPlayed(socket: MSocket): Promise<void>;
}
