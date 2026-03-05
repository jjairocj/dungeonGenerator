# DNDTiles — User Epic
*D&D Interactive Map Editor & Live Board para TV Display — **2D Top-Down (PixiJS v8)***

> **Decisión de renderizado:** Solo 2D con PixiJS 8 (WebGL/WebGPU). La TV usada como mesa de juego horizontal hace que el top-down 2D sea la vista perfecta. El 3D isométrico no aportaría valor en este contexto.

> **Visión**: Una aplicación web que permite al Dungeon Master diseñar, animar y mostrar mapas de D&D en una TV en tiempo real, con controles en una segunda pantalla/tab y efectos atmosféricos cinematográficos.

> **Estilo visual de referencia:** Pixel art top-down estilo *Zelda: Echoes of Wisdom* / *Hyper Light Drifter*. Paleta saturada, bordes limpios, agua con highlights geométricos, tiles procedurales con `Graphics` + texturas cacheadas con `generateTexture`.

---

## Arquitectura de Alto Nivel

```
┌─────────────────────────────────┐        ┌──────────────────────────────────┐
│     DM Panel (control tab)      │  WS /  │     Game Board (TV screen)       │
│  - Herramientas de mapa          │ store  │  - PixiJS 2D canvas              │
│  - Paleta de tiles/texturas      │──────▶ │  - Camera pan/zoom               │
│  - Tokens & NPCs                 │        │  - Fog of War overlay            │
│  - Efectos atmosféricos          │        │  - Efectos de agua/fuego/lluvia  │
│  - Generadores de nombres        │        │  - Partículas ambientales        │
│  - Audio/ambiente                │        │  - Tokens de personajes          │
│  - Exportar / importar           │        │  - AnimatedSprite entities       │
└─────────────────────────────────┘        └──────────────────────────────────┘
```

### PixiJS Display Tree (arquitectura interna del renderer)

```
app.stage
├── worldContainer        ← Tiles del mapa (waterCont + tileCont)
│   ├── waterContainer    ← Tiles de agua (con DisplacementFilter)
│   └── tileContainer     ← Todos los demás tiles (generateTexture + Sprite)
├── entityContainer       ← Tokens, NPCs, criaturas (AnimatedSprite)
├── fxContainer           ← Partículas atmosféricas (ParticleContainer)
│   ├── rainContainer     ← Lluvia (ParticleContainer, fast)
│   ├── emberContainer    ← Cenizas/lava (ParticleContainer, fast)
│   └── cloudContainer    ← Nubes (Container con Sprites)
├── fowContainer          ← Fog of War (Graphics o RenderTexture mask)
└── uiContainer           ← HUD, etiquetas (no afectado por efectos globales)
```

---

## EPIC 1 — Lienzo y Sistema de Grid 🗺️

### MVP

> [!IMPORTANT]
> **Normativa de Aseguramiento de Calidad (Hitos y User Epics)**: Toda nueva feature, re-estructuración matemática o de renderizado (Especialmente Grid y Geometría) **DEBE** ir siempre acompañada de su respectivo Test Unitario en `Vitest` antes del Commit con el fin de evitar regresiones visuales (Pixel Perfect preservation).

| ID | Historia de usuario |
|----|---------------------|
| G-01 | Como DM, quiero un canvas de mapa configurable (tamaño en tiles: 20×20 hasta 100×100) para adaptarlo a escenas pequeñas o grandes. |
| G-02 | Como DM, quiero un grid cuadrado visible con opción de ocultarlo en la pantalla del jugador, para referencia de posicionamiento. |
| G-03 | Como DM, quiero hacer zoom y pan en el mapa con scroll + arrastre (drag-to-pan con clamp de bordes del mundo), para trabajar en mapas grandes. |
| G-04 | Como DM, quiero pintar tiles con click + drag (modo brocha), para crear terreno rápidamente. |
| G-05 | Como DM, quiero usar flood fill (balde de pintura) en una región contigua, para rellenar áreas grandes en un clic. |
| G-06 | Como DM, quiero un modo borrador para eliminar tiles del mapa. |
| G-07 | Como DM, quiero deshacer/rehacer acciones (Ctrl+Z / Ctrl+Y) con historial de al menos 50 pasos. |

