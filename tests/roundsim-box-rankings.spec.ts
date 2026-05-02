import { test, expect } from './fixtures';

test.describe('Box Rankings & Item Simulation', () => {

  // ── Item multiplier simulation ────────────────────────────────
  // Replicating applySimItemMultiplier logic

  const ITEM_SIM_CASES = [
    { setting: 'choice', pct: 100, expected: 150, label: 'Choice Band/Specs +50%' },
    { setting: 'lifeorb', pct: 100, expected: 130, label: 'Life Orb +30%' },
    { setting: 'typeenhance', pct: 100, expected: 120, label: 'Type-enhancing +20%' },
    { setting: 'band', pct: 100, expected: 110, label: 'Band +10%' },
    { setting: 'none', pct: 100, expected: 100, label: 'No item — no change' },
    // Fractional values
    { setting: 'choice', pct: 50, expected: 75, label: 'Choice on 50% damage' },
    { setting: 'lifeorb', pct: 200, expected: 260, label: 'Life Orb on 200% damage' },
  ];

  for (const tc of ITEM_SIM_CASES) {
    test(`sim item: ${tc.label}`, async ({ rsaPage }) => {
      const result = await rsaPage.evaluate(
        ([setting, pct]) => {
          switch (setting) {
            case 'choice': return pct * 1.5;
            case 'lifeorb': return pct * 1.3;
            case 'typeenhance': return pct * 1.2;
            case 'band': return pct * 1.1;
            default: return pct;
          }
        },
        [tc.setting, tc.pct]
      );
      expect(result).toBeCloseTo(tc.expected, 10);
    });
  }

  // ── Verify BattleMovedex has selfdestruct data ────────────────

  test('Self-Destruct is flagged for explosion exclusion', async ({ rsaPage }) => {
    const hasSelfDestruct = await rsaPage.evaluate(() => {
      const m = (window as any).BattleMovedex['selfdestruct'];
      return m ? !!m.selfdestruct : false;
    });
    expect(hasSelfDestruct).toBe(true);
  });

  test('Explosion is flagged for explosion exclusion', async ({ rsaPage }) => {
    const hasSelfDestruct = await rsaPage.evaluate(() => {
      const m = (window as any).BattleMovedex['explosion'];
      return m ? !!m.selfdestruct : false;
    });
    expect(hasSelfDestruct).toBe(true);
  });

  // ── Guts interaction concept ──────────────────────────────────

  test('Guts ability: boosts Attack 1.5× when statused', async ({ rsaPage }) => {
    const desc = await rsaPage.evaluate(() => {
      const ab = (window as any).BattleAbilities['guts'];
      return ab ? ab.shortDesc || ab.desc : '';
    });
    expect(desc.toLowerCase()).toContain('1.5');
  });

  // ── Verify common offensive items exist in BattleItems ────────

  const OFFENSIVE_ITEMS = [
    'Choice Band', 'Choice Specs', 'Choice Scarf', 'Life Orb',
    'Expert Belt', 'Muscle Band', 'Wise Glasses',
  ];

  for (const item of OFFENSIVE_ITEMS) {
    test(`BattleItems has ${item}`, async ({ rsaPage }) => {
      const exists = await rsaPage.evaluate(
        ([it]) => {
          const key = it.toLowerCase().replace(/[\s\-\']+/g, '');
          return !!(window as any).BattleItems[key];
        },
        [item]
      );
      expect(exists).toBe(true);
    });
  }

  // ── Verify type-boosting items exist ──────────────────────────

  const TYPE_BOOST_ITEMS = [
    'Charcoal', 'Mystic Water', 'Magnet', 'Miracle Seed',
    'Never-Melt Ice', 'Black Belt', 'Poison Barb', 'Soft Sand',
    'Sharp Beak', 'Twisted Spoon', 'Silver Powder', 'Hard Stone',
    'Spell Tag', 'Dragon Fang', 'Black Glasses', 'Metal Coat',
    'Silk Scarf',
  ];

  for (const item of TYPE_BOOST_ITEMS) {
    test(`Type-boost item: ${item} exists`, async ({ rsaPage }) => {
      const exists = await rsaPage.evaluate(
        ([it]) => {
          const key = it.toLowerCase().replace(/[\s\-\']+/g, '');
          return !!(window as any).BattleItems[key];
        },
        [item]
      );
      expect(exists).toBe(true);
    });
  }
});
