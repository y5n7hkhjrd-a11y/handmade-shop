'use client';

import FlaticonIcon from '@/components/FlaticonIcon';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  threads?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const AVATAR_COLORS = [
  'from-pink-300 to-pink-500',
  'from-purple-300 to-purple-500',
  'from-blue-300 to-blue-500',
  'from-cyan-300 to-cyan-500',
  'from-emerald-300 to-emerald-500',
  'from-amber-300 to-amber-500',
  'from-rose-300 to-rose-500',
  'from-indigo-300 to-indigo-500',
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export const SOCIAL_PLATFORMS = [
  {
    key: 'facebook',
    label: 'Facebook',
    color: '#1877F2',
    bgColor: '#EBF5FF',
    domain: 'https://facebook.com/',
    svg: (
      <svg viewBox="0 0 24 24" fill="#1877F2" className="w-full h-full p-0.5">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    key: 'instagram',
    label: 'Instagram',
    color: '#E4405F',
    bgColor: '#FEF0F3',
    domain: 'https://instagram.com/',
    svg: (
      <svg viewBox="0 0 24 24" fill="#E4405F" className="w-full h-full p-0.5">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    color: '#000000',
    bgColor: '#F5F5F5',
    domain: 'https://tiktok.com/@',
    svg: (
      <svg viewBox="0 0 24 24" fill="#000000" className="w-full h-full p-0.5">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  {
    key: 'threads',
    label: 'Threads',
    color: '#000000',
    bgColor: '#F5F5F5',
    domain: 'https://threads.net/@',
    svg: (
      <svg viewBox="0 0 24 24" fill="#000000" className="w-full h-full p-0.5">
        <path d="M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z" />
      </svg>
    ),
  },
  {
    key: 'zalo',
    label: 'Zalo',
    color: '#0068FF',
    bgColor: '#EBF2FF',
    phoneBased: true,
    svg: (
      <svg viewBox="0 0 24 24" fill="#0068FF" className="w-full h-full p-0.5">
        <path d="M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9436 0 1.0746.8697 1.9453 1.945 1.9453z" />
      </svg>
    ),
    getHref: (phone: string) => `https://zalo.me/${phone.replace(/[^0-9]/g, '')}`,
  },
];

export function buildSocialUrl(
  platform: (typeof SOCIAL_PLATFORMS)[number],
  val: string,
  phone?: string,
) {
  if (platform.phoneBased) return phone ? platform.getHref!(phone) : null;
  if (val.startsWith('http')) return val;
  const clean = val.replace(/^@/, '');
  return `${platform.domain}${clean}`;
}

export function SocialIconsRow({
  customer,
  size = 'md',
}: {
  customer: Customer;
  size?: 'sm' | 'md';
}) {
  const iconSize = size === 'sm' ? 'w-[18px] h-[18px]' : 'w-[22px] h-[22px]';
  const platforms = SOCIAL_PLATFORMS.map((p) => {
    if (p.phoneBased) return { platform: p, url: buildSocialUrl(p, '', customer.phone) };
    const val = (customer as any)[p.key] as string | undefined;
    return { platform: p, url: val ? buildSocialUrl(p, val) : null };
  }).filter((p) => p.url);

  if (platforms.length === 0) return <span className="text-[10px] text-gray-300 italic">—</span>;

  return (
    <div className="flex items-center gap-1">
      {platforms.map(({ platform, url }) => (
        <a
          key={platform.key}
          href={url!}
          target="_blank"
          rel="noopener noreferrer"
          className={`${iconSize} flex items-center justify-center rounded-md bg-white border border-gray-200 shadow-sm hover:shadow-md hover:scale-110 hover:-translate-y-0.5 transition-all duration-200`}
          title={platform.label}
        >
          {platform.svg}
        </a>
      ))}
    </div>
  );
}

export const FILTERS: { key: 'all' | 'email' | 'phone' | 'social'; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'email', label: '📧 Có email' },
  { key: 'phone', label: '📞 Có SĐT' },
  { key: 'social', label: '🌐 Có MXH' },
];

export function hasSocial(customer: Customer): boolean {
  return SOCIAL_PLATFORMS.some((p) => {
    if (p.phoneBased) return !!customer.phone;
    return !!(customer as any)[p.key];
  });
}

export const initialForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  facebook: '',
  instagram: '',
  tiktok: '',
  threads: '',
  notes: '',
};
