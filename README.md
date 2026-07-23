# ShareRide — Turo-style Car Sharing App

A peer-to-peer car rental marketplace: browse/search listings, book by date range,
pay via Stripe, and leave reviews after a completed trip.

**Stack:** Next.js 14 (App Router) · TypeScript · Prisma · PostgreSQL · NextAuth (credentials) · Stripe · Tailwind CSS

## Features

- Auth: email/password sign up & login (NextAuth, JWT sessions)
- Listings: hosts create/edit/deactivate car listings
- Search: filter by city, date range (excludes already-booked dates), price, seats
- Bookings: date-range booking with overlap protection
- Payments: Stripe PaymentIntents + webhook to confirm bookings
- Reviews: renters review completed bookings; average rating shown on listings
- Dashboards: "My bookings" (renter) and "My listings" (host)

## Project structure

```
prisma/schema.prisma   Data model (User, Listing, Booking, Payment, Review)
prisma/seed.ts          Sample host/renter + 2 listings
src/app/                Pages + API routes (App Router)
src/components/         Reusable UI
src/lib/                 Prisma client, NextAuth config, Stripe client
```

---

## 1. Deploy on your VPS

### Prerequisites on the VPS
- Node.js 20+
- PostgreSQL 14+ (or a managed Postgres URL)
- `git`
- (recommended) `pm2` for process management: `npm i -g pm2`
- (recommended) `nginx` as a reverse proxy + TLS via certbot

### Steps

```bash
# 1. Copy the project onto the VPS (pick one):
scp -r turo-clone your_user@your_vps_ip:/var/www/turo-clone
# — or if you already pushed to GitHub —
git clone https://github.com/<you>/turo-clone.git /var/www/turo-clone

cd /var/www/turo-clone

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
nano .env   # fill in DATABASE_URL, NEXTAUTH_SECRET, STRIPE keys, NEXT_PUBLIC_APP_URL

# Generate a real NextAuth secret:
openssl rand -base64 32

# 4. Set up the database
createdb turo_clone            # if Postgres is local and you haven't made the db yet
npx prisma migrate deploy      # applies schema
npx prisma generate
npm run seed                   # optional: creates host@example.com / renter@example.com (password123)

# 5. Build and start
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup                    # follow the printed instructions to enable on boot
```

### Nginx reverse proxy (optional but recommended)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then `sudo certbot --nginx -d yourdomain.com` for HTTPS, and set
`NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` in `.env` to `https://yourdomain.com`.

### Stripe webhook

In the Stripe Dashboard, add an endpoint pointing to
`https://yourdomain.com/api/payments/webhook` listening for
`payment_intent.succeeded` and `payment_intent.payment_failed`, then copy the
signing secret into `STRIPE_WEBHOOK_SECRET` in `.env`.

---

## 2. Push this project to your GitHub repo

Run this from inside the project folder on the VPS (or locally):

```bash
cd /var/www/turo-clone
git init
git add .
git commit -m "Initial commit: ShareRide MVP"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

`.env` and `node_modules` are already excluded via `.gitignore`, so secrets
never get committed. On future edits, just `git add . && git commit -m "..." && git push`.

If you'd rather develop locally and deploy to the VPS via GitHub instead of
`scp`, set up a simple pull-based deploy: after pushing, `ssh` into the VPS and run
`git pull && npm install && npm run build && pm2 restart turo-clone`.

---

## 3. Local development

```bash
npm install
cp .env.example .env   # point DATABASE_URL at a local/dev Postgres instance
npx prisma migrate dev
npm run seed
npm run dev
```

Visit `http://localhost:3000`. Sign in with `host@example.com` / `password123`
or `renter@example.com` / `password123`, or register a new account.

## Notes / next steps

- Image uploads aren't wired to storage yet — `imageUrls` accepts direct URLs.
  Add an S3/Cloudinary integration if you want in-app photo uploads.
- No admin panel yet — Prisma Studio (`npx prisma studio`) works well for manual moderation.
- Booking → COMPLETED transition is manual (host marks it via the booking PATCH
  endpoint); you could automate this with a cron job that completes bookings
  whose `endDate` has passed.
- Add rate limiting / CAPTCHA to `/api/register` before going to production.
