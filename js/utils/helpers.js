// ============================================
// NoteSlayer — Helper Utilities
// ============================================

/**
 * Random float between min (inclusive) and max (exclusive)
 */
export function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Random integer between min and max (both inclusive)
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random element from an array
 */
export function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Clamp a value between min and max
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Distance between two points
 */
export function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Angle from point 1 to point 2 (radians)
 */
export function angleTo(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Ease out cubic
 */
export function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

/**
 * Ease in out sine
 */
export function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
}

/**
 * Pulse function (0 to 1 to 0, repeating)
 */
export function pulse(time, frequency = 1) {
    return (Math.sin(time * frequency * Math.PI * 2) + 1) / 2;
}

/**
 * Format a number with commas (e.g. 12345 → "12,345")
 */
export function formatNumber(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * HSL color string helper
 */
export function hsl(h, s, l, a = 1) {
    if (a < 1) {
        return `hsla(${h}, ${s}%, ${l}%, ${a})`;
    }
    return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * Generate a random spawn position on the edge of the canvas
 */
export function randomEdgePosition(canvasWidth, canvasHeight, padding = 50) {
    const side = randomInt(0, 3); // 0=top, 1=right, 2=bottom, 3=left
    switch (side) {
        case 0: // top
            return { x: randomFloat(0, canvasWidth), y: -padding };
        case 1: // right
            return { x: canvasWidth + padding, y: randomFloat(0, canvasHeight) };
        case 2: // bottom
            return { x: randomFloat(0, canvasWidth), y: canvasHeight + padding };
        case 3: // left
            return { x: -padding, y: randomFloat(0, canvasHeight) };
    }
}

/**
 * Check circle-circle collision
 */
export function circleCollision(x1, y1, r1, x2, y2, r2) {
    return distance(x1, y1, x2, y2) < r1 + r2;
}

/**
 * Debounce
 */
export function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}