> **Nota técnica G-02:** Para el grid overlay, usar `TilingSprite` con una textura PNG de celda de grid (16×16). Mucho más eficiente que dibujar líneas individuales. Toggle de alpha entre 0 (invisible) y 0.25 (debug visible).

> **Nota técnica G-03:** Implementar la clase `Camera` con `adjustForWorldBounds()` (clamp a bordes del mundo) y `centerOnTarget()` con transición suave via `invlerp` (patrón extraído del portfolio de Endigo).

### V2+

| ID | Historia de usuario |
|----|---------------------|
| G-08 | Como DM, quiero una herramienta rectangulo/elipse para dibujar regiones geométricas con un solo gesto. |
| G-09 | Como DM, quiero layers/capas (terreno base, decoraciones, objetos, tokens) para organizar el mapa. |
| G-10 | Como DM, quiero un grid hexagonal como alternativa al grid cuadrado. |
| G-11 | Como DM, quiero mapas multi-nivel (planta baja, 1er piso, subterráneo) con transición visual. |
| G-12 | Como DM, quiero guardar y cargar "stamps" (selecciones de tiles) para reutilizar habitaciones. |
| G-13 | Como DM, quiero una herramienta de selección de área para copiar/pegar secciones del mapa. |

---

## EPIC 2 — Tiles, Texturas y Biomas 🌿

### MVP

| ID | Historia de usuario |
|----|---------------------|
| T-01 | Como DM, quiero una paleta de tiles dividida por bioma (Plains, Forest, Water, Dungeon, Lava, Cave, Snow, Desert) para pintar el escenario. |
| T-02 | Como DM, quiero tiles con animaciones procedurales integradas (agua ondeante, lava pulsante, viento en hierba) para dar vida al mapa sin assets externos. |
| T-03 | Como DM, quiero seleccionar un bioma y que el tablero se llene completamente con ese tile de base (flood-fill global). |
| T-04 | Como DM, quiero ver una miniatura del tile antes de pintarlo para saber qué estoy seleccionando. |
| T-05 | Como DM, quiero tiles de transición automática entre biomas para que los bordes no se vean abruptos. |

> **Nota técnica T-02:** Los tiles estáticos (stone, dirt, wall, sand, snow, dungeon) se precompilan como texturas con `app.renderer.generateTexture(graphics)` al iniciar, y se instancian como `Sprite(textureCache[type])`. Esto reduce los draw calls de miles a 1–2 por frame. Los tiles animados (grass, lava, forest, water) se redibujan selectivamente en el render loop.

> **Nota técnica T-02 — Agua:** El tile de agua usa una base de `Graphics` (`0x2b9ec2`) con un `DisplacementFilter` aplicado al `waterContainer`, cargando `cloud.jpg` como mapa de ruido via `Assets.load('/cloud.jpg')`. El sprite se mueve `+1, -1` por frame para crear el efecto ondulante (técnica Red Stapler).

### V2+

| ID | Historia de usuario |
|----|---------------------|
| T-06 | Como DM, quiero importar mis propias texturas/sprites (PNG/WEBP ≤512×512) para personalizar completamente el mapa. |
| T-07 | Como DM, quiero un sistema de texturas con variantes aleatorias por tile (3-4 variantes de hierba) para evitar patrones repetitivos. |
| T-08 | Como DM, quiero tiles de objetos decorativos (árboles, rocas, columnas, fogatas, barriles) como capa separada. |
| T-09 | Como DM, quiero tiles de muro con detección automática de borde (auto-tile Wall system) para que las paredes del dungeon se conecten correctamente. |
| T-10 | Como DM, quiero un sistema de preset "Room Templates" (habitación del trono, calabozo, taberna) para construir dungeons rápidamente. |
| T-11 | Como DM, quiero acceso a un catálogo de assets de comunidad (RPG Maker / Aseprite compatible) para enriquecer la biblioteca. |
| T-12 | Como DM, quiero importar mapas PNG exportados de **Tiled Map Editor** como mundo completo, renderizado como un único Sprite de fondo. |

---

## EPIC 3 — Efectos Atmosféricos y Shaders 🌧️

