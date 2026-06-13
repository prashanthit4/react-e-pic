import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', id, ...rest }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="lobby-field">
      {label && <label htmlFor={inputId}>{label}</label>}
      <input id={inputId} className={`input ${className}`} {...rest} />
      {error && <span style={{ color: 'var(--red)', fontSize: '0.82rem', fontWeight: 700 }}>{error}</span>}
    </div>
  );
}
