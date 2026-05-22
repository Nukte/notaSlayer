// ============================================
// NoteSlayer — Note Mapper
// Converts detected frequency to musical note
// ============================================

import { NOTE_NAMES } from '../utils/constants.js';

export class NoteMapper {
    constructor() {
        // Note stability tracking
        this.lastNote = null;
        this.noteHoldStart = 0;
        this.stableNoteDuration = 80; // ms - how long a note must be held to register
        this.lastDetectionTime = 0;
    }

    /**
     * Convert a frequency to the nearest musical note
     * @param {number} frequency - Detected frequency in Hz
     * @returns {{ name: string, noteName: string, octave: number, frequency: number, cents: number } | null}
     */
    frequencyToNote(frequency) {
        if (!frequency || frequency < 60 || frequency > 1500) {
            return null;
        }

        // Find nearest note using MIDI math
        const midiNumber = 12 * (Math.log2(frequency / 440)) + 69;
        const roundedMidi = Math.round(midiNumber);
        const centsDiff = Math.round((midiNumber - roundedMidi) * 100);

        // Only accept notes within ±40 cents of the target
        if (Math.abs(centsDiff) > 40) {
            return null;
        }

        const octave = Math.floor((roundedMidi - 12) / 12);
        const noteIndex = ((roundedMidi % 12) + 12) % 12;
        const noteName = NOTE_NAMES[noteIndex];

        return {
            name: `${noteName}${octave}`,
            noteName: noteName,
            octave: octave,
            frequency: frequency,
            cents: centsDiff,
            midi: roundedMidi,
        };
    }

    /**
     * Process a detected frequency with stability filtering.
     * Returns a note only when it has been held stably for a minimum duration.
     * This prevents flickering between notes.
     *
     * @param {number|null} frequency
     * @param {number} timestamp - current time in ms
     * @returns {{ name: string, noteName: string, octave: number, frequency: number, cents: number, isNew: boolean } | null}
     */
    processDetection(frequency, timestamp) {
        if (!frequency) {
            // Silence - reset after a short timeout
            if (timestamp - this.lastDetectionTime > 200) {
                this.lastNote = null;
                this.noteHoldStart = 0;
            }
            return null;
        }

        this.lastDetectionTime = timestamp;
        const note = this.frequencyToNote(frequency);

        if (!note) {
            return null;
        }

        // Check if this is the same note as before
        if (this.lastNote && this.lastNote.name === note.name) {
            // Same note — check if it's been stable long enough
            const holdDuration = timestamp - this.noteHoldStart;
            if (holdDuration >= this.stableNoteDuration) {
                return { ...note, isNew: false };
            }
            return null; // Not stable enough yet
        }

        // New note detected — start tracking
        this.lastNote = note;
        this.noteHoldStart = timestamp;

        // If stableNoteDuration is 0, return immediately
        if (this.stableNoteDuration === 0) {
            return { ...note, isNew: true };
        }

        return null; // Wait for stability
    }

    /**
     * Get the currently held note (if any)
     */
    getCurrentNote() {
        return this.lastNote;
    }

    /**
     * Reset all tracking state
     */
    reset() {
        this.lastNote = null;
        this.noteHoldStart = 0;
        this.lastDetectionTime = 0;
    }

    /**
     * Set how long a note must be held to register (ms)
     */
    setStabilityDuration(ms) {
        this.stableNoteDuration = Math.max(0, ms);
    }
}
