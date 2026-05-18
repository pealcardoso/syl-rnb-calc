import { test, expect } from './fixtures';

test.describe('Semi-Invulnerability & Charge Moves', () => {

  // ── Semi-invulnerable moves type verification ─────────────────

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
