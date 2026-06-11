# Training Command Centre

This MVP is a Next.js 15 + TypeScript application for the Training Command Centre training workflow in a manufacturing environment.

## Included
- Command Centre dashboard and KPI view
- Daily Control, Training Pipeline, Weekly Planner, and assessment modules
- Department dashboards for Surfacing and Coating
- Prisma + SQLite schema and seed data
- Word and PDF export helpers

## Local setup
1. Install dependencies: npm install
2. Generate Prisma client: npx prisma generate
3. Run migrations: npx prisma migrate dev --name init
4. Seed sample data: npx prisma db seed
5. Start the app: npm run dev

Open http://localhost:3000

## Deployment
This project is Vercel-ready. Build with `npm run build` and deploy through the standard Next.js Vercel flow.

