import './style.css';
import { describeHealth, fetchHealth } from './status.js';

const statusEl = document.querySelector('[data-status]');
const healthUrl = `${import.meta.env.BASE_URL}health.json`;

fetchHealth(healthUrl).then((result) => {
  statusEl.dataset.state = result.ok ? 'ok' : 'error';
  statusEl.querySelector('[data-status-text]').textContent = describeHealth(result);
});
