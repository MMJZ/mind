import { createContext } from 'preact';
import { type AppState } from './state/store';

export const StateContext = createContext<AppState | undefined>(undefined);
