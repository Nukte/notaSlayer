// ============================================
// NoteSlayer — Main Game Controller
// ============================================

import { GAME_STATES, COLORS, COMBO_TIMEOUT, COMBO_MULTIPLIER_STEP,
         PARTICLE_COUNT_ON_KILL, PARTICLE_COUNT_ON_HIT, SCREEN_SHAKE_KILL,
         SCREEN_SHAKE_DAMAGE, SCREEN_SHAKE_DURATION, WAVE_INTRO_DURATION,
         NOTE_MATCH_COOLDOWN } from '../utils/constants.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { Player } from './Player.js';
import { EnemyManager } from './EnemyManager.js';
import { DifficultyManager } from './DifficultyManager.js';
import { ParticleManager } from './Particle.js';
import { BackgroundRenderer } from './BackgroundRenderer.js';
import { InputHandler } from './InputHandler.js';
import { HUD } from '../ui/HUD.js';
import { Menu } from '../ui/Menu.js';
import { GameOver } from '../ui/GameOver.js';
import { TunerController } from '../ui/TunerController.js';
import { OffscreenIndicator } from '../ui/OffscreenIndicator.js';
import { SFXEngine } from '../audio/SFXEngine.js';

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
        this.backgroundRenderer = new BackgroundRenderer();

        // UI systems
        this.hud = new HUD();
        this.menu = new Menu();
        this.gameOver = new GameOver();
        this.tuner = new TunerController();
        this.inputHandler = new InputHandler();
        this.offscreenIndicator = new OffscreenIndicator();

        // SFX system (initialized after AudioEngine)
        this.sfx = new SFXEngine();

        // Game stats
        this.score = 0;
        this.combo = 0;
        this.lastKillTime = 0;
        this.totalKills = 0;
        this.totalNotesPlayed = 0;
        this.totalNotesMatched = 0;

        // Note match cooldown - prevents same note matching twice from harmonics
        this.noteMatchCooldowns = new Map();

        // Screen shake
        this.shakeAmount = 0;
        this.shakeTimer = 0;
        this.shakeX = 0;
        this.shakeY = 0;

        // Wave intro timer
        this.waveIntroTimer = 0;

        // Wave timeout reference (for cleanup)
        this._waveTimeout = null;

        // Setup
        this._setupCallbacks();
        this._handleResize();
        window.addEventListener('resize', () => this._handleResize());
    }

    // ===================================
    // CALLBACKS SETUP
    // ===================================

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
                this.tuner.open();
            }
        };

        // Tuner → Close callback
        this.tuner.onClose = () => {
            // Nothing extra needed; tuner handles its own UI
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

        // Input handler callbacks
        this.inputHandler.onCloseTuner = () => {
            if (this.tuner.active) {
                this.tuner.close();
                return true;
            }
            return false;
        };

        this.inputHandler.onPause = () => {
            if (this.state === GAME_STATES.PLAYING) {
                this.state = GAME_STATES.PAUSED;
                this.audioEngine.stop();
                this._showOverlay('pause-overlay');
                this.inputHandler.showMobilePause(false);
                return true;
            }
            return false;
        };

        this.inputHandler.onResume = () => {
            if (this.state === GAME_STATES.PAUSED) {
                this._resumeGame();
            }
        };

        // Menu → Close tuner (callback-based, no more window.__game)
        this.menu.onCloseTuner = () => {
            this.tuner.close();
        };
    }

    // ===================================
    // AUDIO INIT
    // ===================================

    async _ensureAudio() {
        if (this.audioEngine.isInitialized) {
            this.audioEngine.start();
            return;
        }
        try {
            await this.audioEngine.initialize();
            this.audioEngine.start();

            // Initialize SFX with the shared AudioContext
            if (!this.sfx.isReady) {
                this.sfx.init(this.audioEngine.audioContext);
            }

            this._hideError();
            console.log('[Game] Audio initialized on user gesture');
        } catch (error) {
            console.error('[Game] Audio init error:', error.message);
            this._showError(error.message);
        }
    }

    // ===================================
    // GAME LIFECYCLE
    // ===================================

    async init() {
        this.menu.showMenu();
        this.running = true;
        this.lastTimestamp = performance.now();
        requestAnimationFrame((ts) => this._gameLoop(ts));
    }

    _startGame(difficulty) {
        // Clear pending wave timeout
        if (this._waveTimeout) {
            clearTimeout(this._waveTimeout);
            this._waveTimeout = null;
        }

        // Reset stats
        this.score = 0;
        this.combo = 0;
        this.lastKillTime = 0;
        this.totalKills = 0;
        this.totalNotesPlayed = 0;
        this.totalNotesMatched = 0;
        this.noteMatchCooldowns.clear();

        // Initialize player at center
        const cx = this.logicalWidth / 2;
        const cy = this.logicalHeight / 2;
        this.player = new Player(cx, cy);

        // Initialize difficulty
        this.difficultyManager = new DifficultyManager(difficulty);

        // Apply difficulty-specific confidence threshold
        if (this.difficultyManager.settings.confidenceThreshold) {
            this.audioEngine.setConfidenceThreshold(
                this.difficultyManager.settings.confidenceThreshold
            );
        }

        // Clear managers
        this.enemyManager.clear();
        this.particleManager.clear();

        // Reset HUD and background mood
        this.hud.reset();
        this.hud.setHP(this.player.hp);
        this.backgroundRenderer.setMood('default');

        // Ensure audio is running
        if (this.audioEngine.isInitialized) {
            this.audioEngine.start();
        }

        // Show mobile pause button
        this.inputHandler.showMobilePause(true);

        // Start first wave
        this._startNextWave();
        this.state = GAME_STATES.PLAYING;
    }

    _startNextWave() {
        const waveInfo = this.difficultyManager.startNextWave();

        // Show wave announcement
        this.hud.showWaveAnnouncement(waveInfo.wave, waveInfo.isBoss);
        this.hud.setWave(waveInfo.wave, 0);
        this.sfx.playWaveStart();

        // Set background mood based on wave type
        if (waveInfo.isBoss) {
            this.backgroundRenderer.setMood('boss');
        } else {
            this.backgroundRenderer.setMood('default');
        }

        // Brief pause before enemies start spawning
        this.state = GAME_STATES.WAVE_INTRO;
        this.waveIntroTimer = WAVE_INTRO_DURATION;
    }

    // ===================================
    // NOTE DETECTION HANDLING
    // ===================================

    _onNoteDetected(note) {
        // Tuning mode
        if (this.tuner.active) {
            this.tuner.updateDisplay(note);
            return;
        }

        // Calibration mode
        if (this.menu.calibrationActive) {
            this.menu.feedCalibrationNote(note);
            return;
        }

        if (this.state !== GAME_STATES.PLAYING) return;

        this.totalNotesPlayed++;
        this.hud.setDetectedNote(note);

        // Check note match cooldown to prevent double-hits from harmonics
        const now = performance.now();
        const lastMatch = this.noteMatchCooldowns.get(note.name);
        if (lastMatch && (now - lastMatch) < NOTE_MATCH_COOLDOWN) {
            return;
        }

        // Find target enemy
        const enemy = this.enemyManager.findTarget(note.name, this.player.x, this.player.y);

        if (enemy) {
            this.totalNotesMatched++;
            this.noteMatchCooldowns.set(note.name, now);

            // Fire projectile from player to enemy
            const color = enemy.type.color;
            this.particleManager.fireProjectile(
                this.player.x, this.player.y,
                enemy,
                color,
                true,
                () => {
                    // Projectile arrived — apply damage
                    enemy.projectileIncoming = false;
                    if (enemy.dying || !enemy.alive) return;

                    const killed = enemy.hit();
                    if (killed) {
                        this._onEnemyKilled(enemy);
                    } else {
                        this._onEnemyHit(enemy);
                    }
                }
            );

            // Player fires animation
            this.player.showShield(enemy.note);
        }

        // Update accuracy in HUD
        this.hud.setAccuracy(this.totalNotesMatched, this.totalNotesPlayed);
    }

    // ===================================
    // COMBAT EVENTS
    // ===================================

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

        // SFX
        this.sfx.playKill(enemy.type.color);

        // Update HUD
        this.hud.setScore(this.score);
        this.hud.setCombo(this.combo);
        this.hud.addKillFeed(`+${points}`, enemy.type.color);

        // Dynamic background mood for high combos
        if (this.combo >= 5) {
            this.backgroundRenderer.setMood('combo');
            // SFX combo milestone every 5 kills
            if (this.combo % 5 === 0) {
                this.sfx.playCombo(Math.floor(this.combo / 5));
            }
        }

        // Record kill in difficulty manager
        const waveResult = this.difficultyManager.recordKill();
        if (waveResult.waveComplete) {
            this.score += waveResult.bonus;
            this.hud.setScore(this.score);
            this.hud.addKillFeed(`DALGA TEMİZLENDİ! +${waveResult.bonus}`, COLORS.waveText);
            this.backgroundRenderer.setMood('default');
            this.sfx.playWaveClear();

            // Start next wave after a delay (with cleanup reference)
            this._waveTimeout = setTimeout(() => {
                this._waveTimeout = null;
                if (this.state === GAME_STATES.PLAYING) {
                    this._startNextWave();
                }
            }, 1500);
        }
    }

    _onEnemyHit(enemy) {
        this.particleManager.burst(enemy.x, enemy.y, enemy.type.color, PARTICLE_COUNT_ON_HIT, 2);
        this._triggerShake(SCREEN_SHAKE_KILL * 0.5);
        this.sfx.playHit();
    }

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

            // SFX
            this.sfx.playDamage();

            // Danger mood when low HP
            if (this.player.hp <= 1) {
                this.backgroundRenderer.setMood('danger');
            }

            // Record in difficulty manager
            this.difficultyManager.recordEnemyReached();

            // Check death
            if (!this.player.isAlive()) {
                this._gameOverSequence();
            }
        }
    }

    _gameOverSequence() {
        this.state = GAME_STATES.GAME_OVER;
        this.audioEngine.stop();
        this.inputHandler.showMobilePause(false);

        // Clear wave timeout
        if (this._waveTimeout) {
            clearTimeout(this._waveTimeout);
            this._waveTimeout = null;
        }

        // Big explosion at player position
        this.particleManager.ring(this.player.x, this.player.y, COLORS.playerCore, 30, 4);
        this.particleManager.ring(this.player.x, this.player.y, COLORS.playerDamage, 20, 3);
        this.sfx.playGameOver();

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

    // ===================================
    // UTILITY
    // ===================================

    _triggerShake(amount) {
        this.shakeAmount = amount;
        this.shakeTimer = SCREEN_SHAKE_DURATION;
    }

    _showOverlay(id) {
        const overlay = document.getElementById(id);
        if (overlay) overlay.classList.add('visible');
    }

    _hideOverlay(id) {
        const overlay = document.getElementById(id);
        if (overlay) overlay.classList.remove('visible');
    }

    _resumeGame() {
        this._hideOverlay('pause-overlay');
        this.state = GAME_STATES.PLAYING;
        this.audioEngine.start();
        this.inputHandler.showMobilePause(true);
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

        // Update background renderer
        this.backgroundRenderer.initStars(this.logicalWidth, this.logicalHeight);
        this.backgroundRenderer.cacheGradient(this.logicalWidth, this.logicalHeight);
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
        this.backgroundRenderer.update(deltaTime);

        // Process audio detection in the same loop
        if (this.audioEngine.isActive) {
            this.audioEngine.processFrame();
        }

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
            // Reset mood when combo drops
            if (!this.difficultyManager.isBossWave() && this.player.hp > 1) {
                this.backgroundRenderer.setMood('default');
            }
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
        this.backgroundRenderer.draw(ctx, w, h, this.state, this.player);

        // Draw game elements
        if (this.state === GAME_STATES.PLAYING ||
            this.state === GAME_STATES.WAVE_INTRO ||
            this.state === GAME_STATES.GAME_OVER ||
            this.state === GAME_STATES.PAUSED) {

            this.enemyManager.draw(ctx);
            if (this.player) this.player.draw(ctx);
            this.particleManager.draw(ctx);

            // Offscreen enemy indicators
            this.offscreenIndicator.draw(ctx, this.enemyManager.enemies, w, h);

            this.hud.draw(ctx, w, h);
        }

        // Audio visualizer
        if (this.audioEngine.isInitialized && this.state !== GAME_STATES.MENU) {
            const freqData = this.audioEngine.getFrequencyData();
            this.backgroundRenderer.drawAudioVisualizer(ctx, w, h, freqData);
        }

        ctx.restore();
    }
}
