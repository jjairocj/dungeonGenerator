import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function LoginPage() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const login = useAuthStore((s) => s.login);
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(form.email, form.password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || t('login.errorFallback'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-dnd-bg px-4">
            <div className="w-full max-w-md bg-dnd-panel border border-dnd-border rounded-2xl p-8 shadow-2xl">
                {/* Logo */}
                <div className="text-center mb-6">
                    <span className="text-5xl">⚔️</span>
                    <h1 className="font-cinzel text-2xl text-dnd-gold mt-2 tracking-widest">{t('common.appName')}</h1>
                    <p className="text-dnd-muted text-sm mt-1">{t('login.subtitle')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-dnd-muted uppercase tracking-widest mb-1">{t('login.email')}</label>
                        <input
                            id="email" type="email" autoComplete="email" required
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder={t('login.emailPlaceholder')}
                            className="w-full bg-dnd-bg border border-dnd-border rounded-lg px-4 py-2.5 text-dnd-text text-sm placeholder-dnd-muted/50 focus:outline-none focus:border-dnd-gold focus:ring-1 focus:ring-dnd-gold transition"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-dnd-muted uppercase tracking-widest mb-1">{t('login.password')}</label>
                        <input
                            id="password" type="password" autoComplete="current-password" required
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="••••••••"
                            className="w-full bg-dnd-bg border border-dnd-border rounded-lg px-4 py-2.5 text-dnd-text text-sm placeholder-dnd-muted/50 focus:outline-none focus:border-dnd-gold focus:ring-1 focus:ring-dnd-gold transition"
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">⚠️ {error}</p>
                    )}

                    <button
                        type="submit" disabled={loading}
                        className="w-full bg-dnd-gold hover:bg-dnd-gold-lt text-dnd-bg font-bold font-cinzel tracking-wide py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? t('login.submitting') : t('login.submit')}
                    </button>
                </form>

                <div className="mt-5 text-center space-y-2">
                    <p className="text-dnd-muted text-sm">
                        {t('login.noAccount')}{' '}
                        <Link to="/register" className="text-dnd-gold font-semibold hover:underline">{t('login.createAccount')}</Link>
                    </p>
                    <Link to="/editor-guest" className="text-dnd-muted/60 text-xs hover:text-dnd-muted block">
                        {t('login.continueGuest')}
                    </Link>
                </div>

                {/* Language Switcher */}
                <div className="mt-4 flex justify-center">
                    <LanguageSwitcher />
                </div>
            </div>
        </div>
    );
}
