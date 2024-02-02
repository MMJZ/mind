import { type MServer, type MSocket, PlayerCard, PlayerPosition, type RoomState } from 'shared';
import { Logger } from 'winston';

export class Room {
	private _roomState: RoomState = 'lobby';
	private round: number = 1;
	private lives: number = 2;
	private stars: number = 1;
	private _players: MSocket[] = [];

	constructor(
		private io: MServer,
		private _name: string,
		private logger: Logger,
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

	join(socket: MSocket): void {
		if (this.roomState !== 'lobby') {
			socket.emit('joinRoomFailure', 'room already in game');
			return;
		}

		socket.data.room = this;
		socket.join(this.name);
		this._players.push(socket);
		socket.emit('joinRoomSuccess', this.name);
		this.sendRoomPosition();

		this.logger.info(`r:'${this.name} player p:'${socket.id}' joined`);
	}

	leave(socket: MSocket): void {
		const index = this.players.indexOf(socket);
		if (index > -1) {
			this.players.splice(index, 1);
		}
		socket.emit('leaveRoomSuccess');
		this.sendRoomPosition();

		this.logger.info(`r:'${this.name} player p:'${socket.id}' left`);
	}

	sendRoomPosition(): void {
		this.io.to(this.name).emit('setRoomPosition', {
			round: this.round,
			lives: this.lives,
			stars: this.stars,
			players: this.players.map((p) => ({
				id: p.id,
				name: p.data.name,
			})),
		});
	}

	close(): void {}

	async startRound(socket: MSocket): Promise<void> {
		this.logger.info(`r:'${this.name} round start fired`);

		if (this.roomState !== 'lobby') {
			socket.emit('roundStartFailure', 'not in lobby');
			return;
		}
		if (this.players.length < 1) {
			socket.emit('roundStartFailure', 'not enough players');
			return;
		}
		this._roomState = 'roundStartPending';

		const deck = [...Array(101).keys()].slice(1);
		for (let i = deck.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			const temp = deck[i];
			deck[i] = deck[j];
			deck[j] = temp;
		}

		this.sendRoomPosition();

		let marker = 0;
		for (const player of this.players) {
			const cards = deck.slice(marker, this.round);
			cards.sort();
			player.emit('roundStartSuccess', cards);
			player.data.cards = cards;
			marker += this.round;
		}
		this.logger.info(`r:'${this.name}' round start success`);

		this._roomState = 'awaitingFocus';
	}

	async playerSetFocus(socket: MSocket, focus: boolean | unknown): Promise<void> {
		if (this.roomState !== 'awaitingFocus') {
			return;
		}
		socket.data.focussed = focus === true;
		if (focus === true && this.players.every((p) => p.data.focussed)) {
			this.logger.info(`r:'${this.name}' all players in focus - starting`);

			this.io.to(this.name).emit('focusStart');
			this._roomState = 'inGame';
		} else {
			this.io.to(this.name).emit(
				'setPlayerFocusses',
				this.players.filter((p) => p.data.focussed).map((p) => p.id),
			);
		}
	}

	async playerSetPosition(socket: MSocket, position: PlayerPosition): Promise<void> {
		if (this.roomState !== 'inGame') {
			return;
		}
		socket.data.position = position;
		if (position.star && this.stars > 0 && this.players.every((p) => p.data.position.star)) {
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
			this.stars -= 1;

			const roundComplete = this.players.every((p) => p.data.cards.length === 0);

			this.io.to(this.name).emit('star', revealed, this.stars, roundComplete);

			this.logger.info(`r:'${this.name}' star fired complete:${roundComplete}`);

			if (roundComplete) {
				this.completeRound();
			} else {
				this._roomState = 'awaitingFocus';
			}
		}
	}

	async cardPlayed(socket: MSocket): Promise<void> {
		this.logger.info(`r:'${this.name}' player p:'${socket.id}' card played`);

		if (this.roomState !== 'inGame') {
			socket.emit('playCardFailure', 'not in game');
			return;
		}
		const [played, ...rest] = socket.data.cards;

		if (played === undefined) {
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
			this.lives -= 1;
			const gameOver = this.lives === 0;
			this.io.to(this.name).emit('bust', allBustCards, this.lives, gameOver);
			if (gameOver) {
				this.logger.info(`r:'${this.name}' bust - game over; returning to lobby`);
				this._roomState = 'lobby';
			} else {
				this.logger.info(`r:'${this.name}' bust with lives left`);
				this._roomState = 'awaitingFocus';
			}
		} else {
			const roundComplete = this.players.every((p) => p.data.cards.length === 0);

			this.io.to(this.name).emit(
				'playCardSuccess',
				{
					id: socket.id,
					card: played,
				},
				roundComplete,
			);

			if (roundComplete) {
				this.completeRound();
			}
		}
	}

	completeRound(): void {
		this.logger.info(`r:'${this.name} all cards played - round complete; returning to lobby`);
		// this.io.to(this.name).emit('roundComplete');
		this._roomState = 'lobby';
		this.round += 1;
		// TODO apply extra lives etc
		this.sendRoomPosition();
	}
}
