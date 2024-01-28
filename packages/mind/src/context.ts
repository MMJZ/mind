import { createContext } from 'preact';
import { type AppState } from './state/socket';

export const StateContext = createContext<AppState | undefined>(undefined);
