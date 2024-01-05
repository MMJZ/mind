import { type JSX, render } from 'preact';
import { LocationProvider, Router, Route } from 'preact-iso';
import { useEffect, useState } from 'preact/hooks';
import { Header } from './components/Header.jsx';
import { Home } from './pages/Home/index.jsx';
import { NotFound } from './pages/_404.jsx';
import './style.css';
import { socket } from './socket.js';

export function App(): JSX.Element {
	const [isConnected, setIsConnected] = useState(socket.connected);

	useEffect(() => {
		// no-op if the socket is already connected
		socket.connect();
		console.log('donnec', socket);

		return () => {
			socket.disconnect();
		};
	}, []);

	useEffect(() => {
		function onConnect(): void {
			setIsConnected(true);
			console.log('connected!');
		}

		function onDisconnect(): void {
			setIsConnected(false);
			console.log('disconnected!');
		}

		socket.on('connect', onConnect);
		socket.on('disconnect', onDisconnect);

		return () => {
			socket.off('connect', onConnect);
			socket.off('disconnect', onDisconnect);
		};
	}, []);

	useEffect(() => {
		alert(isConnected);
		return () => {};
	}, [isConnected]);

	return (
		<LocationProvider>
			<Header />
			<main>
				<Router>
					<Route path="/" component={Home} />
					<Route default component={NotFound} />
				</Router>
			</main>
		</LocationProvider>
	);
}

const appElement = document.getElementById('app');

if (appElement === null) {
	throw new Error("Failed to find 'app' in DOM");
}

render(<App />, appElement);