### MVP

| ID | Historia de usuario |
|----|---------------------|
| A-01 | Como DM, quiero activar/desactivar lluvia con un toggle, para crear ambiente dramático durante combates. |
| A-02 | Como DM, quiero activar nubes drifting y controlar su velocidad/densidad con un slider. |
| A-03 | Como DM, quiero activar niebla/fog y controlar su densidad, para dungeons oscuros o escenas místicas. |
| A-04 | Como DM, quiero un slider de intensidad de viento que afecte el movimiento de árboles/hierba en el canvas. |
| A-05 | Como DM, quiero efectos de partículas de fuego/llamas posicionables en el mapa (antorchas, fogatas). |

> **Nota técnica A-01:** La lluvia usa un `ParticleContainer` con 130–200 Sprites compartiendo una sola micro-textura (`rainTexture` generada con `generateTexture`). Object Pooling: los sprites nunca se destruyen, solo se reposicionan. Esto da 10-100× más velocidad que un `Container` normal con `Graphics` individuales.

> **Nota técnica A-05:** Las llamas/ember usan el mismo patrón: `ParticleContainer` + `emberTexture` + Object Pool con propiedades `vx`, `vy`, `life` por objeto. La alpha decrece con `life` hasta que el ember se "respawna" en la posición de la fuente.

### V2+

| ID | Historia de usuario |
|----|---------------------|
| A-06 | Como DM, quiero un ciclo de tiempo (amanecer/día/atardecer/noche) que cambie automáticamente el color ambiente del mapa (via `ColorMatrixFilter`). |
| A-07 | Como DM, quiero efectos de tormenta eléctrica (relámpagos procedurales + oscilación de luz). |
| A-08 | Como DM, quiero nieve cayendo con acumulación visual en tiles (shader de whitening gradual). |
| A-09 | Como DM, quiero cenizas/embers flotando en zonas de lava o post-batalla. |
| A-10 | Como DM, quiero ondas de calor (heat haze) en zonas de desierto y lava (via `DisplacementFilter` de baja intensidad). |
| A-11 | Como DM, quiero efectos de agua submarina (caustics, bubbles) para mapas acuáticos. |
| A-12 | Como DM, quiero transiciones de efecto cinematográfico entre escenas (fade to black, wipe, iris). |

---

## EPIC 4 — Iluminación y Visibilidad 💡

### MVP

| ID | Historia de usuario |
|----|---------------------|
| L-01 | Como DM, quiero un Fog of War global que cubra todo el mapa en negro, para ocultar información a los jugadores en la TV. |
| L-02 | Como DM, quiero revelar tiles del mapa (click/brush) para ir mostrando el dungeon a medida que los jugadores exploran. |
| L-03 | Como DM, quiero definir el radio de visión de cada token en tiles y que el FOW se revele automáticamente alrededor de él. |

> **Nota técnica L-01:** Implementar el FOW como una `RenderTexture` de las dimensiones del mapa, pintada de negro. Al revelar tiles, borrar círculos con `BlendMode.ERASE` para crear "huecos" de visión suave.

### V2+

| ID | Historia de usuario |
|----|---------------------|
| L-04 | Como DM, quiero fuentes de luz posicionables (antorcha = 3 tiles, linterna = 5 tiles, luz mágica = 8 tiles) con gradiente de iluminación circular. |
| L-05 | Como DM, quiero que las paredes bloqueen la visión (Line of Sight / LOS) de forma dinámica. |
| L-06 | Como DM, quiero un control de brillo/contraste global para ajustar el look del mapa (via `ColorMatrixFilter`). |
| L-07 | Como DM, quiero efectos de luz dinámicos: antorchas que parpadean (flicker usando `alpha` + `sin()` en el render loop). |
| L-08 | Como DM, quiero definir zonas de "luz siempre revelada" (áreas públicas) y "siempre oscuras" (trampas ocultas). |

---

## EPIC 5 — Tokens y Personajes 🧙

### MVP

