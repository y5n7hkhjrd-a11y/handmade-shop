'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';
import FlaticonIcon from '@/components/FlaticonIcon';
import { NumberInput } from '@/components/NumberInput';

interface InventoryFormProps {
  isOpen: boolean;
  token: string | null;
  products: Array<{ id: string; name: string }>;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InventoryForm({
  isOpen,
  token,
  products,
  showToast,
  onClose,
  onSuccess,
}: InventoryFormProps) {
  const [form, setForm] = useState({
    type: 'IMPORT',
    productId: '',
    componentName: '',
    quantity: 0,
    unit: 'pieces',
    reference: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (form.quantity <= 0) {
      setFormErrors({ quantity: 'Quantity must be greater than 0' });
      return;
    }
    try {
      await apiClient('/inventory', {
        method: 'POST',
        body: { ...form, quantity: Number(form.quantity) },
        token,
      });
      showToast('Đã ghi nhận giao dịch');
      onClose();
      setForm({
        type: 'IMPORT',
        productId: '',
        componentName: '',
        quantity: 0,
        unit: 'pieces',
        reference: '',
        notes: '',
      });
      setFormErrors({});
      onSuccess();
    } catch (e: any) {
      showToast(e.message || 'Thất bại', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Giao dịch mới</h2>
          <p className="text-sm text-gray-500 mt-1">Ghi nhận biến động kho</p>
        </div>
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div>
            <label className="label">Loại</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="IMPORT">📥 Import — Stock received</option>
              <option value="SALE">📤 Sale — Stock sold</option>
              <option value="ADJUSTMENT">⚖️ Adjustment — Stock correction</option>
            </select>
          </div>

          <div>
            <label className="label">
              Sản phẩm <span className="text-gray-400 font-normal">(hoặc tên nguyên liệu)</span>
            </label>
            <select
              className="input"
              value={form.productId}
              onChange={(e) => setForm({ ...form, productId: e.target.value })}
            >
              <option value="">Chọn sản phẩm...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {!form.productId && (
            <div>
              <label className="label">
                Component Name <span className="text-gray-400 font-normal">(fallback)</span>
              </label>
              <input
                className="input"
                value={form.componentName}
                onChange={(e) => setForm({ ...form, componentName: e.target.value })}
                placeholder="e.g., Beads, String, Clasp"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label label-required">Số lượng</label>
              <NumberInput
                className={`input ${formErrors.quantity ? 'input-error' : ''}`}
                value={form.quantity}
                allowDecimal
                hideZero
                onChange={(val) => {
                  setForm({ ...form, quantity: val });
                  setFormErrors({});
                }}
                required
              />
              {formErrors.quantity && (
                <p className="mt-1 text-xs text-red-600">{formErrors.quantity}</p>
              )}
            </div>
            <div>
              <label className="label">Đơn vị</label>
              <input
                className="input"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">
              Tham chiếu <span className="text-gray-400 font-normal">(ví dụ: PO#, hóa đơn)</span>
            </label>
            <input
              className="input"
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              placeholder="Tham chiếu (không bắt buộc)"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">
              Hủy
            </button>
            <button type="submit" className="btn-primary">
              Ghi nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
