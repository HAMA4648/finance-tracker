'use client'

import React from 'react';
import { useRouter } from 'next/navigation';

export default function RefreshButton() {
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
    window.location.reload();
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
    >
      Refresh Data
    </button>
  );
}
