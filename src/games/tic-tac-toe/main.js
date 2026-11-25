import '../../style.css';
import './style.css';
import { canPlay, createGame, describe, isOver, play } from './logic.js';

const boardEl = document.querySelector('[data-board]');
const statusEl = document.querySelector('[data-game-status]');
const restartEl = document.querySelector('[data-restart]');

const cells = Array.from({ length: 9 }, (_, i) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cell';
  btn.dataset.index = String(i);
  boardEl.append(btn);
  return btn;
});

let state = createGame();

function render() {
  cells.forEach((btn, i) => {
    const mark = state.board[i];
    const row = Math.floor(i / 3) + 1;
    const col = (i % 3) + 1;
    btn.textContent = mark ?? '';
    btn.dataset.mark = mark ?? '';
    btn.disabled = !canPlay(state, i);
    btn.classList.toggle('win', state.line?.includes(i) ?? false);
    btn.setAttribute('aria-label', `Row ${row}, column ${col}: ${mark ?? 'empty'}`);
  });
  statusEl.textContent = describe(state);
  restartEl.textContent = isOver(state) ? 'Play again' : 'Restart';
}

boardEl.addEventListener('click', (event) => {
  const btn = event.target.closest('.cell');
  if (!btn) return;
  state = play(state, Number(btn.dataset.index));
  render();
});

restartEl.addEventListener('click', () => {
  state = createGame();
  render();
  cells[0].focus();
});

render();
