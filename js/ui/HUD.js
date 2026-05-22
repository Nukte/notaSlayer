// ============================================
// NoteSlayer — HUD (Heads-Up Display)
// Renders score, health, wave, and detected note
// ============================================

import { COLORS, PLAYER_MAX_HP, COMBO_MULTIPLIER_STEP } from '../utils/constants.js';
import { formatNumber, easeOutCubic } from '../utils/helpers.js';

export class HUD {
    constructor() {
        // Score display
        this.displayScore = 0;
        this.targetScore = 0;
        this.scoreAnimSpeed = 5;

        // Combo display
        this.combo = 0;
        this.maxCombo = 0;
        this.comboFlashTimer = 0;

        // Wave display
        this.wave = 0;
        this.waveProgress = 0;

        // Player HP
        this.hp = PLAYER_MAX_HP;

        // Detected note display
        this.detectedNote = null;
        this.detectedNoteTimer = 0;
        this.detectedNoteConfidence = 0;

        // Kill feed
        this.killFeed = []; // { text, color, timer, y }

        // Wave announcement
        this.waveAnnouncement = null; // { wave, timer, duration, isBoss }

        // Accuracy tracking
        this.accuracy = 0; // 0-100 percentage
        this.totalNotesMatched = 0;
        this.totalNotesPlayed = 0;
    }

    /**
     * Update score display
     */
    setScore(score) {
        this.targetScore = score;
    }

    /**
     * Update combo
     */
    setCombo(combo) {
        if (combo > this.combo) {
            this.comboFlashTimer = 300;
        }
        this.combo = combo;
        this.maxCombo = Math.max(this.maxCombo, combo);
    }

    /**
     * Update wave info
     */
    setWave(wave, progress = 0) {
        this.wave = wave;
        this.waveProgress = progress;
    }

    /**
     * Update player HP
     */
    setHP(hp) {
        this.hp = hp;
    }

    /**
     * Set detected note for visualization
     */
    setDetectedNote(note) {
        if (note) {
            this.detectedNote = note;
            this.detectedNoteTimer = 300;
            this.detectedNoteConfidence = Math.abs(note.cents) <= 10 ? 1 : Math.abs(note.cents) <= 25 ? 0.7 : 0.4;
        }
    }

    /**
     * Add kill notification
     */
    addKillFeed(text, color) {
        this.killFeed.push({
            text,
            color,
            timer: 1500,
            maxTimer: 1500,
            y: 0,
        });

        // Keep max 5 items
        if (this.killFeed.length > 5) {
            this.killFeed.shift();
        }
    }

    /**
     * Show wave announcement
     */
    showWaveAnnouncement(wave, isBoss = false) {
        this.waveAnnouncement = {
            wave,
            isBoss,
            timer: 2500,
            duration: 2500,
        };
    }

    update(deltaTime) {
        // Animate score counting
        if (this.displayScore < this.targetScore) {
            const diff = this.targetScore - this.displayScore;
            this.displayScore += Math.max(1, Math.ceil(diff * 0.1));
            if (this.displayScore > this.targetScore) {
                this.displayScore = this.targetScore;
            }
        }

        // Combo flash
        if (this.comboFlashTimer > 0) {
            this.comboFlashTimer -= deltaTime;
        }

        // Detected note timer
        if (this.detectedNoteTimer > 0) {
            this.detectedNoteTimer -= deltaTime;
        }

        // Kill feed
        for (let i = this.killFeed.length - 1; i >= 0; i--) {
            this.killFeed[i].timer -= deltaTime;
            if (this.killFeed[i].timer <= 0) {
                this.killFeed.splice(i, 1);
            }
        }

        // Wave announcement
        if (this.waveAnnouncement) {
            this.waveAnnouncement.timer -= deltaTime;
            if (this.waveAnnouncement.timer <= 0) {
                this.waveAnnouncement = null;
            }
        }
    }

    draw(ctx, canvasWidth, canvasHeight) {
        ctx.save();

        // --- Score (top-right) ---
        this._drawScore(ctx, canvasWidth);

        // --- Wave info (top-center) ---
        this._drawWaveInfo(ctx, canvasWidth);

        // --- Health (top-left) ---
        this._drawHealth(ctx);

        // --- Combo (below score) ---
        this._drawCombo(ctx, canvasWidth);

        // --- Detected note (bottom-center) ---
        this._drawDetectedNote(ctx, canvasWidth, canvasHeight);

        // --- Kill feed (right side) ---
        this._drawKillFeed(ctx, canvasWidth, canvasHeight);

        // --- Accuracy (bottom-left) ---
        this._drawAccuracy(ctx, canvasHeight);

        // --- Wave announcement (center) ---
        this._drawWaveAnnouncement(ctx, canvasWidth, canvasHeight);

        ctx.restore();
    }

