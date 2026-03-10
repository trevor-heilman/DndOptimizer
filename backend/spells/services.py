"""
Spell Parsing Service
Extracts damage information, spell type, and scaling from spell descriptions.
"""
import re
from typing import Dict, List, Tuple, Optional, Any
from django.db import transaction


class DamageExtractionService:
    """
    Service for extracting damage information from spell descriptions.
    Uses regex patterns to identify dice expressions and damage types.
    """
    
    # Regex patterns
    DICE_PATTERN = re.compile(r'(\d+)d(\d+)', re.IGNORECASE)
    DAMAGE_TYPE_PATTERN = re.compile(
        r'\b(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|'
        r'psychic|radiant|slashing|thunder)\s+damage\b',
        re.IGNORECASE
    )
    ATTACK_KEYWORDS = [
        'make a ranged spell attack',
        'make a melee spell attack',
        'spell attack',
        'on a hit'
    ]
    SAVE_KEYWORDS = [
        'saving throw',
        'must succeed on a',
        'make a dexterity save',
        'make a constitution save',
        'make a wisdom save'
    ]
    SAVE_TYPE_PATTERN = re.compile(
        r'\b(strength|dexterity|constitution|intelligence|wisdom|charisma)\s+saving\s+throw\b',
        re.IGNORECASE
    )
    HALF_DAMAGE_KEYWORDS = [
        'half as much damage on a success',
        'half damage on a successful save',
        'takes half damage on a success'
    ]
    UPCAST_PATTERN = re.compile(
        r'(?:for each|when you cast this spell using a spell slot of).*?'
        r'(?:(\d+)d(\d+)|(\d+)\s+(?:additional|extra))',
        re.IGNORECASE
    )
    
    @classmethod
    def extract_dice_expressions(cls, text: str) -> List[Tuple[int, int]]:
        """
        Extract all dice expressions from text.
        Returns list of (dice_count, die_size) tuples.
        """
        matches = cls.DICE_PATTERN.findall(text)
        return [(int(count), int(size)) for count, size in matches]
    
    @classmethod
    def extract_damage_types(cls, text: str) -> List[str]:
        """Extract all damage types mentioned in text."""
        matches = cls.DAMAGE_TYPE_PATTERN.findall(text)
        return [match.lower() for match in matches]
    
    @classmethod
    def detect_attack_spell(cls, text: str) -> bool:
        """Check if spell involves an attack roll."""
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in cls.ATTACK_KEYWORDS)
    
    @classmethod
    def detect_save_spell(cls, text: str) -> bool:
        """Check if spell involves a saving throw."""
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in cls.SAVE_KEYWORDS)
    
    @classmethod
    def extract_save_type(cls, text: str) -> Optional[str]:
        """Extract the saving throw type (STR, DEX, CON, etc.)."""
        match = cls.SAVE_TYPE_PATTERN.search(text)
        if match:
            save_type = match.group(1).upper()
            # Map to 3-letter code
            mappings = {
                'STRENGTH': 'STR',
                'DEXTERITY': 'DEX',
                'CONSTITUTION': 'CON',
                'INTELLIGENCE': 'INT',
                'WISDOM': 'WIS',
                'CHARISMA': 'CHA'
            }
            return mappings.get(save_type, save_type[:3])
        return None
    
    @classmethod
    def detect_half_damage_on_save(cls, text: str) -> bool:
        """Check if spell does half damage on successful save."""
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in cls.HALF_DAMAGE_KEYWORDS)
    
    @classmethod
    def extract_upcast_scaling(cls, text: str) -> Optional[Tuple[int, int]]:
        """
        Extract upcast scaling information.
        Returns (dice_count, die_size) if found.
        """
        match = cls.UPCAST_PATTERN.search(text)
        if match:
            if match.group(1) and match.group(2):
                return (int(match.group(1)), int(match.group(2)))
        return None


