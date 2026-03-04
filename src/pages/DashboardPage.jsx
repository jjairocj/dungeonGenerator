import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function DashboardPage() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [maps, setMaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        api.get('/maps')
            .then((res) => setMaps(res.data.maps || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const createMap = async () => {
        setCreating(true);
        try {
            const res = await api.post('/maps', { name: t('dashboard.newMap').replace('+ ', ''), width: 20, height: 14, biome: 'plains' });
            navigate(`/editor/${res.data.map.id}`);
        } catch (err) { console.error(err); }
        finally { setCreating(false); }
    };

    return (
        <div className="min-h-screen bg-dnd-bg flex flex-col">
            {/* Header */}
            <header className="bg-dnd-panel border-b border-dnd-border px-6 py-3 flex items-center justify-between shadow-lg">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">⚔️</span>
                    <h1 className="font-cinzel text-lg text-dnd-gold tracking-widest">{t('common.appName')}</h1>
                </div>
                <div className="flex items-center gap-4">
                    <LanguageSwitcher />
                    <span className="text-dnd-muted text-sm">👤 {user?.username}</span>
                    <button onClick={async () => { await logout(); navigate('/login'); }}
                        className="text-dnd-muted text-sm border border-dnd-border px-3 py-1.5 rounded-lg hover:border-dnd-gold hover:text-dnd-gold transition">
                        {t('dashboard.logout')}
                    </button>
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-cinzel text-dnd-text text-lg">{t('dashboard.myMaps')}</h2>
                    <button onClick={createMap} disabled={creating}
                        className="bg-dnd-gold hover:bg-dnd-gold-lt text-dnd-bg font-bold text-sm px-4 py-2 rounded-lg transition disabled:opacity-50">
                        {creating ? t('dashboard.creating') : t('dashboard.newMap')}
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-dnd-muted">
                        <div className="w-8 h-8 border-2 border-dnd-border border-t-dnd-gold rounded-full animate-spin" />
                        <p>{t('dashboard.loadingMaps')}</p>
                    </div>
                ) : maps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-dnd-muted text-center">
                        <span className="text-6xl opacity-40">🗺️</span>
                        <p className="text-lg">{t('dashboard.noMaps')}</p>
                        <p className="text-sm">{t('dashboard.noMapsHint')}</p>
                        <button onClick={createMap} disabled={creating}
                            className="mt-4 bg-dnd-gold hover:bg-dnd-gold-lt text-dnd-bg font-bold px-6 py-2.5 rounded-lg transition disabled:opacity-50">
                            {t('dashboard.createFirstMap')}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {maps.map((map) => (
                            <Link key={map.id} to={`/editor/${map.id}`}
                                className="bg-dnd-panel border border-dnd-border rounded-xl overflow-hidden hover:border-dnd-gold hover:-translate-y-1 hover:shadow-lg hover:shadow-dnd-gold/10 transition-all group">
                                <div className="h-32 bg-dnd-bg flex items-center justify-center">
                                    {map.thumbnailUrl
                                        ? <img src={map.thumbnailUrl} alt={map.name} className="w-full h-full object-cover" />
                                        : <span className="text-4xl opacity-20">🗺️</span>
                                    }
                                </div>
                                <div className="p-3 space-y-0.5">
                                    <p className="text-dnd-text font-semibold text-sm truncate group-hover:text-dnd-gold transition">{map.name}</p>
                                    <p className="text-dnd-muted text-xs">{map.width}×{map.height} · {map.biome}</p>
                                    <p className="text-dnd-muted text-xs">{new Date(map.updatedAt).toLocaleDateString()}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
