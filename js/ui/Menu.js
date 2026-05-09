// ============================================
// NoteSlayer — Menu System
// Handles main menu, calibration, tuning, and settings
// ============================================

export class Menu {
    constructor() {
        // DOM elements
        this.menuOverlay = document.getElementById('menu-overlay');
        this.calibrationOverlay = document.getElementById('calibration-overlay');

        // Settings
        this.selectedDifficulty = 'NORMAL';
        this.selectedInstrument = 'guitar';

        // Callbacks
        this.onStartGame = null;
        this.onRequestCalibration = null;
        this.onTuningRequested = null;

        // Calibration state
        this.calibrationActive = false;
        this.calibrationNotes = [];
        this.calibrationRequired = 3;

        this._setupEventListeners();
    }

    _setupEventListeners() {
        // Start button — now triggers audio init + calibration
        const startBtn = document.getElementById('btn-start');
        if (startBtn) {
            startBtn.addEventListener('click', async () => {
                // First init audio (user gesture!)
                if (this.onRequestCalibration) {
                    await this.onRequestCalibration();
                }
                this.hideMenu();
                this.showCalibration();
            });
        }

        // Tuning button
        const tuneBtn = document.getElementById('btn-tune');
        if (tuneBtn) {
            tuneBtn.addEventListener('click', () => {
                if (this.onTuningRequested) {
                    this.onTuningRequested();
                }
            });
        }

        // Close tuner button
        const closeTunerBtn = document.getElementById('btn-close-tuner');
        if (closeTunerBtn) {
            closeTunerBtn.addEventListener('click', () => {
                const overlay = document.getElementById('tuner-overlay');
                if (overlay) overlay.classList.remove('visible');
                // Also notify game to stop tuning mode
                // This is handled via ESC or the button
                if (window.__game) window.__game._closeTuner();
            });
        }

        // Difficulty buttons — use event delegation to handle clicks on children
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget;
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                target.classList.add('active');
                this.selectedDifficulty = target.dataset.difficulty;
            });
        });

        // Calibration skip
        const skipBtn = document.getElementById('btn-skip-calibration');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                this.hideCalibration();
                if (this.onStartGame) {
                    this.onStartGame(this.selectedDifficulty, this.selectedInstrument);
                }
            });
        }
    }

    showMenu() {
        if (this.menuOverlay) {
            this.menuOverlay.classList.add('visible');
        }
    }

    hideMenu() {
        if (this.menuOverlay) {
            this.menuOverlay.classList.remove('visible');
        }
    }

    showCalibration() {
        this.calibrationActive = true;
        this.calibrationNotes = [];
        if (this.calibrationOverlay) {
            this.calibrationOverlay.classList.add('visible');
            this._updateCalibrationUI();
        }
    }

    hideCalibration() {
        this.calibrationActive = false;
        if (this.calibrationOverlay) {
            this.calibrationOverlay.classList.remove('visible');
        }
    }

    /**
     * Feed a detected note to calibration
     */
    feedCalibrationNote(note) {
        if (!this.calibrationActive || !note) return false;

        // Only add unique notes
        if (!this.calibrationNotes.includes(note.name)) {
            this.calibrationNotes.push(note.name);
            this._updateCalibrationUI();
        }

        if (this.calibrationNotes.length >= this.calibrationRequired) {
            this.calibrationActive = false; // Stop accepting immediately
            setTimeout(() => {
                this.hideCalibration();
                if (this.onStartGame) {
                    this.onStartGame(this.selectedDifficulty, this.selectedInstrument);
                }
            }, 600);
            return true;
        }

        return false;
    }

    _updateCalibrationUI() {
        const notesList = document.getElementById('calibration-notes');
        const progressText = document.getElementById('calibration-progress');

        if (notesList) {
            notesList.innerHTML = this.calibrationNotes
                .map(n => `<span class="calibration-note detected">${n}</span>`)
                .join('');

            for (let i = this.calibrationNotes.length; i < this.calibrationRequired; i++) {
                notesList.innerHTML += '<span class="calibration-note pending">?</span>';
            }
        }

        if (progressText) {
            progressText.textContent = `${this.calibrationNotes.length} / ${this.calibrationRequired} nota algılandı`;
        }
    }

    getSettings() {
        return {
            difficulty: this.selectedDifficulty,
            instrument: this.selectedInstrument,
        };
    }
}
