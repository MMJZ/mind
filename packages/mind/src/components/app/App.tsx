import { type JSX } from 'preact';
import { type Socket, io } from 'socket.io-client';
import css from './app.module.css';
import { useEffect, useState } from 'preact/hooks';
import { type ClientToServerEvents, type ServerToClientEvents } from 'shared';
import { Button } from '../button/Button';
import { Felt } from '../felt/Felt';
import { Updating } from '../updating/Updating';

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
	'192.168.0.8:3000',
	{
		autoConnect: false,
	},
);

export function App(): JSX.Element {
	const [isConnected, setIsConnected] = useState(socket.connected);
	const [playerName, setPlayerName] = useState('cheesePerson');
	const [nameUpdateInFlight, setNameUpdateInFlight] = useState(false);
	const [roomJoinInFlight, setRoomJoinInFlight] = useState(false);
	const [roomName, setRoomName] = useState<string | undefined>(undefined);

	useEffect(() => {
		socket.connect();
		return () => {
			socket.disconnect();
		};
	}, []);

	useEffect(() => {
		function onConnect(): void {
			setIsConnected(true);
			alert('connected!');
		}

		function onDisconnect(): void {
			setIsConnected(false);
			alert('disconnected!');
		}

		function onJoinRoomSuccess(roomName: string): void {
			setRoomJoinInFlight(false);
			setRoomName(roomName);
		}

		function onJoinRoomFailure(error: string): void {
			setRoomJoinInFlight(false);
			alert(error);
		}

		function onSetNameSuccess(name: string): void {
			setNameUpdateInFlight(false);
			setPlayerName(name);
		}

		function onSetNameFailure(error: string): void {
			setNameUpdateInFlight(false);
			alert(error);
		}

		socket.on('connect', onConnect);
		socket.on('disconnect', onDisconnect);
		socket.on('joinRoomSuccess', onJoinRoomSuccess);
		socket.on('joinRoomFailure', onJoinRoomFailure);
		socket.on('setNameSuccess', onSetNameSuccess);
		socket.on('setNameFailure', onSetNameFailure);

		return () => {
			socket.off('connect', onConnect);
			socket.off('disconnect', onDisconnect);
			socket.off('joinRoomSuccess', onJoinRoomSuccess);
		};
	}, [setIsConnected, setNameUpdateInFlight, setRoomJoinInFlight]);

	function updateName(candidateName: string | null): void {
		if (candidateName !== null && candidateName !== playerName) {
			socket.emit('setName', candidateName);
			setNameUpdateInFlight(true);
		}
	}

	useEffect(() => {
		function joinRoom(candidateRoom: string | null): void {
			if (candidateRoom !== null) {
				socket.emit('joinRoom', candidateRoom);
				setRoomJoinInFlight(true);
			}
		}
		if (!roomJoinInFlight && roomName === undefined) {
			joinRoom(prompt('Room', 'name'));
		}
	}, [roomJoinInFlight, setRoomJoinInFlight, roomName]);

	return (
		<div class={css.wrapper}>
			<nav class={css.statusBar}>
				<div>
					<div>Connected</div>
					<div class={css.statusButton}>{String(isConnected)}</div>
				</div>
				<div>
					<div>Name</div>
					<div
						class={css.statusButton}
						title="Edit Name"
						onClick={() => {
							updateName(prompt('Name', playerName));
						}}
					>
						<span>{playerName}</span>
						<span>{nameUpdateInFlight && <Updating />}</span>
					</div>
				</div>
				<div>
					<div>Room</div>
					<div class={css.statusButton} title="Copy Room Name">
						<span>{roomName ?? '?'}</span>
						<span>{roomJoinInFlight && <Updating />}</span>
					</div>
				</div>
				<Button text="start round" />
				<Button text="leave room" />
			</nav>
			<main>
				<Felt socket={socket} />
			</main>
		</div>
	);
}
