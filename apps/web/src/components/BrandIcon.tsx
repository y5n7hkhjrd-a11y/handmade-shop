'use client';

import React from 'react';

type BrandName = 'grab' | 'shopee' | 'spx';

interface BrandIconProps {
  brand: BrandName;
  size?: number;
  className?: string;
}

const brandImages: Record<BrandName, string> = {
  grab: '/images/grab-favicon.ico',
  shopee: '/images/spx-favicon.ico',
  spx: '/images/spx-favicon.ico',
};

export default function BrandIcon({ brand, size = 20, className = '' }: BrandIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={brandImages[brand]}
      alt={`${brand} logo`}
      width={size}
      height={size}
      className={`inline-block ${className}`}
      style={{ objectFit: 'contain' }}
    />
  );
}
