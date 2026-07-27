/**
 * Skeleton - Component loading shimmer
 * 
 * Variants: text, card, circle, custom
 */
export default function Skeleton({ variant = 'text', className = '', width, height, count = 1 }) {
  const baseClasses = 'relative overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-700';

  const shimmerClasses = 'after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-white/20 dark:after:via-white/5 after:to-transparent';

  const variants = {
    text: `${baseClasses} ${shimmerClasses} h-4 w-full`,
    title: `${baseClasses} ${shimmerClasses} h-6 w-3/4`,
    card: `${baseClasses} ${shimmerClasses} h-32 w-full rounded-3xl`,
    circle: `${baseClasses} ${shimmerClasses} rounded-full`,
    button: `${baseClasses} ${shimmerClasses} h-10 w-24 rounded-2xl`,
  };

  if (count > 1) {
    return (
      <div className="space-y-3 animate-fade-in">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={`${variants[variant] || baseClasses} ${className}`}
            style={{ width, height }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${variants[variant] || baseClasses} ${shimmerClasses} animate-fade-in ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}