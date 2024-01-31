import { type JSX } from 'preact';
import css from './spots.module.css';
import { useContext } from 'preact/hooks';
import { StateContext } from '../../context';
import { GameCard } from '../gameCard/GameCard';

export function Spots(): JSX.Element {
	const _state = useContext(StateContext);

	if (_state === undefined) {
		throw new Error('fucked it bro');
	}

	const state = _state;

	return (
		<>
			{state.otherPlayerSpots.value.map((spot) => (
				<div
					key={spot.id}
					class={css.otherPlayerSpotWrapper}
					style={{ top: spot.top, left: spot.left }}
				>
					<div class={css.otherPlayerSpot}>
						<div class={css.nameRow}>
							<span>{spot.name}</span>
							<div
								class={`${css.otherPlayerCardCount} ${spot.cardsLeft === 0 ? css.noCards : ''}`}
							>
								<GameCard variant="faceDown" />
								<span>{spot.cardsLeft}</span>
							</div>
						</div>
						<div class={css.otherPlayerShownCards}>
							{spot.shownCards.map((v) => (
								<GameCard key={v} value={v} thinRender />
							))}
						</div>
					</div>
				</div>
			))}
		</>
	);
}
