# Spellwright

Production-grade D&D 5e spell analysis and optimization platform.

A full-stack web application for managing D&D 5e spells, creating spellbooks, and performing mathematical analysis on spell efficiency. Built with Django, PostgreSQL, and React.

## Features

- **User Authentication**: JWT-based auth with automatic token refresh
- **Spell Library**: Search, filter by level/school/source/class, paginated list with detailed view
- **Custom Spell Creation**: Class selector, casting time/range dropdowns, V/S/M component checkboxes
- **Spellbook Management**: Create, edit, duplicate, and delete prepared spell collections
- **Spell Preparation**: Mark spells as prepared, add notes, view per-level breakdown
- **Spell Slots Tracker**: Track remaining spell slots per level with class-aware defaults; reset on rest
- **Copy Cost Calculator**: Inline scribing cost totals (gold + time) with detailed modal breakdown
- **Mathematical Analysis**: Expected damage calculations for attack rolls, saving throws, and auto-hit spells
- **Spell Comparison**: Side-by-side comparison with per-spell overrides, breakeven analysis, and growth charts
- **Data Visualization**: Interactive charts (damage distribution, cantrip scaling, hit-chance heatmap, 3D growth)
- **Efficiency Analysis**: Damage-per-slot ratings for all comparison scenarios
- **Dynamic Schema Support**: Accept heterogeneous JSON spell schemas with flexible storage

## Tech Stack

### Backend
- Python 3.12+
- Django 5+
- Django REST Framework
- PostgreSQL
- JWT Authentication
- Podman & Podman Compose

### Frontend (React + TypeScript)
- React 18
- TypeScript (strict mode)
- Vite 7
- TailwindCSS
- React Router v6
- React Query (TanStack)
- Axios
- Recharts
- Podman (multi-stage build with nginx)

## Project Structure

```
Spellwright/
├── backend/
│   ├── config/           # Django settings
│   ├── core/            # Shared utilities
│   ├── users/           # Authentication
│   ├── spells/          # Spell models & parsing
│   ├── spellbooks/      # Spellbook management
│   ├── analysis/        # Mathematical engine
│   └── tests/           # Test suite
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API clients
│   │   ├── hooks/       # Custom hooks
│   │   ├── contexts/    # React contexts
│   │   └── types/       # TypeScript types
│   └── public/          # Static assets
├── documentation/       # Requirements & architecture docs
├── .github/            # GitHub config & copilot instructions
├── compose.yml         # Podman Compose orchestration
└── README.md
```

## Getting Started

### Prerequisites

- Podman and Podman Compose
- Python 3.12+ (for local development)
- PostgreSQL 16+ (if not using Podman)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Spellwright.git
   cd Spellwright
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start with Podman**
   ```bash
   podman compose up --build
   ```

4. **Run migrations**
   ```bash
   podman compose exec backend python manage.py migrate
   ```

5. **Create superuser**
   ```bash
   podman compose exec backend python manage.py createsuperuser
   ```

6. **Access the application**
   - Frontend: http://localhost
   - Backend API (direct): http://localhost:8000
   - Admin: http://localhost:8000/admin

> **Note:** The frontend nginx container proxies all `/api/` traffic to the backend. If you ever recreate the backend container (`podman rm` + `podman run`), you **must** also restart the frontend container (`podman restart spellwright_frontend_1`). nginx resolves the backend hostname to an IP once at startup — a recreated container gets a new IP, causing 502 Bad Gateway errors until nginx restarts.

### Frontend Development (Vite Dev Server)

For faster frontend development with hot module replacement:

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at http://localhost:5173 with HMR enabled.

### Local Development (Without Podman)

1. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Set up PostgreSQL database**
   ```bash
   createdb spellwright
   ```

4. **Run development server**
   ```bash
   python manage.py runserver
   ```

## Running Tests

```bash
# With Podman
podman compose exec backend pytest

# Local
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## Code Quality

```bash
# Format code
black .

# Lint
ruff check .

# Type check
mypy .
```

## Documentation

See the [documentation/](documentation/) folder for architecture docs and historical progress notes.  
See [TESTING.md](TESTING.md) for the testing guide.  
See [documentation/API_LAYER_COMPLETE.md](documentation/API_LAYER_COMPLETE.md) for complete API documentation.  
See [documentation/Spellwright_Objectives](documentation/Spellwright_Objectives) for the active roadmap and in-progress objectives.
