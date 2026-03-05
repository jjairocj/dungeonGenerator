// ─── Layout constants ─────────────────────────────────────────────────────────
export const TILE_SIZE = 32; // Origin distance for mathematical polygon calculations
export const R = TILE_SIZE / 2; // Hex radius (distance from center to vertex)
export const hexW = Math.sqrt(3) * R; // Width of a pointy-top hex
export const hexH = 2 * R; // Height of a pointy-top hex

// Helper functions for Hex Math (Pointy Top, Odd-R offset)
export const getHexCenter = (col, row) => {
    const x = col * hexW + (row % 2 !== 0 ? hexW / 2 : 0) + hexW / 2;
    const y = row * 1.5 * R + R;
    return { x, y };
};

// Pixel to Axial coordinate conversion
export const pixelToAxial = (x, y) => {
    const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / R;
    const r = (2 / 3 * y) / R;
    return { q, r, s: -q - r };
};

// Cube rounding to find nearest canonical hex center
export const cubeRound = (frac) => {
    let q = Math.round(frac.q);
    let r = Math.round(frac.r);
    let s = Math.round(frac.s);

    const q_diff = Math.abs(q - frac.q);
    const r_diff = Math.abs(r - frac.r);
    const s_diff = Math.abs(s - frac.s);

    if (q_diff > r_diff && q_diff > s_diff) {
        q = -r - s;
    } else if (r_diff > s_diff) {
        r = -q - s;
    } else {
        s = -q - r;
    }
    return { q, r, s };
};

// Axial to offset (Odd-R) conversion
export const axialToOffset = (q, r) => {
    const col = q + (r - (r & 1)) / 2;
    const row = r;
    return { c: col, r: row };
};

// Calculates base vertices for the pointy-top hex
export const getHexVertices = () => {
    return [
        0, -R,
        R * Math.cos(Math.PI / 6), -R * Math.sin(Math.PI / 6),
        R * Math.cos(Math.PI / 6), R * Math.sin(Math.PI / 6),
        0, R,
        -R * Math.cos(Math.PI / 6), R * Math.sin(Math.PI / 6),
        -R * Math.cos(Math.PI / 6), -R * Math.sin(Math.PI / 6),
    ];
};
