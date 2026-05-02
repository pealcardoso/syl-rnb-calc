import { test, expect } from './fixtures';

test.describe('Type Effectiveness Engine', () => {

  // ── Basic type chart ──────────────────────────────────────────
  const BASIC_CASES = [
    // Standard super-effective
    { atk: 'Fire', def: ['Grass'], expected: 2 },
    { atk: 'Water', def: ['Fire'], expected: 2 },
    { atk: 'Electric', def: ['Water'], expected: 2 },
    { atk: 'Grass', def: ['Water'], expected: 2 },
    { atk: 'Ice', def: ['Dragon'], expected: 2 },
    { atk: 'Fighting', def: ['Normal'], expected: 2 },
    { atk: 'Ground', def: ['Electric'], expected: 2 },
    { atk: 'Flying', def: ['Fighting'], expected: 2 },
    { atk: 'Psychic', def: ['Poison'], expected: 2 },
    { atk: 'Bug', def: ['Psychic'], expected: 2 },
    { atk: 'Rock', def: ['Fire'], expected: 2 },
    { atk: 'Ghost', def: ['Ghost'], expected: 2 },
    { atk: 'Dark', def: ['Psychic'], expected: 2 },
    { atk: 'Steel', def: ['Fairy'], expected: 2 },
    { atk: 'Fairy', def: ['Dragon'], expected: 2 },

    // Standard not-very-effective
    { atk: 'Fire', def: ['Water'], expected: 0.5 },
    { atk: 'Water', def: ['Grass'], expected: 0.5 },
    { atk: 'Electric', def: ['Grass'], expected: 0.5 },
    { atk: 'Grass', def: ['Fire'], expected: 0.5 },

    // Standard immunities
    { atk: 'Normal', def: ['Ghost'], expected: 0 },
    { atk: 'Ghost', def: ['Normal'], expected: 0 },
    { atk: 'Electric', def: ['Ground'], expected: 0 },
    { atk: 'Ground', def: ['Flying'], expected: 0 },
    { atk: 'Fighting', def: ['Ghost'], expected: 0 },
    { atk: 'Poison', def: ['Steel'], expected: 0 },
    { atk: 'Psychic', def: ['Dark'], expected: 0 },
    { atk: 'Dragon', def: ['Fairy'], expected: 0 },

    // Neutral
    { atk: 'Normal', def: ['Normal'], expected: 1 },
    { atk: 'Fire', def: ['Electric'], expected: 1 },
  ];

  for (const tc of BASIC_CASES) {
    test(`basic: ${tc.atk} vs ${tc.def.join('/')} = ${tc.expected}×`, async ({ rsaPage }) => {
      const mult = await rsaPage.evaluate(
        ([atk, def]) => (window as any).__rsaTest.getTypeMultiplier(atk, def),
        [tc.atk, tc.def]
      );
      expect(mult).toBe(tc.expected);
    });
  }

  // ── Dual-type multiplication ──────────────────────────────────
  const DUAL_TYPE_CASES = [
    { atk: 'Electric', def: ['Water', 'Flying'], expected: 4, label: '4× (both weak)' },
    { atk: 'Ice', def: ['Ground', 'Flying'], expected: 4, label: '4× (both weak)' },
    { atk: 'Rock', def: ['Fire', 'Flying'], expected: 4, label: '4× Stealth Rock vs Charizard' },
    { atk: 'Fire', def: ['Water', 'Ground'], expected: 0.5, label: '0.5× (Water resists, Ground neutral)' },
    { atk: 'Ice', def: ['Fire', 'Water'], expected: 0.25, label: '¼× (both resist)' },
    { atk: 'Ground', def: ['Normal', 'Flying'], expected: 0, label: '0× (one immune)' },
    { atk: 'Electric', def: ['Water', 'Ground'], expected: 0, label: '0× (one immune)' },
    { atk: 'Fire', def: ['Grass', 'Steel'], expected: 4, label: '4× Fire vs Ferrothorn' },
    { atk: 'Fighting', def: ['Normal', 'Ghost'], expected: 0, label: '0× (Ghost immune)' },
  ];

  for (const tc of DUAL_TYPE_CASES) {
    test(`dual-type: ${tc.atk} vs ${tc.def.join('/')} = ${tc.label}`, async ({ rsaPage }) => {
      const mult = await rsaPage.evaluate(
        ([atk, def]) => (window as any).__rsaTest.getTypeMultiplier(atk, def),
        [tc.atk, tc.def]
      );
      expect(mult).toBe(tc.expected);
    });
  }

  // ── Ability immunities ────────────────────────────────────────
  const ABILITY_IMMUNITY_CASES = [
    { atk: 'Ground', def: ['Rock'], ability: 'Levitate', expected: 0 },
    { atk: 'Fire', def: ['Grass'], ability: 'Flash Fire', expected: 0 },
    { atk: 'Electric', def: ['Water'], ability: 'Lightning Rod', expected: 0 },
    { atk: 'Electric', def: ['Normal'], ability: 'Volt Absorb', expected: 0 },
    { atk: 'Electric', def: ['Steel'], ability: 'Motor Drive', expected: 0 },
    { atk: 'Water', def: ['Fire'], ability: 'Water Absorb', expected: 0 },
    { atk: 'Water', def: ['Ground'], ability: 'Storm Drain', expected: 0 },
    { atk: 'Water', def: ['Fire'], ability: 'Dry Skin', expected: 0 },
    { atk: 'Grass', def: ['Normal'], ability: 'Sap Sipper', expected: 0 },
    { atk: 'Ground', def: ['Normal'], ability: 'Earth Eater', expected: 0 },
    { atk: 'Fire', def: ['Normal'], ability: 'Well-Baked Body', expected: 0 },
    // Ability doesn't affect non-matching types
    { atk: 'Fire', def: ['Normal'], ability: 'Levitate', expected: 1 },
    { atk: 'Water', def: ['Normal'], ability: 'Flash Fire', expected: 1 },
    { atk: 'Grass', def: ['Normal'], ability: 'Volt Absorb', expected: 1 },
  ];

  for (const tc of ABILITY_IMMUNITY_CASES) {
    test(`ability: ${tc.atk} vs ${tc.def.join('/')} with ${tc.ability} = ${tc.expected}×`, async ({ rsaPage }) => {
      const mult = await rsaPage.evaluate(
        ([atk, def, ability]) => (window as any).__rsaTest.getTypeMultiplier(atk, def, ability),
        [tc.atk, tc.def, tc.ability]
      );
      expect(mult).toBe(tc.expected);
    });
  }

  // ── Dry Skin special: Fire ×1.25 ─────────────────────────────
  test('Dry Skin: Fire does ×1.25 damage (on top of type effectiveness)', async ({ rsaPage }) => {
    const mult = await rsaPage.evaluate(
      () => (window as any).__rsaTest.getTypeMultiplier('Fire', ['Grass'], 'Dry Skin'),
    );
    expect(mult).toBe(2 * 1.25); // 2× type × 1.25 Dry Skin = 2.5
  });

  test('Dry Skin: Water is immune (0×)', async ({ rsaPage }) => {
    const mult = await rsaPage.evaluate(
      () => (window as any).__rsaTest.getTypeMultiplier('Water', ['Grass'], 'Dry Skin'),
    );
    expect(mult).toBe(0);
  });

  test('Dry Skin: non-Fire/Water types unaffected', async ({ rsaPage }) => {
    const mult = await rsaPage.evaluate(
      () => (window as any).__rsaTest.getTypeMultiplier('Electric', ['Water'], 'Dry Skin'),
    );
    expect(mult).toBe(2); // normal super-effective, Dry Skin doesn't change it
  });

  // ── Wonder Guard ──────────────────────────────────────────────
  test('Wonder Guard: super-effective hits normally', async ({ rsaPage }) => {
    const mult = await rsaPage.evaluate(
      () => (window as any).__rsaTest.getTypeMultiplier('Fire', ['Bug', 'Ghost'], 'Wonder Guard'),
    );
    expect(mult).toBe(2); // Fire is 2× vs Bug, 1× vs Ghost = 2× — super effective, passes
  });

  test('Wonder Guard: neutral becomes 0×', async ({ rsaPage }) => {
    const mult = await rsaPage.evaluate(
      () => (window as any).__rsaTest.getTypeMultiplier('Water', ['Bug', 'Ghost'], 'Wonder Guard'),
    );
    expect(mult).toBe(0); // Water is 1× vs Bug, 1× vs Ghost = 1× — blocked
  });

  test('Wonder Guard: resistant becomes 0×', async ({ rsaPage }) => {
    const mult = await rsaPage.evaluate(
      () => (window as any).__rsaTest.getTypeMultiplier('Fighting', ['Bug', 'Ghost'], 'Wonder Guard'),
    );
    expect(mult).toBe(0); // Fighting is 0.5× vs Bug, 0× vs Ghost = 0× — already immune anyway
  });

  // ── Verify type chart data is loaded ──────────────────────────
  test('type chart has all 18 types', async ({ rsaPage }) => {
    const types = await rsaPage.evaluate(() => {
      const chart = (window as any).calc.TYPE_CHART[9];
      return Object.keys(chart).filter(k => k !== '???');
    });
    expect(types).toHaveLength(18);
    for (const t of ['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison',
      'Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy']) {
      expect(types).toContain(t);
    }
  });
});
