import { type JSX } from 'preact';
import css from './gameCard.module.css';

interface GameCardProps {
	value?: number;
	variant?: 'faceDown' | 'outline';
}

export function GameCard({ value, variant }: GameCardProps): JSX.Element {
	return (
		<div class={`${css.wrapper} ${variant === 'outline' ? css.outline : css.cardProper}`}>
			{/* <div class={css.edgeRow}>
				<span>{value}</span>
				<span>{value}</span>
			</div> */}
			{variant === undefined && <div class={css.main}>{value}</div>}
			{/* <div class={css.edgeRow}>
				<span>{value}</span>
				<span>{value}</span>
			</div> */}
		</div>
	);
}
