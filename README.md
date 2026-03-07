# DndOptimizer

Production-grade D&D 5e spell analysis and optimization platform.

A full-stack web application for managing D&D 5e spells, creating spellbooks, and performing mathematical analysis on spell efficiency. Built with Django, PostgreSQL, and React.

## Features

- **User Authentication**: JWT-based auth with automatic token refresh
- **Spell Management**: Import/export spells from JSON, create custom spells with full CRUD
- **Spell Browsing**: Search, filter by level/school, paginated spell list with detailed view
- **Spellbook Management**: Create, edit, and manage prepared spell collections
- **Spell Preparation**: Mark spells as prepared, add notes, duplicate spellbooks
- **Mathematical Analysis**: Expected damage calculations for attack rolls and saving throws
- **Spell Comparison**: Side-by-side comparison with combat parameters and winner determination
- **Data Visualization**: Interactive charts showing damage distribution and comparisons
- **Efficiency Analysis**: Determine optimal spell usage per slot level
- **Dynamic Schema Support**: Accept heterogeneous JSON spell schemas with flexible storage
- **Full-Stack Integration**: Seamless React frontend with Django REST API backend

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
DndOptimizer/
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
   git clone https://github.com/yourusername/DndOptimizer.git
   cd DndOptimizer
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
   - Backend API: http://localhost:8000
   - Frontend: http://localhost:3000
   - Admin: http://localhost:8000/admin

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
   createdb dndoptimizer
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

See the [documentation/](documentation/) folder for requirements and architecture docs.

✅ **Phase 1-4 Complete: Full-Stack Production-Ready Application**

### Completed Backend (Phase 1-3)
✅ Django project structure with modular apps  
✅ Custom User model with UUID primary keys  
✅ Spell model with dynamic JSON schema support  
✅ Spellbook and PreparedSpell models  
✅ Analysis models and mathematical engine  
✅ Complete REST API with DRF  
✅ JWT authentication with token refresh  
✅ All serializers and viewsets  
✅ URL routing and API endpoints (30+)  
✅ Spell parsing service with regex damage extraction  
✅ Confidence scoring system  
✅ Management command for seed data  
✅ Comprehensive test suite (models, API, services)  
✅ Test coverage reporting (80% minimum)  
✅ Podman compose configuration  
✅ CI/CD pipeline with GitHub Actions  
✅ Testing framework with pytest  
✅ Code quality tools (black, ruff, mypy)

### Completed Frontend (Phase 4) ⭐ NEW
✅ React 18 + TypeScript + Vite setup  
✅ TailwindCSS with custom design system  
✅ React Router with protected routes  
✅ Authentication pages (login/register)  
✅ JWT authentication flow with auto-refresh  
✅ API client with Axios interceptors  
✅ Spell list page with search/filtering/pagination  
✅ Spell detail page with full spell information  
✅ Spellbook management (create/edit/delete/duplicate)  
✅ Spellbook detail with add/remove/prepared spells  
✅ Spell comparison UI with analysis context  
✅ Data visualization with Recharts (damage charts)  
✅ 33 frontend source files  
✅ 0 TypeScript errors  
✅ Production container build with nginx (Podman)

### Next Steps
- [ ] Write frontend tests (React Testing Library)
- [ ] Enhanced data visualizations (upcast curves)
- [ ] User dashboard with statistics
- [ ] Advanced filtering and search
- [ ] Deploy to production environment

See [TESTING.md](TESTING.md) for testing guide.  
See [documentation/API_LAYER_COMPLETE.md](documentation/API_LAYER_COMPLETE.md) for complete API documentation.
