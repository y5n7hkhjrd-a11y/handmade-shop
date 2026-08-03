'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import FlaticonIcon from '@/components/FlaticonIcon';

interface CustomDateProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  hasError?: boolean;
}

function parseDateValue(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Build a calendar grid (Monday-first). Leading nulls pad the first week. */
function buildCalendarDays(month: Date): (Date | null)[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, monthIndex, day));
  return cells;
}

export default function CustomDate({
  value,
  onChange,
  placeholder = 'Chọn ngày...',
  className = '',
  disabled = false,
  hasError = false,
}: CustomDateProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => parseDateValue(value) || new Date());

  const selected = parseDateValue(value);
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!dateRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const openPicker = () => {
    setCalendarMonth(selected || new Date());
    setIsOpen((open) => !open);
  };

  return (
    <div ref={dateRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`input w-full flex items-center gap-2.5 text-left disabled:cursor-not-allowed ${hasError ? 'input-error' : ''}`}
        onClick={openPicker}
      >
        <FlaticonIcon name="calendar" size="xs" className="text-avocado-600" />
        <span className={`flex-1 truncate ${selected ? 'text-gray-800' : 'text-gray-400'}`}>
          {selected ? selected.toLocaleDateString('vi-VN') : placeholder}
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
          role="dialog"
          aria-label="Chọn ngày"
          className="absolute right-0 z-40 mt-1 w-60 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-2.5 shadow-xl shadow-gray-200/60"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Tháng trước"
              className="w-7 h-7 rounded-lg text-gray-500 hover:bg-mint-50 hover:text-mint-700 transition-colors"
              onClick={() =>
                setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() - 1, 1))
              }
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-gray-800 capitalize">
              {calendarMonth.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              aria-label="Tháng sau"
              className="w-7 h-7 rounded-lg text-gray-500 hover:bg-mint-50 hover:text-mint-700 transition-colors"
              onClick={() =>
                setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + 1, 1))
              }
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1 text-center text-[10px] font-semibold text-gray-400">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map((date, index) => {
              if (!date) return <span key={`empty-${index}`} />;
              const dayValue = formatDateValue(date);
              const isSelected = dayValue === value;
              const isToday = dayValue === formatDateValue(new Date());
              return (
                <button
                  key={dayValue}
                  type="button"
                  className={`h-7 rounded-md text-xs transition-colors ${
                    isSelected
                      ? 'bg-avocado-600 text-white font-semibold shadow-sm'
                      : isToday
                        ? 'bg-mint-50 text-mint-700 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    onChange(dayValue);
                    setIsOpen(false);
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2.5">
            <button
              type="button"
              className="text-xs text-gray-400 hover:text-gray-600"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
            >
              Xóa ngày
            </button>
            <button
              type="button"
              className="text-xs font-medium text-avocado-600 hover:text-avocado-700"
              onClick={() => {
                const today = new Date();
                onChange(formatDateValue(today));
                setCalendarMonth(today);
                setIsOpen(false);
              }}
            >
              Hôm nay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
