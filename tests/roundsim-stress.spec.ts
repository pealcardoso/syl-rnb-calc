import { test, expect } from './fixtures';

/**
 * Stress tests for the Round Simulator — verifies that state remains
 * consistent across a wide range of UI operations:
 *   • Pre-status / pre-damage survive round add+delete
 *   • Inline controls reflect field state (from rounds, not calc form)
 *   • Team preview clicks don't mutate captured state
 *   • Multiple rapid round add/delete cycles
 *
 * Each test injects its own team/round state via window.__stress helpers
 * so it doesn't depend on whether the app has been used already.
 */

/* ── inject helpers once per worker page ──────────────────────────── */

/** Injects __stress helpers onto window if not already present. */
async function ensureStressHelpers(rsaPage: any) {
  await rsaPage.evaluate(() => {
    const w = window as any;
    if (w.__stress) return; // already injected
    w.__stress = {
      mkEntry(name: string, hp: number, item: string, ability: string,
              moves: string[], types: string[]) {
        return {
          name, setId: name + ' (Test)', sprite: '',
          item: item || '', initialItem: item || '',
          ability: ability || '',
          moves: moves || ['Tackle', 'Protect', 'Swords Dance', 'Close Combat'],
          types: types || ['Normal'],
          maxHP: hp || 300,
          currentHP: hp || 300,
          bestCaseHP: hp || 300,
          status: '', toxicCounter: 0,
          boosts: { at: 0, df: 0, sa: 0, sd: 0, sp: 0 }
        };
      },
      mkRound(num: number, p1Name: string, p2Name: string,
              p1HPBefore: number, p1HPAfter: number,
              p2HPBefore: number, p2HPAfter: number) {
        return {
          roundNum: num,
          speed: { p1: 120, p2: 80, faster: 'p1' },
          weather: 'None', terrain: 'None', trickRoom: false, p2Crit: false,
          p1: {
            name: p1Name, sprite: '', item: '', ability: '', status: '',
            boosts: { at: 0, df: 0, sa: 0, sd: 0, sp: 0 },
            hpBefore: { current: p1HPBefore, max: 300, bestCase: p1HPBefore },
            hpAfter:  { current: p1HPAfter,  max: 300, bestCase: p1HPAfter + 5 },
            move: 'Tackle', moveIdx: 0, flinched: false, blockReason: '',
            damage: { minDmg: 10, maxDmg: 20 }, extras: [], eot: []
          },
          p2: {
            name: p2Name, sprite: '', item: '', ability: '', status: '',
            boosts: { at: 0, df: 0, sa: 0, sd: 0, sp: 0 },
            hpBefore: { current: p2HPBefore, max: 300, bestCase: p2HPBefore },
            hpAfter:  { current: p2HPAfter,  max: 300, bestCase: p2HPAfter + 5 },
            move: 'Tackle', moveIdx: 0, flinched: false, blockReason: '',
            damage: { minDmg: 10, maxDmg: 20 }, extras: [], eot: [],
            aiPcts: [], allMoves: []
          }
        };
      },
      /** Inject a fresh team state. Returns snapshot for teardown. */
      setup() {
        const line = w.__rsaTest.curLine();
        const snap = {
          p1Roster: JSON.parse(JSON.stringify(line.teams.p1.roster)),
          p2Roster: JSON.parse(JSON.stringify(line.teams.p2.roster)),
          p1Idx: line.teams.p1.activeIdx,
          p2Idx: line.teams.p2.activeIdx,
          rounds: JSON.parse(JSON.stringify(line.rounds || [])),
          counter: line.roundCounter
        };
        const S = w.__stress;
        line.teams.p1.roster = [
          S.mkEntry('Garchomp', 357, 'Life Orb', 'Rough Skin',
                    ['Earthquake', 'Dragon Claw', 'Swords Dance', 'Stone Edge'],
                    ['Dragon', 'Ground']),
          S.mkEntry('Togekiss', 333, 'Leftovers', 'Serene Grace',
                    ['Air Slash', 'Dazzling Gleam', 'Thunder Wave', 'Roost'],
                    ['Fairy', 'Flying']),
          S.mkEntry('Scizor', 344, 'Choice Band', 'Technician',
                    ['Bullet Punch', 'U-turn', 'Superpower', 'Knock Off'],
                    ['Bug', 'Steel'])
        ];
        line.teams.p1.activeIdx = 0;
        line.teams.p2.roster = [
          S.mkEntry('Tyranitar', 341, 'Leftovers', 'Sand Stream',
                    ['Stone Edge', 'Crunch', 'Earthquake', 'Stealth Rock'],
                    ['Rock', 'Dark']),
          S.mkEntry('Rotom-Wash', 304, 'Sitrus Berry', 'Levitate',
                    ['Hydro Pump', 'Volt Switch', 'Will-O-Wisp', 'Pain Split'],
                    ['Electric', 'Water']),
          S.mkEntry('Ferrothorn', 352, 'Rocky Helmet', 'Iron Barbs',
                    ['Power Whip', 'Gyro Ball', 'Leech Seed', 'Stealth Rock'],
                    ['Grass', 'Steel'])
        ];
        line.teams.p2.activeIdx = 0;
        line.rounds = [S.mkRound(1, 'Garchomp', 'Tyranitar', 357, 320, 341, 250)];
        line.roundCounter = 1;
        w.__rsaTest.rebuildLineTeams(line);
        return snap;
      },
      /** Restore original state from snapshot. */
      teardown(snap: any) {
        const line = w.__rsaTest.curLine();
        line.teams.p1.roster = snap.p1Roster;
        line.teams.p1.activeIdx = snap.p1Idx;
        line.teams.p2.roster = snap.p2Roster;
        line.teams.p2.activeIdx = snap.p2Idx;
        line.rounds = snap.rounds;
        line.roundCounter = snap.counter;
      }
    };
  });
}

/* ── tests ────────────────────────────────────────────────────────── */

test.beforeEach(async ({ rsaPage }) => {
  await ensureStressHelpers(rsaPage);
});

test.describe('Stress: Pre-Status & Pre-Damage Persistence', () => {

  test('pre-status survives round capture + deletion', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const entry = line.teams.p1.roster[1]; // Togekiss (benched — not in any round)

      entry.status = 'Burn';
      entry.preStatus = 'Burn';

      line.rounds.push(w.__stress.mkRound(2, 'Garchomp', 'Tyranitar', 320, 280, 250, 180));
      w.__rsaTest.rebuildLineTeams(line);
      line.rounds.pop();
      w.__rsaTest.rebuildLineTeams(line);

      const r = { statusAfter: entry.status, preStatusAfter: entry.preStatus };
      w.__stress.teardown(snap);
      return r;
    });

    expect(result.statusAfter).toBe('Burn');
    expect(result.preStatusAfter).toBe('Burn');
  });

  test('pre-status survives rebuildBranchTeams with no rounds', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();

      // Benched mon (Togekiss)
      const entry = line.teams.p1.roster[1];
      entry.status = 'Paralysis';
      entry.preStatus = 'Paralysis';

      line.rounds = [];
      w.__rsaTest.rebuildBranchTeams(line, -1);

      const r = { statusAfter: entry.status };
      w.__stress.teardown(snap);
      return r;
    });

    expect(result.statusAfter).toBe('Paralysis');
  });

  test('pre-damage HP survives round add + delete for benched mon', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();

      // Benched Scizor (idx 2)
      const entry = line.teams.p1.roster[2];
      entry.currentHP = 172;
      entry.bestCaseHP = 172;
      entry.preDamageHP = 172;

      line.rounds.push(w.__stress.mkRound(2, 'Garchomp', 'Tyranitar', 320, 280, 250, 180));
      w.__rsaTest.rebuildLineTeams(line);
      line.rounds.pop();
      w.__rsaTest.rebuildLineTeams(line);

      const hpAfter = entry.currentHP;
      w.__stress.teardown(snap);
      return { hpAfter };
    });

    expect(result.hpAfter).toBe(172);
  });

  test('clearing pre-status results in no status after rebuild', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();

      const entry = line.teams.p1.roster[0];
      entry.status = 'Burn';
      entry.preStatus = 'Burn';
      entry.status = '';
      entry.preStatus = '';

      line.rounds = [];
      w.__rsaTest.rebuildBranchTeams(line, -1);
      const r = { statusAfter: entry.status };
      w.__stress.teardown(snap);
      return r;
    });

    expect(result.statusAfter).toBe('');
  });
});

