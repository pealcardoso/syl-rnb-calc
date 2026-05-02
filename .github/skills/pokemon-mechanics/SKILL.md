---
name: pokemon-mechanics
description: "Use when: writing tests for the Round Simulator's custom battle mechanics, verifying ability/item/status/weather/terrain interactions, diagnosing incorrect damage or speed calculations, or generating Playwright test scenarios. Covers every custom mechanics area in roundsim_app.js with correct rules, modifier values, and known bugs."
argument-hint: "What mechanic to test or verify (e.g. 'test Grassy Terrain healing', 'verify Flash Fire immunity', 'check speed order with Choice Scarf')"
---

# Pokémon Battle Mechanics — Round Simulator Reference

## Context

- **Primary source**: `src/js/roundsim_app.js` (~6900 lines, jQuery-based IIFE)
- **All functions are inside an IIFE** — NOT directly on `window`. To test via `page.evaluate`, you must call exposed global functions or read DOM state.
- The round sim sits on top of the calc engine (`window.calc.*`) and reads `window.damageResults[]` for damage values.
- Data lookups: `window.BattleMovedex`, `window.BattleAbilities`, `window.BattleItems`, `window.BattlePokedex`
- Type chart: `calc.TYPE_CHART[gen]` — gen defaults to 9

---

## 1. Architecture — 13 Custom Mechanics Areas

| # | Area | Key Functions (line approx.) | Testability |
|---|---|---|---|
| 1 | Type Effectiveness | `getTypeMultiplier()` L127, `getDefensiveProfile()` L149, `getMonTypeInfo()` L158 | Internal — test via UI or expose |
| 2 | Box Rankings | `computeBoxRankings()` L224, `applySimItemMultiplier()` L214 | Internal |
| 3 | AI Switch-In | `computeSwitchScore()` L369, `predictSwitchIn()` L453 | Internal |
| 4 | Secondary Effects | `parseMoveEffects()` L986, `isGuaranteedEffect()` L1069, `resolveSecondaryEffects()` L1094 | Internal |
| 5 | Entry Hazards | `calcEntryHazardDamage()` L1204, `applyHazardMoves()` L1319, `syncHazardsToCalc()` L1273 | Internal |
| 6 | Survival Checks | `applySurvivalChecks()` L1415, `ignoresAbility()` L1406 | Internal |
| 7 | Speed Order | `computeEntrySpeed()` L1760, `getSpeedInfo()` L1831, `calcEffectiveSpeed()` L1866 | Internal |
| 8 | Extra Damage | `calcExtraDamage()` L2355 | Internal |
| 9 | End-of-Turn Damage | `calcEndOfTurnDamage()` L2438 | Internal |
| 10 | Status Tracking | `isStatusImmune()` L3306, `isSleepImmune()` L3284, `isFreezeImmune()` inner | Internal (nested in captureRound) |
| 11 | Semi-Invulnerability | `CHARGE_SEMI_INVULN` L38, `INVULN_BYPASSES` L55 | Constants — test via round logging |
| 12 | Bait Analysis | `computeBaitAnalysis()`, `calcP2MoveRates()` | Internal |
| 13 | Round Probability | `calcRoundProbability()` L2550 | Internal |

**Testing strategy**: Since all functions are inside an IIFE, use:
- **page.evaluate** to call exposed globals (`selectTrainer`, `lookupSet`, `getMonTypeInfo`, `calcMaxHP`)
- **page.evaluate** to access constants/data (`calc.TYPE_CHART`, `BattleMovedex`, `BattleAbilities`, etc.)
- **Full UI interaction** (set up battle → log round → read round card DOM) for integration tests
- **Inject test harness**: `page.evaluate` can assign internal functions to window for testing if needed

---

## 2. Type Effectiveness Engine

### Rules
- **Dual-type multiplication**: Multiply each defending type's multiplier together
  - Example: Fire vs Water/Ground = 2× × 1× = 2×
  - Example: Ice vs Fire/Water = 0.5× × 2× = 1×
- **Ability immunities** (`ABILITY_IMMUNITIES` constant):

