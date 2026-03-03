from django.contrib import admin
from .models import Spellbook, PreparedSpell


class PreparedSpellInline(admin.TabularInline):
    model = PreparedSpell
    extra = 1
    autocomplete_fields = ['spell']


@admin.register(Spellbook)
class SpellbookAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'spell_count', 'prepared_spell_count', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('name', 'owner__username', 'owner__email')
    readonly_fields = ('id', 'created_at', 'updated_at')
    inlines = [PreparedSpellInline]
    
    def spell_count(self, obj):
        return obj.spell_count
    spell_count.short_description = 'Total Spells'
    
    def prepared_spell_count(self, obj):
        return obj.prepared_spell_count
    prepared_spell_count.short_description = 'Prepared'


@admin.register(PreparedSpell)
class PreparedSpellAdmin(admin.ModelAdmin):
    list_display = ('spell', 'spellbook', 'prepared', 'added_at')
    list_filter = ('prepared', 'added_at')
    search_fields = ('spell__name', 'spellbook__name')
    autocomplete_fields = ['spell', 'spellbook']
