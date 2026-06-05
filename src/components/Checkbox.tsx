import React from 'react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" width="12" height="12">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export function Checkbox({ checked, onChange, label, className = '' }: CheckboxProps) {
  return (
    <label className={`custom-checkbox ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="custom-checkbox__input"
      />
      <span className="custom-checkbox__box">
        {checked && <CheckIcon />}
      </span>
      {label && <span className="custom-checkbox__label">{label}</span>}
    </label>
  );
}
