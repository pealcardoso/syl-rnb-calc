import { test, expect } from './fixtures';

test.describe('Entry Hazards', () => {

  // ── Stealth Rock: single types ────────────────────────────────
  const SR_SINGLE_CASES = [
    // 4× weak to Rock
    { types: ['Fire'],     expectedFrac: 2,   label: 'Fire — 25% (2× weak)' },
    { types: ['Ice'],      expectedFrac: 2,   label: 'Ice — 25% (2× weak)' },
    { types: ['Bug'],      expectedFrac: 2,   label: 'Bug — 25% (2× weak)' },
    { types: ['Flying'],   expectedFrac: 2,   label: 'Flying — 25% (2× weak)' },
    // Neutral to Rock
    { types: ['Normal'],   expectedFrac: 1,   label: 'Normal — 12.5% (neutral)' },
    { types: ['Psychic'],  expectedFrac: 1,   label: 'Psychic — 12.5% (neutral)' },
    { types: ['Ghost'],    expectedFrac: 1,   label: 'Ghost — 12.5% (neutral)' },
    { types: ['Dragon'],   expectedFrac: 1,   label: 'Dragon — 12.5% (neutral)' },
    { types: ['Dark'],     expectedFrac: 1,   label: 'Dark — 12.5% (neutral)' },
    { types: ['Poison'],   expectedFrac: 1,   label: 'Poison — 12.5% (neutral)' },
    { types: ['Electric'], expectedFrac: 1,   label: 'Electric — 12.5% (neutral)' },
    { types: ['Grass'],    expectedFrac: 1,   label: 'Grass — 12.5% (neutral)' },
    { types: ['Fairy'],    expectedFrac: 1,   label: 'Fairy — 12.5% (neutral)' },
    { types: ['Rock'],     expectedFrac: 1,   label: 'Rock — 12.5% (neutral)' },
    // Resistant to Rock
    { types: ['Water'],    expectedFrac: 0.5, label: 'Water — 6.25% (resistant)' },
    { types: ['Fighting'], expectedFrac: 0.5, label: 'Fighting — 6.25% (resistant)' },
    { types: ['Ground'],   expectedFrac: 0.5, label: 'Ground — 6.25% (resistant)' },
    { types: ['Steel'],    expectedFrac: 0.5, label: 'Steel — 6.25% (resistant)' },
  ];

  for (const tc of SR_SINGLE_CASES) {
    test(`SR single: ${tc.label}`, async ({ rsaPage }) => {
      const result = await rsaPage.evaluate(
        ([types, frac]) => {
          const maxHP = 400; // Use round number for clean fractions
          return (window as any).__rsaTest.calcEntryHazardDamage(
            { types, ability: '', item: '', maxHP, status: '' },
            { sr: true, spikes: 0, tspikes: 0 }
          );
        },
        [tc.types, tc.expectedFrac]
      );
      const maxHP = 400;
      const expectedDamage = Math.max(1, Math.floor(maxHP * tc.expectedFrac / 8));
      expect(result.damage).toBe(expectedDamage);
    });
  }

  // ── Stealth Rock: dual types (multiplicative) ─────────────────
  const SR_DUAL_CASES = [
    { types: ['Fire', 'Flying'],  expectedEff: 4,    label: 'Fire/Flying (Charizard) — 50%' },
    { types: ['Ice', 'Flying'],   expectedEff: 4,    label: 'Ice/Flying (Articuno) — 50%' },
    { types: ['Bug', 'Flying'],   expectedEff: 4,    label: 'Bug/Flying (Butterfree) — 50%' },
    { types: ['Bug', 'Fire'],     expectedEff: 4,    label: 'Bug/Fire (Volcarona) — 50%' },
    { types: ['Water', 'Ground'], expectedEff: 0.25, label: 'Water/Ground (Swampert) — 3.125%' },
    { types: ['Steel', 'Fighting'], expectedEff: 0.25, label: 'Steel/Fighting (Lucario) — 3.125%' },
    { types: ['Fire', 'Water'],   expectedEff: 1,    label: 'Fire/Water (Volcanion) — 12.5% (2×0.5 = 1×) ' },
    { types: ['Water', 'Flying'], expectedEff: 1,    label: 'Water/Flying (Gyarados) — 12.5% (0.5×2 = 1×)' },
    { types: ['Dragon', 'Flying'], expectedEff: 2,   label: 'Dragon/Flying (Dragonite) — 25% (1×2)' },
  ];

  for (const tc of SR_DUAL_CASES) {
    test(`SR dual: ${tc.label}`, async ({ rsaPage }) => {
      const result = await rsaPage.evaluate(
        ([types]) => {
          const maxHP = 400;
          return (window as any).__rsaTest.calcEntryHazardDamage(
            { types, ability: '', item: '', maxHP, status: '' },
            { sr: true, spikes: 0, tspikes: 0 }
          );
        },
        [tc.types]
      );
      const maxHP = 400;
      const expectedDamage = Math.max(1, Math.floor(maxHP * tc.expectedEff / 8));
      expect(result.damage).toBe(expectedDamage);
    });
  }

  // ── Stealth Rock: Magic Guard blocks ──────────────────────────
  test('SR blocked by Magic Guard', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEntryHazardDamage(
        { types: ['Fire'], ability: 'Magic Guard', item: '', maxHP: 400, status: '' },
        { sr: true, spikes: 0, tspikes: 0 }
      );
    });
    expect(result.damage).toBe(0);
  });

  // ── Spikes ────────────────────────────────────────────────────
  const SPIKES_CASES = [
    { layers: 1, maxHP: 400, expectedDiv: 8, label: '1 layer = 1/8' },
    { layers: 2, maxHP: 400, expectedDiv: 6, label: '2 layers = 1/6' },
    { layers: 3, maxHP: 400, expectedDiv: 4, label: '3 layers = 1/4' },
  ];

  for (const tc of SPIKES_CASES) {
    test(`Spikes: ${tc.label}`, async ({ rsaPage }) => {
      const result = await rsaPage.evaluate(
        ([layers, maxHP]) => {
          return (window as any).__rsaTest.calcEntryHazardDamage(
            { types: ['Normal'], ability: '', item: '', maxHP, status: '' },
            { sr: false, spikes: layers, tspikes: 0 }
          );
        },
        [tc.layers, tc.maxHP]
      );
      expect(result.damage).toBe(Math.max(1, Math.floor(tc.maxHP / tc.expectedDiv)));
    });
  }

  // ── Spikes: grounding immunity ────────────────────────────────
  test('Spikes: Flying type is immune', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEntryHazardDamage(
        { types: ['Flying'], ability: '', item: '', maxHP: 400, status: '' },
        { sr: false, spikes: 3, tspikes: 0 }
      );
    });
    expect(result.damage).toBe(0); // Not grounded — SR still hits but Spikes don't
  });

  test('Spikes: Levitate is immune', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEntryHazardDamage(
        { types: ['Normal'], ability: 'Levitate', item: '', maxHP: 400, status: '' },
        { sr: false, spikes: 3, tspikes: 0 }
      );
    });
    expect(result.damage).toBe(0);
  });

  test('Spikes: Air Balloon is immune', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEntryHazardDamage(
        { types: ['Normal'], ability: '', item: 'Air Balloon', maxHP: 400, status: '' },
        { sr: false, spikes: 3, tspikes: 0 }
      );
    });
    expect(result.damage).toBe(0);
  });

  test('Spikes: Magic Guard blocks damage', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEntryHazardDamage(
        { types: ['Normal'], ability: 'Magic Guard', item: '', maxHP: 400, status: '' },
        { sr: false, spikes: 3, tspikes: 0 }
      );
    });
    expect(result.damage).toBe(0);
  });

  // ── Toxic Spikes ──────────────────────────────────────────────
  test('T-Spikes 1 layer: inflicts Poison', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEntryHazardDamage(
        { types: ['Normal'], ability: '', item: '', maxHP: 400, status: '' },
        { sr: false, spikes: 0, tspikes: 1 }
      );
    });
    expect(result.status).toBe('Poison');
    expect(result.damage).toBe(0); // T-Spikes don't deal direct damage
  });

  test('T-Spikes 2 layers: inflicts Badly Poisoned', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEntryHazardDamage(
        { types: ['Normal'], ability: '', item: '', maxHP: 400, status: '' },
        { sr: false, spikes: 0, tspikes: 2 }
      );
    });
    expect(result.status).toBe('Badly Poisoned');
  });

  test('T-Spikes: Poison type absorbs', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEntryHazardDamage(
        { types: ['Poison'], ability: '', item: '', maxHP: 400, status: '' },
        { sr: false, spikes: 0, tspikes: 2 }
      );
    });
    expect(result.status).toBe('');
    expect(result.damage).toBe(0);
  });

  test('T-Spikes: Steel type absorbs', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEntryHazardDamage(
        { types: ['Steel'], ability: '', item: '', maxHP: 400, status: '' },
        { sr: false, spikes: 0, tspikes: 2 }
      );
    });
    expect(result.status).toBe('');
  });

  test('T-Spikes: already statused — no additional status', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEntryHazardDamage(
        { types: ['Normal'], ability: '', item: '', maxHP: 400, status: 'Burn' },
        { sr: false, spikes: 0, tspikes: 2 }
      );
    });
    expect(result.status).toBe('');
  });

  test('T-Spikes: Flying type immune', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEntryHazardDamage(
        { types: ['Normal', 'Flying'], ability: '', item: '', maxHP: 400, status: '' },
        { sr: false, spikes: 0, tspikes: 2 }
      );
    });
    expect(result.status).toBe('');
  });

  // ── Combined: SR + Spikes ─────────────────────────────────────
  test('SR + 3 Spikes combined damage', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEntryHazardDamage(
        { types: ['Fire'], ability: '', item: '', maxHP: 400, status: '' },
        { sr: true, spikes: 3, tspikes: 0 }
      );
    });
    // SR: floor(400 * 2 / 8) = 100, Spikes 3: floor(400 / 4) = 100
    expect(result.damage).toBe(200);
  });

  // ── No hazards ────────────────────────────────────────────────
  test('No hazards: zero damage', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEntryHazardDamage(
        { types: ['Normal'], ability: '', item: '', maxHP: 400, status: '' },
        { sr: false, spikes: 0, tspikes: 0 }
      );
    });
    expect(result.damage).toBe(0);
    expect(result.status).toBe('');
  });

  test('null hazards: zero damage', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEntryHazardDamage(
        { types: ['Normal'], ability: '', item: '', maxHP: 400, status: '' },
        null
      );
    });
    expect(result.damage).toBe(0);
    expect(result.status).toBe('');
  });
});
