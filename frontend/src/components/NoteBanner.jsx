import { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import { PushPin } from '@phosphor-icons/react';

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
    <div className="mb-6 rounded-3xl bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-700 p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <PushPin size={20} weight="fill" className="flex-shrink-0 mt-0.5 text-warning-600 dark:text-warning-400" />
        <p className="flex-1 text-sm text-warning-800 dark:text-warning-200 whitespace-pre-wrap">{note}</p>
      </div>
    </div>
  );
}