    _drawScore(ctx, canvasWidth) {
        const x = canvasWidth - 30;
        const y = 40;

        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';

        // Score label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '12px "Orbitron", monospace';
        ctx.fillText('SKOR', x, y - 15);

        // Score value
        ctx.fillStyle = COLORS.hudAccent;
        ctx.shadowColor = COLORS.hudAccent;
        ctx.shadowBlur = 8;
        ctx.font = 'bold 28px "Orbitron", monospace';
        ctx.fillText(formatNumber(this.displayScore), x, y);
        ctx.shadowBlur = 0;
    }

    _drawWaveInfo(ctx, canvasWidth) {
        const x = canvasWidth / 2;
        const y = 30;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Wave label
        ctx.fillStyle = COLORS.waveText;
        ctx.shadowColor = COLORS.waveText;
        ctx.shadowBlur = 6;
        ctx.font = 'bold 16px "Orbitron", monospace';
        ctx.fillText(`DALGA ${this.wave}`, x, y);
        ctx.shadowBlur = 0;

        // Progress bar
        const barWidth = 120;
        const barHeight = 4;
        const barX = x - barWidth / 2;
        const barY = y + 24;

        // Background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Progress
        ctx.fillStyle = COLORS.waveText;
        ctx.shadowColor = COLORS.waveText;
        ctx.shadowBlur = 4;
        ctx.fillRect(barX, barY, barWidth * this.waveProgress, barHeight);
        ctx.shadowBlur = 0;
    }

    _drawHealth(ctx) {
        const startX = 30;
        const y = 35;
        const heartSize = 18;
        const spacing = 28;

        for (let i = 0; i < PLAYER_MAX_HP; i++) {
            const x = startX + i * spacing;
            const filled = i < this.hp;

            ctx.save();

            if (filled) {
                ctx.fillStyle = '#ff073a';
                ctx.shadowColor = '#ff073a';
                ctx.shadowBlur = 10;
            } else {
                ctx.fillStyle = 'rgba(255, 7, 58, 0.2)';
                ctx.shadowBlur = 0;
            }

            // Draw heart shape
            this._drawHeart(ctx, x, y, heartSize);

            ctx.restore();
        }
    }

    _drawHeart(ctx, x, y, size) {
        const s = size / 2;
        ctx.beginPath();
        ctx.moveTo(x, y + s * 0.4);
        ctx.bezierCurveTo(x, y - s * 0.3, x - s, y - s * 0.7, x - s, y);
        ctx.bezierCurveTo(x - s, y + s * 0.5, x, y + s * 0.9, x, y + s);
        ctx.bezierCurveTo(x, y + s * 0.9, x + s, y + s * 0.5, x + s, y);
        ctx.bezierCurveTo(x + s, y - s * 0.7, x, y - s * 0.3, x, y + s * 0.4);
        ctx.fill();
    }

    _drawCombo(ctx, canvasWidth) {
        if (this.combo <= 1) return;

        const x = canvasWidth - 30;
        const y = 85;

        const isFlashing = this.comboFlashTimer > 0;
        const multiplier = 1 + Math.floor(this.combo / COMBO_MULTIPLIER_STEP);

        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';

        // Combo count
        const flash = isFlashing ? 1.2 : 1;
        ctx.fillStyle = isFlashing ? '#ffffff' : COLORS.comboText;
        ctx.shadowColor = COLORS.comboText;
        ctx.shadowBlur = isFlashing ? 15 : 6;
        ctx.font = `bold ${20 * flash}px "Orbitron", monospace`;
        ctx.fillText(`${this.combo}x COMBO`, x, y);

        // Multiplier
        if (multiplier > 1) {
            ctx.fillStyle = COLORS.successText;
            ctx.shadowColor = COLORS.successText;
            ctx.shadowBlur = 4;
            ctx.font = '12px "Orbitron", monospace';
            ctx.fillText(`×${multiplier} ÇARPAN`, x, y + 26);
        }

        ctx.shadowBlur = 0;
    }