| Ability | Immune to |
|---|---|
| Levitate | Ground |
| Flash Fire | Fire |
| Lightning Rod | Electric |
| Volt Absorb | Electric |
| Motor Drive | Electric |
| Water Absorb | Water |
| Storm Drain | Water |
| Dry Skin | Water |
| Sap Sipper | Grass |
| Earth Eater | Ground |
| Well-Baked Body | Fire |

- **Dry Skin**: Also takes ×1.25 damage from Fire moves (applied AFTER immunity check — Water immune, Fire ×1.25)
- **Wonder Guard**: Any multiplier ≤ 1× becomes 0× (only super-effective moves hit)
- **Type immunity blocks secondary effects entirely** — 0× means no damage AND no status/stat effects

### Code Reference
```javascript
// roundsim_app.js L118-147
var ABILITY_IMMUNITIES = {
    levitate: 'Ground', flashfire: 'Fire',
    lightningrod: 'Electric', voltabsorb: 'Electric', motordrive: 'Electric',
    waterabsorb: 'Water', stormdrain: 'Water', dryskin: 'Water',
    sapsipper: 'Grass', eartheater: 'Ground', wellbakedbody: 'Fire'
};
function getTypeMultiplier(atkType, defTypes, abilityName) { ... }
function getDefensiveProfile(types, abilityName) { ... }
```

---

## 3. Speed Order

### Formula
`effective speed = baseStat × itemMod × abilityMod × statusMod × boostMod`

### Item Modifiers

| Item | Modifier | Condition |
|---|---|---|
| Iron Ball | ×0.5 | Always |
| Macho Brace | ×0.5 | Always |
| Power Weight/Bracer/Belt/Lens/Band/Anklet | ×0.5 | Always |
| Choice Scarf | ×1.5 | Always |
| Quick Powder | ×2 | Only on Ditto |

### Weather Ability Doublers (×2)

| Ability | Active in Weather |
|---|---|
| Swift Swim | Rain, Heavy Rain |
| Chlorophyll | Sun, Harsh Sunshine |
| Sand Rush | Sand |
| Slush Rush | Snow, Hail |
| Surge Surfer | Electric Terrain (not weather — terrain!) |

### Other Ability Modifiers

| Ability | Effect | Notes |
|---|---|---|
| Quick Feet | ×1.5 when statused | Overrides paralysis speed penalty |
| Slow Start | ×0.5 | Game: first 5 turns only. **BUG: applied permanently** |

### Status Modifiers

| Status | Effect |
|---|---|
| Paralysis | ×0.5 speed (in `computeEntrySpeed` and `calcEffectiveSpeed`) |
| Paralysis + Quick Feet | No penalty (Quick Feet overrides) |

### Boost Stages
- Positive: `speed × (2 + boost) / 2`
- Negative: `speed × 2 / (2 - boost)` (boost is negative, so `2 - (-1)` = 3)

### Priority & Trick Room
- **Priority brackets**: Higher priority move always goes first, regardless of speed
- **Trick Room**: Reverses speed order (slower goes first); 5-turn countdown
- **Custap Berry**: Grants +1 priority bracket when HP ≤ 25% (≤ 50% with Gluttony); consumed after use
- **Speed tie**: User prompted via modal; stored in `window._rsaTiebreaker`

### Code Reference
```javascript
// roundsim_app.js L1760-1920
function computeEntrySpeed(entry) { ... }  // Full speed calc from roster entry
function calcEffectiveSpeed(entry, baseSpe, weather, terrain) { ... }  // Standalone calc
function getSpeedInfo() { ... }  // Reads from calc form DOM
```

---

## 4. End-of-Turn Damage

### Weather Damage (1/16 max HP)

| Weather | Damages | Immune |
|---|---|---|
| Sand | All non-immune | Rock, Ground, Steel types; Overcoat, Magic Guard, Sand Veil, Sand Rush, Sand Force |
| Hail | All non-immune | Ice type; same `WEATHER_IMMUNE_ABILITIES` list |
| Snow | **No damage** | N/A |
| Sun / Rain | No direct damage | N/A |

