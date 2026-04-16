# CréditApp Mobile

Mobile client app built with Expo (React Native), connecting to the existing Next.js API.

## Setup

```bash
cd mobile
npm install
```

## Configuration

Edit `.env` and set your machine's local IP:

```
EXPO_PUBLIC_API_URL=http://192.168.0.162:3000
```

## Run

```bash
npm start
```

Then scan the QR code with the **Expo Go** app on your phone (must be on the same WiFi network).

## Features

- **Sign In** — JWT cookie auth via existing `/api/auth/signin`
- **Dashboard** — Overview: demande status, documents count, upcoming RDV, progress tracker
- **Ma Demande** — Credit request details and processing stages
- **Documents** — List of uploaded justificatifs with validation status
- **Rendez-vous** — Upcoming and past appointments with the advisor
- **Profil** — User info, nouveautés, réclamations, sign out