    _drawDetectedNote(ctx, canvasWidth, canvasHeight) {
        const x = canvasWidth / 2;
        const y = canvasHeight - 50;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        if (this.detectedNote && this.detectedNoteTimer > 0) {
            const alpha = Math.min(1, this.detectedNoteTimer / 100);

            // Note name
            ctx.fillStyle = COLORS.noteDetected;
            ctx.globalAlpha = alpha;
            ctx.shadowColor = COLORS.noteDetected;
            ctx.shadowBlur = 12;
            ctx.font = 'bold 32px "Orbitron", monospace';
            ctx.fillText(this.detectedNote.name, x, y);

            // Accuracy indicator (cents)
            const cents = this.detectedNote.cents;
            const accColor = Math.abs(cents) <= 10 ? COLORS.successText
                           : Math.abs(cents) <= 25 ? COLORS.comboText
                           : COLORS.dangerText;
            ctx.fillStyle = accColor;
            ctx.shadowColor = accColor;
            ctx.shadowBlur = 4;
            ctx.font = '12px "Orbitron", monospace';
            const centsText = cents === 0 ? 'MÜKEMMEL' : `${cents > 0 ? '+' : ''}${cents}¢`;
            ctx.fillText(centsText, x, y + 18);

            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
        } else {
            // Show "play a note" hint
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.font = '14px "Orbitron", monospace';
            ctx.fillText('♪ Nota çal ♪', x, y);
        }
    }

    _drawKillFeed(ctx, canvasWidth, canvasHeight) {
        if (this.killFeed.length === 0) return;

        const x = canvasWidth - 30;
        let y = canvasHeight / 2;

        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let i = this.killFeed.length - 1; i >= 0; i--) {
            const item = this.killFeed[i];
            const alpha = Math.min(1, item.timer / 300);
            const yOffset = (1 - item.timer / item.maxTimer) * -30;

            ctx.globalAlpha = alpha;
            ctx.fillStyle = item.color;
            ctx.shadowColor = item.color;
            ctx.shadowBlur = 4;
            ctx.font = 'bold 14px "Orbitron", monospace';
            ctx.fillText(item.text, x, y + yOffset);

            y -= 24;
        }

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    _drawWaveAnnouncement(ctx, canvasWidth, canvasHeight) {
        if (!this.waveAnnouncement) return;

        const { wave, isBoss, timer, duration } = this.waveAnnouncement;
        const progress = 1 - timer / duration;

        // Fade in then fade out
        let alpha;
        if (progress < 0.2) {
            alpha = easeOutCubic(progress / 0.2);
        } else if (progress > 0.7) {
            alpha = 1 - easeOutCubic((progress - 0.7) / 0.3);
        } else {
            alpha = 1;
        }

        const x = canvasWidth / 2;
        const y = canvasHeight / 2;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (isBoss) {
            // Boss wave announcement
            ctx.fillStyle = COLORS.enemyBoss;
            ctx.shadowColor = COLORS.enemyBoss;
            ctx.shadowBlur = 30;
            ctx.font = 'bold 52px "Orbitron", monospace';
            ctx.fillText('⚠ BOSS DALGA ⚠', x, y - 20);

            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.font = 'bold 28px "Orbitron", monospace';
            ctx.fillText(`DALGA ${wave}`, x, y + 30);
        } else {
            // Normal wave announcement
            ctx.fillStyle = COLORS.waveText;
            ctx.shadowColor = COLORS.waveGlow;
            ctx.shadowBlur = 25;
            ctx.font = 'bold 48px "Orbitron", monospace';
            ctx.fillText(`DALGA ${wave}`, x, y - 10);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.shadowBlur = 0;
            ctx.font = '16px "Orbitron", monospace';
            ctx.fillText('HAZIR OL!', x, y + 30);
        }

        ctx.restore();
    }

    /**
     * Set accuracy stats
     */
    setAccuracy(matched, total) {
        this.totalNotesMatched = matched;
        this.totalNotesPlayed = total;
        this.accuracy = total > 0 ? Math.round((matched / total) * 100) : 0;
    }

    _drawAccuracy(ctx, canvasHeight) {
        if (this.totalNotesPlayed === 0) return;

        const x = 30;
        const y = canvasHeight - 30;

        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';

        // Accuracy label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.font = '11px "Orbitron", monospace';
        ctx.fillText('İSABET', x, y - 16);

        // Percentage
        const accColor = this.accuracy >= 80 ? COLORS.successText
                       : this.accuracy >= 50 ? COLORS.comboText
                       : COLORS.dangerText;
        ctx.fillStyle = accColor;
        ctx.shadowColor = accColor;
        ctx.shadowBlur = 4;
        ctx.font = 'bold 16px "Orbitron", monospace';
        ctx.fillText(`${this.accuracy}%`, x, y);
        ctx.shadowBlur = 0;
    }

    reset() {
        this.displayScore = 0;
        this.targetScore = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.comboFlashTimer = 0;
        this.wave = 0;
        this.waveProgress = 0;
        this.hp = PLAYER_MAX_HP;
        this.detectedNote = null;
        this.detectedNoteTimer = 0;
        this.killFeed = [];
        this.waveAnnouncement = null;
        this.accuracy = 0;
        this.totalNotesMatched = 0;
        this.totalNotesPlayed = 0;
    }
}
