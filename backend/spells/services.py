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
    """
    
    @classmethod
    def parse_spell_data(cls, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse spell data from raw JSON and extract normalized fields.
        Returns a dictionary with normalized spell data and confidence score.
        """
        # Extract text for parsing
        description = raw_data.get('desc', '')
        if isinstance(description, list):
            description = ' '.join(description)
        
        higher_level = raw_data.get('higher_level', '')
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
        
        # Extract upcast information
        upcast_scaling = DamageExtractionService.extract_upcast_scaling(higher_level)
        
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
        normalized_data = {
            'name': raw_data.get('name', 'Unnamed Spell'),
            'level': raw_data.get('level', 0),
            'school': cls._extract_school(raw_data),
            'casting_time': raw_data.get('casting_time', ''),
            'range': raw_data.get('range', ''),
            'duration': raw_data.get('duration', ''),
            'concentration': cls._detect_concentration(raw_data),
            'ritual': raw_data.get('ritual', False),
            'is_attack_roll': is_attack_roll,
            'is_saving_throw': is_saving_throw,
            'save_type': save_type,
            'half_damage_on_save': half_damage_on_save,
            'description': description,
            'higher_level': higher_level,
            'raw_data': raw_data,
        }
        
        # Add upcast data if found
        if upcast_scaling:
            normalized_data['upcast_dice_increment'] = upcast_scaling[0]
            normalized_data['upcast_die_size'] = upcast_scaling[1]
        
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
