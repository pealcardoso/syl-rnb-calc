import { test, expect } from './fixtures';

test.describe('Survival Checks', () => {

  // ── Focus Sash ────────────────────────────────────────────────

  test('Focus Sash: survives OHKO from full HP', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.applySurvivalChecks(
        { item: 'Focus Sash', ability: '' },
        0, // hpAfter (would be KO'd)
        300, // hpBefore (full HP)
        300, // maxHP
        '' // attacker ability
      );
    });
    expect(result.survived).toBe(true);
    expect(result.sashed).toBe(true);
  });

  test('Focus Sash: does not activate if not at full HP', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.applySurvivalChecks(
        { item: 'Focus Sash', ability: '' },
        0,
        250, // not full HP
        300,
        ''
      );
    });
    expect(result.survived).toBe(false);
  });

  test('Focus Sash: NOT blocked by Mold Breaker (it\'s an item)', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.applySurvivalChecks(
        { item: 'Focus Sash', ability: '' },
        0, 300, 300,
        'Mold Breaker'
      );
    });
    expect(result.survived).toBe(true);
    expect(result.sashed).toBe(true);
  });

  test('Focus Sash: NOT blocked by Turboblaze', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.applySurvivalChecks(
        { item: 'Focus Sash', ability: '' },
        0, 300, 300,
        'Turboblaze'
      );
    });
    expect(result.survived).toBe(true);
  });

  // ── Sturdy ────────────────────────────────────────────────────

  test('Sturdy: survives OHKO from full HP', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.applySurvivalChecks(
        { item: '', ability: 'Sturdy' },
        0, 300, 300,
        '' // no Mold Breaker
      );
    });
    expect(result.survived).toBe(true);
    expect(result.sturdied).toBe(true);
  });

  test('Sturdy: does not activate if not at full HP', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.applySurvivalChecks(
        { item: '', ability: 'Sturdy' },
        0, 250, 300,
        ''
      );
    });
    expect(result.survived).toBe(false);
  });

  test('Sturdy: blocked by Mold Breaker', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.applySurvivalChecks(
        { item: '', ability: 'Sturdy' },
        0, 300, 300,
        'Mold Breaker'
      );
    });
    expect(result.survived).toBe(false);
  });

  test('Sturdy: blocked by Turboblaze', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.applySurvivalChecks(
        { item: '', ability: 'Sturdy' },
        0, 300, 300,
        'Turboblaze'
      );
    });
    expect(result.survived).toBe(false);
  });

  test('Sturdy: blocked by Teravolt', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.applySurvivalChecks(
        { item: '', ability: 'Sturdy' },
        0, 300, 300,
        'Teravolt'
      );
    });
    expect(result.survived).toBe(false);
  });

  // BUG #4: Mycelium Might should NOT bypass Sturdy on damage moves
  test('Sturdy blocked by Mycelium Might (current behavior — BUG)', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.applySurvivalChecks(
        { item: '', ability: 'Sturdy' },
        0, 300, 300,
        'Mycelium Might'
      );
    });
    // Current behavior: Mycelium Might is treated as full Mold Breaker
    // This SHOULD be survived: true (Mycelium Might only bypasses for status moves)
    expect(result.survived).toBe(false); // This confirms the bug exists
  });

  // ── No survival needed ────────────────────────────────────────

  test('Not KO\'d: no survival check needed', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.applySurvivalChecks(
        { item: 'Focus Sash', ability: 'Sturdy' },
        50, 300, 300, // HP after > 0
        ''
      );
    });
    expect(result.survived).toBe(false); // didn't need to survive
    expect(result.sashed).toBe(false);
    expect(result.sturdied).toBe(false);
  });

  test('Already fainted: no survival check', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.applySurvivalChecks(
        { item: 'Focus Sash', ability: 'Sturdy' },
        0, 0, 300, // hpBefore = 0 (already fainted)
        ''
      );
    });
    expect(result.survived).toBe(false);
  });

  // ── Focus Sash takes priority over Sturdy ─────────────────────

  test('Focus Sash + Sturdy: Sash activates first', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.applySurvivalChecks(
        { item: 'Focus Sash', ability: 'Sturdy' },
        0, 300, 300,
        ''
      );
    });
    expect(result.survived).toBe(true);
    expect(result.sashed).toBe(true);
    // Sash is checked first; Sturdy check never reached
    expect(result.sturdied).toBe(false);
  });
});