**BUG #1**: `WEATHER_IMMUNE_ABILITIES` includes Ice Body, Snow Cloak, Slush Rush — these are snow/hail abilities and should NOT grant sandstorm immunity. They should only be immune to Hail (which they are via Ice type or their own ability descriptions).

### Status Residual Damage

| Status | Damage | Blocked by |
|---|---|---|
| Burn | 1/16 max HP | Magic Guard, Guts |
| Poison | 1/8 max HP | Magic Guard |
| Badly Poisoned (Toxic) | N/16 max HP (N increments each turn, max 15) | Magic Guard |
| Poison/Toxic + Poison Heal | **Heals** 1/8 max HP instead | — |

### Healing Items

| Item | Effect | Condition |
|---|---|---|
| Leftovers | +1/16 max HP | Always |
| Black Sludge | +1/16 max HP | Poison-type holder |
| Black Sludge | **−1/8 max HP** | Non-Poison-type holder (blocked by Magic Guard) |

### Terrain Healing

| Terrain | Effect | Condition |
|---|---|---|
| Grassy Terrain | +1/16 max HP | Grounded only |

**BUG #2**: `calcEndOfTurnDamage()` applies Grassy Terrain healing to ALL pokemon regardless of groundedness. Should check Flying type, Levitate, and Air Balloon.

### Code Reference
```javascript
// roundsim_app.js L2438-2530
function calcEndOfTurnDamage(entry, weather) { ... }
var WEATHER_IMMUNE_ABILITIES = [
    'Overcoat', 'Magic Guard', 'Sand Veil', 'Sand Rush', 'Sand Force',
    'Ice Body', 'Snow Cloak', 'Slush Rush'  // BUG: last 3 are snow abilities
];
```

---

## 5. Entry Hazards

### Stealth Rock
- Damage = `floor(maxHP × effectiveness / 8)`, minimum 1
- Effectiveness = Rock-type effectiveness vs defender's types (multiplicative for dual types)
- NOT blocked by type: affects all types
- Blocked by: Magic Guard only

| Defender Type | SR Damage % |
|---|---|
| Fire/Flying, Ice/Flying, Bug/Flying, Bug/Fire | 50% (4× weak) |
| Fire, Ice, Bug, Flying | 25% (2× weak) |
| Normal, Psychic, Ghost, Dragon, Dark, Poison, Electric, Grass, Fairy | 12.5% (neutral) |
| Water, Fighting, Ground | 6.25% (resistant) |
| Steel, Rock (double resist would be 3.125%) | varies by dual type |

### Spikes (grounded only, blocked by Magic Guard)

| Layers | Damage |
|---|---|
| 1 | 1/8 max HP |
| 2 | 1/6 max HP |
| 3 | 1/4 max HP |

### Toxic Spikes (grounded only)
- 1 layer: inflicts Poison
- 2 layers: inflicts Badly Poisoned (Toxic)
- Poison/Steel types **absorb** Toxic Spikes (no damage, no status, spikes removed)
- No effect if already statused

### Grounding
A pokemon is **grounded** unless it has: Flying type, Levitate ability, or Air Balloon item.
> **Note**: The round sim does NOT check Gravity, Magnet Rise, or Ingrain for grounding.

### Hazard Clearing Moves

| Move | Clears |
|---|---|
| Rapid Spin | User's side |
| Mortal Spin | User's side |
| Tidy Up | User's side |
| Defog | **Both** sides |
| Court Change | **Swaps** hazards between sides |

### Code Reference
```javascript
// roundsim_app.js L1178-1250
var SR_EFFECTIVENESS = { Normal:1, Fire:2, Water:0.5, ... };
function calcEntryHazardDamage(entry, hazards) { ... }
function applyHazardMoves(p1MoveName, p2MoveName) { ... }
```

---

## 6. Status Conditions & Immunity

### Type-Based Status Immunity

| Type | Immune to |
|---|---|
| Fire | Burn |
| Poison | Poison, Badly Poisoned |
| Steel | Poison, Badly Poisoned |
| Ice | Freeze |
| Electric | Paralysis (Gen 6+ only) |

### Ability-Based Status Immunity

| Ability | Blocks |
|---|---|
| Insomnia | Sleep |
| Vital Spirit | Sleep |
| Sweet Veil | Sleep |
| Magma Armor | Freeze |

