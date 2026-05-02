import { test, expect } from './fixtures';

/**
 * Tests for Phase 3 EffectsRegistry features — new battle-flow effects
 * added to the round simulator that were not previously modeled:
 *
 *   - priorityMod        (Prankster, Gale Wings, Triage, Stall)
 *   - moveLastInBracket  (Lagging Tail, Full Incense)
 *   - hazardImmunity     (Heavy-Duty Boots)
 *   - contactAvoidance   (Protective Pads, Punching Glove)
 *   - eotDamage          (Sticky Barb)
 *
 * Strategy mirrors the rest of the suite: assert the registry data is correct
 * (canonical source of truth) and replicate the engine logic for behavior
 * verification. The engine itself is exercised by the full 338-test regression.
 */

test.describe('EffectsRegistry — Phase 3 features', () => {

  // ════════════════════════════════════════════════════════════
  // priorityMod
  // ════════════════════════════════════════════════════════════
  test.describe('priorityMod', () => {
    test('Prankster: +1 priority on Status moves', async ({ rsaPage }) => {
      const e = await rsaPage.evaluate(() =>
        (window as any).EffectsRegistry.ability('Prankster')
      );
      expect(e).toBeTruthy();
      expect(e.priorityMod).toBeTruthy();
      expect(e.priorityMod.boost).toBe(1);
      expect(e.priorityMod.condition.category).toBe('Status');
    });

    test('Gale Wings: +1 priority on Flying moves at full HP', async ({ rsaPage }) => {
      const e = await rsaPage.evaluate(() =>
        (window as any).EffectsRegistry.ability('Gale Wings')
      );
      expect(e).toBeTruthy();
      expect(e.priorityMod.boost).toBe(1);
      expect(e.priorityMod.condition.moveType).toBe('Flying');
      expect(e.priorityMod.condition.fullHP).toBe(true);
    });

    test('Triage: +3 priority on healing moves', async ({ rsaPage }) => {
      const e = await rsaPage.evaluate(() =>
        (window as any).EffectsRegistry.ability('Triage')
      );
      expect(e).toBeTruthy();
      expect(e.priorityMod.boost).toBe(3);
      expect(e.priorityMod.condition.isHealing).toBe(true);
    });

    test('Stall: alwaysLast condition (no boost, moves last in bracket)', async ({ rsaPage }) => {
      const e = await rsaPage.evaluate(() =>
        (window as any).EffectsRegistry.ability('Stall')
      );
      expect(e).toBeTruthy();
      expect(e.priorityMod.condition.alwaysLast).toBe(true);
    });

    // Replicated logic check — mirrors applyAbilityPriorityMod() in roundsim_app.js
    test('logic: Prankster boosts Thunder Wave (Status) by +1', async ({ rsaPage }) => {
      const result = await rsaPage.evaluate(() => {
        const reg = (window as any).EffectsRegistry;
        const moveData = (window as any).BattleMovedex['thunderwave']; // category: Status
        const entry = { ability: 'Prankster', currentHP: 100, maxHP: 100 };
        const ae = reg.ability(entry.ability);
        if (!ae || !ae.priorityMod) return 0;
        const c = ae.priorityMod.condition || {};
        if (c.alwaysLast) return 0;
        if (c.category && moveData.category !== c.category) return 0;
        if (c.fullHP && entry.currentHP < entry.maxHP) return 0;
        return ae.priorityMod.boost;
      });
      expect(result).toBe(1);
    });

    test('logic: Prankster does NOT boost a damaging move', async ({ rsaPage }) => {
      const result = await rsaPage.evaluate(() => {
        const reg = (window as any).EffectsRegistry;
        const moveData = (window as any).BattleMovedex['tackle']; // category: Physical
        const entry = { ability: 'Prankster', currentHP: 100, maxHP: 100 };
        const ae = reg.ability(entry.ability);
        const c = ae.priorityMod.condition || {};
        if (c.category && moveData.category !== c.category) return 0;
        return ae.priorityMod.boost;
      });
      expect(result).toBe(0);
    });

    test('logic: Gale Wings boosts Brave Bird at full HP', async ({ rsaPage }) => {
      const result = await rsaPage.evaluate(() => {
        const reg = (window as any).EffectsRegistry;
        const moveData = (window as any).BattleMovedex['bravebird']; // type: Flying
        const entry = { ability: 'Gale Wings', currentHP: 100, maxHP: 100 };
        const ae = reg.ability(entry.ability);
        const c = ae.priorityMod.condition || {};
        if (c.moveType && moveData.type !== c.moveType) return 0;
        if (c.fullHP && entry.currentHP < entry.maxHP) return 0;
        return ae.priorityMod.boost;
      });
      expect(result).toBe(1);
    });

    test('logic: Gale Wings does NOT boost Brave Bird at <100% HP', async ({ rsaPage }) => {
      const result = await rsaPage.evaluate(() => {
        const reg = (window as any).EffectsRegistry;
        const moveData = (window as any).BattleMovedex['bravebird'];
        const entry = { ability: 'Gale Wings', currentHP: 99, maxHP: 100 };
        const ae = reg.ability(entry.ability);
        const c = ae.priorityMod.condition || {};
        if (c.moveType && moveData.type !== c.moveType) return 0;
        if (c.fullHP && entry.currentHP < entry.maxHP) return 0;
        return ae.priorityMod.boost;
      });
      expect(result).toBe(0);
    });

    test('logic: Triage boosts Drain Punch (drain move)', async ({ rsaPage }) => {
      const result = await rsaPage.evaluate(() => {
        const reg = (window as any).EffectsRegistry;
        const moveData = (window as any).BattleMovedex['drainpunch']; // has drain
        const ae = reg.ability('Triage');
        const c = ae.priorityMod.condition || {};
        if (c.isHealing && !(moveData.heal || moveData.drain)) return 0;
        return ae.priorityMod.boost;
      });
      expect(result).toBe(3);
    });

    test('logic: Triage boosts Recover (heal move)', async ({ rsaPage }) => {
      const result = await rsaPage.evaluate(() => {
        const reg = (window as any).EffectsRegistry;
        const moveData = (window as any).BattleMovedex['recover']; // has heal
        const ae = reg.ability('Triage');
        const c = ae.priorityMod.condition || {};
        if (c.isHealing && !(moveData.heal || moveData.drain)) return 0;
        return ae.priorityMod.boost;
      });
      expect(result).toBe(3);
    });

    test('logic: Triage does NOT boost a regular damaging move', async ({ rsaPage }) => {
      const result = await rsaPage.evaluate(() => {
        const reg = (window as any).EffectsRegistry;
        const moveData = (window as any).BattleMovedex['tackle'];
        const ae = reg.ability('Triage');
        const c = ae.priorityMod.condition || {};
        if (c.isHealing && !(moveData.heal || moveData.drain)) return 0;
        return ae.priorityMod.boost;
      });
      expect(result).toBe(0);
    });
  });

  // ════════════════════════════════════════════════════════════
  // moveLastInBracket
  // ════════════════════════════════════════════════════════════
  test.describe('moveLastInBracket', () => {
    test('Lagging Tail: moveLastInBracket=true', async ({ rsaPage }) => {
      const e = await rsaPage.evaluate(() =>
        (window as any).EffectsRegistry.item('Lagging Tail')
      );
      expect(e).toBeTruthy();
      expect(e.moveLastInBracket).toBe(true);
    });

    test('Full Incense: moveLastInBracket=true', async ({ rsaPage }) => {
      const e = await rsaPage.evaluate(() =>
        (window as any).EffectsRegistry.item('Full Incense')
      );
      expect(e).toBeTruthy();
      expect(e.moveLastInBracket).toBe(true);
    });

    test('logic: faster mon with Lagging Tail moves last vs slower opponent', async ({ rsaPage }) => {
      const winner = await rsaPage.evaluate(() => {
        const reg = (window as any).EffectsRegistry;
        function movesLast(entry: any) {
          const ie = reg.item(entry.item);
          if (ie && ie.moveLastInBracket) return true;
          const ae = reg.ability(entry.ability);
          if (ae && ae.priorityMod && ae.priorityMod.condition && ae.priorityMod.condition.alwaysLast) return true;
          return false;
        }
        const p1 = { item: 'Lagging Tail', ability: '', speed: 200 };
        const p2 = { item: '', ability: '', speed: 100 };
        // Both same priority bracket, p1 faster but movesLast → p2 goes first
        if (movesLast(p1) && !movesLast(p2)) return 'p2';
        if (movesLast(p2) && !movesLast(p1)) return 'p1';
        return p1.speed > p2.speed ? 'p1' : 'p2';
      });
      expect(winner).toBe('p2');
    });

    test('logic: Stall ability also moves last in bracket', async ({ rsaPage }) => {
      const winner = await rsaPage.evaluate(() => {
        const reg = (window as any).EffectsRegistry;
        function movesLast(entry: any) {
          const ie = reg.item(entry.item);
          if (ie && ie.moveLastInBracket) return true;
          const ae = reg.ability(entry.ability);
          if (ae && ae.priorityMod && ae.priorityMod.condition && ae.priorityMod.condition.alwaysLast) return true;
          return false;
        }
        const p1 = { item: '', ability: 'Stall', speed: 200 };
        const p2 = { item: '', ability: '', speed: 100 };
        if (movesLast(p1) && !movesLast(p2)) return 'p2';
        if (movesLast(p2) && !movesLast(p1)) return 'p1';
        return p1.speed > p2.speed ? 'p1' : 'p2';
      });
      expect(winner).toBe('p2');
    });

    test('logic: both holders cancel out — speed decides', async ({ rsaPage }) => {
      const winner = await rsaPage.evaluate(() => {
        const reg = (window as any).EffectsRegistry;
        function movesLast(entry: any) {
          const ie = reg.item(entry.item);
          if (ie && ie.moveLastInBracket) return true;
          return false;
        }
        const p1 = { item: 'Lagging Tail', ability: '', speed: 200 };
        const p2 = { item: 'Full Incense', ability: '', speed: 100 };
        if (movesLast(p1) && !movesLast(p2)) return 'p2';
        if (movesLast(p2) && !movesLast(p1)) return 'p1';
        return p1.speed > p2.speed ? 'p1' : 'p2';
      });
      expect(winner).toBe('p1');
    });
  });

  // ════════════════════════════════════════════════════════════
  // hazardImmunity (Heavy-Duty Boots)
  // ════════════════════════════════════════════════════════════
  test.describe('hazardImmunity', () => {
    test('Heavy-Duty Boots: hazardImmunity=true', async ({ rsaPage }) => {
      const e = await rsaPage.evaluate(() =>
        (window as any).EffectsRegistry.item('Heavy-Duty Boots')
      );
      expect(e).toBeTruthy();
      expect(e.hazardImmunity).toBe(true);
    });

    test('logic: Heavy-Duty Boots blocks all Stealth Rock damage', async ({ rsaPage }) => {
      const result = await rsaPage.evaluate(() => {
        const reg = (window as any).EffectsRegistry;
        const entry = { types: ['Fire', 'Flying'], item: 'Heavy-Duty Boots', ability: '', maxHP: 200 };
        const itemEff = reg.item(entry.item);
        if (itemEff && itemEff.hazardImmunity) return { damage: 0, status: '' };
        return { damage: 50, status: '' }; // would be 4× SR otherwise
      });
      expect(result.damage).toBe(0);
      expect(result.status).toBe('');
    });

    test('logic: Heavy-Duty Boots blocks Toxic Spikes status', async ({ rsaPage }) => {
      const result = await rsaPage.evaluate(() => {
        const reg = (window as any).EffectsRegistry;
        const entry = { types: ['Normal'], item: 'Heavy-Duty Boots', ability: '', maxHP: 200 };
        const itemEff = reg.item(entry.item);
        if (itemEff && itemEff.hazardImmunity) return { damage: 0, status: '' };
        return { damage: 0, status: 'Badly Poisoned' };
      });
      expect(result.status).toBe('');
    });

    test('logic: without Heavy-Duty Boots, Fire/Flying takes 4× SR', async ({ rsaPage }) => {
      const result = await rsaPage.evaluate(() => {
        const entry = { types: ['Fire', 'Flying'], item: '', ability: '', maxHP: 200 };
        return (window as any).__rsaTest.calcEntryHazardDamage(entry, { sr: true, spikes: 0, tspikes: 0, stickyWeb: false });
      });
      // 200 * 4 / 8 = 100
      expect(result.damage).toBe(100);
    });
  });

  // ════════════════════════════════════════════════════════════
  // contactAvoidance (Protective Pads / Punching Glove)
  // ════════════════════════════════════════════════════════════
  test.describe('contactAvoidance', () => {
    test('Protective Pads: contactAvoidance=true', async ({ rsaPage }) => {
      const e = await rsaPage.evaluate(() =>
        (window as any).EffectsRegistry.item('Protective Pads')
      );
      expect(e).toBeTruthy();
      expect(e.contactAvoidance).toBe(true);
    });

    test('Punching Glove: contactAvoidance=true', async ({ rsaPage }) => {
      const e = await rsaPage.evaluate(() =>
        (window as any).EffectsRegistry.item('Punching Glove')
      );
      expect(e).toBeTruthy();
      expect(e.contactAvoidance).toBe(true);
    });

    test('logic: Protective Pads attacker takes no Rocky Helmet recoil', async ({ rsaPage }) => {
      const recoil = await rsaPage.evaluate(() => {
        const reg = (window as any).EffectsRegistry;
        const attacker = { item: 'Protective Pads', ability: '', maxHP: 300 };
        const defender = { item: 'Rocky Helmet', ability: '' };
        const move = { makesContact: true };
        const atkItemEff = reg.item(attacker.item);
        const atkContactAvoid = !!(atkItemEff && atkItemEff.contactAvoidance);
        const isContact = !!move.makesContact;
        if (!isContact || atkContactAvoid) return 0;
        return Math.max(1, Math.floor(attacker.maxHP / 6));
      });
      expect(recoil).toBe(0);
    });

    test('logic: Punching Glove attacker takes no Iron Barbs recoil', async ({ rsaPage }) => {
      const recoil = await rsaPage.evaluate(() => {
        const reg = (window as any).EffectsRegistry;
        const attacker = { item: 'Punching Glove', ability: '', maxHP: 400 };
        const defender = { item: '', ability: 'Iron Barbs' };
        const move = { makesContact: true };
        const atkItemEff = reg.item(attacker.item);
        const atkContactAvoid = !!(atkItemEff && atkItemEff.contactAvoidance);
        const isContact = !!move.makesContact;
        if (!isContact || atkContactAvoid) return 0;
        return Math.max(1, Math.floor(attacker.maxHP / 8));
      });
      expect(recoil).toBe(0);
    });

    test('logic: WITHOUT Protective Pads, attacker takes Rocky Helmet recoil', async ({ rsaPage }) => {
      const recoil = await rsaPage.evaluate(() => {
        const reg = (window as any).EffectsRegistry;
        const attacker = { item: '', ability: '', maxHP: 300 };
        const move = { makesContact: true };
        const atkItemEff = reg.item(attacker.item);
        const atkContactAvoid = !!(atkItemEff && atkItemEff.contactAvoidance);
        if (atkContactAvoid) return 0;
        return Math.max(1, Math.floor(attacker.maxHP / 6));
      });
      expect(recoil).toBe(50);
    });
  });

  // ════════════════════════════════════════════════════════════
  // eotDamage (Sticky Barb)
  // ════════════════════════════════════════════════════════════
  test.describe('eotDamage', () => {
    test('Sticky Barb: eotDamage=1/8', async ({ rsaPage }) => {
      const e = await rsaPage.evaluate(() =>
        (window as any).EffectsRegistry.item('Sticky Barb')
      );
      expect(e).toBeTruthy();
      expect(e.eotDamage).toBeTruthy();
      expect(e.eotDamage.frac).toBeCloseTo(1 / 8, 5);
    });

    test('logic: Sticky Barb deals 1/8 max HP per turn', async ({ rsaPage }) => {
      const dmg = await rsaPage.evaluate(() => {
        const reg = (window as any).EffectsRegistry;
        const entry = { item: 'Sticky Barb', ability: '', maxHP: 200 };
        const itemEff = reg.item(entry.item);
        const hasMagicGuard = false;
        if (itemEff && itemEff.eotDamage && !hasMagicGuard) {
          return Math.max(1, Math.floor(entry.maxHP * itemEff.eotDamage.frac));
        }
        return 0;
      });
      expect(dmg).toBe(25);
    });

    test('logic: Magic Guard blocks Sticky Barb damage', async ({ rsaPage }) => {
      const dmg = await rsaPage.evaluate(() => {
        const reg = (window as any).EffectsRegistry;
        const entry = { item: 'Sticky Barb', ability: 'Magic Guard', maxHP: 200 };
        const itemEff = reg.item(entry.item);
        const abilEff = reg.ability(entry.ability);
        const hasMagicGuard = !!(abilEff && abilEff.indirectDamageImmunity);
        if (itemEff && itemEff.eotDamage && !hasMagicGuard) {
          return Math.max(1, Math.floor(entry.maxHP * itemEff.eotDamage.frac));
        }
        return 0;
      });
      expect(dmg).toBe(0);
    });

    test('logic: Sticky Barb deals minimum 1 damage with low HP', async ({ rsaPage }) => {
      const dmg = await rsaPage.evaluate(() => {
        const reg = (window as any).EffectsRegistry;
        const entry = { item: 'Sticky Barb', ability: '', maxHP: 4 };
        const itemEff = reg.item(entry.item);
        if (itemEff && itemEff.eotDamage) {
          return Math.max(1, Math.floor(entry.maxHP * itemEff.eotDamage.frac));
        }
        return 0;
      });
      expect(dmg).toBe(1);
    });
  });

  // ════════════════════════════════════════════════════════════
  // Registry plumbing
  // ════════════════════════════════════════════════════════════
  test.describe('registry plumbing', () => {
    test('window.EffectsRegistry is defined', async ({ rsaPage }) => {
      const exists = await rsaPage.evaluate(() =>
        typeof (window as any).EffectsRegistry === 'object'
      );
      expect(exists).toBe(true);
    });

    test('EffectsRegistry.ability() handles undefined input', async ({ rsaPage }) => {
      const result = await rsaPage.evaluate(() =>
        (window as any).EffectsRegistry.ability('NonexistentAbility')
      );
      expect(result == null).toBe(true);
    });

    test('EffectsRegistry.item() handles undefined input', async ({ rsaPage }) => {
      const result = await rsaPage.evaluate(() =>
        (window as any).EffectsRegistry.item('NonexistentItem')
      );
      expect(result == null).toBe(true);
    });

    test('slugify normalizes name correctly', async ({ rsaPage }) => {
      const result = await rsaPage.evaluate(() => {
        const reg = (window as any).EffectsRegistry;
        return [
          reg.slugify('Heavy-Duty Boots'),
          reg.slugify("Will-O-Wisp"),
          reg.slugify('Lagging Tail'),
        ];
      });
      expect(result[0]).toBe('heavydutyboots');
      expect(result[1]).toBe('willowisp');
      expect(result[2]).toBe('laggingtail');
    });
  });
});
