import {
	type SocketId,
	type ClientToServerEvents,
	type ServerToClientEvents,
	type RoomState,
	type Player,
	type PlayerPositionWithId,
	PlayerCartesianPositionWithId,
} from 'shared';
import { type Socket } from 'socket.io-client';
import {
	type Signal,
	signal,
	computed,
	type ReadonlySignal,
} from '@preact/signals';
import { type Bounds, toCartesianCoords } from './util';
import { addEffects } from './effects';
import { createSocket } from './socket';

export interface AppState {
	isConnected: Signal<boolean>;
	playerName: Signal<string>;
	nameUpdateInFlight: Signal<boolean>;
	roomJoinInFlight: Signal<boolean>;
	startRoundInFlight: Signal<boolean>;
	playCardInFlight: Signal<boolean>;
	roomName: Signal<string | undefined>;
	renderRoomName: ReadonlySignal<string>;
	renderLives: ReadonlySignal<string>;
	renderRound: ReadonlySignal<string>;
	renderStars: ReadonlySignal<string>;
	socket: Socket<ServerToClientEvents, ClientToServerEvents>;
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
	const startRoundInFlight = signal(false);
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
	const focussedPlayers = signal<SocketId[]>([]);

	const socket = createSocket({
		otherPlayerCardCounts,
		revealedCards,
		isConnected,
		roomJoinInFlight,
		roomName,
		nameUpdateInFlight,
		allPlayerPositions,
		lives,
		stars,
		round,
		roomState,
		lastCardPlayed,
		playerCards,
		latestError,
		startRoundInFlight,
		allPlayers,
		playCardInFlight,
		playerName,
		votingFocusInFlight,
		votingStar,
		votingStarInFlight,
		focussedPlayers,
		votingFocus
	});

	const socketId = 'pete';

	function renderWithFallback<T>(
		input: Signal<T | undefined>,
	): ReadonlySignal<string> {
		return computed(() => String(input.value ?? '?'));
	}

	const renderRoomName = renderWithFallback(roomName);
	const renderLives = renderWithFallback(lives);
	const renderRound = renderWithFallback(round);
	const renderStars = renderWithFallback(stars);

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
	// setTimeout(() => (roomState.value = 'inGame'), 2000);

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

	addEffects({
		playerPosition,
		feltBounds,
		allPlayerPositions,
		roomState,
		roomJoinInFlight,
		socket,
		latestError,
		roomName,
	});

	return {
		isConnected,
		playerName,
		nameUpdateInFlight,
		roomJoinInFlight,
		roomName,
		socket,
		playerPosition,
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
		startRoundInFlight,
		lastCardPlayed,
		otherPlayerSpots,
		playCardInFlight,
	};
}
