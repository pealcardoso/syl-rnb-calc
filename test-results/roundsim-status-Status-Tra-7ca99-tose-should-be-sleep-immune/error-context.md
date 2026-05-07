# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: roundsim-status.spec.ts >> Status Tracking & Immunity >> BUG #5: Comatose should be sleep-immune
- Location: tests\roundsim-status.spec.ts:69:8

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]: Round Simulator
    - button "📋 Bug Report" [ref=e4] [cursor=pointer]
    - link "← Back to Calculator" [ref=e5] [cursor=pointer]:
      - /url: ./index.html
  - navigation [ref=e6]
  - generic [ref=e8]:
    - region "Settings" [ref=e9]:
      - text: Pokémon Damage Calculator
      - radiogroup "Select the generation.":
        - generic [ref=e10]: Select the generation.
        - radio [checked] [ref=e11]
      - radiogroup "Select the output notation.":
        - generic [ref=e12]: Select the output notation.
        - radio [ref=e13]
        - radio [checked] [ref=e14]
      - radiogroup "Select the calculator's mode of function." [ref=e15]:
        - generic [ref=e16]: Select the calculator's mode of function.
        - radio [checked] [ref=e17]
        - radio [ref=e18]
        - radio [ref=e19]
        - radio [ref=e20]
    - separator [ref=e21]
    - generic [ref=e22]:
      - generic [ref=e23]: "Lines:"
      - button "Line A (0)" [ref=e25] [cursor=pointer]
      - button "+ New Line" [ref=e26] [cursor=pointer]
      - button "Delete Line" [ref=e27] [cursor=pointer]
      - button "💾 Save" [ref=e28] [cursor=pointer]
      - button "📂 Load" [ref=e29] [cursor=pointer]
      - button "✕ Clear Save" [ref=e30] [cursor=pointer]
    - generic [ref=e31]:
      - generic [ref=e32]: "Battle Format:"
      - generic [ref=e33]:
        - button "Singles" [ref=e34] [cursor=pointer]
        - button "Doubles (1 Trainer)" [ref=e35] [cursor=pointer]
        - button "Doubles (2 Trainers)" [ref=e36] [cursor=pointer]
    - generic [ref=e38]:
      - generic [ref=e39]:
        - generic [ref=e40]: Your Box
        - generic [ref=e41]: "0"
        - generic [ref=e42]:
          - button "📥 Import" [ref=e43] [cursor=pointer]
          - button "🗑 Delete" [ref=e44] [cursor=pointer]
          - button "📊 Coverage" [ref=e45] [cursor=pointer]
          - button "🏷️ Tag Cov." [ref=e46] [cursor=pointer]
          - button "🚫 Items" [ref=e47] [cursor=pointer]
      - generic [ref=e48]:
        - generic [ref=e49]: "Sort:"
        - button "Default" [ref=e50] [cursor=pointer]
        - button "⚔ Offense" [ref=e51] [cursor=pointer]
        - button "🛡 Move Def" [ref=e52] [cursor=pointer]
        - button "🛡 All Def" [ref=e53] [cursor=pointer]
        - button "⚙ Settings" [ref=e54] [cursor=pointer]
      - generic [ref=e56]:
        - generic [ref=e57] [cursor=pointer]: "👋 Filter: Fake Out — Forces flinch on first turn"
        - generic [ref=e58] [cursor=pointer]: "😤 Filter: Intimidate — Drops opponent Attack on switch-in"
        - generic [ref=e59] [cursor=pointer]: "⏱️ Filter: Speed Control — Has speed-lowering moves, Tailwind, or Trick Room — controls turn order"
        - generic [ref=e60] [cursor=pointer]: "🛡️ Filter: Crit Immunity — Battle Armor or Shell Armor — immune to critical hits"
        - generic [ref=e61] [cursor=pointer]: "🔨 Filter: Mold Breaker — Ignores abilities (Mold Breaker / Turboblaze / Teravolt / Mycelium Might / Neutralizing Gas)"
        - generic [ref=e62] [cursor=pointer]: "🔒 Filter: Protect — Has a Protect-variant move (Protect, Detect, Wide Guard, Quick Guard, etc.)"
        - generic [ref=e63] [cursor=pointer]: "⚡ Filter: Priority Move — Has a move with increased priority (Extremespeed, Bullet Punch, etc.)"
        - generic [ref=e64] [cursor=pointer]: "💫 Filter: Spread Move — Has a move that hits multiple targets (Earthquake, Surf, Dazzling Gleam, etc.)"
        - generic [ref=e65] [cursor=pointer]: "🎯 Filter: Never Misses — Has a move that always hits (Swift, Aerial Ace, Magical Leaf, etc.)"
        - generic [ref=e66] [cursor=pointer]: "💊 Filter: Status Immune — Ability grants immunity to one or more status conditions"
        - generic [ref=e67] [cursor=pointer]: "🕊️ Filter: Ground Immune — Flying type or Levitate — immune to Ground-type moves"
        - generic [ref=e68] [cursor=pointer]: "💧 Filter: Soaker — Has Soak — changes the target's type to Water"
        - generic [ref=e69] [cursor=pointer]: "📣 Filter: Follow Me — Has Follow Me or Rage Powder — redirects single-target attacks to itself"
        - generic [ref=e70] [cursor=pointer]: "🎒 Filter: Knock Off — Has Knock Off — removes the target's held item"
        - generic [ref=e71] [cursor=pointer]: "🌧️ Filter: Rain Synergy — Water type or ability benefiting from rain (Swift Swim, Drizzle, Rain Dish, Hydration, Dry Skin)"
        - generic [ref=e72] [cursor=pointer]: "🏜️ Filter: Sand Synergy — Rock/Steel/Ground type (sand immunity) or sand ability (Sand Rush, Sand Force, Sand Stream, Sand Spit)"
        - generic [ref=e73] [cursor=pointer]: "☀️ Filter: Sun Synergy — Fire type or ability boosted by sun (Chlorophyll, Drought, Solar Power, Flower Gift)"
        - generic [ref=e74] [cursor=pointer]: "❄️ Filter: Snow Synergy — Ice type or ability boosted by snow (Snow Warning, Slush Rush, Ice Body, Snow Cloak)"
        - generic [ref=e75] [cursor=pointer]: "💣 Filter: Exploder — Has Explosion, Self-Destruct, or Misty Explosion — sacrifices itself for massive damage"
        - generic [ref=e76] [cursor=pointer]: "🧱 Filter: Sturdy / Sash — Sturdy ability or Focus Sash — survives any OHKO from full HP"
        - generic [ref=e77] [cursor=pointer]: "⚠️ Filter: Hazard Setter — Can set entry hazards: Stealth Rock, Spikes, Toxic Spikes, or Sticky Web"
        - generic [ref=e78] [cursor=pointer]: "🪞 Filter: Screen Setter — Can set Reflect, Light Screen, or Aurora Veil"
        - generic [ref=e79] [cursor=pointer]: "🌦️ Filter: Weather Setter — Sets weather via ability (Drizzle/Drought/Sand Stream/Snow Warning) or moves"
        - generic [ref=e80] [cursor=pointer]: "🚀 Filter: Weather Boosted — Ability is directly boosted by weather (Swift Swim, Chlorophyll, Sand Rush, Slush Rush, Sand Force, Solar Power)"
        - generic [ref=e81] [cursor=pointer]: "🌫️ Filter: Accuracy Reducer — Can lower opponent accuracy: Bright Powder/Lax Incense item, Sand Veil/Snow Cloak ability, or Flash/Smokescreen/etc."
        - generic [ref=e82] [cursor=pointer]: "🐾 Filter: Quick Claw — Holds Quick Claw — may randomly move first regardless of speed"
        - generic [ref=e83] [cursor=pointer]: "🎲 Filter: Crit Machine — Elevated crit rate: Sniper ability, Scope Lens/Razor Claw, or Focus Energy/Frost Breath/Storm Throw"
        - generic [ref=e84] [cursor=pointer]: "🏎️ Filter: Speed Booster — Can sharply raise own Speed: Speed Boost ability, or Agility/Dragon Dance/Rock Polish/etc."
        - generic [ref=e85] [cursor=pointer]: "↩️ Filter: Retaliator — Hits harder after taking damage (Revenge, Avalanche, Payback, Assurance, Counter, Mirror Coat)"
        - generic [ref=e86] [cursor=pointer]: "❗ Filter: Priority Proc — Quick Draw ability or Quick Claw item — may randomly act first"
        - generic [ref=e87] [cursor=pointer]: "🕸️ Filter: Trapper — Arena Trap / Shadow Tag / Magnet Pull — prevents opponent from switching out"
        - generic [ref=e88] [cursor=pointer]: "☠️ Filter: Status Inducer — Has a move that inflicts status: Toxic, Thunder Wave, Spore, Will-O-Wisp, Glare, Yawn, etc."
        - generic [ref=e89] [cursor=pointer]: "📉 Filter: Debuffer — Has moves that lower opponent stats (Charm, Growl, Screech, Fake Tears, Parting Shot, etc.)"
        - generic [ref=e90] [cursor=pointer]: "📈 Filter: Self Booster — Has moves that sharply raise own stats (Swords Dance, Nasty Plot, Dragon Dance, Shell Smash, etc.)"
        - generic [ref=e91] [cursor=pointer]: "🔄 Filter: Trick Room — Has Trick Room — reverses speed order for 5 turns"
        - button "✕" [ref=e92] [cursor=pointer]
    - generic [ref=e93]:
      - generic [ref=e95]:
        - generic [ref=e96]: Your Team (drag from box)
        - generic [ref=e97]: "0"
      - generic [ref=e98]:
        - generic [ref=e99]:
          - generic [ref=e100]: Opponent Team
          - generic [ref=e101]: "0"
          - generic [ref=e102]:
            - button "◀" [ref=e103] [cursor=pointer]
            - button "▶" [ref=e104] [cursor=pointer]
            - button "🚚" [ref=e105] [cursor=pointer]
        - textbox "Search trainer…" [ref=e107]
    - generic [ref=e108]:
      - generic [ref=e109]: Log Round
      - region "Move selection" [ref=e111]:
        - radiogroup "Abomasnow's Moves (select one to show detailed results)" [ref=e112]:
          - generic [ref=e113]: Abomasnow's Moves (select one to show detailed results)
          - generic [ref=e114]:
            - radio "Grass Physical Wood Hammer" [ref=e115]
            - generic [ref=e116] [cursor=pointer]:
              - generic [ref=e117]:
                - img "Grass" [ref=e118]
                - img "Physical" [ref=e119]
              - generic [ref=e120]: Wood Hammer
            - generic [ref=e121] [cursor=pointer]: 39-46 (27-32%)
            - checkbox "Crit" [ref=e122]
            - generic "Force this attack to be a critical hit?" [ref=e123] [cursor=pointer]: Crit
          - generic [ref=e124]:
            - radio "Ice Special Ice Beam" [ref=e125]
            - generic [ref=e126] [cursor=pointer]:
              - generic [ref=e127]:
                - img "Ice" [ref=e128]
                - img "Special" [ref=e129]
              - generic [ref=e130]: Ice Beam
            - generic [ref=e131] [cursor=pointer]: 48-57 (34-40%)
            - checkbox "Crit" [ref=e132]
            - generic "Force this attack to be a critical hit?" [ref=e133] [cursor=pointer]: Crit
          - generic [ref=e134]:
            - radio "Ice Physical Ice Shard" [ref=e135]
            - generic [ref=e136] [cursor=pointer]:
              - generic [ref=e137]:
                - img "Ice" [ref=e138]
                - img "Physical" [ref=e139]
              - generic [ref=e140]: Ice Shard
            - generic [ref=e141] [cursor=pointer]: 27-33 (19-23%)
            - checkbox "Crit" [ref=e142]
            - generic "Force this attack to be a critical hit?" [ref=e143] [cursor=pointer]: Crit
          - generic [ref=e144]:
            - radio "Ground Physical Earthquake" [ref=e145]
            - generic [ref=e146] [cursor=pointer]:
              - generic [ref=e147]:
                - img "Ground" [ref=e148]
                - img "Physical" [ref=e149]
              - generic [ref=e150]: Earthquake
            - generic [ref=e151] [cursor=pointer]: 22-26 (15-18%)
            - checkbox "Crit" [ref=e152]
            - generic "Force this attack to be a critical hit?" [ref=e153] [cursor=pointer]: Crit
        - radiogroup "Abomasnow's Moves (select one to show detailed results)" [ref=e154]:
          - generic [ref=e155]: Abomasnow's Moves (select one to show detailed results)
          - generic [ref=e156]:
            - checkbox "Crit" [ref=e157]
            - generic "Force this attack to be a critical hit?" [ref=e158] [cursor=pointer]: Crit
            - radio "Grass Physical Wood Hammer" [ref=e159]
            - generic [ref=e160] [cursor=pointer]:
              - generic [ref=e161]:
                - img "Grass" [ref=e162]
                - img "Physical" [ref=e163]
              - generic [ref=e164]: Wood Hammer
            - generic [ref=e165] [cursor=pointer]: 39-46 (27-32%)
            - generic [ref=e166]: 0.00%
          - generic [ref=e167]:
            - checkbox "Crit" [ref=e168]
            - generic "Force this attack to be a critical hit?" [ref=e169] [cursor=pointer]: Crit
            - radio "Ice Special Ice Beam" [checked] [ref=e170]
            - generic [ref=e171]:
              - generic [ref=e172]:
                - img "Ice" [ref=e173]
                - img "Special" [ref=e174]
              - generic [ref=e175]: Ice Beam
            - generic [ref=e176] [cursor=pointer]: 48-57 (34-40%)
            - generic [ref=e177]: 100.00%
          - generic [ref=e178]:
            - checkbox "Crit" [ref=e179]
            - generic "Force this attack to be a critical hit?" [ref=e180] [cursor=pointer]: Crit
            - radio "Ice Physical Ice Shard" [ref=e181]
            - generic [ref=e182] [cursor=pointer]:
              - generic [ref=e183]:
                - img "Ice" [ref=e184]
                - img "Physical" [ref=e185]
              - generic [ref=e186]: Ice Shard
            - generic [ref=e187] [cursor=pointer]: 27-33 (19-23%)
            - generic [ref=e188]: 0.00%
          - generic [ref=e189]:
            - checkbox "Crit" [ref=e190]
            - generic "Force this attack to be a critical hit?" [ref=e191] [cursor=pointer]: Crit
            - radio "Ground Physical Earthquake" [ref=e192]
            - generic [ref=e193] [cursor=pointer]:
              - generic [ref=e194]:
                - img "Ground" [ref=e195]
                - img "Physical" [ref=e196]
              - generic [ref=e197]: Earthquake
            - generic [ref=e198] [cursor=pointer]: 22-26 (15-18%)
            - generic [ref=e199]: 0.00%
      - generic [ref=e200]:
        - generic [ref=e201]: Select a move
        - generic [ref=e202]: Select a move
      - generic [ref=e203]:
        - generic [ref=e204]:
          - checkbox "P2 Crits" [ref=e205]
          - generic [ref=e206]: P2 Crits
        - generic [ref=e207]:
          - checkbox "Apply P1 Effect" [ref=e208]
          - generic [ref=e209]: Apply P1 Effect
        - generic [ref=e210]:
          - checkbox "Apply P2 Effect" [checked] [ref=e211]
          - generic [ref=e212]: Apply P2 Effect
      - generic [ref=e214]:
        - generic [ref=e215]: Comment
        - textbox "Comment" [ref=e216]:
          - /placeholder: Note...
      - generic [ref=e217]:
        - generic [ref=e218]:
          - generic [ref=e219]: ☀ Weather
          - combobox "☀ Weather" [ref=e220] [cursor=pointer]:
            - option "None" [selected]
            - option "Sun"
            - option "Rain"
            - option "Sand"
            - option "Snow"
            - option "Hail"
            - option "Harsh Sunshine"
            - option "Heavy Rain"
            - option "Strong Winds"
          - generic "Weather does not expire after 5 turns" [ref=e221] [cursor=pointer]:
            - checkbox "Permanent" [ref=e222]
            - text: Permanent
        - generic [ref=e223]:
          - generic [ref=e224]: 🌿 Terrain
          - combobox "🌿 Terrain" [ref=e225] [cursor=pointer]:
            - option "None" [selected]
            - option "Electric"
            - option "Grassy"
            - option "Misty"
            - option "Psychic"
        - 'generic "Trick Room: slower Pokémon move first" [ref=e227] [cursor=pointer]':
          - checkbox "🔮 Trick Room" [ref=e228]
          - generic [ref=e229]: 🔮 Trick Room
      - generic [ref=e230]:
        - button "▶ Log Round" [ref=e231] [cursor=pointer]
        - generic [ref=e232]:
          - combobox "Switch P1 active" [ref=e233]:
            - option "— Switch P1 —" [selected]
          - button "⇄ Switch In" [ref=e234] [cursor=pointer]
        - button "📋 Copy Log" [ref=e235] [cursor=pointer]
        - button "Clear Line" [ref=e236] [cursor=pointer]
    - generic [ref=e237]:
      - generic [ref=e238]:
        - generic [ref=e239]: Round Log
        - generic [ref=e240]: "0"
        - button "⊖ Collapse All" [ref=e241] [cursor=pointer]
        - button "🗑 Delete All" [ref=e242] [cursor=pointer]
      - generic [ref=e244]: No rounds yet. Set your teams, load the calc, and log rounds.
      - generic [ref=e246] [cursor=pointer]:
        - generic [ref=e247]: 📋 Field State
        - generic [ref=e248]: ▾
  - button "Click for Light Theme" [ref=e250]
