import { type JSX } from 'preact';
import css from './style.module.css';

interface GameCardProps {
	value: number;
}

export function GameCard({ value }: GameCardProps): JSX.Element {
	return (
		<div class={css.wrapper}>
			<div class={css.edgeRow}>
				<span>{value}</span>
				<span>{value}</span>
			</div>
			<div class={css.main}>{value}</div>
			<div class={css.edgeRow}>
				<span>{value}</span>
				<span>{value}</span>
			</div>
		</div>
	);
}