**BUG #5**: Missing **Comatose** — should block receiving Sleep status (the ability makes the holder permanently "asleep" for move purposes but they can't receive the Sleep condition).

### Berry Status Cures (consumed immediately)

| Berry | Cures |
|---|---|
| Lum Berry | Any status |
| Chesto Berry | Sleep |
| Aspear Berry | Freeze |
| Cheri Berry | Paralysis |
| Pecha Berry | Poison |
| Rawst Berry | Burn |
| Persim Berry | Confusion |

### End-of-Turn Status Infliction

| Item | Effect | Condition |
|---|---|---|
| Flame Orb | Inflicts Burn | No existing status |
| Toxic Orb | Inflicts Badly Poisoned | No existing status |

### Code Reference
```javascript
// roundsim_app.js L3284-3340 (nested inside captureRound)
function isSleepImmune(entry) { ... }
function isFreezeImmune(entry) { ... }
function isStatusImmune(entry, status) { ... }
function itemCuresStatus(entry, status) { ... }
```

---

## 7. Survival Checks

### Focus Sash
- Survives any attack at 1 HP **if at full HP**
- **NOT blocked by Mold Breaker** (it's an item, not an ability)
- Consumed after activation

### Sturdy (ability)
- Survives any attack at 1 HP **if at full HP**
- **Blocked by** Mold Breaker, Turboblaze, Teravolt

### Mold Breaker Abilities
`MOLD_BREAKER_ABILITIES = ['Mold Breaker', 'Turboblaze', 'Teravolt', 'Mycelium Might']`

**BUG #4**: **Mycelium Might** is listed as a full Mold Breaker ability, but in the games it only bypasses abilities for **status-category moves** (e.g., Spore bypasses Safety Goggles check), NOT for damage moves. It should not bypass Sturdy on a damaging attack.

### Code Reference
```javascript
// roundsim_app.js L1401-1440
var MOLD_BREAKER_ABILITIES = ['Mold Breaker', 'Turboblaze', 'Teravolt', 'Mycelium Might'];
function ignoresAbility(attackerAbility) { ... }
function applySurvivalChecks(defEntry, hpAfter, hpBefore, maxHP, atkAbility) { ... }
```

---

## 8. Extra Damage Sources (Post-Calc)

### Life Orb Recoil
- `floor(attackerMaxHP / 10)`, minimum 1
- Triggers when attack deals > 0 damage
- Blocked by Magic Guard
- Fixed amount (NOT based on damage dealt)

### Move Recoil
- `floor(damage × recoil[0] / recoil[1])`, minimum 1
- Gen 5+: based on **raw damage roll**, NOT capped at defender's remaining HP
- Blocked by Magic Guard and Rock Head

### Contact Damage

| Source | Type | Fraction | Triggered by |
|---|---|---|---|
| Iron Barbs | Ability | 1/8 attacker maxHP | Contact move |
| Rough Skin | Ability | 1/8 attacker maxHP | Contact move |
| Rocky Helmet | Item | 1/6 attacker maxHP | Contact move |

All blocked by Magic Guard on the attacker.

### Drain Moves
- Healing = `floor(effectiveDamage × drain[0] / drain[1])`
- **Capped** at defender's current HP (unlike recoil)

### Code Reference
```javascript
// roundsim_app.js L2355-2435
function calcExtraDamage(attacker, defender, moveInfo, weather) { ... }
var CONTACT_DAMAGE_ABILITIES = { 'Iron Barbs': 1/8, 'Rough Skin': 1/8 };
var CONTACT_DAMAGE_ITEMS = { 'Rocky Helmet': 1/6 };
```

---

## 9. Semi-Invulnerability & Charge Moves

### Semi-Invulnerable Moves

| Move | Invuln Type |
|---|---|
| Fly | air |
| Bounce | air |
| Sky Drop | air |
| Dig | underground |
| Dive | underwater |
| Phantom Force | phantom |
| Shadow Force | phantom |

### Bypass Moves

| Invuln Type | Bypassed by |
|---|---|
| air | Thunder, Hurricane, Gust, Twister, Sky Uppercut, Smack Down, Thousand Arrows |
| underground | Earthquake, Magnitude |
| underwater | Surf, Whirlpool |
| phantom | Nothing |

### Non-Invulnerable Charge Moves
Solar Beam, Solar Blade, Skull Bash, Razor Wind, Sky Attack, Freeze Shock, Ice Burn — user charges for one turn but CAN be hit normally.

### Code Reference
```javascript
// roundsim_app.js L38-65
var CHARGE_SEMI_INVULN = { fly: 'air', bounce: 'air', ... };
var CHARGE_ONLY_MOVES = { solarbeam: true, ... };
var INVULN_BYPASSES = { air: ['thunder', 'hurricane', ...], ... };
```

---

## 10. Secondary Effects

### Guaranteed vs Probabilistic
- **Guaranteed** (`chance === 100` or `move.boosts`/`move.self.boosts`/`move.status`): Always apply
  - Examples: Close Combat (-1 Def, -1 SpDef self), Superpower (-1 Atk, -1 Def self)
- **Probabilistic** (`chance < 100`): Apply based on chance
  - Examples: Flamethrower (10% burn), Thunder (30% paralysis)

### Target Resolution
- `move.target === 'self'/'allies'/'allySide'` → effect applies to user
- Otherwise → effect applies to opponent

### Special Interactions
- **Flinch**: Blocks second-mover's action (first-mover only can flinch)
- **Self-destruct/Explosion**: KOs the user if damage was dealt (checks `move.selfdestruct`)
- **Type immunity (0×)**: Blocks ALL secondary effects — no status, no stat changes

### Code Reference
```javascript
// roundsim_app.js L986-1140
function parseMoveEffects(moveData) { ... }
function isGuaranteedEffect(moveData) { ... }
function resolveSecondaryEffects(moveData, targetSide, guaranteedOnly) { ... }
```

---

## 11. Box Rankings & Item Simulation

### Simulated Item Multipliers

| Setting | Multiplier |
|---|---|
| choice | ×1.5 (Choice Band/Specs) |
| lifeorb | ×1.3 |
| typeenhance | ×1.2 (type-boosting item) |
| band | ×1.1 |
| (none) | ×1.0 |

### Special Modifiers
- **Guts + Burn**: ×1.5 to physical moves (applied in ranking calc)
- **Self-destruct/Explosion**: Optional exclusion from rankings

### Code Reference
```javascript
// roundsim_app.js L214-365
function applySimItemMultiplier(pct) { ... }
function computeBoxRankings() { ... }
```

---

## 12. AI Switch-In Prediction

### Score Table

| Condition | Score |
|---|---|
| Faster + OHKOs P1 | 5 |
| Slower + OHKOs P1 + survives P1's attack | 4 |
| Faster + better damage trade | 3 |
| Slower + better damage trade | 2 |
| Faster only | 1 |
| Default | 0 |
| Slower + gets OHKO'd by P1 | -1 |

### Special Cases
- **Ditto**: Hardcoded score 2
- **Wynaut / Wobbuffet**: Score 2 unless slower AND P1 OHKOs it

### Code Reference
```javascript
// roundsim_app.js L369-530
function computeSwitchScore(p1calc, p2calc, p1SpdOverride) { ... }
function predictSwitchIn(p1SetIdOrCalc, forSlot) { ... }
```

---

## 13. Data File Locations (for Dynamic Lookup)

| Data | File | Global |
|---|---|---|
| Ability names/descriptions | `src/js/data/rbdex/abilities.js` | `window.BattleAbilities` |
| Item names/descriptions | `src/js/data/rbdex/items.js` | `window.BattleItems` |
| Move data/effects | `src/js/data/rbdex/moves.js` | `window.BattleMovedex` |
| Species/Pokédex | `src/js/data/rbdex/pokedex.js` | `window.BattlePokedex` |
| Type chart (per gen) | Calc engine | `calc.TYPE_CHART[gen]` |
| Species stats | Calc engine | `calc.SPECIES[gen]` |

### Lookup Patterns
```javascript
// Ability description
var key = 'Flash Fire'.toLowerCase().replace(/[\s\-\']+/g, '');
var desc = window.BattleAbilities[key].shortDesc;

// Move data
var key = 'Close Combat'.toLowerCase().replace(/[\s\-\']+/g, '');
var data = window.BattleMovedex[key]; // { basePower, type, category, secondary, ... }

// Type effectiveness
var chart = calc.TYPE_CHART[9];
var mult = chart['Fire']['Water']; // 0.5
```

---

## 14. Known Bugs (Verified in Source)

| # | Bug | Location | Line | Severity |
|---|---|---|---|---|
| 1 | Ice Body, Snow Cloak, Slush Rush incorrectly grant sandstorm immunity | `WEATHER_IMMUNE_ABILITIES` array | ~L1172 | Medium — affects EOT damage for 3 abilities |
| 2 | Grassy Terrain heals ungrounded Pokémon (Flying, Levitate, Air Balloon) | `calcEndOfTurnDamage()` | ~L2530 | Medium — affects EOT healing |
| 3 | Slow Start ×0.5 speed applied permanently (should be first 5 turns only) | `computeEntrySpeed()`, `calcEffectiveSpeed()` | ~L1780, ~L1900 | Low — hard to track turns, affects speed calc |
| 4 | Mycelium Might treated as full Mold Breaker (should only bypass for status moves) | `MOLD_BREAKER_ABILITIES` array | ~L1401 | Low — rare edge case |
| 5 | Missing Comatose ability in sleep immunity check | `isSleepImmune()` | ~L3284 | Low — rare ability |

### Fix Guidance

**Bug 1 fix**: Split `WEATHER_IMMUNE_ABILITIES` into sand-specific and general lists:
```javascript
var SAND_IMMUNE_ABILITIES = ['Overcoat', 'Magic Guard', 'Sand Veil', 'Sand Rush', 'Sand Force'];
var HAIL_IMMUNE_ABILITIES = ['Overcoat', 'Magic Guard', 'Ice Body', 'Snow Cloak', 'Slush Rush'];
```

**Bug 2 fix**: Add grounding check in `calcEndOfTurnDamage()`:
```javascript
if (getTerrain() === 'Grassy') {
    var isGrounded = !hasType(entry, ['Flying']) &&
                     entry.ability !== 'Levitate' &&
                     entry.item !== 'Air Balloon';
    if (isGrounded) {
        eot.push({ source: 'Grassy Terrain', damage: -Math.max(1, Math.floor(maxHP / 16)) });
    }
}
```

**Bug 5 fix**: Add Comatose to `isSleepImmune()`:
```javascript
return ab === 'insomnia' || ab === 'vitalspirit' || ab === 'sweetveil' || ab === 'comatose';
```

---

## 15. Test Patterns for Round Sim

### Pure-Function Test via page.evaluate (inject + call)
Since IIFE functions aren't on window, expose them for testing:
```javascript
// In test setup, inject a test harness
await page.evaluate(() => {
    // The IIFE functions are closure-scoped, but we can test via
    // the exposed globals and DOM interaction
    window.__testTypeChart = calc.TYPE_CHART[9];
});
```

### Integration Test Pattern (log round → read card)
```javascript
// 1. Set up P1 and P2 via trainer selection or import
await page.evaluate((idx) => selectTrainer(idx), trainerIndex);
// 2. Select moves, set status/items
// 3. Log round
await page.click('#rsa-log-round');
// 4. Close changelog if it appeared
await page.evaluate(() => { ... changelog close ... });
// 5. Read round card DOM for HP values, damage, effects
const hpText = await page.$eval('.rsa-round-card:last-child .hp-bar-text', el => el.textContent);
```

### Assertion Patterns
```javascript
// Type effectiveness
expect(mult).toBe(0);     // immune
expect(mult).toBe(0.5);   // resisted
expect(mult).toBe(2);     // super effective
expect(mult).toBe(4);     // double super effective

// Damage fractions
expect(damage).toBe(Math.floor(maxHP / 16));  // 1/16 residual
expect(damage).toBe(Math.floor(maxHP / 8));   // 1/8 residual

// Speed
expect(speed).toBe(Math.floor(baseSpe * 1.5));  // Choice Scarf
```
