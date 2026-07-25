'use client';

import { type ToastState } from '@/hooks/useToast';

interface ToastProps {
  toast: ToastState | null;
  onClose?: () => void;
}

export default function Toast({ toast, onClose }: ToastProps) {
  if (!toast) return null;

  return (
    <div className="toast" role="alert" aria-live="polite">
      <div
        className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow border ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}
      >
        <span className="text-lg">{toast.type === 'success' ? '✅' : '❌'}</span>
        <span className="text-sm font-medium flex-1">{toast.message}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-2 hover:opacity-70 transition-opacity"
            aria-label="Đóng thông báo"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