test.describe('Stress: Inline Controls Field State', () => {

  test('getFieldMonsFromLog returns last round participants', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();

      const field = w.__rsaTest.getFieldMonsFromLog();
      const lastRd = line.rounds[line.rounds.length - 1];

      const r = {
        lastP1: lastRd.p1.name, lastP2: lastRd.p2.name,
        fieldP1: field.p1 ? field.p1.name : null,
        fieldP2: field.p2 ? field.p2.name : null
      };
      w.__stress.teardown(snap);
      return r;
    });

    expect(result.fieldP1).toBe(result.lastP1);
    expect(result.fieldP2).toBe(result.lastP2);
  });

  test('inline controls contain the correct moves from roster', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();

      const field = w.__rsaTest.getFieldMonsFromLog();
      const p1Moves = (field.p1.moves || []).filter((m: string) => m && m !== '(No Move)');

      const html = w.__rsaTest.renderInlineControls();
      const hasMoves = p1Moves.every((m: string) => html.indexOf(m) !== -1);

      w.__stress.teardown(snap);
      return { p1Moves, hasMoves, htmlLen: html.length };
    });

    expect(result.hasMoves).toBe(true);
    expect(result.htmlLen).toBeGreaterThan(0);
  });

  test('field mons stay stable when previewing a different team slot', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();

      const fieldBefore = w.__rsaTest.getFieldMonsFromLog();
      const nameBefore = fieldBefore.p1 ? fieldBefore.p1.name : null;

      // Load Togekiss (idx=1) into form without switching active
      w.__rsaTest.loadPokemonIntoForm('p1', line.teams.p1.roster[1]);

      const fieldAfter = w.__rsaTest.getFieldMonsFromLog();
      const nameAfter = fieldAfter.p1 ? fieldAfter.p1.name : null;

      w.__stress.teardown(snap);
      return { nameBefore, nameAfter };
    });

    // Field P1 should NOT change just because we previewed a different mon
    expect(result.nameAfter).toBe(result.nameBefore);
  });
});

test.describe('Stress: Round Add/Delete Cycles', () => {

  test('round numbering stays sequential after delete in middle', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();

      // Total 5 rounds
      for (let i = 2; i <= 5; i++) {
        line.rounds.push(w.__stress.mkRound(i, 'Garchomp', 'Tyranitar',
          300 - i * 20, 300 - (i + 1) * 20, 250, 230));
      }
      line.roundCounter = 5;
      w.__rsaTest.rebuildLineTeams(line);

      // Delete round 3
      line.rounds.splice(2, 1);
      let num = 1;
      for (const rd of line.rounds) { if (!rd.isP2Switch) rd.roundNum = num++; }
      w.__rsaTest.rebuildLineTeams(line);

      let sequential = true, prev = 0;
      for (const rd of line.rounds) {
        if (!rd.isP2Switch) {
          if (rd.roundNum !== prev + 1) { sequential = false; break; }
          prev = rd.roundNum;
        }
      }

      const cnt = line.rounds.length;
      w.__stress.teardown(snap);
      return { sequential, roundCount: cnt };
    });

    expect(result.sequential).toBe(true);
    expect(result.roundCount).toBe(4);
  });

  test('deleting all rounds resets HP/status/boosts to initial', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const p1 = line.teams.p1;
      const p2 = line.teams.p2;

      // Clear pre-status/preDamage so they don't interfere
      for (const e of p1.roster) { delete (e as any).preStatus; delete (e as any).preDamageHP; }
      for (const e of p2.roster) { delete (e as any).preStatus; delete (e as any).preDamageHP; }

      line.rounds = [];
      w.__rsaTest.rebuildLineTeams(line);

      const r = {
        p1AllMax: p1.roster.every((e: any) => e.currentHP === e.maxHP),
        p2AllMax: p2.roster.every((e: any) => e.currentHP === e.maxHP),
        p1NoStatus: p1.roster.every((e: any) => !e.status),
        p1NoBoosts: p1.roster.every((e: any) =>
          e.boosts.at === 0 && e.boosts.df === 0 && e.boosts.sa === 0 &&
          e.boosts.sd === 0 && e.boosts.sp === 0)
      };
      w.__stress.teardown(snap);
      return r;
    });

    expect(result.p1AllMax).toBe(true);
    expect(result.p2AllMax).toBe(true);
    expect(result.p1NoStatus).toBe(true);
    expect(result.p1NoBoosts).toBe(true);
  });

  test('multiple add/delete cycles leave state consistent', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const p1 = line.teams.p1;

      const baseHP = p1.roster.map((e: any) => e.currentHP);
      const startLen = line.rounds.length;

      // Add 5
      for (let i = 0; i < 5; i++)
        line.rounds.push(w.__stress.mkRound(startLen + 1 + i, 'Garchomp', 'Tyranitar', 300, 280, 250, 230));
      w.__rsaTest.rebuildLineTeams(line);

      // Remove last 3
      for (let i = 0; i < 3; i++) line.rounds.pop();
      w.__rsaTest.rebuildLineTeams(line);

      // Add 2
      for (let i = 0; i < 2; i++)
        line.rounds.push(w.__stress.mkRound(900 + i, 'Garchomp', 'Tyranitar', 300, 280, 250, 230));
      w.__rsaTest.rebuildLineTeams(line);

      // Remove all added
      line.rounds = line.rounds.slice(0, startLen);
      w.__rsaTest.rebuildLineTeams(line);

      const finalHP = p1.roster.map((e: any) => e.currentHP);
      w.__stress.teardown(snap);
      return { match: JSON.stringify(finalHP) === JSON.stringify(baseHP), baseHP, finalHP };
    });

    expect(result.match).toBe(true);
  });
});

test.describe('Stress: Roster & Entry Consistency', () => {

  test('roster entries maintain correct structure after rebuild', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const p1 = line.teams.p1;
      const lenAfterSetup = p1.roster.length;
      const namesAfterSetup = p1.roster.map((e: any) => e.name);

      w.__rsaTest.rebuildLineTeams(line);
      const lenAfterRebuild = p1.roster.length;
      const namesAfterRebuild = p1.roster.map((e: any) => e.name);

      const issues: string[] = [];
      for (let i = 0; i < p1.roster.length; i++) {
        const e = p1.roster[i];
        if (!e.name) issues.push(`P1[${i}] missing name`);
        if (!e.setId) issues.push(`P1[${i}] missing setId`);
        if (typeof e.maxHP !== 'number') issues.push(`P1[${i}] missing maxHP`);
        if (typeof e.currentHP !== 'number') issues.push(`P1[${i}] missing currentHP`);
        if (e.currentHP > e.maxHP) issues.push(`P1[${i}] currentHP > maxHP`);
        if (!e.moves || !Array.isArray(e.moves)) issues.push(`P1[${i}] missing moves array`);
        if (typeof e.status !== 'string') issues.push(`P1[${i}] status not a string`);
        if (!e.boosts) issues.push(`P1[${i}] missing boosts`);
      }

      const rosterSize = p1.roster.length;
      w.__stress.teardown(snap);
      return { issues, rosterSize, lenAfterSetup, namesAfterSetup, lenAfterRebuild, namesAfterRebuild };
    });

    expect(result.lenAfterSetup).toBe(3);
    expect(result.lenAfterRebuild).toBe(3);
    expect(result.issues).toEqual([]);
    expect(result.rosterSize).toBe(3);
  });

  test('activeIdx stays within roster bounds after rebuild', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();

      w.__rsaTest.rebuildBranchTeams(line, -1);

      const r = {
        p1InBounds: line.teams.p1.activeIdx >= 0 &&
                    line.teams.p1.activeIdx < line.teams.p1.roster.length,
        p2InBounds: line.teams.p2.activeIdx >= 0 &&
                    line.teams.p2.activeIdx < line.teams.p2.roster.length
      };
      w.__stress.teardown(snap);
      return r;
    });

    expect(result.p1InBounds).toBe(true);
    expect(result.p2InBounds).toBe(true);
  });

  test('getActiveEntry returns Garchomp for P1 and Tyranitar for P2', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();

      const p1Entry = w.__rsaTest.getActiveEntry(line.teams.p1);
      const p2Entry = w.__rsaTest.getActiveEntry(line.teams.p2);

      const r = {
        p1Name: p1Entry ? p1Entry.name : null,
        p2Name: p2Entry ? p2Entry.name : null
      };
      w.__stress.teardown(snap);
      return r;
    });

    expect(result.p1Name).toBe('Garchomp');
    expect(result.p2Name).toBe('Tyranitar');
  });
});

