import { type JSX } from 'preact';
import css from './button.module.css';

export interface ButtonProps {
	text: string;
	disabled?: true;
	onClick?: (() => void);
}

export function Button({ text, disabled, onClick }: ButtonProps): JSX.Element {
	return (
		<button onClick={onClick} class={css.button} disabled={disabled}>{text}</button>
	);
}
