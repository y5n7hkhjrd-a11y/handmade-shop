'use client';

import { useEffect, useRef, useState } from 'react';

export interface CustomSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  hasError?: boolean;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Chọn một mục...',
  className = '',
  disabled = false,
  hasError = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!selectRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [isOpen]);

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`input w-full flex items-center justify-between gap-3 text-left disabled:cursor-not-allowed ${hasError ? 'input-error' : ''}`}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={selectedOption ? 'truncate text-gray-800' : 'truncate text-gray-400'}>
          {selectedOption?.label || placeholder}
        </span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {isOpen && (
        <div
          role="listbox"
          className="absolute z-40 mt-1 w-full max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl shadow-gray-200/60"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${isSelected ? 'bg-mint-50 text-mint-700 font-medium' : 'text-gray-700 hover:bg-gray-50'} disabled:cursor-not-allowed disabled:opacity-50`}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                <span className="block truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