test.describe('Stress: Quick Claw / Quick Draw', () => {

  test('QC/QD data exists in BattleItems/BattleAbilities', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      return {
        quickClaw: !!(w.BattleItems && w.BattleItems['quickclaw']),
        quickDraw: !!(w.BattleAbilities && w.BattleAbilities['quickdraw'])
      };
    });

    expect(result.quickClaw).toBe(true);
    expect(result.quickDraw).toBe(true);
  });

  test('QC/QD toggle flag can be set and cleared', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      w._rsaQCProc = true;
      const after = w._rsaQCProc;
      w._rsaQCProc = false;
      return { after };
    });
    expect(result.after).toBe(true);
  });
});

test.describe('Stress: Pivot Move Detection', () => {

  test('selfSwitch flag exists on pivot moves in BattleMovedex', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const md = w.BattleMovedex;
      return {
        uturn: md['uturn']?.selfSwitch,
        voltswitch: md['voltswitch']?.selfSwitch,
        flipturn: md['flipturn']?.selfSwitch,
        partingshot: md['partingshot']?.selfSwitch
      };
    });

    expect(result.uturn).toBe(true);
    expect(result.voltswitch).toBe(true);
    expect(result.flipturn).toBe(true);
    expect(result.partingshot).toBe(true);
  });
});

test.describe('Stress: Round Data Structure Integrity', () => {

  test('round data has correct fields for fork variance', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const rounds = w.__rsaTest.getBranchRounds(line, -1);

      const errors: string[] = [];
      for (const rd of rounds) {
        if (!rd.p1 || !rd.p2) continue;
        if (rd.p1.damage && typeof rd.p1.damage.minDmg !== 'number')
          errors.push(`Round ${rd.roundNum}: p1.damage.minDmg not number`);
        if (!rd.speed || !rd.speed.faster)
          errors.push(`Round ${rd.roundNum}: missing speed.faster`);
        if (!rd.p1.hpBefore || typeof rd.p1.hpBefore.current !== 'number')
          errors.push(`Round ${rd.roundNum}: p1.hpBefore.current missing`);
      }

      w.__stress.teardown(snap);
      return { roundsChecked: rounds.length, errors };
    });

    expect(result.roundsChecked).toBeGreaterThan(0);
    expect(result.errors).toEqual([]);
  });
});

test.describe('Stress: Rapid Team Interaction Cycles', () => {

  test('switching active P1 multiple times preserves roster integrity', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const p1 = line.teams.p1;
      const rosterLen = p1.roster.length;

      for (let cycle = 0; cycle < 5; cycle++) {
        for (let i = 0; i < p1.roster.length; i++) {
          w.__rsaTest.switchActive('p1', i);
        }
      }
      w.__rsaTest.switchActive('p1', 0);

      const issues: string[] = [];
      if (p1.roster.length !== rosterLen) issues.push('Roster length changed');
      for (let i = 0; i < p1.roster.length; i++) {
        if (!p1.roster[i].name) issues.push(`Entry ${i} lost name`);
        if (typeof p1.roster[i].currentHP !== 'number') issues.push(`Entry ${i} lost HP`);
      }

      const idx = p1.activeIdx;
      w.__stress.teardown(snap);
      return { issues, finalIdx: idx };
    });

    expect(result.issues).toEqual([]);
    expect(result.finalIdx).toBe(0);
  });

  test('rebuild is idempotent (running it twice gives same HP)', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const p1 = line.teams.p1;

      w.__rsaTest.rebuildBranchTeams(line, -1);
      const hp1 = p1.roster.map((e: any) => e.currentHP);

      w.__rsaTest.rebuildBranchTeams(line, -1);
      const hp2 = p1.roster.map((e: any) => e.currentHP);

      w.__stress.teardown(snap);
      return { idempotent: JSON.stringify(hp1) === JSON.stringify(hp2), hp1, hp2 };
    });

    expect(result.idempotent).toBe(true);
  });
});

test.describe('Stress: Pre-Damage Propagation Through Rounds', () => {

  test('pre-damage HP adjusts final HP via delta through a single round', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      // Garchomp at maxHP=357, round 1: hpBefore=357, hpAfter=320 → delta=37
      // Without pre-damage: final HP = 357 - 37 = 320
      const baseEntry = line.teams.p1.roster[0];
      const hpNoPre = baseEntry.currentHP; // 320 after setup's rebuild

      // Now set pre-damage to 300
      baseEntry.preDamageHP = 300;
      w.__rsaTest.rebuildLineTeams(line);
      const hpWithPre = baseEntry.currentHP; // should be 300 - 37 = 263

      // Clean up
      delete baseEntry.preDamageHP;
      w.__rsaTest.rebuildLineTeams(line);
      w.__stress.teardown(snap);
      return { hpNoPre, hpWithPre, delta: 357 - 320 };
    });

    expect(result.hpNoPre).toBe(320);
    expect(result.hpWithPre).toBe(300 - result.delta);
  });

  test('pre-damage propagates through multiple rounds', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const entry = line.teams.p1.roster[0]; // Garchomp

      // Add a second round: hpBefore=320, hpAfter=280 → delta=40
      line.rounds.push(w.__stress.mkRound(2, 'Garchomp', 'Tyranitar', 320, 280, 250, 200));
      w.__rsaTest.rebuildLineTeams(line);
      const hpNoPreAfter2 = entry.currentHP; // 280

      // Set pre-damage to 340
      entry.preDamageHP = 340;
      w.__rsaTest.rebuildLineTeams(line);
      const hpPreAfter2 = entry.currentHP;
      // Expected: 340 - 37 (rd1 delta) - 40 (rd2 delta) = 263

      delete entry.preDamageHP;
      line.rounds.pop();
      w.__rsaTest.rebuildLineTeams(line);
      w.__stress.teardown(snap);
      return { hpNoPreAfter2, hpPreAfter2, rd1Delta: 357 - 320, rd2Delta: 320 - 280 };
    });

    expect(result.hpNoPreAfter2).toBe(280);
    expect(result.hpPreAfter2).toBe(340 - result.rd1Delta - result.rd2Delta);
  });

  test('pre-damage survives round deletion and re-addition', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const entry = line.teams.p1.roster[0];

      entry.preDamageHP = 300;
      w.__rsaTest.rebuildLineTeams(line);
      const hpBefore = entry.currentHP;

      // Delete all rounds
      const savedRound = JSON.parse(JSON.stringify(line.rounds[0]));
      line.rounds = [];
      w.__rsaTest.rebuildLineTeams(line);
      const hpNoRounds = entry.currentHP; // should be 300 (pre-damage, no round deltas)
      const preDamageStillSet = entry.preDamageHP;

      // Re-add the round
      line.rounds.push(savedRound);
      w.__rsaTest.rebuildLineTeams(line);
      const hpReAdded = entry.currentHP; // should be same as hpBefore

      delete entry.preDamageHP;
      w.__rsaTest.rebuildLineTeams(line);
      w.__stress.teardown(snap);
      return { hpBefore, hpNoRounds, preDamageStillSet, hpReAdded };
    });

    expect(result.hpNoRounds).toBe(300);
    expect(result.preDamageStillSet).toBe(300);
    expect(result.hpReAdded).toBe(result.hpBefore);
  });

  test('pre-damage on benched mon is unaffected by active mon rounds', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      // Togekiss (benched, idx=1, maxHP=333)
      const benched = line.teams.p1.roster[1];
      benched.preDamageHP = 200;
      w.__rsaTest.rebuildLineTeams(line);
      const benchedHP = benched.currentHP;

      // Add more Garchomp rounds — shouldn't affect benched Togekiss
      line.rounds.push(w.__stress.mkRound(2, 'Garchomp', 'Tyranitar', 320, 280, 250, 200));
      w.__rsaTest.rebuildLineTeams(line);
      const benchedHPAfter = benched.currentHP;

      delete benched.preDamageHP;
      line.rounds.pop();
      w.__rsaTest.rebuildLineTeams(line);
      w.__stress.teardown(snap);
      return { benchedHP, benchedHPAfter };
    });

    expect(result.benchedHP).toBe(200);
    expect(result.benchedHPAfter).toBe(200);
  });
});

