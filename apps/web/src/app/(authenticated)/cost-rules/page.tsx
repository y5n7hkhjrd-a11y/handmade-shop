'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CostRulesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pricing');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#E88DAB] border-t-transparent mx-auto mb-4" />
        <p className="text-sm text-gray-500">Chuyển hướng đến trang Định giá...</p>
      </div>
    </div>
  );
}
