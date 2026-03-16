"""
Cache key builders and helpers for Spellwright.

All TTLs are in seconds.  Keys are kept intentionally readable so they can be
inspected in Redis with KEYS or SCAN.
"""

import hashlib
import json

from django.core.cache import cache

# ---------------------------------------------------------------------------
# TTLs
# ---------------------------------------------------------------------------
SPELL_DETAIL_TTL = 300  # 5 min  — individual spell with damage components
SPELL_COUNTS_TTL = 60  # 1 min  — per-user spell category counts
ANALYSIS_TTL = 600  # 10 min — deterministic analysis results


# ---------------------------------------------------------------------------
# Key builders
# ---------------------------------------------------------------------------


def _hash(data: dict) -> str:
    """Deterministic MD5 of a sorted-key JSON dict (hex, 16 chars)."""
    canonical = json.dumps(data, sort_keys=True, default=str)
    return hashlib.md5(canonical.encode()).hexdigest()[:16]


def spell_detail_key(spell_id, spell_updated_at) -> str:
    """Cache key for a single spell's full detail (includes updated_at for automatic invalidation)."""
    ts = spell_updated_at.timestamp() if spell_updated_at else 0
    return f"spell:detail:{spell_id}:{int(ts)}"


def spell_counts_key(user_id) -> str:
    return f"spell:counts:{user_id}"


def analysis_key(action: str, spell_ids: list, context_data: dict) -> str:
    """Generic analysis result cache key."""
    ids = ":".join(str(s) for s in spell_ids)
    return f"analysis:{action}:{ids}:{_hash(context_data)}"


# ---------------------------------------------------------------------------
# Invalidation helpers
# ---------------------------------------------------------------------------


def invalidate_spell_counts(user_id) -> None:
    cache.delete(spell_counts_key(user_id))


def invalidate_spell_counts_and_detail(spell_id, user_id, spell_updated_at=None) -> None:
    """Invalidate a spell's detail cache and the owner's counts cache."""
    if spell_updated_at:
        cache.delete(spell_detail_key(spell_id, spell_updated_at))
    invalidate_spell_counts(user_id)
