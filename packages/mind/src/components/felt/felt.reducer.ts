import { type Reducer } from 'preact/hooks';
import { type PlayerCard, type Player, type SocketId } from 'shared';

export interface PlayerInformation {
	name: string;
	cardCount: number;
	shownCards: number[];
}

export type PlayerInfoActions =
	| {
			type: 'setPlayers';
			players: Player[];
	  }
	| {
			type: 'setCardCount';
			cardsEach: number;
	  }
	| {
			type: 'cardPlayed';
			playedBy: SocketId;
	  }
	| {
			type: 'cardsRevealed';
			revealed: PlayerCard[];
	  };

type State = Map<SocketId, PlayerInformation>;

export const playerInfoReducer: Reducer<State, PlayerInfoActions> = (
	state,
	action,
) => {
	switch (action.type) {
		case 'setPlayers': {
			return new Map(
				action.players.map((player) => [
					player.id,
					{
						name: player.name,
						cardCount: state.get(player.id)?.cardCount ?? 0,
					},
				]),
			);
		}
		case 'setCardCount': {
			return new Map(
				Array.from(state.entries()).map(([id, player]) => [
					id,
					{
						...player,
						cardCount: action.cardsEach,
					},
				]),
			);
		}
		case 'cardPlayed': {
			return new Map(
				Array.from(state.entries()).map(([id, player]) => [
					id,
					{
						...player,
						cardCount:
							action.playedBy === id ? player.cardCount - 1 : player.cardCount,
					},
				]),
			);
		}
		case 'cardsRevealed': {
			return new Map(
				Array.from(state.entries()).map(([id, player]) => {
					const newCards = action.revealed
						.filter((r) => r.id === id)
						.map((r) => r.card);
					const shownCards =
						newCards.length === 0 ? player.shownCards : newCards;

					return [
						id,
						{
							...player,
							shownCards,
						},
					];
				}),
			);
		}
		default:
			throw new Error('argh!');
	}
};
