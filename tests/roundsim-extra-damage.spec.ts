import { test, expect } from './fixtures';

test.describe('Extra Damage Sources', () => {

  // ── Drain moves ───────────────────────────────────────────────

  test('Drain Punch drains 1/2', async ({ rsaPage }) => {
    const drainData = await rsaPage.evaluate(() => {
      const move = (window as any).BattleMovedex['drainpunch'];
      return move ? move.drain : null;
    });
    expect(drainData).toEqual([1, 2]);
  });

  test('Giga Drain drains 1/2', async ({ rsaPage }) => {
    const drainData = await rsaPage.evaluate(() => {
      const move = (window as any).BattleMovedex['gigadrain'];
      return move ? move.drain : null;
    });
    expect(drainData).toEqual([1, 2]);
  });

  test('Oblivion Wing drains 3/4', async ({ rsaPage }) => {
    const drainData = await rsaPage.evaluate(() => {
      const move = (window as any).BattleMovedex['oblivionwing'];
      return move ? move.drain : null;
    });
    expect(drainData).toEqual([3, 4]);
  });

  // ── Recoil moves ──────────────────────────────────────────────

  test('Brave Bird has 33/100 recoil', async ({ rsaPage }) => {
    const recoilData = await rsaPage.evaluate(() => {
      const move = (window as any).BattleMovedex['bravebird'];
      return move ? move.recoil : null;
    });
    expect(recoilData).toEqual([33, 100]);
  });

  test('Double-Edge has 33/100 recoil', async ({ rsaPage }) => {
    const recoilData = await rsaPage.evaluate(() => {
      const move = (window as any).BattleMovedex['doubleedge'];
      return move ? move.recoil : null;
    });
    expect(recoilData).toEqual([33, 100]);
  });

  test('Flare Blitz has 33/100 recoil', async ({ rsaPage }) => {
    const recoilData = await rsaPage.evaluate(() => {
      const move = (window as any).BattleMovedex['flareblitz'];
      return move ? move.recoil : null;
    });
    expect(recoilData).toEqual([33, 100]);
  });

  test('Head Smash has 1/2 recoil', async ({ rsaPage }) => {
    const recoilData = await rsaPage.evaluate(() => {
      const move = (window as any).BattleMovedex['headsmash'];
      return move ? move.recoil : null;
    });
    expect(recoilData).toEqual([1, 2]);
  });

  // ── Magic Guard blocks all residual ───────────────────────────

  test('Magic Guard description mentions "direct attacks"', async ({ rsaPage }) => {
    const desc = await rsaPage.evaluate(() => {
      const ab = (window as any).BattleAbilities['magicguard'];
      return ab ? ab.shortDesc : '';
    });
    expect(desc).toContain('direct attacks');
  });

  test('Rock Head description mentions "recoil"', async ({ rsaPage }) => {
    const desc = await rsaPage.evaluate(() => {
      const ab = (window as any).BattleAbilities['rockhead'];
      return (ab?.shortDesc || ab?.desc || '').toLowerCase();
    });
    expect(desc).toContain('recoil');
  });
});
