import { Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import DMPanel from '../components/DMPanel';
import { useTranslation } from 'react-i18next';

function BoardLoading() {
    const { t } = useTranslation();
    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-dnd-muted bg-dnd-bg">
            <div className="w-10 h-10 border-2 border-dnd-border border-t-dnd-gold rounded-full animate-spin" />
            <p className="text-sm">{t('editor.loadingBoard')}</p>
        </div>
    );
}

export default function EditorPage({ PixiBoard }) {
    const { mapId } = useParams();
    const { t } = useTranslation();

    return (
        <div className="flex w-screen h-screen overflow-hidden bg-dnd-bg">
            <DMPanel mapId={mapId} />
            <main className="flex-1 flex overflow-hidden relative">
                <Suspense fallback={<BoardLoading />}>
                    <PixiBoard mapId={mapId} />
                </Suspense>
                <Link to="/dashboard"
                    className="absolute top-3 right-3 z-10 text-xs text-dnd-muted bg-dnd-panel/80 border border-dnd-border px-3 py-1.5 rounded-lg hover:border-dnd-gold hover:text-dnd-gold transition backdrop-blur-sm">
                    {t('editor.backToDashboard')}
                </Link>
            </main>
        </div>
    );
}
