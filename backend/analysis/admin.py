from django.contrib import admin

from .models import AnalysisContext, SpellComparison


@admin.register(AnalysisContext)
class AnalysisContextAdmin(admin.ModelAdmin):
    list_display = ('id', 'target_ac', 'spell_save_dc', 'number_of_targets', 'spell_slot_level', 'created_at')
    list_filter = ('advantage', 'disadvantage', 'crit_enabled', 'created_at')
    readonly_fields = ('id', 'created_at')


@admin.register(SpellComparison)
class SpellComparisonAdmin(admin.ModelAdmin):
    list_display = ('spell_a', 'spell_b', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('spell_a__name', 'spell_b__name')
    readonly_fields = ('id', 'created_at', 'results')
