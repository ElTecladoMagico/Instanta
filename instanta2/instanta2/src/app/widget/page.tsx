"use client";

/*La única tarea de este archivo es obtener de forma segura el buttonId y el paymentId. 
Luego, pasa estos datos como props al componente CheckoutFlow, 
que contendrá toda la lógica interactiva*/

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CheckoutFlow } from "./CheckoutFlow";

// The searchParams hook needs to be wrapped in a Suspense boundary.
function WidgetPage() {
  const searchParams = useSearchParams();
  const buttonId = searchParams.get("buttonId");
  const paymentId = searchParams.get("paymentId");

  if (!buttonId || !paymentId) {
    return <div>Error: Missing buttonId or paymentId</div>;
  }

  return <CheckoutFlow buttonId={buttonId} paymentId={paymentId} />;
}

// We export the component wrapped in Suspense
export default function WidgetPageWrapper() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <WidgetPage />
        </Suspense>
    )
}
