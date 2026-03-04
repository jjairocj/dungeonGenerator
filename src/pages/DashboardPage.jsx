import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import '../styles/dashboard.css';

export default function DashboardPage() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [maps, setMaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        api.get('/maps')
            .then((res) => setMaps(res.data.maps || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const createMap = async () => {
        setCreating(true);
        try {
            const res = await api.post('/maps', { name: 'New Map', width: 20, height: 14, biome: 'plains' });
            navigate(`/editor/${res.data.map.id}`);
        } catch (err) {
            console.error(err);
        } finally {
            setCreating(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="dashboard">
            <header className="dashboard__header">
                <div className="dashboard__brand">
                    <span className="dashboard__icon">⚔️</span>
                    <h1>DungeonGenerator</h1>
                </div>
                <div className="dashboard__user">
                    <span className="dashboard__username">👤 {user?.username}</span>
                    <button className="dashboard__logout" onClick={handleLogout}>Logout</button>
                </div>
            </header>

            <main className="dashboard__main">
                <div className="dashboard__toolbar">
                    <h2>My Maps</h2>
                    <button className="btn-primary" onClick={createMap} disabled={creating}>
                        {creating ? 'Creating...' : '+ New Map'}
                    </button>
                </div>

                {loading ? (
                    <div className="dashboard__loading">
                        <div className="spinner" />
                        <p>Loading your maps...</p>
                    </div>
                ) : maps.length === 0 ? (
                    <div className="dashboard__empty">
                        <p>🗺️ No maps yet.</p>
                        <p>Create your first map to begin your adventure!</p>
                        <button className="btn-primary" onClick={createMap} disabled={creating}>
                            + Create First Map
                        </button>
                    </div>
                ) : (
                    <div className="dashboard__grid">
                        {maps.map((map) => (
                            <Link key={map.id} to={`/editor/${map.id}`} className="map-card">
                                <div className="map-card__thumb">
                                    {map.thumbnailUrl
                                        ? <img src={map.thumbnailUrl} alt={map.name} />
                                        : <span className="map-card__thumb-icon">🗺️</span>
                                    }
                                </div>
                                <div className="map-card__info">
                                    <span className="map-card__name">{map.name}</span>
                                    <span className="map-card__meta">{map.width}×{map.height} · {map.biome}</span>
                                    <span className="map-card__date">
                                        {new Date(map.updatedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
