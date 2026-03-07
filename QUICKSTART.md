# Quick Start Guide - Testing the API

## Prerequisites
- Podman and Podman Compose installed
- Terminal access
- API client (Postman, curl, or similar)

## Step 1: Start the Application

```bash
# Navigate to project root
cd DndOptimizer

# Build and start containers
podman compose up --build

# In a new terminal, run migrations
podman compose exec backend python manage.py migrate

# Create superuser
podman compose exec backend python manage.py createsuperuser
```

## Step 2: Access the API

- **API Root**: http://localhost:8000/api/
- **Admin Panel**: http://localhost:8000/admin/
- **Browsable API**: Available at any endpoint when accessed via browser

## Step 3: Test Authentication

### Register a User
```bash
curl -X POST http://localhost:8000/api/users/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPass123!",
    "password_confirm": "TestPass123!"
  }'
```

Response includes user data and JWT tokens.

### Login
```bash
curl -X POST http://localhost:8000/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

Save the `access` token for subsequent requests.

### Get Current User
```bash
curl http://localhost:8000/api/users/me/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Step 4: Create a Spell

```bash
curl -X POST http://localhost:8000/api/spells/spells/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fireball",
    "level": 3,
    "school": "evocation",
    "casting_time": "1 action",
    "range": "150 feet",
    "duration": "Instantaneous",
    "is_saving_throw": true,
    "save_type": "DEX",
    "half_damage_on_save": true,
    "description": "A bright streak flashes from your pointing finger...",
    "damage_components": [
      {
        "dice_count": 8,
        "die_size": 6,
        "damage_type": "fire",
        "timing": "on_fail"
      }
    ]
  }'
```

## Step 5: Create a Spellbook

```bash
curl -X POST http://localhost:8000/api/spellbooks/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Combat Spells",
    "description": "Spells for combat encounters"
  }'
```

Save the spellbook ID from the response.

## Step 6: Add Spell to Spellbook

```bash
curl -X POST http://localhost:8000/api/spellbooks/{SPELLBOOK_ID}/add_spell/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spell_id": "SPELL_UUID",
    "prepared": true,
    "notes": "Great for crowd control"
  }'
```

## Step 7: Analyze a Spell

```bash
curl -X POST http://localhost:8000/api/analysis/analyze/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spell_id": "SPELL_UUID",
    "target_save_bonus": 2,
    "spell_save_dc": 15,
    "number_of_targets": 3,
    "spell_slot_level": 3
  }'
```

## Step 8: Compare Two Spells

First, create another spell (e.g., Lightning Bolt), then:

```bash
curl -X POST http://localhost:8000/api/analysis/compare/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spell_a_id": "FIREBALL_UUID",
    "spell_b_id": "LIGHTNING_BOLT_UUID",
    "target_save_bonus": 2,
    "spell_save_dc": 15,
    "number_of_targets": 3,
    "spell_slot_level": 3
  }'
```

## Step 9: Check Spell Efficiency

```bash
curl -X POST http://localhost:8000/api/analysis/efficiency/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spell_id": "SPELL_UUID",
    "min_slot_level": 3,
    "max_slot_level": 5,
    "target_save_bonus": 2,
    "spell_save_dc": 15,
    "number_of_targets": 3
  }'
```

## Step 10: Import Spells from JSON

```bash
curl -X POST http://localhost:8000/api/spells/spells/import_spells/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "spells": [
      {
        "name": "Magic Missile",
        "level": 1,
        "school": "evocation",
        "description": "Three darts of magical force..."
      }
    ],
    "source": "PHB",
    "auto_parse": true
  }'
```

## Using the Browsable API

1. Open http://localhost:8000/api/ in your browser
2. Navigate to any endpoint
3. Use the login form (top right) to authenticate
4. POST forms and options will appear for authenticated users
5. View responses in formatted JSON

## Common Query Parameters

### Spell Filtering
```
GET /api/spells/spells/?level=3&school=evocation&concentration=true
GET /api/spells/spells/?search=fireball
GET /api/spells/spells/?ordering=-level
```

### Pagination
```
GET /api/spells/spells/?page=2
```

## Debugging Tips

### Check Logs
```bash
podman compose logs -f backend
```

### Access Django Shell
```bash
podman compose exec backend python manage.py shell
```

### Run Tests
```bash
podman compose exec backend pytest
```

### Check Database
```bash
podman compose exec db psql -U dnduser -d dndoptimizer
```

## Troubleshooting

### Migrations Not Applied
```bash
podman compose exec backend python manage.py migrate
```

### Token Expired
Request a new token:
```bash
curl -X POST http://localhost:8000/api/users/token/refresh/ \
  -H "Content-Type: application/json" \
  -d '{"refresh": "YOUR_REFRESH_TOKEN"}'
```

### Permission Denied
Ensure you're including the Authorization header with a valid token.

### Container Not Starting
```bash
podman compose down
podman compose up --build
```

## Next Steps

- **Write tests**: See `documentation/API_LAYER_COMPLETE.md` for test recommendations
- **Add sample data**: Create a management command to seed spells
- **Build frontend**: Start React app to consume this API
- **Add parsing**: Implement the spell damage parsing service

Happy testing! 🎲
