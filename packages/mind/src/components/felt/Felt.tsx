import { type JSX } from 'preact';
import css from './felt.module.css';
import { useContext, useEffect, useRef } from 'preact/hooks';
import { GameCard } from '../gameCard/GameCard';
import { StateContext } from '../../context';
import { Fingers } from '../fingers/Fingers';
import { Spots } from '../spots/Spots';
import { FocusSplash } from '../focusSplash/FocusSplash';
import { batch } from '@preact/signals';
import { Updating } from '../updating/Updating';

export function Felt(): JSX.Element {
	const _state = useContext(StateContext);

	if (_state === undefined) {
		throw new Error('fucked it bro');
	}

	const state = _state;
	const feltRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		function updateBounds(): void {
			if (feltRef.current !== null) {
				state.feltBounds.value = feltRef.current.getBoundingClientRect();
			}
		}

		window.addEventListener('resize', updateBounds);
		updateBounds();

		return () => {
			window.removeEventListener('resize', updateBounds);
		};
	}, [state.feltBounds]);

	function handleMouseMove(event: MouseEvent): void {
		state.playerPosition.value = [event.pageX, event.pageY];
	}

	function setFocus(set: boolean) {
		// TODO handle case where mouse lingering inside zone as we transition states
		if (state.roomState.peek() === 'awaitingFocus') {
			batch(() => {
				state.votingFocus.value = set;
				state.votingFocusInFlight.value = true;
			});
			state.socket.emit('setFocus', set);
		}
	}

	function setStar(set: boolean) {
		if (state.roomState.peek() === 'inGame') {
			batch(() => {
				state.votingFocus.value = set;
				state.votingFocusInFlight.value = true;
			});
		}
	}

	function playCard() {
		if (state.roomState.peek() === 'inGame') {
			batch(() => {
				state.playCardInFlight.value = true;
				state.playerIsPressing.value = false;
			});
			state.socket.emit('playCard');
		}
	}

	return (
		<div ref={feltRef} class={css.felt} onMouseMove={handleMouseMove}>
			<FocusSplash />
			<Fingers />
			<Spots />
			<div class={css.lives}>
				<h6>Lives</h6>
				<div
					class={css.livesBlob}
					onMouseEnter={() => setFocus(true)}
					onMouseLeave={() => setFocus(false)}
				>
					<span>{state.renderLives}</span>
				</div>
				{state.votingFocusInFlight.value && <Updating />}
				{state.focussedPlayerNames.value.map(({ name, id }) => (
					<span key={id}>{name}</span>
				))}
			</div>
			<div class={css.dropZone}>
				<h6>Round {state.renderRound}</h6>
				<div
					class={css.target}
					onMouseDown={() => (state.playerIsPressing.value = true)}
					onMouseLeave={() => (state.playerIsPressing.value = false)}
					onMouseUp={() => playCard()}
				>
					{state.lastCardPlayed.value ? (
						<GameCard value={state.lastCardPlayed.value} />
					) : (
						<GameCard variant="outline" />
					)}
					<h6 class={css.hackHeader}></h6>
				</div>
			</div>
			<div class={css.stars}>
				<h6>Stars</h6>
				<div
					class={css.starsBlob}
					onMouseEnter={() => setStar(true)}
					onMouseLeave={() => setStar(false)}
				>
					<span>{state.renderStars}</span>
				</div>
			</div>
			<div class={css.myCards}>
				{state.playerCards.value.map((card) => (
					<GameCard key={card} value={card} />
				))}
			</div>
		</div>
	);
}
