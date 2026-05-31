---
name: pokemon-mechanics
description: "Use when: writing tests for the Round Simulator's custom battle mechanics, verifying ability/item/status/weather/terrain interactions, diagnosing incorrect damage or speed calculations, or generating Playwright test scenarios. Covers every custom mechanics area in roundsim_app.js with correct rules, modifier values, and known bugs."
argument-hint: "What mechanic to test or verify (e.g. 'test Grassy Terrain healing', 'verify Flash Fire immunity', 'check speed order with Choice Scarf')"
---

# Pokémon Battle Mechanics — Round Simulator Reference

## Context

- **Primary source**: `src/js/roundsim_app.js` (~17,900 lines, jQuery-based IIFE)
- **All functions are inside an IIFE** — NOT directly on `window`. To test via `page.evaluate`, call exposed globals, read DOM state, **or use the `window.__rsaTest` test harness (preferred — see below)**.
- The round sim sits on top of the calc engine (`window.calc.*`) and reads `window.damageResults[]` for damage values.
- Data lookups: `window.BattleMovedex`, `window.BattleAbilities`, `window.BattleItems`, `window.BattlePokedex`
- Type chart: `calc.TYPE_CHART[gen]` — gen defaults to 9
- **Line numbers in this doc are approximate** and drift as the file grows. Always `grep_search` for the function name to find the current location; don't trust the `Lxxxx` markers literally.

### `window.__rsaTest` — internal test harness (USE THIS)

A curated subset of closure-scoped internals is exposed on `window.__rsaTest` for Playwright tests (search the source for `window.__rsaTest.` to see the full, current list). Key entries:

| Helper | Purpose |
|---|---|
| `captureRound(p1MoveIdx, p2MoveIdx, p2Crit, p1PreDmg, p1PreStatus, comment, p1ApplySecondary, p2ApplySecondary, p2Hits, p2CritHits)` | Log a round from current form state |
| `calcDamageDirect(atkEntry, defEntry, moveName, megaOverride, hitsOverride)` | Headless damage calc from two roster entries (returns `{minDmg,maxDmg,range,move,desc}`; **per-hit × `move.hits`** for multi-hit) |
| `getDamageInfo(sideIdx, moveIdx)` | Damage from the live form/`damageResults` |
| `curLine()` / `getActiveRounds()` / `getActiveEntry(team)` | Read current battle line/rounds/active mon |
| `rebuildLineTeams(line)` / `rebuildBranchTeams` | Replay frozen round deltas to reconstruct team HP state |
| `resimulateBerryForEntry(line, side, name)` | Retroactively re-apply Sitrus/Oran healing to logged rounds (see §16) |
| `renderRoundCard(rd, branchIdx)` / `renderPivotIncomingCard(pv, side)` | Render a round-log card; pivot rounds stack a second "incoming mon" card on the pivoting side (see §19) |
| `findInRoster(team, name)` / `switchActive` / `loadPokemonIntoForm` | Roster/form helpers |
| `analyzeFight(line)` | Read-only fork/segment/recommendation analysis |

