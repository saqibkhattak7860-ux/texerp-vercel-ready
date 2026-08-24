# TexERP Vercel deployment

This package is prepared as a single Vercel project containing both the React frontend and the Express API.

## 1. Import the project
- Upload/import the ZIP as a new Vercel project.
- **Root Directory: leave it blank / use the project root.**
- Do not set Root Directory to `frontend`.
- Build Command: `npm run build`
- Output Directory: `frontend/dist`

The included `vercel.json` already contains these settings.

## 2. Add Environment Variables in Vercel
Add these variables for Production (and Preview if you use it):

- `JWT_SECRET` = a long random secret
- `JWT_EXPIRES_IN` = `7d`
- `DATABASE_URL` = your production PostgreSQL/Supabase connection string

Alternatively, use `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` instead of `DATABASE_URL`.

The old local `backend/.env` file is intentionally not included in this upload package so database credentials are not accidentally published.

## 3. Deploy
Deploy the project. The API is exposed through the included Vercel catch-all function:

- `/api/health`
- `/api/auth/login`
- `/api/auth/register`
- and the rest of the existing `/api/*` ERP routes.

## 4. Important
Use the project root as Vercel's Root Directory. If you set it to `frontend`, the API function in `/api` will not be deployed and `/api/auth/login` will return 404 again.
