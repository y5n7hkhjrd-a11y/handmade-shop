'use client';

interface EmptyStateProps {
  icon?: string;
  title?: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon = '📋', title, message, action }: EmptyStateProps) {
  return (
    <tr>
      <td colSpan={99} className="text-center py-12">
        <div className="flex flex-col items-center justify-center">
          <div className="text-4xl mb-3 opacity-50">{icon}</div>
          {title && <p className="text-base font-medium text-gray-700 mb-1">{title}</p>}
          <p className="text-sm text-gray-500 max-w-xs">{message || 'Không có dữ liệu'}</p>
          {action && (
            <button onClick={action.onClick} className="btn-primary btn-sm mt-4">
              {action.label}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