| ID | Historia de usuario |
|----|---------------------|
| K-01 | Como DM, quiero colocar tokens (círculos coloreados con iniciales o avatar) sobre el mapa y moverlos entre tiles con drag & drop. |
| K-02 | Como DM, quiero tokens diferenciados por tipo: Jugador (color por personaje), NPC (tono neutro), Enemigo (rojo). |
| K-03 | Como DM, quiero un panel de tokens que muestre la lista de personajes activos con sus HP actuales. |
| K-04 | Como DM, quiero asignar un nombre y HP máximo a cada token para seguimiento en combate. |

> **Nota técnica K-01:** Los tokens son instancias de una clase `GameEntity extends Container`. Cada uno tiene un `Sprite` o `Graphics` interno (círculo con borde), posición `x/y` en el `entityContainer`, interacción via `eventMode = 'static'`, y efecto hover via `ColorMatrixFilter.brightness(1.3)`. On-click enfoca la camera en el token.

### V2+

| ID | Historia de usuario |
|----|---------------------|
| K-05 | Como DM, quiero importar un PNG como avatar de token para personalización visual. |
| K-06 | Como DM, quiero una barra de HP visual bajo cada token (verde/amarillo/rojo según porcentaje). |
| K-07 | Como DM, quiero condiciones visuales sobre tokens: Poisoned (ícono verde), Stunned (estrellitas), Dead (X). |
| K-08 | Como DM, quiero tamaños de token configurables (Small/Medium/Large/Huge/Gargantuan) con footprint de tiles correspondiente. |
| K-09 | Como DM, quiero anclar un token a un tile para que no se mueva accidentalmente. |
| K-10 | Como DM, quiero que los tokens tengan aura visual configurable (radio de aura + color) para marcar spells o amenazas. |
| K-11 | Como DM, quiero importar **AnimatedSprites** (spritesheets de Aseprite en formato JSON) para tokens animados de personajes. |

---

## EPIC 6 — Iniciativa y Combate ⚔️

### MVP

| ID | Historia de usuario |
|----|---------------------|
| C-01 | Como DM, quiero un tracker de Iniciativa que liste a todos los combatientes en orden de turno. |
| C-02 | Como DM, quiero avanzar al siguiente turno con un botón, resaltando visualmente al token activo en el mapa. |
| C-03 | Como DM, quiero ingresar manualmente el roll de iniciativa de cada personaje/enemigo. |
| C-04 | Como DM, quiero modificar el HP de un token (+/−) durante el combate con un input rápido. |

### V2+

| ID | Historia de usuario |
|----|---------------------|
| C-05 | Como DM, quiero que el tracker de iniciativa muestre el AC y speed de cada combatiente. |
| C-06 | Como DM, quiero medir distancias en el mapa (en ft, asumiendo 5ft/tile) con una herramienta de regla. |
| C-07 | Como DM, quiero mostrar/ocultar el cono de ataque o rango de hechizos (radius template) en el mapa. |
| C-08 | Como DM, quiero lanzar dados directamente desde el tracker (d4–d20) con animación visual en el panel. |
| C-09 | Como DM, quiero auto-roll de iniciativa (d20 + modifier) para todos los tokens al inicio del combate. |

---

## EPIC 7 — Generadores de Nombres y Procedural 🎲

*Basado en donjon.bin.sh — Markov chain generators*

### MVP

| ID | Historia de usuario |
|----|---------------------|
| N-01 | Como DM, quiero un generador de nombres de personaje por raza (Humano, Elfo, Enano, Halfling, Orco, Tiefling, Draconiano) para crear NPCs al instante. |
| N-02 | Como DM, quiero generar nombres de lugar (ciudades, tabernas, ríos, montañas) para enriquecer el worldbuilding. |
| N-03 | Como DM, quiero generar nombres de dioses/deidades con estilo épico para religiones del mundo. |

### V2+

| ID | Historia de usuario |
|----|---------------------|
| N-04 | Como DM, quiero generación procedural de dungeons completos (habitaciones conectadas por corredores) exportable como mapa base. |
| N-05 | Como DM, quiero generación de town maps con distritos (mercado, noble, slums, harbor) y calles. |
| N-06 | Como DM, quiero generar una "Random Encounter Table" contextual al bioma activo. |
| N-07 | Como DM, quiero loot tables generativas por nivel de desafío (Challenge Rating). |
| N-08 | Como DM, quiero generar un NPC completo (nombre, raza, profesión, rasgo, motivación) con un clic. |
| N-09 | Como DM, quiero crear diccionarios de names personalizados para mis campañas homebrew. |

