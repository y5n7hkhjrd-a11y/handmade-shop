'use client';

import React from 'react';

type IconWeight = 'regular' | 'bold' | 'solid' | 'thin' | 'brands';
type IconStyle = 'straight' | 'rounded';
type IconColor = string;

interface FlaticonIconProps {
  name: string;
  weight?: IconWeight;
  style?: IconStyle;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: IconColor;
}

const weightPrefix: Record<IconWeight, Record<IconStyle, string>> = {
  regular: { straight: 'fi-rs-', rounded: 'fi-rr-' },
  bold: { straight: 'fi-bs-', rounded: 'fi-br-' },
  solid: { straight: 'fi-ss-', rounded: 'fi-sr-' },
  thin: { straight: 'fi-ts-', rounded: 'fi-tr-' },
  brands: { straight: 'fi-brands-', rounded: 'fi-brands-' },
};

const sizeClasses: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

export default function FlaticonIcon({
  name,
  weight = 'regular',
  style = 'straight',
  className = '',
  size = 'md',
  color,
}: FlaticonIconProps) {
  const prefix = weightPrefix[weight][style];
  const iconClass = `fi ${prefix}${name}`;
  const sizeClass = sizeClasses[size];

  return (
    <i
      className={`${iconClass} ${sizeClass} ${color || ''} ${className} inline-flex items-center justify-center`}
      aria-hidden="true"
    />
  );
}
