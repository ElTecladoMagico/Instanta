// /pay/:client_secret — página de pago alojada (ADR-010). La URL la devuelve la API como checkout_url.
import { PayFlow } from "./PayFlow";

export default async function PayPage({ params }: { params: Promise<{ secret: string }> }) {
  const { secret } = await params;
  return <PayFlow secret={secret} />;
}
