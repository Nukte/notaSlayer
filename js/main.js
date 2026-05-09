// ============================================
// NoteSlayer — Entry Point
// ============================================

import { Game } from './game/Game.js';

document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('Game canvas not found!');
        return;
    }

    const game = new Game(canvas);
    await game.init();

    // Make game accessible for debugging
    window.__game = game;
});
