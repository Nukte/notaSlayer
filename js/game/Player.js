// ============================================
// NoteSlayer — Player Character
// ============================================

import { PLAYER_RADIUS, PLAYER_MAX_HP, PLAYER_INVULNERABILITY_TIME, COLORS } from '../utils/constants.js';
import { pulse } from '../utils/helpers.js';

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = PLAYER_RADIUS;
        this.maxHp = PLAYER_MAX_HP;
        this.hp = PLAYER_MAX_HP;

        // Visual state
        this.pulsePhase = 0;
        this.shieldAlpha = 0;
        this.shieldTimer = 0;
        this.damageFlashTimer = 0;

        // Invulnerability
        this.invulnerable = false;
        this.invulnerableTimer = 0;
        this.invulnerableBlinkPhase = 0;

        // Activity indicator (shows when note is detected)
        this.activeNote = null;
        this.activeTimer = 0;
    }

    /**
     * Take damage from an enemy
     * @returns {boolean} true if damage was applied
     */
    takeDamage() {
        if (this.invulnerable) return false;

        this.hp--;
        this.damageFlashTimer = 300; // ms
        this.invulnerable = true;
        this.invulnerableTimer = PLAYER_INVULNERABILITY_TIME;

        return true;
    }

    /**
     * Show shield effect when a note is matched
     */
    showShield(noteName) {
        this.shieldAlpha = 1;
        this.shieldTimer = 400;
        this.activeNote = noteName;
        this.activeTimer = 500;
    }

    /**
     * Check if player is alive
     */
    isAlive() {
        return this.hp > 0;
    }

    /**
     * Reset player to starting state
     */
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.hp = this.maxHp;
        this.invulnerable = false;
        this.invulnerableTimer = 0;
        this.damageFlashTimer = 0;
        this.shieldAlpha = 0;
        this.shieldTimer = 0;
        this.activeNote = null;
        this.activeTimer = 0;
    }

    update(deltaTime) {
        this.pulsePhase += deltaTime * 0.003;

        // Update invulnerability
        if (this.invulnerable) {
            this.invulnerableTimer -= deltaTime;
            this.invulnerableBlinkPhase += deltaTime * 0.015;
            if (this.invulnerableTimer <= 0) {
                this.invulnerable = false;
                this.invulnerableTimer = 0;
            }
        }

        // Update damage flash
        if (this.damageFlashTimer > 0) {
            this.damageFlashTimer -= deltaTime;
        }

        // Update shield effect
        if (this.shieldTimer > 0) {
            this.shieldTimer -= deltaTime;
            this.shieldAlpha = this.shieldTimer / 400;
        }

        // Update active note display
        if (this.activeTimer > 0) {
            this.activeTimer -= deltaTime;
            if (this.activeTimer <= 0) {
                this.activeNote = null;
            }
        }
    }

    draw(ctx) {
        ctx.save();

        // Determine visibility (blink during invulnerability)
        let visible = true;
        if (this.invulnerable) {
            visible = Math.sin(this.invulnerableBlinkPhase * 10) > 0;
        }

        if (visible) {
            const pulseVal = pulse(this.pulsePhase);
            const currentRadius = this.radius + pulseVal * 3;

            // Outer glow ring
            const glowRadius = currentRadius + 15 + pulseVal * 8;
            const gradient = ctx.createRadialGradient(
                this.x, this.y, currentRadius,
                this.x, this.y, glowRadius
            );

            const isDamaged = this.damageFlashTimer > 0;
            const coreColor = isDamaged ? COLORS.playerDamage : COLORS.playerCore;

            gradient.addColorStop(0, isDamaged ? 'rgba(255, 7, 58, 0.3)' : COLORS.playerGlow);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
            ctx.fill();

            // Shield effect
            if (this.shieldAlpha > 0) {
                ctx.strokeStyle = `rgba(0, 255, 255, ${this.shieldAlpha * 0.6})`;
                ctx.lineWidth = 3;
                ctx.shadowColor = COLORS.playerCore;
                ctx.shadowBlur = 20 * this.shieldAlpha;
                ctx.beginPath();
                ctx.arc(this.x, this.y, currentRadius + 20, 0, Math.PI * 2);
                ctx.stroke();

                // Shield hexagon pattern
                ctx.strokeStyle = `rgba(0, 255, 255, ${this.shieldAlpha * 0.3})`;
                ctx.lineWidth = 1;
                const hexRadius = currentRadius + 25;
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 + this.pulsePhase;
                    const hx = this.x + Math.cos(angle) * hexRadius;
                    const hy = this.y + Math.sin(angle) * hexRadius;
                    if (i === 0) ctx.moveTo(hx, hy);
                    else ctx.lineTo(hx, hy);
                }
                ctx.closePath();
                ctx.stroke();

                ctx.shadowBlur = 0;
            }

            // Main body (circle with inner detail)
            ctx.fillStyle = coreColor;
            ctx.shadowColor = coreColor;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
            ctx.fill();

            // Inner ring
            ctx.strokeStyle = isDamaged ? 'rgba(255, 7, 58, 0.6)' : 'rgba(0, 200, 200, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRadius * 0.6, 0, Math.PI * 2);
            ctx.stroke();

            // Center dot
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
            ctx.fill();

            // Rotating orbit dots
            ctx.shadowBlur = 5;
            for (let i = 0; i < 3; i++) {
                const orbitAngle = this.pulsePhase * 2 + (i / 3) * Math.PI * 2;
                const orbitRadius = currentRadius + 8;
                const ox = this.x + Math.cos(orbitAngle) * orbitRadius;
                const oy = this.y + Math.sin(orbitAngle) * orbitRadius;
                ctx.fillStyle = coreColor;
                ctx.beginPath();
                ctx.arc(ox, oy, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.shadowBlur = 0;

            // Active note text (shown above player when a note is matched)
            if (this.activeNote && this.activeTimer > 0) {
                const alpha = Math.min(1, this.activeTimer / 200);
                const yOffset = -currentRadius - 25 - (1 - alpha) * 20;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = COLORS.successText;
                ctx.shadowColor = COLORS.successText;
                ctx.shadowBlur = 10;
                ctx.font = 'bold 18px "Orbitron", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(this.activeNote, this.x, this.y + yOffset);
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
            }
        }

        ctx.restore();
    }
}
