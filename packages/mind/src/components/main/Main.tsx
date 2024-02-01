import { type JSX } from 'preact';
import css from './main.module.css';
import { useContext } from 'preact/hooks';
import { Button } from '../button/Button';
import { Felt } from '../felt/Felt';
import { Updating } from '../updating/Updating';
import { StateContext } from '../../context';

export function Main(): JSX.Element {
	const _state = useContext(StateContext);

	if (_state === undefined) {
		throw new Error('fucked it bro');
	}

	const state = _state;

	function updateName(candidateName: string | null): void {
		if (candidateName !== null && candidateName !== state.playerName.peek()) {
			state.socket.emit('setName', candidateName);
			state.nameUpdateInFlight.value = true;
		}
	}

	function startRound(): void {
		state.socket.emit('roundStart');
		state.startRoundInFlight.value = true;
	}

	function leaveRoom(): void {
		state.socket.emit('leaveRoom');
		state.roomJoinInFlight.value = true;
	}

	return (
		<div class={css.wrapper}>
			<nav>
				<div>
					<div>Connected</div>
					<div class={css.statusButton}>{String(state.isConnected.value)}</div>
				</div>
				<div>
					<div>Name</div>
					<div
						class={css.statusButton}
						title="Edit Name"
						onClick={() => {
							updateName(prompt('Name', state.playerName.peek()));
						}}
					>
						<span>{state.playerName}</span>
						<span>{state.nameUpdateInFlight.value && <Updating />}</span>
					</div>
				</div>
				<div>
					<div>Room</div>
					<div class={css.statusButton} title="Copy Room Name">
						<span>{state.renderRoomName}</span>
						<span>{state.roomJoinInFlight.value && <Updating />}</span>
					</div>
				</div>
				<Button text="start round" onClick={startRound}/>
				<Button text="leave room" onClick={leaveRoom} />
			</nav>
			<main>
				<Felt />
			</main>
		</div>
	);
}
