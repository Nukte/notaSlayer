// ============================================
// NoteSlayer — Particle & Projectile System
// ============================================

import { PARTICLE_LIFETIME, PARTICLE_MAX_SPEED, PARTICLE_MIN_SPEED } from '../utils/constants.js';
import { randomFloat, distance } from '../utils/helpers.js';

export class Particle {
    constructor(x, y, color, size = 3) {
        this.x = x;
        this.y = y;
        this.color = color;

        // Random velocity in a circle
        const angle = randomFloat(0, Math.PI * 2);
        const speed = randomFloat(PARTICLE_MIN_SPEED, PARTICLE_MAX_SPEED);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.size = randomFloat(size * 0.5, size * 1.5);
        this.life = PARTICLE_LIFETIME;
        this.maxLife = PARTICLE_LIFETIME;
        this.alive = true;
        this.decay = randomFloat(0.92, 0.98);
    }

    update(deltaTime) {
        if (!this.alive) return;

        this.life -= deltaTime;
        if (this.life <= 0) {
            this.alive = false;
            return;
        }

        this.x += this.vx * (deltaTime / 16);
        this.y += this.vy * (deltaTime / 16);

        this.vx *= this.decay;
        this.vy *= this.decay;

        const lifeRatio = this.life / this.maxLife;
        this.currentSize = this.size * lifeRatio;
    }

    draw(ctx) {
        if (!this.alive || this.currentSize <= 0) return;

        const lifeRatio = this.life / this.maxLife;

        ctx.save();
        ctx.globalAlpha = lifeRatio;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10 * lifeRatio;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.currentSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/**
 * Projectile — a neon bolt that travels from player to enemy
 */
export class Projectile {
    /**
     * @param {number} sx - Start X (player)
     * @param {number} sy - Start Y (player)
     * @param {object} enemy - Target enemy reference
     * @param {string} color - Neon color
     * @param {boolean} isKill - Will this kill the enemy?
     * @param {Function} onHit - Callback when projectile reaches target
     */
    constructor(sx, sy, enemy, color, isKill, onHit) {
        this.x = sx;
        this.y = sy;
        this.startX = sx;
        this.startY = sy;
        this.enemy = enemy;
        this.targetX = enemy.x;
        this.targetY = enemy.y;
        this.color = color;
        this.isKill = isKill;
        this.onHit = onHit;

        this.speed = 18; // pixels per frame-step (fast!)
        this.alive = true;
        this.radius = isKill ? 6 : 4;
        this.trail = []; // trailing positions
        this.maxTrail = 8;
        this.time = 0;
    }

    update(deltaTime) {
        if (!this.alive) return;

        this.time += deltaTime;

        // Safety: max lifetime to prevent stuck projectiles
        if (this.time > 3000) {
            this.alive = false;
            this._cleanupEnemyFlag();
            return;
        }

        // Track live enemy position
        if (this.enemy && this.enemy.alive && !this.enemy.dying) {
            this.targetX = this.enemy.x;
            this.targetY = this.enemy.y;
        } else if (this.enemy && (this.enemy.dying || !this.enemy.alive)) {
            // Enemy died before projectile arrived — clean up flag and self-destruct
            this.alive = false;
            this._cleanupEnemyFlag();
            return;
        }

        // Move toward target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.radius + 10) {
            // Reached target!
            this.alive = false;
            if (this.onHit) this.onHit();
            return;
        }

        // Normalize and move
        const step = this.speed * (deltaTime / 16);
        const nx = dx / dist;
        const ny = dy / dist;
        this.x += nx * step;
        this.y += ny * step;

        // Record trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrail) {
            this.trail.shift();
        }
    }

    /**
     * Clean up enemy's projectileIncoming flag when projectile is discarded
     */
    _cleanupEnemyFlag() {
        if (this.enemy) {
            this.enemy.projectileIncoming = false;
        }
    }

    draw(ctx) {
        if (!this.alive) return;

        ctx.save();

        // Draw trail
        if (this.trail.length > 1) {
            for (let i = 0; i < this.trail.length - 1; i++) {
                const t = this.trail[i];
                const alpha = (i / this.trail.length) * 0.5;
                const trailR = this.radius * (i / this.trail.length) * 0.6;

                ctx.globalAlpha = alpha;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(t.x, t.y, trailR, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.globalAlpha = 1;

        // Outer glow
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 20;

        // Main bolt
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Color ring
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Bright core
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

/**
 * Manages all particles and projectiles
 */
export class ParticleManager {
    constructor() {
        this.particles = [];
        this.projectiles = [];
    }

    burst(x, y, color, count = 15, size = 3) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color, size));
        }
    }

    directionalBurst(x, y, angle, spread, color, count = 8, speed = 4) {
        for (let i = 0; i < count; i++) {
            const p = new Particle(x, y, color, 2.5);
            const a = angle + randomFloat(-spread, spread);
            const s = randomFloat(speed * 0.5, speed * 1.5);
            p.vx = Math.cos(a) * s;
            p.vy = Math.sin(a) * s;
            this.particles.push(p);
        }
    }

    ring(x, y, color, count = 20, radius = 3) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const p = new Particle(x, y, color, radius);
            const speed = randomFloat(2, 5);
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            this.particles.push(p);
        }
    }

    /**
     * Fire a projectile from player to enemy
     */
    fireProjectile(sx, sy, enemy, color, isKill, onHit) {
        this.projectiles.push(new Projectile(sx, sy, enemy, color, isKill, onHit));
        // Muzzle flash at player position
        this.burst(sx, sy, color, 4, 1.5);
    }

    update(deltaTime) {
        // Update all particles
        for (const p of this.particles) p.update(deltaTime);
        // Batch remove dead particles (single filter instead of per-item splice)
        this.particles = this.particles.filter(p => p.alive);

        // Update all projectiles
        for (const p of this.projectiles) p.update(deltaTime);
        // Batch remove dead projectiles
        this.projectiles = this.projectiles.filter(p => p.alive);
    }

    draw(ctx) {
        for (const p of this.particles) p.draw(ctx);
        for (const p of this.projectiles) p.draw(ctx);
    }

    clear() {
        this.particles = [];
        this.projectiles = [];
    }

    get count() {
        return this.particles.length + this.projectiles.length;
    }
}
