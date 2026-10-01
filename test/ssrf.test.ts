// Protección SSRF (ADR-009): los webhooks nunca se envían a la propia máquina ni a redes privadas.
// Este archivo corre en su propio proceso: aquí no está activada la excepción WEBHOOK_ALLOW_PRIVATE_HOSTS.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isPrivateAddress, isPublicUrl } from "../lib/ssrf.ts";

test("direcciones privadas, locales o reservadas → privadas", () => {
  for (const ip of [
    "127.0.0.1", // la propia máquina
    "10.0.0.5", "172.16.0.1", "172.31.255.255", "192.168.1.10", // redes privadas (Docker usa 172.x)
    "169.254.169.254", // metadatos de la nube
    "100.64.0.1", // CGNAT
    "0.0.0.0",
    "::1", "::", "fc00::1", "fd12::1", "fe80::1", // IPv6 local, privada y de enlace
    "::ffff:127.0.0.1", "::ffff:10.0.0.1", // IPv4 dentro de IPv6
  ]) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
});

test("direcciones públicas → no privadas", () => {
  for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "2.29.26.129", "2606:4700:4700::1111"]) {
    assert.equal(isPrivateAddress(ip), false, ip);
  }
});

test("isPublicUrl rechaza localhost y direcciones IP privadas escritas en la URL", async () => {
  assert.equal(await isPublicUrl("http://localhost:3000/hook"), false);
  assert.equal(await isPublicUrl("http://127.0.0.1/hook"), false);
  assert.equal(await isPublicUrl("http://[::1]/hook"), false);
  assert.equal(await isPublicUrl("http://169.254.169.254/latest/meta-data"), false);
});

test("isPublicUrl acepta una dirección IP pública", async () => {
  assert.equal(await isPublicUrl("https://1.1.1.1/hook"), true);
});

test("isPublicUrl rechaza un nombre que no se puede resolver", async () => {
  assert.equal(await isPublicUrl("https://no-existe.invalid/hook"), false);
});

test("con WEBHOOK_ALLOW_PRIVATE_HOSTS=1 (solo tests y desarrollo) se permiten las privadas", async () => {
  process.env.WEBHOOK_ALLOW_PRIVATE_HOSTS = "1";
  try {
    assert.equal(await isPublicUrl("http://127.0.0.1:4000/hook"), true);
  } finally {
    delete process.env.WEBHOOK_ALLOW_PRIVATE_HOSTS;
  }
});
