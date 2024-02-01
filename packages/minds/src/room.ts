import {
	type MServer,
	type MSocket,
	PlayerCard,
	PlayerPosition,
	type RoomState,
} from 'shared';

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
	}

	leave(socket: MSocket): void {
		const index = this.players.indexOf(socket);
		if (index > -1) {
			this.players.splice(index, 1);
		}
		socket.emit('leaveRoomSuccess');
		this.sendRoomPosition();
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
			player.emit('roundStartSuccess', cards);
			player.data.cards = cards;
			marker += this.round;
		}

		this._roomState = 'awaitingFocus';
	}

	async playerSetFocus(
		socket: MSocket,
		focus: boolean | unknown,
	): Promise<void> {
		if (this.roomState !== 'awaitingFocus') {
			return;
		}
		socket.data.focussed = focus === true;
		if (focus === true && this.players.every((p) => p.data.focussed)) {
			this.io.to(this.name).emit('focusStart');
			this._roomState = 'inGame';
		}
	}

	async playerSetPosition(
		socket: MSocket,
		position: PlayerPosition,
	): Promise<void> {
		if (this.roomState !== 'inGame') {
			return;
		}
		socket.data.position = position;
		if (
			position.star &&
			this.stars > 0 &&
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
			this.stars -= 1;
			this.io.to(this.name).emit('star', revealed, this.stars);
			this._roomState = 'awaitingFocus';
		}
	}

	async cardPlayed(socket: MSocket): Promise<void> {
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
			this.io.to(this.name).emit('bust', allBustCards, this.lives);

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
				this.io.to(this.name).emit('roundComplete');
				this._roomState = 'lobby';
				this.round += 1;
				// TODO apply extra lives etc
			}
		}
	}
}
