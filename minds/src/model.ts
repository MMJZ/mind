import { Server, Socket } from 'socket.io';
import { tuple } from './util';

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
			roundSetup: (
				round: number,
				lives: number,
				stars: number,
				cards: number[],
			) => void;
		};
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

export interface SocketData {
	room?: Room;
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

export class Room {
	private _roomState: RoomState = 'lobby';
	private round: number = 1;
	private lives: number = 2;
	private stars: number = 1;
	private _players: MSocket[] = [];

	constructor(
		private io: MServer,
		private name: string,
	) {}

	public get players() {
		return this._players;
	}

	public get roomState() {
		return this._roomState;
	}

	join(socket: MSocket) {
		if (this.roomState !== 'lobby') {
			socket.emit('joinRoomFailure', 'room already in game');
			return;
		}

		socket.data.room = this;
		socket.join(this.name);
		this._players.push(socket);
		socket.emit(
			'joinRoomSuccess',
			this.round,
			this.lives,
			this.stars,
			this.players.map((p) => tuple(p.id, p.data.name)),
		);
	}

  async startRound(socket: MSocket){
    if(this.roomState !== 'lobby'){
      return;
    }
    if(this.players.length < 2){
      return;
    }
    this._roomState = 'roundStartPending';
    await Promise.all(this.players.map(player => {
      return player.emitWithAck('roundSetup', this.round, this.lives, this.stars);
    }))
    this._roomState = 'awaitingFocus';
  }

	async playerSetFocus(socket: MSocket, focus: boolean | unknown) {
		if (this.roomState !== 'awaitingFocus') {
			return;
		}
		socket.data.focussed = focus === true;
		if (focus === true && this.players.every((p) => p.data.focussed)) {
			await this.io.to(this.name).emitWithAck('focusStart', this.lives);
			this._roomState = 'inGame';
		}
	}

	async playerSetPosition(socket: MSocket, position: PlayerPosition) {
		if (this.roomState !== 'inGame') {
			return;
		}
		socket.data.position = position;
		if (position.star && this.players.every((p) => p.data.position.star)) {
			const revealed = this.players.flatMap<PlayerCard>((player) => {
				const [lowest, ...rest] = player.data.cards;
				player.data.cards = rest;
				return lowest
					? [
							{
								id: player.id,
								card: lowest,
							},
						]
					: [];
			});
      this._roomState = 'star';
			await this.io.to(this.name).emitWithAck('star', revealed);
			this._roomState = 'awaitingFocus';
		}
	}

	async cardPlayed(socket: MSocket) {
		if (this.roomState !== 'inGame') {
			socket.emit('playCardFailure', 'not in game');
			return;
		}
		const [played, ...rest] = socket.data.cards;
		socket.data.cards = rest;
		const allBustCards = this.players.reduce<PlayerCard[]>((acc, cur) => {
			const bustCards = cur.data.cards.filter((c) => c < played);
			if (bustCards.length > 0) {
				acc.push(
					...bustCards.map((card) => ({
						id: cur.id,
						card,
					})),
				);
				cur.data.cards = cur.data.cards.filter((c) => c > played);
			}
			return acc;
		}, []);
		if (allBustCards.length > 0) {
			this._roomState = 'bust';
			await this.io.to(this.name).emitWithAck('bust', allBustCards);
			this._roomState = 'awaitingFocus';
		} else {
      this.io.to(this.name).emit('playCardSuccess', {
        id: socket.id,
        card: played,
      });
    }
	}
}

type RoomState =
	| 'lobby' // players leave and join; can set player names; can set ready; return here after round competion
	| 'roundStartPending' // vars decided; awaiting client confirmation
	| 'awaitingFocus' // hanging around after roundStartPending, star, and bust events
	| 'inGame' // cards being played
	| 'star' // star revealed; waiting for all players to ack
	| 'bust'; // bust revealed; waiting for all players to ack
