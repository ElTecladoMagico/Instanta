"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Home() {
  // Este hook se conecta a Convex y se actualiza automáticamente
  const payments = useQuery(api.payments.list);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">
        Pasarela de Pagos Cripto 🚀
      </h1>
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <p className="text-green-800">
          ✅ Next.js funcionando
        </p>
        <p className="text-green-800">
          ✅ Convex conectado
        </p>
        <p className="text-gray-600 mt-4 text-sm">
          Pagos en la base de datos: {payments?.length || 0}
        </p>
      </div>
    </main>
  );
}