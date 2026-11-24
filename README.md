# OneSociety

A mobile app for apartment societies — built with React Native (Expo), Node.js, Express, and Supabase PostgreSQL.

---

## Prerequisites

- Node.js >= 20
- npm >= 10
- Supabase PostgreSQL database (connection string and keys configured in `apps/server/.env`)
- Expo Go app on your phone (for mobile development)

---

## Monorepo Structure

```
apps/
  mobile/   – Expo + TypeScript + Expo Router
  server/   – Node.js + Express + TypeScript
```

---

## Modules

1. **Group Buying**: Bulk purchasing with volume tiers, escrow payment protection, and gate pickup passes.
2. **Share & Rent**: Peer-to-peer neighborhood item lending with automated escrow security deposits.
3. **ServiceHub**: Directory of verified domestic helpers and skilled residents with schedule conflict checks.
4. **Smart Complaints**: Facility maintenance ticketing with duplicate issue clustering and vendor tracking.
5. **Society Help & Gate**: QR-based gate security, visitor passes, resident presence alerts, and financial ledgers.

---

## Quick Start

### 1. Install dependencies

```bash
npm install
cd apps/server && npm install
cd apps/mobile && npm install
```

### 2. Configure environment variables

Copy the example configuration files and fill in your values (never commit active credentials):

```bash
cp apps/server/.env.example apps/server/.env
# Configure your Supabase URL, keys, DATABASE_URL, and JWT secrets in apps/server/.env
```

For the mobile client:
```bash
# Set EXPO_PUBLIC_API_URL and EXPO_PUBLIC_SOCKET_URL in apps/mobile/.env
```

### 3. Run the backend

```bash
cd apps/server
npm run dev
# Server starts on http://localhost:3000
```

### 4. Run the mobile app

```bash
cd apps/mobile
npx expo start
# Scan the QR code with Expo Go on your phone
```

### 5. Seed the database

```bash
cd apps/server
npm run seed
```

---

## Environment Variables

Refer to `apps/server/.env.example` for the full template. Key variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase service role key |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `CLOUDINARY_*` | Cloudinary storage credentials |
| `FIREBASE_*` | Firebase Admin SDK credentials |
| `FCM_ENABLED` | Toggle for push notification delivery |

---

## Demo Accounts

| Role | Username | Password |
|---|---|---|
| Resident | `suresh.kumar` | `password123` |
| President | `ramesh.naidu` | `password123` |
| Security Guard | `guard.gate1` | `password123` |
| Supplier | `organic.farms` | `password123` |
| Service Provider | `sunita.maid` | `password123` |

---

## License

This project is licensed under the MIT License.
