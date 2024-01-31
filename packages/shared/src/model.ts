export type SocketId = string;

export interface RoomPosition {
	round: number;
	lives: number;
	stars: number;
	players: Player[];
}

export interface HasSocketId {
	id: SocketId;
}

export interface Player extends HasSocketId {
	name: string;
}

export interface PlayerPosition {
	r: number;
	θ: number;
	star: boolean;
}

export interface PlayerPositionWithId extends PlayerPosition, HasSocketId {}

export interface PlayerCartesianPosition {
	x: number;
	y: number;
	star: boolean;
}

export interface PlayerCartesianPositionWithId
	extends PlayerCartesianPosition,
		HasSocketId {}

export interface PlayerCard extends HasSocketId {
	card: number;
}

export interface PlayerFocus extends HasSocketId {
	focus: boolean;
}