---

## EPIC 8 — Audio y Ambiente 🎵

### MVP

| ID | Historia de usuario |
|----|---------------------|
| S-01 | Como DM, quiero soundscapes de ambiente por bioma (forest: pájaros/viento, dungeon: gotas/pasos, tavern: voces/música) que suenen automáticamente al cambiar bioma. |
| S-02 | Como DM, quiero un control de volumen maestro y por categoría (ambiente, efectos, música). |
| S-03 | Como DM, quiero efectos de sonido instantáneos (combat: espadas, spell: explosión mágica, door: puerta pesada) activables con un botón. |

> **Nota técnica S-01:** Usar **Howler.js** para audio (como lo usa el portfolio de Endigo). Permite sprites de audio, fade in/out, y loops. Los soundscapes cambian con `crossfade()` entre biomas sincroni­zado al switch de bioma en el estado de Zustand.

### V2+

| ID | Historia de usuario |
|----|---------------------|
| S-04 | Como DM, quiero crossfade automático entre soundscapes al cambiar de escena. |
| S-05 | Como DM, quiero un mixer de capas de audio (capa de ambiente + capa de música + capa de efectos) independientes. |
| S-06 | Como DM, quiero importar mis propios archivos de audio (MP3/OGG) para soundscapes personalizados. |
| S-07 | Como DM, quiero que los efectos de sonido se sincronicen con animaciones del mapa (trueno cuando aparece relámpago). |

---

## EPIC 9 — DM Notes y Gestión de Campaña 📖

### MVP

| ID | Historia de usuario |
|----|---------------------|
| D-01 | Como DM, quiero un panel de notas con texto enriquecido (MD) para apuntar info de la sesión. |
| D-02 | Como DM, quiero adjuntar notas a tiles específicos del mapa (hover revela la nota). |

### V2+

| ID | Historia de usuario |
|----|---------------------|
| D-03 | Como DM, quiero una base de datos de NPCs de la campaña (nombre, descripción, relación con jugadores). |
| D-04 | Como DM, quiero una timeline de campaña donde registrar eventos clave por sesión. |
| D-05 | Como DM, quiero un sistema de "Secret Notes" visibles solo para el DM, no en la TV. |
| D-06 | Como DM, quiero integración con D&D Beyond (importar personajes/stats desde el API). |

---

## EPIC 10 — Export, Import y Sharing 📤

### MVP

| ID | Historia de usuario |
|----|---------------------|
| E-01 | Como DM, quiero exportar el mapa como PNG de alta resolución para imprimirlo o compartirlo. |
| E-02 | Como DM, quiero guardar y cargar proyectos de mapa en formato JSON (save/load local). |

> **Nota técnica E-01:** Usar `app.renderer.extract.canvas(app.stage)` de PixiJS para extraer el contenido del canvas WebGL como imagen PNG. Mucho más confiable que `html2canvas` para contenido WebGL.

### V2+

| ID | Historia de usuario |
|----|---------------------|
| E-03 | Como DM, quiero exportar en formato compatible con Roll20 (JSON + image export para import directo). |
| E-04 | Como DM, quiero exportar en formato Foundry VTT module. |
| E-05 | Como DM, quiero compartir el mapa via URL corta para que otros DMs lo vean en modo "view-only". |
| E-06 | Como DM, quiero exportar el mapa como GIF animado (con efectos de viento/agua) para compartir en redes. |
| E-07 | Como DM, quiero exportar como PDF con leyenda de tiles y notas de mapa. |
| E-08 | Como DM, quiero importar mapas desde imágenes existentes (JPEG/PNG) como capa de fondo. |

---

## EPIC 11 — Modo TV y Pantalla del Jugador 📺

### MVP

| ID | Historia de usuario |
|----|---------------------|
| V-01 | Como DM, quiero un modo "Player View" que muestre el mapa limpio (sin UI de DM) para proyectar en TV. |
| V-02 | Como DM, quiero que los cambios que hago en el DM Panel (revelar FOW, mover tokens) se reflejen instantáneamente en la TV. |
| V-03 | Como DM, quiero abrir la Player View en una segunda ventana/monitor independiente. |

