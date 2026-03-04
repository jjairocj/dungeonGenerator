---
name: PixiJS v8 — D&D Map Renderer
description: Use when writing or debugging PixiJS v8 code for the D&D Tile Map Editor. Covers rendering patterns, water effects, tile caching, particle systems, React integration, and top-down RPG visual style (Zelda/Hyper Light Drifter).
dependencies: pixi.js>=8.0.0
---

## Overview

This skill provides battle-tested patterns for PixiJS v8 in the context of the D&D Map Editor (`/src/renderers/PixiBoard.jsx`). The renderer uses React 18 with `useRef`/`useEffect` to host a PixiJS canvas instance that renders a tile grid with animated effects.

**When to apply this skill:**
- Writing or modifying `PixiBoard.jsx` or any new PixiJS renderer component
- Implementing visual effects (water, lava, rain, fog, snow)
- Debugging rendering issues (black screen, frozen canvas, memory leaks)
- Performance refactoring (switching from Graphics to Sprites, adding ParticleContainers)
- Implementing new tile types or biome-based visual styles

## Core Architecture

```
app.stage (Application root)
├── waterContainer    ← Water tiles only, has DisplacementFilter applied
├── tileContainer     ← All other tile Sprites (static, batched)
├── effectsContainer  ← Rain, embers, cloud particles
│   ├── cloudCont
│   ├── rainCont      ← ParticleContainer (fast)
│   └── emberCont     ← ParticleContainer (fast)
└── (dispSprite)      ← renderable=false, only for DisplacementFilter
```

## React + PixiJS Setup Pattern

```jsx
const appRef = useRef(null);
const canvasRef = useRef(null);

useEffect(() => {
  // Guard against React 18 StrictMode double-mount
  if (appRef.current) return;

  const app = new Application();
  appRef.current = app;

  const init = async () => {
    await app.init({
      canvas: canvasRef.current,
      width: boardW, height: boardH,
      background: 0x0a0a0f,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    // ... build scene ...
  };

  init();

  return () => {
    cancelAnimationFrame(rafRef.current);
    app.destroy({ removeView: true, children: true });
    appRef.current = null;
  };
}, []);
```

## Performance: Texture Caching (Key Pattern)

**Never create a new `Graphics` per tile per frame.** Generate one texture per tile type at boot and reuse as `Sprite`:

```js
// At init time — once per tile type
const textureCache = {};
const staticTypes = ['grass', 'dirt', 'stone', 'wall', 'sand', 'snow', 'dungeon'];

staticTypes.forEach(type => {
  const g = new Graphics();
  drawTileVisuals(g, type); // your draw function
  textureCache[type] = app.renderer.generateTexture(g);
  g.destroy(); // free Graphics, GPU keeps texture
});

// Per tile in the grid
const sprite = new Sprite(textureCache[tileType]);
sprite.x = col * TILE_SIZE;
sprite.y = row * TILE_SIZE;
tileContainer.addChild(sprite);
```

**Result:** Entire grid renders with 1–2 WebGL draw calls instead of thousands.

## Water: DisplacementFilter (RedStapler Technique)

Uses `cloud.jpg` from `public/` as noise map. See `resources/water_effect.md` for full details.

```js
// Load noise texture (cloud.jpg must be in /public/)
const dispTexture = await Assets.load('/cloud.jpg');
if (dispTexture.source) dispTexture.source.addressMode = 'repeat'; // v8 API

const dispSprite = new Sprite(dispTexture);
dispSprite.renderable = false; // invisible but needed by filter
app.stage.addChild(dispSprite);

const dispFilter = new DisplacementFilter({ sprite: dispSprite, scale: { x: 20, y: 20 } });
waterContainer.filters = [dispFilter];

// In animation loop:
dispSprite.x += 1;
dispSprite.y -= 1;
```

## Animated Effects: ParticleContainer

For >100 simultaneous particles (rain, embers): use `ParticleContainer` + a shared texture.

