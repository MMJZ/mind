import { type JSX, render } from 'preact';
import { Main } from './components/main/Main';
import { createAppState } from './state/store';
import { StateContext } from './context';

const appElement = document.getElementById('app');

if (appElement === null) {
	throw new Error("Failed to find 'app' in DOM");
}

function App(): JSX.Element {
	return (
		<StateContext.Provider value={createAppState()}>
			<Main />
		</StateContext.Provider>
	);
}

render(<App />, appElement);
