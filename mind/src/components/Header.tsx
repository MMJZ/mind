import { useLocation } from 'preact-iso';
import { asd } from './style.module.css';
import { type JSX } from 'preact';

export function Header(): JSX.Element {
	const { url } = useLocation();

	return (
		<header>
			<nav>
				<a href="/" class={url === '/' ? `active ${asd}` : undefined}>
					Home
				</a>
				<a href="/404" class={url === '/404' ? 'active' : undefined}>
					404
				</a>
			</nav>
		</header>
	);
}