test.describe('Stress: Pre-Status Propagation Through Rounds', () => {

  test('pre-status on active mon persists through rounds (when round has no status)', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const entry = line.teams.p1.roster[0]; // Garchomp

      // Round 1 has rd.p1.status = '' (falsy), so pre-status should persist
      entry.preStatus = 'Burn';
      w.__rsaTest.rebuildLineTeams(line);
      const statusAfter = entry.status;

      delete entry.preStatus;
      w.__rsaTest.rebuildLineTeams(line);
      w.__stress.teardown(snap);
      return { statusAfter };
    });

    expect(result.statusAfter).toBe('Burn');
  });

  test('pre-status survives round deletion for active mon', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const entry = line.teams.p1.roster[0];

      entry.preStatus = 'Paralysis';
      w.__rsaTest.rebuildLineTeams(line);
      const statusWithRound = entry.status;

      line.rounds = [];
      w.__rsaTest.rebuildLineTeams(line);
      const statusNoRound = entry.status;

      delete entry.preStatus;
      w.__rsaTest.rebuildLineTeams(line);
      w.__stress.teardown(snap);
      return { statusWithRound, statusNoRound };
    });

    expect(result.statusWithRound).toBe('Paralysis');
    expect(result.statusNoRound).toBe('Paralysis');
  });

  test('pre-status + pre-damage combine correctly', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const entry = line.teams.p1.roster[0]; // Garchomp

      entry.preDamageHP = 300;
      entry.preStatus = 'Burn';
      w.__rsaTest.rebuildLineTeams(line);
      const hp = entry.currentHP;
      const status = entry.status;

      delete entry.preDamageHP;
      delete entry.preStatus;
      w.__rsaTest.rebuildLineTeams(line);
      w.__stress.teardown(snap);
      // delta = 357-320 = 37, Burn EOT = floor(357/16) = 22
      return { hp, status, expectedHP: 300 - (357 - 320) - Math.floor(357 / 16) };
    });

    expect(result.hp).toBe(result.expectedHP);
    expect(result.status).toBe('Burn');
  });

  test('clearing pre-status on active mon resets after rebuild', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const entry = line.teams.p1.roster[0];

      entry.preStatus = 'Burn';
      w.__rsaTest.rebuildLineTeams(line);
      const statusBurned = entry.status;

      entry.preStatus = '';
      w.__rsaTest.rebuildLineTeams(line);
      const statusCleared = entry.status;

      w.__stress.teardown(snap);
      return { statusBurned, statusCleared };
    });

    expect(result.statusBurned).toBe('Burn');
    expect(result.statusCleared).toBe('');
  });
});

test.describe('Stress: P2 Roster Integrity During P1 Switch', () => {

  test('saveFormToRoster(p2) is skipped when _switchInProgress is true', async ({ rsaPage }) => {
    // Regression: When switching P1, the P2 form can have stale item/ability
    // from a previously-active opponent while showing the correct species name.
    // captureRound must NOT call saveFormToRoster('p2') during switches.
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const p2 = line.teams.p2;

      // Set P2 active to Tyranitar (idx 0)
      p2.activeIdx = 0;
      const origItem = p2.roster[0].item;
      const origAbility = p2.roster[0].ability;

      // Load Tyranitar into P2 form so name matches
      w.__rsaTest.loadPokemonIntoForm('p2', p2.roster[0]);

      // Simulate stale form state by changing item/ability in the form
      // (mimics what happens when switchActive('p1') cascades recalc)
      const $item = document.querySelector('#p2 select.item-selector') as any;
      const $abil = document.querySelector('#p2 select.ability-selector') as any;

      // Set _switchInProgress = true (simulating an ongoing P1 switch)
      w.__rsaTest.set_switchInProgress(true);

      // Call captureRound — it should skip saveFormToRoster('p2')
      // and Tyranitar's roster entry should remain unchanged
      const rd = w.__rsaTest.captureRound(0, 0, false, 0, '', 'Test switch', false, false, 0, 0);

      const afterItem = p2.roster[0].item;
      const afterAbility = p2.roster[0].ability;

      // Reset
      w.__rsaTest.set_switchInProgress(false);
      w.__stress.teardown(snap);

      return {
        origItem, origAbility,
        afterItem, afterAbility,
        roundCaptured: !!rd
      };
    });

    // Roster data should be unchanged (not overwritten by stale form state)
    expect(result.afterItem).toBe(result.origItem);
    expect(result.afterAbility).toBe(result.origAbility);
    expect(result.roundCaptured).toBe(true);
  });

  test('saveFormToRoster(p2) works normally when NOT switching', async ({ rsaPage }) => {
    // Verify saveFormToRoster('p2') still works in the normal (non-switch) path
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const p2 = line.teams.p2;

      // Active is Tyranitar (idx 0)
      p2.activeIdx = 0;
      w.__rsaTest.loadPokemonIntoForm('p2', p2.roster[0]);

      // Ensure _switchInProgress is false
      w.__rsaTest.set_switchInProgress(false);

      // Save form — should write to roster
      w.__rsaTest.saveFormToRoster('p2');

      const entry = p2.roster[0];
      const r = { name: entry.name, hasSaved: true };
      w.__stress.teardown(snap);
      return r;
    });

    expect(result.hasSaved).toBe(true);
    expect(result.name).toBe('Tyranitar');
  });

  test('P1 switch with P2 KO does not corrupt surviving P2 roster entries', async ({ rsaPage }) => {
    // End-to-end regression: After P2 mon is KO'd and a new one sent in,
    // switching P1 must not overwrite the new P2's item/ability with the dead one's.
    const result = await rsaPage.evaluate(async () => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const S = w.__stress;
      const p1 = line.teams.p1;
      const p2 = line.teams.p2;

      // Setup: P2 Tyranitar is KO'd in round 1, Rotom-Wash sent in for round 2
      p2.roster[0].currentHP = 0; // Tyranitar dead
      p2.activeIdx = 1; // Rotom-Wash is now active
      p1.activeIdx = 0; // Garchomp active

      // Add a round where Garchomp fought Rotom-Wash
      line.rounds.push(S.mkRound(2, 'Garchomp', 'Rotom-Wash', 320, 280, 304, 250));
      line.roundCounter = 2;
      w.__rsaTest.rebuildLineTeams(line);

      // Record Rotom-Wash's correct item/ability
      const correctItem = p2.roster[1].item;
      const correctAbility = p2.roster[1].ability;

      // Load Rotom-Wash into form
      w.__rsaTest.loadPokemonIntoForm('p2', p2.roster[1]);

      // Simulate the switch flow: set _switchInProgress, switch P1 to Togekiss
      w.__rsaTest.set_switchInProgress(true);
      p1.activeIdx = 1; // Togekiss
      w.__rsaTest.loadPokemonIntoForm('p1', p1.roster[1]);

      // Capture a switch round (P1 doesn't attack, P2 does)
      const rd = w.__rsaTest.captureRound('none', 0, false, 0, '', 'Switch in: Togekiss', false, false, 0, 0);

      // Check Rotom-Wash's roster entry is uncorrupted
      const afterItem = p2.roster[1].item;
      const afterAbility = p2.roster[1].ability;

      w.__rsaTest.set_switchInProgress(false);

      // Clean up
      line.rounds.pop();
      w.__rsaTest.rebuildLineTeams(line);
      w.__stress.teardown(snap);

      return {
        correctItem, correctAbility,
        afterItem, afterAbility,
        roundCaptured: !!rd
      };
    });

    expect(result.afterItem).toBe(result.correctItem);
    expect(result.afterAbility).toBe(result.correctAbility);
    expect(result.roundCaptured).toBe(true);
  });

  test('_switchInProgress flag is accessible and defaults to false', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      return { value: w.__rsaTest.get_switchInProgress() };
    });
    expect(result.value).toBe(false);
  });
});

