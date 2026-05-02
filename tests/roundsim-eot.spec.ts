import { test, expect } from './fixtures';

test.describe('End-of-Turn Damage', () => {

  // ── Burn residual ─────────────────────────────────────────────
  test('Burn deals 1/16 max HP', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: 'Burn', ability: '', item: '', types: ['Normal'] }, 'None'
      );
    });
    const burnEntry = eot.find((e: any) => e.source === 'Burn');
    expect(burnEntry).toBeTruthy();
    expect(burnEntry.damage).toBe(Math.floor(320 / 16));
  });

  test('Burn blocked by Magic Guard', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: 'Burn', ability: 'Magic Guard', item: '', types: ['Normal'] }, 'None'
      );
    });
    const burnEntry = eot.find((e: any) => e.source === 'Burn');
    expect(burnEntry).toBeUndefined();
  });

  test('Burn blocked by Guts', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: 'Burn', ability: 'Guts', item: '', types: ['Normal'] }, 'None'
      );
    });
    const burnEntry = eot.find((e: any) => e.source === 'Burn');
    expect(burnEntry).toBeUndefined();
  });

  // ── Poison residual ───────────────────────────────────────────
  test('Poison deals 1/8 max HP', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 400, status: 'Poison', ability: '', item: '', types: ['Normal'] }, 'None'
      );
    });
    const entry = eot.find((e: any) => e.source === 'Poison');
    expect(entry).toBeTruthy();
    expect(entry.damage).toBe(50); // 400 / 8
  });

  // ── Toxic (Badly Poisoned) ────────────────────────────────────
  test('Toxic deals N/16 based on counter', async ({ rsaPage }) => {
    for (const counter of [1, 3, 8, 15]) {
      const eot = await rsaPage.evaluate(
        ([cnt]) => (window as any).__rsaTest.calcEndOfTurnDamage(
          { maxHP: 320, status: 'Badly Poisoned', ability: '', item: '', types: ['Normal'], toxicCounter: cnt }, 'None'
        ),
        [counter]
      );
      const entry = eot.find((e: any) => e.source.startsWith('Toxic'));
      expect(entry).toBeTruthy();
      expect(entry.damage).toBe(Math.max(1, Math.floor(320 * Math.min(counter, 15) / 16)));
    }
  });

  // ── Poison Heal ───────────────────────────────────────────────
  test('Poison Heal: heals 1/8 when Poisoned', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 400, status: 'Poison', ability: 'Poison Heal', item: '', types: ['Normal'] }, 'None'
      );
    });
    const entry = eot.find((e: any) => e.source === 'Poison Heal');
    expect(entry).toBeTruthy();
    expect(entry.damage).toBe(-50); // negative = healing, 400/8 = 50
  });

  test('Poison Heal: heals 1/8 when Badly Poisoned', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 400, status: 'Badly Poisoned', ability: 'Poison Heal', item: '', types: ['Normal'], toxicCounter: 5 }, 'None'
      );
    });
    const entry = eot.find((e: any) => e.source === 'Poison Heal');
    expect(entry).toBeTruthy();
    expect(entry.damage).toBe(-50); // always 1/8 regardless of toxic counter
    // Should NOT have a Toxic entry
    const toxEntry = eot.find((e: any) => e.source.startsWith('Toxic'));
    expect(toxEntry).toBeUndefined();
  });

  // ── Sandstorm ─────────────────────────────────────────────────
  test('Sandstorm deals 1/16 to non-immune types', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: '', ability: '', item: '', types: ['Normal'] }, 'Sand'
      );
    });
    const entry = eot.find((e: any) => e.source === 'Sandstorm');
    expect(entry).toBeTruthy();
    expect(entry.damage).toBe(20); // 320/16
  });

  test('Sandstorm: Rock type immune', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: '', ability: '', item: '', types: ['Rock'] }, 'Sand'
      );
    });
    expect(eot.find((e: any) => e.source === 'Sandstorm')).toBeUndefined();
  });

  test('Sandstorm: Ground type immune', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: '', ability: '', item: '', types: ['Ground'] }, 'Sand'
      );
    });
    expect(eot.find((e: any) => e.source === 'Sandstorm')).toBeUndefined();
  });

  test('Sandstorm: Steel type immune', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: '', ability: '', item: '', types: ['Steel'] }, 'Sand'
      );
    });
    expect(eot.find((e: any) => e.source === 'Sandstorm')).toBeUndefined();
  });

  test('Sandstorm: Overcoat immune', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: '', ability: 'Overcoat', item: '', types: ['Normal'] }, 'Sand'
      );
    });
    expect(eot.find((e: any) => e.source === 'Sandstorm')).toBeUndefined();
  });

  test('Sandstorm: Magic Guard immune', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: '', ability: 'Magic Guard', item: '', types: ['Normal'] }, 'Sand'
      );
    });
    expect(eot.find((e: any) => e.source === 'Sandstorm')).toBeUndefined();
  });

  // BUG #1: Ice Body, Snow Cloak, Slush Rush should NOT be sandstorm-immune
  test.fail('BUG #1: Ice Body should NOT be sandstorm-immune', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: '', ability: 'Ice Body', item: '', types: ['Normal'] }, 'Sand'
      );
    });
    // Currently FAILS: Ice Body is incorrectly in WEATHER_IMMUNE_ABILITIES
    // After fix, this should find a Sandstorm entry
    expect(eot.find((e: any) => e.source === 'Sandstorm')).toBeTruthy();
  });

  test.fail('BUG #1: Snow Cloak should NOT be sandstorm-immune', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: '', ability: 'Snow Cloak', item: '', types: ['Normal'] }, 'Sand'
      );
    });
    expect(eot.find((e: any) => e.source === 'Sandstorm')).toBeTruthy();
  });

  test.fail('BUG #1: Slush Rush should NOT be sandstorm-immune', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: '', ability: 'Slush Rush', item: '', types: ['Normal'] }, 'Sand'
      );
    });
    expect(eot.find((e: any) => e.source === 'Sandstorm')).toBeTruthy();
  });

  // ── Hail ──────────────────────────────────────────────────────
  test('Hail deals 1/16 to non-Ice types', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: '', ability: '', item: '', types: ['Normal'] }, 'Hail'
      );
    });
    const entry = eot.find((e: any) => e.source === 'Hail');
    expect(entry).toBeTruthy();
    expect(entry.damage).toBe(20);
  });

  test('Hail: Ice type immune', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: '', ability: '', item: '', types: ['Ice'] }, 'Hail'
      );
    });
    expect(eot.find((e: any) => e.source === 'Hail')).toBeUndefined();
  });

  // ── Snow does NOT deal damage ─────────────────────────────────
  test('Snow does NOT deal damage', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: '', ability: '', item: '', types: ['Normal'] }, 'Snow'
      );
    });
    expect(eot.find((e: any) => e.source === 'Hail')).toBeUndefined();
    expect(eot.find((e: any) => e.source === 'Snow')).toBeUndefined();
  });

  // ── Leftovers ─────────────────────────────────────────────────
  test('Leftovers heals 1/16 max HP', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: '', ability: '', item: 'Leftovers', types: ['Normal'] }, 'None'
      );
    });
    const entry = eot.find((e: any) => e.source === 'Leftovers');
    expect(entry).toBeTruthy();
    expect(entry.damage).toBe(-20); // negative = healing
  });

  // ── Black Sludge ──────────────────────────────────────────────
  test('Black Sludge heals 1/16 for Poison-type', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: '', ability: '', item: 'Black Sludge', types: ['Poison'] }, 'None'
      );
    });
    const entry = eot.find((e: any) => e.source === 'Black Sludge');
    expect(entry).toBeTruthy();
    expect(entry.damage).toBe(-20);
  });

  test('Black Sludge damages 1/8 for non-Poison-type', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: '', ability: '', item: 'Black Sludge', types: ['Normal'] }, 'None'
      );
    });
    const entry = eot.find((e: any) => e.source === 'Black Sludge');
    expect(entry).toBeTruthy();
    expect(entry.damage).toBe(40); // 320/8 = 40, positive = damage
  });

  test('Black Sludge damage blocked by Magic Guard for non-Poison', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: '', ability: 'Magic Guard', item: 'Black Sludge', types: ['Normal'] }, 'None'
      );
    });
    const entry = eot.find((e: any) => e.source === 'Black Sludge');
    expect(entry).toBeUndefined(); // Magic Guard blocks the damage
  });

  // ── Grassy Terrain ────────────────────────────────────────────
  test('Grassy Terrain heals 1/16', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: '', ability: '', item: '', types: ['Normal'] }, 'None', 'Grassy'
      );
    });
    const entry = eot.find((e: any) => e.source === 'Grassy Terrain');
    expect(entry).toBeTruthy();
    expect(entry.damage).toBe(-20);
  });

  // BUG #2: Grassy Terrain should NOT heal ungrounded Pokémon
  test.fail('BUG #2: Grassy Terrain should NOT heal Flying types', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: '', ability: '', item: '', types: ['Flying'] }, 'None', 'Grassy'
      );
    });
    // Currently FAILS: Grassy Terrain heals even ungrounded mons
    expect(eot.find((e: any) => e.source === 'Grassy Terrain')).toBeUndefined();
  });

  test.fail('BUG #2: Grassy Terrain should NOT heal Levitate mons', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: '', ability: 'Levitate', item: '', types: ['Normal'] }, 'None', 'Grassy'
      );
    });
    expect(eot.find((e: any) => e.source === 'Grassy Terrain')).toBeUndefined();
  });

  // ── No status, no weather, no items ───────────────────────────
  test('Healthy mon with no items in no weather: empty EOT', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: '', ability: '', item: '', types: ['Normal'] }, 'None'
      );
    });
    expect(eot).toHaveLength(0);
  });

  // ── Combined: Burn + Leftovers + Sandstorm ────────────────────
  test('combined: Burn + Leftovers + Sandstorm', async ({ rsaPage }) => {
    const eot = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.calcEndOfTurnDamage(
        { maxHP: 320, status: 'Burn', ability: '', item: 'Leftovers', types: ['Normal'] }, 'Sand'
      );
    });
    expect(eot).toHaveLength(3);
    const burn = eot.find((e: any) => e.source === 'Burn');
    const left = eot.find((e: any) => e.source === 'Leftovers');
    const sand = eot.find((e: any) => e.source === 'Sandstorm');
    expect(burn!.damage).toBe(20);   // 320/16
    expect(left!.damage).toBe(-20);  // -320/16
    expect(sand!.damage).toBe(20);   // 320/16
    // Net: 20 - 20 + 20 = 20 damage
  });
});
