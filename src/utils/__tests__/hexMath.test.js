import { describe, it, expect } from 'vitest';
import {
    TILE_SIZE, R, hexW, getHexCenter,
    pixelToAxial, cubeRound, axialToOffset, getHexVertices
} from '../hexMath';

describe('Hexagonal Grid Mathematics (Pointy-Top, Odd-R)', () => {
    it('should have consistent base scale constants', () => {
        expect(TILE_SIZE).toBe(32);
        expect(R).toBe(16);
        // hexW = sqrt(3) * 16 ≈ 27.7128...
        expect(hexW).toBeCloseTo(16 * Math.sqrt(3), 4);
    });

    it('should generate correct vertices without pixel-distortion (Pixel Perfect)', () => {
        const verts = getHexVertices();
        expect(verts).toHaveLength(12); // 6 points (x,y)
        // Top point should be pure vertical radius
        expect(verts[0]).toBe(0);
        expect(verts[1]).toBe(-16);
        // Bottom point
        expect(verts[6]).toBe(0);
        expect(verts[7]).toBe(16);
    });

    it('should calculate accurate Center Points based on column and row (Odd-R offset)', () => {
        // Row 0, Col 0 => Center X should be hexW / 2
        const p00 = getHexCenter(0, 0);
        expect(p00.x).toBeCloseTo(hexW / 2, 4);
        expect(p00.y).toBeCloseTo(16, 4); // R

        // Row 1, Col 0 => Odd row is offset by + hexW / 2
        const p01 = getHexCenter(0, 1);
        expect(p01.x).toBeCloseTo((hexW / 2) + (hexW / 2), 4);
        expect(p01.y).toBeCloseTo(1 * 1.5 * 16 + 16, 4);
    });

    it('should correctly interconvert Mouse Pixel Coords -> Axial -> Array Matrix Offset', () => {
        // Target index
        const col = 2;
        const row = 3;

        // Get graphic center point mapping
        const center = getHexCenter(col, row);

        // Let's pretend user clicked exactly on center point but relative to tile bounding box
        // getHexCenter returns center relative to world (it includes internal +hexW/2 offset).
        // Let's simulate clicking at that absolute center.

        const px = center.x - (hexW / 2); // Undo the padding shift applied during paint event
        const py = center.y - R;

        const axial = pixelToAxial(px, py);
        const cube = cubeRound(axial);
        const offset = axialToOffset(cube.q, cube.r);

        expect(offset.c).toBe(col);
        expect(offset.r).toBe(row);
    });
});
