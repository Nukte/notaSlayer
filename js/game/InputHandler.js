// ============================================
// NoteSlayer — Input Handler
// Centralizes keyboard and touch input management
// ============================================

export class InputHandler {
    constructor() {
        // Callbacks
        this.onPause = null;
        this.onResume = null;
        this.onCloseTuner = null;

        // Mobile pause button
        this._pauseBtn = document.getElementById('btn-mobile-pause');

        this._setupKeyboard();
        this._setupMobilePause();
    }

    _setupKeyboard() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this._handleEscape();
            }
        });
    }

    _setupMobilePause() {
        if (this._pauseBtn) {
            this._pauseBtn.addEventListener('click', () => {
                this._handleEscape();
            });
        }
    }

    /**
     * Handle ESC key or mobile pause button
     * The actual state logic is delegated to callbacks
     */
    _handleEscape() {
        // Priority: tuner close → pause → resume
        if (this.onCloseTuner && this.onCloseTuner()) {
            return; // Tuner was open and closed
        }
        if (this.onPause && this.onPause()) {
            return; // Game was playing and paused
        }
        if (this.onResume) {
            this.onResume(); // Game was paused and resumed
        }
    }

    /**
     * Show/hide mobile pause button
     */
    showMobilePause(show) {
        if (this._pauseBtn) {
            this._pauseBtn.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        // In a more complex app we'd remove listeners here
        // For now, the game lives for the page lifetime
    }
}