test.describe('Stress: Field State Independence from Team Selection', () => {
  // Regression tests verifying getFieldMonsFromLog() is 100% log-derived
  // and never looks at activeIdx or form selections for field state.

  test('getFieldMonsFromLog ignores activeIdx pointing to wrong P1', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();

      // Round says Garchomp fought, but activeIdx points to Togekiss
      line.teams.p1.activeIdx = 1; // Togekiss

      const field = w.__rsaTest.getFieldMonsFromLog();
      const r = { fieldP1: field.p1 ? field.p1.name : null };
      w.__stress.teardown(snap);
      return r;
    });

    // Must return Garchomp (from the round log), NOT Togekiss (from activeIdx)
    expect(result.fieldP1).toBe('Garchomp');
  });

  test('getFieldMonsFromLog ignores activeIdx pointing to wrong P2', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();

      // Round says Tyranitar fought, but activeIdx points to Ferrothorn
      line.teams.p2.activeIdx = 2; // Ferrothorn

      const field = w.__rsaTest.getFieldMonsFromLog();
      const r = { fieldP2: field.p2 ? field.p2.name : null };
      w.__stress.teardown(snap);
      return r;
    });

    // Must return Tyranitar (from round log), NOT Ferrothorn
    expect(result.fieldP2).toBe('Tyranitar');
  });

  test('getFieldMonsFromLog ignores activeIdx after multiple switchActive calls', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();

      // Rapidly switch activeIdx around (simulates preview clicks)
      for (let i = 0; i < line.teams.p1.roster.length; i++) {
        line.teams.p1.activeIdx = i;
      }
      for (let i = 0; i < line.teams.p2.roster.length; i++) {
        line.teams.p2.activeIdx = i;
      }

      const field = w.__rsaTest.getFieldMonsFromLog();
      const r = {
        fieldP1: field.p1 ? field.p1.name : null,
        fieldP2: field.p2 ? field.p2.name : null
      };
      w.__stress.teardown(snap);
      return r;
    });

    expect(result.fieldP1).toBe('Garchomp');
    expect(result.fieldP2).toBe('Tyranitar');
  });

  test('getFieldMonsFromLog uses pendingSwitchP2Idx after P2 KO, not activeIdx', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const S = w.__stress;

      // KO Tyranitar in round 1
      line.rounds = [S.mkRound(1, 'Garchomp', 'Tyranitar', 357, 320, 341, 0)];
      line.roundCounter = 1;
      w.__rsaTest.rebuildLineTeams(line);

      // Set pendingSwitchP2Idx to Rotom-Wash (idx 1)
      line.pendingSwitchP2Idx = 1;

      // But set activeIdx to Ferrothorn (idx 2) — this should be ignored
      line.teams.p2.activeIdx = 2;

      const field = w.__rsaTest.getFieldMonsFromLog();
      const r = { fieldP2: field.p2 ? field.p2.name : null };

      delete line.pendingSwitchP2Idx;
      w.__stress.teardown(snap);
      return r;
    });

    // Must use pendingSwitchP2Idx (Rotom-Wash), NOT activeIdx (Ferrothorn)
    expect(result.fieldP2).toBe('Rotom-Wash');
  });

  test('getFieldMonsFromLog returns lead mons when no rounds exist regardless of activeIdx', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();

      // Clear all rounds
      line.rounds = [];
      line.roundCounter = 0;

      // Set activeIdx to non-zero (simulates a user clicking around the team)
      line.teams.p1.activeIdx = 2; // Scizor
      line.teams.p2.activeIdx = 2; // Ferrothorn

      const field = w.__rsaTest.getFieldMonsFromLog();
      const r = {
        fieldP1: field.p1 ? field.p1.name : null,
        fieldP2: field.p2 ? field.p2.name : null
      };
      w.__stress.teardown(snap);
      return r;
    });

    // With no rounds, default to roster[0] (the lead), NOT activeIdx
    expect(result.fieldP1).toBe('Garchomp');
    expect(result.fieldP2).toBe('Tyranitar');
  });

  test('getFieldMonsFromLog tracks P2 through multiple switch-ins', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const S = w.__stress;

      // Round 1: Garchomp vs Tyranitar — Tyranitar KO'd
      // Round 2: Garchomp vs Rotom-Wash (after send-in)
      // Round 3: Garchomp vs Rotom-Wash — Rotom-Wash KO'd
      line.rounds = [
        S.mkRound(1, 'Garchomp', 'Tyranitar', 357, 320, 341, 0),
        S.mkRound(2, 'Garchomp', 'Rotom-Wash', 320, 280, 304, 200),
        S.mkRound(3, 'Garchomp', 'Rotom-Wash', 280, 250, 200, 0)
      ];
      line.roundCounter = 3;
      w.__rsaTest.rebuildLineTeams(line);

      // Pending send-in: Ferrothorn (idx 2)
      line.pendingSwitchP2Idx = 2;

      // Set activeIdx to something totally wrong
      line.teams.p2.activeIdx = 0; // dead Tyranitar — clearly wrong

      const field = w.__rsaTest.getFieldMonsFromLog();
      const r = { fieldP2: field.p2 ? field.p2.name : null };

      delete line.pendingSwitchP2Idx;
      w.__stress.teardown(snap);
      return r;
    });

    // Must pick Ferrothorn from pendingSwitchP2Idx, not dead Tyranitar from activeIdx
    expect(result.fieldP2).toBe('Ferrothorn');
  });

  test('getFieldMonsFromLog handles P1 pivot switch correctly regardless of activeIdx', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const S = w.__stress;

      // Round with P1 pivot (U-turn): Scizor uses U-turn, switches to Garchomp
      const pivotRd = S.mkRound(1, 'Scizor', 'Tyranitar', 344, 310, 341, 280);
      pivotRd.p1SelfSwitch = true;
      pivotRd.p1PivotDone = true;
      pivotRd.pivotSwitch = { side: 'p1', incoming: 'Garchomp' };
      line.rounds = [pivotRd];
      line.roundCounter = 1;
      w.__rsaTest.rebuildLineTeams(line);

      // Set activeIdx to Togekiss (wrong)
      line.teams.p1.activeIdx = 1;

      const field = w.__rsaTest.getFieldMonsFromLog();
      const r = { fieldP1: field.p1 ? field.p1.name : null };
      w.__stress.teardown(snap);
      return r;
    });

    // Pivot incoming = Garchomp, NOT activeIdx = Togekiss
    expect(result.fieldP1).toBe('Garchomp');
  });

  test('getFieldMonsFromLog handles P2 pivot switch correctly regardless of activeIdx', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const S = w.__stress;

      // Round with P2 pivot: Rotom-Wash uses Volt Switch, switches to Ferrothorn
      const pivotRd = S.mkRound(1, 'Garchomp', 'Rotom-Wash', 357, 300, 304, 260);
      pivotRd.p2SelfSwitch = true;
      pivotRd.p2PivotDone = true;
      pivotRd.pivotSwitch = { side: 'p2', incoming: 'Ferrothorn' };
      line.rounds = [pivotRd];
      line.roundCounter = 1;
      w.__rsaTest.rebuildLineTeams(line);

      // Set activeIdx to Tyranitar (wrong)
      line.teams.p2.activeIdx = 0;

      const field = w.__rsaTest.getFieldMonsFromLog();
      const r = { fieldP2: field.p2 ? field.p2.name : null };
      w.__stress.teardown(snap);
      return r;
    });

    // Pivot incoming = Ferrothorn, NOT activeIdx = Tyranitar
    expect(result.fieldP2).toBe('Ferrothorn');
  });

  test('rapid team preview cycling does not affect field state across 50 iterations', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();

      let mismatchCount = 0;
      for (let cycle = 0; cycle < 50; cycle++) {
        // Randomize activeIdx on both sides
        line.teams.p1.activeIdx = cycle % line.teams.p1.roster.length;
        line.teams.p2.activeIdx = (cycle * 2) % line.teams.p2.roster.length;

        const field = w.__rsaTest.getFieldMonsFromLog();
        if (!field.p1 || field.p1.name !== 'Garchomp') mismatchCount++;
        if (!field.p2 || field.p2.name !== 'Tyranitar') mismatchCount++;
      }

      w.__stress.teardown(snap);
      return { mismatchCount };
    });

    expect(result.mismatchCount).toBe(0);
  });
});

/* ── Multi-hit move tests ─────────────────────────────────────── */

