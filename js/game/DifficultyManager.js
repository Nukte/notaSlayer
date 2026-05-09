// ============================================
// NoteSlayer — Difficulty Manager
// Handles wave progression and difficulty scaling
// ============================================

import {
    DIFFICULTY_SETTINGS,
    ENEMY_TYPES,
    ENEMIES_PER_WAVE_BASE,
    ENEMIES_PER_WAVE_INCREMENT,
    WAVE_INTRO_DURATION,
    BOSS_WAVE_INTERVAL,
    WAVE_CLEAR_BONUS,
} from '../utils/constants.js';
import { randomPick, clamp } from '../utils/helpers.js';

export class DifficultyManager {
    /**
     * @param {string} difficulty - 'EASY', 'NORMAL', or 'HARD'
     */
    constructor(difficulty = 'NORMAL') {
        this.settings = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.NORMAL;
        this.difficultyKey = difficulty;

        // Wave state
        this.wave = 0;
        this.enemiesSpawnedThisWave = 0;
        this.enemiesKilledThisWave = 0;
        this.totalEnemiesThisWave = 0;
        this.waveComplete = false;
        this.waveInProgress = false;

        // Timers
        this.spawnTimer = 0;
        this.currentSpawnInterval = this.settings.baseSpawnInterval;

        // Stats
        this.totalKills = 0;
    }

    /**
     * Start the next wave
     * @returns {object} Wave info
     */
    startNextWave() {
        this.wave++;
        this.enemiesSpawnedThisWave = 0;
        this.enemiesKilledThisWave = 0;
        this.waveComplete = false;
        this.waveInProgress = true;

        // Calculate enemies for this wave
        this.totalEnemiesThisWave = ENEMIES_PER_WAVE_BASE + (this.wave - 1) * ENEMIES_PER_WAVE_INCREMENT;

        // Boss wave gets extra boss enemies
        if (this.isBossWave()) {
            this.totalEnemiesThisWave += Math.floor(this.wave / BOSS_WAVE_INTERVAL);
        }

        // Calculate spawn interval for this wave
        this.currentSpawnInterval = Math.max(
            this.settings.minSpawnInterval,
            this.settings.baseSpawnInterval - (this.wave - 1) * this.settings.spawnDecreasePerWave
        );

        this.spawnTimer = 300; // Quick start after wave announcement

        return this.getWaveInfo();
    }

    /**
     * Get info about current wave
     */
    getWaveInfo() {
        return {
            wave: this.wave,
            totalEnemies: this.totalEnemiesThisWave,
            isBoss: this.isBossWave(),
            spawnInterval: this.currentSpawnInterval,
            speedMultiplier: this.getSpeedMultiplier(),
        };
    }

    /**
     * Get current speed multiplier based on wave
     */
    getSpeedMultiplier() {
        return clamp(
            this.settings.baseEnemySpeedMul + (this.wave - 1) * this.settings.speedIncreasePerWave,
            this.settings.baseEnemySpeedMul,
            this.settings.maxEnemySpeedMul
        );
    }

    /**
     * Is this a boss wave?
     */
    isBossWave() {
        return this.wave > 0 && this.wave % BOSS_WAVE_INTERVAL === 0;
    }

    /**
     * Get available note pool for current wave
     * Gradually introduces more notes
     */
    getNotePool() {
        const pool = this.settings.notePool;
        // Start with fewer notes and gradually increase
        const notesAvailable = Math.min(pool.length, 3 + Math.floor(this.wave * 0.8));
        return pool.slice(0, notesAvailable);
    }

    /**
     * Determine what type of enemy to spawn
     * @returns {object} Enemy type config
     */
    getEnemyType() {
        const roll = Math.random();

        // Boss wave — include boss enemies
        if (this.isBossWave() && this.enemiesSpawnedThisWave < Math.ceil(this.wave / BOSS_WAVE_INTERVAL)) {
            return ENEMY_TYPES.BOSS;
        }

        // Elite enemies after certain wave
        if (this.wave >= this.settings.eliteStartWave && roll < 0.15 + this.wave * 0.01) {
            return ENEMY_TYPES.ELITE;
        }

        // Fast enemies become more common
        if (roll < 0.3 + this.wave * 0.02) {
            return ENEMY_TYPES.FAST;
        }

        return ENEMY_TYPES.NORMAL;
    }

    /**
     * Generate enemy config for spawning
     * @returns {object} { note, type, speedMultiplier }
     */
    generateEnemy() {
        const type = this.getEnemyType();
        const notePool = this.getNotePool();
        const note = randomPick(notePool);
        const speedMul = this.getSpeedMultiplier();

        return { note, type, speedMultiplier: speedMul };
    }

    /**
     * Update spawn timer
     * @returns {boolean} true if it's time to spawn an enemy
     */
    update(deltaTime) {
        if (!this.waveInProgress || this.waveComplete) return false;

        // All enemies spawned, waiting for kills
        if (this.enemiesSpawnedThisWave >= this.totalEnemiesThisWave) {
            return false;
        }

        this.spawnTimer -= deltaTime;
        if (this.spawnTimer <= 0) {
            this.spawnTimer = this.currentSpawnInterval;
            return true; // Time to spawn!
        }

        return false;
    }

    /**
     * Record that an enemy was spawned
     */
    recordSpawn() {
        this.enemiesSpawnedThisWave++;
    }

    /**
     * Record that an enemy was killed
     * @returns {{ waveComplete: boolean, bonus: number }}
     */
    recordKill() {
        this.enemiesKilledThisWave++;
        this.totalKills++;

        // Check if wave is complete (all enemies spawned AND killed)
        if (this.enemiesKilledThisWave >= this.totalEnemiesThisWave &&
            this.enemiesSpawnedThisWave >= this.totalEnemiesThisWave) {
            this.waveComplete = true;
            this.waveInProgress = false;
            return { waveComplete: true, bonus: WAVE_CLEAR_BONUS * this.wave };
        }

        return { waveComplete: false, bonus: 0 };
    }

    /**
     * Record an enemy that reached the player (not killed)
     */
    recordEnemyReached() {
        this.enemiesKilledThisWave++; // Still counts towards wave completion
        if (this.enemiesKilledThisWave >= this.totalEnemiesThisWave &&
            this.enemiesSpawnedThisWave >= this.totalEnemiesThisWave) {
            this.waveComplete = true;
            this.waveInProgress = false;
        }
    }

    /**
     * Get current wave progress (0-1)
     */
    getProgress() {
        if (this.totalEnemiesThisWave === 0) return 0;
        return this.enemiesKilledThisWave / this.totalEnemiesThisWave;
    }

    /**
     * Reset for new game
     */
    reset() {
        this.wave = 0;
        this.enemiesSpawnedThisWave = 0;
        this.enemiesKilledThisWave = 0;
        this.totalEnemiesThisWave = 0;
        this.waveComplete = false;
        this.waveInProgress = false;
        this.spawnTimer = 0;
        this.totalKills = 0;
    }
}
