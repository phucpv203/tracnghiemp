/**
 * Card - Component container với consistent styling
 */
export default function Card({
  children,
  className = '',
  padding = 'md',
  hover = false,
  ...props
}) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`rounded-3xl bg-white dark:bg-slate-800 shadow-sm dark:shadow-slate-700/30 border border-slate-200 dark:border-slate-700 ${
        hover ? 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200' : ''
      } ${paddingClasses[padding] || paddingClasses.md} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}