import { useState } from 'react';
import { useBoardStore, BIOMES, TILE_TYPES } from '../store/boardStore';

export default function DMPanel() {
    const rendererMode = useBoardStore((s) => s.rendererMode);
    const setRendererMode = useBoardStore((s) => s.setRendererMode);
    const selectedTile = useBoardStore((s) => s.selectedTile);
    const setSelectedTile = useBoardStore((s) => s.setSelectedTile);
    const effects = useBoardStore((s) => s.effects);
    const setEffect = useBoardStore((s) => s.setEffect);
    const currentBiome = useBoardStore((s) => s.currentBiome);
    const fillBiome = useBoardStore((s) => s.fillBiome);
    const audio = useBoardStore((s) => s.audio);
    const setAudio = useBoardStore((s) => s.setAudio);

    const [activeSection, setActiveSection] = useState('tiles');

    return (
        <aside className="dm-panel">
            {/* Header */}
            <div className="dm-panel__header">
                <div className="dm-panel__logo">
                    <span className="dm-panel__logo-icon">⚔️</span>
                    <div>
                        <h1 className="dm-panel__title">DM Console</h1>
                        <p className="dm-panel__subtitle">D&D Tile Engine POC</p>
                    </div>
                </div>

                {/* Renderer Toggle */}
                <div className="renderer-toggle">
                    <button
                        className={`renderer-btn ${rendererMode === '2d' ? 'active' : ''}`}
                        onClick={() => setRendererMode('2d')}
                    >
                        <span>⬜</span> 2D PixiJS
                    </button>
                    <button
                        className={`renderer-btn ${rendererMode === '3d' ? 'active' : ''}`}
                        onClick={() => setRendererMode('3d')}
                    >
                        <span>🎲</span> 3D Three.js
                    </button>
                </div>
            </div>

            {/* Nav tabs */}
            <nav className="dm-panel__nav">
                {['tiles', 'biomes', 'effects', 'audio'].map((s) => (
                    <button
                        key={s}
                        className={`dm-nav-btn ${activeSection === s ? 'active' : ''}`}
                        onClick={() => setActiveSection(s)}
                    >
                        {{ tiles: '🗺️ Tiles', biomes: '🌍 Biomes', effects: '✨ Effects', audio: '🔊 Audio' }[s]}
                    </button>
                ))}
            </nav>

            {/* Sections */}
            <div className="dm-panel__content">

                {/* --- TILE PALETTE --- */}
                {activeSection === 'tiles' && (
                    <section className="dm-section">
                        <h2 className="dm-section__title">Tile Palette</h2>
                        <p className="dm-section__hint">Click to select, then paint on board</p>
                        <div className="tile-grid">
                            {TILE_TYPES.map((tile) => (
                                <button
                                    key={tile.id}
                                    className={`tile-btn ${selectedTile === tile.id ? 'active' : ''}`}
                                    onClick={() => setSelectedTile(tile.id)}
                                    style={{ '--tile-color': tile.color }}
                                    title={tile.label}
                                >
                                    <span className="tile-btn__icon">{tile.icon}</span>
                                    <span className="tile-btn__label">{tile.label}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* --- BIOMES --- */}
                {activeSection === 'biomes' && (
                    <section className="dm-section">
                        <h2 className="dm-section__title">Biome Fill</h2>
                        <p className="dm-section__hint">Flood-fills entire board with biome tiles</p>
                        <div className="biome-grid">
                            {Object.entries(BIOMES).map(([id, biome]) => (
                                <button
                                    key={id}
                                    className={`biome-btn ${currentBiome === id ? 'active' : ''}`}
                                    style={{ '--biome-color': biome.color }}
                                    onClick={() => fillBiome(id)}
                                >
                                    <span className="biome-btn__icon">{biome.icon}</span>
                                    <span className="biome-btn__label">{biome.label}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* --- EFFECTS --- */}
                {activeSection === 'effects' && (
                    <section className="dm-section">
                        <h2 className="dm-section__title">Dynamic Effects</h2>

                        <div className="effect-row">
                            <label className="effect-row__label">
                                <span>☁️ Clouds</span>
                                <input
                                    type="checkbox"
                                    className="toggle"
                                    checked={effects.clouds}
                                    onChange={(e) => setEffect('clouds', e.target.checked)}
                                />
                            </label>
                        </div>

                        <div className="effect-row">
                            <label className="effect-row__label">
                                <span>💨 Wind</span>
                                <input
                                    type="checkbox"
                                    className="toggle"
                                    checked={effects.wind}
                                    onChange={(e) => setEffect('wind', e.target.checked)}
                                />
                            </label>
                        </div>

                        <div className="effect-row">
                            <label className="effect-row__label">
                                <span>🌧️ Rain</span>
                                <input
                                    type="checkbox"
                                    className="toggle"
                                    checked={effects.rain}
                                    onChange={(e) => setEffect('rain', e.target.checked)}
                                />
                            </label>
                        </div>

                        <div className="effect-row">
                            <label className="effect-row__label">
                                <span>🌫️ Fog</span>
                                <input
                                    type="checkbox"
                                    className="toggle"
                                    checked={effects.fog}
                                    onChange={(e) => setEffect('fog', e.target.checked)}
                                />
                            </label>
                        </div>

                        <div className="slider-group">
                            <label className="slider-label">
                                <span>💨 Wind Intensity</span>
                                <span className="slider-value">{Math.round(effects.windIntensity * 100)}%</span>
                            </label>
                            <input
                                type="range" min="0" max="1" step="0.05"
                                value={effects.windIntensity}
                                className="slider"
                                onChange={(e) => setEffect('windIntensity', parseFloat(e.target.value))}
                            />
                        </div>

                        <div className="slider-group">
                            <label className="slider-label">
                                <span>☁️ Cloud Speed</span>
                                <span className="slider-value">{Math.round(effects.cloudSpeed * 100)}%</span>
                            </label>
                            <input
                                type="range" min="0.05" max="1" step="0.05"
                                value={effects.cloudSpeed}
                                className="slider"
                                onChange={(e) => setEffect('cloudSpeed', parseFloat(e.target.value))}
                            />
                        </div>

                        <div className="slider-group">
                            <label className="slider-label">
                                <span>🌫️ Fog Density</span>
                                <span className="slider-value">{Math.round(effects.fogDensity * 100)}%</span>
                            </label>
                            <input
                                type="range" min="0" max="1" step="0.05"
                                value={effects.fogDensity}
                                className="slider"
                                onChange={(e) => setEffect('fogDensity', parseFloat(e.target.value))}
                            />
                        </div>

                        <div className="slider-group">
                            <label className="slider-label">
                                <span>🌧️ Rain Intensity</span>
                                <span className="slider-value">{Math.round(effects.rainIntensity * 100)}%</span>
                            </label>
                            <input
                                type="range" min="0" max="1" step="0.05"
                                value={effects.rainIntensity}
                                className="slider"
                                onChange={(e) => setEffect('rainIntensity', parseFloat(e.target.value))}
                            />
                        </div>

                        <div className="slider-group">
                            <label className="slider-label">
                                <span>🌅 Time of Day</span>
                                <span className="slider-value">
                                    {effects.dayTime < 0.2 ? '🌙 Night' : effects.dayTime < 0.5 ? '🌅 Dawn' : effects.dayTime < 0.8 ? '☀️ Day' : '🌇 Dusk'}
                                </span>
                            </label>
                            <input
                                type="range" min="0" max="1" step="0.01"
                                value={effects.dayTime}
                                className="slider"
                                onChange={(e) => setEffect('dayTime', parseFloat(e.target.value))}
                            />
                        </div>
                    </section>
                )}

                {/* --- AUDIO --- */}
                {activeSection === 'audio' && (
                    <section className="dm-section">
                        <h2 className="dm-section__title">Ambient Audio</h2>
                        <p className="dm-section__hint">Audio plays based on current biome</p>

                        <div className="effect-row">
                            <label className="effect-row__label">
                                <span>🔊 Enable Audio</span>
                                <input
                                    type="checkbox"
                                    className="toggle"
                                    checked={audio.enabled}
                                    onChange={(e) => setAudio('enabled', e.target.checked)}
                                />
                            </label>
                        </div>

                        <div className="slider-group" style={{ marginTop: 16 }}>
                            <label className="slider-label">
                                <span>🔉 Volume</span>
                                <span className="slider-value">{Math.round(audio.volume * 100)}%</span>
                            </label>
                            <input
                                type="range" min="0" max="1" step="0.05"
                                value={audio.volume}
                                className="slider"
                                onChange={(e) => setAudio('volume', parseFloat(e.target.value))}
                            />
                        </div>

                        <div className="audio-status">
                            <div className="audio-status__indicator" style={{ background: audio.enabled ? '#4ecca3' : '#555' }} />
                            <span>
                                {audio.enabled
                                    ? `Playing: ${BIOMES[currentBiome]?.label ?? 'None'} ambience`
                                    : 'Audio disabled'}
                            </span>
                        </div>

                        <p className="dm-section__hint" style={{ marginTop: 16 }}>
                            Full audio integration with Howler.js coming in v1.0 (biome soundscapes, crossfade, ambient loops).
                        </p>
                    </section>
                )}
            </div>

            {/* Status bar */}
            <div className="dm-panel__footer">
                <span className="status-dot" />
                <span>
                    Mode: <strong>{rendererMode.toUpperCase()}</strong> · Biome: <strong>{BIOMES[currentBiome]?.label}</strong> · Tile: <strong>{selectedTile}</strong>
                </span>
            </div>
        </aside>
    );
}
