# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: roundsim-eot.spec.ts >> End-of-Turn Damage >> BUG #1: Slush Rush should NOT be sandstorm-immune
- Location: tests\roundsim-eot.spec.ts:168:8

# Error details

```
Error: expect(received).toBeTruthy()

Received: undefined
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
  74  |   });
  75  | 
  76  |   test('Poison Heal: heals 1/8 when Badly Poisoned', async ({ rsaPage }) => {
  77  |     const eot = await rsaPage.evaluate(() => {
  78  |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  79  |         { maxHP: 400, status: 'Badly Poisoned', ability: 'Poison Heal', item: '', types: ['Normal'], toxicCounter: 5 }, 'None'
  80  |       );
  81  |     });
  82  |     const entry = eot.find((e: any) => e.source === 'Poison Heal');
  83  |     expect(entry).toBeTruthy();
  84  |     expect(entry.damage).toBe(-50); // always 1/8 regardless of toxic counter
  85  |     // Should NOT have a Toxic entry
  86  |     const toxEntry = eot.find((e: any) => e.source.startsWith('Toxic'));
  87  |     expect(toxEntry).toBeUndefined();
  88  |   });
  89  | 
  90  |   // ── Sandstorm ─────────────────────────────────────────────────
  91  |   test('Sandstorm deals 1/16 to non-immune types', async ({ rsaPage }) => {
  92  |     const eot = await rsaPage.evaluate(() => {
  93  |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  94  |         { maxHP: 320, status: '', ability: '', item: '', types: ['Normal'] }, 'Sand'
  95  |       );
  96  |     });
  97  |     const entry = eot.find((e: any) => e.source === 'Sandstorm');
  98  |     expect(entry).toBeTruthy();
  99  |     expect(entry.damage).toBe(20); // 320/16
  100 |   });
  101 | 
  102 |   test('Sandstorm: Rock type immune', async ({ rsaPage }) => {
  103 |     const eot = await rsaPage.evaluate(() => {
  104 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  105 |         { maxHP: 320, status: '', ability: '', item: '', types: ['Rock'] }, 'Sand'
  106 |       );
  107 |     });
  108 |     expect(eot.find((e: any) => e.source === 'Sandstorm')).toBeUndefined();
  109 |   });
  110 | 
  111 |   test('Sandstorm: Ground type immune', async ({ rsaPage }) => {
  112 |     const eot = await rsaPage.evaluate(() => {
  113 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  114 |         { maxHP: 320, status: '', ability: '', item: '', types: ['Ground'] }, 'Sand'
  115 |       );
  116 |     });
  117 |     expect(eot.find((e: any) => e.source === 'Sandstorm')).toBeUndefined();
  118 |   });
  119 | 
  120 |   test('Sandstorm: Steel type immune', async ({ rsaPage }) => {
  121 |     const eot = await rsaPage.evaluate(() => {
  122 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  123 |         { maxHP: 320, status: '', ability: '', item: '', types: ['Steel'] }, 'Sand'
  124 |       );
  125 |     });
  126 |     expect(eot.find((e: any) => e.source === 'Sandstorm')).toBeUndefined();
  127 |   });
  128 | 
  129 |   test('Sandstorm: Overcoat immune', async ({ rsaPage }) => {
  130 |     const eot = await rsaPage.evaluate(() => {
  131 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  132 |         { maxHP: 320, status: '', ability: 'Overcoat', item: '', types: ['Normal'] }, 'Sand'
  133 |       );
  134 |     });
  135 |     expect(eot.find((e: any) => e.source === 'Sandstorm')).toBeUndefined();
  136 |   });
  137 | 
  138 |   test('Sandstorm: Magic Guard immune', async ({ rsaPage }) => {
  139 |     const eot = await rsaPage.evaluate(() => {
  140 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  141 |         { maxHP: 320, status: '', ability: 'Magic Guard', item: '', types: ['Normal'] }, 'Sand'
  142 |       );
  143 |     });
  144 |     expect(eot.find((e: any) => e.source === 'Sandstorm')).toBeUndefined();
  145 |   });
  146 | 
  147 |   // BUG #1: Ice Body, Snow Cloak, Slush Rush should NOT be sandstorm-immune
  148 |   test.fail('BUG #1: Ice Body should NOT be sandstorm-immune', async ({ rsaPage }) => {
  149 |     const eot = await rsaPage.evaluate(() => {
  150 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  151 |         { maxHP: 320, status: '', ability: 'Ice Body', item: '', types: ['Normal'] }, 'Sand'
  152 |       );
  153 |     });
  154 |     // Currently FAILS: Ice Body is incorrectly in WEATHER_IMMUNE_ABILITIES
  155 |     // After fix, this should find a Sandstorm entry
  156 |     expect(eot.find((e: any) => e.source === 'Sandstorm')).toBeTruthy();
  157 |   });
  158 | 
  159 |   test.fail('BUG #1: Snow Cloak should NOT be sandstorm-immune', async ({ rsaPage }) => {
  160 |     const eot = await rsaPage.evaluate(() => {
  161 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  162 |         { maxHP: 320, status: '', ability: 'Snow Cloak', item: '', types: ['Normal'] }, 'Sand'
  163 |       );
  164 |     });
  165 |     expect(eot.find((e: any) => e.source === 'Sandstorm')).toBeTruthy();
  166 |   });
  167 | 
  168 |   test.fail('BUG #1: Slush Rush should NOT be sandstorm-immune', async ({ rsaPage }) => {
  169 |     const eot = await rsaPage.evaluate(() => {
  170 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  171 |         { maxHP: 320, status: '', ability: 'Slush Rush', item: '', types: ['Normal'] }, 'Sand'
  172 |       );
  173 |     });
> 174 |     expect(eot.find((e: any) => e.source === 'Sandstorm')).toBeTruthy();
      |                                                            ^ Error: expect(received).toBeTruthy()
  175 |   });
  176 | 
  177 |   // ── Hail ──────────────────────────────────────────────────────
  178 |   test('Hail deals 1/16 to non-Ice types', async ({ rsaPage }) => {
  179 |     const eot = await rsaPage.evaluate(() => {
  180 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  181 |         { maxHP: 320, status: '', ability: '', item: '', types: ['Normal'] }, 'Hail'
  182 |       );
  183 |     });
  184 |     const entry = eot.find((e: any) => e.source === 'Hail');
  185 |     expect(entry).toBeTruthy();
  186 |     expect(entry.damage).toBe(20);
  187 |   });
  188 | 
  189 |   test('Hail: Ice type immune', async ({ rsaPage }) => {
  190 |     const eot = await rsaPage.evaluate(() => {
  191 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  192 |         { maxHP: 320, status: '', ability: '', item: '', types: ['Ice'] }, 'Hail'
  193 |       );
  194 |     });
  195 |     expect(eot.find((e: any) => e.source === 'Hail')).toBeUndefined();
  196 |   });
  197 | 
  198 |   // ── Snow does NOT deal damage ─────────────────────────────────
  199 |   test('Snow does NOT deal damage', async ({ rsaPage }) => {
  200 |     const eot = await rsaPage.evaluate(() => {
  201 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  202 |         { maxHP: 320, status: '', ability: '', item: '', types: ['Normal'] }, 'Snow'
  203 |       );
  204 |     });
  205 |     expect(eot.find((e: any) => e.source === 'Hail')).toBeUndefined();
  206 |     expect(eot.find((e: any) => e.source === 'Snow')).toBeUndefined();
  207 |   });
  208 | 
  209 |   // ── Leftovers ─────────────────────────────────────────────────
  210 |   test('Leftovers heals 1/16 max HP', async ({ rsaPage }) => {
  211 |     const eot = await rsaPage.evaluate(() => {
  212 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  213 |         { maxHP: 320, status: '', ability: '', item: 'Leftovers', types: ['Normal'] }, 'None'
  214 |       );
  215 |     });
  216 |     const entry = eot.find((e: any) => e.source === 'Leftovers');
  217 |     expect(entry).toBeTruthy();
  218 |     expect(entry.damage).toBe(-20); // negative = healing
  219 |   });
  220 | 
  221 |   // ── Black Sludge ──────────────────────────────────────────────
  222 |   test('Black Sludge heals 1/16 for Poison-type', async ({ rsaPage }) => {
  223 |     const eot = await rsaPage.evaluate(() => {
  224 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  225 |         { maxHP: 320, status: '', ability: '', item: 'Black Sludge', types: ['Poison'] }, 'None'
  226 |       );
  227 |     });
  228 |     const entry = eot.find((e: any) => e.source === 'Black Sludge');
  229 |     expect(entry).toBeTruthy();
  230 |     expect(entry.damage).toBe(-20);
  231 |   });
  232 | 
  233 |   test('Black Sludge damages 1/8 for non-Poison-type', async ({ rsaPage }) => {
  234 |     const eot = await rsaPage.evaluate(() => {
  235 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  236 |         { maxHP: 320, status: '', ability: '', item: 'Black Sludge', types: ['Normal'] }, 'None'
  237 |       );
  238 |     });
  239 |     const entry = eot.find((e: any) => e.source === 'Black Sludge');
  240 |     expect(entry).toBeTruthy();
  241 |     expect(entry.damage).toBe(40); // 320/8 = 40, positive = damage
  242 |   });
  243 | 
  244 |   test('Black Sludge damage blocked by Magic Guard for non-Poison', async ({ rsaPage }) => {
  245 |     const eot = await rsaPage.evaluate(() => {
  246 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  247 |         { maxHP: 320, status: '', ability: 'Magic Guard', item: 'Black Sludge', types: ['Normal'] }, 'None'
  248 |       );
  249 |     });
  250 |     const entry = eot.find((e: any) => e.source === 'Black Sludge');
  251 |     expect(entry).toBeUndefined(); // Magic Guard blocks the damage
  252 |   });
  253 | 
  254 |   // ── Grassy Terrain ────────────────────────────────────────────
  255 |   test('Grassy Terrain heals 1/16', async ({ rsaPage }) => {
  256 |     const eot = await rsaPage.evaluate(() => {
  257 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  258 |         { maxHP: 320, status: '', ability: '', item: '', types: ['Normal'] }, 'None', 'Grassy'
  259 |       );
  260 |     });
  261 |     const entry = eot.find((e: any) => e.source === 'Grassy Terrain');
  262 |     expect(entry).toBeTruthy();
  263 |     expect(entry.damage).toBe(-20);
  264 |   });
  265 | 
  266 |   // BUG #2: Grassy Terrain should NOT heal ungrounded Pokémon
  267 |   test.fail('BUG #2: Grassy Terrain should NOT heal Flying types', async ({ rsaPage }) => {
  268 |     const eot = await rsaPage.evaluate(() => {
  269 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  270 |         { maxHP: 320, status: '', ability: '', item: '', types: ['Flying'] }, 'None', 'Grassy'
  271 |       );
  272 |     });
  273 |     // Currently FAILS: Grassy Terrain heals even ungrounded mons
  274 |     expect(eot.find((e: any) => e.source === 'Grassy Terrain')).toBeUndefined();
```