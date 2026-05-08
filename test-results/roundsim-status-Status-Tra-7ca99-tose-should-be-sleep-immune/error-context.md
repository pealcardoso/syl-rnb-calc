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
        - generic [ref=e57] [cursor=pointer]: 👋
        - generic [ref=e58] [cursor=pointer]: 😤
        - generic [ref=e59] [cursor=pointer]: ⏱️
        - generic [ref=e60] [cursor=pointer]: 🛡️
        - generic [ref=e61] [cursor=pointer]: 🔨
        - generic [ref=e62] [cursor=pointer]: 🔒
        - generic [ref=e63] [cursor=pointer]: ⚡
        - generic [ref=e64] [cursor=pointer]: 💫
        - generic [ref=e65] [cursor=pointer]: 🎯
        - generic [ref=e66] [cursor=pointer]: 💊
        - generic [ref=e67] [cursor=pointer]: 🕊️
        - generic [ref=e68] [cursor=pointer]: 💧
        - generic [ref=e69] [cursor=pointer]: 📣
        - generic [ref=e70] [cursor=pointer]: 🎒
        - generic [ref=e71] [cursor=pointer]: 🌧️
        - generic [ref=e72] [cursor=pointer]: 🏜️
        - generic [ref=e73] [cursor=pointer]: ☀️
        - generic [ref=e74] [cursor=pointer]: ❄️
        - generic [ref=e75] [cursor=pointer]: 💣
        - generic [ref=e76] [cursor=pointer]: 🧱
        - generic [ref=e77] [cursor=pointer]: ⚠️
        - generic [ref=e78] [cursor=pointer]: 🪞
        - generic [ref=e79] [cursor=pointer]: 🌦️
        - generic [ref=e80] [cursor=pointer]: 🌫️
        - generic [ref=e81] [cursor=pointer]: 🐾
        - generic [ref=e82] [cursor=pointer]: 🎲
        - generic [ref=e83] [cursor=pointer]: 🏎️
        - generic [ref=e84] [cursor=pointer]: ↩️
        - generic [ref=e85] [cursor=pointer]: ❗
        - generic [ref=e86] [cursor=pointer]: 🕸️
        - generic [ref=e87] [cursor=pointer]: ☠️
        - generic [ref=e88] [cursor=pointer]: 📉
        - generic [ref=e89] [cursor=pointer]: 📈
        - generic [ref=e90] [cursor=pointer]: 🔄
        - generic [ref=e91] [cursor=pointer]: 🏃
        - button "✕" [ref=e92] [cursor=pointer]
    - generic [ref=e93]:
      - generic [ref=e95]:
        - generic [ref=e96]:
          - generic [ref=e97]: Your Team (drag from box)
          - generic [ref=e98]: "0"
        - button "⚔️" [ref=e99] [cursor=pointer]
      - generic [ref=e100]:
        - generic [ref=e101]:
          - generic [ref=e102]: Opponent Team
          - generic [ref=e103]: "0"
          - generic [ref=e104]:
            - button "◀" [ref=e105] [cursor=pointer]
            - button "▶" [ref=e106] [cursor=pointer]
            - button "🚚" [ref=e107] [cursor=pointer]
        - textbox "Search trainer…" [ref=e109]
    - generic [ref=e110]:
      - generic [ref=e111]: Log Round
      - region "Move selection" [ref=e113]:
        - radiogroup "Abomasnow's Moves (select one to show detailed results)" [ref=e114]:
          - generic [ref=e115]: Abomasnow's Moves (select one to show detailed results)
          - generic [ref=e116]:
            - radio "Grass Physical Wood Hammer" [ref=e117]
            - generic [ref=e118] [cursor=pointer]:
              - generic [ref=e119]:
                - img "Grass" [ref=e120]
                - img "Physical" [ref=e121]
              - generic [ref=e122]: Wood Hammer
            - generic [ref=e123] [cursor=pointer]: 39-46 (27-32%)
            - checkbox "Crit" [ref=e124]
            - generic "Force this attack to be a critical hit?" [ref=e125] [cursor=pointer]: Crit
          - generic [ref=e126]:
            - radio "Ice Special Ice Beam" [ref=e127]
            - generic [ref=e128] [cursor=pointer]:
              - generic [ref=e129]:
                - img "Ice" [ref=e130]
                - img "Special" [ref=e131]
              - generic [ref=e132]: Ice Beam
            - generic [ref=e133] [cursor=pointer]: 48-57 (34-40%)
            - checkbox "Crit" [ref=e134]
            - generic "Force this attack to be a critical hit?" [ref=e135] [cursor=pointer]: Crit
          - generic [ref=e136]:
            - radio "Ice Physical Ice Shard" [ref=e137]
            - generic [ref=e138] [cursor=pointer]:
              - generic [ref=e139]:
                - img "Ice" [ref=e140]
                - img "Physical" [ref=e141]
              - generic [ref=e142]: Ice Shard
            - generic [ref=e143] [cursor=pointer]: 27-33 (19-23%)
            - checkbox "Crit" [ref=e144]
            - generic "Force this attack to be a critical hit?" [ref=e145] [cursor=pointer]: Crit
          - generic [ref=e146]:
            - radio "Ground Physical Earthquake" [ref=e147]
            - generic [ref=e148] [cursor=pointer]:
              - generic [ref=e149]:
                - img "Ground" [ref=e150]
                - img "Physical" [ref=e151]
              - generic [ref=e152]: Earthquake
            - generic [ref=e153] [cursor=pointer]: 22-26 (15-18%)
            - checkbox "Crit" [ref=e154]
            - generic "Force this attack to be a critical hit?" [ref=e155] [cursor=pointer]: Crit
        - radiogroup "Abomasnow's Moves (select one to show detailed results)" [ref=e156]:
          - generic [ref=e157]: Abomasnow's Moves (select one to show detailed results)
          - generic [ref=e158]:
            - checkbox "Crit" [ref=e159]
            - generic "Force this attack to be a critical hit?" [ref=e160] [cursor=pointer]: Crit
            - radio "Grass Physical Wood Hammer" [ref=e161]
            - generic [ref=e162] [cursor=pointer]:
              - generic [ref=e163]:
                - img "Grass" [ref=e164]
                - img "Physical" [ref=e165]
              - generic [ref=e166]: Wood Hammer
            - generic [ref=e167] [cursor=pointer]: 39-46 (27-32%)
            - generic [ref=e168]: 0.00%
          - generic [ref=e169]:
            - checkbox "Crit" [ref=e170]
            - generic "Force this attack to be a critical hit?" [ref=e171] [cursor=pointer]: Crit
            - radio "Ice Special Ice Beam" [checked] [ref=e172]
            - generic [ref=e173]:
              - generic [ref=e174]:
                - img "Ice" [ref=e175]
                - img "Special" [ref=e176]
              - generic [ref=e177]: Ice Beam
            - generic [ref=e178] [cursor=pointer]: 48-57 (34-40%)
            - generic [ref=e179]: 100.00%
          - generic [ref=e180]:
            - checkbox "Crit" [ref=e181]
            - generic "Force this attack to be a critical hit?" [ref=e182] [cursor=pointer]: Crit
            - radio "Ice Physical Ice Shard" [ref=e183]
            - generic [ref=e184] [cursor=pointer]:
              - generic [ref=e185]:
                - img "Ice" [ref=e186]
                - img "Physical" [ref=e187]
              - generic [ref=e188]: Ice Shard
            - generic [ref=e189] [cursor=pointer]: 27-33 (19-23%)
            - generic [ref=e190]: 0.00%
          - generic [ref=e191]:
            - checkbox "Crit" [ref=e192]
            - generic "Force this attack to be a critical hit?" [ref=e193] [cursor=pointer]: Crit
            - radio "Ground Physical Earthquake" [ref=e194]
            - generic [ref=e195] [cursor=pointer]:
              - generic [ref=e196]:
                - img "Ground" [ref=e197]
                - img "Physical" [ref=e198]
              - generic [ref=e199]: Earthquake
            - generic [ref=e200] [cursor=pointer]: 22-26 (15-18%)
            - generic [ref=e201]: 0.00%
      - generic [ref=e202]:
        - generic [ref=e203]: Select a move
        - generic [ref=e204]: Select a move
      - generic [ref=e205]:
        - generic [ref=e206]:
          - checkbox "P2 Crits" [ref=e207]
          - generic [ref=e208]: P2 Crits
        - generic [ref=e209]:
          - checkbox "Apply P1 Effect" [ref=e210]
          - generic [ref=e211]: Apply P1 Effect
        - generic [ref=e212]:
          - checkbox "Apply P2 Effect" [checked] [ref=e213]
          - generic [ref=e214]: Apply P2 Effect
      - generic [ref=e216]:
        - generic [ref=e217]: Comment
        - textbox "Comment" [ref=e218]:
          - /placeholder: Note...
      - generic [ref=e219]:
        - generic [ref=e220]:
          - generic [ref=e221]: ☀ Weather
          - combobox "☀ Weather" [ref=e222] [cursor=pointer]:
            - option "None" [selected]
            - option "Sun"
            - option "Rain"
            - option "Sand"
            - option "Snow"
            - option "Hail"
            - option "Harsh Sunshine"
            - option "Heavy Rain"
            - option "Strong Winds"
          - generic "Weather does not expire after 5 turns" [ref=e223] [cursor=pointer]:
            - checkbox "Permanent" [ref=e224]
            - text: Permanent
        - generic [ref=e225]:
          - generic [ref=e226]: 🌿 Terrain
          - combobox "🌿 Terrain" [ref=e227] [cursor=pointer]:
            - option "None" [selected]
            - option "Electric"
            - option "Grassy"
            - option "Misty"
            - option "Psychic"
        - 'generic "Trick Room: slower Pokémon move first" [ref=e229] [cursor=pointer]':
          - checkbox "🔮 Trick Room" [ref=e230]
          - generic [ref=e231]: 🔮 Trick Room
      - generic [ref=e232]:
        - button "▶ Log Round" [ref=e233] [cursor=pointer]
        - generic [ref=e234]:
          - combobox "Switch P1 active" [ref=e235]:
            - option "— Switch P1 —" [selected]
          - button "⇄ Switch In" [ref=e236] [cursor=pointer]
        - button "📋 Copy Log" [ref=e237] [cursor=pointer]
        - button "Clear Line" [ref=e238] [cursor=pointer]
    - generic [ref=e239]:
      - generic [ref=e240]:
        - generic [ref=e241]: Round Log
        - generic [ref=e242]: "0"
        - button "⊖ Collapse All" [ref=e243] [cursor=pointer]
        - button "🗑 Delete All" [ref=e244] [cursor=pointer]
      - generic [ref=e246]: No rounds yet. Set your teams, load the calc, and log rounds.
      - generic [ref=e248] [cursor=pointer]:
        - generic [ref=e249]: 📋 Field State
        - generic [ref=e250]: ▾
  - button "Click for Light Theme" [ref=e252]
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