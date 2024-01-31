import { type JSX } from 'preact';
import css from './gameCard.module.css';

interface GameCardProps {
	value?: number;
	variant?: 'faceDown' | 'outline';
	thinRender?: true;
	spicy?: true;
}

export function GameCard({
	value,
	variant,
	thinRender,
	spicy
}: GameCardProps): JSX.Element {
	const style = {
		fontFamily: thinRender ? 'Rubik' : 'Rubik Distressed',
	};

	return (
		<div
			class={`${css.wrapper} ${variant === 'outline' ? css.outline : css.cardProper} ${spicy ? css.spicy : ''}`}
		>
			{/* <div class={css.edgeRow}>
				<span>{value}</span>
				<span>{value}</span>
			</div> */}
			{variant === undefined && (
				<div class={css.main} style={style}>
					{value}
				</div>
			)}
			{/* <div class={css.edgeRow}>
				<span>{value}</span>
				<span>{value}</span>
			</div> */}
		</div>
	);
}