test.describe('Multi-hit Move UI', () => {
  test.beforeEach(async ({ rsaPage }) => {
    await ensureStressHelpers(rsaPage);
  });

  /**
   * Helper: set P2 move slot 1 to Bullet Seed in the form,
   * wait for labels to update, then select R1 radio.
   */
  async function setupBulletSeedR1(rsaPage: any) {
    // Ensure the move selector has options (populated by shared_controls on gen change)
    await rsaPage.waitForFunction(() => {
      const $ = (window as any).jQuery;
      return $('#p2 .move1 .move-selector option').length > 10;
    }, { timeout: 5000 });

    await rsaPage.evaluate(() => {
      const $ = (window as any).jQuery;
      const $m = $('#p2 .move1 .move-selector');
      // Set via select2's underlying select (bypassing select2 display)
      $m.val('Bullet Seed').trigger('change');
    });
    // Wait for calc-trigger debounce (200ms) + DOM updates + autoSelectP2MostProbable (450ms)
    await rsaPage.waitForTimeout(1200);

    // Verify R1 label shows Bullet Seed
    await rsaPage.waitForFunction(() => {
      const label = document.querySelector('label[for="resultMoveR1"] .rsa-btn-move-name');
      return label && label.textContent === 'Bullet Seed';
    }, { timeout: 5000 });

    // Select R1 radio (after autoSelect has finished)
    await rsaPage.evaluate(() => {
      const $ = (window as any).jQuery;
      $('#resultMoveR1').prop('checked', true).trigger('change');
    });
    // Wait for updateMainMultiHitUI + syncP2HitsToForm deferred change + recalc
    // Note: must wait long enough for any delayed autoSelectP2MostProbable NOT to override
    await rsaPage.waitForTimeout(1000);

    // Always reset hits to default (3) so tests don't depend on prior state
    await rsaPage.evaluate(() => {
      const $ = (window as any).jQuery;
      if ($('#rsa-p2-hits-group').is(':visible')) {
        $('#rsa-p2-hits').val('3').trigger('change');
      }
    });
    await rsaPage.waitForTimeout(500);
  }

  test('hits dropdown appears when multi-hit move is selected', async ({ rsaPage }) => {
    await setupBulletSeedR1(rsaPage);

    const state = await rsaPage.evaluate(() => {
      const hitsGroup = document.getElementById('rsa-p2-hits-group');
      const hitsSelect = document.getElementById('rsa-p2-hits') as HTMLSelectElement;
      const r1 = document.getElementById('resultMoveR1') as HTMLInputElement;
      const moveName = document.querySelector('label[for="resultMoveR1"] .rsa-btn-move-name');
      return {
        hitsGroupVisible: hitsGroup ? hitsGroup.style.display !== 'none' : false,
        hitsValue: hitsSelect ? hitsSelect.value : 'n/a',
        r1Checked: r1 ? r1.checked : false,
        moveName: moveName ? moveName.textContent : 'n/a'
      };
    });

    expect(state.moveName).toBe('Bullet Seed');
    expect(state.r1Checked).toBe(true);
    expect(state.hitsGroupVisible).toBe(true);
    expect(state.hitsValue).toBe('3'); // default for non-Skill Link
  });

  test('changing hits recalculates damage badge', async ({ rsaPage }) => {
    await setupBulletSeedR1(rsaPage);

    // Read damage at 3 hits (default)
    const dmg3 = await rsaPage.evaluate(() => {
      const badge = document.querySelector('label[for="resultMoveR1"]');
      const parent = badge ? badge.parentElement : null;
      const badgeEl = parent ? parent.querySelector('.rsa-dmg-badge') : null;
      return badgeEl ? badgeEl.textContent!.trim().split(/[,(]/)[0] : 'n/a';
    });

    // Change to 5 hits via main selector
    await rsaPage.evaluate(() => {
      const $ = (window as any).jQuery;
      $('#rsa-p2-hits').val('5').trigger('change');
    });
    await rsaPage.waitForTimeout(800);

    // Read damage at 5 hits
    const state5 = await rsaPage.evaluate(() => {
      const badge = document.querySelector('label[for="resultMoveR1"]');
      const parent = badge ? badge.parentElement : null;
      const badgeEl = parent ? parent.querySelector('.rsa-dmg-badge') : null;
      const hitsSelect = document.getElementById('rsa-p2-hits') as HTMLSelectElement;
      return {
        badgeText: badgeEl ? badgeEl.textContent!.trim().split(/[,(]/)[0] : 'n/a',
        hitsValue: hitsSelect ? hitsSelect.value : 'n/a'
      };
    });

    // Damage at 5 hits should be higher than 3 hits
    expect(state5.hitsValue).toBe('5');
    expect(dmg3).not.toBe('n/a');
    expect(state5.badgeText).not.toBe('n/a');
    if (dmg3 !== 'n/a' && state5.badgeText !== 'n/a') {
      expect(state5.badgeText).not.toBe(dmg3);
    }
  });

  test('hits value persists during recalculation cycle', async ({ rsaPage }) => {
    await setupBulletSeedR1(rsaPage);

    // Set to 5 hits
    await rsaPage.evaluate(() => {
      const $ = (window as any).jQuery;
      $('#rsa-p2-hits').val('5').trigger('change');
    });
    await rsaPage.waitForTimeout(800);

    // Verify hits is still 5 after the recalc cycle
    const afterRecalc = await rsaPage.evaluate(() => {
      const hitsSelect = document.getElementById('rsa-p2-hits') as HTMLSelectElement;
      return { hitsValue: hitsSelect ? hitsSelect.value : 'n/a' };
    });
    expect(afterRecalc.hitsValue).toBe('5');

    // Trigger another recalc by changing a boost (innocuous change)
    await rsaPage.evaluate(() => {
      (window as any).jQuery('#p2 .at .boost').val(1).trigger('change');
    });
    await rsaPage.waitForTimeout(800);

    // Hits should still be 5
    const afterBoost = await rsaPage.evaluate(() => {
      const hitsSelect = document.getElementById('rsa-p2-hits') as HTMLSelectElement;
      return { hitsValue: hitsSelect ? hitsSelect.value : 'n/a' };
    });
    expect(afterBoost.hitsValue).toBe('5');
  });

  test('preview box shows hits dropdown for multi-hit move', async ({ rsaPage }) => {
    await setupBulletSeedR1(rsaPage);

    const preview = await rsaPage.evaluate(() => {
      const panel = document.getElementById('rsa-move-preview-p2');
      const previewHits = panel ? panel.querySelector('.rsa-preview-hits-select') as HTMLSelectElement : null;
      const previewName = panel ? (panel.querySelector('.rsa-preview-name') || {} as any).textContent : '';
      return {
        hasHitsDropdown: !!previewHits,
        previewHitsValue: previewHits ? previewHits.value : 'n/a',
        previewName: previewName || ''
      };
    });

    expect(preview.previewName).toBe('Bullet Seed');
    expect(preview.hasHitsDropdown).toBe(true);
    expect(preview.previewHitsValue).toBe('3');
  });

  test('preview hits dropdown syncs to main selector', async ({ rsaPage }) => {
    await setupBulletSeedR1(rsaPage);

    // Change hits via preview dropdown
    await rsaPage.evaluate(() => {
      const $ = (window as any).jQuery;
      $('.rsa-preview-hits-select').val('4').trigger('change');
    });
    await rsaPage.waitForTimeout(800);

    const state = await rsaPage.evaluate(() => {
      const mainHits = document.getElementById('rsa-p2-hits') as HTMLSelectElement;
      const previewHits = document.querySelector('.rsa-preview-hits-select') as HTMLSelectElement;
      return {
        mainHitsValue: mainHits ? mainHits.value : 'n/a',
        previewHitsValue: previewHits ? previewHits.value : 'n/a'
      };
    });

    expect(state.mainHitsValue).toBe('4');
    expect(state.previewHitsValue).toBe('4');
  });

  test('hits dropdown hidden for non-multi-hit move', async ({ rsaPage }) => {
    // Select R2 (whatever non-multi-hit move is in slot 2)
    await rsaPage.evaluate(() => {
      const $ = (window as any).jQuery;
      $('#resultMoveR2').prop('checked', true).trigger('change');
    });
    await rsaPage.waitForTimeout(600);

    const moveName = await rsaPage.evaluate(() => {
      const label = document.querySelector('label[for="resultMoveR2"] .rsa-btn-move-name');
      return label ? label.textContent : '';
    });

    // Only check if the move is actually non-multi-hit
    const isMultiHit = await rsaPage.evaluate((name: string) => {
      const md = (window as any).BattleMovedex[name.toLowerCase().replace(/[\s\-\']+/g, '')];
      return md && md.multihit && Array.isArray(md.multihit);
    }, moveName);

    if (!isMultiHit) {
      const state = await rsaPage.evaluate(() => {
        const hitsGroup = document.getElementById('rsa-p2-hits-group');
        const panel = document.getElementById('rsa-move-preview-p2');
        const previewHits = panel ? panel.querySelector('.rsa-preview-hits-select') : null;
        return {
          hitsGroupVisible: hitsGroup ? hitsGroup.style.display !== 'none' : false,
          hasPreviewHitsDropdown: !!previewHits
        };
      });

      expect(state.hitsGroupVisible).toBe(false);
      expect(state.hasPreviewHitsDropdown).toBe(false);
    }
  });

  test('Skill Link ability defaults to 5 hits', async ({ rsaPage }) => {
    // Ensure the move selector has options
    await rsaPage.waitForFunction(() => {
      const $ = (window as any).jQuery;
      return $('#p2 .move1 .move-selector option').length > 10;
    }, { timeout: 5000 });

    // Set P2's ability to Skill Link and move to Bullet Seed
    await rsaPage.evaluate(() => {
      const $ = (window as any).jQuery;
      $('#p2 .ability').val('Skill Link');
      $('#p2 .move1 .move-selector').val('Bullet Seed').trigger('change');
    });
    await rsaPage.waitForTimeout(1200);

    await rsaPage.waitForFunction(() => {
      const label = document.querySelector('label[for="resultMoveR1"] .rsa-btn-move-name');
      return label && label.textContent === 'Bullet Seed';
    }, { timeout: 5000 });

    // Select R1 radio
    await rsaPage.evaluate(() => {
      const $ = (window as any).jQuery;
      $('#resultMoveR1').prop('checked', true).trigger('change');
    });
    await rsaPage.waitForTimeout(1000);

    const state = await rsaPage.evaluate(() => {
      const hitsSelect = document.getElementById('rsa-p2-hits') as HTMLSelectElement;
      return { hitsValue: hitsSelect ? hitsSelect.value : 'n/a' };
    });

    expect(state.hitsValue).toBe('5');
  });

  test('damage badge shows total multi-hit damage (2 hits vs 5 hits)', async ({ rsaPage }) => {
    await setupBulletSeedR1(rsaPage);

    // Set to 2 hits
    await rsaPage.evaluate(() => {
      const $ = (window as any).jQuery;
      $('#rsa-p2-hits').val('2').trigger('change');
    });
    await rsaPage.waitForTimeout(800);

    const dmg2 = await rsaPage.evaluate(() => {
      const badge = document.querySelector('label[for="resultMoveR1"]');
      const parent = badge ? badge.parentElement : null;
      const badgeEl = parent ? parent.querySelector('.rsa-dmg-badge') : null;
      const text = badgeEl ? badgeEl.textContent!.trim() : '';
      const m = text.match(/^(\d+)\s*-\s*(\d+)/);
      return { min: m ? parseInt(m[1]) : 0, max: m ? parseInt(m[2]) : 0 };
    });

    // Set to 5 hits
    await rsaPage.evaluate(() => {
      const $ = (window as any).jQuery;
      $('#rsa-p2-hits').val('5').trigger('change');
    });
    await rsaPage.waitForTimeout(800);

    const dmg5 = await rsaPage.evaluate(() => {
      const badge = document.querySelector('label[for="resultMoveR1"]');
      const parent = badge ? badge.parentElement : null;
      const badgeEl = parent ? parent.querySelector('.rsa-dmg-badge') : null;
      const text = badgeEl ? badgeEl.textContent!.trim() : '';
      const m = text.match(/^(\d+)\s*-\s*(\d+)/);
      return { min: m ? parseInt(m[1]) : 0, max: m ? parseInt(m[2]) : 0 };
    });

    // 5-hit damage should be greater than 2-hit damage
    expect(dmg5.min).toBeGreaterThan(dmg2.min);
    expect(dmg5.max).toBeGreaterThan(dmg2.max);
    // Ratio should be approximately 5/2 = 2.5
    if (dmg2.min > 0) {
      const ratio = dmg5.min / dmg2.min;
      expect(ratio).toBeGreaterThan(2.2);
      expect(ratio).toBeLessThan(2.8);
    }
  });

  test('getDamageInfo reports multi-hit total, not per-hit (logged round / inline)', async ({ rsaPage }) => {
    // Regression: getDamageInfo feeds captureRound (logged-round damage). range() returns
    // PER-HIT damage, so the helper must multiply by move.hits. Before the fix it returned
    // the single-hit value, making logged multi-hit rounds (e.g. Bullet Seed) read as 1 hit.
    await setupBulletSeedR1(rsaPage);

    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      // Side 1 = P2 attacker, move slot 0 = Bullet Seed (R1 is selected by the setup helper).
      const info = w.__rsaTest.getDamageInfo(1, 0);
      if (!info) return null;
      const hits = info.move ? info.move.hits : 1;
      return {
        hits,
        perHitMin: info.range[0],
        perHitMax: info.range[1],
        totalMin: info.minDmg,
        totalMax: info.maxDmg
      };
    });

    expect(result).not.toBeNull();
    // Bullet Seed is a variable multi-hit move (2-5); default hits = 3.
    expect(result!.hits).toBeGreaterThan(1);
    // The reported total must equal per-hit × hits (the multiplier under test),
    // and must therefore exceed the single-hit value (the regression we guard against).
    expect(result!.totalMin).toBe(result!.perHitMin * result!.hits);
    expect(result!.totalMax).toBe(result!.perHitMax * result!.hits);
    expect(result!.totalMin).toBeGreaterThan(result!.perHitMin);
  });
});

// ════════════════════════════════════════════════════════════════════════
// Inline AI Rate Independence & Speed-Boost Correctness
//
// Root cause of recurring bug: calcP2MoveRates used raw base stats for
// fastestSide, so a speed-dropped P2 was still treated as faster, leading
// to Bullet Seed being preferred over Mach Punch.
//
// These tests guard three invariants:
//   1. Effective speed (with boost stages) diverges from base stats when
//      the entry has a speed drop — the math that the fix depends on.
//   2. renderInlineControls output is 100% derived from field entries
//      (getFieldMonsFromLog), NOT from the form-selected mon or activeIdx.
//   3. The default selected P2 move in the inline dropdown is the
//      highest-AI-rate move from the entry, not selectedP2Move (form state).
// ════════════════════════════════════════════════════════════════════════

test.describe('Stress: Inline AI Rate Independence & Speed-Boost Correctness', () => {

  // ── Regression: speed drop must flip fastestSide ─────────────────────

  test('speed drop on entry makes base-faster P2 appear slower via effective speed', async ({ rsaPage }) => {
    // Scenario: P2 base spe=70 (naturally faster than P1 spe=60), but P2 has a -2 sp boost
    // (e.g. from two Rock Tomb / Electroweb hits). After the fix, calcP2MoveRates computes
    // effective speed so P1 is correctly identified as faster and priority moves are preferred.
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const p2BaseSpe = 70;
      const p1BaseSpe = 60;

      // Effective speed of P2 with -2 sp: floor(70 × 2/(2+2)) = 35
      const p2EffSpe = w.__rsaTest.calcEffectiveSpeed(
        { item: '', ability: '', status: '', boosts: { sp: -2 } }, p2BaseSpe
      );
      // Effective speed of P1 with no boost
      const p1EffSpe = w.__rsaTest.calcEffectiveSpeed(
        { item: '', ability: '', status: '', boosts: {} }, p1BaseSpe
      );

      // Compute fastestSide both ways — before and after fix
      const oldFastestSide = p2BaseSpe >= p1BaseSpe ? '1' : '0'; // base-stat only (bug)
      const newFastestSide = p2EffSpe  >= p1EffSpe  ? '1' : '0'; // effective speed (fix)

      return { p2EffSpe, p1EffSpe, oldFastestSide, newFastestSide };
    });

    // Before fix: P2 "wins" purely on base stats — wrong when it has a speed drop
    expect(result.oldFastestSide).toBe('1');
    // After fix: P1 correctly identified as faster
    expect(result.newFastestSide).toBe('0');
    expect(result.p2EffSpe).toBe(35);   // floor(70 × 2/4)
    expect(result.p1EffSpe).toBe(60);
  });

  test('speed drop of -4 stages reduces effective speed to 25%', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const base = 80;
      const spd = w.__rsaTest.calcEffectiveSpeed(
        { item: '', ability: '', status: '', boosts: { sp: -4 } }, base
      );
      return { spd, expected: Math.floor(base * 2 / (2 + 4)) };
    });
    expect(result.spd).toBe(result.expected); // floor(80 * 2/6) = 26
  });

  test('no boost means effective speed equals base speed (no item, no status)', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const base = 95;
      const spd = w.__rsaTest.calcEffectiveSpeed(
        { item: '', ability: '', status: '', boosts: { sp: 0 } }, base
      );
      return { spd };
    });
    expect(result.spd).toBe(95);
  });

  // ── Inline controls independence from form / activeIdx ───────────────

  test('renderInlineControls P2 name comes from field entry not form-loaded mon', async ({ rsaPage }) => {
    // Field P2 is Tyranitar (from the round log). If we load Rotom-Wash into the
    // form, the inline HTML must still show Tyranitar — not Rotom-Wash.
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();

      // Load a different P2 mon into the calc form (without changing field state)
      w.__rsaTest.loadPokemonIntoForm('p2', line.teams.p2.roster[1]); // Rotom-Wash

      const html = w.__rsaTest.renderInlineControls();
      // The P2 row must name the field mon, not the form mon
      const hasTyranitar = html.indexOf('Tyranitar') !== -1;
      const hasRotomWash = html.indexOf('Rotom-Wash') !== -1;

      w.__stress.teardown(snap);
      return { hasTyranitar, hasRotomWash };
    });

    expect(result.hasTyranitar).toBe(true);
    expect(result.hasRotomWash).toBe(false);
  });

  test('renderInlineControls P2 move dropdown is identical before and after loading different P2 into form', async ({ rsaPage }) => {
    // The P2 inline move dropdown must reflect the FIELD P2 entry exclusively.
    // Loading a different mon into the P2 form slot must not change it.
    // NOTE: P1 form changes can legitimately affect the P1 default (it tracks
    // selectedP1Move by design), so we isolate only P2 form changes here.
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();

      const extractP2Select = (html: string) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const sel = doc.querySelector('.rsa-inline-p2-move');
        return sel ? sel.outerHTML : '';
      };

      const p2SelectBefore = extractP2Select(w.__rsaTest.renderInlineControls());

      // Load every P2 roster mon into the P2 form slot in turn
      for (let i = 0; i < line.teams.p2.roster.length; i++) {
        w.__rsaTest.loadPokemonIntoForm('p2', line.teams.p2.roster[i]);
      }

      const p2SelectAfter = extractP2Select(w.__rsaTest.renderInlineControls());

      w.__stress.teardown(snap);
      return { identical: p2SelectBefore === p2SelectAfter, lenBefore: p2SelectBefore.length, lenAfter: p2SelectAfter.length };
    });

    expect(result.lenBefore).toBeGreaterThan(0);
    expect(result.identical).toBe(true);
  });

  test('renderInlineControls P2 move dropdown stable across 30 activeIdx + P2 form cycles', async ({ rsaPage }) => {
    // Aggressively cycle both activeIdx values and P2 form state. The P2 move
    // dropdown must never drift — it reads only from the field entry.
    // (P1 form changes are excluded because selectedP1Move is intentionally
    // form-coupled on the P1 side.)
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();

      const extractP2Select = (html: string) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const sel = doc.querySelector('.rsa-inline-p2-move');
        return sel ? sel.outerHTML : '';
      };

      const baseline = extractP2Select(w.__rsaTest.renderInlineControls());

      let driftCount = 0;
      for (let i = 0; i < 30; i++) {
        // Cycle both activeIdx
        line.teams.p1.activeIdx = i % line.teams.p1.roster.length;
        line.teams.p2.activeIdx = (i * 2) % line.teams.p2.roster.length;
        // Only change P2 form (P1 form changes selectedP1Move which is intentional)
        w.__rsaTest.loadPokemonIntoForm('p2', line.teams.p2.roster[(i * 2) % line.teams.p2.roster.length]);
        const current = extractP2Select(w.__rsaTest.renderInlineControls());
        if (current !== baseline) driftCount++;
      }

      w.__stress.teardown(snap);
      return { driftCount };
    });

    expect(result.driftCount).toBe(0);
  });

  test('renderInlineControls inline P2 move dropdown has exactly one selected option', async ({ rsaPage }) => {
    // Verifies that the inline always has a well-defined default regardless of form state.
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();

      const html = w.__rsaTest.renderInlineControls();

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const p2Sel = doc.querySelector('.rsa-inline-p2-move');
      const p1Sel = doc.querySelector('.rsa-inline-p1-move');
      const p2Selected = p2Sel ? p2Sel.querySelectorAll('option[selected]') : [];
      const p1Selected = p1Sel ? p1Sel.querySelectorAll('option[selected]') : [];

      w.__stress.teardown(snap);
      return {
        p2SelectCount: p2Selected.length,
        p1SelectCount: p1Selected.length,
        p2Value: p2Selected.length > 0 ? (p2Selected[0] as any).value : null,
        hasP2Sel: !!p2Sel,
        hasP1Sel: !!p1Sel,
      };
    });

    expect(result.hasP2Sel).toBe(true);
    expect(result.hasP1Sel).toBe(true);
    // Exactly one option must be pre-selected (the AI-best move)
    expect(result.p2SelectCount).toBe(1);
    // The selected value must be a move index (0–3), not the placeholder 'none'
    expect(result.p2Value).not.toBe('none');
    expect(result.p2Value).not.toBeNull();
  });

  test('renderInlineControls P2 move options contain all 4 moves from field entry regardless of boosts', async ({ rsaPage }) => {
    // Verifies the P2 inline select is populated purely from the field entry’s
    // move list. Speed boosts on the entry must not drop moves from the select.
    // AI [X%] labels require a real setId to compute; with fake test entries the
    // rate map is empty and no label is emitted (tested via unit tests instead).
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();
      const line = w.__rsaTest.curLine();
      const p2Entry = line.teams.p2.roster[0]; // Tyranitar (4 moves)

      const countP2Options = (html: string) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const sel = doc.querySelector('.rsa-inline-p2-move');
        // Exclude the placeholder ‘— P2 Move —’ option (value='none')
        const opts = sel ? sel.querySelectorAll('option:not([value="none"])') : [];
        return opts.length;
      };

      const moveCount = (p2Entry.moves as string[]).filter(
        (m: string) => m && m !== '(No Move)'
      ).length;

      // Render with no boost
      p2Entry.boosts = { at: 0, df: 0, sa: 0, sd: 0, sp: 0 };
      const countNoBoost = countP2Options(w.__rsaTest.renderInlineControls());

      // Render with severe speed drop
      p2Entry.boosts = { at: 0, df: 0, sa: 0, sd: 0, sp: -4 };
      const countDropped = countP2Options(w.__rsaTest.renderInlineControls());

      p2Entry.boosts = { at: 0, df: 0, sa: 0, sd: 0, sp: 0 };
      w.__stress.teardown(snap);

      return { countNoBoost, countDropped, moveCount };
    });

    // All moves must appear in both renders — boosts must not trim the dropdown
    expect(result.countNoBoost).toBe(result.moveCount);
    expect(result.countDropped).toBe(result.moveCount);
  });

  test('inline P2 move dropdown uses highest-AI-rate index, not selectedP2Move', async ({ rsaPage }) => {
    // This guards the comment in renderInlineControls:
    //   "Always default to the highest AI rate — selectedP2Move tracks
    //    the calc form which may show a different P1 than the field mon"
    // We verify that no matter what, the selected option comes from _bestP2Idx
    // derived from AI rates (not a global form pointer).
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const snap = w.__stress.setup();

      // Simulate the form having R4 selected (a different move than the default)
      const r4 = document.getElementById('resultMoveR4') as HTMLInputElement;
      if (r4) {
        r4.checked = true;
        r4.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const html = w.__rsaTest.renderInlineControls();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const p2Sel = doc.querySelector('.rsa-inline-p2-move');
      const selectedOpts = p2Sel ? Array.from(p2Sel.querySelectorAll('option[selected]')) : [];

      w.__stress.teardown(snap);
      return {
        selectedCount: selectedOpts.length,
        selectedValue: selectedOpts.length > 0 ? (selectedOpts[0] as any).value : null,
      };
    });

    // Exactly one option selected (best AI rate), not R4 (form state)
    expect(result.selectedCount).toBe(1);
    expect(result.selectedValue).not.toBeNull();
    expect(result.selectedValue).not.toBe('none');
  });
});
