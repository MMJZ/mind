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

interface PlayerPositionBase {
	star: boolean;
	pressing: boolean;
}

export interface PlayerPosition extends PlayerPositionBase {
	r: number;
	θ: number;
}

export interface PlayerPositionWithId extends PlayerPosition, HasSocketId {}

export interface PlayerCartesianPosition extends PlayerPositionBase {
	x: number;
	y: number;
}

export interface PlayerCartesianPositionWithId
	extends PlayerCartesianPosition,
		HasSocketId {}

export interface PlayerCard extends HasSocketId {
	card: number;
}

// export interface PlayerFocus extends HasSocketId {
// 	focus: boolean;
// }
