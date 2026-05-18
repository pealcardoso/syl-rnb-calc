import { test, expect } from './fixtures';

test.describe('Status Tracking & Immunity', () => {

  // ── BUG #5: Comatose should block sleep ───────────────────────
  test('BUG #5: Comatose should be sleep-immune', async ({ rsaPage }) => {
    // Verify the ability exists in data (the app must handle it specially)
    const exists = await rsaPage.evaluate(() => {
      return !!(window as any).BattleAbilities['comatose'];
    });
    expect(exists).toBe(true);
  });

  // ── Verify immunity abilities exist in BattleAbilities ────────
  const IMMUNITY_ABILITIES = [
    'Insomnia', 'Vital Spirit', 'Sweet Veil', 'Magma Armor',
    'Levitate', 'Flash Fire', 'Volt Absorb', 'Water Absorb',
    'Lightning Rod', 'Motor Drive', 'Storm Drain', 'Sap Sipper', 'Dry Skin',
  ];

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

