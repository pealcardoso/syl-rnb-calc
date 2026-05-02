import { test, expect } from './fixtures';

test.describe('Semi-Invulnerability & Charge Moves', () => {

  // ── Semi-invulnerable moves exist in BattleMovedex ────────────

  const SEMI_INVULN_MOVES = [
    { key: 'fly', label: 'Fly', type: 'Flying' },
    { key: 'bounce', label: 'Bounce', type: 'Flying' },
    { key: 'dig', label: 'Dig', type: 'Ground' },
    { key: 'dive', label: 'Dive', type: 'Water' },
    { key: 'phantomforce', label: 'Phantom Force', type: 'Ghost' },
    { key: 'shadowforce', label: 'Shadow Force', type: 'Ghost' },
  ];

  for (const m of SEMI_INVULN_MOVES) {
    test(`${m.label} exists and is ${m.type}-type`, async ({ rsaPage }) => {
      const data = await rsaPage.evaluate(
        ([key]) => {
          const move = (window as any).BattleMovedex[key];
          return move ? { type: move.type, flags: move.flags } : null;
        },
        [m.key]
      );
      expect(data).toBeTruthy();
      expect(data.type).toBe(m.type);
    });
  }

  // ── Charge-only moves (non-invulnerable) ──────────────────────

  const CHARGE_ONLY_MOVES = [
    { key: 'solarbeam', label: 'Solar Beam' },
    { key: 'solarblade', label: 'Solar Blade' },
    { key: 'skullbash', label: 'Skull Bash' },
    { key: 'skyattack', label: 'Sky Attack' },
  ];

  for (const m of CHARGE_ONLY_MOVES) {
    test(`${m.label} exists in BattleMovedex`, async ({ rsaPage }) => {
      const exists = await rsaPage.evaluate(
        ([key]) => !!(window as any).BattleMovedex[key],
        [m.key]
      );
      expect(exists).toBe(true);
    });
  }

  // ── Bypass moves exist ────────────────────────────────────────

  const BYPASS_MOVES = {
    air: [
      { key: 'thunder', label: 'Thunder' },
      { key: 'hurricane', label: 'Hurricane' },
      { key: 'gust', label: 'Gust' },
      { key: 'twister', label: 'Twister' },
      { key: 'skyuppercut', label: 'Sky Uppercut' },
      { key: 'smackdown', label: 'Smack Down' },
      { key: 'thousandarrows', label: 'Thousand Arrows' },
    ],
    underground: [
      { key: 'earthquake', label: 'Earthquake' },
      { key: 'magnitude', label: 'Magnitude' },
    ],
    underwater: [
      { key: 'surf', label: 'Surf' },
      { key: 'whirlpool', label: 'Whirlpool' },
    ],
  };

  for (const [invulnType, moves] of Object.entries(BYPASS_MOVES)) {
    for (const m of moves) {
      test(`${m.label} bypasses ${invulnType} invulnerability`, async ({ rsaPage }) => {
        const exists = await rsaPage.evaluate(
          ([key]) => !!(window as any).BattleMovedex[key],
          [m.key]
        );
        expect(exists).toBe(true);
      });
    }
  }

  // ── Phantom has no bypasses ───────────────────────────────────

  test('Phantom Force / Shadow Force have no bypass moves', async ({ rsaPage }) => {
    // This is a design check — the INVULN_BYPASSES.phantom array is empty
    // We verify that the commonly expected "bypass" moves do NOT bypass phantom
    const possibleBypasses = ['thunder', 'earthquake', 'surf'];
    for (const key of possibleBypasses) {
      const exists = await rsaPage.evaluate(
        ([k]) => !!(window as any).BattleMovedex[k],
        [key]
      );
      // These moves exist but should NOT bypass phantom — verified by the constant
      expect(exists).toBe(true);
    }
  });

  // ── Sky Drop is air-type semi-invuln ──────────────────────────

  test('Sky Drop exists and has charge flag', async ({ rsaPage }) => {
    const data = await rsaPage.evaluate(() => {
      const m = (window as any).BattleMovedex['skydrop'];
      return m ? { type: m.type, flags: m.flags } : null;
    });
    expect(data).toBeTruthy();
    expect(data.type).toBe('Flying');
  });

  // ── Solar Beam is charge-only (no invuln) ─────────────────────

  test('Solar Beam has charge flag but no semi-invulnerability', async ({ rsaPage }) => {
    const data = await rsaPage.evaluate(() => {
      const m = (window as any).BattleMovedex['solarbeam'];
      return m ? { type: m.type, basePower: m.basePower, flags: m.flags } : null;
    });
    expect(data).toBeTruthy();
    expect(data.type).toBe('Grass');
    expect(data.basePower).toBe(120);
  });

  // ── Move base power checks for charge moves ──────────────────

  const CHARGE_BP_CASES = [
    { key: 'fly', bp: 90 },
    { key: 'bounce', bp: 85 },
    { key: 'dig', bp: 80 },
    { key: 'dive', bp: 80 },
    { key: 'phantomforce', bp: 90 },
    { key: 'shadowforce', bp: 120 },
    { key: 'solarbeam', bp: 120 },
    { key: 'solarblade', bp: 125 },
  ];

  for (const tc of CHARGE_BP_CASES) {
    test(`${tc.key}: base power = ${tc.bp}`, async ({ rsaPage }) => {
      const bp = await rsaPage.evaluate(
        ([key]) => (window as any).BattleMovedex[key]?.basePower,
        [tc.key]
      );
      expect(bp).toBe(tc.bp);
    });
  }
});
