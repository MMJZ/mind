import { Socket, Server } from 'socket.io';
import {
	PlayerPosition,
	ClientToServerEvents,
	ServerToClientEvents,
	InterServerEvents,
	RoomState,
	PlayerCard,
} from './model';
import { tuple } from './util';

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
		private _name: string,
	) {}

	public get players() {
		return this._players;
	}

	public get roomState() {
		return this._roomState;
	}

  public get name() {
    return this._name;
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

  leave(socket: MSocket) {
    const index = this.players.indexOf(socket);
    if(index > -1){
      this.players.splice(index, 1);
    }
  }

  close() {

  }

	async startRound(socket: MSocket) {
		if (this.roomState !== 'lobby') {
      socket.emit('roundStartFailure', 'not in lobby');
			return;
		}
		if (this.players.length < 2) {
      socket.emit('roundStartFailure', 'not enough players');
			return;
		}
		this._roomState = 'roundStartPending';
		await Promise.all(
			this.players.map((player) => {
				return player.emitWithAck(
					'roundStartSuccess',
					this.round,
					this.lives,
					this.stars,
				);
			}),
		);
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
		if (
			this.stars > 0 &&
			position.star &&
			this.players.every((p) => p.data.position.star)
		) {
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

    if(played === undefined){
			socket.emit('playCardFailure', 'no cards left');
			return;
    }

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

			this.lives -= 1;
			if (this.lives > 0) {
				this._roomState = 'awaitingFocus';
			} else {
				this._roomState = 'lobby';
			}
		} else {
			this.io.to(this.name).emit('playCardSuccess', {
				id: socket.id,
				card: played,
			});

			if (this.players.every((p) => p.data.cards.length === 0)) {
				this._roomState = 'lobby';
			}
		}
	}
}
