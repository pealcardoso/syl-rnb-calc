# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: roundsim-eot.spec.ts >> End-of-Turn Damage >> BUG #2: Grassy Terrain should NOT heal Flying types
- Location: tests\roundsim-eot.spec.ts:267:8

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
          - button "🚫 Items" [ref=e46] [cursor=pointer]
      - generic [ref=e47]:
        - generic [ref=e48]: "Sort:"
        - button "Default" [ref=e49] [cursor=pointer]
        - button "⚔ Offense" [ref=e50] [cursor=pointer]
        - button "🛡 Move Def" [ref=e51] [cursor=pointer]
        - button "🛡 All Def" [ref=e52] [cursor=pointer]
        - button "⚙ Settings" [ref=e53] [cursor=pointer]
    - generic [ref=e54]:
      - generic [ref=e56]:
        - generic [ref=e57]: Your Team (drag from box)
        - generic [ref=e58]: "0"
      - generic [ref=e59]:
        - generic [ref=e60]:
          - generic [ref=e61]: Opponent Team
          - generic [ref=e62]: "0"
          - generic [ref=e63]:
            - button "◀" [ref=e64] [cursor=pointer]
            - button "▶" [ref=e65] [cursor=pointer]
            - button "🚚" [ref=e66] [cursor=pointer]
        - textbox "Search trainer…" [ref=e68]
    - generic [ref=e69]:
      - generic [ref=e70]: Log Round
      - region "Move selection" [ref=e72]:
        - radiogroup "Abomasnow's Moves (select one to show detailed results)" [ref=e73]:
          - generic [ref=e74]: Abomasnow's Moves (select one to show detailed results)
          - generic [ref=e75]:
            - radio "Grass Physical Wood Hammer" [ref=e76]
            - generic [ref=e77] [cursor=pointer]:
              - generic [ref=e78]:
                - img "Grass" [ref=e79]
                - img "Physical" [ref=e80]
              - generic [ref=e81]: Wood Hammer
            - generic [ref=e204] [cursor=pointer]: 39-46 (27-32%)
            - checkbox "Crit" [ref=e82]
            - generic "Force this attack to be a critical hit?" [ref=e83] [cursor=pointer]: Crit
          - generic [ref=e84]:
            - radio "Ice Special Ice Beam" [ref=e85]
            - generic [ref=e86] [cursor=pointer]:
              - generic [ref=e87]:
                - img "Ice" [ref=e88]
                - img "Special" [ref=e89]
              - generic [ref=e90]: Ice Beam
            - generic [ref=e205] [cursor=pointer]: 48-57 (34-40%)
            - checkbox "Crit" [ref=e91]
            - generic "Force this attack to be a critical hit?" [ref=e92] [cursor=pointer]: Crit
          - generic [ref=e93]:
            - radio "Ice Physical Ice Shard" [ref=e94]
            - generic [ref=e95] [cursor=pointer]:
              - generic [ref=e96]:
                - img "Ice" [ref=e97]
                - img "Physical" [ref=e98]
              - generic [ref=e99]: Ice Shard
            - generic [ref=e206] [cursor=pointer]: 27-33 (19-23%)
            - checkbox "Crit" [ref=e100]
            - generic "Force this attack to be a critical hit?" [ref=e101] [cursor=pointer]: Crit
          - generic [ref=e102]:
            - radio "Ground Physical Earthquake" [ref=e103]
            - generic [ref=e104] [cursor=pointer]:
              - generic [ref=e105]:
                - img "Ground" [ref=e106]
                - img "Physical" [ref=e107]
              - generic [ref=e108]: Earthquake
            - generic [ref=e207] [cursor=pointer]: 22-26 (15-18%)
            - checkbox "Crit" [ref=e109]
            - generic "Force this attack to be a critical hit?" [ref=e110] [cursor=pointer]: Crit
        - radiogroup "Abomasnow's Moves (select one to show detailed results)" [ref=e111]:
          - generic [ref=e112]: Abomasnow's Moves (select one to show detailed results)
          - generic [ref=e113]:
            - checkbox "Crit" [ref=e114]
            - generic "Force this attack to be a critical hit?" [ref=e115] [cursor=pointer]: Crit
            - radio "Grass Physical Wood Hammer" [ref=e116]
            - generic [ref=e117] [cursor=pointer]:
              - generic [ref=e118]:
                - img "Grass" [ref=e119]
                - img "Physical" [ref=e120]
              - generic [ref=e121]: Wood Hammer
            - generic [ref=e208] [cursor=pointer]: 39-46 (27-32%)
            - generic [ref=e122]: 0.00%
          - generic [ref=e123]:
            - checkbox "Crit" [ref=e124]
            - generic "Force this attack to be a critical hit?" [ref=e125] [cursor=pointer]: Crit
            - radio "Ice Special Ice Beam" [checked] [ref=e126]
            - generic [ref=e127]:
              - generic [ref=e128]:
                - img "Ice" [ref=e129]
                - img "Special" [ref=e130]
              - generic [ref=e131]: Ice Beam
            - generic [ref=e209] [cursor=pointer]: 48-57 (34-40%)
            - generic [ref=e132]: 100.00%
          - generic [ref=e133]:
            - checkbox "Crit" [ref=e134]
            - generic "Force this attack to be a critical hit?" [ref=e135] [cursor=pointer]: Crit
            - radio "Ice Physical Ice Shard" [ref=e136]
            - generic [ref=e137] [cursor=pointer]:
              - generic [ref=e138]:
                - img "Ice" [ref=e139]
                - img "Physical" [ref=e140]
              - generic [ref=e141]: Ice Shard
            - generic [ref=e210] [cursor=pointer]: 27-33 (19-23%)
            - generic [ref=e142]: 0.00%
          - generic [ref=e143]:
            - checkbox "Crit" [ref=e144]
            - generic "Force this attack to be a critical hit?" [ref=e145] [cursor=pointer]: Crit
            - radio "Ground Physical Earthquake" [ref=e146]
            - generic [ref=e147] [cursor=pointer]:
              - generic [ref=e148]:
                - img "Ground" [ref=e149]
                - img "Physical" [ref=e150]
              - generic [ref=e151]: Earthquake
            - generic [ref=e211] [cursor=pointer]: 22-26 (15-18%)
            - generic [ref=e152]: 0.00%
      - generic [ref=e153]:
        - generic [ref=e154]: Select a move
        - generic [ref=e155]: Select a move
      - generic [ref=e156]:
        - generic [ref=e157]:
          - checkbox "P2 Crits" [ref=e158]
          - generic [ref=e159]: P2 Crits
        - generic [ref=e160]:
          - checkbox "Apply P1 Effect" [ref=e161]
          - generic [ref=e162]: Apply P1 Effect
        - generic [ref=e163]:
          - checkbox "Apply P2 Effect" [checked] [ref=e164]
          - generic [ref=e165]: Apply P2 Effect
      - generic [ref=e167]:
        - generic [ref=e168]: Comment
        - textbox "Comment" [ref=e169]:
          - /placeholder: Note...
      - generic [ref=e170]:
        - generic [ref=e171]:
          - generic [ref=e172]: ☀ Weather
          - combobox "☀ Weather" [ref=e173] [cursor=pointer]:
            - option "None" [selected]
            - option "Sun"
            - option "Rain"
            - option "Sand"
            - option "Snow"
            - option "Hail"
            - option "Harsh Sunshine"
            - option "Heavy Rain"
            - option "Strong Winds"
          - generic "Weather does not expire after 5 turns" [ref=e174] [cursor=pointer]:
            - checkbox "Permanent" [ref=e175]
            - text: Permanent
        - generic [ref=e176]:
          - generic [ref=e177]: 🌿 Terrain
          - combobox "🌿 Terrain" [ref=e178] [cursor=pointer]:
            - option "None" [selected]
            - option "Electric"
            - option "Grassy"
            - option "Misty"
            - option "Psychic"
        - 'generic "Trick Room: slower Pokémon move first" [ref=e180] [cursor=pointer]':
          - checkbox "🔮 Trick Room" [ref=e181]
          - generic [ref=e182]: 🔮 Trick Room
      - generic [ref=e183]:
        - button "▶ Log Round" [ref=e184] [cursor=pointer]
        - generic [ref=e185]:
          - combobox "Switch P1 active" [ref=e186]:
            - option "— Switch P1 —" [selected]
          - button "⇄ Switch In" [ref=e187] [cursor=pointer]
        - button "📋 Copy Log" [ref=e188] [cursor=pointer]
        - button "Clear Line" [ref=e189] [cursor=pointer]
    - generic [ref=e190]:
      - generic [ref=e191]:
        - generic [ref=e192]: Round Log
        - generic [ref=e193]: "0"
        - button "⊖ Collapse All" [ref=e194] [cursor=pointer]
        - button "🗑 Delete All" [ref=e195] [cursor=pointer]
      - generic [ref=e197]: No rounds yet. Set your teams, load the calc, and log rounds.
      - generic [ref=e199] [cursor=pointer]:
        - generic [ref=e200]: 📋 Field State
        - generic [ref=e201]: ▾
  - button "Click for Light Theme" [ref=e203]
```

# Test source

```ts
  174 |     expect(eot.find((e: any) => e.source === 'Sandstorm')).toBeTruthy();
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
> 274 |     expect(eot.find((e: any) => e.source === 'Grassy Terrain')).toBeUndefined();
      |                                                                 ^ Error: expect(received).toBeUndefined()
  275 |   });
  276 | 
  277 |   test.fail('BUG #2: Grassy Terrain should NOT heal Levitate mons', async ({ rsaPage }) => {
  278 |     const eot = await rsaPage.evaluate(() => {
  279 |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  280 |         { maxHP: 320, status: '', ability: 'Levitate', item: '', types: ['Normal'] }, 'None', 'Grassy'
  281 |       );
  282 |     });
  283 |     expect(eot.find((e: any) => e.source === 'Grassy Terrain')).toBeUndefined();
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