// ============================================
// NoteSlayer — Particle System
// ============================================

import { PARTICLE_LIFETIME, PARTICLE_MAX_SPEED, PARTICLE_MIN_SPEED } from '../utils/constants.js';
import { randomFloat } from '../utils/helpers.js';

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
        this.decay = randomFloat(0.92, 0.98); // velocity decay
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

        // Slow down
        this.vx *= this.decay;
        this.vy *= this.decay;

        // Shrink
        const lifeRatio = this.life / this.maxLife;
        this.currentSize = this.size * lifeRatio;
    }

    draw(ctx) {
        if (!this.alive || this.currentSize <= 0) return;

        const lifeRatio = this.life / this.maxLife;
        const alpha = lifeRatio;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Glow effect
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
 * Manages all particles in the game
 */
export class ParticleManager {
    constructor() {
        this.particles = [];
    }

    /**
     * Spawn a burst of particles at a position
     */
    burst(x, y, color, count = 15, size = 3) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color, size));
        }
    }

    /**
     * Spawn a directional burst (e.g. for hit effects)
     */
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

    /**
     * Spawn ring explosion particles
     */
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

    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(deltaTime);
            if (!this.particles[i].alive) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            p.draw(ctx);
        }
    }

    clear() {
        this.particles = [];
    }

    get count() {
        return this.particles.length;
    }
}
