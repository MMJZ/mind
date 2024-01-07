import { type JSX } from 'preact';
import { io } from 'socket.io-client';
import { GameCard } from '../gameCard/GameCard';
import css from './style.module.css';

export const socket = io('192.168.0.8:3000', {
	autoConnect: false,
});

export function App(): JSX.Element {
	// const [isConnected, setIsConnected] = useState(socket.connected);

	// useEffect(() => {
	// 	// no-op if the socket is already connected
	// 	socket.connect();
	// 	console.log('donnec', socket);

	// 	return () => {
	// 		socket.disconnect();
	// 	};
	// }, []);

	// useEffect(() => {
	// 	function onConnect(): void {
	// 		setIsConnected(true);
	// 		console.log('connected!');
	// 	}

	// 	function onDisconnect(): void {
	// 		setIsConnected(false);
	// 		console.log('disconnected!');
	// 	}

	// 	socket.on('connect', onConnect);
	// 	socket.on('disconnect', onDisconnect);

	// 	return () => {
	// 		socket.off('connect', onConnect);
	// 		socket.off('disconnect', onDisconnect);
	// 	};
	// }, []);

	// useEffect(() => {
	// 	alert(isConnected);
	// 	return () => {};
	// }, [isConnected]);

	// const [playerName, setPlayerName] = useState('cheesePerson');

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
