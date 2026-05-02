/**
 * Effects Registry — Battle-Flow Effects for Abilities and Items
 * ----------------------------------------------------------------
 * Data-driven replacement for hardcoded ability/item checks in roundsim_app.js.
 *
 * SCOPE: Only battle-flow effects (speed, turn order, contact, survival, EOT,
 * status, berries). DAMAGE multipliers (Choice Band, Silk Scarf, Wise Glasses,
 * Huge Power, Thick Fat, etc.) are handled by the calc engine — NOT here.
 *
 * SCHEMA:
 *   window.EffectsRegistry = {
 *     abilities: { <slugifiedKey>: { ...effectFlags } },
 *     items:     { <slugifiedKey>: { ...effectFlags } }
 *   }
 *
 *   Slugified key = ability/item name lowercased with all whitespace,
 *   hyphens and apostrophes removed. e.g. "Magic Guard" -> "magicguard",
 *   "Choice Scarf" -> "choicescarf".
 *
 * Each entry contains one or more EFFECT FLAGS (documented below).
 * The engine reads flags GENERICALLY — adding a new ability/item is a data edit,
 * not a code change.
 *
 * --- ABILITY EFFECT FLAGS ---
 *   typeImmunity:           string         — type name this ability is immune to
 *   typeDamageMod:          { type, multiplier }
 *                                          — extra multiplier when hit by this type
 *   wonderGuard:            true           — only super-effective moves land
 *   speedMod:               { multiplier, condition? }
 *                                          — speed multiplier; condition may include:
 *                                              weather: string[]
 *                                              terrain: string[]
 *                                              hasStatus: true
 *                                              lostItem: true
 *                                          (no condition = always applies)
 *   weatherDamageImmunity:  true           — immune to sandstorm/hail chip damage
 *   indirectDamageImmunity: true           — immune to ALL indirect damage
 *                                            (hazards, status, weather, recoil, Life Orb)
 *   recoilImmunity:         true           — immune to move recoil only
 *   contactRecoil:          number         — fraction of attacker maxHP lost on contact
 *   ignoresAbility:         true           — bypasses defender abilities (Sturdy etc.)
 *   survivalFullHP:         true           — survives one hit at 1 HP from full HP
 *   statusImmunity:         string[]       — list of statuses blocked
 *                                            ('Sleep','Freeze','Burn','Poison',
 *                                             'Badly Poisoned','Paralysis','any')
 *   statusHeal:             { status, frac }
 *                                          — converts status DAMAGE into healing
 *   burnAttackBoost:        true           — ignores burn Atk drop AND blocks burn chip
 *   eatBerryThreshold:      number         — denominator for berry trigger HP threshold
 *                                            (2 = ≤50% HP, 4 = ≤25% HP)
 *   flinchImmunity:         true           — cannot be made to flinch
 *   secondaryImmunity:      true           — blocks all secondary effects
 *   allyDamageImmunity:     true           — blocks ally spread-move damage
 *   reactiveSpeedDrop:      number         — drops attacker speed stages on hit
 *   unburden:               true           — speed doubles when item lost
 *
 *   -- new categories (Phase 3 features) --
 *   contactStatusInflict:   { chance, status }
 *                                          — % chance to inflict status on attacker
 *                                            making contact. status can be:
 *                                              'Burn','Paralysis','Poison',
 *                                              'effectspore' (10/10/10 par/poi/slp),
 *                                              'speeddrop'
 *   priorityMod:            { boost, condition? }
 *                                          — adds to move priority bracket; condition:
 *                                              category: 'Status'|'Physical'|'Special'
 *                                              moveType: string (e.g. 'Flying')
 *                                              isHealing: true
 *                                              fullHP: true
 *                                              alwaysLast: true   (Stall)
 *   onKO:                   { type, fraction? }
 *                                          — triggers when this Pokemon is KOed
 *                                            type: 'aftermath' (1/4 to attacker if contact)
 *                                                  'innardsout' (damage = lethal hit)
 *   eotSpeedBoost:          number         — stages of Speed gained at end of turn
 *   synchronize:            true           — reflects burn/paralysis/poison
 *   protosynthesisQuark:    { trigger }    — trigger: 'sun' | 'electricterrain'
 *
 * --- ITEM EFFECT FLAGS ---
 *   speedMod:                  { multiplier, condition? }
 *                                          — same shape as ability speedMod;
 *                                            condition may include:
 *                                              speciesOnly: string  (Quick Powder/Ditto)
 *   contactRecoilToAttacker:   number      — fraction of attacker maxHP on contact
 *   attackerSelfRecoil:        number      — fraction of holder maxHP after attacking
 *   eotHealing:                { frac, condition? }
 *                                          — fraction restored at EOT;
 *                                            condition.holderType = type required
 *                                            condition.elseDamageFrac = damage if not type
 *   eotStatusInflict:          string      — status applied to holder at EOT
 *   survivalFullHP:            true        — Focus Sash style 1-HP survival
 *   priorityBoost:             { boost, hpThreshold }
 *                                          — +priority at low HP (Custap Berry)
 *                                            hpThreshold: denominator (4 = ≤25%)
 *   statusCure:                string      — status this item cures, or 'any'
 *                                            ('confusion' for Persim Berry)
 *   hpRestore:                 { frac, hpThreshold }
 *                                          — restore HP fraction when at low HP
 *   floatImmunity:             true        — Air Balloon: Ground immunity
 *
 *   -- new categories (Phase 3 features) --
 *   moveLastInBracket:         true        — Lagging Tail / Full Incense
 *   randomMoveFirst:           { chance }  — Quick Claw 20% chance
 *   eotDamage:                 { frac }    — Sticky Barb chip
 *   hazardImmunity:            true        — Heavy-Duty Boots
 *   contactAvoidance:          true        — Protective Pads (skip contact effects)
 *
 * --- USAGE BY ENGINE ---
 *   Lookups go via slug:
 *     var key = (entry.ability || '').toLowerCase().replace(/[\s\-\']+/g, '');
 *     var reg = (window.EffectsRegistry && window.EffectsRegistry.abilities[key]) || null;
 *     if (reg && reg.typeImmunity === atkType) return 0;
 */