### V2+

| ID | Historia de usuario |
|----|---------------------|
| V-04 | Como DM, quiero un overlay de "scene transition" en la TV (fade, wipe, iris) cuando cambio de mapa. |
| V-05 | Como DM, quiero mostrar mensajes de texto dramáticos en la TV ("A SHADOW FALLS...") con tipografía épica y animada. |
| V-06 | Como DM, quiero controlar el zoom de la TV independientemente del zoom del panel DM. |
| V-07 | Como DM, quiero un modo "Theater" que atenúa los bordes del mapa con vignette para foco cinematográfico. |

---

## EPIC 12 — Colaboración Multijugador 🌐

### V2+

| ID | Historia de usuario |
|----|---------------------|
| M-01 | Como DM, quiero crear una sesión compartida via código de sala para jugar en línea. |
| M-02 | Como DM, quiero que los jugadores vean el mapa en sus dispositivos en tiempo real (WebSocket sync). |
| M-03 | Como jugador, quiero mover mi propio token en el mapa desde mi dispositivo. |
| M-04 | Como DM, quiero un chat de texto integrado visible para todos los participantes. |
| M-05 | Como DM, quiero compartir tiradas de dado en tiempo real (visible para todos). |

---

## EPIC 13 — Performance & Quality del Renderer ⚡

*Nueva épica técnica derivada del análisis de PixiJS v8 y el código de producción de Endigo Design.*

### MVP

| ID | Historia de usuario |
|----|---------------------|
| R-01 | Como DM, quiero que el mapa de 50×50 tiles corra a 60 FPS constantes sin caídas al añadir efectos atmosféricos. |
| R-02 | Como usuario, quiero que el mapa cargue en menos de 2 segundos, con barra de progreso visible mientras se cargan assets. |

### V2+

| ID | Historia de usuario |
|----|---------------------|
| R-03 | Como DM, quiero poder expandir el tablero a 100×100 tiles sin caída de framerate (Texture Caching + Sprite batching). |
| R-04 | Como DM, quiero que las partículas de lluvia y lava corran a full speed via `ParticleContainer` sin impactar el rendering del mundo. |
| R-05 | Como DM, quiero soporte para spritesheets de Aseprite (JSON + PNG) como texturas de tiles/entidades, cargados via `Assets.load()`. |
| R-06 | Como DM, quiero que los tokens soporten animaciones de spritesheet (`AnimatedSprite`) para personajes con walk/idle cycles. |
| R-07 | Como DM, quiero un monitor de FPS en modo debug para detectar caídas de rendimiento. |

---

## ~~EPIC 14 — Renderer 3D~~ ❌ Descartado

> **Motivo:** La TV usada horizontalmente como base de mesa hace que el top-down 2D sea la vista óptima. El isométrico/3D añadiría complejidad sin beneficio real para este caso de uso. **Solo PixiJS 2D.**

---

## Priorización — Roadmap

### 🟢 MVP (v1.0) — Lanzamiento inicial

```
EPIC 1  — Grid & Canvas (G-01 a G-07)
EPIC 2  — Tiles & Biomas (T-01 a T-05)
EPIC 3  — Efectos Atmosféricos (A-01 a A-05)
EPIC 4  — FOW básico (L-01 a L-03)
EPIC 5  — Tokens básicos (K-01 a K-04)
EPIC 6  — Initiative Tracker (C-01 a C-04)
EPIC 7  — Generadores de nombres (N-01 a N-03)
EPIC 8  — Audio básico (S-01 a S-03)
EPIC 9  — DM Notes (D-01 a D-02)
EPIC 10 — Save/Load + PNG export (E-01 a E-02)
EPIC 11 — Player View / TV Mode (V-01 a V-03)
EPIC 13 — Performance básica: 60 FPS @ 50×50 (R-01 a R-02)
```

### 🟡 V1.5 — Post-lanzamiento rápido

