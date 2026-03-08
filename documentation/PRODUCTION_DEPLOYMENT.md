# Production Deployment Guide

## Overview

This document covers free options for deploying DndOptimizer with a real domain and valid TLS (HTTPS), as well as the recommended local development setup.

---

## Local Development (Current / Recommended)

**Stack:** Podman + Caddy (replaces nginx for dual-stack IPv4+IPv6 support)

The default nginx configuration only binds IPv4 (`127.0.0.1`). Modern browsers resolve `localhost` to IPv6 (`::1`) first, causing "connection refused" errors on Windows with Podman. Caddy binds both stacks automatically.

See [Caddy switch implementation](#local-fix-caddy) below.

---

## Free Production Options

### Option A — Fly.io (Recommended)

**Best fit for this project.** Fly.io deploys containers directly, handles TLS automatically, and provides a free subdomain.

| Property | Detail |
|---|---|
| Domain | `yourapp.fly.dev` (free) or custom domain |
| TLS | Automatic via Let's Encrypt, managed by Fly |
| IPv6 | Dual-stack by default |
| Free tier | 3 shared-CPU VMs, 256MB RAM each, 3GB persistent volume |
| Database | Managed Postgres free tier (1GB) |
| Cost | $0 for small workloads |

**Deployment steps:**
```bash
# Install flyctl
# https://fly.io/docs/hands-on/install-flyctl/

fly auth signup
fly launch          # detects compose.yml, creates fly.toml
fly deploy
```

**Caveats:**
- Free VMs sleep after inactivity (cold starts ~2s)
- 160GB outbound transfer/month on free tier
- No Redis on free tier (disable caching or use Upstash free tier)

---

### Option B — Oracle Cloud Free Tier

**Best fit for permanent, always-on hosting with full control.**

| Property | Detail |
|---|---|
| Domain | Via DuckDNS (free) or custom domain |
| TLS | Let's Encrypt via Certbot (free) |
| IPv6 | Configurable |
| Free tier | 2 AMD VMs (1 OCPU, 1GB RAM) **or** up to 4 ARM cores + 24GB RAM — permanently free |
| Database | Autonomous Database Free Tier (20GB) |
| Cost | $0 — Oracle's free tier does not expire |

**High-level setup:**
1. Create Oracle Cloud account → provision ARM VM
2. Install Podman, clone repo, create `.env`
3. Run `podman-compose up -d`
4. Register domain on [DuckDNS](https://www.duckdns.org) pointing to VM IP
5. Install Certbot: `snap install certbot --classic`
6. Run `certbot certonly --standalone -d yourapp.duckdns.org`
7. Configure nginx/Caddy to use the issued cert
8. Set up DuckDNS cron for dynamic IP updates

**Caveats:**
- Requires Linux server administration knowledge
- You manage OS updates, security patches, backups
- ARM VMs have more resources but some images need `--platform linux/arm64`

---

### Option C — Render

**Best fit for teams who want zero infrastructure management.**

| Property | Detail |
|---|---|
| Domain | `yourapp.onrender.com` (free) or custom domain |
| TLS | Automatic |
| Free tier | 1 web service + 1 PostgreSQL database |
| Cost | $0 (web service spins down after 15min inactivity) |

**Caveats:**
- Free web services have 50s spin-up delay after inactivity
- No persistent disk on free tier (use managed Postgres only)
- No Redis on free tier

---

## TLS Certificate Reference

All options above use **Let's Encrypt** for TLS — the industry standard free CA used by ~60% of the web.

- Certificates are valid for 90 days and auto-renew
- Issued by a trusted CA (browsers show the padlock)
- No configuration needed on Fly.io/Render (they manage it)
- On self-managed VMs: use Certbot

---

## Domain Options

| Provider | Cost | Notes |
|---|---|---|
| [DuckDNS](https://www.duckdns.org) | Free | Subdomain only (e.g. `yourapp.duckdns.org`). Supports dynamic IP via cron. |
| [Freenom](https://www.freenom.com) | Free | `.tk`, `.ml` domains — low trust, often blocked by corporate firewalls |
| Namecheap / Cloudflare | ~$10–12/yr | `.com` domain. Cloudflare also provides free CDN and DDoS protection |

---

## Production Security Checklist

Before going live, ensure the following are addressed:

- [ ] `DEBUG = False` in Django settings (`production.py`)
- [ ] `ALLOWED_HOSTS` set to your real domain only
- [ ] `SECRET_KEY` loaded from environment variable, never committed
- [ ] `SECURE_SSL_REDIRECT = True` in production settings
- [ ] `SESSION_COOKIE_SECURE = True` and `CSRF_COOKIE_SECURE = True`
- [ ] `CORS_ALLOWED_ORIGINS` restricted to your frontend domain
- [ ] Database password is strong and not the default
- [ ] Redis password set and not exposed publicly
- [ ] Rate limiting enabled on auth endpoints
- [ ] Sentry (free tier) configured for error tracking
- [ ] Automated database backups configured

---

## Local Fix: Caddy {#local-fix-caddy}

Replace the nginx stage in [frontend/Dockerfile](../frontend/Dockerfile) with Caddy:

```dockerfile
# Production stage — Caddy (dual-stack IPv4+IPv6, fixes localhost on Windows/Podman)
FROM caddy:alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
```

`frontend/Caddyfile`:
```
:80 {
    root * /srv
    try_files {path} /index.html
    file_server
    encode gzip
}
```

This replaces nginx entirely — gzip, SPA routing, and dual-stack are all handled. Rebuild with:
```powershell
podman build -t localhost/dndoptimizer_frontend:latest frontend/
podman stop dndoptimizer_frontend_1 ; podman rm dndoptimizer_frontend_1
podman run -d --name dndoptimizer_frontend_1 --network dndoptimizer_default -p 80:80 localhost/dndoptimizer_frontend:latest
```
