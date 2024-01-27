import { type JSX } from 'preact';
import css from './updating.module.css';

export function Updating(): JSX.Element {
	return <img src="/updating.svg" class={css.img} />;
}
