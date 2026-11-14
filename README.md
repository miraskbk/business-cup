# safer

A web workspace that helps renters keep a record and make a clear case for their security deposit.

[Live app](https://business-cup-xi.vercel.app) · [Try the sample apartment](https://business-cup-xi.vercel.app/protected/sample)

## What it does

- Saves room-by-room condition records, photos, and timestamps at move-in and move-out.
- Tracks repair requests, landlord promises, notices, and payments.
- Compares the 12-month cost of renewing, negotiating, or moving.
- Tracks deposit deadlines and deductions, then builds an editable demand letter with copy and print/PDF options.

No sign-up is required. Each visitor gets a private Supabase guest session. Keep that browser session to return to your records. The sample apartment uses fictional dates and clearly labeled AI-generated photos.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set the Supabase URL and publishable key in `.env.local`. For a new Supabase project, enable anonymous sign-ins and run the SQL files in `supabase/migrations/` in filename order. They create the tables, ownership policies, private evidence bucket, and sample seed function. Open `http://localhost:3000`.

## Stack and checks

Next.js, TypeScript, Tailwind CSS, shadcn/ui, Supabase, and Vercel.

```bash
npm test
npx tsc --noEmit
npx eslint app components lib proxy.ts
```

State rules currently cover California, New York, Texas, and Florida, with official sources in `lib/deposit-rules.ts`. They provide general information, not legal advice. Local rules and special housing types may differ.

Built for Business Cup 2.0.
