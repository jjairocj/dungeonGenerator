import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import '../styles/auth.css';

export default function LoginPage() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const login = useAuthStore((s) => s.login);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(form.email, form.password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-card__logo">⚔️</div>
                <h1 className="auth-card__title">DungeonGenerator</h1>
                <p className="auth-card__subtitle">Sign in to your realm</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-form__field">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="dm@yourworld.com"
                            required
                        />
                    </div>
                    <div className="auth-form__field">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && <p className="auth-form__error">⚠️ {error}</p>}

                    <button className="auth-form__submit" type="submit" disabled={loading}>
                        {loading ? 'Signing in...' : 'Enter the Dungeon'}
                    </button>
                </form>

                <p className="auth-card__footer">
                    New adventurer?{' '}
                    <Link to="/register">Create an account</Link>
                </p>
                <p className="auth-card__footer">
                    <Link to="/editor-guest" className="auth-card__guest">
                        ⚡ Continue as guest (no save)
                    </Link>
                </p>
            </div>
        </div>
    );
}
