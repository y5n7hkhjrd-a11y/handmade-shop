'use client';

import { useState, type InputHTMLAttributes, type KeyboardEvent } from 'react';

interface NumberInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'onChange' | 'inputMode'
  > {
  value: number;
  onChange: (value: number) => void;
  /** If true, allow floating point numbers (keeps '.' in filter). Default false. */
  allowDecimal?: boolean;
  /** When true and value is 0, show empty string (placeholder will display). Default false. */
  hideZero?: boolean;
}

/**
 * NumberInput replaces `<input type="number">` with `<input type="text" inputMode="numeric">`.
 *
 * Why? `type="number"` strips leading zeros when the user types (e.g. typing "0" then "5"
 * becomes "5" immediately). This component preserves the user's typing experience.
 *
 * - Allows only digit characters (and '.' if allowDecimal).
 * - Converts to/from a JavaScript `number` value.
 * - Shows a numeric keyboard on mobile via `inputMode="numeric"`.
 * - Supports ArrowUp/ArrowDown for step-based adjustments.
 */
export function NumberInput({
  value,
  onChange,
  allowDecimal = false,
  hideZero = false,
  className,
  placeholder,
  min,
  step,
  ...rest
}: NumberInputProps) {
  // Track raw input string so user can clear the field and type a new number
  // without the value snapping back to 0 or the clamped minimum.
  const [rawInput, setRawInput] = useState<string | null>(null);

  // When the controlled value changes externally, reset raw input
  const displayValue = rawInput !== null ? rawInput : (value === 0 && hideZero ? '' : String(value));

  const filterInput = (raw: string): string => {
    return allowDecimal ? raw.replace(/[^0-9.]/g, '') : raw.replace(/\D/g, '');
  };

  const commitValue = (raw: string) => {
    setRawInput(null);
    if (raw === '') {
      onChange(0);
      return;
    }
    const filtered = filterInput(raw);
    if (filtered === '') {
      onChange(0);
      return;
    }
    if (allowDecimal) {
      const parts = filtered.split('.');
      if (parts.length > 2) return;
    }
    const parsed = allowDecimal ? parseFloat(filtered) : parseInt(filtered, 10);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleChange = (raw: string) => {
    if (raw === '') {
      // Allow empty input state — don't commit to 0 until blur
      setRawInput('');
      return;
    }
    setRawInput(raw);
    // Only commit immediately if the input has at least one valid digit
    // (otherwise defer to blur — rawInput keeps the display showing typed chars)
    if (filterInput(raw) !== '') {
      commitValue(raw);
    }
  };

  const handleBlur = () => {
    if (rawInput !== null) {
      commitValue(rawInput);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      // Commit any pending raw input first
      if (rawInput !== null) {
        commitValue(rawInput);
      }
      const stepVal = step ? (typeof step === 'number' ? step : parseInt(step as string, 10) || 1) : 1;
      const delta = e.key === 'ArrowUp' ? stepVal : -stepVal;
      const minVal = min != null ? (typeof min === 'number' ? min : parseInt(String(min), 10) || 0) : 0;
      onChange(Math.max(minVal, value + delta));
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      value={displayValue}
      onChange={(e) => handleChange(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      autoComplete="off"
      {...rest}
    />
  );
}
