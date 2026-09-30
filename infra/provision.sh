#!/usr/bin/env bash
# Prepara la VPS (Ubuntu 26.04) para Instanta. Idempotente: se puede repetir.
# Uso, desde el repo:  ssh instanta 'bash -s' < infra/provision.sh
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "== Sistema al día"
apt-get update -qq
apt-get upgrade -y -qq

echo "== Docker (paquetes de Ubuntu; unattended-upgrades los mantiene)"
apt-get install -y -qq docker.io docker-compose-v2 docker-buildx fail2ban ufw
systemctl enable --now docker

echo "== SSH: solo clave, nunca contraseña"
cat > /etc/ssh/sshd_config.d/00-instanta.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
sshd -t
systemctl reload ssh

echo "== Firewall: SSH, HTTP y HTTPS (443/udp para HTTP/3 de Caddy)"
# ufw no filtra los puertos que publica Docker; por eso solo Caddy publica puertos (ADR-003).
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

echo "== fail2ban (la jail de sshd viene activada por defecto en Ubuntu)"
systemctl enable --now fail2ban

echo "== Swap de 2 GB: el build de Next.js puede pasar de 4 GB de RAM"
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "== Directorio de la app"
mkdir -p /opt/instanta

echo "== Listo"
docker --version
docker compose version
ufw status | head -1
[ -f /var/run/reboot-required ] && echo "AVISO: hace falta reiniciar" || true
