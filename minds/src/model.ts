import { Server, Socket } from 'socket.io';
import { Merge } from './util';

type ClientServerEvents = [
	{
		client: {
			joinRoom: (name: string) => void;
		};
		server: {
			joinRoomSuccess: () => void;
			joinRoomFailure: (error: string) => void;
		};
	},
	{
		client: {
			leaveRoom: () => void;
		};
		server: {
			leaveRoomSuccess: () => void;
			leaveRoomFailure: (error: string) => void;
		};
	},
	{
		client: {
			setName: (name: string) => void;
		};
		server: {
			setNameSuccess: () => void;
			setNameFailure: (error: string) => void;
		};
	},
	{
		client: {
			roundStart: () => void;
		};
		server: {
			roundStartSuccess: (cards: number[]) => void;
			roundStartFailure: (error: string) => void;
		};
	},
	{
		client: {
			setFocus: (focus: boolean) => void;
		};
		server: {
			setRoomPosition: (position: RoomPosition) => void;
			setPlayerFocusses: (focusses: PlayerFocus[]) => void;
			focusStart: (lives: number, stars: number) => void;
		};
	},
	{
		client: {
			setPosition: (position: PlayerPosition) => void;
		};
		server: {
			setPlayerPositions: (positions: PlayerPosition[]) => void;
		};
	},
	{
		client: {
			playCard: () => void;
		};
		server: {
			playCardSuccess: (play: PlayerCard) => void;
			playCardFailure: (error: string) => void;
			cardPlayed: (value: number, left: Map<string, number>) => void;
			star: (cards: PlayerCard[], newStars: number) => void;
			bust: (revealed: PlayerCard[], newLives: number) => void;
		};
	},
];

export interface RoomPosition {
	round: number;
	lives: number;
	stars: number;
	players: Map<string, string>;
}

export interface PlayerPosition {
	x: number;
	y: number;
	star: boolean;
}

export interface PlayerCard {
	id: string;
	card: number;
}

export interface PlayerFocus {
	id: string;
	focus: boolean;
}

export type ServerToClientEvents = Merge<ClientServerEvents[number]['server']>;
export type ClientToServerEvents = Merge<ClientServerEvents[number]['client']>;
export type InterServerEvents = Record<string, never>;

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
