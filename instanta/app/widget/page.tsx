"use client";

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// SOLUCIÓN CRÍTICA: Dynamic import con ssr: false
// Esto le dice a Next.js que NO renderice este componente en el servidor
// Solo se renderiza en el cliente, evitando completamente el hydration mismatch
const CheckoutModal = dynamic(
  () => import('./checkout-modal').then(mod => ({ default: mod.CheckoutModal })),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    )
  }
);

export default function WidgetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CheckoutModal />
    </Suspense>
  );
}