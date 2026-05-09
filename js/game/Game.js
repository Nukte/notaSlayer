// ============================================
// NoteSlayer — Main Game Controller
// ============================================

import { GAME_STATES, COLORS, GRID_SPACING, COMBO_TIMEOUT, COMBO_MULTIPLIER_STEP,
         PARTICLE_COUNT_ON_KILL, PARTICLE_COUNT_ON_HIT, SCREEN_SHAKE_KILL,
         SCREEN_SHAKE_DAMAGE, SCREEN_SHAKE_DURATION, WAVE_INTRO_DURATION,
         NOTE_MATCH_COOLDOWN } from '../utils/constants.js';
import { clamp, pulse } from '../utils/helpers.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { Player } from './Player.js';
import { EnemyManager } from './EnemyManager.js';
import { DifficultyManager } from './DifficultyManager.js';
import { ParticleManager } from './Particle.js';
import { HUD } from '../ui/HUD.js';
import { Menu } from '../ui/Menu.js';
import { GameOver } from '../ui/GameOver.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Game state
        this.state = GAME_STATES.MENU;
        this.running = false;
        this.lastTimestamp = 0;

        // Core systems
        this.audioEngine = new AudioEngine();
        this.player = null;
        this.enemyManager = new EnemyManager();
        this.difficultyManager = null;
        this.particleManager = new ParticleManager();

        // UI systems
        this.hud = new HUD();
        this.menu = new Menu();
        this.gameOver = new GameOver();

        // Game stats
        this.score = 0;
        this.combo = 0;
        this.lastKillTime = 0;
        this.totalKills = 0;
        this.totalNotesPlayed = 0;
        this.totalNotesMatched = 0;

        // Note match cooldown - prevents same note matching twice from harmonics
        this.noteMatchCooldowns = new Map(); // noteName -> lastMatchTimestamp

        // Screen shake
        this.shakeAmount = 0;
        this.shakeTimer = 0;
        this.shakeX = 0;
        this.shakeY = 0;

        // Wave intro timer
        this.waveIntroTimer = 0;

        // Background animation
        this.bgStars = [];
        this.bgGridOffset = 0;

        // Tuning mode
        this.tuningActive = false;

        // Setup
        this._initStars();
        this._setupCallbacks();
        this._handleResize();
        window.addEventListener('resize', () => this._handleResize());

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.tuningActive) {
                    this._closeTuner();
                } else if (this.state === GAME_STATES.PLAYING) {
                    this.state = GAME_STATES.PAUSED;
                    this.audioEngine.stop();
                    this._showPauseOverlay();
                } else if (this.state === GAME_STATES.PAUSED) {
                    this._resumeGame();
                }
            }
        });
    }

    /**
     * Setup menu and game over callbacks
     */
    _setupCallbacks() {
        // Menu → Start game (now also handles audio init)
        this.menu.onStartGame = async (difficulty, instrument) => {
            await this._ensureAudio();
            if (this.audioEngine.isInitialized) {
                this._startGame(difficulty);
            }
        };

        // Menu → Calibration requested
        this.menu.onRequestCalibration = async () => {
            await this._ensureAudio();
        };

        // Menu → Tuning requested
        this.menu.onTuningRequested = async () => {
            await this._ensureAudio();
            if (this.audioEngine.isInitialized) {
                this._openTuner();
            }
        };

        // Game Over → Play again
        this.gameOver.onPlayAgain = () => {
            this._startGame(this.difficultyManager?.difficultyKey || 'NORMAL');
        };

        // Game Over → Main menu
        this.gameOver.onMainMenu = () => {
            this.state = GAME_STATES.MENU;
            this.menu.showMenu();
        };

        // Audio → Note detected
        this.audioEngine.onNoteDetected = (note) => {
            this._onNoteDetected(note);
        };
    }

    /**
     * Ensure audio is initialized (deferred to user gesture)
     */
    async _ensureAudio() {
        if (this.audioEngine.isInitialized) {
            this.audioEngine.start();
            return;
        }
        try {
            await this.audioEngine.initialize();
            this.audioEngine.start();
            this._hideError();
            console.log('[Game] Audio initialized on user gesture');
        } catch (error) {
            console.error('[Game] Audio init error:', error.message);
            this._showError(error.message);
        }
    }

    /**
     * Initialize the game (called once on page load)
     * Audio is NOT initialized here — deferred to user click
     */
    async init() {
        // Show menu
        this.menu.showMenu();

        // Start render loop (always running for menu animation)
        this.running = true;
        this.lastTimestamp = performance.now();
        requestAnimationFrame((ts) => this._gameLoop(ts));
    }

    /**
     * Start a new game
     */
    _startGame(difficulty) {
        // Reset everything
        this.score = 0;
        this.combo = 0;
        this.lastKillTime = 0;
        this.totalKills = 0;
        this.totalNotesPlayed = 0;
        this.totalNotesMatched = 0;
        this.noteMatchCooldowns.clear();

        // Initialize player at center (use logical dimensions)
        const cx = this.logicalWidth / 2;
        const cy = this.logicalHeight / 2;
        this.player = new Player(cx, cy);

        // Initialize difficulty
        this.difficultyManager = new DifficultyManager(difficulty);

        // Clear managers
        this.enemyManager.clear();
        this.particleManager.clear();

        // Reset HUD
        this.hud.reset();
        this.hud.setHP(this.player.hp);

        // Ensure audio is running
        if (this.audioEngine.isInitialized) {
            this.audioEngine.start();
        }

        // Start first wave
        this._startNextWave();

        this.state = GAME_STATES.PLAYING;
    }

    /**
     * Start the next wave
     */
    _startNextWave() {
        const waveInfo = this.difficultyManager.startNextWave();

        // Show wave announcement
        this.hud.showWaveAnnouncement(waveInfo.wave, waveInfo.isBoss);
        this.hud.setWave(waveInfo.wave, 0);

        // Brief pause before enemies start spawning
        this.state = GAME_STATES.WAVE_INTRO;
        this.waveIntroTimer = WAVE_INTRO_DURATION;
    }

    /**
     * Handle detected note from audio engine
     */
    _onNoteDetected(note) {
        // Tuning mode - update tuner display
        if (this.tuningActive) {
            this._updateTunerDisplay(note);
            return;
        }

        // Calibration mode
        if (this.menu.calibrationActive) {
            this.menu.feedCalibrationNote(note);
            return;
        }

        if (this.state !== GAME_STATES.PLAYING) return;

        this.totalNotesPlayed++;

        // Update HUD with detected note
        this.hud.setDetectedNote(note);

        // Check note match cooldown to prevent double-hits from harmonics
        const now = performance.now();
        const lastMatch = this.noteMatchCooldowns.get(note.name);
        if (lastMatch && (now - lastMatch) < NOTE_MATCH_COOLDOWN) {
            return; // Cooldown active, ignore this detection
        }

        // Try to match against enemies
        const result = this.enemyManager.matchNote(note.name, this.player.x, this.player.y);

        if (result) {
            this.totalNotesMatched++;
            this.noteMatchCooldowns.set(note.name, now);
            const { enemy, killed } = result;

            if (killed) {
                this._onEnemyKilled(enemy);
            } else {
                // Hit but not killed (multi-hit enemy)
                this._onEnemyHit(enemy);
            }
        }
    }

    /**
     * Handle enemy killed
     */
    _onEnemyKilled(enemy) {
        const now = performance.now();

        // Update combo
        if (now - this.lastKillTime < COMBO_TIMEOUT) {
            this.combo++;
        } else {
            this.combo = 1;
        }
        this.lastKillTime = now;
        this.totalKills++;

        // Calculate score with combo multiplier
        const multiplier = 1 + Math.floor(this.combo / COMBO_MULTIPLIER_STEP);
        const points = enemy.points * multiplier;
        this.score += points;

        // Spawn particles
        this.particleManager.ring(enemy.x, enemy.y, enemy.type.color, PARTICLE_COUNT_ON_KILL, 3);

        // Screen shake
        this._triggerShake(SCREEN_SHAKE_KILL);

        // Player shield effect
        this.player.showShield(enemy.note);

        // Update HUD
        this.hud.setScore(this.score);
        this.hud.setCombo(this.combo);
        this.hud.addKillFeed(`+${points}`, enemy.type.color);

        // Record kill in difficulty manager
        const waveResult = this.difficultyManager.recordKill();
        if (waveResult.waveComplete) {
            this.score += waveResult.bonus;
            this.hud.setScore(this.score);
            this.hud.addKillFeed(`DALGA TEMİZLENDİ! +${waveResult.bonus}`, COLORS.waveText);

            // Start next wave after a delay
            setTimeout(() => {
                if (this.state === GAME_STATES.PLAYING) {
                    this._startNextWave();
                }
            }, 1500);
        }
    }

    /**
     * Handle enemy hit (but not killed)
     */
    _onEnemyHit(enemy) {
        this.particleManager.burst(enemy.x, enemy.y, enemy.type.color, PARTICLE_COUNT_ON_HIT, 2);
        this._triggerShake(SCREEN_SHAKE_KILL * 0.5);
    }

    /**
     * Handle enemy reaching the player
     */
    _onEnemyReachedPlayer(enemy) {
        if (this.player.takeDamage()) {
            // Damage taken
            this.combo = 0;
            this.hud.setCombo(0);
            this.hud.setHP(this.player.hp);

            // Particles
            this.particleManager.burst(this.player.x, this.player.y, COLORS.playerDamage, 12, 4);

            // Screen shake
            this._triggerShake(SCREEN_SHAKE_DAMAGE);

            // Record in difficulty manager
            this.difficultyManager.recordEnemyReached();

            // Check death
            if (!this.player.isAlive()) {
                this._gameOverSequence();
            }
        }
    }

    /**
     * Game over
     */
    _gameOverSequence() {
        this.state = GAME_STATES.GAME_OVER;
        this.audioEngine.stop();

        // Big explosion at player position
        this.particleManager.ring(this.player.x, this.player.y, COLORS.playerCore, 30, 4);
        this.particleManager.ring(this.player.x, this.player.y, COLORS.playerDamage, 20, 3);

        // Show game over screen after brief delay
        setTimeout(() => {
            this.gameOver.show({
                score: this.score,
                wave: this.difficultyManager.wave,
                combo: this.hud.maxCombo,
                kills: this.totalKills,
                accuracy: this.totalNotesPlayed > 0
                    ? Math.round((this.totalNotesMatched / this.totalNotesPlayed) * 100)
                    : 0,
            });
        }, 1000);
    }

    // === TUNER ===

    _openTuner() {
        this.tuningActive = true;
        const overlay = document.getElementById('tuner-overlay');
        if (overlay) overlay.classList.add('visible');
    }

    _closeTuner() {
        this.tuningActive = false;
        const overlay = document.getElementById('tuner-overlay');
        if (overlay) overlay.classList.remove('visible');
    }

    _updateTunerDisplay(note) {
        const noteEl = document.getElementById('tuner-note');
        const freqEl = document.getElementById('tuner-freq');
        const centsEl = document.getElementById('tuner-cents');
        const barEl = document.getElementById('tuner-bar-fill');
        const statusEl = document.getElementById('tuner-status');

        if (noteEl) noteEl.textContent = note.name;
        if (freqEl) freqEl.textContent = `${note.frequency.toFixed(1)} Hz`;

        const cents = note.cents;
        if (centsEl) centsEl.textContent = `${cents > 0 ? '+' : ''}${cents}¢`;

        // Bar position: 50% = perfect, 0%=very flat, 100%=very sharp
        const barPos = 50 + (cents / 50) * 50;
        if (barEl) barEl.style.left = `${clamp(barPos, 2, 98)}%`;

        // Status & color
        const absCents = Math.abs(cents);
        let status, color;
        if (absCents <= 5) {
            status = '✓ AKORT';
            color = '#39ff14';
        } else if (absCents <= 15) {
            status = 'YAKIN';
            color = '#ffff00';
        } else {
            status = cents > 0 ? '↑ TIZLEŞTIR' : '↓ PESLEŞTIR';
            color = '#ff6600';
        }
        if (statusEl) {
            statusEl.textContent = status;
            statusEl.style.color = color;
        }
        if (barEl) barEl.style.backgroundColor = color;
        if (noteEl) noteEl.style.color = color;
    }

    // === UTILITY ===

    _triggerShake(amount) {
        this.shakeAmount = amount;
        this.shakeTimer = SCREEN_SHAKE_DURATION;
    }

    _showPauseOverlay() {
        const overlay = document.getElementById('pause-overlay');
        if (overlay) overlay.classList.add('visible');
    }

    _resumeGame() {
        const overlay = document.getElementById('pause-overlay');
        if (overlay) overlay.classList.remove('visible');
        this.state = GAME_STATES.PLAYING;
        this.audioEngine.start();
        this.lastTimestamp = performance.now();
    }

    _showError(message) {
        const errorEl = document.getElementById('error-message');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    }

    _hideError() {
        const errorEl = document.getElementById('error-message');
        if (errorEl) errorEl.style.display = 'none';
    }

    _handleResize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        this.logicalWidth = window.innerWidth;
        this.logicalHeight = window.innerHeight;

        if (this.player) {
            this.player.x = this.logicalWidth / 2;
            this.player.y = this.logicalHeight / 2;
        }

        this._initStars();
    }

    _initStars() {
        this.bgStars = [];
        const count = Math.floor((this.logicalWidth || 800) * (this.logicalHeight || 600) / 4000);
        for (let i = 0; i < count; i++) {
            this.bgStars.push({
                x: Math.random() * (this.logicalWidth || 800),
                y: Math.random() * (this.logicalHeight || 600),
                size: Math.random() * 1.5 + 0.3,
                brightness: Math.random(),
                twinkleSpeed: Math.random() * 2 + 1,
            });
        }
    }

    // ===================================
    // GAME LOOP
    // ===================================

    _gameLoop(timestamp) {
        if (!this.running) return;

        const deltaTime = Math.min(timestamp - this.lastTimestamp, 50);
        this.lastTimestamp = timestamp;

        this._update(deltaTime);
        this._render();

        requestAnimationFrame((ts) => this._gameLoop(ts));
    }

    _update(deltaTime) {
        // Always update background
        this.bgGridOffset = (this.bgGridOffset + deltaTime * 0.01) % GRID_SPACING;

        // Update screen shake
        if (this.shakeTimer > 0) {
            this.shakeTimer -= deltaTime;
            const intensity = (this.shakeTimer / SCREEN_SHAKE_DURATION) * this.shakeAmount;
            this.shakeX = (Math.random() - 0.5) * intensity * 2;
            this.shakeY = (Math.random() - 0.5) * intensity * 2;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }

        // State-specific updates
        if (this.state === GAME_STATES.WAVE_INTRO) {
            this.waveIntroTimer -= deltaTime;
            if (this.waveIntroTimer <= 0) {
                this.state = GAME_STATES.PLAYING;
            }
            if (this.player) this.player.update(deltaTime);
            this.particleManager.update(deltaTime);
            this.hud.update(deltaTime);
            return;
        }

        if (this.state !== GAME_STATES.PLAYING) {
            this.particleManager.update(deltaTime);
            this.hud.update(deltaTime);
            return;
        }

        // Update player
        this.player.update(deltaTime);

        // Check combo timeout
        if (this.combo > 0 && performance.now() - this.lastKillTime > COMBO_TIMEOUT) {
            this.combo = 0;
            this.hud.setCombo(0);
        }

        // Spawn enemies
        const shouldSpawn = this.difficultyManager.update(deltaTime);
        if (shouldSpawn) {
            const config = this.difficultyManager.generateEnemy();
            this.enemyManager.spawn(
                config,
                this.logicalWidth,
                this.logicalHeight,
                this.player.x,
                this.player.y
            );
            this.difficultyManager.recordSpawn();
        }

        // Update enemies
        this.enemyManager.update(deltaTime, this.player.x, this.player.y);

        // Check player collisions
        const collidingEnemies = this.enemyManager.checkPlayerCollisions(
            this.player.x, this.player.y, this.player.radius
        );
        for (const enemy of collidingEnemies) {
            this._onEnemyReachedPlayer(enemy);
        }

        // Update particles
        this.particleManager.update(deltaTime);

        // Update HUD
        this.hud.setWave(this.difficultyManager.wave, this.difficultyManager.getProgress());
        this.hud.update(deltaTime);
    }

    _render() {
        const ctx = this.ctx;
        const w = this.logicalWidth;
        const h = this.logicalHeight;

        ctx.save();
        ctx.translate(this.shakeX, this.shakeY);

        // Clear
        ctx.fillStyle = COLORS.background;
        ctx.fillRect(-10, -10, w + 20, h + 20);

        // Draw background
        this._drawBackground(ctx, w, h);

        // Draw game elements
        if (this.state === GAME_STATES.PLAYING ||
            this.state === GAME_STATES.WAVE_INTRO ||
            this.state === GAME_STATES.GAME_OVER ||
            this.state === GAME_STATES.PAUSED) {

            this.enemyManager.draw(ctx);
            if (this.player) this.player.draw(ctx);
            this.particleManager.draw(ctx);
            this.hud.draw(ctx, w, h);
        }

        // Audio visualizer
        if (this.audioEngine.isInitialized && this.state !== GAME_STATES.MENU) {
            this._drawAudioVisualizer(ctx, w, h);
        }

        ctx.restore();
    }

    _drawBackground(ctx, w, h) {
        const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
        gradient.addColorStop(0, COLORS.backgroundAlt);
        gradient.addColorStop(1, COLORS.background);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = COLORS.gridLine;
        ctx.lineWidth = 0.5;
        for (let x = this.bgGridOffset; x < w; x += GRID_SPACING) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = this.bgGridOffset; y < h; y += GRID_SPACING) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        const time = performance.now() * 0.001;
        for (const star of this.bgStars) {
            const twinkle = (Math.sin(time * star.twinkleSpeed + star.brightness * 10) + 1) / 2;
            ctx.fillStyle = `rgba(200, 220, 255, ${0.2 + twinkle * 0.6})`;
            ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2); ctx.fill();
        }

        if (this.player && this.state === GAME_STATES.PLAYING) {
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(this.player.x, this.player.y, 80, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = 'rgba(255, 7, 58, 0.03)';
            ctx.beginPath(); ctx.arc(this.player.x, this.player.y, 150, 0, Math.PI * 2); ctx.stroke();
        }
    }

    _drawAudioVisualizer(ctx, w, h) {
        const freqData = this.audioEngine.getFrequencyData();
        if (!freqData) return;

        const barCount = 64;
        const barWidth = w / barCount;
        const maxHeight = 40;

        ctx.save();
        for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor(i * (freqData.length * 0.3) / barCount);
            const value = freqData[dataIndex] / 255;
            const barHeight = value * maxHeight;
            if (barHeight < 1) continue;
            const hue = 180 + (i / barCount) * 60;
            ctx.fillStyle = `hsla(${hue}, 100%, 60%, ${0.3 + value * 0.4})`;
            ctx.fillRect(i * barWidth, h - barHeight, barWidth - 1, barHeight);
        }
        ctx.restore();
    }
}
