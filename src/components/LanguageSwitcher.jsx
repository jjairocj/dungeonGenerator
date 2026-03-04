import { useTranslation } from 'react-i18next';

const LANGUAGES = [
    { code: 'es', flag: '🇨🇴', label: 'Español' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
];

export default function LanguageSwitcher({ className = '' }) {
    const { i18n } = useTranslation();
    const current = i18n.language?.split('-')[0] || 'es';

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {LANGUAGES.map(({ code, flag, label }) => (
                <button
                    key={code}
                    title={label}
                    onClick={() => i18n.changeLanguage(code)}
                    style={{
                        background: current === code ? 'rgba(200,168,75,0.15)' : 'transparent',
                        border: current === code ? '1px solid #c8a84b' : '1px solid transparent',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        cursor: current === code ? 'default' : 'pointer',
                        fontSize: '13px',
                        lineHeight: 1.4,
                        transition: 'all 0.15s ease',
                        opacity: current === code ? 1 : 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        color: current === code ? '#c8a84b' : '#aaa',
                        fontWeight: current === code ? 600 : 400,
                    }}
                    disabled={current === code}
                >
                    <span style={{ fontSize: '16px' }}>{flag}</span>
                    <span>{label}</span>
                </button>
            ))}
        </div>
    );
}
