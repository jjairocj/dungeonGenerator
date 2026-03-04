# Endigo Design Architecture Reference

Source: https://github.com/endigo9740/endigo-design/tree/v1

Real-world production PixiJS game. Top-down pixel RPG portfolio with camera, animated entities, world map from Tiled/PNG, and interactive NPCs. This file documents the actual code patterns used.

## Tile System

```ts
// stores.ts — global tile size config
export const tile = {
  size: 16,     // px per tile in the PNG
  zoom: 2,      // zoom multiplier (matches Tiled export setting)
  unit: (v: number) => tile.size * tile.zoom * v  // helper: 1 tile = 32px
};
// tile.unit(1)  → 32px
// tile.unit(5)  → 160px
```

## World Map (Overworld PNG)

The world is a single large PNG generated from **Tiled**, loaded as a PixiJS Sprite:

```ts
// World.ts
export class World {
  public sprite: PIXI.Sprite;

  constructor(config: { texture: PIXI.Texture }) {
    this.texture = config.texture;
    this.sprite = PIXI.Sprite.from(this.texture);
    // Scale up from native pixel size to zoomed display size
    this.sprite.width  = this.sprite.width  * tile.zoom;
    this.sprite.height = this.sprite.height * tile.zoom;
  }
}
```

**Key insight**: The entire world is ONE sprite. No per-tile rendering. All visual complexity lives in the PNG asset.

## Camera System

Full implementation with drag-pan, world bounds clamping, and animated transitions:

```ts
// Camera.ts — core patterns
export class Camera {
  private position = { x: 0, y: 0 };
  private cameraSpeed = 25; // px per frame during transition
  private lastDragPosition: any = null;
  private startPosition = { x: null, y: null };
  private endPosition   = { x: null, y: null };

  // Drag to pan
  onPointerMove(e: any) {
    if (this.lastDragPosition) {
      this.position.x += Math.round(e.data.global.x - this.lastDragPosition.x);
      this.position.y += Math.round(e.data.global.y - this.lastDragPosition.y);
      this.lastDragPosition = { x: e.data.global.x, y: e.data.global.y };
      this.adjustForWorldBounds();
    }
  }

  // Clamp camera to world edges — never show void
  adjustForWorldBounds() {
    const maxX = this.container.width  - this.app.screen.width;
    const maxY = this.container.height - this.app.screen.height;
    this.position.x = clamp(this.position.x, -maxX, 0);
    this.position.y = clamp(this.position.y, -maxY, 0);
  }

  // Center on any game entity (NPC, pillar, etc.)
  centerOnGameObject(settings: { target: any, animate: boolean }) {
    this.centerOnCoords({
      x: settings.target.container.x,
      y: settings.target.container.y,
      targetWidth:  settings.target.container.width,
      targetHeight: settings.target.container.height,
      animate: settings.animate
    });
  }

  centerOnCoords(s: { x, y, targetWidth, targetHeight, animate }) {
    let targetX = -Math.round(s.x) + Math.round(this.app.screen.width  / 2) - Math.round(s.targetHeight / 2);
    let targetY = -Math.round(s.y) + Math.round(this.app.screen.height / 2) - Math.round(s.targetWidth  / 2);
    if (s.animate) {
      this.setTargetPositionCoords(targetX, targetY); // smooth pan
    } else {
      this.position = { x: targetX, y: targetY };
      this.adjustForWorldBounds();
    }
  }

  // Animated transition using inverse lerp to track progress
  transitionPositionCoords(axis: 'x' | 'y') {
    if (this.endPosition[axis] !== null) {
      const progress = invlerp(this.endPosition[axis], this.startPosition[axis], this.position[axis]) * 100;
      if (progress === 0) {
        this.startPosition[axis] = this.endPosition[axis] = null;
        this.adjustForWorldBounds();
      } else {
        this.endPosition[axis] <= this.startPosition[axis]
          ? (this.position[axis] -= this.cameraSpeed)
          : (this.position[axis] += this.cameraSpeed);
      }
    }
  }

  // Called every tick — apply camera position to containerLevel
  render() {
    this.transitionPositionCoords('x');
    this.transitionPositionCoords('y');
  }
}

// utils.ts helpers used by Camera
const clamp  = (val, min, max) => Math.min(max, Math.max(min, val));
const invlerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
```

**Usage in ticker:**
```ts
game.ticker.add((delta) => {
  containerLevel.position.x = camera.position.x;
  containerLevel.position.y = camera.position.y;
  camera.render(); // advance animated transitions
});
```

## Grid Overlay (Debug)

```ts
// Grid.ts — TilingSprite for performance
renderGrid() {
  const tilingCell = new PIXI.TilingSprite(this.texture, this.container.width, this.container.height);
  tilingCell.alpha = 0.25;
  this.container.addChild(tilingCell);
}

// BitmapFont for grid coords (BitmapText is much faster than regular Text)
renderCoords() {
  PIXI.BitmapFont.from('MyFont', { fill: '#FFFFFF', fontSize: 10, fontWeight: 'bold' });
  for (let y = 0; y < worldHeight; y++) {
    for (let x = 0; x < worldWidth; x++) {
      const label = new PIXI.BitmapText(`${x} x ${y}`, { fontName: 'MyFont' });
      label.x = tile.unit(x + 0.5);
      label.y = tile.unit(y + 0.5);
      label.anchor.x = label.anchor.y = 0.5;
      this.container.addChild(label);
    }
  }
}
```

