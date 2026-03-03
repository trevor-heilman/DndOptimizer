from django.contrib import admin
from .models import Spell, DamageComponent, SpellParsingMetadata


class DamageComponentInline(admin.TabularInline):
    model = DamageComponent
    extra = 1


@admin.register(Spell)
class SpellAdmin(admin.ModelAdmin):
    list_display = ('name', 'level', 'school', 'is_attack_roll', 'is_saving_throw', 'created_by', 'created_at')
    list_filter = ('level', 'school', 'is_attack_roll', 'is_saving_throw', 'concentration', 'ritual')
    search_fields = ('name', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')
    inlines = [DamageComponentInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'name', 'level', 'school', 'source', 'is_custom')
        }),
        ('Casting Properties', {
            'fields': ('casting_time', 'range', 'duration', 'concentration', 'ritual')
        }),
        ('Combat Properties', {
            'fields': ('is_attack_roll', 'is_saving_throw', 'save_type', 'half_damage_on_save', 'number_of_attacks', 'crit_enabled', 'aoe_radius', 'damage_type')
        }),
        ('Upcast Properties', {
            'fields': ('upcast_base_level', 'upcast_dice_increment', 'upcast_die_size')
        }),
        ('Description', {
            'fields': ('description', 'higher_level')
        }),
        ('Raw Data', {
            'fields': ('raw_data',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
    )


@admin.register(DamageComponent)
class DamageComponentAdmin(admin.ModelAdmin):
    list_display = ('spell', 'dice_count', 'die_size', 'damage_type', 'timing', 'is_verified')
    list_filter = ('damage_type', 'timing', 'is_verified', 'scales_with_slot')
    search_fields = ('spell__name',)


@admin.register(SpellParsingMetadata)
class SpellParsingMetadataAdmin(admin.ModelAdmin):
    list_display = ('spell', 'parsing_confidence', 'requires_review', 'reviewed_by', 'reviewed_at')
    list_filter = ('requires_review', 'reviewed_at')
    search_fields = ('spell__name',)
    readonly_fields = ('created_at', 'updated_at')
