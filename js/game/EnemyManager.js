// ============================================
// NoteSlayer — Enemy Manager
// Handles spawning, tracking, and cleanup of enemies
// ============================================

import { Enemy } from './Enemy.js';
import { ENEMY_TYPES } from '../utils/constants.js';
import { randomEdgePosition, distance, randomPick } from '../utils/helpers.js';

export class EnemyManager {
    constructor() {
        this.enemies = [];
        this.maxEnemies = 30; // Safety cap
        this.onSplitSpawn = null; // callback for Game.js to track extra spawns
    }

    /**
     * Spawn a new enemy
     * @param {object} config - { notes, type, speedMultiplier }
     */
    spawn(config, canvasWidth, canvasHeight, playerX, playerY) {
        if (this.enemies.length >= this.maxEnemies) return null;

        const spawnPos = randomEdgePosition(canvasWidth, canvasHeight, 60);

        // Support both single note and multi-note configs
        const noteOrNotes = config.notes || [config.note];

        const enemy = new Enemy(
            spawnPos.x,
            spawnPos.y,
            playerX,
            playerY,
            noteOrNotes,
            config.type,
            config.speedMultiplier
        );

        // Set splitter callback
        if (config.type.splitsOnDeath) {
            enemy.onSplit = (e) => this._spawnSplitterChildren(e, playerX, playerY);
        }

        this.enemies.push(enemy);
        return enemy;
    }

    /**
     * Spawn 2 mini enemies from a dying splitter
     */
    _spawnSplitterChildren(parent, playerX, playerY) {
        const notePool = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3'];
        const offsets = [{ x: -30, y: -15 }, { x: 30, y: 15 }];

        for (const offset of offsets) {
            const miniNote = randomPick(notePool);
            const mini = new Enemy(
                parent.x + offset.x,
                parent.y + offset.y,
                playerX,
                playerY,
                [miniNote],
                ENEMY_TYPES.SPLITTER_MINI,
                1.5
            );
            mini.spawnTimer = 200;
            mini.spawnDuration = 200;
            this.enemies.push(mini);
        }

        // Notify Game.js of extra spawns
        if (this.onSplitSpawn) {
            this.onSplitSpawn(2);
        }
    }

    /**
     * Find the closest enemy matching a note (without applying damage).
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

    get activeCount() {
        return this.enemies.filter(e => !e.dying).length;
    }

    get totalCount() {
        return this.enemies.length;
    }

    clear() {
        this.enemies = [];
    }
}
