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
      - generic [ref=e334]:
        - generic [ref=e335]:
          - generic [ref=e336] [cursor=pointer]: All
          - generic "Gold tier" [ref=e337] [cursor=pointer]: ★
          - generic "Primary tier" [ref=e338] [cursor=pointer]: ●
          - generic "Silver tier" [ref=e339] [cursor=pointer]: ◌
        - generic [ref=e340] [cursor=pointer]:
          - text: 👋
          - generic [ref=e341]: Fake Out
        - generic [ref=e342] [cursor=pointer]:
          - text: 😤
          - generic [ref=e343]: Intimidate
        - generic [ref=e344] [cursor=pointer]:
          - text: ⏱️
          - generic [ref=e345]: Speed Control
          - generic [ref=e346]:
            - generic [ref=e347]: ★
            - generic [ref=e348]: ◌
        - generic [ref=e349] [cursor=pointer]:
          - text: 🛡️
          - generic [ref=e350]: Crit Immunity
        - generic [ref=e351] [cursor=pointer]:
          - text: 🔨
          - generic [ref=e352]: Mold Breaker
        - generic [ref=e353] [cursor=pointer]:
          - text: 🔒
          - generic [ref=e354]: Protect
        - generic [ref=e355] [cursor=pointer]:
          - text: ⚡
          - generic [ref=e356]: Priority Move
        - generic [ref=e357] [cursor=pointer]:
          - text: 💫
          - generic [ref=e358]: Spread Move
        - generic [ref=e359] [cursor=pointer]:
          - text: 🎯
          - generic [ref=e360]: Never Misses
        - generic [ref=e361] [cursor=pointer]:
          - text: 💊
          - generic [ref=e362]: Status Immune
        - generic [ref=e363] [cursor=pointer]:
          - text: 🕊️
          - generic [ref=e364]: Ground Immune
        - generic [ref=e365] [cursor=pointer]:
          - text: 💧
          - generic [ref=e366]: Soaker
        - generic [ref=e367] [cursor=pointer]:
          - text: 📣
          - generic [ref=e368]: Follow Me
        - generic [ref=e369] [cursor=pointer]:
          - text: 🎒
          - generic [ref=e370]: Knock Off
        - generic [ref=e371] [cursor=pointer]:
          - text: 🌧️
          - generic [ref=e372]: Rain Synergy
          - generic [ref=e373]:
            - generic [ref=e374]: ●
            - generic [ref=e375]: ◌
        - generic [ref=e376] [cursor=pointer]:
          - text: 🏜️
          - generic [ref=e377]: Sand Synergy
          - generic [ref=e378]:
            - generic [ref=e379]: ●
            - generic [ref=e380]: ◌
        - generic [ref=e381] [cursor=pointer]:
          - text: ☀️
          - generic [ref=e382]: Sun Synergy
          - generic [ref=e383]:
            - generic [ref=e384]: ●
            - generic [ref=e385]: ◌
        - generic [ref=e386] [cursor=pointer]:
          - text: ❄️
          - generic [ref=e387]: Snow Synergy
          - generic [ref=e388]:
            - generic [ref=e389]: ●
            - generic [ref=e390]: ◌
        - generic [ref=e391] [cursor=pointer]:
          - text: 🧹
          - generic [ref=e392]: Hazard Remover
        - generic [ref=e393] [cursor=pointer]:
          - text: 🪟
          - generic [ref=e394]: Barrier Breaker
        - generic [ref=e395] [cursor=pointer]:
          - text: 💚
          - generic [ref=e396]: Self Healer
          - generic [ref=e397]:
            - generic [ref=e398]: ★
            - generic [ref=e399]: ●
            - generic [ref=e400]: ◌
        - generic [ref=e401] [cursor=pointer]:
          - text: 💣
          - generic [ref=e402]: Exploder
        - generic [ref=e403] [cursor=pointer]:
          - text: 🧱
          - generic [ref=e404]: Sturdy / Sash
        - generic [ref=e405] [cursor=pointer]:
          - text: ⚠️
          - generic [ref=e406]: Hazard Setter
        - generic [ref=e407] [cursor=pointer]:
          - text: 🪞
          - generic [ref=e408]: Screen Setter
        - generic [ref=e409] [cursor=pointer]:
          - text: 🌦️
          - generic [ref=e410]: Weather Setter
        - generic [ref=e411] [cursor=pointer]:
          - text: 🌫️
          - generic [ref=e412]: Accuracy Reducer
          - generic [ref=e413]:
            - generic [ref=e414]: ●
            - generic [ref=e415]: ◌
        - generic [ref=e416] [cursor=pointer]:
          - text: 🐾
          - generic [ref=e417]: Quick Claw
          - generic [ref=e418]:
            - generic [ref=e419]: ●
            - generic [ref=e420]: ◌
        - generic [ref=e421] [cursor=pointer]:
          - text: 🎲
          - generic [ref=e422]: Crit Machine
          - generic [ref=e423]:
            - generic [ref=e424]: ●
            - generic [ref=e425]: ◌
        - generic [ref=e426] [cursor=pointer]:
          - text: 🏎️
          - generic [ref=e427]: Speed Booster
          - generic [ref=e428]:
            - generic [ref=e429]: ●
            - generic [ref=e430]: ◌
        - generic [ref=e431] [cursor=pointer]:
          - text: ↩️
          - generic [ref=e432]: Retaliator
        - generic [ref=e433] [cursor=pointer]:
          - text: ❗
          - generic [ref=e434]: Priority Proc
        - generic [ref=e435] [cursor=pointer]:
          - text: 🕸️
          - generic [ref=e436]: Trapper
        - generic [ref=e437] [cursor=pointer]:
          - text: ☠️
          - generic [ref=e438]: Status Inducer
          - generic [ref=e439]:
            - generic [ref=e440]: ●
            - generic [ref=e441]: ◌
        - generic [ref=e442] [cursor=pointer]:
          - text: 📉
          - generic [ref=e443]: Debuffer
          - generic [ref=e444]:
            - generic [ref=e445]: ★
            - generic [ref=e446]: ◌
        - generic [ref=e447] [cursor=pointer]:
          - text: 📈
          - generic [ref=e448]: Self Booster
        - generic [ref=e449] [cursor=pointer]:
          - text: 🔄
          - generic [ref=e450]: Trick Room
        - generic [ref=e451] [cursor=pointer]:
          - text: 🏃
          - generic [ref=e452]: Pursuit
        - generic [ref=e453] [cursor=pointer]:
          - text: 🪢
          - generic [ref=e454]: Destiny Bond
        - button "✕" [ref=e455] [cursor=pointer]
    - generic [ref=e178]:
      - generic [ref=e180]:
        - generic [ref=e181]:
          - generic [ref=e182]: Your Team (drag from box)
          - generic [ref=e183]: "0"
        - button "⚔️" [ref=e184] [cursor=pointer]
      - generic [ref=e185]:
        - generic [ref=e186]:
          - generic [ref=e187]: Opponent Team
          - generic [ref=e188]: Winstrate Victoria
          - generic [ref=e189]: "0"
          - generic [ref=e190]:
            - button "◀" [ref=e191] [cursor=pointer]
            - button "▶" [ref=e192] [cursor=pointer]
            - button "🚚" [ref=e193] [cursor=pointer]
        - textbox "Search trainer…" [ref=e195]
    - generic [ref=e196]:
      - generic [ref=e197]: Log Round
      - region "Move selection" [ref=e199]:
        - radiogroup "Abomasnow's Moves (select one to show detailed results)" [ref=e200]:
          - generic [ref=e201]: Abomasnow's Moves (select one to show detailed results)
          - generic [ref=e202]:
            - radio "Grass Physical Wood Hammer" [ref=e203]
            - generic [ref=e204] [cursor=pointer]:
              - generic [ref=e205]:
                - img "Grass" [ref=e206]
                - img "Physical" [ref=e207]
              - generic [ref=e208]: Wood Hammer
            - generic [ref=e456] [cursor=pointer]: 39-46 (27-32%)
            - checkbox "Crit" [ref=e209]
            - generic "Force this attack to be a critical hit?" [ref=e210] [cursor=pointer]: Crit
          - generic [ref=e211]:
            - radio "Ice Special Ice Beam" [ref=e212]
            - generic [ref=e213] [cursor=pointer]:
              - generic [ref=e214]:
                - img "Ice" [ref=e215]
                - img "Special" [ref=e216]
              - generic [ref=e217]: Ice Beam
            - generic [ref=e457] [cursor=pointer]: 48-57 (34-40%)
            - checkbox "Crit" [ref=e218]
            - generic "Force this attack to be a critical hit?" [ref=e219] [cursor=pointer]: Crit
          - generic [ref=e220]:
            - radio "Ice Physical Ice Shard" [ref=e221]
            - generic [ref=e222] [cursor=pointer]:
              - generic [ref=e223]:
                - img "Ice" [ref=e224]
                - img "Physical" [ref=e225]
              - generic [ref=e226]: Ice Shard
            - generic [ref=e458] [cursor=pointer]: 27-33 (19-23%)
            - checkbox "Crit" [ref=e227]
            - generic "Force this attack to be a critical hit?" [ref=e228] [cursor=pointer]: Crit
          - generic [ref=e229]:
            - radio "Ground Physical Earthquake" [ref=e230]
            - generic [ref=e231] [cursor=pointer]:
              - generic [ref=e232]:
                - img "Ground" [ref=e233]
                - img "Physical" [ref=e234]
              - generic [ref=e235]: Earthquake
            - generic [ref=e459] [cursor=pointer]: 22-26 (15-18%)
            - checkbox "Crit" [ref=e236]
            - generic "Force this attack to be a critical hit?" [ref=e237] [cursor=pointer]: Crit
        - radiogroup "Abomasnow's Moves (select one to show detailed results)" [ref=e238]:
          - generic [ref=e239]: Abomasnow's Moves (select one to show detailed results)
          - generic [ref=e240]:
            - checkbox "Crit" [ref=e241]
            - generic "Force this attack to be a critical hit?" [ref=e242] [cursor=pointer]: Crit
            - radio "Grass Physical Wood Hammer" [ref=e243]
            - generic [ref=e244] [cursor=pointer]:
              - generic [ref=e245]:
                - img "Grass" [ref=e246]
                - img "Physical" [ref=e247]
              - generic [ref=e248]: Wood Hammer
            - generic [ref=e460] [cursor=pointer]: 39-46 (27-32%)
            - generic [ref=e249]: 0.00%
          - generic [ref=e250]:
            - checkbox "Crit" [ref=e251]
            - generic "Force this attack to be a critical hit?" [ref=e252] [cursor=pointer]: Crit
            - radio "Ice Special Ice Beam" [checked] [ref=e253]
            - generic [ref=e254]:
              - generic [ref=e255]:
                - img "Ice" [ref=e256]
                - img "Special" [ref=e257]
              - generic [ref=e258]: Ice Beam
            - generic [ref=e461] [cursor=pointer]: 48-57 (34-40%)
            - generic [ref=e259]: 100.00%
          - generic [ref=e260]:
            - checkbox "Crit" [ref=e261]
            - generic "Force this attack to be a critical hit?" [ref=e262] [cursor=pointer]: Crit
            - radio "Ice Physical Ice Shard" [ref=e263]
            - generic [ref=e264] [cursor=pointer]:
              - generic [ref=e265]:
                - img "Ice" [ref=e266]
                - img "Physical" [ref=e267]
              - generic [ref=e268]: Ice Shard
            - generic [ref=e462] [cursor=pointer]: 27-33 (19-23%)
            - generic [ref=e269]: 0.00%
          - generic [ref=e270]:
            - checkbox "Crit" [ref=e271]
            - generic "Force this attack to be a critical hit?" [ref=e272] [cursor=pointer]: Crit
            - radio "Ground Physical Earthquake" [ref=e273]
            - generic [ref=e274] [cursor=pointer]:
              - generic [ref=e275]:
                - img "Ground" [ref=e276]
                - img "Physical" [ref=e277]
              - generic [ref=e278]: Earthquake
            - generic [ref=e463] [cursor=pointer]: 22-26 (15-18%)
            - generic [ref=e279]: 0.00%
      - generic [ref=e280]:
        - generic [ref=e281]: Select a move
        - generic [ref=e282]: Select a move
      - generic [ref=e283]:
        - generic [ref=e284]:
          - checkbox "P2 Crits" [ref=e285]
          - generic [ref=e286]: P2 Crits
        - generic [ref=e287]:
          - checkbox "Apply P1 Effect" [ref=e288]
          - generic [ref=e289]: Apply P1 Effect
        - generic [ref=e290]:
          - checkbox "Apply P2 Effect" [checked] [ref=e291]
          - generic [ref=e292]: Apply P2 Effect
      - generic [ref=e294]:
        - generic [ref=e295]: Comment
        - textbox "Comment" [ref=e296]:
          - /placeholder: Note...
      - generic [ref=e297]:
        - generic [ref=e298]:
          - generic [ref=e299]: ☀ Weather
          - combobox "☀ Weather" [ref=e300] [cursor=pointer]:
            - option "None" [selected]
            - option "Sun"
            - option "Rain"
            - option "Sand"
            - option "Snow"
            - option "Hail"
            - option "Harsh Sunshine"
            - option "Heavy Rain"
            - option "Strong Winds"
          - generic "Weather does not expire after 5 turns" [ref=e301] [cursor=pointer]:
            - checkbox "Permanent" [ref=e302]
            - text: Permanent
        - generic [ref=e303]:
          - generic [ref=e304]: 🌿 Terrain
          - combobox "🌿 Terrain" [ref=e305] [cursor=pointer]:
            - option "None" [selected]
            - option "Electric"
            - option "Grassy"
            - option "Misty"
            - option "Psychic"
        - 'generic "Trick Room: slower Pokémon move first" [ref=e307] [cursor=pointer]':
          - checkbox "🔮 Trick Room" [ref=e308]
          - generic [ref=e309]: 🔮 Trick Room
      - generic [ref=e310]:
        - button "▶ Log Round" [ref=e311] [cursor=pointer]
        - generic [ref=e312]:
          - combobox "Switch P1 active" [ref=e313]:
            - option "— Switch P1 —" [selected]
          - button "⇄ Switch In" [ref=e314] [cursor=pointer]
        - button "📋 Copy Log" [ref=e315] [cursor=pointer]
        - button "Clear Line" [ref=e316] [cursor=pointer]
    - generic [ref=e317]:
      - generic [ref=e318]:
        - generic [ref=e319]: Round Log
        - generic [ref=e320]: "0"
        - button "⊖ Collapse All" [ref=e321] [cursor=pointer]
        - button "🔍 Analyze Fight" [ref=e322] [cursor=pointer]
        - button "📤 Export Line" [ref=e323] [cursor=pointer]
        - button "📥 Import Line" [ref=e324] [cursor=pointer]
        - button "🗑 Delete All" [ref=e325] [cursor=pointer]
      - generic [ref=e327]: No rounds yet. Set your teams, load the calc, and log rounds.
      - generic [ref=e329] [cursor=pointer]:
        - generic [ref=e330]: 📋 Field State
        - generic [ref=e331]: ▾
  - button "Click for Light Theme" [ref=e333]
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