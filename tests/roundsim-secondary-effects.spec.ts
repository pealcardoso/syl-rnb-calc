import { test, expect } from './fixtures';

test.describe('Secondary Effects', () => {

  // ── Guaranteed stat drops (100% chance) ───────────────────────

  test('Close Combat: self stat drops -1 Def, -1 SpDef', async ({ rsaPage }) => {
    const move = await rsaPage.evaluate(() => {
      return (window as any).BattleMovedex['closecombat'];
    });
    expect(move).toBeTruthy();
    expect(move.self?.boosts?.def).toBe(-1);
    expect(move.self?.boosts?.spd).toBe(-1);
  });

  test('Superpower: self stat drops -1 Atk, -1 Def', async ({ rsaPage }) => {
    const move = await rsaPage.evaluate(() => {
      return (window as any).BattleMovedex['superpower'];
    });
    expect(move).toBeTruthy();
    expect(move.self?.boosts?.atk).toBe(-1);
    expect(move.self?.boosts?.def).toBe(-1);
  });

  test('Draco Meteor: self -2 SpAtk', async ({ rsaPage }) => {
    const move = await rsaPage.evaluate(() => {
      return (window as any).BattleMovedex['dracometeor'];
    });
    expect(move).toBeTruthy();
    expect(move.self?.boosts?.spa).toBe(-2);
  });

  test('Overheat: self -2 SpAtk', async ({ rsaPage }) => {
    const move = await rsaPage.evaluate(() => {
      return (window as any).BattleMovedex['overheat'];
    });
    expect(move).toBeTruthy();
    expect(move.self?.boosts?.spa).toBe(-2);
  });

  // ── Probabilistic secondary effects ───────────────────────────

  test('Flamethrower: 10% chance to burn', async ({ rsaPage }) => {
    const move = await rsaPage.evaluate(() => {
      return (window as any).BattleMovedex['flamethrower'];
    });
    expect(move.secondary?.chance).toBe(10);
    expect(move.secondary?.status).toBe('brn');
  });

  test('Thunderbolt: 10% chance to paralyze', async ({ rsaPage }) => {
    const move = await rsaPage.evaluate(() => {
      return (window as any).BattleMovedex['thunderbolt'];
    });
    expect(move.secondary?.chance).toBe(10);
    expect(move.secondary?.status).toBe('par');
  });

  test('Thunder: 30% chance to paralyze', async ({ rsaPage }) => {
    const move = await rsaPage.evaluate(() => {
      return (window as any).BattleMovedex['thunder'];
    });
    expect(move.secondary?.chance).toBe(30);
    expect(move.secondary?.status).toBe('par');
  });

  test('Ice Beam: 10% chance to freeze', async ({ rsaPage }) => {
    const move = await rsaPage.evaluate(() => {
      return (window as any).BattleMovedex['icebeam'];
    });
    expect(move.secondary?.chance).toBe(10);
    expect(move.secondary?.status).toBe('frz');
  });

  test('Scald: 30% chance to burn', async ({ rsaPage }) => {
    const move = await rsaPage.evaluate(() => {
      return (window as any).BattleMovedex['scald'];
    });
    expect(move.secondary?.chance).toBe(30);
    expect(move.secondary?.status).toBe('brn');
  });

  // ── Flinch moves ──────────────────────────────────────────────

  test('Fake Out: 100% flinch', async ({ rsaPage }) => {
    const move = await rsaPage.evaluate(() => {
      return (window as any).BattleMovedex['fakeout'];
    });
    expect(move.secondary?.chance).toBe(100);
    expect(move.secondary?.volatileStatus).toBe('flinch');
  });

  test('Iron Head: 30% flinch', async ({ rsaPage }) => {
    const move = await rsaPage.evaluate(() => {
      return (window as any).BattleMovedex['ironhead'];
    });
    expect(move.secondary?.chance).toBe(30);
    expect(move.secondary?.volatileStatus).toBe('flinch');
  });

  test('Rock Slide: 30% flinch', async ({ rsaPage }) => {
    const move = await rsaPage.evaluate(() => {
      return (window as any).BattleMovedex['rockslide'];
    });
    expect(move.secondary?.chance).toBe(30);
    expect(move.secondary?.volatileStatus).toBe('flinch');
  });

  // ── Self-destruct / Explosion ─────────────────────────────────

  test('Self-Destruct has selfdestruct flag', async ({ rsaPage }) => {
    const move = await rsaPage.evaluate(() => {
      return (window as any).BattleMovedex['selfdestruct'];
    });
    expect(move.selfdestruct).toBeTruthy();
  });

  test('Explosion has selfdestruct flag', async ({ rsaPage }) => {
    const move = await rsaPage.evaluate(() => {
      return (window as any).BattleMovedex['explosion'];
    });
    expect(move.selfdestruct).toBeTruthy();
  });

  // ── Priority moves ───────────────────────────────────────────

  const PRIORITY_CASES = [
    { move: 'extremespeed', priority: 2, label: 'Extreme Speed (+2)' },
    { move: 'fakeout', priority: 3, label: 'Fake Out (+3)' },
    { move: 'quickattack', priority: 1, label: 'Quick Attack (+1)' },
    { move: 'machpunch', priority: 1, label: 'Mach Punch (+1)' },
    { move: 'bulletpunch', priority: 1, label: 'Bullet Punch (+1)' },
    { move: 'suckerpunch', priority: 1, label: 'Sucker Punch (+1)' },
    { move: 'aquajet', priority: 1, label: 'Aqua Jet (+1)' },
    { move: 'trickroom', priority: -7, label: 'Trick Room (-7)' },
  ];

  for (const tc of PRIORITY_CASES) {
    test(`Priority: ${tc.label}`, async ({ rsaPage }) => {
      const priority = await rsaPage.evaluate(
        ([key]) => {
          const move = (window as any).BattleMovedex[key];
          return move ? move.priority : undefined;
        },
        [tc.move]
      );
      expect(priority).toBe(tc.priority);
    });
  }

  // ── Move categories ───────────────────────────────────────────

  test('Close Combat is Physical', async ({ rsaPage }) => {
    const cat = await rsaPage.evaluate(() => (window as any).BattleMovedex['closecombat'].category);
    expect(cat).toBe('Physical');
  });

  test('Draco Meteor is Special', async ({ rsaPage }) => {
    const cat = await rsaPage.evaluate(() => (window as any).BattleMovedex['dracometeor'].category);
    expect(cat).toBe('Special');
  });

  test('Trick Room is Status', async ({ rsaPage }) => {
    const cat = await rsaPage.evaluate(() => (window as any).BattleMovedex['trickroom'].category);
    expect(cat).toBe('Status');
  });

  // ── Contact flag ──────────────────────────────────────────────

  test('Close Combat is a contact move', async ({ rsaPage }) => {
    const contact = await rsaPage.evaluate(() => {
      const m = (window as any).BattleMovedex['closecombat'];
      return !!(m.flags && m.flags.contact);
    });
    expect(contact).toBe(true);
  });

  test('Earthquake is NOT a contact move', async ({ rsaPage }) => {
    const contact = await rsaPage.evaluate(() => {
      const m = (window as any).BattleMovedex['earthquake'];
      return !!(m.flags && m.flags.contact);
    });
    expect(contact).toBe(false);
  });

  test('Thunderbolt is NOT a contact move', async ({ rsaPage }) => {
    const contact = await rsaPage.evaluate(() => {
      const m = (window as any).BattleMovedex['thunderbolt'];
      return !!(m.flags && m.flags.contact);
    });
    expect(contact).toBe(false);
  });
});
