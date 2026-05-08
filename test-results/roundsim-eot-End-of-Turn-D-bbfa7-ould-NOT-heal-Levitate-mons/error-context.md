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
      - generic [ref=e242]:
        - generic [ref=e243] [cursor=pointer]: 👋
        - generic [ref=e244] [cursor=pointer]: 😤
        - generic [ref=e245] [cursor=pointer]: ⏱️
        - generic [ref=e246] [cursor=pointer]: 🛡️
        - generic [ref=e247] [cursor=pointer]: 🔨
        - generic [ref=e248] [cursor=pointer]: 🔒
        - generic [ref=e249] [cursor=pointer]: ⚡
        - generic [ref=e250] [cursor=pointer]: 💫
        - generic [ref=e251] [cursor=pointer]: 🎯
        - generic [ref=e252] [cursor=pointer]: 💊
        - generic [ref=e253] [cursor=pointer]: 🕊️
        - generic [ref=e254] [cursor=pointer]: 💧
        - generic [ref=e255] [cursor=pointer]: 📣
        - generic [ref=e256] [cursor=pointer]: 🎒
        - generic [ref=e257] [cursor=pointer]: 🌧️
        - generic [ref=e258] [cursor=pointer]: 🏜️
        - generic [ref=e259] [cursor=pointer]: ☀️
        - generic [ref=e260] [cursor=pointer]: ❄️
        - generic [ref=e261] [cursor=pointer]: 💣
        - generic [ref=e262] [cursor=pointer]: 🧱
        - generic [ref=e263] [cursor=pointer]: ⚠️
        - generic [ref=e264] [cursor=pointer]: 🪞
        - generic [ref=e265] [cursor=pointer]: 🌦️
        - generic [ref=e266] [cursor=pointer]: 🌫️
        - generic [ref=e267] [cursor=pointer]: 🐾
        - generic [ref=e268] [cursor=pointer]: 🎲
        - generic [ref=e269] [cursor=pointer]: 🏎️
        - generic [ref=e270] [cursor=pointer]: ↩️
        - generic [ref=e271] [cursor=pointer]: ❗
        - generic [ref=e272] [cursor=pointer]: 🕸️
        - generic [ref=e273] [cursor=pointer]: ☠️
        - generic [ref=e274] [cursor=pointer]: 📉
        - generic [ref=e275] [cursor=pointer]: 📈
        - generic [ref=e276] [cursor=pointer]: 🔄
        - button "✕" [ref=e277] [cursor=pointer]
    - generic [ref=e92]:
      - generic [ref=e94]:
        - generic [ref=e95]: Your Team (drag from box)
        - generic [ref=e96]: "0"
      - generic [ref=e97]:
        - generic [ref=e98]:
          - generic [ref=e99]: Opponent Team
          - generic [ref=e100]: "0"
          - generic [ref=e101]:
            - button "◀" [ref=e102] [cursor=pointer]
            - button "▶" [ref=e103] [cursor=pointer]
            - button "🚚" [ref=e104] [cursor=pointer]
        - textbox "Search trainer…" [ref=e106]
    - generic [ref=e107]:
      - generic [ref=e108]: Log Round
      - region "Move selection" [ref=e110]:
        - radiogroup "Abomasnow's Moves (select one to show detailed results)" [ref=e111]:
          - generic [ref=e112]: Abomasnow's Moves (select one to show detailed results)
          - generic [ref=e113]:
            - radio "Grass Physical Wood Hammer" [ref=e114]
            - generic [ref=e115] [cursor=pointer]:
              - generic [ref=e116]:
                - img "Grass" [ref=e117]
                - img "Physical" [ref=e118]
              - generic [ref=e119]: Wood Hammer
            - generic [ref=e278] [cursor=pointer]: 39-46 (27-32%)
            - checkbox "Crit" [ref=e120]
            - generic "Force this attack to be a critical hit?" [ref=e121] [cursor=pointer]: Crit
          - generic [ref=e122]:
            - radio "Ice Special Ice Beam" [ref=e123]
            - generic [ref=e124] [cursor=pointer]:
              - generic [ref=e125]:
                - img "Ice" [ref=e126]
                - img "Special" [ref=e127]
              - generic [ref=e128]: Ice Beam
            - generic [ref=e279] [cursor=pointer]: 48-57 (34-40%)
            - checkbox "Crit" [ref=e129]
            - generic "Force this attack to be a critical hit?" [ref=e130] [cursor=pointer]: Crit
          - generic [ref=e131]:
            - radio "Ice Physical Ice Shard" [ref=e132]
            - generic [ref=e133] [cursor=pointer]:
              - generic [ref=e134]:
                - img "Ice" [ref=e135]
                - img "Physical" [ref=e136]
              - generic [ref=e137]: Ice Shard
            - generic [ref=e280] [cursor=pointer]: 27-33 (19-23%)
            - checkbox "Crit" [ref=e138]
            - generic "Force this attack to be a critical hit?" [ref=e139] [cursor=pointer]: Crit
          - generic [ref=e140]:
            - radio "Ground Physical Earthquake" [ref=e141]
            - generic [ref=e142] [cursor=pointer]:
              - generic [ref=e143]:
                - img "Ground" [ref=e144]
                - img "Physical" [ref=e145]
              - generic [ref=e146]: Earthquake
            - generic [ref=e281] [cursor=pointer]: 22-26 (15-18%)
            - checkbox "Crit" [ref=e147]
            - generic "Force this attack to be a critical hit?" [ref=e148] [cursor=pointer]: Crit
        - radiogroup "Abomasnow's Moves (select one to show detailed results)" [ref=e149]:
          - generic [ref=e150]: Abomasnow's Moves (select one to show detailed results)
          - generic [ref=e151]:
            - checkbox "Crit" [ref=e152]
            - generic "Force this attack to be a critical hit?" [ref=e153] [cursor=pointer]: Crit
            - radio "Grass Physical Wood Hammer" [ref=e154]
            - generic [ref=e155] [cursor=pointer]:
              - generic [ref=e156]:
                - img "Grass" [ref=e157]
                - img "Physical" [ref=e158]
              - generic [ref=e159]: Wood Hammer
            - generic [ref=e282] [cursor=pointer]: 39-46 (27-32%)
            - generic [ref=e160]: 0.00%
          - generic [ref=e161]:
            - checkbox "Crit" [ref=e162]
            - generic "Force this attack to be a critical hit?" [ref=e163] [cursor=pointer]: Crit
            - radio "Ice Special Ice Beam" [checked] [ref=e164]
            - generic [ref=e165]:
              - generic [ref=e166]:
                - img "Ice" [ref=e167]
                - img "Special" [ref=e168]
              - generic [ref=e169]: Ice Beam
            - generic [ref=e283] [cursor=pointer]: 48-57 (34-40%)
            - generic [ref=e170]: 100.00%
          - generic [ref=e171]:
            - checkbox "Crit" [ref=e172]
            - generic "Force this attack to be a critical hit?" [ref=e173] [cursor=pointer]: Crit
            - radio "Ice Physical Ice Shard" [ref=e174]
            - generic [ref=e175] [cursor=pointer]:
              - generic [ref=e176]:
                - img "Ice" [ref=e177]
                - img "Physical" [ref=e178]
              - generic [ref=e179]: Ice Shard
            - generic [ref=e284] [cursor=pointer]: 27-33 (19-23%)
            - generic [ref=e180]: 0.00%
          - generic [ref=e181]:
            - checkbox "Crit" [ref=e182]
            - generic "Force this attack to be a critical hit?" [ref=e183] [cursor=pointer]: Crit
            - radio "Ground Physical Earthquake" [ref=e184]
            - generic [ref=e185] [cursor=pointer]:
              - generic [ref=e186]:
                - img "Ground" [ref=e187]
                - img "Physical" [ref=e188]
              - generic [ref=e189]: Earthquake
            - generic [ref=e285] [cursor=pointer]: 22-26 (15-18%)
            - generic [ref=e190]: 0.00%
      - generic [ref=e191]:
        - generic [ref=e192]: Select a move
        - generic [ref=e193]: Select a move
      - generic [ref=e194]:
        - generic [ref=e195]:
          - checkbox "P2 Crits" [ref=e196]
          - generic [ref=e197]: P2 Crits
        - generic [ref=e198]:
          - checkbox "Apply P1 Effect" [ref=e199]
          - generic [ref=e200]: Apply P1 Effect
        - generic [ref=e201]:
          - checkbox "Apply P2 Effect" [checked] [ref=e202]
          - generic [ref=e203]: Apply P2 Effect
      - generic [ref=e205]:
        - generic [ref=e206]: Comment
        - textbox "Comment" [ref=e207]:
          - /placeholder: Note...
      - generic [ref=e208]:
        - generic [ref=e209]:
          - generic [ref=e210]: ☀ Weather
          - combobox "☀ Weather" [ref=e211] [cursor=pointer]:
            - option "None" [selected]
            - option "Sun"
            - option "Rain"
            - option "Sand"
            - option "Snow"
            - option "Hail"
            - option "Harsh Sunshine"
            - option "Heavy Rain"
            - option "Strong Winds"
          - generic "Weather does not expire after 5 turns" [ref=e212] [cursor=pointer]:
            - checkbox "Permanent" [ref=e213]
            - text: Permanent
        - generic [ref=e214]:
          - generic [ref=e215]: 🌿 Terrain
          - combobox "🌿 Terrain" [ref=e216] [cursor=pointer]:
            - option "None" [selected]
            - option "Electric"
            - option "Grassy"
            - option "Misty"
            - option "Psychic"
        - 'generic "Trick Room: slower Pokémon move first" [ref=e218] [cursor=pointer]':
          - checkbox "🔮 Trick Room" [ref=e219]
          - generic [ref=e220]: 🔮 Trick Room
      - generic [ref=e221]:
        - button "▶ Log Round" [ref=e222] [cursor=pointer]
        - generic [ref=e223]:
          - combobox "Switch P1 active" [ref=e224]:
            - option "— Switch P1 —" [selected]
          - button "⇄ Switch In" [ref=e225] [cursor=pointer]
        - button "📋 Copy Log" [ref=e226] [cursor=pointer]
        - button "Clear Line" [ref=e227] [cursor=pointer]
    - generic [ref=e228]:
      - generic [ref=e229]:
        - generic [ref=e230]: Round Log
        - generic [ref=e231]: "0"
        - button "⊖ Collapse All" [ref=e232] [cursor=pointer]
        - button "🗑 Delete All" [ref=e233] [cursor=pointer]
      - generic [ref=e235]: No rounds yet. Set your teams, load the calc, and log rounds.
      - generic [ref=e237] [cursor=pointer]:
        - generic [ref=e238]: 📋 Field State
        - generic [ref=e239]: ▾
  - button "Click for Light Theme" [ref=e241]
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