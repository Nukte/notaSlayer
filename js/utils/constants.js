// ============================================
// NoteSlayer — Game Constants
// ============================================

// --- Game States ---
export const GAME_STATES = {
    MENU: 'MENU',
    CALIBRATING: 'CALIBRATING',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    WAVE_INTRO: 'WAVE_INTRO',
    GAME_OVER: 'GAME_OVER'
};

// --- Player ---
export const PLAYER_RADIUS = 30;
export const PLAYER_MAX_HP = 3;
export const PLAYER_INVULNERABILITY_TIME = 1500; // ms

// --- Colors ---
export const COLORS = {
    background: '#0a0a1a',
    backgroundAlt: '#0d0d2b',
    gridLine: 'rgba(0, 255, 255, 0.04)',
    gridLineBright: 'rgba(0, 255, 255, 0.08)',

    playerCore: '#00ffff',
    playerGlow: 'rgba(0, 255, 255, 0.5)',
    playerShield: 'rgba(0, 255, 255, 0.15)',
    playerDamage: '#ff073a',

    enemyNormal: '#39ff14',
    enemyNormalGlow: 'rgba(57, 255, 20, 0.5)',
    enemyFast: '#ff6600',
    enemyFastGlow: 'rgba(255, 102, 0, 0.5)',
    enemyElite: '#ff073a',
    enemyEliteGlow: 'rgba(255, 7, 58, 0.5)',
    enemyBoss: '#bf00ff',
    enemyBossGlow: 'rgba(191, 0, 255, 0.5)',

    enemyDual: '#00e5ff',
    enemyDualGlow: 'rgba(0, 229, 255, 0.5)',
    enemySequence: '#4d4dff',
    enemySequenceGlow: 'rgba(77, 77, 255, 0.5)',
    enemyDodger: '#40e0d0',
    enemyDodgerGlow: 'rgba(64, 224, 208, 0.5)',
    enemySplitter: '#aaff00',
    enemySplitterGlow: 'rgba(170, 255, 0, 0.5)',

    hudText: '#e0e0e0',
    hudAccent: '#00ffff',
    comboText: '#ffff00',
    comboGlow: 'rgba(255, 255, 0, 0.6)',
    waveText: '#ff00ff',
    waveGlow: 'rgba(255, 0, 255, 0.6)',
    successText: '#39ff14',
    dangerText: '#ff073a',

    noteDetected: '#00ffff',
    noteMatched: '#39ff14',

    uiGlass: 'rgba(10, 10, 30, 0.85)',
    uiBorder: 'rgba(0, 255, 255, 0.2)',
    uiBorderBright: 'rgba(0, 255, 255, 0.5)',
};

// --- Enemy Types ---
export const ENEMY_TYPES = {
    NORMAL: {
        name: 'Normal',
        color: COLORS.enemyNormal,
        glowColor: COLORS.enemyNormalGlow,
        baseSpeed: 0.6,
        radius: 24,
        points: 100,
        notesRequired: 1,
        hp: 1,
    },
    FAST: {
        name: 'Fast',
        color: COLORS.enemyFast,
        glowColor: COLORS.enemyFastGlow,
        baseSpeed: 1.2,
        radius: 19,
        points: 200,
        notesRequired: 1,
        hp: 1,
    },
    ELITE: {
        name: 'Elite',
        color: COLORS.enemyElite,
        glowColor: COLORS.enemyEliteGlow,
        baseSpeed: 0.9,
        radius: 30,
        points: 500,
        notesRequired: 2,
        hp: 2,
    },
    BOSS: {
        name: 'Boss',
        color: COLORS.enemyBoss,
        glowColor: COLORS.enemyBossGlow,
        baseSpeed: 0.4,
        radius: 45,
        points: 1000,
        notesRequired: 3,
        hp: 3,
        noteCount: 1,
    },
    DUAL: {
        name: 'Dual',
        color: COLORS.enemyDual,
        glowColor: COLORS.enemyDualGlow,
        baseSpeed: 0.55,
        radius: 28,
        points: 300,
        notesRequired: 1,
        hp: 2,
        noteCount: 2,
        isSequential: false,
    },
    SEQUENCE: {
        name: 'Sequence',
        color: COLORS.enemySequence,
        glowColor: COLORS.enemySequenceGlow,
        baseSpeed: 0.5,
        radius: 28,
        points: 400,
        notesRequired: 1,
        hp: 2,
        noteCount: 2,
        isSequential: true,
    },
    DODGER: {
        name: 'Dodger',
        color: COLORS.enemyDodger,
        glowColor: COLORS.enemyDodgerGlow,
        baseSpeed: 0.45,
        radius: 22,
        points: 400,
        notesRequired: 1,
        hp: 1,
        noteCount: 1,
        canDodge: true,
    },
    SPLITTER: {
        name: 'Splitter',
        color: COLORS.enemySplitter,
        glowColor: COLORS.enemySplitterGlow,
        baseSpeed: 0.5,
        radius: 30,
        points: 250,
        notesRequired: 1,
        hp: 1,
        noteCount: 1,
        splitsOnDeath: true,
    },
    SPLITTER_MINI: {
        name: 'SplitterMini',
        color: COLORS.enemySplitter,
        glowColor: COLORS.enemySplitterGlow,
        baseSpeed: 1.0,
        radius: 16,
        points: 75,
        notesRequired: 1,
        hp: 1,
        noteCount: 1,
    },
};

// --- Musical Notes ---
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Generate frequency for a given note and octave
export function getNoteFrequency(noteName, octave) {
    const noteIndex = NOTE_NAMES.indexOf(noteName);
    if (noteIndex === -1) return null;
    const midiNumber = (octave + 1) * 12 + noteIndex;
    return 440 * Math.pow(2, (midiNumber - 69) / 12);
}

