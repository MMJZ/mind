import {
	type SocketId,
	type ClientToServerEvents,
	type ServerToClientEvents,
	type RoomState,
	type Player,
	type PlayerCard,
	type PlayerPositionWithId,
	type RoomPosition,
	type PlayerCartesianPosition,
} from 'shared';
import { type Socket, io } from 'socket.io-client';
import {
	type Signal,
	signal,
	computed,
	type ReadonlySignal,
	effect,
} from '@preact/signals';
import { type Bounds, toCartesianCoords, toPolarCoords } from '../util';

export interface AppState {
	isConnected: Signal<boolean>;
	playerName: Signal<string>;
	nameUpdateInFlight: Signal<boolean>;
	roomJoinInFlight: Signal<boolean>;
	roomName: Signal<string | undefined>;
	renderRoomName: ReadonlySignal<string>;
	renderLives: ReadonlySignal<string>;
	renderRound: ReadonlySignal<string>;
	renderStars: ReadonlySignal<string>;
	socket: Socket;
	otherPlayers: Signal<Player[]>;
	// otherPlayerPositions: Signal<PlayerPositionWithId[]>;
	otherPlayerFeltPositions: ReadonlySignal<
		Map<string, PlayerCartesianPosition>
	>;
	playerPosition: Signal<[number, number]>;
	roomState: Signal<RoomState>;
	votingStar: Signal<boolean>;
	feltBounds: Signal<Bounds>;
	playerCards: Signal<number[]>;
	votingStarInFlight: Signal<boolean>;
	votingFocusInFlight: Signal<boolean>;
	votingFocus: Signal<boolean>;
	lastCardPlayed: Signal<number | undefined>;
}

