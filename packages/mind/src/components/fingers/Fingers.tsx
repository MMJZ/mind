import { type JSX } from 'preact';
import css from './fingers.module.css';
import { useContext } from 'preact/hooks';
import { StateContext } from '../../context';

export function Fingers(): JSX.Element {
	const _state = useContext(StateContext);

	if (_state === undefined) {
		throw new Error('fucked it bro');
	}

	const state = _state;

	return (
		<>
			{state.otherPlayerFeltPositions.value.map(
				({ id, x, y, star, pressing }) => (
					<div
						key={id}
						class={`${css.finger} ${star ? css.star : ''}`}
						style={{
							top: y,
							left: x,
							backgroundColor: pressing ? 'white' : 'red',
						}}
					/>
				),
			)}
		</>
	);
}