window.EffectsRegistry = {

  /* ================================================================
   *                          ABILITIES
   * ================================================================ */
  abilities: {

    /* --- Type Immunities (full immunity to a damaging type) --- */
    levitate:        { typeImmunity: 'Ground' },
    flashfire:       { typeImmunity: 'Fire' },
    voltabsorb:      { typeImmunity: 'Electric' },
    lightningrod:    { typeImmunity: 'Electric' },
    motordrive:      { typeImmunity: 'Electric' },
    waterabsorb:     { typeImmunity: 'Water' },
    stormdrain:      { typeImmunity: 'Water' },
    sapsipper:       { typeImmunity: 'Grass' },
    eartheater:      { typeImmunity: 'Ground' },
    wellbakedbody:   { typeImmunity: 'Fire' },
    dryskin:         { typeImmunity: 'Water', typeDamageMod: { type: 'Fire', multiplier: 1.25 } },

    /* --- Wonder Guard --- */
    wonderguard:     { wonderGuard: true },

    /* --- Speed Modifiers (weather/terrain/status conditional) --- */
    swiftswim:       { speedMod: { multiplier: 2,   condition: { weather: ['Rain', 'Heavy Rain'] } } },
    chlorophyll:     { speedMod: { multiplier: 2,   condition: { weather: ['Sun', 'Harsh Sunshine'] } } },
    sandrush:        { speedMod: { multiplier: 2,   condition: { weather: ['Sand'] } },
                       weatherDamageImmunity: true },
    slushrush:       { speedMod: { multiplier: 2,   condition: { weather: ['Snow', 'Hail'] } } },
    surgesurfer:     { speedMod: { multiplier: 2,   condition: { terrain: ['Electric'] } } },
    quickfeet:       { speedMod: { multiplier: 1.5, condition: { hasStatus: true } } },
    slowstart:       { speedMod: { multiplier: 0.5 } },
    unburden:        { unburden: true },

    /* --- Weather Damage Immunity --- */
    overcoat:        { weatherDamageImmunity: true },
    magicguard:      { indirectDamageImmunity: true, weatherDamageImmunity: true },
    sandveil:        { weatherDamageImmunity: true },
    sandforce:       { weatherDamageImmunity: true },
    icebody:         { weatherDamageImmunity: true },
    snowcloak:       { weatherDamageImmunity: true },
    /* Note: sandrush/slushrush also weather-immune — see speed entries above */

    /* --- Recoil Immunity --- */
    rockhead:        { recoilImmunity: true },

    /* --- Contact Recoil to Attacker --- */
    roughskin:       { contactRecoil: 1/8 },
    ironbarbs:       { contactRecoil: 1/8 },

    /* --- Mold-Breaker class (ignores defender abilities) --- */
    moldbreaker:     { ignoresAbility: true },
    turboblaze:      { ignoresAbility: true },
    teravolt:        { ignoresAbility: true },
    myceliummight:   { ignoresAbility: true },

    /* --- Survival --- */
    sturdy:          { survivalFullHP: true },

    /* --- Status Immunities --- */
    insomnia:        { statusImmunity: ['Sleep'] },
    vitalspirit:     { statusImmunity: ['Sleep'] },
    sweetveil:       { statusImmunity: ['Sleep'] },
    magmaarmor:      { statusImmunity: ['Freeze'] },
    immunity:        { statusImmunity: ['Poison', 'Badly Poisoned'] },
    pastelveil:      { statusImmunity: ['Poison', 'Badly Poisoned'] },
    limber:          { statusImmunity: ['Paralysis'] },
    waterveil:       { statusImmunity: ['Burn'] },
    waterbubble:     { statusImmunity: ['Burn'] },
    thermalexchange: { statusImmunity: ['Burn'] },
    purifyingsalt:   { statusImmunity: ['any'] },
    comatose:        { statusImmunity: ['any'] },
    leafguard:       { statusImmunity: ['any'], /* condition: weather Sun (engine evaluates) */
                       statusImmunityCondition: { weather: ['Sun', 'Harsh Sunshine'] } },
    /* Note: Flower Veil grants ally status immunity — single-mon sim ignores ally side */

    /* --- Status Heal (converts status damage into healing) --- */
    poisonheal:      { statusHeal: { status: 'Poisoned', frac: 1/8 } },

    /* --- Guts: ignores burn Atk drop AND blocks burn chip --- */
    guts:            { burnAttackBoost: true },

    /* --- Berry Threshold Modifier --- */
    gluttony:        { eatBerryThreshold: 2 /* eat at ≤50% instead of ≤25% */ },

    /* --- Secondary Effect / Flinch Immunity --- */
    innerfocus:      { flinchImmunity: true },
    shielddust:      { secondaryImmunity: true },

    /* --- Doubles / Spread Damage --- */
    telepathy:       { allyDamageImmunity: true },

    /* --- Reactive Effects (after being hit) --- */
    cottondown:      { reactiveSpeedDrop: 1 },

    /* ================================================================
     *  NEW CATEGORIES (Phase 3) — currently NOT yet read by engine
     * ================================================================ */

    /* --- Contact Status Inflict (30% on contact) --- */
    flamebody:       { contactStatusInflict: { chance: 30, status: 'Burn' } },
    static:          { contactStatusInflict: { chance: 30, status: 'Paralysis' } },
    poisonpoint:     { contactStatusInflict: { chance: 30, status: 'Poison' } },
    effectspore:     { contactStatusInflict: { chance: 30, status: 'effectspore' } },
    /* effectspore: 10% par + 10% poi + 10% slp (engine splits the 30%) */
    gooey:           { contactStatusInflict: { chance: 100, status: 'speeddrop' } },
    tanglinghair:    { contactStatusInflict: { chance: 100, status: 'speeddrop' } },

    /* --- Priority Modifiers --- */
    prankster:       { priorityMod: { boost: 1, condition: { category: 'Status' } } },
    galewings:       { priorityMod: { boost: 1, condition: { moveType: 'Flying', fullHP: true } } },
    triage:          { priorityMod: { boost: 3, condition: { isHealing: true } } },
    stall:           { priorityMod: { boost: 0, condition: { alwaysLast: true } } },

    /* --- On-KO Effects --- */
    aftermath:       { onKO: { type: 'aftermath', fraction: 1/4 /* contact only */ } },
    innardsout:      { onKO: { type: 'innardsout' /* damage = lethal hit dealt */ } },

    /* --- End-of-Turn Speed Boost --- */
    speedboost:      { eotSpeedBoost: 1 },

    /* --- Synchronize (reflect status) --- */
    synchronize:     { synchronize: true },

    /* --- Protosynthesis / Quark Drive ---
     * NOTE: damage portion (highest stat ×1.3, or ×1.5 if Speed) is handled by the
     * calc engine. The registry only records the trigger so the round sim could
     * apply the SPEED portion if needed in Phase 3. Verify with calc before wiring up.
     */
    protosynthesis:  { protosynthesisQuark: { trigger: 'sun' } },
    quarkdrive:      { protosynthesisQuark: { trigger: 'electricterrain' } },

    /* --- Status-conditioned damage boosts ---
     * NOTE: Flare Boost (×1.5 SpA when burned), Toxic Boost (×1.5 Atk poisoned),
     * and Marvel Scale (×1.5 Def statused) are all DAMAGE modifiers handled by
     * the calc engine. They are intentionally NOT in this registry.
     */
  },

  /* ================================================================
   *                            ITEMS
   * ================================================================ */
  items: {

    /* --- Speed Modifiers --- */
    choicescarf:     { speedMod: { multiplier: 1.5 } },
    ironball:        { speedMod: { multiplier: 0.5 } /* also grounds — engine handles via type calc */ },
    machobrace:      { speedMod: { multiplier: 0.5 } },
    powerweight:     { speedMod: { multiplier: 0.5 } },
    powerbracer:     { speedMod: { multiplier: 0.5 } },
    powerbelt:       { speedMod: { multiplier: 0.5 } },
    powerlens:       { speedMod: { multiplier: 0.5 } },
    powerband:       { speedMod: { multiplier: 0.5 } },
    poweranklet:     { speedMod: { multiplier: 0.5 } },
    quickpowder:     { speedMod: { multiplier: 2, condition: { speciesOnly: 'Ditto' } } },

    /* --- Contact Recoil to Attacker --- */
    rockyhelmet:     { contactRecoilToAttacker: 1/6 },

    /* --- Attacker Self-Recoil (after attacking) --- */
    lifeorb:         { attackerSelfRecoil: 1/10 },

    /* --- End-of-Turn Healing --- */
    leftovers:       { eotHealing: { frac: 1/16 } },
    blacksludge:     { eotHealing: { frac: 1/16,
                                      condition: { holderType: 'Poison',
                                                   elseDamageFrac: 1/8 } } },

    /* --- End-of-Turn Status Inflict --- */
    toxicorb:        { eotStatusInflict: 'Badly Poisoned' },
    flameorb:        { eotStatusInflict: 'Burn' },

    /* --- Survival --- */
    focussash:       { survivalFullHP: true },

    /* --- Priority Boost --- */
    custapberry:     { priorityBoost: { boost: 1, hpThreshold: 4 /* ≤25% HP */ } },

    /* --- Status Cure Berries --- */
    lumberry:        { statusCure: 'any' },
    cheriberry:      { statusCure: 'Paralysis' },
    chestoberry:     { statusCure: 'Sleep' },
    pechaberry:      { statusCure: 'Poison' },
    rawstberry:      { statusCure: 'Burn' },
    aspearberry:     { statusCure: 'Freeze' },
    persimberry:     { statusCure: 'confusion' },

    /* --- HP Restoration Berries --- */
    sitrusberry:     { hpRestore: { frac: 1/4, hpThreshold: 2 /* ≤50% HP */ } },
    figyberry:       { hpRestore: { frac: 1/3, hpThreshold: 4 /* ≤25% HP */ } },
    wikiberry:       { hpRestore: { frac: 1/3, hpThreshold: 4 } },
    magoberry:       { hpRestore: { frac: 1/3, hpThreshold: 4 } },
    aguavberry:      { hpRestore: { frac: 1/3, hpThreshold: 4 } },
    iapapaberry:     { hpRestore: { frac: 1/3, hpThreshold: 4 } },
    /* Note: Figy/Wiki/Mago/Aguav/Iapapa also confuse if holder dislikes the flavour
     * (depends on nature). Round sim does not currently model that.
     */

    /* --- Float / Air Balloon --- */
    airballoon:      { floatImmunity: true },

    /* ================================================================
     *  NEW CATEGORIES (Phase 3) — currently NOT yet read by engine
     * ================================================================ */

    /* --- Move Last in Bracket --- */
    laggingtail:     { moveLastInBracket: true },
    fullincense:     { moveLastInBracket: true },

    /* --- Random Move First --- */
    quickclaw:       { randomMoveFirst: { chance: 20 } },

    /* --- End-of-Turn Damage --- */
    stickybarb:      { eotDamage: { frac: 1/8 } /* also transfers on contact — Phase 3 */ },

    /* --- Hazard Immunity --- */
    heavydutyboots:  { hazardImmunity: true },

    /* --- Contact Avoidance (skip contact effects) --- */
    protectivepads:  { contactAvoidance: true },
    punchingglove:   { contactAvoidance: true /* punch-only — calc handles power, sim gates contact */ },
  }
};

