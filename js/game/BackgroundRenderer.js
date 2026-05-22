// ============================================
// NoteSlayer — Background Renderer
// Handles stars, grid, gradients, and audio visualizer
// ============================================

import { COLORS, GRID_SPACING, GAME_STATES } from '../utils/constants.js';

export class BackgroundRenderer {
    constructor() {
        this.stars = [];
        this.gridOffset = 0;

        // Cached gradient (offscreen canvas)
        this._bgCanvas = null;
        this._bgCtx = null;
        this._cachedWidth = 0;
        this._cachedHeight = 0;

        // Mood system for dynamic backgrounds
        this._currentMood = 'default';
        this._moodTransition = 0;   // 0–1 transition progress
        this._moodDuration = 1000;   // ms for full transition
        this._targetMood = 'default';
        this._moodColors = {
            default: { inner: COLORS.backgroundAlt, outer: COLORS.background },
            boss:    { inner: '#1a0520', outer: '#0a0010' },
            danger:  { inner: '#1a0808', outer: '#0a0505' },
            combo:   { inner: '#0a1a2b', outer: '#050d1a' },
        };

        // Danger pulse
        this._dangerPulsePhase = 0;
    }

    /**
     * Initialize star field
     */
    initStars(width, height) {
        this.stars = [];
        const count = Math.floor(width * height / 4000);
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 1.5 + 0.3,
                brightness: Math.random(),
                twinkleSpeed: Math.random() * 2 + 1,
            });
        }
    }

    /**
     * Cache the radial gradient to an offscreen canvas (called on resize)
     */
    cacheGradient(width, height) {
        if (width === this._cachedWidth && height === this._cachedHeight) return;

        this._cachedWidth = width;
        this._cachedHeight = height;

        // Use OffscreenCanvas if available, fallback to regular canvas
        try {
            this._bgCanvas = new OffscreenCanvas(width, height);
        } catch {
            this._bgCanvas = document.createElement('canvas');
            this._bgCanvas.width = width;
            this._bgCanvas.height = height;
        }
        this._bgCtx = this._bgCanvas.getContext('2d');
        this._rebuildGradient();
    }

    /**
     * Rebuild the cached gradient (used on mood change too)
     */
    _rebuildGradient() {
        if (!this._bgCtx) return;
        const w = this._cachedWidth;
        const h = this._cachedHeight;
        const ctx = this._bgCtx;

        const moodColors = this._moodColors[this._currentMood] || this._moodColors.default;
        const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
        gradient.addColorStop(0, moodColors.inner);
        gradient.addColorStop(1, moodColors.outer);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
    }

    /**
     * Set mood for dynamic background
     * @param {'default'|'boss'|'danger'|'combo'} mood
     */
    setMood(mood) {
        if (mood === this._currentMood) return;
        this._currentMood = mood;
        this._rebuildGradient();
    }

    /**
     * Update background animation state
     */
    update(deltaTime) {
        this.gridOffset = (this.gridOffset + deltaTime * 0.01) % GRID_SPACING;
        this._dangerPulsePhase += deltaTime * 0.004;
    }

    /**
     * Draw the full background
     */
    draw(ctx, w, h, state, player) {
        // Cached gradient background
        if (this._bgCanvas) {
            ctx.drawImage(this._bgCanvas, 0, 0);
        } else {
            // Fallback if cache not ready
            const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
            gradient.addColorStop(0, COLORS.backgroundAlt);
            gradient.addColorStop(1, COLORS.background);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
        }

        // Grid lines
        ctx.strokeStyle = COLORS.gridLine;
        ctx.lineWidth = 0.5;
        for (let x = this.gridOffset; x < w; x += GRID_SPACING) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = this.gridOffset; y < h; y += GRID_SPACING) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Stars with twinkle
        const time = performance.now() * 0.001;
        for (const star of this.stars) {
            const twinkle = (Math.sin(time * star.twinkleSpeed + star.brightness * 10) + 1) / 2;
            ctx.fillStyle = `rgba(200, 220, 255, ${0.2 + twinkle * 0.6})`;
            ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2); ctx.fill();
        }

        // Player zone rings
        if (player && state === GAME_STATES.PLAYING) {
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(player.x, player.y, 80, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = 'rgba(255, 7, 58, 0.03)';
            ctx.beginPath(); ctx.arc(player.x, player.y, 150, 0, Math.PI * 2); ctx.stroke();
        }

        // Danger pulse overlay (when mood is 'danger')
        if (this._currentMood === 'danger') {
            const pulse = (Math.sin(this._dangerPulsePhase) + 1) / 2;
            ctx.fillStyle = `rgba(255, 7, 58, ${pulse * 0.04})`;
            ctx.fillRect(0, 0, w, h);
        }
    }

    /**
     * Draw the audio frequency visualizer at the bottom of the screen
     */
    drawAudioVisualizer(ctx, w, h, freqData) {
        if (!freqData) return;

        const barCount = 64;
        const barWidth = w / barCount;
        const maxHeight = 40;

        ctx.save();
        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor(i * (freqData.length * 0.3) / barCount);
            const value = freqData[dataIndex] / 255;
            const barHeight = value * maxHeight;
            if (barHeight < 1) continue;
            const hue = 180 + (i / barCount) * 60;
            ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${0.3 + value * 0.4})`;
            ctx.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
        }
        ctx.restore();
    }
}
