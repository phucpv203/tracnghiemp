/**
 * Toast - Component hiển thị thông báo với auto-dismiss
 * 
 * Types: success, error, warning, info
 * Hỗ trợ aria-live="polite" cho screen reader
 */
import { useEffect } from 'react';
import { CheckCircle, XCircle, WarningCircle, Info, X } from '@phosphor-icons/react';

const iconMap = {
  success: { icon: CheckCircle, color: 'text-success-600 dark:text-success-400', bg: 'bg-success-50 dark:bg-success-900/30 border-success-200 dark:border-success-700' },
  error: { icon: XCircle, color: 'text-danger-600 dark:text-danger-400', bg: 'bg-danger-50 dark:bg-danger-900/30 border-danger-200 dark:border-danger-700' },
  warning: { icon: WarningCircle, color: 'text-warning-600 dark:text-warning-400', bg: 'bg-warning-50 dark:bg-warning-900/30 border-warning-200 dark:border-warning-700' },
  info: { icon: Info, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-900/30 border-primary-200 dark:border-primary-700' },
};

export default function Toast({ message, type = 'info', onDismiss, duration = 4000 }) {
  const config = iconMap[type] || iconMap.info;
  const IconComponent = config.icon;

  useEffect(() => {
    if (duration && onDismiss) {
      const timer = setTimeout(onDismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-6 right-6 z-50 animate-slide-up rounded-2xl border px-5 py-4 shadow-lg ${config.bg}`}
    >
      <div className="flex items-center gap-3">
        <IconComponent size={20} weight="fill" className={`flex-shrink-0 ${config.color}`} />
        <p className={`text-sm font-semibold ${config.color}`}>{message}</p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
            aria-label="Đóng thông báo"
          >
            <X size={16} weight="bold" />
          </button>
        )}
      </div>
    </div>
  );
}