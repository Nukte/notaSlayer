// ============================================
// NoteSlayer — Tuner Controller
// Handles tuner UI display and DOM interactions
// ============================================

import { clamp } from '../utils/helpers.js';

export class TunerController {
    constructor() {
        // Cache DOM elements once
        this._overlay = document.getElementById('tuner-overlay');
        this._noteEl = document.getElementById('tuner-note');
        this._freqEl = document.getElementById('tuner-freq');
        this._centsEl = document.getElementById('tuner-cents');
        this._barEl = document.getElementById('tuner-bar-fill');
        this._statusEl = document.getElementById('tuner-status');

        // State
        this.active = false;

        // Callbacks
        this.onClose = null;

        // Setup close button
        const closeTunerBtn = document.getElementById('btn-close-tuner');
        if (closeTunerBtn) {
            closeTunerBtn.addEventListener('click', () => this.close());
        }
    }

    /**
     * Open the tuner overlay
     */
    open() {
        this.active = true;
        if (this._overlay) this._overlay.classList.add('visible');
    }

    /**
     * Close the tuner overlay
     */
    close() {
        this.active = false;
        if (this._overlay) this._overlay.classList.remove('visible');
        if (this.onClose) this.onClose();
    }

    /**
     * Update the tuner display with a detected note
     * @param {{ name: string, frequency: number, cents: number }} note
     */
    updateDisplay(note) {
        if (!this.active) return;

        if (this._noteEl) this._noteEl.textContent = note.name;
        if (this._freqEl) this._freqEl.textContent = `${note.frequency.toFixed(1)} Hz`;

        const cents = note.cents;
        if (this._centsEl) this._centsEl.textContent = `${cents > 0 ? '+' : ''}${cents}¢`;

        // Bar position: 50% = perfect, 0% = very flat, 100% = very sharp
        const barPos = 50 + (cents / 50) * 50;
        if (this._barEl) this._barEl.style.left = `${clamp(barPos, 2, 98)}%`;

        // Status & color based on accuracy
        const absCents = Math.abs(cents);
        let status, color;
        if (absCents <= 5) {
            status = '✓ AKORT';
            color = '#39ff14';
        } else if (absCents <= 15) {
            status = 'YAKIN';
            color = '#ffff00';
        } else {
            status = cents > 0 ? '↑ TIZLEŞTIR' : '↓ PESLEŞTIR';
            color = '#ff6600';
        }

        if (this._statusEl) {
            this._statusEl.textContent = status;
            this._statusEl.style.color = color;
        }
        if (this._barEl) this._barEl.style.backgroundColor = color;
        if (this._noteEl) this._noteEl.style.color = color;
    }
}
