// ============================================
// NoteSlayer — Game Over Screen
// ============================================

import { formatNumber } from '../utils/helpers.js';

export class GameOver {
    constructor() {
        this.overlay = document.getElementById('gameover-overlay');

        // Callbacks
        this.onPlayAgain = null;
        this.onMainMenu = null;

        this._setupEventListeners();
    }

    _setupEventListeners() {
        const playAgainBtn = document.getElementById('btn-play-again');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                this.hide();
                if (this.onPlayAgain) this.onPlayAgain();
            });
        }

        const menuBtn = document.getElementById('btn-main-menu');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                this.hide();
                if (this.onMainMenu) this.onMainMenu();
            });
        }
    }

    /**
     * Show game over screen with stats
     */
    show(stats) {
        const { score, wave, combo, kills, accuracy } = stats;

        // Update stats display
        this._setText('stat-score', formatNumber(score));
        this._setText('stat-wave', wave);
        this._setText('stat-combo', combo);
        this._setText('stat-kills', kills);

        // Check & update high score
        const highScore = this._getHighScore();
        const isNewHighScore = score > highScore;

        if (isNewHighScore) {
            this._setHighScore(score);
        }

        this._setText('stat-highscore', formatNumber(Math.max(score, highScore)));

        const highScoreLabel = document.getElementById('new-highscore-label');
        if (highScoreLabel) {
            highScoreLabel.style.display = isNewHighScore ? 'block' : 'none';
        }

        if (this.overlay) {
            this.overlay.classList.add('visible');
        }
    }

    /**
     * Hide game over screen
     */
    hide() {
        if (this.overlay) {
            this.overlay.classList.remove('visible');
        }
    }

    _setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    _getHighScore() {
        try {
            return parseInt(localStorage.getItem('noteslayer_highscore') || '0', 10);
        } catch {
            return 0;
        }
    }

    _setHighScore(score) {
        try {
            localStorage.setItem('noteslayer_highscore', score.toString());
        } catch {
            // Storage not available
        }
    }
}
