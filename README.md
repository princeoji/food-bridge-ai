# FoodBridge

FoodBridge connects hotels and restaurants donating surplus meals with NGO
partners. It includes Hotel, NGO, and Volunteer accounts and dashboards,
unique six-digit pickup codes, Hotel-confirmed pickup, Volunteer-confirmed
delivery, impact totals, and persisted contact enquiries.

See [PROJECT_GUIDE.md](./PROJECT_GUIDE.md) for architecture and theme conventions,
and [DEPLOYMENT.md](./DEPLOYMENT.md) for Supabase migration and auth setup.
The core database migration was applied to the existing Lovable backend on
2026-10-20. See VERIFICATION.md for the hosted workflow checks.

https://github.com/princeoji/FoodBridgeAi.git look my project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/760832af-3add-4fa9-affd-ff7fa5c5f544).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

Use Node.js 24 for the test runner. Bun's committed lockfile supports
reproducible installation with `bun install --frozen-lockfile`.

```sh
npm test
npm run typecheck
npm run build
```

Database tests run against isolated PostgreSQL through PGlite. They never write
to hosted Supabase. AI requirements will be added after the user supplies them.
