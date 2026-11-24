# OneSociety

A mobile app for apartment societies — built with React Native (Expo) and Node.js.

---

## Prerequisites

- Node.js >= 20
- npm >= 10
- MongoDB Atlas free cluster (connection string in `apps/server/.env`)
- Expo Go app on your phone (for mobile development)

---

## Monorepo Structure

```
apps/
  mobile/   – Expo + TypeScript + Expo Router
  server/   – Node.js + Express + TypeScript
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install          # root dev tools (ESLint, Prettier)
cd apps/server && npm install
cd apps/mobile && npm install
```

### 2. Configure environment variables

```bash
cp apps/server/.env.example apps/server/.env
# Edit apps/server/.env with your MongoDB URI, JWT secrets, etc.
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

## Running Tests

```bash
cd apps/server
npm test
```

---

## Environment Variables

See `apps/server/.env.example` for the full list. Required variables:

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string (dev database) |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `CLOUDINARY_*` | Cloudinary credentials |
| `FIREBASE_*` | Firebase Admin SDK credentials |
| `FCM_ENABLED` | Set `true` to send real push notifications |

---

## Module Build Status

See `CLAUDE.md` → Progress section.
