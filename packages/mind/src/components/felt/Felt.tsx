import { type JSX } from 'preact';
import { type Socket } from 'socket.io-client';
import css from './felt.module.css';
import { useEffect, useReducer, useRef, useState } from 'preact/hooks';
import {
	type ClientToServerEvents,
	type ServerToClientEvents,
	type SocketId,
	type Player,
	type RoomPosition,
	type PlayerCartesianPosition,
	type PlayerPositionWithId,
	type PlayerCard,
	type RoomState,
} from 'shared';
import { GameCard } from '../gameCard/GameCard';
import { toCartesianCoords, toPolarCoords } from '../../util';
import { playerInfoReducer } from './felt.reducer';

interface StateForServer {
	playerPosition: PlayerCartesianPosition;
	totalPlayers: number;
	playerCards: number[];
	// roomState: RoomState;
}

export interface FeltProps {
	socket: Socket<ServerToClientEvents, ClientToServerEvents>;
}

export function Felt({ socket }: FeltProps): JSX.Element {
	const positionRef = useRef<StateForServer>({
		totalPlayers: 0,
		playerPosition: {
			x: 0,
			y: 0,
			star: false,
		},
		playerCards: [],
		// roomState: 'lobby',
	});
	const feltRef = useRef<HTMLDivElement | null>(null);

	const [playerInfo, playerInfoDispatch] = useReducer(
		playerInfoReducer,
		new Map(),
	);
	const [playerPositions, setPlayerPositions] = useState(
		new Map<SocketId, PlayerCartesianPosition>(),
	);
	const [lastCardPlayed, setLastCardPlayed] = useState<number | undefined>(
		undefined,
	);
	const [playCardInFlight, setPlayCardInFlight] = useState(false);
	const [votingStarInFlight, setVotingStarInFlight] = useState(false);
	const [votingFocusInFlight, setVotingFocusInFlight] = useState(false);
	const [votingStar, _setVotingStar] = useState(false);
	const [votingFocus, setVotingFocus] = useState(false);
	const [roomState, setRoomState] = useState<RoomState>('lobby');
	const [round, setRound] = useState<number | undefined>(undefined);
	const [lives, setLives] = useState<number | undefined>(undefined);
	const [stars, setStars] = useState<number | undefined>(undefined);
	const [playerCards, _setPlayerCards] = useState<number[]>([1, 4, 15, 57, 98]);

	// const blah = players
	// 	.filter((player) => player.id !== socket.id)
	// 	.map((player) => ({
	// 		...player,
	// 		...(playerPositions.get(player.id) ?? {}),
	// 	}));

	useEffect(() => {
		// function setVotingStar(star: boolean): void {
		// 	_setVotingStar(star);
		// 	positionRef.current.playerPosition.star = star;
		// }

		function setPlayers(players: Player[]): void {
			playerInfoDispatch({ type: 'setPlayers', players });
			positionRef.current.totalPlayers = players.length;
		}

		function setPlayerCards(cards: number[]): void {
			_setPlayerCards(cards);
			positionRef.current.playerCards = cards;
		}

		function onSetPlayerPositions(positions: PlayerPositionWithId[]): void {
			const gap = (2 * Math.PI) / positionRef.current.totalPlayers;
			const initialOffset = positions.findIndex((p) => p.id === socket.id);

			const processedPositions = new Map(
				positions
					.map<[SocketId, PlayerCartesianPosition]>((position, i) => {
						const offset = gap * (i - initialOffset);
						const [x, y] = toCartesianCoords(
							position.r,
							position.θ + offset,
							feltRef?.current?.getBoundingClientRect() ?? {
								top: 0,
								left: 0,
								width: 1,
								height: 1,
							},
						);

						return [position.id, { x, y, star: position.star }];
					})
					.filter(([id]) => id !== socket.id),
			);

			setPlayerPositions(processedPositions);
		}

		function onSetRoomPosition(roomPosition: RoomPosition): void {
			setRound(roomPosition.round);
			setLives(roomPosition.lives);
			setStars(roomPosition.stars);
			setPlayers(roomPosition.players);
		}

		function onRoundStartSuccess(cards: number[]): void {
			setPlayerCards(cards);
			playerInfoDispatch({ type: 'setCardCount', cardsEach: cards.length });
			setRoomState('awaitingFocus');
		}

		function onPlayCardSuccess(played: PlayerCard): void {
			if (played.id === socket.id) {
				setPlayCardInFlight(false);
				const newPlayerCards = positionRef.current.playerCards.filter(
					(c) => c <= played.card,
				);
				setPlayerCards(newPlayerCards);
			} else {
				playerInfoDispatch({ type: 'cardPlayed', playedBy: played.id });
			}
		}

		function onFocusStart(): void {
			setRoomState('inGame');
		}

		function onBust(revealed: PlayerCard[], newLives: number): void {
			setLives(newLives);
			playerInfoDispatch({ type: 'cardsRevealed', revealed });
		}

		function onStar(revealed: PlayerCard[], newStars: number): void {
			setStars(newStars);
			playerInfoDispatch({ type: 'cardsRevealed', revealed });
		}

		socket.on('setPlayerPositions', onSetPlayerPositions);
		socket.on('setRoomPosition', onSetRoomPosition);
		socket.on('roundStartSuccess', onRoundStartSuccess);
		socket.on('playCardSuccess', onPlayCardSuccess);
		socket.on('focusStart', onFocusStart);
		// socket.on('setPlayerFocusses')
		socket.on('bust', onBust);
		socket.on('star', onStar);

		return () => {
			socket.off('setPlayerPositions', onSetPlayerPositions);
			socket.off('setRoomPosition', onSetRoomPosition);
			socket.off('roundStartSuccess', onRoundStartSuccess);
			socket.off('playCardSuccess', onPlayCardSuccess);
			socket.off('focusStart', onFocusStart);
			socket.off('bust', onBust);
			socket.off('star', onStar);
		};
	}, [
		socket,
		setPlayerPositions,
		_setPlayerCards,
		setRound,
		setLives,
		setStars,
	]);

	useEffect(() => {
		function sendPosition(): void {
			const [r, θ] = toPolarCoords(
				positionRef.current.playerPosition.x,
				positionRef.current.playerPosition.y,
				feltRef?.current?.getBoundingClientRect() ?? {
					top: 0,
					left: 0,
					width: 1,
					height: 1,
				},
			);

			socket.emit('setPosition', {
				r,
				θ,
				star: positionRef.current.playerPosition.star,
			});
		}

		let id: NodeJS.Timeout | undefined;

		if (roomState === 'inGame') {
			id = setInterval(sendPosition, 300);
		}

		return () => {
			if (id !== undefined) {
				clearInterval(id);
			}
		};
	}, [roomState, socket]);

	function handleMouseMove(event: MouseEvent): void {
		positionRef.current.playerPosition.x = event.screenX;
		positionRef.current.playerPosition.y = event.screenY;
	}

	return (
		<div ref={feltRef} class={css.felt} onMouseMove={handleMouseMove}>
			<div class={css.playSpace}>
				<div class={css.lives}>
					<h6>Lives</h6>
					<div class={css.livesBlob}>
						<span>{lives ?? '?'}</span>
					</div>
				</div>
				<div class={css.dropZone}>
					<h6>Round {round ?? '?'}</h6>
					<div class={css.target}>
						<GameCard value={6} />
					</div>
				</div>
				<div class={css.stars}>
					<h6>Stars</h6>
					<div class={css.starsBlob}>
						<span>{stars ?? '?'}</span>
					</div>
				</div>
			</div>
			<div class={css.myCards}>
				{playerCards.map((card) => (
					<GameCard key={card} value={card} />
				))}
			</div>
		</div>
	);
}
