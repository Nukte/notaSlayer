// ============================================
// NoteSlayer — Enemy Manager
// Handles spawning, tracking, and cleanup of enemies
// ============================================

import { Enemy } from './Enemy.js';
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
     * Find the closest enemy matching a note (without applying damage).
     * Uses single-pass min-distance instead of filter+sort for O(n) performance.
     */
    findTarget(noteName, playerX, playerY) {
        let closest = null;
        let closestDist = Infinity;

        for (const e of this.enemies) {
            if (e.dying || e.projectileIncoming || !e.matchesNote(noteName)) continue;
            const d = distance(e.x, e.y, playerX, playerY);
            if (d < closestDist) {
                closest = e;
                closestDist = d;
            }
        }

        if (closest) closest.projectileIncoming = true;
        return closest;
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
        for (const enemy of this.enemies) {
            enemy.update(deltaTime, playerX, playerY);
        }
        // Batch remove dead enemies (single filter instead of per-item splice)
        this.enemies = this.enemies.filter(e => e.alive);
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
