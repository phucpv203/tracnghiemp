import { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';

export default function NoteBanner({ page = 'dashboard' }) {
  const [note, setNote] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadNote = async () => {
      try {
        const res = await apiService.getNote(page);
        if (res?.note && res.note.content) {
          setNote(res.note.content);
        }
      } catch (error) {
        console.error('Failed to load note:', error);
      } finally {
        setLoaded(true);
      }
    };
    loadNote();
  }, [page]);

  if (!loaded || !note) return null;

  return (
    <div className="mb-6 rounded-3xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 p-4">
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0 mt-0.5">📌</span>
        <p className="flex-1 text-sm text-amber-800 dark:text-amber-200 whitespace-pre-wrap">{note}</p>
      </div>
    </div>
  );
}