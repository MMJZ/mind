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
	PlayerCartesianPositionWithId,
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
	// allPlayers: Signal<Player[]>;
	// otherPlayerPositions: Signal<PlayerPositionWithId[]>;
	otherPlayerFeltPositions: ReadonlySignal<PlayerCartesianPositionWithId[]>;
	playerPosition: Signal<[number, number]>;
	roomState: Signal<RoomState>;
	votingStar: Signal<boolean>;
	feltBounds: Signal<Bounds | null>;
	playerCards: Signal<number[]>;
	votingStarInFlight: Signal<boolean>;
	votingFocusInFlight: Signal<boolean>;
	votingFocus: Signal<boolean>;
	lastCardPlayed: Signal<number | undefined>;
	otherPlayerSpots: ReadonlySignal<
		{
			id: string;
			name: string;
			shownCards: number[];
			cardsLeft: number;
			left: number;
			top: number;
		}[]
	>;
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
	const allPlayers = signal<Player[]>([]);
	const allPlayerPositions = signal<PlayerPositionWithId[]>([]);
	const lastCardPlayed = signal<number | undefined>(undefined);
	const otherPlayerCardCounts = signal<Map<SocketId, number>>(new Map());
	const revealedCards = signal<Map<SocketId, number[]>>(new Map());
	const feltBounds = signal<Bounds | null>(null);

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

	const socketId = 'pete';

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
		allPlayerPositions.value = positions;
	});

	socket.on('setRoomPosition', (roomPosition: RoomPosition) => {
		lives.value = roomPosition.lives;
		round.value = roomPosition.round;
		stars.value = roomPosition.stars;
		allPlayers.value = roomPosition.players;
	});

	socket.on('roundStartSuccess', (cards: number[]) => {
		playerCards.value = cards;
		setOtherPlayersCardCount(cards.length);
		roomState.value = 'awaitingFocus';
	});

	socket.on('playCardSuccess', (played: PlayerCard) => {
		if (played.id === socketId) {
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
			const bounds = feltBounds.peek();

			if (bounds === null) {
				return;
			}

			const [r, θ] = toPolarCoords(x, y, bounds);
			// socket.emit('setPosition', {
			// 	r,
			// 	θ,
			// 	star: votingStar.peek(),
			// });

			console.log('hmm', r, θ);

			allPlayerPositions.value = [
				'jenny',
				// 'fart007',
				'pete',
				'ricketySplit',
				'unwashedbehinds',
			].map((id) => ({
				id,
				r,
				θ,
				star: false,
			}));
		}

		let id: NodeJS.Timeout | undefined;

		if (roomState.value === 'inGame') {
			id = setInterval(sendPosition, 100);
		}

		return () => {
			if (id !== undefined) {
				clearInterval(id);
			}
		};
	});

	effect(() => {
		if (!roomJoinInFlight.value && roomName.value === undefined) {
			let candidateRoom: string | null = null;
			while (candidateRoom === null) {
				candidateRoom = prompt('Room', 'name');
			}
			socket.emit('joinRoom', candidateRoom);
			roomJoinInFlight.value = true;
		}
	});

	const otherPlayerFeltPositions = computed(() => {
		const positions = allPlayerPositions.value;
		const gap = (2 * Math.PI) / positions.length;
		const initialOffset = positions.findIndex((p) => p.id === socketId);

		const bounds = feltBounds.value;

		if (bounds === null) {
			return [];
		}

		return positions
			.map((position, i) => {
				const offset = gap * (i - initialOffset);
				const [x, y] = toCartesianCoords(
					position.r,
					position.θ + offset,
					bounds,
				);

				return { id: position.id, x: x - 10, y: y - 10, star: position.star };
			})
			.filter((position) => position.id !== socketId);
	});

	const otherPlayerSpots = computed(() => {
		const otherPlayers = allPlayers.value.filter((p) => p.id !== socketId);
		const totalPlayers = otherPlayers.length + 1;

		const bounds = feltBounds.value;

		if (bounds === null) {
			return [];
		}

		const { width, height } = bounds;
		const desiredPadding = 20;
		const [spotWidth, spotHeight] = [260, 100];
		const widthBias = spotWidth / spotHeight;

		const minLeft = desiredPadding;
		const maxLeft = width - desiredPadding - spotWidth;
		const minTop = desiredPadding;
		const maxTop = height - desiredPadding - spotHeight;

		const boundsWidth = maxLeft - minLeft;
		const boundsHeight = maxTop - minTop;
		const biasedBoundsHeight = boundsHeight * widthBias;
		const totalDistance = boundsWidth * 2 + biasedBoundsHeight * 2;
		const firstCorner = boundsWidth / 2 / totalDistance;
		const secondCorner = firstCorner + biasedBoundsHeight / totalDistance;
		const thirdCorner = secondCorner + boundsWidth / totalDistance;
		const fourthCorner = thirdCorner + biasedBoundsHeight / totalDistance;

		return otherPlayers.map(({ id, name }, i) => {
			const shownCards = revealedCards.value.get(id) ?? [];
			const cardsLeft = otherPlayerCardCounts.value.get(id) ?? 0;
			const proportionAlongPerimeter = (i + 1) / totalPlayers;

			let left = 0;
			let top = 0;

			if (proportionAlongPerimeter < firstCorner) {
				left =
					minLeft +
					0.5 * boundsWidth * (1 + proportionAlongPerimeter / firstCorner);
				top = maxTop;
			} else if (proportionAlongPerimeter < secondCorner) {
				left = maxLeft;
				top =
					maxTop -
					(boundsHeight * (proportionAlongPerimeter - firstCorner)) /
						(secondCorner - firstCorner);
			} else if (proportionAlongPerimeter < thirdCorner) {
				left =
					maxLeft -
					(boundsWidth * (proportionAlongPerimeter - secondCorner)) /
						(thirdCorner - secondCorner);
				top = minTop;
			} else if (proportionAlongPerimeter < fourthCorner) {
				left = minLeft;
				top =
					minTop +
					(boundsHeight * (proportionAlongPerimeter - thirdCorner)) /
						(fourthCorner - thirdCorner);
			} else {
				left =
					minLeft +
					(0.5 * boundsWidth * (proportionAlongPerimeter - fourthCorner)) /
						(1 - fourthCorner);
				top = maxTop;
			}

			return {
				id,
				name,
				shownCards,
				cardsLeft,
				left,
				top,
			};
		});
	});

	// fixes for testing

	playerCards.value = [4, 5, 6];
	// lastCardPlayed.value = 100;
	allPlayers.value = [
		{
			name: 'pete',
			id: 'pete',
		},
		{
			name: 'jenny',
			id: 'jenny',
		},
		{
			name: 'ricketySplit',
			id: 'ricketySplit',
		},
	];

	// setTimeout(
	// 	() =>
	// 		(allPlayers.value = [
	// 			...allPlayers.value,
	// 			{
	// 				name: 'fart007',
	// 				id: 'fart007',
	// 			},
	// 		]),
	// 	8000,
	// );

	setTimeout(
		() =>
			(allPlayers.value = [
				...allPlayers.value,
				{
					name: 'unwashedbehinds',
					id: 'unwashedbehinds',
				},
			]),
		10000,
	);
	setTimeout(() => (roomState.value = 'inGame'), 2000);

	otherPlayerCardCounts.value = new Map([
		['pete', 3],
		['jenny', 1],
		['fart007', 2],
	]);

	revealedCards.value = new Map([
		['unwashedbehinds', [4, 100]],
		['asd', [3]],
	]);

	setTimeout(() => {
		revealedCards.value = new Map([
			...revealedCards.value.entries(),
			['pete', [5, 10]],
		]);
	}, 6000);

	return {
		isConnected,
		playerName,
		nameUpdateInFlight,
		roomJoinInFlight,
		roomName,
		socket,
		playerPosition,
		// otherPlayers,
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
		lastCardPlayed,
		otherPlayerSpots,
	};
}
