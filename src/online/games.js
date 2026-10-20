/**
 * The online games, in one place. Shared screens (join, waiting room, host menu, history,
 * URLs) read a game's settings and rules from here; each game keeps its own table screen.
 * Room state carries `game`; rooms made before Teen Patti existed have none and are Call Break.
 */
import { getCardsPerPlayer } from '../utils/helpers'
import * as CB from './engine'
import * as TP from './teenpatti'

export const GAMES = {
  callbreak: {
    id: 'callbreak',
    name: 'Call Break',
    view: 'online',
    historyView: 'onlineHistory',
    path: 'callbreak',
    minSeats: CB.MIN_SEATS,
    maxSeats: CB.MAX_SEATS,
    classicSeats: 4,
    unit: 'round', // what one step of the game is called
    options: CB.ROUND_OPTIONS,
    defaultOption: CB.DEFAULT_ROUNDS,
    optionOf: (s) => s.totalRounds,
    played: (s) => s.rounds.length,
    createState: (host, option) => CB.createRoomState(host, option),
    setOption: (s, id, v) => CB.setTotalRounds(s, id, v),
    start: (s, id) => CB.startGame(s, id),
    restart: (s, id) => CB.restartGame(s, id),
    end: (s, id) => CB.endGame(s, id),
    describe: (n) => `${n} players, ${getCardsPerPlayer(n)} cards each.`,
    blurb: 'Play with friends, each on their own device. Make a table, share the room code, and the app shuffles, deals and keeps score.',
  },
  teenpatti: {
    id: 'teenpatti',
    name: 'Teen Patti',
    view: 'teenpatti',
    historyView: 'teenpattiHistory',
    path: 'teenpatti',
    minSeats: TP.TP_MIN_SEATS,
    maxSeats: TP.TP_MAX_SEATS,
    classicSeats: 3,
    unit: 'hand',
    options: TP.HAND_OPTIONS,
    defaultOption: TP.DEFAULT_HANDS,
    optionOf: (s) => s.totalHands,
    played: (s) => s.rounds.length,
    createState: (host, option) => TP.createTeenPattiState(host, option),
    setOption: (s, id, v) => TP.setTotalHands(s, id, v),
    start: (s, id) => TP.startTeenPatti(s, id),
    restart: (s, id) => TP.restartTeenPatti(s, id),
    end: (s, id) => TP.endTeenPatti(s, id),
    describe: (n) => `${n} players, ${TP.START_CHIPS.toLocaleString()} chips each, boot ${TP.BOOT}.`,
    blurb: 'Three cards each, play chips, and as much bluffing as you dare. Bet blind or seen, raise, pack, or call for a show.',
  },
}

export const gameOf = (state) => GAMES[state?.game] ?? GAMES.callbreak

/** The game whose screens a view belongs to (null for non-game views). */
export const gameForView = (view) => Object.values(GAMES).find((g) => g.view === view || g.historyView === view) ?? null

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
