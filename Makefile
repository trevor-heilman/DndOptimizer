.PHONY: help build up down migrate shell test lint format clean

help:
	@echo "DndOptimizer - Make Commands"
	@echo "----------------------------"
	@echo "build        Build Docker containers"
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
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

migrate:
	docker-compose exec backend python manage.py migrate

makemigrations:
	docker-compose exec backend python manage.py makemigrations

shell:
	docker-compose exec backend python manage.py shell

superuser:
	docker-compose exec backend python manage.py createsuperuser

test:
	docker-compose exec backend pytest --cov=. --cov-report=term-missing --cov-fail-under=80

test-fast:
	docker-compose exec backend pytest --no-cov

test-cov:
	docker-compose exec backend pytest --cov=. --cov-report=html --cov-report=term-missing
	@echo "Coverage report generated in backend/htmlcov/index.html"

test-watch:
	docker-compose exec backend ptw -- --testmon

seed:
	docker-compose exec backend python manage.py seed_spells --all

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
	docker-compose logs -f

restart:
	docker-compose restart

ps:
	docker-compose ps
