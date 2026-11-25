import { describe as group, expect, it } from 'vitest';
import { LINES, canPlay, createGame, describe, findWinner, isOver, play } from '../src/games/tic-tac-toe/logic.js';

/** Plays a sequence of cell indices from a fresh game. */
const playAll = (moves, state = createGame()) => moves.reduce(play, state);

/** Builds a board from a 9-char string like 'XO.X.....' ('.' = empty). */
const board = (s) => [...s].map((c) => (c === '.' ? null : c));

group('createGame', () => {
  it('starts with an empty board and X to move', () => {
    expect(createGame()).toEqual({ board: Array(9).fill(null), next: 'X', winner: null, line: null, draw: false });
  });

  it('lets O go first when asked', () => {
    expect(createGame('O').next).toBe('O');
  });
});

group('play', () => {
  it('places the current mark and alternates turns', () => {
    const s = playAll([4, 0]);
    expect(s.board).toEqual(board('O...X....'));
    expect(s.next).toBe('X');
  });

  it('does not mutate the previous state', () => {
    const before = createGame();
    const after = play(before, 4);
    expect(before.board[4]).toBeNull();
    expect(after).not.toBe(before);
  });

  it.each([
    ['an occupied cell', [4], 4],
    ['a negative index', [], -1],
    ['an index past the board', [], 9],
    ['a non-integer index', [], 1.5],
    ['NaN', [], Number.NaN],
  ])('ignores a move on %s', (_label, setup, index) => {
    const s = playAll(setup);
    expect(play(s, index)).toBe(s);
  });

  it('ignores moves once the game is won', () => {
    const won = playAll([0, 3, 1, 4, 2]); // X takes the top row
    expect(play(won, 8)).toBe(won);
  });
});

group('winning', () => {
  it.each(LINES.map((line) => [line]))('detects a win on line %j', (line) => {
    // X plays the line; O plays two cells off it, avoiding a win of its own.
    const others = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => !line.includes(i));
    const moves = [line[0], others[0], line[1], others[1], line[2]];
    const s = playAll(moves);
    expect(s.winner).toBe('X');
    expect(s.line).toEqual(line);
    expect(isOver(s)).toBe(true);
  });

  it('lets O win too', () => {
    const s = playAll([0, 3, 1, 4, 8, 5]); // O takes the middle row
    expect(s.winner).toBe('O');
    expect(s.line).toEqual([3, 4, 5]);
  });

  it('counts a win on the final cell as a win, not a draw', () => {
    // Ends X O X / O X O / O X X: X's 9th-move mark at 8 completes the 0-4-8 diagonal.
    const s = playAll([0, 1, 2, 3, 4, 5, 7, 6, 8]);
    expect(s.board).toEqual(board('XOXOXOOXX'));
    expect(s.winner).toBe('X');
    expect(s.line).toEqual([0, 4, 8]);
    expect(s.draw).toBe(false);
  });
});

group('draw', () => {
  it('is a draw when the board fills with no winner', () => {
    // Ends X O X / O O X / X X O
    const s = playAll([0, 1, 2, 4, 7, 3, 5, 8, 6]);
    expect(s.board).toEqual(board('XOXOOXXXO'));
    expect(s.winner).toBeNull();
    expect(s.draw).toBe(true);
    expect(isOver(s)).toBe(true);
  });
});

group('findWinner', () => {
  it('returns null for an empty or undecided board', () => {
    expect(findWinner(board('.........'))).toBeNull();
    expect(findWinner(board('XO.X.O...'))).toBeNull();
  });
});

group('canPlay', () => {
  it('is true only for empty in-range cells while the game is on', () => {
    const s = playAll([4]);
    expect(canPlay(s, 0)).toBe(true);
    expect(canPlay(s, 4)).toBe(false);
    expect(canPlay(s, 9)).toBe(false);
  });
});

group('describe', () => {
  it('reports whose turn, a win, or a draw', () => {
    expect(describe(createGame())).toBe('X to play');
    expect(describe(playAll([4]))).toBe('O to play');
    expect(describe(playAll([0, 3, 1, 4, 2]))).toBe('X wins!');
    expect(describe(playAll([0, 1, 2, 4, 7, 3, 5, 8, 6]))).toBe("It's a draw.");
  });
});