```

# Test source

```ts
  1   | import { test, expect } from './fixtures';
  2   | 
  3   | test.describe('Status Tracking & Immunity', () => {
  4   | 
  5   |   // ── Type-based status immunity ────────────────────────────────
  6   | 
  7   |   test('Fire type immune to Burn', async ({ rsaPage }) => {
  8   |     const result = await rsaPage.evaluate(() => {
  9   |       const entry = { types: ['Fire'], ability: '', item: '', status: '' };
  10  |       // Replicate isStatusImmune from roundsim_app.js
  11  |       const types = entry.types;
  12  |       if ('Burn' === 'Burn' && types.indexOf('Fire') !== -1) return true;
  13  |       return false;
  14  |     });
  15  |     expect(result).toBe(true);
  16  |   });
  17  | 
  18  |   test('Poison type immune to Poison', async ({ rsaPage }) => {
  19  |     const result = await rsaPage.evaluate(() => {
  20  |       const types = ['Poison'];
  21  |       return types.indexOf('Poison') !== -1;
  22  |     });
  23  |     expect(result).toBe(true);
  24  |   });
  25  | 
  26  |   test('Steel type immune to Poison', async ({ rsaPage }) => {
  27  |     const result = await rsaPage.evaluate(() => {
  28  |       const types = ['Steel'];
  29  |       return types.indexOf('Steel') !== -1;
  30  |     });
  31  |     expect(result).toBe(true);
  32  |   });
  33  | 
  34  |   test('Ice type immune to Freeze', async ({ rsaPage }) => {
  35  |     const result = await rsaPage.evaluate(() => {
  36  |       const types = ['Ice'];
  37  |       return types.indexOf('Ice') !== -1;
  38  |     });
  39  |     expect(result).toBe(true);
  40  |   });
  41  | 
  42  |   test('Electric type immune to Paralysis (Gen 6+)', async ({ rsaPage }) => {
  43  |     const result = await rsaPage.evaluate(() => {
  44  |       const types = ['Electric'];
  45  |       const gen = (window as any).gen || 9;
  46  |       return types.indexOf('Electric') !== -1 && gen >= 6;
  47  |     });
  48  |     expect(result).toBe(true);
  49  |   });
  50  | 
  51  |   // ── Ability-based sleep immunity ──────────────────────────────
  52  | 
  53  |   const SLEEP_IMMUNE_ABILITIES = ['Insomnia', 'Vital Spirit', 'Sweet Veil'];
  54  | 
  55  |   for (const ability of SLEEP_IMMUNE_ABILITIES) {
  56  |     test(`${ability} blocks Sleep`, async ({ rsaPage }) => {
  57  |       const immune = await rsaPage.evaluate(
  58  |         ([ab]) => {
  59  |           const key = ab.toLowerCase().replace(/\s/g, '');
  60  |           return key === 'insomnia' || key === 'vitalspirit' || key === 'sweetveil';
  61  |         },
  62  |         [ability]
  63  |       );
  64  |       expect(immune).toBe(true);
  65  |     });
  66  |   }
  67  | 
  68  |   // BUG #5: Comatose should block sleep
  69  |   test.fail('BUG #5: Comatose should be sleep-immune', async ({ rsaPage }) => {
  70  |     const immune = await rsaPage.evaluate(() => {
  71  |       const key = 'comatose';
  72  |       // Current code only checks: insomnia, vitalspirit, sweetveil
  73  |       return key === 'insomnia' || key === 'vitalspirit' || key === 'sweetveil';
  74  |     });
  75  |     // Currently FAILS: Comatose is not in the list
> 76  |     expect(immune).toBe(true);
      |                    ^ Error: expect(received).toBe(expected) // Object.is equality
  77  |   });
  78  | 
  79  |   // ── Freeze immunity ───────────────────────────────────────────
  80  | 
  81  |   test('Magma Armor blocks Freeze', async ({ rsaPage }) => {
  82  |     const immune = await rsaPage.evaluate(() => {
  83  |       const key = 'magmaarmor';
  84  |       return key === 'magmaarmor';
  85  |     });
  86  |     expect(immune).toBe(true);
  87  |   });
  88  | 
  89  |   test('Ice type blocks Freeze', async ({ rsaPage }) => {
  90  |     const result = await rsaPage.evaluate(() => {
  91  |       const types = ['Ice'];
  92  |       return types.indexOf('Ice') !== -1;
  93  |     });
  94  |     expect(result).toBe(true);
  95  |   });
  96  | 
  97  |   // ── Berry status cures ────────────────────────────────────────
  98  | 
  99  |   const BERRY_CURE_CASES = [
  100 |     { berry: 'Lum Berry', status: 'Burn', cures: true },
  101 |     { berry: 'Lum Berry', status: 'Sleep', cures: true },
  102 |     { berry: 'Lum Berry', status: 'Freeze', cures: true },
  103 |     { berry: 'Lum Berry', status: 'Paralysis', cures: true },
  104 |     { berry: 'Lum Berry', status: 'Poison', cures: true },
  105 |     { berry: 'Chesto Berry', status: 'Sleep', cures: true },
  106 |     { berry: 'Chesto Berry', status: 'Burn', cures: false },
  107 |     { berry: 'Aspear Berry', status: 'Freeze', cures: true },
  108 |     { berry: 'Aspear Berry', status: 'Sleep', cures: false },
  109 |   ];
  110 | 
  111 |   for (const tc of BERRY_CURE_CASES) {
  112 |     test(`${tc.berry} ${tc.cures ? 'cures' : 'does not cure'} ${tc.status}`, async ({ rsaPage }) => {
  113 |       const cures = await rsaPage.evaluate(
  114 |         ([berry, status]) => {
  115 |           const it = berry.toLowerCase().replace(/\s/g, '');
  116 |           if (it === 'lumberry') return true;
  117 |           if (status === 'Sleep' && it === 'chestoberry') return true;
  118 |           if (status === 'Freeze' && it === 'aspearberry') return true;
  119 |           return false;
  120 |         },
  121 |         [tc.berry, tc.status]
  122 |       );
  123 |       expect(cures).toBe(tc.cures);
  124 |     });
  125 |   }
  126 | 
  127 |   // ── Verify ability data exists in BattleAbilities ─────────────
  128 | 
  129 |   const IMMUNITY_ABILITIES = ['Insomnia', 'Vital Spirit', 'Sweet Veil', 'Magma Armor',
  130 |     'Levitate', 'Flash Fire', 'Volt Absorb', 'Water Absorb', 'Lightning Rod',
  131 |     'Motor Drive', 'Storm Drain', 'Sap Sipper', 'Dry Skin'];
  132 | 
  133 |   for (const ability of IMMUNITY_ABILITIES) {
  134 |     test(`BattleAbilities has ${ability}`, async ({ rsaPage }) => {
  135 |       const exists = await rsaPage.evaluate(
  136 |         ([ab]) => {
  137 |           const key = ab.toLowerCase().replace(/[\s\-\']+/g, '');
  138 |           return !!(window as any).BattleAbilities[key];
  139 |         },
  140 |         [ability]
  141 |       );
  142 |       expect(exists).toBe(true);
  143 |     });
  144 |   }
  145 | });
  146 | 
```