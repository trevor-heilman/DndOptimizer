# D&D 5e Spell Analysis Web Application  
## Complete Requirements Specification (Version B → Designed to Evolve into C)

> **Historical note:** This document was written when Docker was the planned container runtime. The project has since migrated to **Podman**. All Docker/docker-compose references in this document reflect the original plan.

---

# 1. Project Overview

## 1.1 Purpose

Build a production-grade web application that allows users to:

- Manage D&D 5e spells
- Create and manage spellbooks (prepared spells)
- Import and export spell JSON data
- Create custom spells
- Perform mathematical analysis on spells
- Compare spells for efficiency and optimization
- Analyze upcasting versus alternative spell usage

The core guiding question:

> When is casting a different spell better than upcasting a lower-level spell?

The system must be architected as **Modular Production-Ready (Architecture B)** with clean boundaries and forward compatibility toward **Enterprise DDD Architecture (C)**.

---

# 2. Technology Stack

## 2.1 Backend

- Python 3.12+
- Django 5+
- Django REST Framework
- PostgreSQL
- Celery (future heavy simulations)
- Redis (broker + caching)
- Pytest

## 2.2 Frontend

- React 18+
- TypeScript
- Vite
- Axios
- Zustand or Redux Toolkit
- TailwindCSS or Material UI

## 2.3 DevOps

- Docker
- Docker Compose
- GitHub Actions (CI/CD)
- Coverage reporting
- Environment separation (dev / test / prod)

---

# 3. Architectural Style (B-Level)

## 3.1 App Structure
- backend/
- core/
- users/
- spells/
- spellbooks/
- analysis/

## 3.2 Layered Architecture
Models
↓
Repositories (optional abstraction layer)
↓
Services (business logic lives here)
↓
API (DRF views / serializers)


### Rules

- No business logic in views
- Dice math lives in a reusable engine
- Analysis engine must be isolated and testable
- JSON import logic must be decoupled from models

---

# 4. Domain Model

## 4.1 Spell

Represents a spell record imported or manually created.

### Core Normalized Fields

- id
- name
- level
- school
- casting_time
- range
- duration
- concentration (boolean)
- ritual (boolean)
- source (optional)
- created_by (User FK)
- created_at
- updated_at

### Flexible Storage

- raw_data: JSONField (stores entire original payload)
- parsed_damage_expression (optional structured representation)
- parsed_upcast_scaling (optional structured representation)

The system must tolerate:

- Missing optional fields
- Extra unknown fields
- Different schema shapes
- Multiple JSON sources

---

## 4.2 Spellbook

Represents a user-defined prepared spell collection.

Fields:

- id
- name
- owner (User FK)
- description
- created_at
- updated_at

Relationship:

- Many-to-many with Spell

---

## 4.3 Analysis Context

Represents runtime parameters for comparison.

Inputs:

- target_AC
- target_save_bonus
- number_of_targets
- advantage / disadvantage toggle
- crit_enabled
- half_damage_on_save toggle
- evasion toggle
- caster_attack_bonus
- spell_slot_level
- number_of_rounds (future)

---

# 5. Mathematical Engine Requirements

The system must implement deterministic expected value modeling.

---

## 5.1 Dice Math

For a single die:

Expected value of 1dN: E = (N + 1) / 2

For NdX: E = N * (X + 1) / 2


Must support:

- Flat modifiers
- Multiple dice groups
- Crit doubling of dice
- Scaling dice for upcasting

---

## 5.2 Spell Attack Modeling

Let:

- A = attack bonus
- AC = target armor class

Hit probability: P(hit) = (21 - (AC - A)) / 20


Constraints:

- Minimum 0.05 (natural 20)
- Maximum 0.95 (natural 1 always misses)

Expected damage: E_total = P(hit) * E(damage) + P(crit) * E(extra_dice)


---

## 5.3 Saving Throw Modeling

Let:

- DC = spell save DC
- S = target save bonus

Failure probability: P(fail) = (21 - (DC - S)) / 20


Must support:

- Half damage on success
- Zero damage on success
- Evasion logic
- Advantage/disadvantage

Expected value must incorporate save outcome probabilities.

---

## 5.4 AOE Modeling

Expected total damage: E_total = N_targets * E(single_target)


Future expansion:

- Partial hit distributions
- Variable success rates across targets
- Monte Carlo simulation mode

---

## 5.5 Upcasting