export function createAppState(): AppState {
	const isConnected = signal(false);
	const playerName = signal('cheesePerson');
	const nameUpdateInFlight = signal(false);
	const roomJoinInFlight = signal(false);
	const playCardInFlight = signal(false);
	const votingStarInFlight = signal(false);
	const votingFocusInFlight = signal(false);
	const votingStar = signal(false);
	const votingFocus = signal(false);
	const roomState = signal<RoomState>('lobby');
	const round = signal<number | undefined>(undefined);
	const lives = signal<number | undefined>(undefined);
	const stars = signal<number | undefined>(undefined);
	const roomName = signal<string | undefined>(undefined);
	const playerCards = signal<number[]>([]);
	const playerPosition = signal<[number, number]>([0, 0]);
	const latestError = signal<string | undefined>(undefined);
	const otherPlayers = signal<Player[]>([]);
	const otherPlayerPositions = signal<PlayerPositionWithId[]>([]);
	const lastCardPlayed = signal<number | undefined>(undefined);
	const otherPlayerCardCounts = signal<Map<SocketId, number>>(new Map());
	const revealedCards = signal<Map<SocketId, number[]>>(new Map());
	const feltBounds = signal<Bounds>({
		top: 0,
		left: 0,
		width: 1,
		height: 1,
	});

	function setOtherPlayersCardCount(newCardCount: number): void {
		otherPlayerCardCounts.value = new Map(
			Array.from(otherPlayerCardCounts.value.entries()).map(([id]) => [
				id,
				newCardCount,
			]),
		);
	}

	function revealCards(revealed: PlayerCard[]): void {
		revealedCards.value = new Map(
			Array.from(revealedCards.value.entries()).map(([id, currentCards]) => {
				const newCards = revealed.filter((r) => r.id === id).map((r) => r.card);
				const shownCards = newCards.length === 0 ? currentCards : newCards;

				return [id, shownCards];
			}),
		);
	}

	const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
		'192.168.0.8:3000',
		{
			autoConnect: false,
		},
	);

	socket.on('connect', () => {
		isConnected.value = true;
	});

	socket.on('disconnect', () => {
		isConnected.value = false;
	});

	socket.on('joinRoomSuccess', (joinedRoomName: string) => {
		roomJoinInFlight.value = false;
		roomName.value = joinedRoomName;
	});

	socket.on('joinRoomFailure', (error: string) => {
		roomJoinInFlight.value = false;
		latestError.value = error;
	});

	socket.on('setNameSuccess', (name: string) => {
		nameUpdateInFlight.value = false;
		playerName.value = name;
	});

	socket.on('setNameFailure', (error: string) => {
		nameUpdateInFlight.value = false;
		latestError.value = error;
	});

	socket.on('setPlayerPositions', (positions: PlayerPositionWithId[]) => {
		otherPlayerPositions.value = positions;
	});

	socket.on('setRoomPosition', (roomPosition: RoomPosition) => {
		lives.value = roomPosition.lives;
		round.value = roomPosition.round;
		stars.value = roomPosition.stars;
		otherPlayers.value = roomPosition.players;
	});

	socket.on('roundStartSuccess', (cards: number[]) => {
		playerCards.value = cards;
		setOtherPlayersCardCount(cards.length);
		roomState.value = 'awaitingFocus';
	});

	socket.on('playCardSuccess', (played: PlayerCard) => {
		if (played.id === socket.id) {
			playCardInFlight.value = false;
			playerCards.value = playerCards.value.filter((c) => c <= played.card);
		} else {
			otherPlayerCardCounts.value = new Map(
				Array.from(otherPlayerCardCounts.value.entries()).map(([id, count]) => [
					id,
					played.id === id ? count - 1 : count,
				]),
			);
		}
		lastCardPlayed.value = played.card;
	});

	socket.on('focusStart', () => {
		roomState.value = 'inGame';
	});

	socket.on('bust', (revealed: PlayerCard[], newLives: number) => {
		lives.value = newLives;
		revealCards(revealed);
	});

	socket.on('star', (revealed: PlayerCard[], newStars: number) => {
		stars.value = newStars;
		revealCards(revealed);
	});

	function renderWithFallback<T>(
		input: Signal<T | undefined>,
	): ReadonlySignal<string> {
		return computed(() => String(input.value ?? '?'));
	}

	const renderRoomName = renderWithFallback(roomName);
	const renderLives = renderWithFallback(lives);
	const renderRound = renderWithFallback(round);
	const renderStars = renderWithFallback(stars);

	effect(() => {
		function sendPosition(): void {
			const [x, y] = playerPosition.peek();

			const [r, θ] = toPolarCoords(x, y, feltBounds.peek());

			socket.emit('setPosition', {
				r,
				θ,
				star: votingStar.peek(),
			});
		}

		let id: NodeJS.Timeout | undefined;

		if (roomState.value === 'inGame') {
			id = setInterval(sendPosition, 300);
		}

		return () => {
			if (id !== undefined) {
				clearInterval(id);
			}
		};
	});

	const otherPlayerFeltPositions = computed(() => {
		const positions = otherPlayerPositions.value;
		const gap = (2 * Math.PI) / otherPlayers.value.length;
		const initialOffset = positions.findIndex((p) => p.id === socket.id);
		return new Map(
			positions
				.map<[SocketId, PlayerCartesianPosition]>((position, i) => {
					const offset = gap * (i - initialOffset);
					const [x, y] = toCartesianCoords(
						position.r,
						position.θ + offset,
						feltBounds.value,
					);

					return [position.id, { x, y, star: position.star }];
				})
				.filter(([id]) => id !== socket.id),
		);
	});

	// fixes for testing

	playerCards.value = [4, 5, 6];
	lastCardPlayed.value = 100;

	return {
		isConnected,
		playerName,
		nameUpdateInFlight,
		roomJoinInFlight,
		roomName,
		socket,
		playerPosition,
		otherPlayers,
		otherPlayerFeltPositions,
		renderRoomName,
		renderLives,
		renderRound,
		renderStars,
		roomState,
		votingStar,
		feltBounds,
		playerCards,
		votingFocus,
		votingFocusInFlight,
		votingStarInFlight,
		lastCardPlayed
	};
}