## GameObject (AnimatedSprite + Pathing + Hover Filter)

```ts
// GameObject.ts
export class GameObject {
  public container: PIXI.Container = new PIXI.Container();
  public animatedSprite: PIXI.AnimatedSprite;

  constructor(config: any) {
    // Load spritesheet textures from loader
    const sheet = this.loader.resources[this.resource].spritesheet.textures;
    this.animatedSprite = new PIXI.AnimatedSprite(Object.values(sheet));
    this.animatedSprite.animationSpeed = 0.15;
    this.animatedSprite.anchor.set(0.5, 0.5); // center anchor
    this.container.addChild(this.animatedSprite);

    // On hover — brightness filter
    this.container.on('pointerover', () => {
      const f = new PIXI.filters.ColorMatrixFilter();
      f.brightness(1.3, false);
      this.container.filters = [f];
    });
    this.container.on('pointerout', () => {
      this.container.filters = [];
    });
    // On click — focus camera + trigger dialog
    this.container.on('pointerdown', () => {
      cameraStore.set({ type: 'entity', target: this, animate: true });
      dialogStore.set({ name: this.name, message: this.dialog, portrait: this.portrait });
    });
  }

  // Pathing: move along a preset array of directions
  // path = [{ direction: 'right', delay: 0 }, { direction: 'wait', delay: 2000 }, ...]
  pathing() {
    const currentPath = this.path[this.pathIndex];
    if (currentPath.direction === 'up')    this.container.y -= 1;
    if (currentPath.direction === 'down')  this.container.y += 1;
    if (currentPath.direction === 'left')  { this.mirrorAxisX(-1); this.container.x -= 1; }
    if (currentPath.direction === 'right') { this.mirrorAxisX(1);  this.container.x += 1; }
    if (currentPath.direction === 'wait')  this.handleWait(currentPath.delay);
    this.pathProgress -= 1;
  }

  mirrorAxisX(scale: number) {
    // Flip sprite horizontally for left/right movement
    if (this.container.scale.x !== scale) {
      this.container.scale.x = scale;
      this.container.x -= this.container.width; // compensate for scale shift
    }
  }

  render(elapsed?: number) {
    this.pathing();
  }
}
```

## Asset Loading Flow (v5 Loader)

> Note: This repo uses **PixiJS v5** (`PIXI.Loader`). In **PixiJS v8**, use `Assets.load()` instead.

```svelte
<!-- GameCanvas.svelte — complete game init flow -->
<script>
  import * as PIXI from 'pixi.js';

  // v5: NEAREST prevents blurry pixel art
  PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

  const game = new PIXI.Application({ view: elemCanvas, resizeTo: document.body });

  // Queue all assets
  ['overworld.png', 'grid.png', 'entities/npc-chris.json'].forEach(r => game.loader.add(r));

  // Track loading progress
  game.loader.onProgress.add(loader => { loading.amount = Math.ceil(loader.progress); });

  // On complete
  game.loader.load((loader, resources) => {
    const containerLevel = new PIXI.Container();
    const world  = new World({ texture: resources['overworld.png'].texture });
    const camera = new Camera({ app: game, container: containerLevel });
    const grid   = new Grid({ container: containerLevel, enabled: false });

    containerLevel.addChild(world.sprite);
    game.stage.addChild(containerLevel);

    // Ticker: update camera + entity positions each frame
    game.ticker.add((delta) => {
      containerLevel.position.x = camera.position.x;
      containerLevel.position.y = camera.position.y;
      npcs.forEach(npc => npc.render(elapsed));
      camera.render();
    });
  });

  // v8 equivalent:
  // await Assets.load(['overworld.png', 'entities/npc-chris.json']);
  // const worldSprite = Sprite.from('overworld.png');
</script>
```

## Key Differences: Endigo v5 vs Our PixiJS v8

| Feature | Endigo (v5) | Our App (v8) |
|---|---|---|
| Asset loading | `PIXI.Loader` | `Assets.load()` async |
| Pixel art setting | `PIXI.settings.SCALE_MODE = NEAREST` | `TextureStyle.scaleMode = 'nearest'` |
| Sprite create | `PIXI.Sprite.from(texture)` | `Sprite.from(alias)` or `new Sprite(texture)` |
| Filter namespace | `PIXI.filters.ColorMatrixFilter` | `import { ColorMatrixFilter } from 'pixi.js'` |
| App init | `new PIXI.Application({})` (sync) | `await app.init({})` (async) |
| wrapMode | `texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT` | `texture.source.addressMode = 'repeat'` |
| Ticker | `game.ticker.add(delta => {})` | Same ✅ |
| Container | `new PIXI.Container()` | `new Container()` ✅ |
| AnimatedSprite | `new PIXI.AnimatedSprite(frames)` | `new AnimatedSprite(frames)` ✅ |
| BitmapFont | `PIXI.BitmapFont.from(...)` | `BitmapFont.install(...)` (API changed) |
