import { Suspense } from 'react';
import { useParams } from 'react-router-dom';
import DMPanel from '../components/DMPanel';
import '../styles/editor.css';

export default function EditorPage({ PixiBoard, BoardLoading }) {
    const { mapId } = useParams();

    return (
        <div className="editor">
            <DMPanel mapId={mapId} />
            <main className="editor__board">
                <Suspense fallback={<BoardLoading />}>
                    <PixiBoard mapId={mapId} />
                </Suspense>
            </main>
        </div>
    );
}
