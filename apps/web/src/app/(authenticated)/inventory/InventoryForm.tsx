'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';
import FlaticonIcon from '@/components/FlaticonIcon';
import { NumberInput } from '@/components/NumberInput';
import CustomSelect from '@/components/CustomSelect';
import { useEscapeClose } from '@/hooks/useEscapeClose';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

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
    cost: 0,
    reference: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEscapeClose(onClose, isOpen);
  useBodyScrollLock(isOpen);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (form.quantity <= 0) {
      setFormErrors({ quantity: 'Số lượng phải lớn hơn 0' });
      return;
    }
    try {
      const body = {
        ...form,
        quantity: Number(form.quantity),
        cost: form.type === 'IMPORT' ? Number(form.cost) || 0 : undefined,
      };
      await apiClient('/inventory', {
        method: 'POST',
        body,
        token,
      });
      showToast('Đã ghi nhận giao dịch');
      onClose();
      setForm({
        type: 'IMPORT',
        productId: '',
        componentName: '',
        quantity: 0,
        cost: 0,
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
            <label className="label">Loại giao dịch</label>
            <CustomSelect
              value={form.type}
              onChange={(type) => setForm({ ...form, type })}
              options={[
                { value: 'IMPORT', label: '📥 Nhập kho — Hàng về' },
                { value: 'SALE', label: '📤 Xuất kho — Hàng bán' },
                { value: 'ADJUSTMENT', label: '⚖️ Điều chỉnh — Kiểm kê' },
              ]}
            />
          </div>

          <div>
            <label className="label">
              Sản phẩm <span className="text-gray-400 font-normal">(hoặc tên nguyên liệu)</span>
            </label>
            <CustomSelect
              value={form.productId}
              onChange={(productId) => setForm({ ...form, productId })}
              placeholder="Chọn sản phẩm..."
              options={[
                { value: '', label: 'Không chọn sản phẩm' },
                ...products.map((product) => ({ value: product.id, label: product.name })),
              ]}
            />
          </div>

          {!form.productId && (
            <div>
              <label className="label">
                Tên nguyên liệu{' '}
                <span className="text-gray-400 font-normal">(khi chưa chọn sản phẩm)</span>
              </label>
              <input
                className="input"
                value={form.componentName}
                onChange={(e) => setForm({ ...form, componentName: e.target.value })}
                placeholder="VD: Hạt cườm, Dây, Khóa"
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
            {form.type === 'IMPORT' && (
              <div>
                <label className="label">Giá vốn / đơn vị</label>
                <NumberInput
                  className="input"
                  value={form.cost}
                  allowDecimal
                  hideZero
                  onChange={(val) => setForm({ ...form, cost: val })}
                />
              </div>
            )}
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
