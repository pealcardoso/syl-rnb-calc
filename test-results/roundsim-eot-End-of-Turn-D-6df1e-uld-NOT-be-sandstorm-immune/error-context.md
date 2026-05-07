# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: roundsim-eot.spec.ts >> End-of-Turn Damage >> BUG #1: Ice Body should NOT be sandstorm-immune
- Location: tests\roundsim-eot.spec.ts:148:8

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
  56  |         [counter]
  57  |       );
  58  |       const entry = eot.find((e: any) => e.source.startsWith('Toxic'));
  59  |       expect(entry).toBeTruthy();
  60  |       expect(entry.damage).toBe(Math.max(1, Math.floor(320 * Math.min(counter, 15) / 16)));
  61  |     }
  62  |   });
  63  | 
  64  |   // ── Poison Heal ───────────────────────────────────────────────
  65  |   test('Poison Heal: heals 1/8 when Poisoned', async ({ rsaPage }) => {
  66  |     const eot = await rsaPage.evaluate(() => {
  67  |       return (window as any).__rsaTest.calcEndOfTurnDamage(
  68  |         { maxHP: 400, status: 'Poison', ability: 'Poison Heal', item: '', types: ['Normal'] }, 'None'
  69  |       );
  70  |     });
  71  |     const entry = eot.find((e: any) => e.source === 'Poison Heal');
  72  |     expect(entry).toBeTruthy();
  73  |     expect(entry.damage).toBe(-50); // negative = healing, 400/8 = 50
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
> 156 |     expect(eot.find((e: any) => e.source === 'Sandstorm')).toBeTruthy();
      |                                                            ^ Error: expect(received).toBeTruthy()
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
```