import { useState } from 'react';
import { useBoardStore, BIOMES, TILE_TYPES } from '../store/boardStore';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import '../styles/dmPanel.css';

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
    const { t } = useTranslation();

    const tabs = [
        { id: 'tiles', label: t('dmPanel.tabs.tiles') },
        { id: 'biomes', label: t('dmPanel.tabs.biomes') },
        { id: 'effects', label: t('dmPanel.tabs.effects') },
        { id: 'audio', label: t('dmPanel.tabs.audio') },
    ];

    const dayTimeLabel = () => {
        const v = effects.dayTime;
        if (v < 0.2) return t('dmPanel.effects.night');
        if (v < 0.5) return t('dmPanel.effects.dawn');
        if (v < 0.8) return t('dmPanel.effects.day');
        return t('dmPanel.effects.dusk');
    };

    return (
        <aside className="dm-panel">
            {/* Header */}
            <div className="dm-panel__header">
                <div className="dm-panel__logo">
                    <span className="dm-panel__logo-icon">⚔️</span>
                    <div>
                        <h1 className="dm-panel__title">{t('dmPanel.title')}</h1>
                        <p className="dm-panel__subtitle">{t('dmPanel.subtitle')}</p>
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
                {tabs.map(({ id, label }) => (
                    <button
                        key={id}
                        className={`dm-nav-btn ${activeSection === id ? 'active' : ''}`}
                        onClick={() => setActiveSection(id)}
                    >
                        {label}
                    </button>
                ))}
            </nav>

            {/* Sections */}
            <div className="dm-panel__content">

                {/* --- TILE PALETTE --- */}
                {activeSection === 'tiles' && (
                    <section className="dm-section">
                        <h2 className="dm-section__title">{t('dmPanel.tiles.title')}</h2>
                        <p className="dm-section__hint">{t('dmPanel.tiles.hint')}</p>
                        <div className="tile-grid">
                            {TILE_TYPES.map((tile) => (
                                <button
                                    key={tile.id}
                                    className={`tile-btn ${selectedTile === tile.id ? 'active' : ''}`}
                                    onClick={() => setSelectedTile(tile.id)}
                                    style={{ '--tile-color': tile.color }}
                                    title={t(`tiles.${tile.id}`)}
                                >
                                    <span className="tile-btn__icon">{tile.icon}</span>
                                    <span className="tile-btn__label">{t(`tiles.${tile.id}`)}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* --- BIOMES --- */}
                {activeSection === 'biomes' && (
                    <section className="dm-section">
                        <h2 className="dm-section__title">{t('dmPanel.biomes.title')}</h2>
                        <p className="dm-section__hint">{t('dmPanel.biomes.hint')}</p>
                        <div className="biome-grid">
                            {Object.entries(BIOMES).map(([id, biome]) => (
                                <button
                                    key={id}
                                    className={`biome-btn ${currentBiome === id ? 'active' : ''}`}
                                    style={{ '--biome-color': biome.color }}
                                    onClick={() => fillBiome(id)}
                                >
                                    <span className="biome-btn__icon">{biome.icon}</span>
                                    <span className="biome-btn__label">{t(`biomes.${id}`)}</span>
                                </button>
                            ))}
                        </div>
                    </section>
                )}

                {/* --- EFFECTS --- */}
                {activeSection === 'effects' && (
                    <section className="dm-section">
                        <h2 className="dm-section__title">{t('dmPanel.effects.title')}</h2>

                        {[
                            { key: 'clouds', label: t('dmPanel.effects.clouds') },
                            { key: 'wind', label: t('dmPanel.effects.wind') },
                            { key: 'rain', label: t('dmPanel.effects.rain') },
                            { key: 'fog', label: t('dmPanel.effects.fog') },
                        ].map(({ key, label }) => (
                            <div key={key} className="effect-row">
                                <label className="effect-row__label">
                                    <span>{label}</span>
                                    <input
                                        type="checkbox"
                                        className="toggle"
                                        checked={effects[key]}
                                        onChange={(e) => setEffect(key, e.target.checked)}
                                    />
                                </label>
                            </div>
                        ))}

                        {[
                            { key: 'windIntensity', label: t('dmPanel.effects.windIntensity'), min: 0, max: 1, step: 0.05 },
                            { key: 'cloudSpeed', label: t('dmPanel.effects.cloudSpeed'), min: 0.05, max: 1, step: 0.05 },
                            { key: 'fogDensity', label: t('dmPanel.effects.fogDensity'), min: 0, max: 1, step: 0.05 },
                            { key: 'rainIntensity', label: t('dmPanel.effects.rainIntensity'), min: 0, max: 1, step: 0.05 },
                        ].map(({ key, label, min, max, step }) => (
                            <div key={key} className="slider-group">
                                <label className="slider-label">
                                    <span>{label}</span>
                                    <span className="slider-value">{Math.round(effects[key] * 100)}%</span>
                                </label>
                                <input
                                    type="range" min={min} max={max} step={step}
                                    value={effects[key]}
                                    className="slider"
                                    onChange={(e) => setEffect(key, parseFloat(e.target.value))}
                                />
                            </div>
                        ))}

                        <div className="slider-group">
                            <label className="slider-label">
                                <span>{t('dmPanel.effects.timeOfDay')}</span>
                                <span className="slider-value">{dayTimeLabel()}</span>
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
                        <h2 className="dm-section__title">{t('dmPanel.audio.title')}</h2>
                        <p className="dm-section__hint">{t('dmPanel.audio.hint')}</p>

                        <div className="effect-row">
                            <label className="effect-row__label">
                                <span>{t('dmPanel.audio.enable')}</span>
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
                                <span>{t('dmPanel.audio.volume')}</span>
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
                                    ? t('dmPanel.audio.playing', { biome: t(`biomes.${currentBiome}`) })
                                    : t('dmPanel.audio.disabled')}
                            </span>
                        </div>

                        <p className="dm-section__hint" style={{ marginTop: 16 }}>
                            {t('dmPanel.audio.comingSoon')}
                        </p>
                    </section>
                )}
            </div>

            {/* Status bar */}
            <div className="dm-panel__footer">
                <span className="status-dot" />
                <span>
                    {t('dmPanel.status.mode')}: <strong>{rendererMode.toUpperCase()}</strong> · {t('dmPanel.status.biome')}: <strong>{t(`biomes.${currentBiome}`)}</strong> · {t('dmPanel.status.tile')}: <strong>{t(`tiles.${selectedTile}`)}</strong>
                </span>
                <LanguageSwitcher className="ml-auto" />
            </div>
        </aside>
    );
}
