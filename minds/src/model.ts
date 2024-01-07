type ClientServerEvents = [
	{
		client: {
			joinRoom: (name: string) => void;
		};
		server: {
			joinRoomSuccess: (
				round: number,
				lives: number,
				stars: number,
				players: [string, string][],
			) => void;
			joinRoomFailure: (error: string) => void;
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
			setPosition: (position: PlayerPosition) => void;
			setFocus: (focus: boolean) => void;
		};
		server: {
			setPositions: (positions: PlayerPosition[]) => void;
			setFocusses: (focusses: PlayerFocus[]) => void;
			focusStart: (lives: number, stars: number) => void;
			star: (cards: PlayerCard[], newStars: number) => void;
			bust: (revealed: PlayerCard[], newLives: number) => void;
		};
	},
  {
    client: {
      roundStart: () => void;
    },
    server: {
			roundStartSuccess: (
				round: number,
				lives: number,
				stars: number,
				cards: number[],
			) => void;
      roundStartFailure: (error: string) => void;
    }
  },
	{
		client: {
			playCard: () => void;
		};
		server: {
			playCardSuccess: (play: PlayerCard) => void;
			playCardFailure: (error: string) => void;
			cardPlayed: (value: number, left: [string, number][]) => void;
		};
	},
];

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

type AllKeys<T> = T extends object ? keyof T : never;

type PickType<T, K extends keyof T> = T extends { [k in K]?: object }
	? T[K]
	: undefined;

type Merge<T extends object> = {
	[k in AllKeys<T>]: PickTypeOf<T, k>;
};

type PickTypeOf<T, K extends string | number | symbol> = K extends AllKeys<T>
	? PickType<T, K>
	: never;

export type InterServerEvents = Record<string, never>;

export type RoomState =
	| 'lobby' // players leave and join; can set player names; can set ready; return here after round competion
	| 'roundStartPending' // vars decided; awaiting client confirmation
	| 'awaitingFocus' // hanging around after roundStartPending, star, and bust events
	| 'inGame' // cards being played
	| 'star' // star revealed; waiting for all players to ack
	| 'bust'; // bust revealed; waiting for all players to ack
