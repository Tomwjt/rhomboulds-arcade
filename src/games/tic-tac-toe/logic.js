/**
 * Tic-Tac-Toe rules. Pure and immutable: every function returns new state
 * and never touches the DOM, so it is fully unit tested (tests/tic-tac-toe.test.js).
 *
 * The board is 9 cells, indexed row by row:
 *   0 | 1 | 2
 *   3 | 4 | 5
 *   6 | 7 | 8
 */

export const PLAYERS = ['X', 'O'];

export const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],            // diagonals
];

/** @typedef {{ board: (null|'X'|'O')[], next: 'X'|'O', winner: null|'X'|'O', line: null|number[], draw: boolean }} GameState */

/** @returns {GameState} */
export function createGame(first = 'X') {
  return { board: Array(9).fill(null), next: first, winner: null, line: null, draw: false };
}

/** @returns {{ player: 'X'|'O', line: number[] } | null} */
export function findWinner(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return { player: board[a], line };
  }
  return null;
}

export function isOver(state) {
  return state.winner !== null || state.draw;
}

/** Whether `next` may play at `index` right now. */
export function canPlay(state, index) {
  return !isOver(state) && Number.isInteger(index) && index >= 0 && index < 9 && state.board[index] === null;
}

/**
 * Plays the current player's mark at `index`.
 * Illegal moves (occupied cell, out of range, game over) return the same state object unchanged.
 * @returns {GameState}
 */
export function play(state, index) {
  if (!canPlay(state, index)) return state;

  const board = state.board.slice();
  board[index] = state.next;

  const win = findWinner(board);
  return {
    board,
    next: state.next === 'X' ? 'O' : 'X',
    winner: win ? win.player : null,
    line: win ? win.line : null,
    draw: !win && board.every((cell) => cell !== null),
  };
}

/** Human-readable status line for the UI. */
export function describe(state) {
  if (state.winner) return `${state.winner} wins!`;
  if (state.draw) return "It's a draw.";
  return `${state.next} to play`;
}
