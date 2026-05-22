// ============================================
// NoteSlayer — Enemy
// ============================================

import { ENEMY_TYPES, COLORS } from '../utils/constants.js';
import { distance, angleTo } from '../utils/helpers.js';

export class Enemy {
    constructor(x, y, targetX, targetY, noteOrNotes, typeConfig, speedMultiplier = 1) {
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.type = typeConfig;

        // --- Multi-note system ---
        const notesArray = Array.isArray(noteOrNotes) ? noteOrNotes : [noteOrNotes];
        this.notes = [...notesArray];
        this.note = this.notes[0]; // backward compat / display
        this.notesRemaining = new Set(this.notes);

        // Sequential notes (Sequence type)
        this.isSequential = typeConfig.isSequential || false;
        this.noteSequence = [...this.notes];
        this.currentSequenceIndex = 0;

        // Movement
        this.angle = angleTo(x, y, targetX, targetY);
        this.baseSpeed = typeConfig.baseSpeed * speedMultiplier;
        this.speed = this.baseSpeed;
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
        this.rotationAngle = 0;

        // Warning
        this.distToPlayer = distance(x, y, targetX, targetY);
        this.dangerZone = 150;

        // --- Dodger ---
        this.canDodge = typeConfig.canDodge || false;
        this.isDodging = false;
        this.dodgeCooldown = 0;
        this.dodgeDuration = 300;
        this.dodgeTimer = 0;
        this.dodgeDir = 1;

        // --- Splitter ---
        this.splitsOnDeath = typeConfig.splitsOnDeath || false;
        this.onSplit = null; // callback set by EnemyManager

        // Projectile tracking
        this.projectileIncoming = false;
    }

    /**
     * Apply a hit from a matching note
     */
    hit(noteName) {
        this.hitFlashTimer = 150;

        if (this.isSequential) {
            // Sequence: advance to next note
            this.currentSequenceIndex++;
            this.hp--;
        } else if (this.notesRemaining.size > 0 && noteName) {
            // Multi-note: remove the matched note
            this.notesRemaining.delete(noteName);
            this.hp--;
        } else {
            // Classic single-note
            this.notesHit++;
            if (this.notesHit >= this.notesRequired) {
                this.hp--;
                this.notesHit = 0;
            }
        }

        if (this.hp <= 0) {
            this.dying = true;
            this.deathTimer = this.deathDuration;
            // Splitter callback
            if (this.splitsOnDeath && this.onSplit) {
                this.onSplit(this);
            }
            return true;
        }
        return false;
    }

    /**
     * Check if this enemy can be hit by a given note
     */
    matchesNote(noteName) {
        if (this.isSequential) {
            return this.noteSequence[this.currentSequenceIndex] === noteName;
        }
        if (this.notesRemaining.size > 0 && this.notes.length > 1) {
            return this.notesRemaining.has(noteName);
        }
        return this.notes[0] === noteName;
    }

