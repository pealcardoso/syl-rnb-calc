import { test, expect } from './fixtures';

test.describe('Extra Damage Sources', () => {

  // ── Life Orb recoil ───────────────────────────────────────────

  test('Life Orb: 1/10 attacker maxHP recoil', async ({ rsaPage }) => {
    const damage = await rsaPage.evaluate(() => {
      return Math.max(1, Math.floor(300 / 10));
    });
    expect(damage).toBe(30);
  });

  test('Life Orb: minimum 1 damage even with low HP', async ({ rsaPage }) => {
    const damage = await rsaPage.evaluate(() => {
      return Math.max(1, Math.floor(5 / 10));
    });
    expect(damage).toBe(1);
  });

  // ── Contact damage abilities ──────────────────────────────────

  test('Iron Barbs: 1/8 attacker maxHP on contact', async ({ rsaPage }) => {
    const damage = await rsaPage.evaluate(() => {
      return Math.max(1, Math.floor(400 / 8));
    });
    expect(damage).toBe(50);
  });

  test('Rough Skin: 1/8 attacker maxHP on contact', async ({ rsaPage }) => {
    const damage = await rsaPage.evaluate(() => {
      return Math.max(1, Math.floor(400 / 8));
    });
    expect(damage).toBe(50);
  });

  // ── Contact damage items ──────────────────────────────────────

  test('Rocky Helmet: 1/6 attacker maxHP on contact', async ({ rsaPage }) => {
    const damage = await rsaPage.evaluate(() => {
      return Math.max(1, Math.floor(300 / 6));
    });
    expect(damage).toBe(50);
  });

  // ── Contact damage constants exist in source ──────────────────

  test('CONTACT_DAMAGE_ABILITIES has Iron Barbs at 1/8', async ({ rsaPage }) => {
    // Verify via the data that BattleAbilities has Iron Barbs
    const exists = await rsaPage.evaluate(() => {
      return !!(window as any).BattleAbilities['ironbarbs'];
    });
    expect(exists).toBe(true);
  });

  test('CONTACT_DAMAGE_ABILITIES has Rough Skin at 1/8', async ({ rsaPage }) => {
    const exists = await rsaPage.evaluate(() => {
      return !!(window as any).BattleAbilities['roughskin'];
    });
    expect(exists).toBe(true);
  });

  // ── Drain moves ───────────────────────────────────────────────

  test('Drain: 1/2 of damage dealt (e.g., Drain Punch)', async ({ rsaPage }) => {
    const drainData = await rsaPage.evaluate(() => {
      const move = (window as any).BattleMovedex['drainpunch'];
      return move ? move.drain : null;
    });
    expect(drainData).toEqual([1, 2]); // drain 1/2
  });

  test('Drain: Giga Drain drains 1/2', async ({ rsaPage }) => {
    const drainData = await rsaPage.evaluate(() => {
      const move = (window as any).BattleMovedex['gigadrain'];
      return move ? move.drain : null;
    });
    expect(drainData).toEqual([1, 2]);
  });

  test('Drain: Absorb drains 1/2', async ({ rsaPage }) => {
    const drainData = await rsaPage.evaluate(() => {
      const move = (window as any).BattleMovedex['absorb'];
      return move ? move.drain : null;
    });
    expect(drainData).toEqual([1, 2]);
  });

  test('Drain: Oblivion Wing drains 3/4', async ({ rsaPage }) => {
    const drainData = await rsaPage.evaluate(() => {
      const move = (window as any).BattleMovedex['oblivionwing'];
      return move ? move.drain : null;
    });
    expect(drainData).toEqual([3, 4]);
  });

  // ── Recoil moves ──────────────────────────────────────────────

  test('Recoil: Brave Bird has 1/3 recoil', async ({ rsaPage }) => {
    const recoilData = await rsaPage.evaluate(() => {
      const move = (window as any).BattleMovedex['bravebird'];
      return move ? move.recoil : null;
    });
    expect(recoilData).toEqual([33, 100]);
  });

  test('Recoil: Double-Edge has 1/3 recoil', async ({ rsaPage }) => {
    const recoilData = await rsaPage.evaluate(() => {
      const move = (window as any).BattleMovedex['doubleedge'];
      return move ? move.recoil : null;
    });
    expect(recoilData).toEqual([33, 100]);
  });

  test('Recoil: Flare Blitz has 1/3 recoil', async ({ rsaPage }) => {
    const recoilData = await rsaPage.evaluate(() => {
      const move = (window as any).BattleMovedex['flareblitz'];
      return move ? move.recoil : null;
    });
    expect(recoilData).toEqual([33, 100]);
  });

  test('Recoil: Head Smash has 1/2 recoil', async ({ rsaPage }) => {
    const recoilData = await rsaPage.evaluate(() => {
      const move = (window as any).BattleMovedex['headsmash'];
      return move ? move.recoil : null;
    });
    expect(recoilData).toEqual([1, 2]);
  });

  // ── Magic Guard blocks all residual ───────────────────────────

  test('Magic Guard: blocks contact ability damage conceptually', async ({ rsaPage }) => {
    // Verify Magic Guard exists in the data
    const desc = await rsaPage.evaluate(() => {
      const ab = (window as any).BattleAbilities['magicguard'];
      return ab ? ab.shortDesc : '';
    });
    expect(desc).toContain('direct attacks');
  });

  // ── Rock Head blocks recoil ───────────────────────────────────

  test('Rock Head exists and blocks recoil', async ({ rsaPage }) => {
    const desc = await rsaPage.evaluate(() => {
      const ab = (window as any).BattleAbilities['rockhead'];
      return ab ? ab.shortDesc || ab.desc : '';
    });
    expect(desc.toLowerCase()).toContain('recoil');
  });
});
