// ============================================
// NoteSlayer — Enemy
// ============================================

import { ENEMY_TYPES, COLORS } from '../utils/constants.js';
import { distance, angleTo } from '../utils/helpers.js';

export class Enemy {
    /**
     * @param {number} x - Spawn X position
     * @param {number} y - Spawn Y position
     * @param {number} targetX - Target X (player position)
     * @param {number} targetY - Target Y (player position)
     * @param {string} note - Required note to kill (e.g. "E4")
     * @param {object} typeConfig - Enemy type config from ENEMY_TYPES
     * @param {number} speedMultiplier - Speed modifier from difficulty
     */
    constructor(x, y, targetX, targetY, note, typeConfig, speedMultiplier = 1) {
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.note = note;
        this.type = typeConfig;

        // Movement
        this.angle = angleTo(x, y, targetX, targetY);
        this.speed = typeConfig.baseSpeed * speedMultiplier;
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;

        // Stats
        this.radius = typeConfig.radius;
        this.hp = typeConfig.hp;
        this.maxHp = typeConfig.hp;
        this.points = typeConfig.points;
        this.notesRequired = typeConfig.notesRequired;
        this.notesHit = 0;

        // Visual state
        this.alive = true;
        this.dying = false;
        this.deathTimer = 0;
        this.deathDuration = 300;
        this.hitFlashTimer = 0;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.spawnTimer = 500; // fade-in time
        this.spawnDuration = 500;

        // Warning (when close to player)
        this.distToPlayer = distance(x, y, targetX, targetY);
        this.dangerZone = 150; // starts flashing faster when this close
    }

    /**
     * Apply a note hit
     * @returns {boolean} true if enemy is killed
     */
    hit() {
        this.notesHit++;
        this.hitFlashTimer = 150;

        if (this.notesHit >= this.notesRequired) {
            this.hp--;
            this.notesHit = 0;
        }

        if (this.hp <= 0) {
            this.dying = true;
            this.deathTimer = this.deathDuration;
            return true;
        }
        return false;
    }

    /**
     * Check if this enemy requires the given note
     */
    matchesNote(noteName) {
        return this.note === noteName;
    }

    /**
     * Check if enemy has reached the player
     */
    hasReachedPlayer(playerX, playerY, playerRadius) {
        return distance(this.x, this.y, playerX, playerY) < this.radius + playerRadius;
    }

    update(deltaTime, playerX, playerY) {
        // Spawn animation
        if (this.spawnTimer > 0) {
            this.spawnTimer -= deltaTime;
        }

        // Death animation
        if (this.dying) {
            this.deathTimer -= deltaTime;
            if (this.deathTimer <= 0) {
                this.alive = false;
            }
            return;
        }

        // Hit flash
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= deltaTime;
        }

        // Move toward player
        this.angle = angleTo(this.x, this.y, playerX, playerY);
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;

        this.x += this.vx * (deltaTime / 16);
        this.y += this.vy * (deltaTime / 16);

        // Update distance
        this.distToPlayer = distance(this.x, this.y, playerX, playerY);

        // Pulse animation
        this.pulsePhase += deltaTime * 0.005;
    }

    draw(ctx) {
        if (!this.alive) return;

        ctx.save();

        // Spawn fade-in
        let spawnAlpha = 1;
        if (this.spawnTimer > 0) {
            spawnAlpha = 1 - (this.spawnTimer / this.spawnDuration);
            ctx.globalAlpha = spawnAlpha;
        }

        // Death animation
        if (this.dying) {
            const deathProgress = 1 - (this.deathTimer / this.deathDuration);
            ctx.globalAlpha = 1 - deathProgress;
            const scale = 1 + deathProgress * 0.5;
            ctx.translate(this.x, this.y);
            ctx.scale(scale, scale);
            ctx.translate(-this.x, -this.y);
        }

        const isFlashing = this.hitFlashTimer > 0;
        const color = isFlashing ? '#ffffff' : this.type.color;
        const glowColor = isFlashing ? 'rgba(255,255,255,0.6)' : this.type.glowColor;

        // Danger pulse (faster when close to player)
        const dangerFactor = this.distToPlayer < this.dangerZone
            ? 1 + (1 - this.distToPlayer / this.dangerZone) * 2
            : 1;
        const pulseVal = (Math.sin(this.pulsePhase * dangerFactor) + 1) / 2;
        const currentRadius = this.radius + pulseVal * 3;

        // Outer glow
        const glowRadius = currentRadius + 12 + pulseVal * 6;
        const gradient = ctx.createRadialGradient(
            this.x, this.y, currentRadius * 0.5,
            this.x, this.y, glowRadius
        );
        gradient.addColorStop(0, glowColor);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Main body
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        // Inner darker circle
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentRadius * 0.7, 0, Math.PI * 2);
        ctx.fill();

        // HP indicator for multi-hit enemies
        if (this.maxHp > 1) {
            const hpRatio = this.hp / this.maxHp;
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, currentRadius + 5,
                -Math.PI / 2,
                -Math.PI / 2 + (Math.PI * 2 * hpRatio));
            ctx.stroke();
        }

        // Note text on enemy
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Adjust font size based on enemy size
        const fontSize = Math.max(11, Math.min(18, currentRadius * 0.6));
        ctx.font = `bold ${fontSize}px "Orbitron", monospace`;
        ctx.fillText(this.note, this.x, this.y);

        // Notes required indicator (small dots under note text)
        if (this.notesRequired > 1) {
            const dotY = this.y + fontSize * 0.7;
            const dotSpacing = 8;
            const dotsWidth = (this.notesRequired - 1) * dotSpacing;
            const startX = this.x - dotsWidth / 2;

            for (let i = 0; i < this.notesRequired; i++) {
                const filled = i < this.notesHit;
                ctx.fillStyle = filled ? '#ffffff' : 'rgba(255, 255, 255, 0.3)';
                ctx.beginPath();
                ctx.arc(startX + i * dotSpacing, dotY, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}
