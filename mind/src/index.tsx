import { render } from 'preact';
import { App } from './components/app/App';

const appElement = document.getElementById('app');

if (appElement === null) {
	throw new Error("Failed to find 'app' in DOM");
}

render(<App />, appElement);
