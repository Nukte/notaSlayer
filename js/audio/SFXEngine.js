// ============================================
// NoteSlayer — SFX Engine
// Synthesized sound effects using Web Audio API
// All sounds are short, atonal bursts to avoid
// interfering with pitch detection
// ============================================

export class SFXEngine {
    /**
     * @param {AudioContext} audioContext - Shared audio context from AudioEngine
     */
    constructor(audioContext = null) {
        this._ctx = audioContext;
        this._enabled = true;
        this._volume = 0.15; // Low default to avoid mic interference
        this._masterGain = null;
    }

    /**
     * Initialize with an AudioContext (call after AudioEngine.initialize)
     */
    init(audioContext) {
        this._ctx = audioContext;
        this._masterGain = this._ctx.createGain();
        this._masterGain.gain.value = this._volume;
        this._masterGain.connect(this._ctx.destination);
    }

    get isReady() {
        return this._ctx !== null && this._masterGain !== null;
    }

    /**
     * Enable/disable SFX
     */
    setEnabled(enabled) {
        this._enabled = enabled;
    }

    /**
     * Set volume (0.0 - 1.0)
     */
    setVolume(volume) {
        this._volume = Math.max(0, Math.min(1, volume));
        if (this._masterGain) {
            this._masterGain.gain.value = this._volume;
        }
    }

    // === SOUND EFFECTS ===

    /**
     * Enemy killed — short rising sweep (pitch varies by enemy type)
     */
    playKill(enemyColor = '#39ff14') {
        if (!this._canPlay()) return;

        const baseFreq = this._colorToFreq(enemyColor);
        const now = this._ctx.currentTime;

        // Quick ascending sweep
        const osc = this._ctx.createOscillator();
        const gain = this._ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 3, now + 0.06);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(this._masterGain);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    /**
     * Enemy hit but not killed — dull thud
     */
    playHit() {
        if (!this._canPlay()) return;

        const now = this._ctx.currentTime;

        const osc = this._ctx.createOscillator();
        const gain = this._ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.05);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

        osc.connect(gain);
        gain.connect(this._masterGain);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    /**
     * Player takes damage — harsh descending noise
     */
    playDamage() {
        if (!this._canPlay()) return;

        const now = this._ctx.currentTime;
        const duration = 0.15;

        // Noise burst via oscillator frequency modulation
        const osc = this._ctx.createOscillator();
        const gain = this._ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + duration);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.connect(gain);
        gain.connect(this._masterGain);
        osc.start(now);
        osc.stop(now + duration);
    }

    /**
     * Combo milestone — quick ascending arpeggio (2-3 notes)
     */
    playCombo(level = 1) {
        if (!this._canPlay()) return;

        const now = this._ctx.currentTime;
        const baseFreq = 600 + level * 100;

        for (let i = 0; i < 3; i++) {
            const osc = this._ctx.createOscillator();
            const gain = this._ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = baseFreq * (1 + i * 0.25);

            const start = now + i * 0.04;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.2, start + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.06);

            osc.connect(gain);
            gain.connect(this._masterGain);
            osc.start(start);
            osc.stop(start + 0.06);
        }
    }

    /**
     * New wave starting — short fanfare
     */
    playWaveStart() {
        if (!this._canPlay()) return;

        const now = this._ctx.currentTime;
        const notes = [440, 554, 659]; // A4, C#5, E5

        notes.forEach((freq, i) => {
            const osc = this._ctx.createOscillator();
            const gain = this._ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const start = now + i * 0.08;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.12);

            osc.connect(gain);
            gain.connect(this._masterGain);
            osc.start(start);
            osc.stop(start + 0.12);
        });
    }

    /**
     * Wave cleared — triumphant short melody
     */
    playWaveClear() {
        if (!this._canPlay()) return;

        const now = this._ctx.currentTime;
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6

        notes.forEach((freq, i) => {
            const osc = this._ctx.createOscillator();
            const gain = this._ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const start = now + i * 0.06;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.12, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, start + 0.15);

            osc.connect(gain);
            gain.connect(this._masterGain);
            osc.start(start);
            osc.stop(start + 0.15);
        });
    }

    /**
     * Game over — dramatic descending tone
     */
    playGameOver() {
        if (!this._canPlay()) return;

        const now = this._ctx.currentTime;

        const osc = this._ctx.createOscillator();
        const gain = this._ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        osc.connect(gain);
        gain.connect(this._masterGain);
        osc.start(now);
        osc.stop(now + 0.5);
    }

    // === HELPERS ===

    _canPlay() {
        return this._enabled && this.isReady;
    }

    /**
     * Map enemy color to a frequency for variety in kill sounds
     */
    _colorToFreq(color) {
        const map = {
            '#39ff14': 800,  // Normal — green
            '#ff6600': 1000, // Fast — orange
            '#ff073a': 600,  // Elite — red
            '#bf00ff': 400,  // Boss — purple
        };
        return map[color] || 800;
    }
}
