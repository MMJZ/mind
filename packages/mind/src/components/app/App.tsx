import { type JSX } from 'preact';
import { io } from 'socket.io-client';
import { GameCard } from '../gameCard/GameCard';
import css from './style.module.css';
import { useEffect, useState } from 'preact/hooks';

export const socket = io('192.168.0.8:3000', {
	autoConnect: false,
});

export function App(): JSX.Element {
	const [isConnected, setIsConnected] = useState(socket.connected);

	useEffect(() => {
		socket.connect();
		return () => {
			socket.disconnect();
		};
	}, []);

	useEffect(() => {
		function onConnect(): void {
			setIsConnected(true);
			console.log('connected!');
		}

		function onDisconnect(): void {
			setIsConnected(false);
			console.log('disconnected!');
		}

		function onJoinRoomSuccess(
			round: number,
			lives: number,
			stars: number,
			players: Array<[string, string]>,
		): void {
			setRound(round);
			setLives(lives);
			setStars(stars);
			setPlayers
		}

		socket.on('connect', onConnect);
		socket.on('disconnect', onDisconnect);

		return () => {
			socket.off('connect', onConnect);
			socket.off('disconnect', onDisconnect);
		};
	}, [setIsConnected]);

	useEffect(() => {
		alert(isConnected);
		return () => {};
	}, [isConnected]);

	const [playerName, setPlayerName] = useState('cheesePerson');

	const [nameUpdateInFlight, setNameUpdateInFlight] = useState(false);
	const [roomJoinInFlight, setRoomJoinInFlight] = useState(false);
	const [playCardInFlight, setPlayCardInFlight] = useState(false);

	const [round, setRound] = useState<number | undefined>(undefined);
	const [lives, setLives] = useState<number | undefined>(undefined);
	const [stars, setStars] = useState<number | undefined>(undefined);

	function updateName(candidateName: string): void {
		socket.emit('setName', candidateName);
		setNameUpdateInFlight(true);
	}

	function joinRoom(candidateRoom: string): void {
		joinRoom;
	}

	return (
		<>
			{/* <Header /> */}
			<div class={css.card}>
				<GameCard value={100} />
				{/* <GameCard value={50} /> */}
				<GameCard value={6} />
				<GameCard value={68} />
			</div>
		</>
	);
}