    /**
     * Get the display text for this enemy's note label
     */
    get displayNote() {
        if (this.isSequential) {
            return this.noteSequence[this.currentSequenceIndex] || '?';
        }
        if (this.notesRemaining.size > 1) {
            return [...this.notesRemaining].join('/');
        }
        if (this.notesRemaining.size === 1) {
            return [...this.notesRemaining][0];
        }
        return this.notes[0];
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

        // Dodge cooldown
        if (this.dodgeCooldown > 0) this.dodgeCooldown -= deltaTime;

        // --- Dodger behavior ---
        if (this.canDodge && this.projectileIncoming && !this.isDodging && this.dodgeCooldown <= 0) {
            this.isDodging = true;
            this.dodgeTimer = this.dodgeDuration;
            this.dodgeDir = Math.random() > 0.5 ? 1 : -1;
            this.dodgeCooldown = 800; // can't dodge again for 800ms
        }

        if (this.isDodging) {
            this.dodgeTimer -= deltaTime;
            // Move perpendicular to player direction
            const perpAngle = this.angle + (Math.PI / 2) * this.dodgeDir;
            this.x += Math.cos(perpAngle) * this.baseSpeed * 4 * (deltaTime / 16);
            this.y += Math.sin(perpAngle) * this.baseSpeed * 4 * (deltaTime / 16);
            if (this.dodgeTimer <= 0) {
                this.isDodging = false;
            }
            // Still update angle and distance
            this.angle = angleTo(this.x, this.y, playerX, playerY);
            this.distToPlayer = distance(this.x, this.y, playerX, playerY);
            this.pulsePhase += deltaTime * 0.005;
            this.rotationAngle += deltaTime * 0.002;
            return;
        }

        // Normal movement toward player
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
            case 'Normal':       this._drawNormal(ctx, color, glow, pv); break;
            case 'Fast':         this._drawFast(ctx, color, glow, pv); break;
            case 'Elite':        this._drawElite(ctx, color, glow, pv); break;
            case 'Boss':         this._drawBoss(ctx, color, glow, pv); break;
            case 'Dual':         this._drawDual(ctx, color, glow, pv); break;
            case 'Sequence':     this._drawSequence(ctx, color, glow, pv); break;
            case 'Dodger':       this._drawDodger(ctx, color, glow, pv); break;
            case 'Splitter':     this._drawSplitter(ctx, color, glow, pv); break;
            case 'SplitterMini': this._drawNormal(ctx, color, glow, pv); break;
            default:             this._drawNormal(ctx, color, glow, pv);
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
        const prevAlphaBoss = ctx.globalAlpha;
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
        ctx.globalAlpha = prevAlphaBoss;

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

        // Use displayNote for multi-note aware label
        ctx.fillText(this.displayNote, this.x, this.y + this.radius * 0.05);

        // HP dots for multi-hp enemies
        if (this.maxHp > 1) {
            ctx.shadowBlur = 0;
            const dotY = this.y + fontSize * 0.8;
            const dotSpacing = 8;
            const totalDots = this.maxHp;
            const dotsW = (totalDots - 1) * dotSpacing;
            const startX = this.x - dotsW / 2;

            for (let i = 0; i < totalDots; i++) {
                ctx.fillStyle = i < this.hp ? '#ffffff' : 'rgba(255,255,255,0.2)';
                ctx.beginPath();
                ctx.arc(startX + i * dotSpacing, dotY, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // === DUAL: Split circle, two halves ===
    _drawDual(ctx, color, glow, pv) {
        const r = this.radius + pv * 2;
        this._drawGlow(ctx, glow, r + 10 + pv * 5);

        const notes = this.notes;
        const remaining = this.notesRemaining;

        // Left half
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, Math.PI * 0.5, Math.PI * 1.5);
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = remaining.has(notes[0]) ? color : 'rgba(255,255,255,0.1)';
        ctx.shadowColor = color;
        ctx.shadowBlur = remaining.has(notes[0]) ? 15 : 0;
        ctx.fillRect(this.x - r - 2, this.y - r - 2, r + 2, r * 2 + 4);
        ctx.restore();

        // Right half
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, -Math.PI * 0.5, Math.PI * 0.5);
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = remaining.has(notes[1]) ? color : 'rgba(255,255,255,0.1)';
        ctx.shadowColor = color;
        ctx.shadowBlur = remaining.has(notes[1]) ? 15 : 0;
        ctx.fillRect(this.x, this.y - r - 2, r + 2, r * 2 + 4);
        ctx.restore();

        // Divider line
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - r);
        ctx.lineTo(this.x, this.y + r);
        ctx.stroke();

        // Dark inner core
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
    }

    // === SEQUENCE: Chained circles ===
    _drawSequence(ctx, color, glow, pv) {
        const r = this.radius * 0.6 + pv;
        const spacing = this.radius * 1.2;
        const activeIdx = this.currentSequenceIndex;

        this._drawGlow(ctx, glow, this.radius + 12 + pv * 5);

        for (let i = 0; i < this.noteSequence.length; i++) {
            const cx = this.x + (i - 0.5) * spacing;
            const cy = this.y;
            const isActive = i === activeIdx;
            const isDone = i < activeIdx;
            const circR = isActive ? r * 1.15 : r * 0.85;

            // Chain link
            if (i > 0) {
                const prevAlpha = ctx.globalAlpha;
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.globalAlpha *= 0.5;
                ctx.beginPath();
                ctx.moveTo(cx - spacing + circR, cy);
                ctx.lineTo(cx - circR, cy);
                ctx.stroke();
                ctx.globalAlpha = prevAlpha;
            }

            // Circle
            const prevAlpha2 = ctx.globalAlpha;
            ctx.fillStyle = isDone ? 'rgba(255,255,255,0.15)' : color;
            ctx.shadowColor = isActive ? color : 'transparent';
            ctx.shadowBlur = isActive ? 15 : 0;
            ctx.globalAlpha *= isDone ? 0.3 : (isActive ? 1 : 0.5);
            ctx.beginPath();
            ctx.arc(cx, cy, circR, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = prevAlpha2;

            // Note label inside
            if (!isDone) {
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 0;
                ctx.font = `bold ${isActive ? 13 : 10}px "Orbitron", monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(this.noteSequence[i], cx, cy);
            }
        }
    }

    // === DODGER: Semi-transparent triangle ===
    _drawDodger(ctx, color, glow, pv) {
        const r = this.radius + pv * 2;
        this._drawGlow(ctx, glow, r + 8 + pv * 4);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Afterimage when dodging
        if (this.isDodging) {
            const prevA = ctx.globalAlpha;
            ctx.globalAlpha *= 0.2;
            ctx.fillStyle = color;
            for (let i = 1; i <= 3; i++) {
                const offset = -i * 8;
                ctx.beginPath();
                ctx.moveTo(r + offset, 0);
                ctx.lineTo(-r * 0.5 + offset, -r * 0.6);
                ctx.lineTo(-r * 0.5 + offset, r * 0.6);
                ctx.closePath();
                ctx.fill();
            }
            ctx.globalAlpha = prevA;
        }

        // Main body — triangle
        const prevAlpha = ctx.globalAlpha;
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.globalAlpha *= this.isDodging ? 0.6 : 0.75;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(-r * 0.5, -r * 0.7);
        ctx.lineTo(-r * 0.5, r * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = prevAlpha;

        // Shimmer dashed ring
        const prevAlpha2 = ctx.globalAlpha;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha *= 0.4;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = prevAlpha2;

        ctx.restore();
    }

    // === SPLITTER: Cracked sphere ===
    _drawSplitter(ctx, color, glow, pv) {
        const r = this.radius + pv * 2;
        this._drawGlow(ctx, glow, r + 12 + pv * 5);

        // Main body
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Dark inner
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, r * 0.65, 0, Math.PI * 2);
        ctx.fill();

        // Crack line
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(this.x - 2, this.y - r * 0.8);
        ctx.lineTo(this.x + 3, this.y - r * 0.2);
        ctx.lineTo(this.x - 4, this.y + r * 0.3);
        ctx.lineTo(this.x + 2, this.y + r * 0.8);
        ctx.stroke();

        // Crack branches
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.x + 3, this.y - r * 0.2);
        ctx.lineTo(this.x + r * 0.4, this.y - r * 0.1);
        ctx.stroke();

        // Eye
        this._drawEye(ctx, this.x, this.y - r * 0.1, r * 0.18, color);
    }
}
