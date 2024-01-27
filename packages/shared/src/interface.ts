import { RoomPosition, PlayerFocus, PlayerPosition, PlayerCard, PlayerPositionWithId } from "./model";
import { Merge } from "./util";

type ClientServerEvents = [
	{
		client: {
			joinRoom: (name: string) => void;
		};
		server: {
			joinRoomSuccess: (roomName: string) => void;
			joinRoomFailure: (error: string) => void;
		};
	},
	{
		client: {
			leaveRoom: () => void;
		};
		server: {
			leaveRoomSuccess: () => void;
			leaveRoomFailure: (error: string) => void;
		};
	},
	{
		client: {
			setName: (name: string) => void;
		};
		server: {
			setNameSuccess: (name: string) => void;
			setNameFailure: (error: string) => void;
		};
	},
	{
		client: {
			roundStart: () => void;
		};
		server: {
			roundStartSuccess: (cards: number[]) => void;
			roundStartFailure: (error: string) => void;
		};
	},
	{
		client: {
			setFocus: (focus: boolean) => void;
		};
		server: {
			setRoomPosition: (position: RoomPosition) => void;
			setPlayerFocusses: (focusses: PlayerFocus[]) => void;
			focusStart: () => void;
		};
	},
	{
		client: {
			setPosition: (position: PlayerPosition) => void;
		};
		server: {
			setPlayerPositions: (positions: PlayerPositionWithId[]) => void;
		};
	},
	{
		client: {
			playCard: () => void;
		};
		server: {
			playCardSuccess: (play: PlayerCard) => void;
			playCardFailure: (error: string) => void;
			star: (cards: PlayerCard[], newStars: number) => void;
			bust: (revealed: PlayerCard[], newLives: number) => void;
		};
	},
];

export type ServerToClientEvents = Merge<ClientServerEvents[number]['server']>;
export type ClientToServerEvents = Merge<ClientServerEvents[number]['client']>;
export type InterServerEvents = Record<string, never>;
