import './styles/style.css'
import { Game } from './core/Game.js'

window.addEventListener('load', () => {
  const canvas = document.getElementById('gameCanvas');
  const game = new Game(canvas);
});