// Build a full note table for quick lookup
export const NOTE_TABLE = [];
for (let octave = 1; octave <= 7; octave++) {
    for (const name of NOTE_NAMES) {
        const freq = getNoteFrequency(name, octave);
        NOTE_TABLE.push({
            name: `${name}${octave}`,
            noteName: name,
            octave,
            frequency: freq,
        });
    }
}

// --- Guitar-friendly Note Pools ---
export const GUITAR_NOTES_EASY = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'];
export const GUITAR_NOTES_MEDIUM = [
    'E2', 'F2', 'G2', 'A2', 'B2',
    'C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3',
    'C4', 'D4', 'E4'
];
export const GUITAR_NOTES_HARD = [
    ...GUITAR_NOTES_MEDIUM,
    'F4', 'G4', 'A4', 'B4', 'C5'
];

// --- Difficulty Settings ---
export const DIFFICULTY_SETTINGS = {
    EASY: {
        label: 'Kolay',
        baseSpawnInterval: 2000,
        minSpawnInterval: 900,
        baseEnemySpeedMul: 0.8,
        maxEnemySpeedMul: 2.0,
        notePool: GUITAR_NOTES_EASY,
        speedIncreasePerWave: 0.12,
        spawnDecreasePerWave: 150,
        eliteStartWave: 8,
        bossStartWave: 10,
        confidenceThreshold: 0.75,
        // Kolay: çoğunluk Normal/Fast, Dodger yok
        spawnTable: [
            { type: 'NORMAL',   weight: 60, minWave: 1 },
            { type: 'FAST',     weight: 25, minWave: 1 },
            { type: 'DUAL',     weight: 10, minWave: 5 },
            { type: 'SPLITTER', weight: 5,  minWave: 8 },
            { type: 'SEQUENCE', weight: 5,  minWave: 7 },
            { type: 'ELITE',    weight: 5,  minWave: 8 },
        ],
    },
    NORMAL: {
        label: 'Normal',
        baseSpawnInterval: 1800,
        minSpawnInterval: 700,
        baseEnemySpeedMul: 1.0,
        maxEnemySpeedMul: 2.5,
        notePool: GUITAR_NOTES_MEDIUM,
        speedIncreasePerWave: 0.15,
        spawnDecreasePerWave: 160,
        eliteStartWave: 5,
        bossStartWave: 5,
        confidenceThreshold: 0.85,
        // Normal: dengeli dağılım
        spawnTable: [
            { type: 'NORMAL',   weight: 40, minWave: 1 },
            { type: 'FAST',     weight: 25, minWave: 1 },
            { type: 'DUAL',     weight: 15, minWave: 3 },
            { type: 'SEQUENCE', weight: 10, minWave: 5 },
            { type: 'DODGER',   weight: 5,  minWave: 7 },
            { type: 'SPLITTER', weight: 8,  minWave: 6 },
            { type: 'ELITE',    weight: 8,  minWave: 5 },
        ],
    },
    HARD: {
        label: 'Zor',
        baseSpawnInterval: 1500,
        minSpawnInterval: 500,
        baseEnemySpeedMul: 1.2,
        maxEnemySpeedMul: 3.0,
        notePool: GUITAR_NOTES_HARD,
        speedIncreasePerWave: 0.18,
        spawnDecreasePerWave: 180,
        eliteStartWave: 3,
        bossStartWave: 5,
        confidenceThreshold: 0.90,
        // Zor: zor tipler erken ve sık
        spawnTable: [
            { type: 'NORMAL',   weight: 25, minWave: 1 },
            { type: 'FAST',     weight: 20, minWave: 1 },
            { type: 'DUAL',     weight: 20, minWave: 2 },
            { type: 'SEQUENCE', weight: 15, minWave: 3 },
            { type: 'DODGER',   weight: 10, minWave: 5 },
            { type: 'SPLITTER', weight: 10, minWave: 4 },
            { type: 'ELITE',    weight: 10, minWave: 3 },
        ],
    }
};

// --- Wave Settings ---
export const ENEMIES_PER_WAVE_BASE = 6;
export const ENEMIES_PER_WAVE_INCREMENT = 3;
export const WAVE_INTRO_DURATION = 2000; // ms
export const BOSS_WAVE_INTERVAL = 5;
export const WAVE_CLEAR_BONUS = 500;

// --- Note Match Cooldown ---
export const NOTE_MATCH_COOLDOWN = 350; // ms - prevent same note matching twice rapidly

// --- Pitch Detection ---
export const PITCH_FFT_SIZE = 2048;
export const PITCH_CONFIDENCE_THRESHOLD = 0.85;
export const PITCH_MIN_FREQUENCY = 75;   // just below E2
export const PITCH_MAX_FREQUENCY = 1400;  // above E6
export const PITCH_MIN_RMS = 0.015;       // minimum volume to register

// --- Combo ---
export const COMBO_TIMEOUT = 3000; // ms before combo resets
export const COMBO_MULTIPLIER_STEP = 5; // every N kills, multiplier increases

// --- Particles ---
export const PARTICLE_COUNT_ON_KILL = 18;
export const PARTICLE_COUNT_ON_HIT = 8;
export const PARTICLE_LIFETIME = 700;  // ms
export const PARTICLE_MAX_SPEED = 5;
export const PARTICLE_MIN_SPEED = 1;

// --- Screen Shake ---
export const SCREEN_SHAKE_KILL = 4;     // pixels
export const SCREEN_SHAKE_DAMAGE = 12;  // pixels
export const SCREEN_SHAKE_DURATION = 200; // ms

// --- Grid ---
export const GRID_SPACING = 60;
