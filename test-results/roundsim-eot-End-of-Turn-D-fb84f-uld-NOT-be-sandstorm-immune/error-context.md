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
      - generic [ref=e56]:
        - generic [ref=e57] [cursor=pointer]: "👋 Filter: Fake Out — Forces flinch on first turn"
        - generic [ref=e58] [cursor=pointer]: "😤 Filter: Intimidate — Drops opponent Attack on switch-in"
        - generic [ref=e59] [cursor=pointer]: "⏱️ Filter: Speed Control — Controls turn order — Gold: Cotton Down ability | Silver: speed-lowering or order-setting moves"
        - generic [ref=e60] [cursor=pointer]: "🛡️ Filter: Crit Immunity — Battle Armor or Shell Armor — immune to critical hits"
        - generic [ref=e61] [cursor=pointer]: "🔨 Filter: Mold Breaker — Ignores abilities (Mold Breaker / Turboblaze / Teravolt / Mycelium Might / Neutralizing Gas)"
        - generic [ref=e62] [cursor=pointer]: "🔒 Filter: Protect — Has a Protect-variant move (Protect, Detect, Wide Guard, Quick Guard, etc.)"
        - generic [ref=e63] [cursor=pointer]: "⚡ Filter: Priority Move — Has a move with increased priority (Extremespeed, Bullet Punch, etc.)"
        - generic [ref=e64] [cursor=pointer]: "💫 Filter: Spread Move — Has a move that hits multiple targets (Earthquake, Surf, Dazzling Gleam, etc.)"
        - generic [ref=e65] [cursor=pointer]: "🎯 Filter: Never Misses — Has a damaging move that always hits (Swift, Aerial Ace, Magical Leaf, etc.)"
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
        - generic [ref=e80] [cursor=pointer]: "🌫️ Filter: Accuracy Reducer — Can lower opponent accuracy: Bright Powder/Lax Incense item, Sand Veil/Snow Cloak ability, or Flash/Smokescreen/etc."
        - generic [ref=e81] [cursor=pointer]: "🐾 Filter: Quick Claw — Holds Quick Claw — may randomly move first regardless of speed"
        - generic [ref=e82] [cursor=pointer]: "🎲 Filter: Crit Machine — Elevated crit rate: Sniper ability, Scope Lens/Razor Claw, or Focus Energy/Frost Breath/Storm Throw"
        - generic [ref=e83] [cursor=pointer]: "🏎️ Filter: Speed Booster — Can sharply raise own Speed: Speed Boost ability, or Agility/Dragon Dance/Rock Polish/etc."
        - generic [ref=e84] [cursor=pointer]: "↩️ Filter: Retaliator — Move powered by ally's death: Retaliate (x2 if ally fainted), Last Respects (+50 BP per fainted)"
        - generic [ref=e85] [cursor=pointer]: "❗ Filter: Priority Proc — Quick Draw ability or Quick Claw item — may randomly act first"
        - generic [ref=e86] [cursor=pointer]: "🕸️ Filter: Trapper — Arena Trap / Shadow Tag / Magnet Pull — prevents opponent from switching out"
        - generic [ref=e87] [cursor=pointer]: "☠️ Filter: Status Inducer — Gold: dedicated status move (Spore, T-Wave, etc.) | Silver: secondary status chance (Scald, etc.)"
        - generic [ref=e88] [cursor=pointer]: "📉 Filter: Debuffer — Gold: dedicated stat-drop move (Charm, Screech, etc.) | Silver: secondary stat-drop chance"
        - generic [ref=e89] [cursor=pointer]: "📈 Filter: Self Booster — Has moves that sharply raise own stats (Swords Dance, Nasty Plot, Dragon Dance, Shell Smash, etc.)"
        - generic [ref=e90] [cursor=pointer]: "🔄 Filter: Trick Room — Has Trick Room — reverses speed order for 5 turns"
        - button "✕" [ref=e91] [cursor=pointer]
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
            - generic [ref=e120] [cursor=pointer]: 39-46 (27-32%)
            - checkbox "Crit" [ref=e121]
            - generic "Force this attack to be a critical hit?" [ref=e122] [cursor=pointer]: Crit
          - generic [ref=e123]:
            - radio "Ice Special Ice Beam" [ref=e124]
            - generic [ref=e125] [cursor=pointer]:
              - generic [ref=e126]:
                - img "Ice" [ref=e127]
                - img "Special" [ref=e128]
              - generic [ref=e129]: Ice Beam
            - generic [ref=e130] [cursor=pointer]: 48-57 (34-40%)
            - checkbox "Crit" [ref=e131]
            - generic "Force this attack to be a critical hit?" [ref=e132] [cursor=pointer]: Crit
          - generic [ref=e133]:
            - radio "Ice Physical Ice Shard" [ref=e134]
            - generic [ref=e135] [cursor=pointer]:
              - generic [ref=e136]:
                - img "Ice" [ref=e137]
                - img "Physical" [ref=e138]
              - generic [ref=e139]: Ice Shard
            - generic [ref=e140] [cursor=pointer]: 27-33 (19-23%)
            - checkbox "Crit" [ref=e141]
            - generic "Force this attack to be a critical hit?" [ref=e142] [cursor=pointer]: Crit
          - generic [ref=e143]:
            - radio "Ground Physical Earthquake" [ref=e144]
            - generic [ref=e145] [cursor=pointer]:
              - generic [ref=e146]:
                - img "Ground" [ref=e147]
                - img "Physical" [ref=e148]
              - generic [ref=e149]: Earthquake
            - generic [ref=e150] [cursor=pointer]: 22-26 (15-18%)
            - checkbox "Crit" [ref=e151]
            - generic "Force this attack to be a critical hit?" [ref=e152] [cursor=pointer]: Crit
        - radiogroup "Abomasnow's Moves (select one to show detailed results)" [ref=e153]:
          - generic [ref=e154]: Abomasnow's Moves (select one to show detailed results)
          - generic [ref=e155]:
            - checkbox "Crit" [ref=e156]
            - generic "Force this attack to be a critical hit?" [ref=e157] [cursor=pointer]: Crit
            - radio "Grass Physical Wood Hammer" [ref=e158]
            - generic [ref=e159] [cursor=pointer]:
              - generic [ref=e160]:
                - img "Grass" [ref=e161]
                - img "Physical" [ref=e162]
              - generic [ref=e163]: Wood Hammer
            - generic [ref=e164] [cursor=pointer]: 39-46 (27-32%)
            - generic [ref=e165]: 0.00%
          - generic [ref=e166]:
            - checkbox "Crit" [ref=e167]
            - generic "Force this attack to be a critical hit?" [ref=e168] [cursor=pointer]: Crit
            - radio "Ice Special Ice Beam" [checked] [ref=e169]
            - generic [ref=e170]:
              - generic [ref=e171]:
                - img "Ice" [ref=e172]
                - img "Special" [ref=e173]
              - generic [ref=e174]: Ice Beam
            - generic [ref=e175] [cursor=pointer]: 48-57 (34-40%)
            - generic [ref=e176]: 100.00%
          - generic [ref=e177]:
            - checkbox "Crit" [ref=e178]
            - generic "Force this attack to be a critical hit?" [ref=e179] [cursor=pointer]: Crit
            - radio "Ice Physical Ice Shard" [ref=e180]
            - generic [ref=e181] [cursor=pointer]:
              - generic [ref=e182]:
                - img "Ice" [ref=e183]
                - img "Physical" [ref=e184]
              - generic [ref=e185]: Ice Shard
            - generic [ref=e186] [cursor=pointer]: 27-33 (19-23%)
            - generic [ref=e187]: 0.00%
          - generic [ref=e188]:
            - checkbox "Crit" [ref=e189]
            - generic "Force this attack to be a critical hit?" [ref=e190] [cursor=pointer]: Crit
            - radio "Ground Physical Earthquake" [ref=e191]
            - generic [ref=e192] [cursor=pointer]:
              - generic [ref=e193]:
                - img "Ground" [ref=e194]
                - img "Physical" [ref=e195]
              - generic [ref=e196]: Earthquake
            - generic [ref=e197] [cursor=pointer]: 22-26 (15-18%)
            - generic [ref=e198]: 0.00%
      - generic [ref=e199]:
        - generic [ref=e200]: Select a move
        - generic [ref=e201]: Select a move
      - generic [ref=e202]:
        - generic [ref=e203]:
          - checkbox "P2 Crits" [ref=e204]
          - generic [ref=e205]: P2 Crits
        - generic [ref=e206]:
          - checkbox "Apply P1 Effect" [ref=e207]
          - generic [ref=e208]: Apply P1 Effect
        - generic [ref=e209]:
          - checkbox "Apply P2 Effect" [checked] [ref=e210]
          - generic [ref=e211]: Apply P2 Effect
      - generic [ref=e213]:
        - generic [ref=e214]: Comment
        - textbox "Comment" [ref=e215]:
          - /placeholder: Note...
      - generic [ref=e216]:
        - generic [ref=e217]:
          - generic [ref=e218]: ☀ Weather
          - combobox "☀ Weather" [ref=e219] [cursor=pointer]:
            - option "None" [selected]
            - option "Sun"
            - option "Rain"
            - option "Sand"
            - option "Snow"
            - option "Hail"
            - option "Harsh Sunshine"
            - option "Heavy Rain"
            - option "Strong Winds"
          - generic "Weather does not expire after 5 turns" [ref=e220] [cursor=pointer]:
            - checkbox "Permanent" [ref=e221]
            - text: Permanent
        - generic [ref=e222]:
          - generic [ref=e223]: 🌿 Terrain
          - combobox "🌿 Terrain" [ref=e224] [cursor=pointer]:
            - option "None" [selected]
            - option "Electric"
            - option "Grassy"
            - option "Misty"
            - option "Psychic"
        - 'generic "Trick Room: slower Pokémon move first" [ref=e226] [cursor=pointer]':
          - checkbox "🔮 Trick Room" [ref=e227]
          - generic [ref=e228]: 🔮 Trick Room
      - generic [ref=e229]:
        - button "▶ Log Round" [ref=e230] [cursor=pointer]
        - generic [ref=e231]:
          - combobox "Switch P1 active" [ref=e232]:
            - option "— Switch P1 —" [selected]
          - button "⇄ Switch In" [ref=e233] [cursor=pointer]
        - button "📋 Copy Log" [ref=e234] [cursor=pointer]
        - button "Clear Line" [ref=e235] [cursor=pointer]
    - generic [ref=e236]:
      - generic [ref=e237]:
        - generic [ref=e238]: Round Log
        - generic [ref=e239]: "0"
        - button "⊖ Collapse All" [ref=e240] [cursor=pointer]
        - button "🗑 Delete All" [ref=e241] [cursor=pointer]
      - generic [ref=e243]: No rounds yet. Set your teams, load the calc, and log rounds.
      - generic [ref=e245] [cursor=pointer]:
        - generic [ref=e246]: 📋 Field State
        - generic [ref=e247]: ▾
  - button "Click for Light Theme" [ref=e249]
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