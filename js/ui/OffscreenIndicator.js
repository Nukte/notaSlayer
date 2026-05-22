// ============================================
// NoteSlayer — Offscreen Enemy Indicator
// Shows directional arrows for enemies outside the viewport
// ============================================

export class OffscreenIndicator {
    constructor() {
        this.padding = 40;    // Distance from screen edge
        this.arrowSize = 12;  // Arrow head size
        this.minAlpha = 0.3;
        this.maxAlpha = 0.9;
    }

    /**
     * Draw indicators for enemies that are off-screen
     * @param {CanvasRenderingContext2D} ctx
     * @param {Array} enemies - Enemy array
     * @param {number} w - Canvas width
     * @param {number} h - Canvas height
     */
    draw(ctx, enemies, w, h) {
        const pad = this.padding;

        for (const enemy of enemies) {
            if (enemy.dying || !enemy.alive) continue;

            // Check if enemy is off-screen
            const isOffscreen = enemy.x < -enemy.radius ||
                                enemy.x > w + enemy.radius ||
                                enemy.y < -enemy.radius ||
                                enemy.y > h + enemy.radius;

            if (!isOffscreen) continue;

            // Calculate indicator position (clamped to screen edge)
            const cx = w / 2;
            const cy = h / 2;
            const angle = Math.atan2(enemy.y - cy, enemy.x - cx);

            // Find intersection with screen edge
            const indicatorPos = this._getEdgePoint(cx, cy, angle, w, h, pad);

            // Distance-based alpha (closer = more visible)
            const dist = Math.sqrt((enemy.x - cx) ** 2 + (enemy.y - cy) ** 2);
            const maxDist = Math.max(w, h) * 1.5;
            const alpha = this.maxAlpha - (dist / maxDist) * (this.maxAlpha - this.minAlpha);

            // Draw arrow
            this._drawArrow(ctx, indicatorPos.x, indicatorPos.y, angle, enemy, alpha);
        }
    }

    /**
     * Calculate point on screen edge given an angle from center
     */
    _getEdgePoint(cx, cy, angle, w, h, pad) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Find which edge the ray hits first
        let t = Infinity;

        // Right edge
        if (cos > 0) t = Math.min(t, (w - pad - cx) / cos);
        // Left edge
        if (cos < 0) t = Math.min(t, (pad - cx) / cos);
        // Bottom edge
        if (sin > 0) t = Math.min(t, (h - pad - cy) / sin);
        // Top edge
        if (sin < 0) t = Math.min(t, (pad - cy) / sin);

        return {
            x: Math.max(pad, Math.min(w - pad, cx + cos * t)),
            y: Math.max(pad, Math.min(h - pad, cy + sin * t)),
        };
    }

    /**
     * Draw a colored arrow pointing toward the enemy
     */
    _drawArrow(ctx, x, y, angle, enemy, alpha) {
        const size = this.arrowSize;
        const color = enemy.type.color;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.rotate(angle);

        // Arrow head
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(size, 0);
        ctx.lineTo(-size * 0.6, -size * 0.5);
        ctx.lineTo(-size * 0.3, 0);
        ctx.lineTo(-size * 0.6, size * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;

        // Note label next to arrow
        ctx.rotate(-angle); // Un-rotate for readable text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px "Orbitron", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(enemy.note, 0, -size - 6);

        ctx.restore();
    }
}
