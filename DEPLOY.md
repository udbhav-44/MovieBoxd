# Deploying MovieBoxd to your own subdomain

MovieBoxd keeps its archive and API keys in a JSON file on disk, so it needs a
machine with persistent storage — a small VPS rather than a serverless host.
The setup below runs the app plus Caddy, which obtains and renews a TLS
certificate for your subdomain automatically.

A 1 GB VPS is enough.

## Before you start

> **The app holds your TMDB and Anthropic keys.** `APP_PASSWORD` is what keeps
> strangers away from them. Compose refuses to start without it — don't work
> around that.

## 1. Point the subdomain at your server

Add a DNS record with your domain registrar:

| Type | Name | Value |
| --- | --- | --- |
| `A` | `movies` | your server's IPv4 address |
| `AAAA` (optional) | `movies` | your server's IPv6 address |

That gives you `movies.example.com`. Use whatever subdomain you like — just
keep it consistent with `DOMAIN` below.

Confirm it resolves before continuing, since Caddy needs it to issue a
certificate:

```bash
dig +short movies.example.com
```

## 2. Open the web ports

Let's Encrypt validates over ports 80 and 443, so both must be reachable:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 3. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # log out and back in afterwards
```

## 4. Configure

```bash
git clone https://github.com/udbhav-44/MovieBoxd.git
cd MovieBoxd
cp .env.example .env
```

Edit `.env`:

```ini
DOMAIN=movies.example.com
APP_PASSWORD=<a long random password>
AUTH_SECRET=<output of: openssl rand -base64 32>
```

`AUTH_SECRET` signs your session cookie. Changing it later just logs you out.

## 5. Start it

```bash
docker compose up -d --build
```

First boot takes a minute or two to build and to obtain the certificate. Watch
progress with:

```bash
docker compose logs -f
```

Then open `https://movies.example.com`, sign in with `APP_PASSWORD`, and add
your TMDB and Anthropic keys under **Settings**.

## Everyday operations

```bash
docker compose logs -f app        # application logs
docker compose restart app        # restart
docker compose down               # stop (data is preserved)
```

Update to the latest code:

```bash
git pull
docker compose up -d --build
```

## Your data

The archive and keys live in the `movieboxd-data` Docker volume, mounted at
`/app/data`. It survives rebuilds, restarts, and `docker compose down`.

Back it up:

```bash
docker compose cp app:/app/data/store.json ./movieboxd-backup.json
```

Restore:

```bash
docker compose cp ./movieboxd-backup.json app:/app/data/store.json
docker compose restart app
```

## Security notes

- Every page and API route sits behind the password. Unauthenticated requests
  get a redirect to `/login`, and API calls get a `401`.
- Session cookies are HttpOnly, `SameSite=Lax`, `Secure` in production, and
  signed with HMAC-SHA256. A forged or expired cookie is rejected.
- The settings API never returns your API keys — only a masked hint such as
  `••••7890`. Keys leave your browser on the way in and never come back out.
- Caddy terminates TLS and sends HSTS, `X-Content-Type-Options`,
  `X-Frame-Options`, and `Referrer-Policy` headers.
- The app container is not published to the host; Caddy is the only route in.
- `.env` is gitignored. Keep it that way.

## Running without Docker

If you'd rather use a plain Node process behind your existing nginx:

```bash
npm ci
npm run build
APP_PASSWORD=... AUTH_SECRET=... PORT=3000 node .next/standalone/server.js
```

The standalone bundle expects `.next/static` and `public` beside it:

```bash
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

Point your reverse proxy at `127.0.0.1:3000`, and disable response buffering on
that location — imports and recommendations stream progress, and buffering
makes them appear frozen. For nginx that means `proxy_buffering off;`.

## Troubleshooting

**Certificate won't issue.** Check DNS actually resolves to this machine and
that ports 80 and 443 are open. `docker compose logs caddy` shows the ACME
error.

**`APP_PASSWORD` variable is not set.** Compose is refusing to start an
unprotected instance. Create `.env` as described in step 4.

**Import or recommendations look stuck behind your own proxy.** Response
buffering is holding back the progress stream. See the nginx note above.
