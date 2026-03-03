# Contributing to DndOptimizer

Thank you for considering contributing to DndOptimizer! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/DndOptimizer.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Push to your fork and submit a pull request

## Development Standards

Please review [.github/copilot-instructions.md](.github/copilot-instructions.md) for comprehensive coding standards. Key points:

### Code Quality
- Use type hints throughout Python code
- Follow PEP8 style guide
- Write docstrings for all services and complex functions
- No business logic in views; use service layers

### Testing
- Minimum 80% code coverage required
- Write unit tests for all services and math logic
- Write integration tests for API endpoints
- Test edge cases (multi-phase damage, upcasting, schema variants)

### Before Submitting PR
1. Run tests: `make test` or `pytest`
2. Run linting: `make lint`
3. Format code: `make format`
4. Ensure migrations are included if models changed
5. Update documentation if needed

### Commit Messages
- Use clear, descriptive commit messages
- Format: `<type>: <subject>`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Example: `feat: add spell comparison endpoint`

## Pull Request Process

1. Update the README.md with details of changes if needed
2. Ensure all tests pass and coverage is maintained
3. Update documentation for any API changes
4. Request review from maintainers
5. Address review feedback promptly

## Project Structure

```
backend/
├── config/       # Django settings
├── core/         # Shared utilities
├── users/        # Authentication
├── spells/       # Spell models & parsing
├── spellbooks/   # Spellbook management
└── analysis/     # Mathematical engine
```

## Running Tests Locally

```bash
# With Docker
make test

# Without Docker
cd backend
pytest --cov=. --cov-report=term-missing
```

## Code Style

```bash
# Format code
make format

# Or manually:
cd backend
black .
ruff check --fix .
```

## Questions?

Open an issue for:
- Bug reports
- Feature requests
- Documentation improvements
- Questions about contributing

Thank you for contributing! 🎲
