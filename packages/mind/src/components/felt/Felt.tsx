import { type JSX } from 'preact';
import css from './felt.module.css';
import { useContext, useEffect, useRef } from 'preact/hooks';
import { GameCard } from '../gameCard/GameCard';
import { type Bounds } from '../../util';
import { StateContext } from '../../context';

export interface RefWithBounds {
	getBoundingClientRect: () => Bounds;
}

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
		state.playerPosition.value = [event.screenX, event.screenY];
	}

	return (
		<div ref={feltRef} class={css.felt} onMouseMove={handleMouseMove}>
			<div class={css.playSpace}>
				<div class={css.otherPlayerSpot}>
					<span>bigDadda</span>
					<div class={css.otherPlayerCards}>
						{new Array(6).fill(<GameCard variant="faceDown" />)}
					</div>
					<div class={css.otherPlayerShownCards}>
						{[5, 60].map((v) => (
							<GameCard value={v} />
						))}
					</div>
				</div>
				<div class={css.lives}>
					<h6>Lives</h6>
					<div class={css.livesBlob}>
						<span>{state.renderLives}</span>
					</div>
				</div>
				<div class={css.dropZone}>
					<h6>Round {state.renderRound}</h6>
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
			</div>
			<div class={css.myCards}>
				{state.playerCards.value.map((card) => (
					<GameCard key={card} value={card} />
				))}
			</div>
		</div>
	);
}
