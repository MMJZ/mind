export type SocketId = string;

export interface RoomPosition {
	round: number;
	lives: number;
	stars: number;
	players: Player[];
}

export interface Player {
	name: string;
	id: SocketId;
}

export interface PlayerPosition {
	r: number;
	θ: number;
	star: boolean;
}

export interface PlayerPositionWithId extends PlayerPosition {
	id: SocketId;
}

export interface PlayerCartesianPosition {
	x: number;
	y: number;
	star: boolean;
}

export interface PlayerCard {
	id: SocketId;
	card: number;
}

export interface PlayerFocus {
	id: SocketId;
	focus: boolean;
}
