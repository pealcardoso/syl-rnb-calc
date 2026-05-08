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