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