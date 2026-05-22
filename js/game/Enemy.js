// ============================================
// NoteSlayer — Enemy
// ============================================

import { ENEMY_TYPES, COLORS } from '../utils/constants.js';
import { distance, angleTo } from '../utils/helpers.js';

export class Enemy {
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
        this.spawnTimer = 500;
        this.spawnDuration = 500;
        this.rotationAngle = 0; // for spinning parts

        // Warning
        this.distToPlayer = distance(x, y, targetX, targetY);
        this.dangerZone = 150;
    }

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

    matchesNote(noteName) {
        return this.note === noteName;
    }

    hasReachedPlayer(playerX, playerY, playerRadius) {
        return distance(this.x, this.y, playerX, playerY) < this.radius + playerRadius;
    }

    update(deltaTime, playerX, playerY) {
        if (this.spawnTimer > 0) this.spawnTimer -= deltaTime;

        if (this.dying) {
            this.deathTimer -= deltaTime;
            if (this.deathTimer <= 0) this.alive = false;
            return;
        }

        if (this.hitFlashTimer > 0) this.hitFlashTimer -= deltaTime;

        // Move toward player
        this.angle = angleTo(this.x, this.y, playerX, playerY);
        this.vx = Math.cos(this.angle) * this.speed;
        this.vy = Math.sin(this.angle) * this.speed;
        this.x += this.vx * (deltaTime / 16);
        this.y += this.vy * (deltaTime / 16);

        this.distToPlayer = distance(this.x, this.y, playerX, playerY);
        this.pulsePhase += deltaTime * 0.005;
        this.rotationAngle += deltaTime * 0.002;
    }

    draw(ctx) {
        if (!this.alive) return;
        ctx.save();

        // Spawn fade-in
        if (this.spawnTimer > 0) {
            ctx.globalAlpha = 1 - (this.spawnTimer / this.spawnDuration);
        }

        // Death animation
        if (this.dying) {
            const dp = 1 - (this.deathTimer / this.deathDuration);
            ctx.globalAlpha = 1 - dp;
            const scale = 1 + dp * 0.5;
            ctx.translate(this.x, this.y);
            ctx.scale(scale, scale);
            ctx.translate(-this.x, -this.y);
        }

        const flash = this.hitFlashTimer > 0;
        const color = flash ? '#ffffff' : this.type.color;
        const glow = flash ? 'rgba(255,255,255,0.6)' : this.type.glowColor;

        // Danger pulse
        const df = this.distToPlayer < this.dangerZone
            ? 1 + (1 - this.distToPlayer / this.dangerZone) * 2 : 1;
        const pv = (Math.sin(this.pulsePhase * df) + 1) / 2;

        // Draw based on type
        switch (this.type.name) {
            case 'Normal': this._drawNormal(ctx, color, glow, pv); break;
            case 'Fast':   this._drawFast(ctx, color, glow, pv); break;
            case 'Elite':  this._drawElite(ctx, color, glow, pv); break;
            case 'Boss':   this._drawBoss(ctx, color, glow, pv); break;
            default:       this._drawNormal(ctx, color, glow, pv);
        }

        // Note text
        this._drawNoteLabel(ctx, color, pv);

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // === NORMAL: Spiked creature with teeth ===
    _drawNormal(ctx, color, glow, pv) {
        const r = this.radius + pv * 2;
        const spikes = 6;
        const innerR = r * 0.65;
        const outerR = r * 1.2;

        // Glow
        this._drawGlow(ctx, glow, r + 10 + pv * 5);

        // Spiky body
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const a = (i * Math.PI) / spikes + this.rotationAngle * 0.3;
            const rad = i % 2 === 0 ? outerR : innerR;
            const px = this.x + Math.cos(a) * rad;
            const py = this.y + Math.sin(a) * rad;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Dark inner core
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, innerR * 0.75, 0, Math.PI * 2);
        ctx.fill();

        // Eye (single menacing eye)
        this._drawEye(ctx, this.x, this.y - r * 0.1, r * 0.2, color);
    }

    // === FAST: Arrow/dart shape ===
    _drawFast(ctx, color, glow, pv) {
        const r = this.radius + pv * 2;

        this._drawGlow(ctx, glow, r + 8 + pv * 4);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle); // point toward player

        // Arrow body
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(r * 1.3, 0);           // tip
        ctx.lineTo(-r * 0.6, -r * 0.7);   // top-left
        ctx.lineTo(-r * 0.2, 0);           // notch
        ctx.lineTo(-r * 0.6, r * 0.7);    // bottom-left
        ctx.closePath();
        ctx.fill();

        // Speed trail lines
        ctx.shadowBlur = 0;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        const prevAlpha = ctx.globalAlpha;
        ctx.globalAlpha *= 0.4;
        for (let i = 1; i <= 3; i++) {
            const lx = -r * (0.5 + i * 0.35);
            ctx.beginPath();
            ctx.moveTo(lx, -r * 0.15 * i);
            ctx.lineTo(lx - r * 0.3, -r * 0.15 * i);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(lx, r * 0.15 * i);
            ctx.lineTo(lx - r * 0.3, r * 0.15 * i);
            ctx.stroke();
        }
        ctx.globalAlpha = prevAlpha; // safe restore (no floating point drift)

        // Dark inner
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.moveTo(r * 0.7, 0);
        ctx.lineTo(-r * 0.3, -r * 0.35);
        ctx.lineTo(-r * 0.05, 0);
        ctx.lineTo(-r * 0.3, r * 0.35);
        ctx.closePath();
        ctx.fill();

        // Small angry eye
        this._drawEye(ctx, r * 0.15, 0, r * 0.15, color);

        ctx.restore();
    }

    // === ELITE: Shielded hexagon with orbiting segments ===
    _drawElite(ctx, color, glow, pv) {
        const r = this.radius + pv * 2;
        const sides = 6;

        this._drawGlow(ctx, glow, r + 14 + pv * 6);

        // Orbiting ring segments
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        for (let i = 0; i < 3; i++) {
            const sa = this.rotationAngle * 1.5 + (i * Math.PI * 2) / 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r + 8, sa, sa + 0.8);
            ctx.stroke();
        }

        // Hexagon body
        ctx.shadowBlur = 15;
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const a = (i * Math.PI * 2) / sides - Math.PI / 6 + this.rotationAngle * 0.2;
            const px = this.x + Math.cos(a) * r;
            const py = this.y + Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Inner hex (darker)
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const a = (i * Math.PI * 2) / sides - Math.PI / 6 + this.rotationAngle * 0.2;
            const px = this.x + Math.cos(a) * r * 0.65;
            const py = this.y + Math.sin(a) * r * 0.65;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Double eyes
        this._drawEye(ctx, this.x - r * 0.2, this.y - r * 0.05, r * 0.14, color);
        this._drawEye(ctx, this.x + r * 0.2, this.y - r * 0.05, r * 0.14, color);

        // HP ring
        if (this.maxHp > 1) this._drawHPRing(ctx, color, r + 4);
    }

    // === BOSS: Horned skull monster ===
    _drawBoss(ctx, color, glow, pv) {
        const r = this.radius + pv * 3;

        this._drawGlow(ctx, glow, r + 20 + pv * 8);

        // Rotating aura particles
        ctx.fillStyle = color;
        ctx.globalAlpha *= 0.3;
        for (let i = 0; i < 6; i++) {
            const a = this.rotationAngle * 2 + (i * Math.PI * 2) / 6;
            const d = r + 12 + Math.sin(this.pulsePhase * 2 + i) * 5;
            const px = this.x + Math.cos(a) * d;
            const py = this.y + Math.sin(a) * d;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha /= 0.3;

        // Main body - irregular jagged shape
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        const bodyPoints = 10;
        ctx.beginPath();
        for (let i = 0; i < bodyPoints; i++) {
            const a = (i * Math.PI * 2) / bodyPoints + this.rotationAngle * 0.15;
            const jag = i % 2 === 0 ? r * 1.15 : r * 0.85;
            const px = this.x + Math.cos(a) * jag;
            const py = this.y + Math.sin(a) * jag;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Two horns
        ctx.shadowBlur = 10;
        const hornLen = r * 0.6;
        for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(this.x + side * r * 0.35, this.y - r * 0.5);
            ctx.lineTo(this.x + side * r * 0.7, this.y - r * 0.5 - hornLen);
            ctx.lineTo(this.x + side * r * 0.15, this.y - r * 0.3);
            ctx.closePath();
            ctx.fill();
        }

        // Dark core
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 0.6, 0, Math.PI * 2);
        ctx.fill();

        // Angry eyes
        this._drawEye(ctx, this.x - r * 0.22, this.y - r * 0.1, r * 0.16, color);
        this._drawEye(ctx, this.x + r * 0.22, this.y - r * 0.1, r * 0.16, color);

        // Jagged mouth
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        const mouthW = r * 0.5;
        const teeth = 5;
        ctx.beginPath();
        ctx.moveTo(this.x - mouthW, this.y + r * 0.15);
        for (let i = 0; i < teeth; i++) {
            const tx = this.x - mouthW + (i + 0.5) * (mouthW * 2 / teeth);
            ctx.lineTo(tx, this.y + r * 0.15 + (i % 2 === 0 ? r * 0.15 : 0));
        }
        ctx.lineTo(this.x + mouthW, this.y + r * 0.15);
        ctx.stroke();

        // HP ring
        if (this.maxHp > 1) this._drawHPRing(ctx, color, r + 6);
    }

    // === Shared helpers ===

    _drawGlow(ctx, glowColor, glowR) {
        const gradient = ctx.createRadialGradient(
            this.x, this.y, this.radius * 0.3,
            this.x, this.y, glowR
        );
        gradient.addColorStop(0, glowColor);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, glowR, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawEye(ctx, cx, cy, size, color) {
        // White/bright eye
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI * 2);
        ctx.fill();

        // Dark pupil
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(cx - size * 0.2, cy - size * 0.2, size * 0.2, 0, Math.PI * 2);
        ctx.fill();
    }

    _drawHPRing(ctx, color, ringR) {
        const hpRatio = this.hp / this.maxHp;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(this.x, this.y, ringR,
            -Math.PI / 2,
            -Math.PI / 2 + (Math.PI * 2 * hpRatio));
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    _drawNoteLabel(ctx, color, pv) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const fontSize = Math.max(11, Math.min(18, this.radius * 0.55));
        ctx.font = `bold ${fontSize}px "Orbitron", monospace`;

        // For Fast type, draw text centered (not rotated with body)
        ctx.fillText(this.note, this.x, this.y + this.radius * 0.05);

        // Notes required dots
        if (this.notesRequired > 1) {
            ctx.shadowBlur = 0;
            const dotY = this.y + fontSize * 0.8;
            const dotSpacing = 8;
            const dotsW = (this.notesRequired - 1) * dotSpacing;
            const startX = this.x - dotsW / 2;

            for (let i = 0; i < this.notesRequired; i++) {
                ctx.fillStyle = i < this.notesHit ? '#ffffff' : 'rgba(255,255,255,0.3)';
                ctx.beginPath();
                ctx.arc(startX + i * dotSpacing, dotY, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}
