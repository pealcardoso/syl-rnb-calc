# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: roundsim-eot.spec.ts >> End-of-Turn Damage >> BUG #2: Grassy Terrain should NOT heal Levitate mons
- Location: tests\roundsim-eot.spec.ts:277:8

# Error details

```
Error: expect(received).toBeUndefined()

Received: {"damage": -20, "source": "Grassy Terrain"}
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
        - generic [ref=e57]:
          - generic [ref=e58] [cursor=pointer]: All
          - generic "Gold tier" [ref=e59] [cursor=pointer]: ★
          - generic "Primary tier" [ref=e60] [cursor=pointer]: ●
          - generic "Silver tier" [ref=e61] [cursor=pointer]: ◌
        - generic [ref=e62] [cursor=pointer]:
          - text: 👋
          - generic [ref=e63]: Fake Out
        - generic [ref=e64] [cursor=pointer]:
          - text: 😤
          - generic [ref=e65]: Intimidate
        - generic [ref=e66] [cursor=pointer]:
          - text: ⏱️
          - generic [ref=e67]: Speed Control
          - generic [ref=e68]:
            - generic [ref=e69]: ★
            - generic [ref=e70]: ◌
        - generic [ref=e71] [cursor=pointer]:
          - text: 🛡️
          - generic [ref=e72]: Crit Immunity
        - generic [ref=e73] [cursor=pointer]:
          - text: 🔨
          - generic [ref=e74]: Mold Breaker
        - generic [ref=e75] [cursor=pointer]:
          - text: 🔒
          - generic [ref=e76]: Protect
        - generic [ref=e77] [cursor=pointer]:
          - text: ⚡
          - generic [ref=e78]: Priority Move
        - generic [ref=e79] [cursor=pointer]:
          - text: 💫
          - generic [ref=e80]: Spread Move
        - generic [ref=e81] [cursor=pointer]:
          - text: 🎯
          - generic [ref=e82]: Never Misses
        - generic [ref=e83] [cursor=pointer]:
          - text: 💊
          - generic [ref=e84]: Status Immune
        - generic [ref=e85] [cursor=pointer]:
          - text: 🕊️
          - generic [ref=e86]: Ground Immune
        - generic [ref=e87] [cursor=pointer]:
          - text: 💧
          - generic [ref=e88]: Soaker
        - generic [ref=e89] [cursor=pointer]:
          - text: 📣
          - generic [ref=e90]: Follow Me
        - generic [ref=e91] [cursor=pointer]:
          - text: 🎒
          - generic [ref=e92]: Knock Off
        - generic [ref=e93] [cursor=pointer]:
          - text: 🌧️
          - generic [ref=e94]: Rain Synergy
          - generic [ref=e95]:
            - generic [ref=e96]: ●
            - generic [ref=e97]: ◌
        - generic [ref=e98] [cursor=pointer]:
          - text: 🏜️
          - generic [ref=e99]: Sand Synergy
          - generic [ref=e100]:
            - generic [ref=e101]: ●
            - generic [ref=e102]: ◌
        - generic [ref=e103] [cursor=pointer]:
          - text: ☀️
          - generic [ref=e104]: Sun Synergy
          - generic [ref=e105]:
            - generic [ref=e106]: ●
            - generic [ref=e107]: ◌
        - generic [ref=e108] [cursor=pointer]:
          - text: ❄️
          - generic [ref=e109]: Snow Synergy
          - generic [ref=e110]:
            - generic [ref=e111]: ●
            - generic [ref=e112]: ◌
        - generic [ref=e113] [cursor=pointer]:
          - text: 🧹
          - generic [ref=e114]: Hazard Remover
        - generic [ref=e115] [cursor=pointer]:
          - text: 🪟
          - generic [ref=e116]: Barrier Breaker
        - generic [ref=e117] [cursor=pointer]:
          - text: 💚
          - generic [ref=e118]: Self Healer
          - generic [ref=e119]:
            - generic [ref=e120]: ★
            - generic [ref=e121]: ●
            - generic [ref=e122]: ◌
        - generic [ref=e123] [cursor=pointer]:
          - text: 💣
          - generic [ref=e124]: Exploder
        - generic [ref=e125] [cursor=pointer]:
          - text: 🧱
          - generic [ref=e126]: Sturdy / Sash
        - generic [ref=e127] [cursor=pointer]:
          - text: ⚠️
          - generic [ref=e128]: Hazard Setter
        - generic [ref=e129] [cursor=pointer]:
          - text: 🪞
          - generic [ref=e130]: Screen Setter
        - generic [ref=e131] [cursor=pointer]:
          - text: 🌦️
          - generic [ref=e132]: Weather Setter
        - generic [ref=e133] [cursor=pointer]:
          - text: 🌫️
          - generic [ref=e134]: Accuracy Reducer
          - generic [ref=e135]:
            - generic [ref=e136]: ●
            - generic [ref=e137]: ◌
        - generic [ref=e138] [cursor=pointer]:
          - text: 🐾
          - generic [ref=e139]: Quick Claw
          - generic [ref=e140]:
            - generic [ref=e141]: ●
            - generic [ref=e142]: ◌
        - generic [ref=e143] [cursor=pointer]:
          - text: 🎲
          - generic [ref=e144]: Crit Machine
          - generic [ref=e145]:
            - generic [ref=e146]: ●
            - generic [ref=e147]: ◌
        - generic [ref=e148] [cursor=pointer]:
          - text: 🏎️
          - generic [ref=e149]: Speed Booster
          - generic [ref=e150]:
            - generic [ref=e151]: ●
            - generic [ref=e152]: ◌
        - generic [ref=e153] [cursor=pointer]:
          - text: ↩️
          - generic [ref=e154]: Retaliator
        - generic [ref=e155] [cursor=pointer]:
          - text: ❗
          - generic [ref=e156]: Priority Proc
        - generic [ref=e157] [cursor=pointer]:
          - text: 🕸️
          - generic [ref=e158]: Trapper
        - generic [ref=e159] [cursor=pointer]:
          - text: ☠️
          - generic [ref=e160]: Status Inducer
          - generic [ref=e161]:
            - generic [ref=e162]: ●
            - generic [ref=e163]: ◌
        - generic [ref=e164] [cursor=pointer]:
          - text: 📉
          - generic [ref=e165]: Debuffer
          - generic [ref=e166]:
            - generic [ref=e167]: ★
            - generic [ref=e168]: ◌
        - generic [ref=e169] [cursor=pointer]:
          - text: 📈
          - generic [ref=e170]: Self Booster
        - generic [ref=e171] [cursor=pointer]:
          - text: 🔄
          - generic [ref=e172]: Trick Room
        - generic [ref=e173] [cursor=pointer]:
          - text: 🏃
          - generic [ref=e174]: Pursuit
        - generic [ref=e175] [cursor=pointer]:
          - text: 🪢
          - generic [ref=e176]: Destiny Bond
        - button "✕" [ref=e177] [cursor=pointer]
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
            - generic [ref=e209] [cursor=pointer]: 39-46 (27-32%)
            - checkbox "Crit" [ref=e210]
            - generic "Force this attack to be a critical hit?" [ref=e211] [cursor=pointer]: Crit
          - generic [ref=e212]:
            - radio "Ice Special Ice Beam" [ref=e213]
            - generic [ref=e214] [cursor=pointer]:
              - generic [ref=e215]:
                - img "Ice" [ref=e216]
                - img "Special" [ref=e217]
              - generic [ref=e218]: Ice Beam
            - generic [ref=e219] [cursor=pointer]: 48-57 (34-40%)
            - checkbox "Crit" [ref=e220]
            - generic "Force this attack to be a critical hit?" [ref=e221] [cursor=pointer]: Crit
          - generic [ref=e222]:
            - radio "Ice Physical Ice Shard" [ref=e223]
            - generic [ref=e224] [cursor=pointer]:
              - generic [ref=e225]:
                - img "Ice" [ref=e226]
                - img "Physical" [ref=e227]
              - generic [ref=e228]: Ice Shard
            - generic [ref=e229] [cursor=pointer]: 27-33 (19-23%)
            - checkbox "Crit" [ref=e230]
            - generic "Force this attack to be a critical hit?" [ref=e231] [cursor=pointer]: Crit
          - generic [ref=e232]:
            - radio "Ground Physical Earthquake" [ref=e233]
            - generic [ref=e234] [cursor=pointer]:
              - generic [ref=e235]:
                - img "Ground" [ref=e236]
                - img "Physical" [ref=e237]
              - generic [ref=e238]: Earthquake
            - generic [ref=e239] [cursor=pointer]: 22-26 (15-18%)
            - checkbox "Crit" [ref=e240]
            - generic "Force this attack to be a critical hit?" [ref=e241] [cursor=pointer]: Crit
        - radiogroup "Abomasnow's Moves (select one to show detailed results)" [ref=e242]:
          - generic [ref=e243]: Abomasnow's Moves (select one to show detailed results)
          - generic [ref=e244]:
            - checkbox "Crit" [ref=e245]
            - generic "Force this attack to be a critical hit?" [ref=e246] [cursor=pointer]: Crit
            - radio "Grass Physical Wood Hammer" [ref=e247]
            - generic [ref=e248] [cursor=pointer]:
              - generic [ref=e249]:
                - img "Grass" [ref=e250]
                - img "Physical" [ref=e251]
              - generic [ref=e252]: Wood Hammer
            - generic [ref=e253] [cursor=pointer]: 39-46 (27-32%)
            - generic [ref=e254]: 0.00%
          - generic [ref=e255]:
            - checkbox "Crit" [ref=e256]
            - generic "Force this attack to be a critical hit?" [ref=e257] [cursor=pointer]: Crit
            - radio "Ice Special Ice Beam" [checked] [ref=e258]
            - generic [ref=e259]:
              - generic [ref=e260]:
                - img "Ice" [ref=e261]
                - img "Special" [ref=e262]
              - generic [ref=e263]: Ice Beam
            - generic [ref=e264] [cursor=pointer]: 48-57 (34-40%)
            - generic [ref=e265]: 100.00%
          - generic [ref=e266]:
            - checkbox "Crit" [ref=e267]
            - generic "Force this attack to be a critical hit?" [ref=e268] [cursor=pointer]: Crit
            - radio "Ice Physical Ice Shard" [ref=e269]
            - generic [ref=e270] [cursor=pointer]:
              - generic [ref=e271]:
                - img "Ice" [ref=e272]
                - img "Physical" [ref=e273]
              - generic [ref=e274]: Ice Shard
            - generic [ref=e275] [cursor=pointer]: 27-33 (19-23%)
            - generic [ref=e276]: 0.00%
          - generic [ref=e277]:
            - checkbox "Crit" [ref=e278]
            - generic "Force this attack to be a critical hit?" [ref=e279] [cursor=pointer]: Crit
            - radio "Ground Physical Earthquake" [ref=e280]
            - generic [ref=e281] [cursor=pointer]:
              - generic [ref=e282]:
                - img "Ground" [ref=e283]
                - img "Physical" [ref=e284]
              - generic [ref=e285]: Earthquake
            - generic [ref=e286] [cursor=pointer]: 22-26 (15-18%)
            - generic [ref=e287]: 0.00%
      - generic [ref=e288]:
        - generic [ref=e289]: Select a move
        - generic [ref=e290]: Select a move
      - generic [ref=e291]:
        - generic [ref=e292]:
          - checkbox "P2 Crits" [ref=e293]
          - generic [ref=e294]: P2 Crits
        - generic [ref=e295]:
          - checkbox "Apply P1 Effect" [ref=e296]
          - generic [ref=e297]: Apply P1 Effect
        - generic [ref=e298]:
          - checkbox "Apply P2 Effect" [checked] [ref=e299]
          - generic [ref=e300]: Apply P2 Effect
      - generic [ref=e302]:
        - generic [ref=e303]: Comment
        - textbox "Comment" [ref=e304]:
          - /placeholder: Note...
      - generic [ref=e305]:
        - generic [ref=e306]:
          - generic [ref=e307]: ☀ Weather
          - combobox "☀ Weather" [ref=e308] [cursor=pointer]:
            - option "None" [selected]
            - option "Sun"
            - option "Rain"
            - option "Sand"
            - option "Snow"
            - option "Hail"
            - option "Harsh Sunshine"
            - option "Heavy Rain"
            - option "Strong Winds"
          - generic "Weather does not expire after 5 turns" [ref=e309] [cursor=pointer]:
            - checkbox "Permanent" [ref=e310]
            - text: Permanent
        - generic [ref=e311]:
          - generic [ref=e312]: 🌿 Terrain
          - combobox "🌿 Terrain" [ref=e313] [cursor=pointer]:
            - option "None" [selected]
            - option "Electric"
            - option "Grassy"
            - option "Misty"
            - option "Psychic"
        - 'generic "Trick Room: slower Pokémon move first" [ref=e315] [cursor=pointer]':
          - checkbox "🔮 Trick Room" [ref=e316]
          - generic [ref=e317]: 🔮 Trick Room
      - generic [ref=e318]:
        - button "▶ Log Round" [ref=e319] [cursor=pointer]
        - generic [ref=e320]:
          - combobox "Switch P1 active" [ref=e321]:
            - option "— Switch P1 —" [selected]
          - button "⇄ Switch In" [ref=e322] [cursor=pointer]
        - button "📋 Copy Log" [ref=e323] [cursor=pointer]
        - button "Clear Line" [ref=e324] [cursor=pointer]
    - generic [ref=e325]:
      - generic [ref=e326]:
        - generic [ref=e327]: Round Log
        - generic [ref=e328]: "0"
        - button "⊖ Collapse All" [ref=e329] [cursor=pointer]
        - button "🔍 Analyze Fight" [ref=e330] [cursor=pointer]
        - button "📤 Export Line" [ref=e331] [cursor=pointer]
        - button "📥 Import Line" [ref=e332] [cursor=pointer]
        - button "🗑 Delete All" [ref=e333] [cursor=pointer]
      - generic [ref=e335]: No rounds yet. Set your teams, load the calc, and log rounds.
      - generic [ref=e337] [cursor=pointer]:
        - generic [ref=e338]: 📋 Field State
        - generic [ref=e339]: ▾
  - button "Click for Light Theme" [ref=e341]
```

