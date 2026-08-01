'use client';

import { useEffect, useRef } from 'react';
import FlaticonIcon from '@/components/FlaticonIcon';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận',
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  variant = 'danger',
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => confirmRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay !items-center !pt-0" onKeyDown={handleKeyDown}>
      <div
        className="max-w-sm mx-4 w-full"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modalSlideScale 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="bg-white shadow-lg rounded-2xl p-6 text-center">
          <div
            className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center"
            style={{ animation: 'iconShake 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both' }}
          >
            <FlaticonIcon name="triangle-warning" size="xl" className="text-amber-500" />
          </div>
          <h3
            className="text-lg font-semibold text-gray-900 mb-2"
            style={{ animation: 'btnSlideUp 0.3s ease-out 0.1s both' }}
          >
            {title}
          </h3>
          <p
            className="text-sm text-gray-500 mb-6"
            style={{ animation: 'btnSlideUp 0.3s ease-out 0.15s both' }}
          >
            {message}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="btn-secondary px-6"
              style={{ animation: 'btnSlideUp 0.3s ease-out 0.2s both' }}
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`btn px-6 text-white ${variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'btn-primary'}`}
              style={{ animation: 'btnSlideUp 0.3s ease-out 0.25s both' }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
