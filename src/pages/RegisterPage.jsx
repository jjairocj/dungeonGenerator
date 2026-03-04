import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function RegisterPage() {
    const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const register = useAuthStore((s) => s.register);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
        setError(''); setLoading(true);
        try {
            await register(form.email, form.password, form.username);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally { setLoading(false); }
    };

    const inputClass = "w-full bg-dnd-bg border border-dnd-border rounded-lg px-4 py-2.5 text-dnd-text text-sm placeholder-dnd-muted/50 focus:outline-none focus:border-dnd-gold focus:ring-1 focus:ring-dnd-gold transition";

    return (
        <div className="min-h-screen flex items-center justify-center bg-dnd-bg px-4">
            <div className="w-full max-w-md bg-dnd-panel border border-dnd-border rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-6">
                    <span className="text-5xl">🗡️</span>
                    <h1 className="font-cinzel text-2xl text-dnd-gold mt-2 tracking-widest">DungeonGenerator</h1>
                    <p className="text-dnd-muted text-sm mt-1">Begin your adventure</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {[
                        { id: 'username', label: 'Username', type: 'text', placeholder: 'DungeonMaster42', key: 'username', min: 3 },
                        { id: 'email', label: 'Email', type: 'email', placeholder: 'dm@yourworld.com', key: 'email' },
                        { id: 'password', label: 'Password', type: 'password', placeholder: '••••••••', key: 'password', min: 8 },
                        { id: 'confirm', label: 'Confirm Password', type: 'password', placeholder: '••••••••', key: 'confirm' },
                    ].map(({ id, label, type, placeholder, key, min }) => (
                        <div key={id}>
                            <label className="block text-xs text-dnd-muted uppercase tracking-widest mb-1">{label}</label>
                            <input
                                id={id} type={type} placeholder={placeholder} required minLength={min}
                                value={form[key]}
                                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                                className={inputClass}
                            />
                        </div>
                    ))}

                    {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">⚠️ {error}</p>}

                    <button type="submit" disabled={loading}
                        className="w-full bg-dnd-gold hover:bg-dnd-gold-lt text-dnd-bg font-bold font-cinzel tracking-wide py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>

                <p className="mt-5 text-center text-dnd-muted text-sm">
                    Already have an account?{' '}
                    <Link to="/login" className="text-dnd-gold font-semibold hover:underline">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