For slot level L:

- Apply scaling dice or scaling flat modifiers
- Compute expected total damage
- Compute efficiency metric:

Efficiency(L) = E_total_damage(L) / L



System must allow:

- Efficiency by slot level
- Efficiency by target count
- Efficiency by AC threshold

---

# 6. Functional Requirements

---

## 6.1 Authentication

- User registration
- Login
- JWT authentication
- Password reset
- User-specific data isolation

---

## 6.2 Spell Management

- Import single spell JSON
- Bulk import spell collection
- Create custom spell
- Edit spell
- Delete spell
- Export spell as JSON
- Handle schema mismatches gracefully
- Validate minimal required fields

---

## 6.3 Spellbook Management

- Create spellbook
- Add spell to spellbook
- Remove spell
- Duplicate spellbook
- Export spellbook JSON

---

## 6.4 Spell Comparison

User selects:

- Two or more spells
- Context parameters

System returns:

- Average damage
- Maximum damage
- Crit-adjusted expected damage
- Hit probability
- Save failure probability
- Damage per slot level
- Efficiency ranking

---

## 6.5 Efficiency Analyzer

Must answer:

- When is upcasting better than alternative spells?
- Which spell is most efficient per level?
- Breakpoint AC where Spell A overtakes Spell B
- Breakpoint target count for AOE superiority

---

# 7. API Design

## Authentication

- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh

## Spells

- GET /api/spells/
- POST /api/spells/
- POST /api/spells/import
- GET /api/spells/{id}
- PUT /api/spells/{id}
- DELETE /api/spells/{id}

## Spellbooks

- GET /api/spellbooks/
- POST /api/spellbooks/
- POST /api/spellbooks/{id}/add-spell
- DELETE /api/spellbooks/{id}/remove-spell

## Analysis

- POST /api/analysis/compare
- POST /api/analysis/efficiency

---

# 8. Database Requirements

Use PostgreSQL.

Tables:

- users
- spells
- spellbooks
- spellbook_spells
- analysis_cache (optional)

Indexes:

- spell name
- spell level
- spell school
- owner foreign keys

---

# 9. Testing Requirements

- Pytest required
- Minimum 80% coverage

## Unit Tests

- Dice parsing
- Dice expected value math
- Hit probability math
- Save probability math
- Upcast scaling
- Efficiency calculations

## Integration Tests

- JSON import
- Spell comparison endpoint
- Spellbook creation
- Auth workflow

## API Tests

- Authentication
- Permission isolation
- CRUD operations

CI must fail if coverage < 80%.

---

# 10. Docker Requirements

Containers:

- backend
- frontend
- postgres
- redis

Environment configs:

- development
- testing
- production

Must support:

- One-command startup
- Isolated test DB
- Seed data option

---

# 11. CI/CD Requirements

GitHub Actions must:

- Run lint (black + ruff)
- Run tests
- Check coverage
- Build Docker image
- Push image to registry
- Prepare for staging deployment

---

# 12. Non-Functional Requirements

- Structured logging
- Error handling middleware
- Pagination on all list endpoints
- OpenAPI schema generation
- Type-safe frontend API layer
- Rate limiting
- Production-ready settings management

---

# 13. Frontend Requirements

## Pages

- Login/Register
- Spell List
- Spell Detail
- Spell Import
- Spellbook Management
- Comparison Dashboard
- Efficiency Dashboard

## Features

- Responsive UI
- Sorting/filtering spells
- Comparison side-by-side view
- Editable context parameters
- Export comparison results

---

# 14. Future Evolution to Architecture C

Planned upgrades:

- Domain-driven design boundaries
- Event-driven simulation engine
- Monte Carlo simulation mode
- Plugin rule engine (house rules)
- Spell effect DSL parser
- Distributed background simulations
- Graph-based damage visualization
- Efficiency heatmaps

---

# 15. Definition of Done

- Fully dockerized
- CI passing
- 80%+ coverage
- Spell import working with dynamic schema
- Spellbook management complete
- Spell comparison operational for:
  - Single-target spell attack
  - AOE save-based spell
  - Upcasting scenarios
- Deployed staging environment

---

# 16. Guiding Principles

- Correct probability modeling over convenience
- Clean architecture over shortcuts
- Testability first
- Extensibility for house rules
- Separation of math engine from API layer

---

END OF REQUIREMENTS (Version B – Forward Compatible with C)