# Test source

```ts
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
  275 |   });
  276 | 
  277 |   test.fail('BUG #2: Grassy Terrain should NOT heal Levitate mons', async ({ rsaPage }) => {
  278 |     const eot = await rsaPage.evaluate(() => {
  279 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  280 |         { maxHP: 320, status: '', ability: 'Levitate', item: '', types: ['Normal'] }, 'None', 'Grassy'
  281 |       );
  282 |     });
> 283 |     expect(eot.find((e: any) => e.source === 'Grassy Terrain')).toBeUndefined();
      |                                                                 ^ Error: expect(received).toBeUndefined()
  284 |   });
  285 | 
  286 |   // ── No status, no weather, no items ───────────────────────────
  287 |   test('Healthy mon with no items in no weather: empty EOT', async ({ rsaPage }) => {
  288 |     const eot = await rsaPage.evaluate(() => {
  289 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  290 |         { maxHP: 320, status: '', ability: '', item: '', types: ['Normal'] }, 'None'
  291 |       );
  292 |     });
  293 |     expect(eot).toHaveLength(0);
  294 |   });
  295 | 
  296 |   // ── Combined: Burn + Leftovers + Sandstorm ────────────────────
  297 |   test('combined: Burn + Leftovers + Sandstorm', async ({ rsaPage }) => {
  298 |     const eot = await rsaPage.evaluate(() => {
  299 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  300 |         { maxHP: 320, status: 'Burn', ability: '', item: 'Leftovers', types: ['Normal'] }, 'Sand'
  301 |       );
  302 |     });
  303 |     expect(eot).toHaveLength(3);
  304 |     const burn = eot.find((e: any) => e.source === 'Burn');
  305 |     const left = eot.find((e: any) => e.source === 'Leftovers');
  306 |     const sand = eot.find((e: any) => e.source === 'Sandstorm');
  307 |     expect(burn!.damage).toBe(20);   // 320/16
  308 |     expect(left!.damage).toBe(-20);  // -320/16
  309 |     expect(sand!.damage).toBe(20);   // 320/16
  310 |     // Net: 20 - 20 + 20 = 20 damage
  311 |   });
  312 | });
  313 | 
```