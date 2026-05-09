// ============================================
// NoteSlayer — Pitch Detector (YIN Algorithm)
// ============================================

export class PitchDetector {
    /**
     * @param {number} sampleRate - Audio sample rate (e.g. 44100)
     * @param {number} bufferSize - Size of analysis buffer (e.g. 2048)
     */
    constructor(sampleRate, bufferSize) {
        this.sampleRate = sampleRate;
        this.bufferSize = bufferSize;
        this.halfSize = Math.floor(bufferSize / 2);
        this.yinBuffer = new Float32Array(this.halfSize);
        this.threshold = 0.15; // YIN confidence threshold (lower = stricter)
        this.probabilityThreshold = 0.1;
    }

    /**
     * Detect pitch from time-domain audio data
     * @param {Float32Array} buffer - Time-domain audio samples
     * @returns {{ frequency: number, confidence: number } | null}
     */
    detect(buffer) {
        // Check if there's enough signal (RMS volume check)
        let rms = 0;
        for (let i = 0; i < buffer.length; i++) {
            rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / buffer.length);

        if (rms < 0.015) {
            return null; // Too quiet - no sound detected
        }

        // Run the YIN algorithm
        const result = this._yin(buffer);
        return result;
    }

    /**
     * YIN pitch detection algorithm
     * Based on "YIN, a fundamental frequency estimator for speech and music"
     * by Alain de Cheveigné and Hideki Kawahara (2002)
     */
    _yin(buffer) {
        const halfSize = this.halfSize;
        const yinBuffer = this.yinBuffer;

        // Step 1: Difference function
        // d(tau) = sum of (buffer[i] - buffer[i+tau])^2
        for (let tau = 0; tau < halfSize; tau++) {
            yinBuffer[tau] = 0;
            for (let i = 0; i < halfSize; i++) {
                const delta = buffer[i] - buffer[i + tau];
                yinBuffer[tau] += delta * delta;
            }
        }

        // Step 2: Cumulative Mean Normalized Difference Function (CMND)
        // d'(tau) = d(tau) / ((1/tau) * sum(d(j) for j=1..tau))
        yinBuffer[0] = 1;
        let runningSum = 0;
        for (let tau = 1; tau < halfSize; tau++) {
            runningSum += yinBuffer[tau];
            if (runningSum === 0) {
                yinBuffer[tau] = 1;
            } else {
                yinBuffer[tau] = yinBuffer[tau] * tau / runningSum;
            }
        }

        // Step 3: Absolute threshold
        // Find the first tau where d'(tau) is below threshold
        let tau = 2;
        while (tau < halfSize) {
            if (yinBuffer[tau] < this.threshold) {
                // Find the local minimum (dip) from this point
                while (tau + 1 < halfSize && yinBuffer[tau + 1] < yinBuffer[tau]) {
                    tau++;
                }
                break;
            }
            tau++;
        }

        // No pitch found
        if (tau === halfSize) {
            return null;
        }

        // Confidence check
        const confidence = 1 - yinBuffer[tau];
        if (confidence < this.probabilityThreshold) {
            return null;
        }

        // Step 4: Parabolic interpolation for better accuracy
        let betterTau;
        if (tau < 1 || tau >= halfSize - 1) {
            betterTau = tau;
        } else {
            const s0 = yinBuffer[tau - 1];
            const s1 = yinBuffer[tau];
            const s2 = yinBuffer[tau + 1];
            const denominator = 2 * (2 * s1 - s2 - s0);
            if (denominator === 0) {
                betterTau = tau;
            } else {
                betterTau = tau + (s2 - s0) / denominator;
            }
        }

        // Convert tau (period in samples) to frequency
        const frequency = this.sampleRate / betterTau;

        return {
            frequency: Math.round(frequency * 100) / 100,
            confidence: Math.round(confidence * 1000) / 1000
        };
    }

    /**
     * Set YIN threshold (0.05 to 0.3 recommended)
     * Lower = more selective (fewer false positives, may miss quiet notes)
     * Higher = more permissive (catches more notes, more false positives)
     */
    setThreshold(value) {
        this.threshold = Math.max(0.01, Math.min(0.5, value));
    }
}
