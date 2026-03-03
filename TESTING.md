# Testing Guide

## Overview

The DndOptimizer project maintains a minimum of **80% test coverage** across all backend code. This document outlines the testing strategy, test organization, and how to run tests.

## Test Stack

- **pytest**: Primary test framework
- **pytest-django**: Django integration for pytest
- **pytest-cov**: Code coverage reporting
- **Factory Boy** (future): Test data factories

## Test Organization

Tests are organized in the `backend/tests/` directory:

```
backend/tests/
├── __init__.py
├── conftest.py           # Shared fixtures
├── test_models.py        # Model unit tests
├── test_api.py           # Basic API tests
├── test_api_integration.py  # Full API integration tests
└── test_analysis_services.py  # Mathematical engine tests
```

## Running Tests

### Quick Commands

```bash
# Run all tests with coverage
make test

# Run tests without coverage (faster)
make test-fast

# Generate HTML coverage report
make test-cov

# View coverage report
open backend/htmlcov/index.html  # macOS/Linux
start backend/htmlcov/index.html  # Windows
```

### Detailed Commands

```bash
# Run all tests
docker-compose exec backend pytest

# Run with coverage
docker-compose exec backend pytest --cov=. --cov-report=term-missing

# Run specific test file
docker-compose exec backend pytest tests/test_models.py

# Run specific test class
docker-compose exec backend pytest tests/test_models.py::TestUserModel

# Run specific test method
docker-compose exec backend pytest tests/test_models.py::TestUserModel::test_create_user

# Run tests matching a pattern
docker-compose exec backend pytest -k "test_create"

# Run with verbose output
docker-compose exec backend pytest -v

# Stop on first failure
docker-compose exec backend pytest -x

# Show local variables on failure
docker-compose exec backend pytest -l
```

## Test Categories

### 1. Model Tests (`test_models.py`)

Tests for Django models, including:
- User model (creation, authentication)
- Spell model (fields, relationships)
- DamageComponent model (dice mechanics)
- SpellParsingMetadata (confidence, review workflow)
- Spellbook and PreparedSpell (many-to-many relationships)
- AnalysisContext and SpellComparison

**Example:**
```python
@pytest.mark.django_db
class TestSpellModel:
    def test_create_spell(self):
        spell = Spell.objects.create(
            name='Fireball',
            level=3,
            school='evocation',
            # ...
        )
        assert spell.name == 'Fireball'
```

### 2. API Integration Tests (`test_api_integration.py`)

Full API workflow tests, including:
- User registration and authentication
- JWT token handling
- CRUD operations for all resources
- Custom actions (import, export, compare, etc.)
- Permissions and authorization
- Filtering and pagination

**Example:**
```python
@pytest.mark.django_db
class TestSpellAPI:
    def test_create_spell(self, authenticated_client):
        data = {'name': 'Magic Missile', ...}
        response = authenticated_client.post('/api/spells/spells/', data)
        assert response.status_code == status.HTTP_201_CREATED
```

### 3. Analysis Service Tests (`test_analysis_services.py`)

Mathematical engine accuracy tests, including:
- Dice calculation (average, min, max)
- Attack roll probabilities
- Saving throw probabilities
- Advantage/disadvantage mechanics
- Expected damage calculations
- Spell comparison logic
- Parsing service accuracy

**Example:**
```python
class TestDiceCalculator:
    def test_average_damage(self):
        # 8d6: average = 8 * 3.5 = 28.0
        assert DiceCalculator.average(8, 6) == 28.0
```

## Coverage Requirements

- **Minimum Coverage**: 80% overall
- **Critical Modules**: 90%+ coverage
  - `analysis/services.py` (mathematical engine)
  - `spells/services.py` (parsing logic)
  - `core/permissions.py`

### Checking Coverage

```bash
# Terminal report with missing lines
make test

# HTML report (detailed, line-by-line)
make test-cov
```

### Coverage Configuration

Coverage settings are in `backend/pyproject.toml`:

```toml
[tool.pytest.ini_options]
addopts = [
    "--cov=.",
    "--cov-report=html",
    "--cov-report=term-missing",
    "--cov-fail-under=80",
]

[tool.coverage.run]
omit = [
    "*/migrations/*",
    "*/tests/*",
    "manage.py",
]
```

