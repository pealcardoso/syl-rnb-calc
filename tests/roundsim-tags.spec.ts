import { test, expect } from './fixtures';

/**
 * TAG_DEFS regression test — locks down every tag's check/tier behaviour
 * using synthetic entries with explicit ability, item, types, and moves.
 *
 * Run BEFORE and AFTER the data-driven refactor to detect regressions.
 * If the refactor *correctly* expands or narrows detection, update the
 * expectations here to match.
 */

interface TagResult {
  id: string;
  tier: string | null;
}

/* ── helpers ──────────────────────────────────────────────────── */

async function getTags(page: any, entry: any): Promise<TagResult[]> {
  return page.evaluate((e: any) => {
    const w = window as any;
    const results = w.__rsaTest.computeEntryTags(e);
    return results.map((r: any) => ({ id: r.def.id, tier: r.tier }));
  }, entry);
}

function expectTags(actual: TagResult[], expected: TagResult[]) {
  const sort = (a: TagResult[]) => [...a].sort((x, y) => x.id.localeCompare(y.id));
  expect(sort(actual)).toEqual(sort(expected));
}

/* ── test entries ─────────────────────────────────────────────── */

test.describe('TAG_DEFS regression', () => {

  // ── FO: Fake Out ───────────────────────────────────────────
  test('FO — Fake Out + Intimidate lead', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Intimidate', item: '', types: ['Dark', 'Normal'],
      moves: ['Fake Out', 'Knock Off', 'Protect', 'Sucker Punch']
    });
    expectTags(tags, [
      { id: 'FO',  tier: 'gold' },
      { id: 'INT', tier: null },
      { id: 'PRO', tier: 'gold' },  // Protect
      { id: 'KO',  tier: null },    // Knock Off
      { id: 'PRI', tier: null },    // Fake Out pri=3, Sucker Punch pri=1
    ]);
  });

  // ── INT: Intimidate ────────────────────────────────────────
  test('INT — Intimidate alone', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Intimidate', item: '', types: ['Dark'],
      moves: ['Crunch']
    });
    // Crunch has secondary: { chance:20, boosts:{ def:-1 } } → DEB silver
    expectTags(tags, [
      { id: 'INT', tier: null },
      { id: 'DEB', tier: 'silver' },
    ]);
  });

  // ── CI: Crit Immunity ──────────────────────────────────────
  test('CI — Battle Armor', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Battle Armor', item: '', types: ['Bug'],
      moves: ['X-Scissor']
    });
    expectTags(tags, [
      { id: 'CI', tier: null },
    ]);
  });

  test('CI — Shell Armor', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Shell Armor', item: '', types: ['Water'],
      moves: ['Razor Shell']
    });
    expectTags(tags, [
      { id: 'CI',  tier: null },
      { id: 'DEB', tier: 'silver' },
      { id: 'RN',  tier: 'silver' },
    ]);
  });

  // ── MB: Mold Breaker ──────────────────────────────────────
  test('MB — Mold Breaker + Barrier Breaker', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Mold Breaker', item: '', types: ['Fighting'],
      moves: ['Brick Break', 'Psychic Fangs']
    });
    expectTags(tags, [
      { id: 'MB',  tier: null },
      { id: 'BBR', tier: null },
    ]);
  });

  // ── PRO: Protect ───────────────────────────────────────────
  test('PRO — standard Protect', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Pressure', item: '', types: ['Ghost'],
      moves: ['Protect']
    });
    // Protect has priority:4 but is Status → no PRI
    expectTags(tags, [
      { id: 'PRO', tier: 'gold' },
    ]);
  });

  test('PRO — Wide Guard + Quick Guard (priority 3)', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Telepathy', item: '', types: ['Psychic'],
      moves: ['Wide Guard', 'Quick Guard']
    });
    // Both have priority:3 but are Status → no PRI
    expectTags(tags, [
      { id: 'PRO', tier: 'gold' },
    ]);
  });

  // ── PRI: Priority Move ─────────────────────────────────────
  test('PRI — Bullet Punch', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Technician', item: '', types: ['Bug'],
      moves: ['Bullet Punch']
    });
    expectTags(tags, [
      { id: 'PRI', tier: null },
    ]);
  });

  // ── SPR: Spread Move ──────────────────────────────────────
  test('SPR — Earthquake (allAdjacent)', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Pickup', item: '', types: ['Normal'],
      moves: ['Earthquake']
    });
    expectTags(tags, [
      { id: 'SPR', tier: null },
    ]);
  });

  // ── ACC: Never Misses ──────────────────────────────────────
  test('ACC — Aerial Ace (accuracy:true, Physical)', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Keen Eye', item: '', types: ['Normal', 'Flying'],
      moves: ['Aerial Ace']
    });
    expectTags(tags, [
      { id: 'ACC', tier: null },
      { id: 'FLY', tier: null },
    ]);
  });

  test('ACC + SPR — Swift + Earthquake', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Pickup', item: '', types: ['Normal'],
      moves: ['Swift', 'Earthquake']
    });
    expectTags(tags, [
      { id: 'ACC', tier: null },
      { id: 'SPR', tier: null },
    ]);
  });

  // ── IMM: Status Immune ─────────────────────────────────────
  test('IMM — Limber', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Limber', item: '', types: ['Normal'],
      moves: ['Return']
    });
    expectTags(tags, [
      { id: 'IMM', tier: null },
    ]);
  });

  test('IMM — Natural Cure', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Natural Cure', item: '', types: ['Grass'],
      moves: ['Giga Drain']
    });
    expectTags(tags, [
      { id: 'IMM', tier: null },
    ]);
  });

  // ── FLY: Ground Immune ─────────────────────────────────────
  test('FLY — Levitate', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Levitate', item: '', types: ['Ghost'],
      moves: ['Hex']
    });
    expectTags(tags, [
      { id: 'FLY', tier: null },
    ]);
  });

  test('FLY — Flying type', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Keen Eye', item: '', types: ['Normal', 'Flying'],
      moves: ['Aerial Ace']
    });
    expectTags(tags, [
      { id: 'FLY', tier: null },
      { id: 'ACC', tier: null },
    ]);
  });

  // ── SOAK: Soaker ───────────────────────────────────────────
  test('SOAK + FM — Follow Me + Soak', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Oblivious', item: '', types: ['Water'],
      moves: ['Follow Me', 'Soak']
    });
    expectTags(tags, [
      { id: 'FM',   tier: null },
      { id: 'SOAK', tier: null },
      { id: 'IMM',  tier: null },  // Oblivious
      { id: 'RN',   tier: 'silver' },
    ]);
  });

  // ── KO: Knock Off ─────────────────────────────────────────
  test('KO — Knock Off alone', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Frisk', item: '', types: ['Dark'],
      moves: ['Knock Off']
    });
    expectTags(tags, [
      { id: 'KO', tier: null },
    ]);
  });

  // ── RN: Rain Synergy ──────────────────────────────────────
  test('RN red — Swift Swim', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Swift Swim', item: '', types: ['Water'],
      moves: ['Waterfall']
    });
    expectTags(tags, [
      { id: 'RN', tier: null },
    ]);
  });

  test('RN silver — Water type only', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Torrent', item: '', types: ['Water'],
      moves: ['Surf']
    });
    expectTags(tags, [
      { id: 'RN',  tier: 'silver' },
      { id: 'SPR', tier: null },     // Surf is allAdjacent
    ]);
  });

  test('RN silver — Hydration + Water move', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Hydration', item: '', types: ['Normal'],
      moves: ['Surf']
    });
    expectTags(tags, [
      { id: 'RN',  tier: 'silver' },
      { id: 'SPR', tier: null },
    ]);
  });

  // ── SND: Sand Synergy ─────────────────────────────────────
  test('SND red — Sand Rush', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Sand Rush', item: '', types: ['Ground', 'Steel'],
      moves: ['Iron Head']
    });
    expectTags(tags, [
      { id: 'SND', tier: null },
    ]);
  });

  test('SND silver — Rock type only', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Sturdy', item: '', types: ['Rock'],
      moves: ['Rock Slide']
    });
    // Rock Slide: secondary { chance:30, volatileStatus:"flinch" } → NOT hasSecondaryStatus
    expectTags(tags, [
      { id: 'SND', tier: 'silver' },
      { id: 'STU', tier: null },
      { id: 'SPR', tier: null },     // Rock Slide target: allAdjacentFoes
    ]);
  });

  // ── SUN: Sun Synergy ──────────────────────────────────────
  test('SUN red — Chlorophyll', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Chlorophyll', item: '', types: ['Grass'],
      moves: ['Solar Beam']
    });
    expectTags(tags, [
      { id: 'SUN', tier: null },
    ]);
  });

  test('SUN silver — Fire type only', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Blaze', item: '', types: ['Fire'],
      moves: ['Flamethrower']
    });
    expectTags(tags, [
      { id: 'SUN', tier: 'silver' },
      { id: 'STS', tier: 'silver' },  // Flamethrower secondary burn
    ]);
  });

  // ── SNW: Snow Synergy ─────────────────────────────────────
  test('SNW red — Slush Rush', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Slush Rush', item: '', types: ['Ice'],
      moves: ['Ice Shard']
    });
    expectTags(tags, [
      { id: 'SNW', tier: null },
      { id: 'PRI', tier: null },  // Ice Shard priority:1
    ]);
  });

  test('SNW silver — Ice type only', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Ice Body', item: '', types: ['Ice'],
      moves: ['Ice Beam']
    });
    // Ice Body is in SNW list → tier check: not Slush Rush/Snow Warning → silver
    // Ice Beam: secondary { chance:10, status:"frz" } → STS silver
    expectTags(tags, [
      { id: 'SNW', tier: 'silver' },
      { id: 'SHL', tier: 'silver' },  // Ice Body is a heal ability
      { id: 'STS', tier: 'silver' },
    ]);
  });

  // ── HRC: Hazard Remover ────────────────────────────────────
  test('HRC gold — Rapid Spin + Defog', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Natural Cure', item: '', types: ['Normal', 'Flying'],
      moves: ['Rapid Spin', 'Defog']
    });
    // Rapid Spin: priority:0, secondary:{ chance:100, self:{ boosts:{spe:1} } }
    // → NOT hasPriority, NOT hasSecondaryStatus, NOT _hasDebuffMove (self boost)
    expectTags(tags, [
      { id: 'HRC', tier: 'gold' },
      { id: 'FLY', tier: null },
      { id: 'IMM', tier: null },
    ]);
  });

  test('HRC gold — Defog only', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Gale Wings', item: '', types: ['Fire', 'Flying'],
      moves: ['Defog', 'Brave Bird']
    });
    expectTags(tags, [
      { id: 'HRC', tier: 'gold' },
      { id: 'FLY', tier: null },
      { id: 'SUN', tier: 'silver' },
    ]);
  });

  // ── BBR: Barrier Breaker ───────────────────────────────────
  // (covered in MB test above)

  // ── SHL: Self Healer ──────────────────────────────────────
  test('SHL gold — three healing sources', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Regenerator', item: 'Leftovers', types: ['Normal'],
      moves: ['Recover']
    });
    expectTags(tags, [
      { id: 'SHL', tier: 'gold' },
    ]);
  });

  test('SHL red — two healing sources', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Regenerator', item: 'Sitrus Berry', types: ['Water'],
      moves: ['Scald']
    });
    // Scald: secondary brn → STS silver
    expectTags(tags, [
      { id: 'SHL', tier: null },
      { id: 'RN',  tier: 'silver' },
      { id: 'STS', tier: 'silver' },
    ]);
  });

  test('SHL silver — item only', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Rough Skin', item: 'Leftovers', types: ['Ground', 'Dragon'],
      moves: ['Earthquake']
    });
    expectTags(tags, [
      { id: 'SHL', tier: 'silver' },
      { id: 'SND', tier: 'silver' },
      { id: 'SPR', tier: null },
    ]);
  });

  test('SHL silver — Poison Heal ability', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Poison Heal', item: '', types: ['Fighting'],
      moves: ['Drain Punch']
    });
    expectTags(tags, [
      { id: 'SHL', tier: 'silver' },
    ]);
  });

  // ── BOOM: Exploder ─────────────────────────────────────────
  test('BOOM — Explosion', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Aftermath', item: '', types: ['Normal'],
      moves: ['Explosion', 'Earthquake']
    });
    expectTags(tags, [
      { id: 'BOOM', tier: null },
      { id: 'SPR',  tier: null },  // Both are allAdjacent
    ]);
  });

  test('BOOM — Misty Explosion', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Misty Surge', item: '', types: ['Fairy'],
      moves: ['Misty Explosion']
    });
    expectTags(tags, [
      { id: 'BOOM', tier: null },
      { id: 'SPR',  tier: null },
    ]);
  });

  // ── STU: Sturdy / Sash ────────────────────────────────────
  test('STU — Sturdy ability', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Sturdy', item: '', types: ['Rock'],
      moves: ['Stealth Rock']
    });
    expectTags(tags, [
      { id: 'STU', tier: null },
      { id: 'HAZ', tier: null },
      { id: 'SND', tier: 'silver' },
    ]);
  });

  test('STU — Focus Sash item', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Compound Eyes', item: 'Focus Sash', types: ['Bug'],
      moves: ['Sticky Web', 'Thunder']
    });
    // Thunder: secondary { chance:30, status:"par" } → STS silver
    expectTags(tags, [
      { id: 'STU', tier: null },
      { id: 'HAZ', tier: null },     // Sticky Web
      { id: 'SPD', tier: 'silver' }, // Sticky Web is in SPD list
      { id: 'STS', tier: 'silver' },
    ]);
  });

  // ── HAZ: Hazard Setter ─────────────────────────────────────
  test('HAZ — Stealth Rock + Spikes', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Sturdy', item: 'Focus Sash', types: ['Rock', 'Steel'],
      moves: ['Stealth Rock', 'Spikes', 'Reflect', 'Light Screen']
    });
    expectTags(tags, [
      { id: 'STU', tier: null },
      { id: 'HAZ', tier: null },
      { id: 'SCR', tier: null },
      { id: 'SND', tier: 'silver' },
    ]);
  });

  test('HAZ — Toxic Spikes', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Levitate', item: '', types: ['Poison'],
      moves: ['Toxic Spikes']
    });
    expectTags(tags, [
      { id: 'HAZ', tier: null },
      { id: 'FLY', tier: null },
    ]);
  });

  // ── SCR: Screen Setter ─────────────────────────────────────
  test('SCR — Aurora Veil + Snow Warning', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Snow Warning', item: 'Light Clay', types: ['Ice'],
      moves: ['Aurora Veil']
    });
    expectTags(tags, [
      { id: 'SCR', tier: null },
      { id: 'SNW', tier: null },   // Snow Warning → red
      { id: 'WTH', tier: null },   // Snow Warning = weather setter
    ]);
  });

  // ── WTH: Weather Setter ────────────────────────────────────
  test('WTH — Drought ability + Sunny Day move', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Drought', item: '', types: ['Fire'],
      moves: ['Sunny Day', 'Heat Wave']
    });
    // Heat Wave: allAdjacentFoes → SPR; secondary { chance:10, status:"brn" } → STS
    expectTags(tags, [
      { id: 'SUN', tier: null },
      { id: 'WTH', tier: null },
      { id: 'SPR', tier: null },
      { id: 'STS', tier: 'silver' },
    ]);
  });

  test('WTH — Rain Dance move only', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Prankster', item: '', types: ['Water'],
      moves: ['Rain Dance']
    });
    expectTags(tags, [
      { id: 'WTH', tier: null },
      { id: 'SPR', tier: null },   // Rain Dance target:"all"
      { id: 'RN',  tier: 'silver' },
    ]);
  });

  // ── SPD: Speed Control ─────────────────────────────────────
  test('SPD gold — Tailwind + Trick Room', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Levitate', item: '', types: ['Psychic'],
      moves: ['Trick Room', 'Tailwind']
    });
    expectTags(tags, [
      { id: 'SPD', tier: 'gold' },
      { id: 'FLY', tier: null },
      { id: 'SPR', tier: null },   // Trick Room target:"all"
      { id: 'TR',  tier: null },
    ]);
  });

  test('SPD silver — Icy Wind', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Clear Body', item: '', types: ['Ice'],
      moves: ['Icy Wind']
    });
    // Icy Wind: secondary { chance:100, boosts:{ spe:-1 } } → DEB silver, target:allAdjacentFoes → SPR
    expectTags(tags, [
      { id: 'SPD', tier: 'silver' },
      { id: 'SNW', tier: 'silver' },
      { id: 'DEB', tier: 'silver' },
      { id: 'SPR', tier: null },
    ]);
  });

  test('SPD silver — Gunk Shot (current behavior)', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Poison Touch', item: '', types: ['Poison'],
      moves: ['Gunk Shot']
    });
    // Gunk Shot is in SPD list (existing, possibly incorrect)
    // Gunk Shot: secondary { chance:30, status:"psn" } → STS silver
    expectTags(tags, [
      { id: 'SPD', tier: 'silver' },
      { id: 'STS', tier: 'silver' },
    ]);
  });

  test('SPD gold — Cotton Down ability', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Cotton Down', item: '', types: ['Grass'],
      moves: ['Leech Seed']
    });
    expectTags(tags, [
      { id: 'SPD', tier: 'gold' },
    ]);
  });

  // ── ACC-: Accuracy Reducer ─────────────────────────────────
  test('ACC- red — Sand Veil + Bright Powder stacked', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Sand Veil', item: 'Bright Powder', types: ['Ground', 'Dragon'],
      moves: ['Earthquake']
    });
    expectTags(tags, [
      { id: 'ACC-', tier: null },
      { id: 'SND',  tier: 'silver' },
      { id: 'SPR',  tier: null },
    ]);
  });

  test('ACC- silver — Snow Cloak only', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Snow Cloak', item: '', types: ['Ice'],
      moves: ['Ice Punch']
    });
    expectTags(tags, [
      { id: 'ACC-', tier: 'silver' },
      { id: 'SNW',  tier: 'silver' },
      { id: 'STS',  tier: 'silver' },  // Ice Punch secondary.status:'frz'
    ]);
  });

  test('ACC- silver — Mud-Slap move', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Solid Rock', item: '', types: ['Ground'],
      moves: ['Mud-Slap']
    });
    // Mud-Slap: secondary { chance:100, boosts:{ accuracy:-1 } } → DEB silver
    expectTags(tags, [
      { id: 'ACC-', tier: 'silver' },
      { id: 'SND',  tier: 'silver' },
      { id: 'DEB',  tier: 'silver' },
    ]);
  });

  // ── QCL: Quick Claw ────────────────────────────────────────
  test('QCL + PRI! red — Quick Claw + Quick Draw stacked', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Quick Draw', item: 'Quick Claw', types: ['Normal'],
      moves: ['Body Slam']
    });
    // Body Slam: secondary { chance:30, status:"par" } → STS silver
    expectTags(tags, [
      { id: 'QCL',  tier: null },
      { id: 'PRI!', tier: null },
      { id: 'STS',  tier: 'silver' },
    ]);
  });

  test('QCL silver — Quick Claw only', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Guts', item: 'Quick Claw', types: ['Fighting'],
      moves: ['Close Combat']
    });
    expectTags(tags, [
      { id: 'QCL',  tier: 'silver' },
      { id: 'PRI!', tier: null },
    ]);
  });

  // ── CRIT: Crit Machine ────────────────────────────────────
  test('CRIT red — Sniper + Scope Lens stacked', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Sniper', item: 'Scope Lens', types: ['Dark', 'Water'],
      moves: ['Wicked Blow']
    });
    expectTags(tags, [
      { id: 'CRIT', tier: null },
      { id: 'RN',   tier: 'silver' },
    ]);
  });

  test('CRIT silver — Scope Lens only', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Intimidate', item: 'Scope Lens', types: ['Dark'],
      moves: ['Crunch']
    });
    // Crunch: secondary { chance:20, boosts:{ def:-1 } } → DEB silver
    expectTags(tags, [
      { id: 'INT',  tier: null },
      { id: 'CRIT', tier: 'silver' },
      { id: 'DEB',  tier: 'silver' },
    ]);
  });

  test('CRIT silver — Focus Energy + Frost Breath', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Inner Focus', item: '', types: ['Fighting'],
      moves: ['Focus Energy', 'Frost Breath']
    });
    expectTags(tags, [
      { id: 'CRIT', tier: 'silver' },
      { id: 'IMM',  tier: null },
    ]);
  });

  // ── SPB: Speed Booster ────────────────────────────────────
  test('SPB red — Speed Boost ability', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Speed Boost', item: '', types: ['Bug'],
      moves: ['Protect']
    });
    // Protect: stallingMove → PRO gold; priority:4 but Status → no PRI
    expectTags(tags, [
      { id: 'SPB', tier: null },
      { id: 'PRO', tier: 'gold' },
    ]);
  });

  test('SPB silver — Dragon Dance', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Moxie', item: '', types: ['Dragon', 'Flying'],
      moves: ['Dragon Dance', 'Outrage']
    });
    expectTags(tags, [
      { id: 'BOOST', tier: null },
      { id: 'SPB',   tier: 'silver' },
      { id: 'FLY',   tier: null },
    ]);
  });

  test('SPB silver — Flame Charge', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Flash Fire', item: '', types: ['Fire'],
      moves: ['Flame Charge']
    });
    expectTags(tags, [
      { id: 'SPB', tier: 'silver' },
      { id: 'SUN', tier: 'silver' },
    ]);
  });

  // ── RET: Retaliator ────────────────────────────────────────
  test('RET — Retaliate + Last Respects', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Scrappy', item: '', types: ['Normal'],
      moves: ['Retaliate', 'Last Respects']
    });
    expectTags(tags, [
      { id: 'RET', tier: null },
    ]);
  });

  // ── TRAP: Trapper ──────────────────────────────────────────
  test('TRAP — Arena Trap', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Arena Trap', item: '', types: ['Ground'],
      moves: ['Earthquake']
    });
    expectTags(tags, [
      { id: 'TRAP', tier: null },
      { id: 'SND',  tier: 'silver' },
      { id: 'SPR',  tier: null },
    ]);
  });

  test('TRAP — Shadow Tag', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Shadow Tag', item: '', types: ['Psychic'],
      moves: ['Psychic']
    });
    expectTags(tags, [
      { id: 'TRAP', tier: null },
      { id: 'DEB',  tier: 'silver' },  // Psychic secondary.boosts.spd:-1
    ]);
  });

  // ── STS: Status Inducer ────────────────────────────────────
  test('STS gold — Spore (primary status move)', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Effect Spore', item: '', types: ['Grass', 'Poison'],
      moves: ['Spore']
    });
    expectTags(tags, [
      { id: 'STS', tier: null },
    ]);
  });

  test('STS gold — Will-O-Wisp + Thunder Wave', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Prankster', item: '', types: ['Electric'],
      moves: ['Will-O-Wisp', 'Thunder Wave']
    });
    expectTags(tags, [
      { id: 'STS', tier: null },
    ]);
  });

  test('STS silver — secondary status only (Scald burn)', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Torrent', item: '', types: ['Water'],
      moves: ['Scald']
    });
    expectTags(tags, [
      { id: 'STS', tier: 'silver' },
      { id: 'RN',  tier: 'silver' },
    ]);
  });

  // ── DEB: Debuffer ──────────────────────────────────────────
  test('DEB gold — Charm (guaranteed stat drop)', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Cursed Body', item: '', types: ['Ghost'],
      moves: ['Will-O-Wisp', 'Charm', 'Destiny Bond']
    });
    expectTags(tags, [
      { id: 'STS', tier: null },   // Will-O-Wisp
      { id: 'DEB', tier: 'gold' }, // Charm
      { id: 'DB',  tier: null },   // Destiny Bond
    ]);
  });

  test('DEB silver — Rock Tomb secondary speed drop', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Intimidate', item: '', types: ['Normal'],
      moves: ['Rock Tomb']
    });
    expectTags(tags, [
      { id: 'INT', tier: null },
      { id: 'DEB', tier: 'silver' },
      { id: 'SPD', tier: 'silver' },
    ]);
  });

  // ── BOOST: Self Booster ────────────────────────────────────
  test('BOOST — Swords Dance', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Technician', item: '', types: ['Bug'],
      moves: ['Swords Dance', 'Bullet Punch']
    });
    expectTags(tags, [
      { id: 'BOOST', tier: null },
      { id: 'PRI',   tier: null },
    ]);
  });

  test('BOOST — Shell Smash', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Skill Link', item: '', types: ['Water', 'Ice'],
      moves: ['Shell Smash', 'Icicle Spear']
    });
    // Shell Smash is in BOOST list, NOT in SPB list
    expectTags(tags, [
      { id: 'BOOST', tier: null },
      { id: 'RN',    tier: 'silver' },
      { id: 'SNW',   tier: 'silver' },
    ]);
  });

  test('BOOST + SPB — Dragon Dance + Speed Boost', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Speed Boost', item: '', types: ['Dragon'],
      moves: ['Dragon Dance', 'Protect', 'Outrage']
    });
    // DD in both BOOST and SPB lists; Speed Boost ability → SPB red
    // Protect: priority:4 but Status → no PRI
    expectTags(tags, [
      { id: 'BOOST', tier: null },
      { id: 'SPB',   tier: null },
      { id: 'PRO',   tier: 'gold' },
    ]);
  });

  // ── TR: Trick Room ─────────────────────────────────────────
  test('TR — Trick Room (also triggers SPD gold)', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Magic Guard', item: '', types: ['Psychic', 'Fairy'],
      moves: ['Trick Room']
    });
    expectTags(tags, [
      { id: 'TR',  tier: null },
      { id: 'SPD', tier: 'gold' },
      { id: 'SPR', tier: null },   // Trick Room target:"all"
      { id: 'IMM', tier: null },
    ]);
  });

  // ── PUR: Pursuit ───────────────────────────────────────────
  test('PUR — Pursuit', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Guts', item: '', types: ['Dark'],
      moves: ['Pursuit']
    });
    expectTags(tags, [
      { id: 'PUR', tier: null },
    ]);
  });

  // ── DB: Destiny Bond ──────────────────────────────────────
  test('DB — Destiny Bond alone', async ({ rsaPage }) => {
    const tags = await getTags(rsaPage, {
      ability: 'Cursed Body', item: '', types: ['Ghost'],
      moves: ['Destiny Bond']
    });
    expectTags(tags, [
      { id: 'DB', tier: null },
    ]);
  });

});
