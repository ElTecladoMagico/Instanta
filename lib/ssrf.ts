// Protección SSRF (ADR-009). Los webhooks son peticiones que hace NUESTRO servidor a una URL que elige el comercio.
// Sin esta comprobación, un comercio podría registrar http://127.0.0.1 o http://postgres:5432 y usar Instanta
// para llegar a la red interna de la VPS. Se rechazan la propia máquina, las redes privadas y las reservadas.
import { BlockList, isIP } from "node:net";
import { lookup } from "node:dns/promises";

const blocked = new BlockList();
const IPV4: [string, number][] = [
  ["0.0.0.0", 8], // "esta red"
  ["10.0.0.0", 8], // privada
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8], // la propia máquina
  ["169.254.0.0", 16], // enlace local (incluye los metadatos de la nube, 169.254.169.254)
  ["172.16.0.0", 12], // privada (las redes de Docker están aquí)
  ["192.168.0.0", 16], // privada
];
const IPV6: [string, number][] = [
  ["::", 128], // sin especificar
  ["::1", 128], // la propia máquina
  ["fc00::", 7], // privada
  ["fe80::", 10], // enlace local
];
for (const [network, prefix] of IPV4) blocked.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of IPV6) blocked.addSubnet(network, prefix, "ipv6");

export function isPrivateAddress(ip: string): boolean {
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i); // IPv4 escrita como IPv6
  if (mapped) return isPrivateAddress(mapped[1]);
  return blocked.check(ip, isIP(ip) === 6 ? "ipv6" : "ipv4");
}

// true si todas las direcciones a las que apunta la URL son públicas. Se resuelve el nombre (DNS) porque
// un dominio cualquiera podría apuntar a una IP privada. Si no se puede resolver, se rechaza.
// WEBHOOK_ALLOW_PRIVATE_HOSTS=1 desactiva la comprobación: solo para tests y desarrollo local.
export async function isPublicUrl(url: string): Promise<boolean> {
  if (process.env.WEBHOOK_ALLOW_PRIVATE_HOSTS === "1") return true;
  const host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  try {
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    return addresses.length > 0 && addresses.every(({ address }) => !isPrivateAddress(address));
  } catch {
    return false;
  }
}
