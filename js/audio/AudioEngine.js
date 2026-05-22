// ============================================
// NoteSlayer — Audio Engine
// Handles microphone access and real-time pitch detection
// ============================================

import { PitchDetector } from './PitchDetector.js';
import { NoteMapper } from './NoteMapper.js';
import { PITCH_FFT_SIZE, PITCH_CONFIDENCE_THRESHOLD, PITCH_MIN_FREQUENCY, PITCH_MAX_FREQUENCY } from '../utils/constants.js';

export class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.mediaStream = null;
        this.pitchDetector = null;
        this.noteMapper = new NoteMapper();

        this.isActive = false;
        this.isInitialized = false;

        // Detection buffers
        this.timeDomainBuffer = null;
        this.frequencyBuffer = null;

        // Current state
        this.currentFrequency = null;
        this.currentNote = null;
        this.currentVolume = 0;

        // Callbacks
        this.onNoteDetected = null;  // Called when a stable note is detected
        this.onVolumeChange = null;  // Called with current volume level

        // Detection loop
        this._detectLoopId = null;
        this._lastDetectTime = 0;

        // Configurable confidence threshold
        this._confidenceThreshold = null; // null = use default from constants
    }

    /**
     * Request microphone access and initialize the audio pipeline
     * @returns {Promise<boolean>} true if successful
     */
    async initialize() {
        try {
            // Request microphone permission
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    // Prefer high quality for pitch detection
                    sampleRate: { ideal: 44100 },
                    channelCount: 1,
                }
            });

            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 44100,
            });

            // Create analyser node
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = PITCH_FFT_SIZE;
            this.analyser.smoothingTimeConstant = 0;

            // Connect microphone to analyser
            this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.microphone.connect(this.analyser);

            // Initialize pitch detector
            this.pitchDetector = new PitchDetector(
                this.audioContext.sampleRate,
                this.analyser.fftSize
            );

            // Create buffers
            this.timeDomainBuffer = new Float32Array(this.analyser.fftSize);
            this.frequencyBuffer = new Uint8Array(this.analyser.frequencyBinCount);

            this.isInitialized = true;
            console.log('[AudioEngine] Initialized successfully', {
                sampleRate: this.audioContext.sampleRate,
                fftSize: this.analyser.fftSize,
            });

            // Cleanup on page unload
            window.addEventListener('beforeunload', () => this.destroy());

            return true;
        } catch (error) {
            console.error('[AudioEngine] Failed to initialize:', error);

            if (error.name === 'NotAllowedError') {
                throw new Error('Mikrofon izni reddedildi. Oyunu oynamak için mikrofon erişimine izin vermeniz gerekiyor.');
            } else if (error.name === 'NotFoundError') {
                throw new Error('Mikrofon bulunamadı. Lütfen bir mikrofon bağlayın.');
            } else {
                throw new Error('Ses sistemi başlatılamadı: ' + error.message);
            }
        }
    }

    /**
     * Start listening (no longer spawns its own rAF loop — use processFrame())
     */
    start() {
        if (!this.isInitialized) {
            console.warn('[AudioEngine] Not initialized yet');
            return;
        }

        // Resume audio context if suspended (autoplay policy)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.isActive = true;
        console.log('[AudioEngine] Detection started');
    }

    /**
     * Stop listening
     */
    stop() {
        this.isActive = false;
        if (this._detectLoopId) {
            cancelAnimationFrame(this._detectLoopId);
            this._detectLoopId = null;
        }
        this.currentFrequency = null;
        this.currentNote = null;
        this.noteMapper.reset();
        console.log('[AudioEngine] Detection stopped');
    }

    /**
     * Clean up all resources
     */
    destroy() {
        this.stop();

        if (this.microphone) {
            this.microphone.disconnect();
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
        }
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }

        this.isInitialized = false;
        console.log('[AudioEngine] Destroyed');
    }

    /**
     * Process one frame of pitch detection.
     * Called from Game loop instead of running its own rAF.
     */
    processFrame() {
        if (!this.isActive) return;

        const now = performance.now();

        // Get time-domain data for pitch detection
        this.analyser.getFloatTimeDomainData(this.timeDomainBuffer);

        // Calculate current volume (RMS)
        let rms = 0;
        for (let i = 0; i < this.timeDomainBuffer.length; i++) {
            rms += this.timeDomainBuffer[i] * this.timeDomainBuffer[i];
        }
        rms = Math.sqrt(rms / this.timeDomainBuffer.length);
        this.currentVolume = rms;

        if (this.onVolumeChange) {
            this.onVolumeChange(rms);
        }

        // Detect pitch
        const pitchResult = this.pitchDetector.detect(this.timeDomainBuffer);

        if (pitchResult) {
            const { frequency, confidence } = pitchResult;
            const confThreshold = this._confidenceThreshold || PITCH_CONFIDENCE_THRESHOLD;

            // Filter by confidence and frequency range
            if (confidence >= confThreshold &&
                frequency >= PITCH_MIN_FREQUENCY &&
                frequency <= PITCH_MAX_FREQUENCY) {

                // Harmonic filtering: suppress if frequency is a harmonic of current note
                if (this._isHarmonic(frequency)) {
                    return; // Skip this detection — likely an overtone
                }

                this.currentFrequency = frequency;

                // Map to note with stability filtering
                const noteResult = this.noteMapper.processDetection(frequency, now);

                if (noteResult) {
                    const previousNote = this.currentNote;
                    this.currentNote = noteResult;

                    // Fire callback if this is a new note
                    if (noteResult.isNew || !previousNote || previousNote.name !== noteResult.name) {
                        if (this.onNoteDetected) {
                            this.onNoteDetected(noteResult);
                        }
                    }
                }
            }
        } else {
            // No pitch detected
            this.currentFrequency = null;

            // Process silence through note mapper (handles timeout)
            const noteResult = this.noteMapper.processDetection(null, now);
            if (!noteResult && this.currentNote) {
                this.currentNote = null;
            }
        }
    }

    /**
     * Set confidence threshold override (for difficulty-based tuning)
     * @param {number} threshold - 0.0 to 1.0
     */
    setConfidenceThreshold(threshold) {
        this._confidenceThreshold = threshold;
    }

    /**
     * Check if a frequency is a harmonic (overtone) of the currently held note.
     * Guitar strings produce strong harmonics at 2x, 3x, 4x the fundamental.
     * @param {number} frequency
     * @returns {boolean}
     */
    _isHarmonic(frequency) {
        if (!this.currentNote || !this.currentNote.frequency) return false;

        const baseFreq = this.currentNote.frequency;
        // Only check if the detected freq is higher than the current note
        if (frequency <= baseFreq * 1.5) return false;

        for (let h = 2; h <= 4; h++) {
            const harmonicFreq = baseFreq * h;
            // 3% tolerance for harmonic matching
            if (Math.abs(frequency - harmonicFreq) / harmonicFreq < 0.03) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get the current detected note (for polling)
     */
    getDetectedNote() {
        return this.currentNote;
    }

    /**
     * Get current volume level (0-1 range approximately)
     */
    getVolume() {
        return this.currentVolume;
    }

    /**
     * Get frequency spectrum data for visualization
     * @returns {Uint8Array}
     */
    getFrequencyData() {
        if (!this.analyser) return null;
        this.analyser.getByteFrequencyData(this.frequencyBuffer);
        return this.frequencyBuffer;
    }

    /**
     * Check if microphone is available
     */
    static async checkMicrophoneAvailable() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.some(d => d.kind === 'audioinput');
        } catch {
            return false;
        }
    }
}
