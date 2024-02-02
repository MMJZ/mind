import {
	ServerToClientEvents,
	ClientToServerEvents,
	PlayerCard,
	PlayerPositionWithId,
	RoomPosition,
	RoomState,
	SocketId,
	Player,
} from 'shared';
import { Socket, io } from 'socket.io-client';
import { Signal, batch } from '@preact/signals';

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
	// roundComplete: Signal<boolean>;
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
	roundComplete,
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

	function completeRound(): void {
		alert('victory!');
		batch(() => {
			lastCardPlayed.value = undefined;
			roomState.value = 'lobby';
			setOtherPlayersCardCount(0);
		});
	}

	const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
		'192.168.0.8:3000',
		{
			autoConnect: true,
		},
	);

	socket.on('connect', () => {
		isConnected.value = true;
	});

	socket.on('disconnect', () => {
		batch(() => {
			isConnected.value = false;
			roomJoinInFlight.value = false;
			roomName.value = undefined;
			playerCards.value = [];
		});
	});

	socket.on('joinRoomSuccess', (joinedRoomName: string) => {
		batch(() => {
			roomJoinInFlight.value = false;
			roomName.value = joinedRoomName;
		});
	});

	socket.on('leaveRoomSuccess', () => {
		batch(() => {
			roomJoinInFlight.value = false;
			roomName.value = undefined;
		});
	});

	socket.on('leaveRoomFailure', (error: string) => {
		batch(() => {
			latestError.value = error;
			roomJoinInFlight.value = false;
		});
	});

	socket.on('joinRoomFailure', (error: string) => {
		batch(() => {
			roomJoinInFlight.value = false;
			latestError.value = error;
		});
	});

	socket.on('setNameSuccess', (name: string) => {
		batch(() => {
			nameUpdateInFlight.value = false;
			playerName.value = name;
		});
	});

	socket.on('setNameFailure', (error: string) => {
		batch(() => {
			nameUpdateInFlight.value = false;
			latestError.value = error;
		});
	});

	socket.on('setPlayerPositions', (positions: PlayerPositionWithId[]) => {
		batch(() => {
			allPlayerPositions.value = positions;

			const playerPosition = positions.find((p) => p.id === socket.id);
			if (playerPosition) {
				votingStarInFlight.value = playerPosition.star !== votingStar.peek();
			}
		});
	});

	socket.on('setRoomPosition', (roomPosition: RoomPosition) => {
		batch(() => {
			lives.value = roomPosition.lives;
			round.value = roomPosition.round;
			stars.value = roomPosition.stars;
			allPlayers.value = roomPosition.players;
		});
	});

	socket.on('setPlayerFocusses', (focussed: SocketId[]) => {
		batch(() => {
			focussedPlayers.value = focussed;
			votingFocusInFlight.value =
				socket.id !== undefined &&
				focussed.includes(socket.id) !== votingFocus.peek();
		});
	});

	socket.on('roundStartSuccess', (cards: number[]) => {
		batch(() => {
			playerCards.value = cards;
			setOtherPlayersCardCount(cards.length);
			roomState.value = 'awaitingFocus';
			startRoundInFlight.value = false;
		});
	});

	socket.on('playCardSuccess', (played: PlayerCard, complete: boolean) => {
		batch(() => {
			console.log('playCardSuccess', played, socket.id, playerCards.peek());

			if (played.id === socket.id) {
				playCardInFlight.value = false;
				playerCards.value = playerCards.value.filter((c) => c > played.card);

				console.log('playCardSuccess', played, socket.id, playerCards.peek());
			} else {
				otherPlayerCardCounts.value = new Map(
					Array.from(otherPlayerCardCounts.value.entries()).map(
						([id, count]) => [id, played.id === id ? count - 1 : count],
					),
				);
			}
			lastCardPlayed.value = played.card;
			// if (complete) {
			// 	roundComplete.value = true;
			// }
		});
		if (complete) {
			completeRound();
		}
	});

	socket.on('focusStart', () => {
		batch(() => {
			roomState.value = 'inGame';
			votingFocusInFlight.value = false;
			votingFocus.value = false;
			focussedPlayers.value = [];
		});
	});

	socket.on(
		'bust',
		(revealed: PlayerCard[], newLives: number, gameOver: boolean) => {
			batch(() => {
				lives.value = newLives;
				roomState.value = gameOver ? 'lobby' : 'awaitingFocus';
				revealCards(revealed);
			});
		},
	);

	socket.on('star', (revealed: PlayerCard[], newStars: number) => {
		batch(() => {
			stars.value = newStars;
			revealCards(revealed);
		});
	});

	socket.on('roundStartFailure', (error: string) => {
		batch(() => {
			latestError.value = error;
			startRoundInFlight.value = false;
		});
	});

	return socket;
}
