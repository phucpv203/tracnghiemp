/**
 * Input - Component input field với label, error, helper text
 */
import { useState } from 'react';
import { Eye, EyeSlash } from '@phosphor-icons/react';

export default function Input({
  label,
  error,
  helperText,
  type = 'text',
  className = '',
  id,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type={inputType}
          className={`w-full rounded-xl border bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 transition duration-150 focus:outline-none focus:ring-2 ${
            error
              ? 'border-danger-300 dark:border-danger-600 focus:border-danger-500 focus:ring-danger-200 dark:focus:ring-danger-800'
              : 'border-slate-200 dark:border-slate-600 focus:border-primary-500 focus:ring-primary-200 dark:focus:ring-primary-800'
          } ${isPassword ? 'pr-12' : ''} ${className}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            tabIndex={-1}
          >
            {showPassword ? <EyeSlash size={20} weight="regular" /> : <Eye size={20} weight="regular" />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-danger-600 dark:text-danger-400" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="text-xs text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      )}
    </div>
  );
}