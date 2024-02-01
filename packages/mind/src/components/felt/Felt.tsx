import { type JSX } from 'preact';
import css from './felt.module.css';
import { useContext, useEffect, useRef } from 'preact/hooks';
import { GameCard } from '../gameCard/GameCard';
import { StateContext } from '../../context';
import { Fingers } from '../fingers/Fingers';
import { Spots } from '../spots/Spots';

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

	// TODO set focus
	// TODO set star

	return (
		<div ref={feltRef} class={css.felt} onMouseMove={handleMouseMove}>
			<Fingers />
			<Spots />
			<div class={css.lives}>
				<h6>Lives</h6>
				<div class={css.livesBlob}>
					<span>{state.renderLives}</span>
				</div>
			</div>
			<div class={css.dropZone}>
				{/* <h6>Round {state.renderRound}</h6> */}
				<div class={css.target}>
					{state.lastCardPlayed.value ? (
						<GameCard value={state.lastCardPlayed.value} />
					) : (
						<GameCard variant="outline" />
					)}
				</div>
			</div>
			<div class={css.stars}>
				<h6>Stars</h6>
				<div class={css.starsBlob}>
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
