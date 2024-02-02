import { Signal, effect } from '@preact/signals';
import { Bounds, toPolarCoords } from './util';
import {
	ClientToServerEvents,
	PlayerPositionWithId,
	RoomState,
	ServerToClientEvents,
} from 'shared';
import { Socket } from 'socket.io-client';

interface EffectsDependencies {
	playerPosition: Signal<[number, number]>;
	feltBounds: Signal<Bounds | null>;
	votingStar: Signal<boolean>;
	roomState: Signal<RoomState>;
	roomJoinInFlight: Signal<boolean>;
	socket: Socket<ServerToClientEvents, ClientToServerEvents>;
	latestError: Signal<string | undefined>;
	roomName: Signal<string | undefined>;
	isConnected: Signal<boolean>;
}

export function addEffects({
	playerPosition,
	feltBounds,
	votingStar,
	roomState,
	roomJoinInFlight,
	socket,
	latestError,
	roomName,
	isConnected,
}: EffectsDependencies) {
	effect(() => {
		const error = latestError.value;
		if (error) {
			alert(error);
		}
	});

	effect(() => {
		function sendPosition(): void {
			const [x, y] = playerPosition.peek();
			const bounds = feltBounds.peek();

			if (bounds === null) {
				return;
			}

			const [r, θ] = toPolarCoords(x, y, bounds);
			socket.emit('setPosition', {
				r,
				θ,
				star: votingStar.peek(),
			});
		}

		let id: NodeJS.Timeout | undefined;

		if (roomState.value === 'inGame') {
			id = setInterval(sendPosition, 100);
		}

		return () => {
			if (id !== undefined) {
				clearInterval(id);
			}
		};
	});

	effect(() => {
		if (isConnected.value && !roomJoinInFlight.value && roomName.value === undefined) {
			let candidateRoom: string | null = null;
			while (candidateRoom === null) {
				candidateRoom = prompt('Room', 'name');
			}
			roomJoinInFlight.value = true;
			socket.emit('joinRoom', candidateRoom);
		}
	});
}
