.PHONY: help build up down migrate shell test lint format clean

help:
	@echo "DndOptimizer - Make Commands"
	@echo "----------------------------"
	@echo "build        Build Podman containers"
	@echo "up           Start all services"
	@echo "down         Stop all services"
	@echo "migrate      Run Django migrations"
	@echo "makemigrations Create new migrations"
	@echo "shell        Open Django shell"
	@echo "superuser    Create Django superuser"
	@echo "test         Run tests with coverage"
	@echo "test-fast    Run tests without coverage"
	@echo "test-cov     Run tests and generate HTML coverage report"
	@echo "test-watch   Run tests in watch mode"
	@echo "lint         Run linting checks"
	@echo "format       Format code with black"
	@echo "clean        Remove Python cache files"
	@echo "logs         View container logs"
	@echo "seed         Seed database with spell data"

build:
	podman compose build

up:
	podman compose up -d

down:
	podman compose down

migrate:
	podman compose exec backend python manage.py migrate

makemigrations:
	podman compose exec backend python manage.py makemigrations

shell:
	podman compose exec backend python manage.py shell

superuser:
	podman compose exec backend python manage.py createsuperuser

test:
	podman compose exec backend pytest --cov=. --cov-report=term-missing --cov-fail-under=80

test-fast:
	podman compose exec backend pytest --no-cov

test-cov:
	podman compose exec backend pytest --cov=. --cov-report=html --cov-report=term-missing
	@echo "Coverage report generated in backend/htmlcov/index.html"

test-watch:
	podman compose exec backend ptw -- --testmon

seed:
	podman compose exec backend python manage.py seed_spells --all

lint:
	@echo "Running ruff..."
	cd backend && ruff check .
	@echo "Running black check..."
	cd backend && black --check .
	@echo "Running mypy..."
	cd backend && mypy . --exclude migrations || true

format:
	cd backend && black .
	cd backend && ruff check --fix .

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name ".coverage" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +

logs:
	podman compose logs -f

restart:
	podman compose restart

ps:
	podman compose ps