/* ----------------------------------------------------------------
 * Helper: slugify ability/item name to registry key.
 * Mirrors the convention used in roundsim_app.js:
 *   "Magic Guard" -> "magicguard"
 *   "Choice Scarf" -> "choicescarf"
 *   "Will-O-Wisp" -> "willowisp"
 * Exposed on EffectsRegistry for engine convenience.
 * ---------------------------------------------------------------- */
window.EffectsRegistry.slugify = function (name) {
  if (!name) return '';
  return String(name).toLowerCase().replace(/[\s\-\']+/g, '');
};

/* ----------------------------------------------------------------
 * Helper: lookup an ability or item entry by display name.
 *   EffectsRegistry.ability('Magic Guard')  -> { indirectDamageImmunity:true, ... }
 *   EffectsRegistry.item('Choice Scarf')    -> { speedMod:{multiplier:1.5} }
 *   Returns null if no entry exists (caller must null-check).
 * ---------------------------------------------------------------- */
window.EffectsRegistry.ability = function (name) {
  var key = window.EffectsRegistry.slugify(name);
  return (key && window.EffectsRegistry.abilities[key]) || null;
};
window.EffectsRegistry.item = function (name) {
  var key = window.EffectsRegistry.slugify(name);
  return (key && window.EffectsRegistry.items[key]) || null;
};