**Build/verify loop**: edit `src/js/...` → `node build view` (copies `src`→`dist`, adds md5 cachebusters) → tests/verification run against `dist` served on **port 8080** (`node tests/serve-dist.js`, isolated localStorage). **Never** touch port 3000 (the user's live `node server.js`). `calcDamageDirect.length === 5` confirms the current build is loaded.

---

## 1. Architecture — Custom Mechanics Areas

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

### Multi-hit interaction (IMPORTANT)
`applySurvivalChecks` only fires Focus Sash / Sturdy when `hpBefore >= maxHP` (full HP). For **multi-hit moves** the defender is no longer at full HP after the first hit, so Sash/Sturdy can only ever trigger on the **first** hit — exactly matching the games. This is handled by the per-hit simulation described in **§16**, not by lump-sum damage. See §16 for the full inter-hit model.

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

### Multi-hit + inter-hit item proc (via `__rsaTest`)
```javascript
// Defender with Sitrus survives a multi-hit move that lump-sum would KO,
// because the berry heals BETWEEN hits (see §16).
const res = await page.evaluate(() => {
    // ...set up P1 defender (Sitrus, low HP) vs P2 attacker (e.g. Bullet Seed)...
    window.__rsaTest.captureRound('none', p2BulletSeedIdx, false, 0, '', '', false, false, 5, 0);
    const rd = window.__rsaTest.curLine().rounds.slice(-1)[0];
    return { hpAfter: rd.p1.hpAfter.current, consumed: rd.p1.itemConsumed };
});
expect(res.hpAfter).toBeGreaterThan(0);          // survived via inter-hit heal
expect(res.consumed).toBe('Sitrus Berry');
```

---

## 16. Multi-Hit Inter-Hit Item Procs

**Rule (games)**: HP-dependent items/abilities can trigger BETWEEN the hits of a multi-hit move — both variable-count moves (Bullet Seed, Rock Blast, Icicle Spear) AND fixed-count moves (Dual Wingbeat, Double Hit, Bonemerang). The simulator models this per hit rather than applying the move's total damage as a single lump sum.

### What procs per hit (defender)
| Item / Ability | Trigger | Effect |
|---|---|---|
| Sitrus Berry | HP ≤ 50% after a hit | Heal `floor(maxHP / 4)`, consumed |
| Oran Berry | HP ≤ 50% after a hit | Heal 10 HP, consumed |
| Liechi/Ganlon/Petaya/Apicot/Salac (pinch berries) | HP ≤ 25% after a hit | +1 to Atk/Def/SpA/SpD/Spe respectively, consumed |
| Focus Sash (item) | Lethal hit **from full HP** | Survive at 1 HP, consumed (first hit only) |
| Sturdy (ability) | Lethal hit **from full HP** | Survive at 1 HP (first hit only) |

A consumed item fires **once** — later hits don't re-trigger it. Sash/Sturdy can only save the first hit (after it, HP < max).

### Why it matters
Lump-sum application can wrongly KO a defender that the games would save: e.g. Bewear at 100/200 HP hit by 5× Bullet Seed (24/hit = 120 total). Lump-sum → 100 − 120 = KO. Per-hit → first hit drops it to 76 (≤50%) → Sitrus heals to 126 → survives the remaining hits at ~30 HP.

### Implementation (`roundsim_app.js`)
Helpers live just after `applySurvivalChecks` (grep for the names):
- `PINCH_BERRY_BOOSTS` — id→stat-boost map for the 5 pinch berries.
- `defenderNeedsPerHitSim(defEntry)` — true if the defender holds Sitrus/Oran/Focus Sash/a pinch berry, or has Sturdy.
- `applyMultiHitDefense(defEntry, hpStart, totalDmg, hits, atkAbility)` — **pure**; splits `totalDmg` evenly across `hits` (cumulative rounding so per-hit chunks sum exactly to the total), applies survival checks + berry procs hit-by-hit, returns `{ hp, sashed, sturdied, itemConsumed, heal, boost }`.
- `applyAttackToDefenderHP(defEntry, hpBefore, dmg, atkHits, atkAbility)` — routes through the per-hit sim **only** when `atkHits > 1 && defenderNeedsPerHitSim(...)`; otherwise lump-sum + a single `applySurvivalChecks` (so single-hit moves and non-qualifying defenders are byte-for-byte unchanged → zero regression).

In `captureRound`, the speed-ordered damage block computes `p1AtkHits`/`p2AtkHits` from `pXDmg.move.hits` (the authoritative count baked into the total) and resolves each of the four defender "spots" through `applyAttackToDefenderHP`. The **worst-case and best-case HP trackers must both be computed BEFORE the defender's item is cleared**, because `applyMultiHitDefense` reads `defEntry.item`. On consumption the worst tracker sets the `pXItemConsumed` flag, clears `entry.item` + the `#side .item` field, and applies any pinch-berry boost via `applyBoosts`. Clearing the item also prevents the end-of-turn berry pass (`applyPostEOTBerries`) from double-healing.

### Per-hit damage division
`calcDamageDirect` / `getDamageInfo` return a **total** = per-hit `range()` × `move.hits`. To split back into per-hit damage, divide by `move.hits` (authoritative) — never by the UI hit selector, which may differ. Note `calc.Move`'s `hits` option only affects moves flagged `multihit`; single-hit moves ignore it (verified: Liquidation stays 1 hit even with `hits: 5`).

---

## 17. Retroactive Berry Re-Simulation on Item Change

**Problem**: Logged rounds store *frozen* `hpBefore`/`hpAfter`. `rebuildLineTeams` replays those frozen deltas (and restores each round's recorded item), so changing a roster mon's item AFTER rounds were logged did **not** update the already-logged rounds (e.g. adding a Sitrus Berry didn't heal the rounds the mon was on field).

**Fix**: `resimulateBerryForEntry(line, side, name)` (just before `rebuildLineTeams`) re-applies a HP-restoring berry (Sitrus/Oran) across every singles round where `name` was on field for `side`:
1. For each such round, recover the **pure damage delta** by stripping any previously-recorded berry heal from the round's `eot` list (`oldHeal`), so the pass is idempotent and supports add/remove/swap.
2. Re-apply that pure damage to a running HP that carries forward across the mon's rounds.
3. Heal once, the first round HP drops to ≤50% (`floor(maxHP/4)` for Sitrus, 10 for Oran), capped at `maxHP`; mark `itemConsumed`, push a `{ source, damage: -heal }` eot entry, and update the round's item badge (held → `''` after consumption).
4. The accumulated heal carries forward, so all later rounds' HP shift up correctly.

The `.rsa-item-select` change handler calls `resimulateBerryForEntry` → `rebuildLineTeams` → `renderAll` when the mon has logged rounds (mirroring the inline HP-edit handler).

**Limitations** (document when relevant):
- Re-applies **post-round** healing only. It cannot retroactively turn a KO into a survival (a Focus Sash / Sturdy / inter-hit berry proc added *after* the round was logged) — those need the round re-logged.
- Only Sitrus/Oran are re-simulated (damage-affecting items like resist berries / Assault Vest / Choice items are not recomputed retroactively). Doubles rounds are skipped.

### Test (verified via `__rsaTest.resimulateBerryForEntry`)
Adding Sitrus to a 200-HP mon that took 60/round over 3 rounds (200→140→80→30) yields `hpAfter = [140, 130, 80]`: it heals +50 the round HP first hits ≤100, and the +50 carries forward. Re-running is idempotent; removing the berry reverts to `[140, 80, 30]`.

---

## 18. Known Mechanics NOT Modeled (Scope Notes)

- **Inter-hit healing for damage-changing items** is not retroactively recomputed (§17) — only Sitrus/Oran HP restore.
- **Doubles** rounds are excluded from the retroactive berry re-sim (§17).
- Multi-hit per-hit damage is split **evenly** (cumulative rounding); the engine does not model per-hit damage-roll variance or per-hit crits within a single multi-hit move beyond the aggregate crit-blend already applied to the total.

## 19. Pivot Switch Dual-Box Rendering

When a singles round uses a P1/P2 pivot move (U-turn / Volt Switch) and the opponent's hit lands on the **incoming** mon, the round-log card renders **two stacked actor cards on the pivoting side**:

1. The pivoting mon's normal card (deals damage, then switches out — its `hpAfter` is restored to `hpBefore` since pivots take no recoil).
2. A compact **incoming-mon card** (`renderPivotIncomingCard(pv, side)`) framed as *receiving* the opponent's hit: header (sprite/item/ability/status + HP-before bar), a `⇄ switched in` badge, a `KO'd` tag when it faints, the opponent's move (type/category sprites + `Dmg: min-max`), a hazard chip, and the HP-after sim bar.

**Data**: captured as a frozen snapshot `rd.pivotSwitch.incomingCard` in the `.rsa-inline-p1-pivot-confirm` / `.rsa-inline-p2-pivot-confirm` handlers — `{name,sprite,item,ability,status,maxHP,hpBefore,move,moveData,damage,hazardDamage}`. `hpBefore` is captured **before** the recalc hit / hazards mutate the switch-in's HP; `pv.switchInHpAfter` is finalized **after** recalc + entry-hazard damage. Layout uses `.rsa-actor-stack` (flex column) wrapping the side; the non-pivoting side stays a single `.rsa-actor`. When `incomingCard` is present the legacy one-line `rsa-round-switchpred` pivot summary is suppressed (kept only as a fallback for old saved rounds).

**Non-damage effects redirect onto the switch-in**: the opponent's move was aimed at the outgoing mon, so its **guaranteed** status / confusion / on-target stat drops land on the incoming mon (e.g. Hypnosis → Sleep, Toxic → Badly Poisoned). `applyPivotIncomingEffects(switchEntry, oppMoveName)` (module-scoped, called in both confirm handlers after recalc + hazards) resolves `resolveSecondaryEffects(md, _, guaranteedOnly=true)` and applies it, honoring ability (`isSleepImmune`/`isFreezeImmune`-equivalent), type (Fire/Burn, Poison·Steel/Poison, Ice/Freeze, Electric/Paralysis gen6+), and item-cure (Lum/Chesto/Aspear) immunities; KO'd switch-ins get nothing. **Limitation (matches `captureRound`)**: full type-effectiveness immunity is NOT checked, so e.g. Thunder Wave still "paralyzes" a Ground type — only the status-immunity rules above apply.

**Outgoing mon never receives the effect (redirect at capture, not revert)**: `captureRound` defers the opponent's TARGET effects the same way it already defers the opponent's DAMAGE. When the first mover used a pivot move and went first (`p?SelfSwitchFirst` → `firstMoverPivots`), the second mover's `status` / `confusion` / on-target `boosts` are **skipped entirely** for the outgoing mon (so its berry is never consumed, no status/confusion/stat-drop is applied); only the second mover's `selfBoosts` still apply to itself. The redirected effect lands on the switch-in later via `applyPivotIncomingEffects` at confirm time. This means the outgoing pivoting mon keeps its real pre-existing state and there is **no apply-then-revert** — if the user clicks "Skip pivot" the effect simply never lands, consistent with the deferred damage. (Symmetric note: redirect only happens when the pivoting mon goes FIRST; a pivot mon moving second takes the opponent's hit/effects before switching, so no redirect.)

**Verify** (headless, no UI flow needed):
```js
const T = window.__rsaTest;
const html = T.renderRoundCard(rdWithPivotSwitch, -1);
// → '.rsa-actor-stack.rsa-p1-stack' contains 2 '.rsa-actor'; '.rsa-actor-incoming' shows the switch-in + KO tag
// Status redirect: T.applyPivotIncomingEffects(mon, 'Hypnosis') → 'Sleep'; mon.status === 'Sleep'
// Outgoing mon: captured with no status/berry-loss (deferred); T.revertPivotOutgoingEffects no longer exists.
```