## Writing Tests

### Best Practices

1. **Use fixtures** for common setup:
   ```python
   @pytest.fixture
   def test_spell(db):
       return Spell.objects.create(name='Test', ...)
   ```

2. **Use `@pytest.mark.django_db`** for database access:
   ```python
   @pytest.mark.django_db
   class TestMyModel:
       def test_something(self):
           ...
   ```

3. **Test edge cases**:
   - Boundary values (AC 1, AC 30)
   - Empty inputs
   - Invalid data
   - Multi-phase damage
   - Upcasting

4. **Test mathematical accuracy**:
   - Use known values (8d6 = 28.0 average)
   - Test probability bounds (0.05 to 0.95)
   - Verify formulas

5. **Test API permissions**:
   - Authenticated vs unauthenticated
   - Owner vs non-owner
   - Admin vs regular user

### Test Naming Convention

- Test files: `test_*.py`
- Test classes: `Test*`
- Test methods: `test_*`

Example:
```
test_models.py
  TestSpellModel
    test_create_spell
    test_spell_with_upcast
```

## Continuous Integration

Tests run automatically on every push via GitHub Actions:

1. **Linting**: `ruff check`
2. **Formatting**: `black --check`
3. **Type Checking**: `mypy`
4. **Tests**: `pytest --cov`

The CI pipeline **fails** if:
- Any linting errors
- Code is not formatted
- Tests fail
- Coverage drops below 80%

## Fixtures

Common fixtures are defined in `tests/conftest.py`:

```python
@pytest.fixture
def api_client():
    """Unauthenticated API client."""
    return APIClient()

@pytest.fixture
def test_user(db):
    """Basic test user."""
    return User.objects.create_user(
        email='test@example.com',
        password='testpass123'
    )

@pytest.fixture
def authenticated_client(test_user):
    """Authenticated API client."""
    client = APIClient()
    client.force_authenticate(user=test_user)
    return client
```

## Test Data

### Seed Data

Load test spell data:
```bash
make seed
# or
docker-compose exec backend python manage.py seed_spells --all
```

### Spell JSON Files

Located in `documentation/data/`:
- `spells.json`: Core D&D 5e spells
- `TCoE_spells.json`: Tasha's Cauldron of Everything spells

## Debugging Tests

### Print Debugging
```python
def test_something(self):
    result = my_function()
    print(f"Result: {result}")  # Use pytest -s to see output
    assert result == expected
```

### Use `-s` flag to see print statements:
```bash
docker-compose exec backend pytest -s
```

### Use `--pdb` to drop into debugger on failure:
```bash
docker-compose exec backend pytest --pdb
```

### Use `--lf` to re-run only failed tests:
```bash
docker-compose exec backend pytest --lf
```

## Performance Testing

For slow tests, mark them:
```python
@pytest.mark.slow
def test_complex_analysis(self):
    ...
```

Skip slow tests:
```bash
docker-compose exec backend pytest -m "not slow"
```

## Future Enhancements

- [ ] Frontend tests (React Testing Library, Jest)
- [ ] E2E tests (Playwright/Cypress)
- [ ] Load testing (Locust)
- [ ] Mutation testing (mutmut)
- [ ] Property-based testing (Hypothesis)

## Troubleshooting

### Tests hang or timeout
- Check database connection
- Verify Docker services are running: `docker-compose ps`

### Import errors
- Ensure `DJANGO_SETTINGS_MODULE` is set: `export DJANGO_SETTINGS_MODULE=config.settings.test`
- Check `PYTHONPATH` includes backend directory

### Database errors
- Run migrations: `make migrate`
- Clear test database: `docker-compose exec postgres psql -U testuser -c "DROP DATABASE dndoptimizer_test; CREATE DATABASE dndoptimizer_test;"`

### Coverage not updating
- Delete `.coverage` file: `rm backend/.coverage`
- Clear pytest cache: `rm -rf backend/.pytest_cache`

---

**For more information:**
- [pytest documentation](https://docs.pytest.org/)
- [pytest-django documentation](https://pytest-django.readthedocs.io/)
- [Django REST Framework testing](https://www.django-rest-framework.org/api-guide/testing/)
