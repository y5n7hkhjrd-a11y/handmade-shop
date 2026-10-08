'use client';

import { useState, useMemo } from 'react';

export type SortDir = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  dir: SortDir;
}

/**
 * Get a nested value from an object by dot-separated path.
 * e.g. getNested(obj, 'customer.name')
 */
function getNested(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => {
    if (acc == null) return null;
    const val = acc[part];
    return typeof val === 'function' ? val.call(acc) : val;
  }, obj);
}

/**
 * Generic sort comparator supporting strings, numbers, dates, and booleans.
 */
function compare(a: any, b: any, dir: SortDir): number {
  // Resolve values
  let valA = a ?? '';
  let valB = b ?? '';

  // Detect if both are dates (ISO strings or Date objects)
  const isDateA = valA instanceof Date || (typeof valA === 'string' && !isNaN(Date.parse(valA)));
  const isDateB = valB instanceof Date || (typeof valB === 'string' && !isNaN(Date.parse(valB)));

  if (isDateA && isDateB) {
    valA = new Date(valA).getTime();
    valB = new Date(valB).getTime();
  } else if (typeof valA === 'number' && typeof valB === 'number') {
    // Already numeric
  } else if (!isNaN(Number(valA)) && !isNaN(Number(valB))) {
    valA = Number(valA);
    valB = Number(valB);
  } else {
    // String comparison
    valA = String(valA).toLowerCase();
    valB = String(valB).toLowerCase();
  }

  if (valA < valB) return dir === 'asc' ? -1 : 1;
  if (valA > valB) return dir === 'asc' ? 1 : -1;
  return 0;
}

export function useSort<T>(data: T[], defaultKey?: string, defaultDir?: SortDir) {
  const [config, setConfig] = useState<SortConfig>({
    key: defaultKey || '',
    dir: defaultDir || 'asc',
  });

  const toggleSort = (key: string) => {
    setConfig((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedData = useMemo(() => {
    if (!config.key) return data;
    return [...data].sort((a, b) => {
      const valA = getNested(a, config.key);
      const valB = getNested(b, config.key);
      return compare(valA, valB, config.dir);
    });
  }, [data, config]);

  return {
    sortedData,
    sortKey: config.key,
    sortDir: config.dir,
    toggleSort,
  };
}

/**
 * Sort indicator arrow component for column headers.
 */
export function SortIcon({
  sortKey,
  currentKey,
  dir,
}: {
  sortKey: string;
  currentKey: string;
  dir: SortDir;
}) {
  const isActive = sortKey === currentKey;
  return (
    <span
      className={`inline-flex items-center ml-1 text-[10px] leading-none transition-colors duration-150 ${
        isActive ? 'text-mint-500' : 'text-gray-300 opacity-40 group-hover:opacity-80'
      }`}
    >
      {isActive && dir === 'desc' ? '▼' : '▲'}
    </span>
  );
}
