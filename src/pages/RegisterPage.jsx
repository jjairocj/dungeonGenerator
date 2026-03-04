import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import '../styles/auth.css';

export default function RegisterPage() {
    const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const register = useAuthStore((s) => s.register);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (form.password !== form.confirm) {
            setError('Passwords do not match');
            return;
        }
        setLoading(true);
        try {
            await register(form.email, form.password, form.username);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-card__logo">🗡️</div>
                <h1 className="auth-card__title">DungeonGenerator</h1>
                <p className="auth-card__subtitle">Begin your adventure</p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-form__field">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            placeholder="DungeonMaster42"
                            minLength={3}
                            required
                        />
                    </div>
                    <div className="auth-form__field">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
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
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="••••••••"
                            minLength={8}
                            required
                        />
                    </div>
                    <div className="auth-form__field">
                        <label htmlFor="confirm">Confirm Password</label>
                        <input
                            id="confirm"
                            type="password"
                            value={form.confirm}
                            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && <p className="auth-form__error">⚠️ {error}</p>}

                    <button className="auth-form__submit" type="submit" disabled={loading}>
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <p className="auth-card__footer">
                    Already have an account?{' '}
                    <Link to="/login">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
