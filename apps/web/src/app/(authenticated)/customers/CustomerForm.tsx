'use client';

import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';
import FlaticonIcon from '@/components/FlaticonIcon';
import { SOCIAL_PLATFORMS, initialForm } from './customerConstants';

interface CustomerFormProps {
  isOpen: boolean;
  editingCustomer: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    threads?: string;
    notes?: string;
  } | null;
  token: string | null;
  showToast: (message: string, type?: 'success' | 'error') => void;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CustomerForm({
  isOpen,
  editingCustomer,
  token,
  showToast,
  onClose,
  onSuccess,
}: CustomerFormProps) {
  const [form, setForm] = useState(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when opening
  useEffect(() => {
    if (isOpen) {
      if (editingCustomer) {
        setForm({
          name: editingCustomer.name,
          email: editingCustomer.email || '',
          phone: editingCustomer.phone || '',
          address: editingCustomer.address || '',
          facebook: editingCustomer.facebook || '',
          instagram: editingCustomer.instagram || '',
          tiktok: editingCustomer.tiktok || '',
          threads: editingCustomer.threads || '',
          notes: editingCustomer.notes || '',
        });
      } else {
        setForm(initialForm);
      }
      setFormErrors({});
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen, editingCustomer]);

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = 'Vui lòng nhập tên khách hàng';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.email = 'Email không hợp lệ';
    if (form.phone && !/^[0-9+\-\s()]{7,20}$/.test(form.phone))
      errors.phone = 'Số điện thoại không hợp lệ';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !validate()) return;
    setSaving(true);
    try {
      if (editingCustomer) {
        await apiClient(`/customers/${editingCustomer.id}`, { method: 'PUT', body: form, token });
        showToast('Đã cập nhật khách hàng');
      } else {
        await apiClient('/customers', { method: 'POST', body: form, token });
        showToast('Đã thêm khách hàng');
      }
      onClose();
      setForm(initialForm);
      setFormErrors({});
      onSuccess();
    } catch (e: any) {
      showToast(e.message || 'Thao tác thất bại', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Form header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-mint-50/50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-pink-500 flex items-center justify-center text-white text-sm shadow-sm">
              {editingCustomer ? (
                <FlaticonIcon name="pencil" size="sm" />
              ) : (
                <FlaticonIcon name="plus" size="sm" />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {' '}
                {editingCustomer ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng'}
              </h2>
              <p className="text-[11px] text-gray-400">
                {' '}
                {editingCustomer
                  ? 'Cập nhật thông tin khách hàng'
                  : 'Nhập thông tin khách hàng mới'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            title="Đóng (Esc)"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Basic Info */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-1 h-3.5 rounded-full bg-pink-400 inline-block" />
              Thông tin cơ bản
            </p>
            <div className="mb-4">
              <label className="label label-required">Tên khách hàng</label>
              <input
                ref={nameInputRef}
                className={`input ${formErrors.name ? 'input-error' : ''}`}
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                }}
                placeholder="Nhập tên khách hàng..."
              />
              {formErrors.name && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1 animate-[slideDown_0.15s_ease-out]">
                  <FlaticonIcon name="triangle-warning" size="xs" className="text-red-500" />{' '}
                  {formErrors.name}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <FlaticonIcon
                    name="envelope"
                    size="xs"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    className={`input !pl-9 ${formErrors.email ? 'input-error' : ''}`}
                    type="email"
                    value={form.email}
                    onChange={(e) => {
                      setForm({ ...form, email: e.target.value });
                      if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                    }}
                    placeholder="email@example.com"
                  />
                </div>
                {formErrors.email && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1 animate-[slideDown_0.15s_ease-out]">
                    <FlaticonIcon name="triangle-warning" size="xs" className="text-red-500" />{' '}
                    {formErrors.email}
                  </p>
                )}
              </div>
              <div>
                <label className="label">Số điện thoại</label>
                <div className="relative">
                  <FlaticonIcon
                    name="phone-call"
                    size="xs"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    className={`input !pl-9 ${formErrors.phone ? 'input-error' : ''}`}
                    value={form.phone}
                    onChange={(e) => {
                      setForm({ ...form, phone: e.target.value });
                      if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                    }}
                    placeholder="0123 456 789"
                  />
                </div>
                {formErrors.phone && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1 animate-[slideDown_0.15s_ease-out]">
                    <FlaticonIcon name="triangle-warning" size="xs" className="text-red-500" />{' '}
                    {formErrors.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Address & Notes */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-1 h-3.5 rounded-full bg-mint-400 inline-block" />
              Địa chỉ & Ghi chú
            </p>
            <div className="space-y-3">
              <div>
                <label className="label">Địa chỉ</label>
                <div className="relative">
                  <FlaticonIcon
                    name="map-pin"
                    size="xs"
                    className="absolute left-3 top-3 text-gray-400"
                  />
                  <textarea
                    className="input !pl-9"
                    rows={2}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Địa chỉ khách hàng..."
                  />
                </div>
              </div>
              <div>
                <label className="label">Ghi chú</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Ghi chú về khách hàng..."
                />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-1 h-3.5 rounded-full bg-avocado-400 inline-block" />
              Mạng xã hội
            </p>
            <div className="grid grid-cols-2 gap-3">
              {SOCIAL_PLATFORMS.filter((p) => !p.phoneBased).map((platform) => (
                <div key={platform.key}>
                  <label className="text-[11px] text-gray-400 mb-1 flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5">{platform.svg}</span>
                    {platform.label}
                  </label>
                  <input
                    className="input text-sm"
                    value={(form as any)[platform.key] || ''}
                    onChange={(e) => setForm({ ...form, [platform.key]: e.target.value })}
                    placeholder="URL hoặc username"
                  />
                </div>
              ))}
            </div>
            <div className="mt-2.5 p-2.5 bg-mint-50 rounded-lg border border-mint-100">
              <div className="flex items-center gap-1.5 text-[11px] text-mint-700">
                <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#0068FF">
                  <path d="M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9436 0 1.0746.8697 1.9453 1.945 1.9453z" />
                </svg>
                <span>Zalo sẽ dùng số điện thoại của khách hàng</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
              <kbd className="kbd">Esc</kbd> để đóng
            </span>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn-secondary">
                Hủy
              </button>
              <button type="submit" className="btn-primary min-w-[100px]" disabled={saving}>
                {saving ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Đang lưu...
                  </span>
                ) : editingCustomer ? (
                  'Cập nhật'
                ) : (
                  'Thêm khách hàng'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
