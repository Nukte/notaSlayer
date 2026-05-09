// ============================================
// NoteSlayer — Enemy Manager
// Handles spawning, tracking, and cleanup of enemies
// ============================================

import { Enemy } from './Enemy.js';
import { PARTICLE_COUNT_ON_KILL, SCREEN_SHAKE_KILL, SCREEN_SHAKE_DAMAGE, COLORS } from '../utils/constants.js';
import { randomEdgePosition, distance } from '../utils/helpers.js';

export class EnemyManager {
    constructor() {
        this.enemies = [];
        this.maxEnemies = 30; // Safety cap
    }

    /**
     * Spawn a new enemy
     * @param {object} config - { note, type, speedMultiplier }
     * @param {number} canvasWidth
     * @param {number} canvasHeight
     * @param {number} playerX
     * @param {number} playerY
     */
    spawn(config, canvasWidth, canvasHeight, playerX, playerY) {
        if (this.enemies.length >= this.maxEnemies) return null;

        // Get random position on screen edge
        const spawnPos = randomEdgePosition(canvasWidth, canvasHeight, 60);

        const enemy = new Enemy(
            spawnPos.x,
            spawnPos.y,
            playerX,
            playerY,
            config.note,
            config.type,
            config.speedMultiplier
        );

        this.enemies.push(enemy);
        return enemy;
    }

    /**
     * Try to match a detected note against active enemies.
     * Returns the best matching enemy (closest to player).
     * @param {string} noteName - e.g. "E4"
     * @param {number} playerX
     * @param {number} playerY
     * @returns {{ enemy: Enemy, killed: boolean } | null}
     */
    matchNote(noteName, playerX, playerY) {
        // Find all enemies that match this note
        const matching = this.enemies.filter(e =>
            !e.dying && e.matchesNote(noteName)
        );

        if (matching.length === 0) return null;

        // Prioritize closest enemy to player
        matching.sort((a, b) => {
            const distA = distance(a.x, a.y, playerX, playerY);
            const distB = distance(b.x, b.y, playerX, playerY);
            return distA - distB;
        });

        const target = matching[0];
        const killed = target.hit();

        return { enemy: target, killed };
    }

    /**
     * Check for enemies that have reached the player
     * @returns {Enemy[]} Enemies that collided with the player
     */
    checkPlayerCollisions(playerX, playerY, playerRadius) {
        const colliding = [];
        for (const enemy of this.enemies) {
            if (!enemy.dying && enemy.hasReachedPlayer(playerX, playerY, playerRadius)) {
                colliding.push(enemy);
                enemy.dying = true;
                enemy.deathTimer = 200;
            }
        }
        return colliding;
    }

    /**
     * Update all enemies
     */
    update(deltaTime, playerX, playerY) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(deltaTime, playerX, playerY);

            // Remove dead enemies
            if (!enemy.alive) {
                this.enemies.splice(i, 1);
            }
        }
    }

    /**
     * Draw all enemies
     */
    draw(ctx) {
        for (const enemy of this.enemies) {
            enemy.draw(ctx);
        }
    }

    /**
     * Get count of active (non-dying) enemies
     */
    get activeCount() {
        return this.enemies.filter(e => !e.dying).length;
    }

    /**
     * Get total count including dying
     */
    get totalCount() {
        return this.enemies.length;
    }

    /**
     * Clear all enemies
     */
    clear() {
        this.enemies = [];
    }
}