class ConfidenceScoringService:
    """
    Service for calculating confidence scores for parsed spell data.
    """
    
    @staticmethod
    def calculate_confidence(parsing_data: Dict[str, Any]) -> float:
        """
        Calculate confidence score based on what was successfully extracted.
        Score ranges from 0.0 to 1.0.
        """
        score = 0.0
        max_score = 0.0
        
        # Dice expressions found (weight: 0.3)
        max_score += 0.3
        if parsing_data.get('dice_expressions'):
            score += 0.3
        
        # Damage type found (weight: 0.2)
        max_score += 0.2
        if parsing_data.get('damage_types'):
            score += 0.2
        
        # Spell type detected (attack or save) (weight: 0.2)
        max_score += 0.2
        if parsing_data.get('is_attack_roll') or parsing_data.get('is_saving_throw'):
            score += 0.2
        
        # Save type extracted for save spells (weight: 0.15)
        max_score += 0.15
        if parsing_data.get('is_saving_throw'):
            if parsing_data.get('save_type'):
                score += 0.15
        else:
            # Not applicable for non-save spells
            score += 0.15
        
        # Half damage mechanic detected for save spells (weight: 0.15)
        max_score += 0.15
        if parsing_data.get('is_saving_throw'):
            if 'half_damage_on_save' in parsing_data:
                score += 0.15
        else:
            # Not applicable for non-save spells
            score += 0.15
        
        return score / max_score if max_score > 0 else 0.0


