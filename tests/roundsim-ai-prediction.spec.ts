import { test, expect } from './fixtures';

test.describe('AI Switch-In Prediction', () => {

  // ── Speed comparison is critical for scoring ──────────────────

  test('Speed ordering: Scarf user outspeeds non-Scarf', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const fast = w.__rsaTest.calcEffectiveSpeed(
        { item: 'Choice Scarf', ability: '', status: '', boosts: {} }, 100
      );
      const slow = w.__rsaTest.calcEffectiveSpeed(
        { item: '', ability: '', status: '', boosts: {} }, 80
      );
      return { fast, slow, fasterWins: fast > slow };
    });
    expect(result.fast).toBe(150);
    expect(result.slow).toBe(80);
    expect(result.fasterWins).toBe(true);
  });

  // ── Ditto special case (Transform uses target's stats) ────────

  test('Ditto exists in BattlePokedex with correct base stats', async ({ rsaPage }) => {
    const data = await rsaPage.evaluate(() => {
      const ditto = (window as any).BattlePokedex['ditto'];
      return ditto ? { name: ditto.name, types: ditto.types, hp: ditto.baseStats.hp } : null;
    });
    expect(data).toBeTruthy();
    expect(data.name).toBe('Ditto');
    expect(data.types).toEqual(['Normal']);
    expect(data.hp).toBe(48);
  });

  // ── Shadow Tag trapping ───────────────────────────────────────

  test('Wobbuffet has Shadow Tag', async ({ rsaPage }) => {
    const ability = await rsaPage.evaluate(() => {
      const mon = (window as any).BattlePokedex['wobbuffet'];
      return mon ? mon.abilities['0'] : null;
    });
    expect(ability).toBe('Shadow Tag');
  });
});

