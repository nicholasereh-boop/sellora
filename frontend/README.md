# Sellora frontend (React + Vite)

React frontend for Sellora, replacing the Django-template frontend
feature by feature. See `../docs/react-migration/PROGRESS.md` for what's
migrated so far and `../docs/react-migration/*` (roadmap package) for
the full plan.

## Setup

```bash
cd frontend
npm install
npm run dev
```

This starts Vite on `http://localhost:5173`. It proxies `/api` and
`/media` to Django on `http://localhost:8000` (see `vite.config.js`), so
run Django separately in another terminal:

```bash
cd ..
python manage.py runserver
```

Then open `http://localhost:5173`.

## Backend requirements

The Django project needs the two new packages this migration adds:

```bash
pip install -r requirements/development.txt
```

(`djangorestframework` and `django-cors-headers` were added to
`requirements/base.txt`.)

No new environment variables are required for local dev - the CORS/CSRF
settings default to `http://localhost:5173` already. For a different
frontend origin, set `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`
in `.env` (comma-separated).

## Build

```bash
npm run build
```

Outputs to `frontend/dist/`. Not yet wired into Django's static/
deployment pipeline - see the roadmap's Phase 27 (production
deployment) for the recommended Nginx layout.
