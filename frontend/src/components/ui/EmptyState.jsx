/**
 * EmptyState - Component hiển thị trạng thái rỗng
 * 
 * Props:
 * - icon: Phosphor icon component
 * - title: Tiêu đề
 * - description: Mô tả chi tiết
 * - action: { label, onClick } - nút hành động
 */
export default function EmptyState({ icon: Icon, title, description, action }) {
  const IconEl = Icon || null;

  return (
    <div className="flex flex-col items-center justify-center rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-12 text-center animate-fade-in shadow-sm dark:shadow-slate-700/30">
      {IconEl && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700">
          <IconEl size={32} weight="light" className="text-slate-400 dark:text-slate-500" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 rounded-2xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700 transition shadow-lg shadow-primary-500/10"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}