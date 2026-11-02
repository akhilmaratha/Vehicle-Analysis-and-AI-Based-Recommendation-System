# Frontend

Next.js (App Router) frontend for the Vehicle Analysis and AI-Based Recommendation System.

## Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

## Environment

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

- `/` — Vehicle search form
- `/vehicles` — Vehicle listing
- `/compare` — Side-by-side comparison
- `/recommendations` — Placeholder recommendations
- `/admin` — Dashboard placeholders
- `/admin/vehicles` — Vehicle management placeholders

API calls go through `lib/api.js` only.
