import {
	ServerToClientEvents,
	ClientToServerEvents,
	PlayerCard,
	PlayerPositionWithId,
	RoomPosition,
	RoomState,
	SocketId,
	Player,
	PlayerFocus,
} from 'shared';
import { Socket, io } from 'socket.io-client';
import { Signal } from '@preact/signals';

interface SocketDependencies {
	isConnected: Signal<boolean>;
	playerName: Signal<string>;
	nameUpdateInFlight: Signal<boolean>;
	roomJoinInFlight: Signal<boolean>;
	playCardInFlight: Signal<boolean>;
	startRoundInFlight: Signal<boolean>;
	roomName: Signal<string | undefined>;
	roomState: Signal<RoomState>;
	playerCards: Signal<number[]>;
	votingStarInFlight: Signal<boolean>;
	votingFocusInFlight: Signal<boolean>;
	votingStar: Signal<boolean>;
	votingFocus: Signal<boolean>;
	lastCardPlayed: Signal<number | undefined>;
	otherPlayerCardCounts: Signal<Map<SocketId, number>>;
	revealedCards: Signal<Map<SocketId, number[]>>;
	allPlayerPositions: Signal<PlayerPositionWithId[]>;
	lives: Signal<number | undefined>;
	stars: Signal<number | undefined>;
	round: Signal<number | undefined>;
	latestError: Signal<string | undefined>;
	allPlayers: Signal<Player[]>;
	focussedPlayers: Signal<SocketId[]>;
}

export function createSocket({
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
	playerName,
	playCardInFlight,
	votingStar,
	votingFocus,
	votingFocusInFlight,
	votingStarInFlight,
	focussedPlayers,
}: SocketDependencies): Socket<ServerToClientEvents, ClientToServerEvents> {
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
			Array.from(revealedCards.peek().entries()).map(([id, currentCards]) => {
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

		const playerPosition = positions.find((p) => p.id === socketId);
		if (playerPosition) {
			votingStarInFlight.value = playerPosition.star !== votingStar.peek();
		}
	});

	socket.on('setRoomPosition', (roomPosition: RoomPosition) => {
		lives.value = roomPosition.lives;
		round.value = roomPosition.round;
		stars.value = roomPosition.stars;
		allPlayers.value = roomPosition.players;
	});

	socket.on('setPlayerFocusses', (focussed: SocketId[]) => {
		focussedPlayers.value = focussed;
		votingFocusInFlight.value =
			focussed.includes(socketId) !== votingFocus.peek();
	});

	socket.on('roundStartSuccess', (cards: number[]) => {
		playerCards.value = cards;
		setOtherPlayersCardCount(cards.length);
		roomState.value = 'awaitingFocus';
		startRoundInFlight.value = false;
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

	socket.on('roundStartFailure', (error: string) => {
		latestError.value = error;
	});

	return socket;
}
