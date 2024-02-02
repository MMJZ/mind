import { type JSX } from 'preact';
import css from './focusSplash.module.css';
import { useContext } from 'preact/hooks';
import { StateContext } from '../../context';

export function FocusSplash(): JSX.Element {
	const _state = useContext(StateContext);

	if (_state === undefined) {
		throw new Error('fucked it bro');
	}

	const state = _state;

	return (
		<div class={css.wrapper}>
			{state.roomState.value === 'awaitingFocus' && <h6>AWAITING FOCUS</h6>}
		</div>
	);
}