class SpellParsingService:
    """
    Main service for parsing spell data from various JSON schemas.
    Supports:
      - snake_case array schema (spells.json)
      - PascalCase keyed-dict schema (TCoE / D&D Beyond export)
      - Open5e / SRD schema (desc field, nested school object)
    """

    # ------------------------------------------------------------------ #
    # Keyword lists for tag inference
    # ------------------------------------------------------------------ #
    _HEALING_KEYWORDS = [
        'regain hit points', 'restore hit points', 'healing',
        'regains hit points', 'restores hit points', 'gain hit points',
        'hit points equal', 'cure wounds', 'heal the creature',
    ]
    _AOE_KEYWORDS = [
        'each creature', 'all creatures', 'cylinder', 'cube', 'sphere',
        'cone', 'in a line', 'within range of', 'point you choose',
        'radius', 'emanates', 'burst',
    ]
    _CROWD_CONTROL_KEYWORDS = [
        'charmed', 'frightened', 'stunned', 'paralyzed', 'restrained',
        'incapacitated', 'becomes prone', 'knocked prone', 'falls prone',
        'grappled', 'petrified', 'blinded', 'deafened', 'poisoned',
        'falls unconscious', 'falls asleep',
    ]
    _SUMMON_KEYWORDS = [
        'summon ', 'conjure ', 'you create ', 'animate dead',
        'create undead', 'familiar appears', 'elemental appears',
        'creates a construct', 'raises the corpse',
    ]
    _BUFF_KEYWORDS = [
        'advantage on', 'add your', 'add a d', 'bonus to attack',
        'resistance to', 'immune to damage', 'gain a bonus',
        'double the', 'gain advantage', "can't be hit",
        'protected from', 'grant a bonus', 'increase its',
    ]
    _DEBUFF_KEYWORDS = [
        'disadvantage on', 'reduces the target', 'penalty to',
        'vulnerability to', 'reduces its speed', 'subtract',
    ]
    _UTILITY_KEYWORDS = [
        'teleport', 'detect', 'reveal', 'find', 'communicate',
        'understand', 'speak with', 'read', 'transmit', 'transport',
        'fly', 'levitate', 'invisible', 'disguise', 'transform',
    ]

    @classmethod
    def _infer_tags(
        cls,
        description: str,
        higher_level: str,
        dice_expressions: List[Tuple[int, int]],
        damage_types: List[str],
    ) -> List[str]:
        """
        Infer gameplay-category tags from parsed spell data.
        A spell can receive multiple tags (e.g. damage + aoe).
        Every spell gets at least one tag: 'utility' is the fallback.
        """
        text = (description + ' ' + higher_level).lower()
        tags: set = set()

        # Damage: needs dice AND a named damage type
        if dice_expressions and damage_types:
            tags.add('damage')

        # Healing
        if any(kw in text for kw in cls._HEALING_KEYWORDS):
            tags.add('healing')

        # AoE
        if any(kw in text for kw in cls._AOE_KEYWORDS):
            tags.add('aoe')

        # Crowd control
        if any(kw in text for kw in cls._CROWD_CONTROL_KEYWORDS):
            tags.add('crowd_control')

        # Summoning / conjuration
        if any(kw in text for kw in cls._SUMMON_KEYWORDS):
            tags.add('summoning')

        # Buff (suppress if already tagged as damage, healing, or cc)
        if any(kw in text for kw in cls._BUFF_KEYWORDS):
            if not tags.intersection({'damage', 'healing', 'crowd_control'}):
                tags.add('buff')

        # Debuff
        if any(kw in text for kw in cls._DEBUFF_KEYWORDS):
            tags.add('debuff')

        # Utility keywords give a utility tag even alongside other tags
        if any(kw in text for kw in cls._UTILITY_KEYWORDS):
            tags.add('utility')

        # Fallback: every spell must have at least one tag
        if not tags:
            tags.add('utility')

        return sorted(tags)

    # Maps PascalCase TCoE/D&DBeyond field names to our internal snake_case names
    _PASCAL_FIELD_MAP = {
        'Name': 'name',
        'Level': 'level',
        'School': 'school',
        'CastingTime': 'casting_time',
        'Range': 'range',
        'Duration': 'duration',
        'Ritual': 'ritual',
        'Description': 'description',
        'Source': 'source',
        'Components': 'components_raw',
        'Classes': 'classes',
        'HigherLevel': 'higher_level',
        'AtHigherLevels': 'higher_level',
    }

    @classmethod
    def _normalize_raw(cls, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalize a raw spell dict from any known schema into a consistent
        internal snake_case representation before further parsing.
        """
        # Detect PascalCase schema by presence of 'Name' (capital N)
        if 'Name' in raw_data and 'name' not in raw_data:
            normalized: Dict[str, Any] = {}
            for pascal, snake in cls._PASCAL_FIELD_MAP.items():
                if pascal in raw_data:
                    normalized[snake] = raw_data[pascal]
            # Carry over any fields already in snake_case (future-proofing)
            for k, v in raw_data.items():
                if k not in cls._PASCAL_FIELD_MAP and k == k.lower():
                    normalized.setdefault(k, v)
            return normalized

        # Already snake_case — return as-is
        return raw_data

    @classmethod
    def parse_spell_data(cls, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse spell data from raw JSON and extract normalized fields.
        Returns a dictionary with normalized spell data and confidence score.
        Handles snake_case, PascalCase, and Open5e schemas automatically.
        """
        # Normalize field names across different source schemas
        raw_data = cls._normalize_raw(raw_data)

        # Extract description — try multiple field names used by different schemas
        description = raw_data.get('description') or raw_data.get('desc', '')
        if isinstance(description, list):
            description = ' '.join(description)

        # Extract higher-level text — multiple field names
        higher_level = raw_data.get('higher_level') or raw_data.get('higher_levels', '')
        if isinstance(higher_level, list):
            higher_level = ' '.join(higher_level)
        
        full_text = f"{description} {higher_level}"
        
        # Extract damage information
        dice_expressions = DamageExtractionService.extract_dice_expressions(full_text)
        damage_types = DamageExtractionService.extract_damage_types(full_text)
        
        # Detect spell type
        is_attack_roll = DamageExtractionService.detect_attack_spell(full_text)
        is_saving_throw = DamageExtractionService.detect_save_spell(full_text)
        
        # Extract save information
        save_type = None
        half_damage_on_save = False
        if is_saving_throw:
            save_type = DamageExtractionService.extract_save_type(full_text)
            half_damage_on_save = DamageExtractionService.detect_half_damage_on_save(full_text)
        
        # Extract spell level early (needed for cantrip detection below)
        raw_level = raw_data.get('level', 0)
        if isinstance(raw_level, str):
            raw_level = 0 if raw_level.lower() == 'cantrip' else int(raw_level)

        # Extract upcast information
        upcast_scaling = DamageExtractionService.extract_upcast_scaling(higher_level)

        # Detect cantrip character-level scaling (e.g. Fire Bolt: 1d10 → 2d10 → 3d10 → 4d10
        # at character levels 1, 5, 11, 17).  When found, trim dice_expressions to the base
        # die only — avoids creating one DamageComponent per scaling tier.
        _CANTRIP_TIER_KW = ('5th level', '11th level', '17th level')
        if (
            raw_level == 0
            and len(dice_expressions) >= 2
            and len(set(d[1] for d in dice_expressions)) == 1   # all same die size
            and any(kw in full_text.lower() for kw in _CANTRIP_TIER_KW)
        ):
            _ct_die_size = dice_expressions[0][1]
            dice_expressions = [(1, _ct_die_size)]
            # Record scaling in upcast fields unless slot-upcasting was already detected
            if not upcast_scaling:
                upcast_scaling = (1, _ct_die_size)

        # Build parsing data
        parsing_data = {
            'dice_expressions': dice_expressions,
            'damage_types': damage_types,
            'is_attack_roll': is_attack_roll,
            'is_saving_throw': is_saving_throw,
            'save_type': save_type,
            'half_damage_on_save': half_damage_on_save,
            'upcast_scaling': upcast_scaling,
        }
        
        # Calculate confidence
        confidence = ConfidenceScoringService.calculate_confidence(parsing_data)
        
        # Build normalized spell data
        # casting_time: accept both 'casting_time' and 'castingTime'
        casting_time = raw_data.get('casting_time') or raw_data.get('castingTime', '')

        # Extract classes — may be a list of names or a list of {name: str} objects
        raw_classes = raw_data.get('classes', [])
        if isinstance(raw_classes, list):
            classes = [
                (c['name'].lower() if isinstance(c, dict) else str(c).lower())
                for c in raw_classes
            ]
        else:
            classes = []

        normalized_data = {
            'name': raw_data.get('name', 'Unnamed Spell'),
            'level': raw_level,
            'school': cls._extract_school(raw_data),
            'casting_time': casting_time,
            'range': raw_data.get('range', ''),
            'duration': raw_data.get('duration', ''),
            'concentration': cls._detect_concentration(raw_data),
            'ritual': raw_data.get('ritual', False),
            'source': raw_data.get('source', ''),
            'is_attack_roll': is_attack_roll,
            'is_saving_throw': is_saving_throw,
            'save_type': save_type,
            'half_damage_on_save': half_damage_on_save,
            'description': description,
            'higher_level': higher_level,
            'raw_data': raw_data,
            'classes': classes,
        }
        
        # Add upcast data if found
        if upcast_scaling:
            normalized_data['upcast_dice_increment'] = upcast_scaling[0]
            normalized_data['upcast_die_size'] = upcast_scaling[1]

        # Infer gameplay tags (always at least one)
        normalized_data['tags'] = cls._infer_tags(
            description, higher_level, dice_expressions, damage_types
        )

        return {
            'normalized_data': normalized_data,
            'parsing_data': parsing_data,
            'confidence': confidence,
            'requires_review': confidence < 0.7
        }
    
    @staticmethod
    def _extract_school(raw_data: Dict[str, Any]) -> str:
        """Extract school from various schema formats."""
        school = raw_data.get('school', '')
        
        # Handle nested school object
        if isinstance(school, dict):
            school = school.get('name', '')
        
        # Normalize to lowercase
        if isinstance(school, str):
            school = school.lower().strip()
        
        # Validate against known schools
        valid_schools = [
            'abjuration', 'conjuration', 'divination', 'enchantment',
            'evocation', 'illusion', 'necromancy', 'transmutation'
        ]
        
        if school in valid_schools:
            return school
        
        return 'evocation'  # Default
    
    @staticmethod
    def _detect_concentration(raw_data: Dict[str, Any]) -> bool:
        """Detect if spell requires concentration."""
        # Check direct field
        if 'concentration' in raw_data:
            return bool(raw_data['concentration'])
        
        # Check in duration
        duration = raw_data.get('duration', '')
        if isinstance(duration, str):
            return 'concentration' in duration.lower()
        
        return False
    
    @classmethod
    @transaction.atomic
    def create_spell_from_parsed_data(cls, parsed_result: Dict[str, Any], created_by=None):
        """
        Create a Spell instance with DamageComponents and ParsingMetadata.
        """
        from spells.models import Spell, DamageComponent, SpellParsingMetadata
        
        normalized = parsed_result['normalized_data']
        parsing_data = parsed_result['parsing_data']
        
        # Create spell
        spell = Spell.objects.create(
            created_by=created_by,
            **normalized
        )
        
        # Create damage components
        dice_expressions = parsing_data.get('dice_expressions', [])
        damage_types = parsing_data.get('damage_types', ['force'])  # default
        
        for i, (dice_count, die_size) in enumerate(dice_expressions):
            damage_type = damage_types[i] if i < len(damage_types) else damage_types[0] if damage_types else 'force'
            
            timing = 'on_hit' if normalized['is_attack_roll'] else 'on_fail'
            
            DamageComponent.objects.create(
                spell=spell,
                dice_count=dice_count,
                die_size=die_size,
                damage_type=damage_type,
                timing=timing,
                is_verified=False
            )
        
        # Create parsing metadata
        SpellParsingMetadata.objects.create(
            spell=spell,
            parsing_confidence=parsed_result['confidence'],
            requires_review=parsed_result['requires_review'],
            parsing_notes=parsing_data,
            auto_extracted_components={
                'dice_expressions': dice_expressions,
                'damage_types': damage_types
            }
        )
        
        return spell
