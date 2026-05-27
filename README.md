# quiz-verse

QuizVerse — an event-ready, multi-stage quiz competition platform inspired by TV-style formats (Fastest Finger First, Hotseat, team play). It pairs a Django REST backend with a React frontend to run campus quizzes, manage registrations, and host cinematic live rounds.

**Contents:** backend Django API, frontend React app, media and static asset handling, and demo SQLite data for quick local testing.

**Key features**
- Multi-stage quiz workflows (prelims, FFF batches, hotseat rounds)
- Player registration, sequence assignment and payment status tracking
- Team support, leaderboards, quiz attempts and timed question flows
- Admin-managed events with banner images, eligibility filters (school/program/branch)
- Configurable timers and lifelines for cinematic Hotseat gameplay

**Architecture**
- Backend: Django 4 + Django REST Framework (API, models under `backend/quizzes` and `backend/users`).
- Frontend: React (Create React App) in `frontend/` (runs via `npm start`).
- Database: default is SQLite (`backend/db.sqlite3`) for development. Production can use Postgres (packages for `dj-database-url` and `psycopg` are included).
- Media & uploads: `backend/media/` holds uploaded images (quiz banners, profile pictures, switch-category images).

Quick links
- Backend Django app entry: `backend/manage.py`
- Frontend app: `frontend/` (run with `npm start`)
- Logos and branding drafts: `frontend/public/logos/` (SVG design concepts)

Getting started (local development)

Prerequisites
- Python 3.10+ and pip
- Node.js 16+ / npm

1) Backend (API)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # PowerShell
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

- By default the project includes a small `db.sqlite3` for quick testing — remove it or replace with a Postgres database in production.
- Optional env vars for production: `DJANGO_SECRET_KEY`, `DATABASE_URL`, `DEBUG=0`, and `ALLOWED_HOSTS`.

2) Frontend (UI)

```bash
cd frontend
npm install
npm start
```

- Development: `npm start` opens the React dev server (port 3000 by default).
- To create a production build: `npm run build` and serve the `build/` output with any static host (or let Django serve it behind WhiteNoise).

Branding and logos
- I added several original, KBC-inspired concept SVGs to `frontend/public/logos/` for quick previewing in the app:
	- `logo-concept-1.svg` — emblem badge with golden center and stylized question-mark.
	- `logo-concept-2.svg` — stage-ring monogram `QV` with spotlight rays.
	- `logo-concept-3.svg` — wordmark + speech-bubble `Q` and gold accent.

If you prefer a single circular KBC-like badge, tell me which concept to refine (colors, typography, or exact layout) and I will iterate and export PNGs / favicons.

Testing & seeds
- The repo contains some seed utilities (e.g. `backend/seed_kbc_test.py`) and management commands under `backend/users/management/commands/` for populating sample data.

Contributing
- Fork, create a branch, add tests for new behaviors, and submit a PR. If you want, I can add a CONTRIBUTING.md with testing conventions and scripts.

License
- This repository includes a `LICENSE` file — follow its terms when contributing or deploying.

Questions / Next steps
- Want me to: export PNG logos and favicons, refine a selected concept to match the KBC circular badge more closely, or add a `CONTRIBUTING.md` and run scripts? Reply with which item to prioritize.
