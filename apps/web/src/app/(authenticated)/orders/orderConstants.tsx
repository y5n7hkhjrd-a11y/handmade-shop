import type { ReactNode } from 'react';

export const statusFlow = [
  'Draft',
  'WaitingConfirm',
  'InProgress',
  'Packaging',
  'ReadyToShip',
  'Completed',
];
export const statusColors: Record<string, string> = {
  Draft: 'badge-gray',
  WaitingConfirm: 'badge-yellow',
  InProgress: 'badge-blue',
  Packaging: 'badge-pink',
  ReadyToShip: 'badge-purple',
  Completed: 'badge-green',
};

export const statusPillClasses: Record<string, string> = {
  Draft: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200',
  WaitingConfirm: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  InProgress: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  Packaging: 'bg-pink-50 text-pink-700 ring-1 ring-pink-200',
  ReadyToShip: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  Completed: 'bg-green-50 text-green-700 ring-1 ring-green-200',
};

export const statusDotColors: Record<string, string> = {
  Draft: 'bg-gray-400',
  WaitingConfirm: 'bg-amber-400',
  InProgress: 'bg-blue-400',
  Packaging: 'bg-pink-400',
  ReadyToShip: 'bg-purple-400',
  Completed: 'bg-green-400',
};
export const statusIcons: Record<string, string> = {
  Draft: 'clipboard',
  WaitingConfirm: 'alarm-clock',
  InProgress: 'tools',
  Packaging: 'gift',
  ReadyToShip: 'box-open',
  Completed: 'badge-check',
};
export const statusLabels: Record<string, string> = {
  Draft: 'Nhập đơn',
  WaitingConfirm: 'Đơn chờ làm',
  InProgress: 'Đơn đã xong',
  Packaging: 'Đơn đã gói',
  ReadyToShip: 'Đã gửi',
  Completed: 'Hoàn thành',
};
export const filterChipActiveColors: Record<string, string> = {
  Draft: '!bg-gray-100 !border-gray-300 !text-gray-700 !shadow-sm',
  WaitingConfirm: '!bg-amber-50 !border-amber-300 !text-amber-700 !shadow-sm',
  InProgress: '!bg-blue-50 !border-blue-300 !text-blue-700 !shadow-sm',
  Packaging: '!bg-pink-50 !border-pink-300 !text-pink-700 !shadow-sm',
  ReadyToShip: '!bg-purple-50 !border-purple-300 !text-purple-700 !shadow-sm',
  Completed: '!bg-green-50 !border-green-300 !text-green-700 !shadow-sm',
};
export const filterChipHoverColors: Record<string, string> = {
  Draft: 'hover:!border-gray-200 hover:!text-gray-600 hover:!bg-gray-100/50',
  WaitingConfirm: 'hover:!border-amber-200 hover:!text-amber-600 hover:!bg-amber-50/50',
  InProgress: 'hover:!border-blue-200 hover:!text-blue-600 hover:!bg-blue-50/50',
  Packaging: 'hover:!border-pink-200 hover:!text-pink-600 hover:!bg-pink-50/50',
  ReadyToShip: 'hover:!border-purple-200 hover:!text-purple-600 hover:!bg-purple-50/50',
  Completed: 'hover:!border-green-200 hover:!text-green-600 hover:!bg-green-50/50',
};
export const PREV_STATUS: Record<string, string> = {
  WaitingConfirm: 'Draft',
  InProgress: 'WaitingConfirm',
};
export const NEXT_STATUS: Record<string, string> = {
  Draft: 'WaitingConfirm',
  WaitingConfirm: 'InProgress',
  InProgress: 'Packaging',
  Packaging: 'ReadyToShip',
  ReadyToShip: 'Completed',
};

export const SOCIAL_PLATFORMS: Array<{
  key: string;
  label: string;
  icon: ReactNode;
  domain: string;
  phoneBased?: boolean;
}> = [
  {
    key: 'facebook',
    label: 'Facebook',
    icon: (
      <svg viewBox="0 0 24 24" fill="#1877F2" className="w-full h-full p-0.5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    domain: 'https://facebook.com/',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    icon: (
      <svg viewBox="0 0 24 24" fill="#E4405F" className="w-full h-full p-0.5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
    domain: 'https://instagram.com/',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    icon: (
      <svg viewBox="0 0 24 24" fill="#000000" className="w-full h-full p-0.5">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
    domain: 'https://tiktok.com/@',
  },
  {
    key: 'threads',
    label: 'Threads',
    icon: (
      <svg viewBox="0 0 24 24" fill="#000000" className="w-full h-full p-0.5">
        <path d="M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z"/>
      </svg>
    ),
    domain: 'https://threads.net/@',
  },
  {
    key: 'zalo',
    label: 'Zalo',
    phoneBased: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="#0068FF" className="w-full h-full p-0.5">
        <path d="M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9436 0 1.0746.8697 1.9453 1.945 1.9453z"/>
      </svg>
    ),
    domain: 'https://zalo.me/',
  },
];