```js
// Generate micro-texture once
const g = new Graphics();
g.moveTo(0, 0); g.lineTo(2, 12);
g.stroke({ color: 0xa0c8ff, width: 1.5 });
const rainTex = app.renderer.generateTexture(g);
g.destroy();

// ParticleContainer is 10–100x faster than Container for Sprites
const rainCont = new ParticleContainer(300, { position: true, alpha: true });

// Object pool: create once, reuse forever
const pool = Array.from({ length: 150 }, () => {
  const s = new Sprite(rainTex);
  s.x = Math.random() * boardW;
  s.y = Math.random() * boardH;
  rainCont.addChild(s);
  return { sprite: s, vy: 5 + Math.random() * 4 };
});

// Animation loop:
pool.forEach(p => {
  p.sprite.y += p.vy;
  if (p.sprite.y > boardH) { p.sprite.y = -15; p.sprite.x = Math.random() * boardW; }
});
```

## Dynamic Tile Painting (React State → Pixi Sync)

When user paints tiles, the store changes `tiles[key]`. Sync in `useEffect([tiles])`:

```js
useEffect(() => {
  Object.entries(tilesGfxRef.current).forEach(([key, entry]) => {
    const newType = tiles[key] || 'grass';
    if (entry.type === newType) return; // no change

    // Move to correct display layer
    if (newType === 'water') {
      waterCont.addChild(entry.gfx);
    } else {
      tileCont.addChild(entry.gfx);
    }

    entry.type = newType;
    // Redraw static tiles immediately
    if (!['lava', 'forest', 'grass'].includes(newType)) {
      drawTile(entry.gfx, entry.col, entry.row, newType, 0);
    }
  });
}, [tiles]);
```

## Common Issues & Fixes

| Symptom | Cause | Fix |
|---|---|---|
| Black canvas | `DisplacementFilter` API error or async race | Use `await Assets.load()`, check `dispTexture.source.addressMode = 'repeat'` |
| White blobs on screen | DisplacementSprite rendering visually | Add `dispSprite.renderable = false` |
| Painted tiles don't appear | Tile not moved to correct Container | Move display object: `waterCont.addChild(gfx)` or `tileCont.addChild(gfx)` |
| Double Pixi instance (dev) | React StrictMode double-mount | Guard with `if (appRef.current) return;` |
| Memory leak on 2D→3D switch | App not destroyed | `app.destroy({ removeView: true, children: true }); appRef.current = null;` |
| `wrapMode` deprecated | Old v5/v6 API | Use `texture.source.addressMode = 'repeat'` (v8) |
| ParticleContainer filter ignored | Not supported | Use normal `Container` if you need filters |

## Visual Style Reference

Target aesthetic: **top-down pixel RPG** (Zelda: Echoes of Wisdom / Hyper Light Drifter)
- Tile edges: sharp rectangular, no border radius on full tiles
- Water: solid cyan base (`0x2b9ec2`) with white caustic highlights (`0x68def6`)
- No grid deformation — the `DisplacementFilter` must be scoped to `waterContainer` only
- Color palette is saturated and high-contrast

See `resources/tile_styles.md` for per-tile color specs and drawing patterns.

## Production Reference: Endigo Design Architecture

Studied from real production source code at https://github.com/endigo9740/endigo-design/tree/v1.
Full annotated analysis in `resources/endigo_architecture.md`.

**Key patterns found:**
- `World`: single PNG sprite loaded from Tiled — no per-tile rendering at design time
- `Camera`: drag-pan with `adjustForWorldBounds()` + animated transition via `invlerp`
- `Grid`: `TilingSprite` for the grid overlay (much faster than drawing lines) + `BitmapText` for coordinates
- `GameObject`: `AnimatedSprite` from spritesheet JSON, preset pathing array, `ColorMatrixFilter` hover
- `tile.unit(n)`: helper `size * zoom * n` (tile.size=16, tile.zoom=2 → tile.unit(1) = 32px)

> Note: Endigo uses **PixiJS v5**. For our v8 app, see the migration table in `resources/endigo_architecture.md`.

## Resources

- `resources/endigo_architecture.md` — Real production code patterns from Endigo Design (World, Camera, Grid, GameObject)
- `resources/water_effect.md` — Full water + DisplacementFilter setup details
- `resources/tile_styles.md` — Color palettes and drawing patterns per tile type
- `resources/performance_patterns.md` — Benchmarks and when to apply each optimization
