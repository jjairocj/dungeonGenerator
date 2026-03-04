import { Application, Graphics, Filter, Container, Sprite, Texture, Text, TextStyle } from 'pixi.js';
import { waterFragmentSrc, waterVertexSrc } from '../shaders/waterShader';
import { lavaFragmentSrc, lavaVertexSrc } from '../shaders/lavaShader';

const TILE_SIZE = 52;
const TILE_GAP = 1;

// Tile color palette
const TILE_COLORS = {
    grass: { base: 0x5a9e5c, detail: 0x3d7a3f, shade: 0x2d5e2f },
    dirt: { base: 0x8b6340, detail: 0x6e4e30, shade: 0x5a3d24 },
    stone: { base: 0x8a8a9a, detail: 0x6a6a7a, shade: 0x4a4a5a },
    water: { base: 0x2980b9, detail: 0x1a6091, shade: 0x0d4f7a },
    sand: { base: 0xd4a853, detail: 0xb8893a, shade: 0x9a7030 },
    lava: { base: 0xe74c3c, detail: 0xc0392b, shade: 0x922b21 },
    snow: { base: 0xdceef8, detail: 0xb8d8ee, shade: 0x90b8d4 },
    forest: { base: 0x27ae60, detail: 0x1e8449, shade: 0x145a32 },
    dungeon: { base: 0x2c2c3c, detail: 0x1c1c2c, shade: 0x0c0c1c },
    wall: { base: 0x5a5a7a, detail: 0x3a3a5a, shade: 0x2a2a4a },
};

// Draw a tile using Graphics (no sprite needed for POC)
export function drawTile(gfx, col, row, tileType, tileSize = TILE_SIZE, gap = TILE_GAP) {
    const x = col * (tileSize + gap);
    const y = row * (tileSize + gap);
    const colors = TILE_COLORS[tileType] || TILE_COLORS.grass;

    gfx.clear();

    // Base tile
    gfx.beginFill(colors.base);
    gfx.drawRoundedRect(0, 0, tileSize, tileSize, 3);
    gfx.endFill();

    // Top-left bevel (lighter)
    gfx.beginFill(colors.detail, 0.4);
    gfx.drawRoundedRect(0, 0, tileSize, 4, 2);
    gfx.drawRoundedRect(0, 0, 4, tileSize, 2);
    gfx.endFill();

    // Bottom-right shadow (darker)
    gfx.beginFill(colors.shade, 0.5);
    gfx.drawRoundedRect(0, tileSize - 4, tileSize, 4, 2);
    gfx.drawRoundedRect(tileSize - 4, 0, 4, tileSize, 2);
    gfx.endFill();

    // Tile-specific decorations
    if (tileType === 'grass') {
        // Small grass tufts
        gfx.beginFill(0x3d7a3f, 0.6);
        [[8, 14], [20, 20], [32, 12], [40, 22], [14, 34], [38, 36]].forEach(([dx, dy]) => {
            gfx.drawEllipse(dx, dy, 3, 2);
        });
        gfx.endFill();
    } else if (tileType === 'stone') {
        // Stone cracks
        gfx.lineStyle(1, colors.shade, 0.5);
        gfx.moveTo(10, 10); gfx.lineTo(20, 25);
        gfx.moveTo(25, 5); gfx.lineTo(35, 20);
        gfx.moveTo(15, 32); gfx.lineTo(28, 40);
        gfx.lineStyle(0);
    } else if (tileType === 'forest') {
        // Tree shapes
        gfx.beginFill(0x1e5c2a, 0.8);
        gfx.drawPolygon([16, 8, 10, 24, 22, 24]);
        gfx.drawPolygon([32, 12, 26, 26, 38, 26]);
        gfx.endFill();
        gfx.beginFill(0x5a3320, 0.9);
        gfx.drawRect(14, 24, 5, 8);
        gfx.drawRect(30, 26, 5, 8);
        gfx.endFill();
    } else if (tileType === 'sand') {
        // Sand ripples
        gfx.lineStyle(1, 0xb8893a, 0.4);
        for (let i = 0; i < 4; i++) {
            gfx.drawEllipse(tileSize / 2, 12 + i * 10, tileSize / 3, 3);
        }
        gfx.lineStyle(0);
    } else if (tileType === 'snow') {
        // Snowflake dots
        gfx.beginFill(0xffffff, 0.6);
        [[10, 10], [30, 8], [18, 26], [38, 30], [8, 36], [26, 42]].forEach(([dx, dy]) => {
            gfx.drawCircle(dx, dy, 2);
        });
        gfx.endFill();
    } else if (tileType === 'dungeon') {
        // Dungeon floor lines
        gfx.lineStyle(1, 0x3a3a5a, 0.6);
        gfx.moveTo(0, tileSize / 2); gfx.lineTo(tileSize, tileSize / 2);
        gfx.moveTo(tileSize / 2, 0); gfx.lineTo(tileSize / 2, tileSize);
        gfx.lineStyle(0);
    } else if (tileType === 'wall') {
        // Brick pattern
        gfx.beginFill(colors.shade, 0.4);
        const bh = tileSize / 4;
        for (let row = 0; row < 4; row++) {
            const offset = row % 2 === 0 ? 0 : tileSize / 4;
            for (let col = 0; col < 3; col++) {
                gfx.drawRect(col * (tileSize / 2) + offset, row * bh + 1, tileSize / 2 - 2, bh - 2);
            }
        }
        gfx.endFill();
    }

    gfx.x = x;
    gfx.y = y;
}

// Create a Water filter (PixiJS v8 compatible approach)
export function createWaterFilter(time) {
    // We use PixiJS built-in ColorMatrixFilter as base; actual shader is handled via Canvas2D in PixiRenderer
    // For the POC we achieve the water effect via animated Graphics redraws
    return null;
}

export { TILE_SIZE, TILE_GAP, TILE_COLORS };
