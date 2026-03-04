# Tile Styles: Color Palettes & Drawing Patterns

Visual specs for each tile type in the D&D Map Editor. Target aesthetic: top-down pixel RPG (Zelda EoW / Hyper Light Drifter).

## Color Constants

```js
const TILE_COLORS = {
  grass:   { base: 0x4caf63, shade: 0x3a7a3f, detail: 0x60d475 },
  dirt:    { base: 0xa0724a, shade: 0x7a5535, detail: 0xb88f68 },
  stone:   { base: 0x7a7a8c, shade: 0x5a5a6a, detail: 0x9a9aac },
  wall:    { base: 0x5a4a3a, shade: 0x3e3228, detail: 0x7a6a5a },
  water:   { base: 0x2b9ec2, shade: 0x1d7c9a, detail: 0x68def6 },
  lava:    { base: 0xb84c10, shade: 0x8c3408, detail: 0xff7733 },
  sand:    { base: 0xd4a84b, shade: 0xa07830, detail: 0xf0c870 },
  snow:    { base: 0xe8eef5, shade: 0xc0ccd8, detail: 0xffffff },
  forest:  { base: 0x2d6e35, shade: 0x1e4a24, detail: 0x4a9e56 },
  dungeon: { base: 0x2a2535, shade: 0x1a1525, detail: 0x3a3550 },
};
const TILE_SIZE = 50;
```

## Drawing Patterns

### Grass
```js
// Animated — redraw each frame with wind offset
gfx.roundRect(0, 0, TILE_SIZE, TILE_SIZE, 3);
gfx.fill({ color: colors.base });
// Light top bevel
gfx.rect(0, 0, TILE_SIZE, 3);
gfx.fill({ color: 0x7ac47c, alpha: 0.4 });
// Grass tufts (wind animated)
const wind = fx.wind ? Math.sin(t * 2.2 + col * 0.6) * fx.windIntensity * 3 : 0;
[[8,36],[14,28],[24,34],[34,26],[42,36]].forEach(([gx, gy]) => {
  gfx.moveTo(gx, gy); gfx.lineTo(gx + wind + 1, gy - 8);
  gfx.stroke({ color: 0x3d7a3f, width: 1.5, alpha: 0.8 });
});
```

### Stone
```js
gfx.roundRect(0, 0, TILE_SIZE, TILE_SIZE, 3);
gfx.fill({ color: colors.base });
// Crack lines
[[10,15,22,30],[28,8,40,22],[12,36,28,44]].forEach(([x1,y1,x2,y2]) => {
  gfx.moveTo(x1,y1); gfx.lineTo(x2,y2);
  gfx.stroke({ color: colors.shade, width: 1, alpha: 0.4 });
});
```

### Wall (Brick pattern)
```js
gfx.roundRect(0, 0, TILE_SIZE, TILE_SIZE, 3);
gfx.fill({ color: colors.base });
const bh = TILE_SIZE / 4;
for (let r = 0; r < 4; r++) {
  const off = r % 2 === 0 ? 0 : TILE_SIZE / 4;
  for (let c = 0; c < 3; c++) {
    gfx.rect(c * (TILE_SIZE / 2) + off, r * bh + 1, TILE_SIZE / 2 - 2, bh - 2);
    gfx.fill({ color: colors.shade, alpha: 0.35 });
  }
}
```

### Lava (Animated)
```js
// Bubbling lava — redraw each frame
gfx.roundRect(0, 0, TILE_SIZE, TILE_SIZE, 3);
gfx.fill({ color: colors.base });
// Animated glow blobs
[[10,15],[30,25],[20,35],[38,18]].forEach(([bx, by]) => {
  const pulse = (Math.sin(t * 2 + bx * 0.3 + by * 0.2) + 1) / 2;
  gfx.circle(bx, by, 5 + pulse * 3);
  gfx.fill({ color: colors.detail, alpha: 0.3 + pulse * 0.5 });
});
```

### Dungeon
```js
gfx.roundRect(0, 0, TILE_SIZE, TILE_SIZE, 3);
gfx.fill({ color: colors.base });
// Cross-hatch mortar lines
gfx.moveTo(0, TILE_SIZE/2); gfx.lineTo(TILE_SIZE, TILE_SIZE/2);
gfx.moveTo(TILE_SIZE/2, 0); gfx.lineTo(TILE_SIZE/2, TILE_SIZE);
gfx.stroke({ color: 0x3a3a5a, width: 1, alpha: 0.5 });
```

## Animated vs Static Tiles

| Tile | Animated | Redraw Frequency |
|---|---|---|
| `grass` | ✅ (wind) | Every frame when wind enabled |
| `lava` | ✅ (bubbling glow) | Every frame |
| `forest` | ✅ (sway) | Every frame |
| `water` | ✅ (via filter) | Static draw, filter animates it |
| `dirt`, `stone`, `wall`, `sand`, `snow`, `dungeon` | ❌ | Once at paint time |

> **Key optimization**: Only animate tiles that need it. Static tiles should use `generateTexture` + `Sprite` to avoid per-frame draw calls.

## Visual Style Notes (Zelda / HLD Reference)

- **No gradient fills** — use flat colors with bevels and overlaid shapes
- **Bevel** = 3px top-left lighter, 3px bottom-right darker
- **Tile edges**: Keep `roundRect(0, 0, TILE_SIZE, TILE_SIZE, 3)` for all tiles — small radius only
- **Line details**: always low alpha (0.3-0.5), width 1-1.5px
- **Tile SIZE**: currently `50px` per tile, grid `STEP = 52px` (includes 2px gap)
