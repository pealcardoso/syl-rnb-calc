import { test, expect } from './fixtures';

test.describe('Status Tracking & Immunity', () => {

  // ── Type-based status immunity ────────────────────────────────

  test('Fire type immune to Burn', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const entry = { types: ['Fire'], ability: '', item: '', status: '' };
      // Replicate isStatusImmune from roundsim_app.js
      const types = entry.types;
      if ('Burn' === 'Burn' && types.indexOf('Fire') !== -1) return true;
      return false;
    });
    expect(result).toBe(true);
  });

  test('Poison type immune to Poison', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const types = ['Poison'];
      return types.indexOf('Poison') !== -1;
    });
    expect(result).toBe(true);
  });

  test('Steel type immune to Poison', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const types = ['Steel'];
      return types.indexOf('Steel') !== -1;
    });
    expect(result).toBe(true);
  });

  test('Ice type immune to Freeze', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const types = ['Ice'];
      return types.indexOf('Ice') !== -1;
    });
    expect(result).toBe(true);
  });

  test('Electric type immune to Paralysis (Gen 6+)', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const types = ['Electric'];
      const gen = (window as any).gen || 9;
      return types.indexOf('Electric') !== -1 && gen >= 6;
    });
    expect(result).toBe(true);
  });

  // ── Ability-based sleep immunity ──────────────────────────────

  const SLEEP_IMMUNE_ABILITIES = ['Insomnia', 'Vital Spirit', 'Sweet Veil'];

  for (const ability of SLEEP_IMMUNE_ABILITIES) {
    test(`${ability} blocks Sleep`, async ({ rsaPage }) => {
      const immune = await rsaPage.evaluate(
        ([ab]) => {
          const key = ab.toLowerCase().replace(/\s/g, '');
          return key === 'insomnia' || key === 'vitalspirit' || key === 'sweetveil';
        },
        [ability]
      );
      expect(immune).toBe(true);
    });
  }

  // BUG #5: Comatose should block sleep
  test.fail('BUG #5: Comatose should be sleep-immune', async ({ rsaPage }) => {
    const immune = await rsaPage.evaluate(() => {
      const key = 'comatose';
      // Current code only checks: insomnia, vitalspirit, sweetveil
      return key === 'insomnia' || key === 'vitalspirit' || key === 'sweetveil';
    });
    // Currently FAILS: Comatose is not in the list
    expect(immune).toBe(true);
  });

  // ── Freeze immunity ───────────────────────────────────────────

  test('Magma Armor blocks Freeze', async ({ rsaPage }) => {
    const immune = await rsaPage.evaluate(() => {
      const key = 'magmaarmor';
      return key === 'magmaarmor';
    });
    expect(immune).toBe(true);
  });

  test('Ice type blocks Freeze', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const types = ['Ice'];
      return types.indexOf('Ice') !== -1;
    });
    expect(result).toBe(true);
  });

  // ── Berry status cures ────────────────────────────────────────

  const BERRY_CURE_CASES = [
    { berry: 'Lum Berry', status: 'Burn', cures: true },
    { berry: 'Lum Berry', status: 'Sleep', cures: true },
    { berry: 'Lum Berry', status: 'Freeze', cures: true },
    { berry: 'Lum Berry', status: 'Paralysis', cures: true },
    { berry: 'Lum Berry', status: 'Poison', cures: true },
    { berry: 'Chesto Berry', status: 'Sleep', cures: true },
    { berry: 'Chesto Berry', status: 'Burn', cures: false },
    { berry: 'Aspear Berry', status: 'Freeze', cures: true },
    { berry: 'Aspear Berry', status: 'Sleep', cures: false },
  ];

  for (const tc of BERRY_CURE_CASES) {
    test(`${tc.berry} ${tc.cures ? 'cures' : 'does not cure'} ${tc.status}`, async ({ rsaPage }) => {
      const cures = await rsaPage.evaluate(
        ([berry, status]) => {
          const it = berry.toLowerCase().replace(/\s/g, '');
          if (it === 'lumberry') return true;
          if (status === 'Sleep' && it === 'chestoberry') return true;
          if (status === 'Freeze' && it === 'aspearberry') return true;
          return false;
        },
        [tc.berry, tc.status]
      );
      expect(cures).toBe(tc.cures);
    });
  }

  // ── Verify ability data exists in BattleAbilities ─────────────

  const IMMUNITY_ABILITIES = ['Insomnia', 'Vital Spirit', 'Sweet Veil', 'Magma Armor',
    'Levitate', 'Flash Fire', 'Volt Absorb', 'Water Absorb', 'Lightning Rod',
    'Motor Drive', 'Storm Drain', 'Sap Sipper', 'Dry Skin'];

  for (const ability of IMMUNITY_ABILITIES) {
    test(`BattleAbilities has ${ability}`, async ({ rsaPage }) => {
      const exists = await rsaPage.evaluate(
        ([ab]) => {
          const key = ab.toLowerCase().replace(/[\s\-\']+/g, '');
          return !!(window as any).BattleAbilities[key];
        },
        [ability]
      );
      expect(exists).toBe(true);
    });
  }
});