```
EPIC 4  — Light sources + LOS (L-04 a L-06)
EPIC 5  — Token avatars + HP bars (K-05 a K-07)
EPIC 6  — Spell templates + ruler (C-06 a C-07)
EPIC 7  — Dungeon generator (N-04 a N-05)
EPIC 10 — Roll20 export (E-03)
EPIC 11 — Scene transitions (V-04 a V-05)
EPIC 13 — Texture Caching + ParticleContainer (R-03 a R-04)
```

### 🔵 V2.0 — Feature completo

```
EPIC 2  — Custom textures + Aseprite import + auto-tile (T-06 a T-12)
EPIC 3  — Storm + snow + heat haze (A-06 a A-12)
EPIC 4  — Dynamic light flicker + LOS full (L-07 a L-08)
EPIC 5  — Auras + AnimatedSprite tokens (K-10 a K-11)
EPIC 8  — Audio mixer + custom import (S-04 a S-07)
EPIC 9  — NPC DB + campaign timeline (D-03 a D-06)
EPIC 10 — Foundry + URL share + GIF export (E-04 a E-08)
EPIC 12 — Multiplayer full (M-01 a M-05)
EPIC 13 — AnimatedSprite entities + FPS monitor (R-05 a R-07)
```

---

## Stack Técnico

| Capa | Tecnología | Razón |
|------|-----------|-------|
| UI / DM Panel | React 18 + Vite | Componentes reactivos, hot reload |
| Estado global | Zustand | Simple, sin boilerplate, suscripciones selectivas |
| Renderer 2D | **PixiJS 8** ✅ | WebGL/WebGPU acelerado, batching nativo, filtros, partículas |
| Texture generation | `app.renderer.generateTexture()` | Pre-compila tiles estáticos a GPU textures |
| Partículas | `PIXI.ParticleContainer` | 10–100× más rápido que Container para efectos masivos |
| Agua | `DisplacementFilter` + `cloud.jpg` | Técnica Red Stapler, efecto fluido ultra realista |
| Cámara | Clase `Camera` custom | Drag-to-pan, clamp bounds, `centerOnTarget()` con invlerp |
| Entidades | `AnimatedSprite` + spritesheet JSON | Personajes/tokens con animaciones walk/idle (estilo Endigo) |
| Grid Debug | `TilingSprite` | Un solo Sprite para toda la overlay del grid |
| Filtros visuales | `ColorMatrixFilter`, `BlurFilter` | Night mode, hover effect, FOW, iluminación |
| Audio | **Howler.js** | Cross-browser, sprites, loops, fade in/out |
| Animaciones UI | GSAP | Tweens suaves (tokens, modales, transiciones de escena) |
| Networking | Socket.io | Multiplayer en V2 |
| Persistencia | IndexedDB / localStorage | Guardado local offline-first |
| Export imagen | `app.renderer.extract.canvas()` | Export PNG desde WebGL, nativo de PixiJS |
| Estilo | Vanilla CSS (dark gold theme) | Control total, sin deps extra |
| Assets de mapa | **Tiled Map Editor** + **Aseprite** | Workflow profesional de pixel art (como Endigo) |

---

## Referencias de Investigación

- **donjon.bin.sh** — Markov chain name generators, dungeon generator, encounter tables, loot tables.
- **app.dungeonscrawl.com** — Top-down 2D map editor, multi-layer system, wall auto-tile, Fog of War, LOS, export PNG/PDF.
- **endigodesign.com/works/gaming/portfolio** — Portfolio game real con PixiJS: World (PNG), Camera, Grid (TilingSprite), GameObject (AnimatedSprite + pathing), efectos hover (ColorMatrixFilter). [Source code](https://github.com/endigo9740/endigo-design/tree/v1).
- **Red Stapler Water Effect** — DisplacementFilter con noise map para agua ultra realista. [GitHub](https://github.com/8ctopotamus/pixi-water-effect-example).
- **Zelda: Echoes of Wisdom** — Estilo visual de referencia: pixel art top-down, bordes limpios, agua con highlights geométricos, paleta saturada.
- **Hyper Light Drifter** — Estético alternativo para biomas oscuros (dungeon, cave, lava).

---

*Última actualización: Marzo 2026 — v1.1 (incorpora análisis técnico de PixiJS v8 y referencial Endigo Design)*
