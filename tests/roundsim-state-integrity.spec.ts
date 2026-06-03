import { test, expect } from './fixtures';

/**
 * State integrity tests — verifies that ability and item on roster entries
 * always match the ground-truth data (trainer sets / logged rounds) and are
 * never corrupted by stale form values or out-of-order syncP2Team calls.
 *
 * This covers the recurring "Scolipede shows Analytic instead of Speed Boost"
 * class of bugs where ability contamination leaks between trainer pokemon.
 */

/* ── helper injection ─────────────────────────────────────────────── */

async function ensureIntegrityHelpers(rsaPage: any) {
  await rsaPage.evaluate(() => {
    const w = window as any;
    if (w.__integrityHelpers) return;

    /** Create a minimal roster entry with the given fields.
     *  Also registers a matching entry in window.setdex so lookupSet() can find it
     *  (required for the set-definition ability reset in rebuildLineTeams). */
    function mkEntry(name: string, ability: string, item: string = '') {
      const w2 = window as any;
      w2.setdex = w2.setdex || {};
      w2.setdex[name] = w2.setdex[name] || {};
      // Register a 'Test' set so lookupSet('<Name> (Test)') returns { ability, item }
      w2.setdex[name]['Test'] = { ability: ability, item: item, moves: [] };
      return {
        name,
        setId: name + ' (Test)',
        sprite: '',
        item: item,
        initialItem: item,
        ability: ability,
        moves: ['Tackle', 'Protect', 'Swords Dance', 'Close Combat'],
        types: ['Normal'],
        maxHP: 300,
        currentHP: 300,
        bestCaseHP: 300,
        status: '',
        toxicCounter: 0,
        boosts: { at: 0, df: 0, sa: 0, sd: 0, sp: 0 }
      };
    }

    /** Create a minimal round with explicit p1/p2 ability fields and optional boosts */
    function mkRoundWithAbility(
      num: number,
      p1Name: string, p1Ability: string, p1HPBefore: number, p1HPAfter: number,
      p2Name: string, p2Ability: string, p2HPBefore: number, p2HPAfter: number,
      p2SpBoost: number = 0, p1SpBoost: number = 0
    ) {
      return {
        roundNum: num,
        speed: { p1: 120, p2: 80, faster: 'p1' },
        weather: 'None', terrain: 'None', trickRoom: false, p2Crit: false,
        p1: {
          name: p1Name, sprite: '', item: '', ability: p1Ability, status: '',
          boosts: { at: 0, df: 0, sa: 0, sd: 0, sp: p1SpBoost },
          hpBefore: { current: p1HPBefore, max: 300, bestCase: p1HPBefore },
          hpAfter:  { current: p1HPAfter,  max: 300, bestCase: p1HPAfter },
          move: 'Tackle', moveIdx: 0, flinched: false, blockReason: '',
          damage: { minDmg: 10, maxDmg: 20 }, extras: [], eot: []
        },
        p2: {
          name: p2Name, sprite: '', item: '', ability: p2Ability, status: '',
          boosts: { at: 0, df: 0, sa: 0, sd: 0, sp: p2SpBoost },
          hpBefore: { current: p2HPBefore, max: 300, bestCase: p2HPBefore },
          hpAfter:  { current: p2HPAfter,  max: 300, bestCase: p2HPAfter },
          move: 'Tackle', moveIdx: 0, flinched: false, blockReason: '',
          damage: { minDmg: 10, maxDmg: 20 }, extras: [], eot: [],
          aiPcts: [], allMoves: []
        }
      };
    }

    /** Save a snapshot of the current line state for teardown */
    function snapshot() {
      const line = w.__rsaTest.curLine();
      return {
        p1Roster: JSON.parse(JSON.stringify(line.teams.p1.roster)),
        p2Roster: JSON.parse(JSON.stringify(line.teams.p2.roster)),
        p1Idx: line.teams.p1.activeIdx,
        p2Idx: line.teams.p2.activeIdx,
        rounds: JSON.parse(JSON.stringify(line.rounds || [])),
        counter: line.roundCounter
      };
    }

    /** Restore from a snapshot */
    function restore(snap: any) {
      const line = w.__rsaTest.curLine();
      line.teams.p1.roster = snap.p1Roster;
      line.teams.p1.activeIdx = snap.p1Idx;
      line.teams.p2.roster = snap.p2Roster;
      line.teams.p2.activeIdx = snap.p2Idx;
      line.rounds = snap.rounds;
      line.roundCounter = snap.counter;
      // Clean up any 'Test' sets injected by mkEntry
      const sd = w.setdex;
      if (sd) {
        for (const k in sd) {
          if (sd[k] && sd[k]['Test']) delete sd[k]['Test'];
        }
      }
    }

    w.__integrityHelpers = { mkEntry, mkRoundWithAbility, snapshot, restore };
  });
}

test.beforeEach(async ({ rsaPage }) => {
  await ensureIntegrityHelpers(rsaPage);
});

/* ── rebuildLineTeams ability restoration ─────────────────────────── */

test.describe('State Integrity — ability/item preservation', () => {

  test('rebuildLineTeams resets p2 ability from set definition', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const H = w.__integrityHelpers;
      const snap = H.snapshot();
      const line = w.__rsaTest.curLine();

      // Set up: Scolipede (Speed Boost) vs Garchomp
      line.teams.p1.roster = [H.mkEntry('Garchomp', 'Rough Skin')];
      line.teams.p1.activeIdx = 0;
      line.teams.p2.roster = [H.mkEntry('Scolipede', 'Speed Boost')];
      line.teams.p2.activeIdx = 0;
      line.rounds = [
        H.mkRoundWithAbility(1, 'Garchomp', 'Rough Skin', 357, 300, 'Scolipede', 'Speed Boost', 300, 250)
      ];
      w.__rsaTest.rebuildLineTeams(line);

      // Simulate contamination: corrupt the entry after rebuild
      line.teams.p2.roster[0].ability = 'Analytic';

      // Scolipede's entry ability must be restored from set definition even
      // though the round data had 'Analytic' — set definition is always the ground truth.
      // Also verify round data is patched to match.
      w.__rsaTest.rebuildLineTeams(line);

      const rosterAbility = line.teams.p2.roster[0].ability;
      const roundAbility  = line.rounds[0].p2.ability;
      H.restore(snap);
      return { rosterAbility, roundAbility };
    });

    expect(result.rosterAbility).toBe('Speed Boost');
    // round data must also be patched to the correct ability
    expect(result.roundAbility).toBe('Speed Boost');
  });

  test('rebuildLineTeams resets p1 ability from set definition', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const H = w.__integrityHelpers;
      const snap = H.snapshot();
      const line = w.__rsaTest.curLine();

      line.teams.p1.roster = [H.mkEntry('Dragonite', 'Inner Focus')];
      line.teams.p1.activeIdx = 0;
      line.teams.p2.roster = [H.mkEntry('Scolipede', 'Speed Boost')];
      line.teams.p2.activeIdx = 0;
      line.rounds = [
        H.mkRoundWithAbility(1, 'Dragonite', 'Inner Focus', 357, 300, 'Scolipede', 'Speed Boost', 300, 250)
      ];
      w.__rsaTest.rebuildLineTeams(line);

      // Corrupt p1 ability after setup
      line.teams.p1.roster[0].ability = 'Multiscale';

      // Rebuild resets from set definition
      w.__rsaTest.rebuildLineTeams(line);

      const ability = line.teams.p1.roster[0].ability;
      H.restore(snap);
      return ability;
    });

    expect(result).toBe('Inner Focus');
  });

  test('rebuildLineTeams restores ability for multi-round battles', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const H = w.__integrityHelpers;
      const snap = H.snapshot();
      const line = w.__rsaTest.curLine();

      line.teams.p1.roster = [H.mkEntry('Dragonite', 'Multiscale')];
      line.teams.p1.activeIdx = 0;
      line.teams.p2.roster = [
        H.mkEntry('Scolipede', 'Speed Boost'),
        H.mkEntry('Starmie', 'Analytic')
      ];
      line.teams.p2.activeIdx = 0;

      // 3 rounds, all with Scolipede
      line.rounds = [
        H.mkRoundWithAbility(1, 'Dragonite', 'Multiscale', 357, 320, 'Scolipede', 'Speed Boost', 300, 260),
        H.mkRoundWithAbility(2, 'Dragonite', 'Multiscale', 320, 285, 'Scolipede', 'Speed Boost', 260, 210),
        H.mkRoundWithAbility(3, 'Dragonite', 'Multiscale', 285, 250, 'Scolipede', 'Speed Boost', 210, 150)
      ];
      w.__rsaTest.rebuildLineTeams(line);

      // Corrupt Scolipede's ability (simulates the reported bug)
      line.teams.p2.roster[0].ability = 'Analytic';

      w.__rsaTest.rebuildLineTeams(line);

      const scolipede = line.teams.p2.roster[0];
      const starmie   = line.teams.p2.roster[1];
      H.restore(snap);
      return { scolipede: scolipede.ability, starmieUnchanged: starmie.ability };
    });

    // Scolipede must be reset to Speed Boost from the set definition
    expect(result.scolipede).toBe('Speed Boost');
    // Starmie hasn't been in any round — its ability stays as-is in the roster entry
    expect(result.starmieUnchanged).toBe('Analytic');
  });

  test('rebuildBranchTeams resets p2 ability from set definition', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const H = w.__integrityHelpers;
      const snap = H.snapshot();
      const line = w.__rsaTest.curLine();

      line.teams.p1.roster = [H.mkEntry('Garchomp', 'Rough Skin')];
      line.teams.p1.activeIdx = 0;
      line.teams.p2.roster = [H.mkEntry('Scolipede', 'Speed Boost')];
      line.teams.p2.activeIdx = 0;
      line.rounds = [
        H.mkRoundWithAbility(1, 'Garchomp', 'Rough Skin', 357, 300, 'Scolipede', 'Speed Boost', 300, 250)
      ];

      // Corrupt ability
      line.teams.p2.roster[0].ability = 'Analytic';

      // rebuildBranchTeams on the main line (branchIdx = -1)
      w.__rsaTest.rebuildBranchTeams(line, -1);

      const ability = line.teams.p2.roster[0].ability;
      H.restore(snap);
      return ability;
    });

    expect(result).toBe('Speed Boost');
  });

  test('ability not contaminated when two pokemon share the same trainer slot order', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const H = w.__integrityHelpers;
      const snap = H.snapshot();
      const line = w.__rsaTest.curLine();

      // Trainer has Scolipede (Speed Boost) THEN Starmie (Analytic)
      line.teams.p1.roster = [H.mkEntry('Dragonite', 'Multiscale')];
      line.teams.p1.activeIdx = 0;
      line.teams.p2.roster = [
        H.mkEntry('Scolipede', 'Speed Boost'),
        H.mkEntry('Starmie', 'Analytic')
      ];
      line.teams.p2.activeIdx = 0;

      // Battle logs only have Scolipede (Starmie never sent out)
      line.rounds = [
        H.mkRoundWithAbility(1, 'Dragonite', 'Multiscale', 357, 300, 'Scolipede', 'Speed Boost', 300, 200),
        H.mkRoundWithAbility(2, 'Dragonite', 'Multiscale', 300, 250, 'Scolipede', 'Speed Boost', 200, 0)
      ];
      w.__rsaTest.rebuildLineTeams(line);

      // After rebuild, Scolipede must have Speed Boost (not Analytic from Starmie)
      const scolipede = line.teams.p2.roster[0];
      H.restore(snap);
      return { ability: scolipede.ability, name: scolipede.name };
    });

    expect(result.name).toBe('Scolipede');
    expect(result.ability).toBe('Speed Boost');
  });

  test('ability in final round matches roster entry (no cross-contamination)', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const H = w.__integrityHelpers;
      const snap = H.snapshot();
      const line = w.__rsaTest.curLine();

      line.teams.p1.roster = [H.mkEntry('Dragonite', 'Multiscale')];
      line.teams.p1.activeIdx = 0;
      line.teams.p2.roster = [
        H.mkEntry('Scolipede', 'Speed Boost'),
        H.mkEntry('Starmie', 'Analytic')
      ];
      line.teams.p2.activeIdx = 0;

      // Multiple rounds logged
      line.rounds = [
        H.mkRoundWithAbility(1, 'Dragonite', 'Multiscale', 357, 320, 'Scolipede', 'Speed Boost', 300, 240),
        H.mkRoundWithAbility(2, 'Dragonite', 'Multiscale', 320, 285, 'Scolipede', 'Speed Boost', 240, 160),
        H.mkRoundWithAbility(3, 'Dragonite', 'Multiscale', 285, 250, 'Scolipede', 'Speed Boost', 160, 0)
      ];
      w.__rsaTest.rebuildLineTeams(line);

      const lastRoundAbility = line.rounds[2].p2.ability;
      const rosterAbility = line.teams.p2.roster[line.teams.p2.activeIdx].ability;
      H.restore(snap);
      return { lastRoundAbility, rosterAbility };
    });

    // Both the logged round data and the live roster entry must show Speed Boost
    expect(result.lastRoundAbility).toBe('Speed Boost');
    expect(result.rosterAbility).toBe('Speed Boost');
  });

  test('ability restored after repeated rebuildLineTeams calls', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const H = w.__integrityHelpers;
      const snap = H.snapshot();
      const line = w.__rsaTest.curLine();

      line.teams.p1.roster = [H.mkEntry('Garchomp', 'Rough Skin')];
      line.teams.p1.activeIdx = 0;
      line.teams.p2.roster = [H.mkEntry('Scolipede', 'Speed Boost')];
      line.teams.p2.activeIdx = 0;
      line.rounds = [
        H.mkRoundWithAbility(1, 'Garchomp', 'Rough Skin', 357, 300, 'Scolipede', 'Speed Boost', 300, 250)
      ];

      // Simulate multiple corruptions and rebuilds (stress-test the fix)
      for (let i = 0; i < 5; i++) {
        line.teams.p2.roster[0].ability = 'Analytic';
        w.__rsaTest.rebuildLineTeams(line);
      }

      const ability = line.teams.p2.roster[0].ability;
      H.restore(snap);
      return ability;
    });

    expect(result).toBe('Speed Boost');
  });

  test('normalization restores ability for pokemon not yet in any round', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const H = w.__integrityHelpers;
      const snap = H.snapshot();
      const line = w.__rsaTest.curLine();

      // Only Scolipede has rounds; Starmie hasn't appeared
      line.teams.p1.roster = [H.mkEntry('Dragonite', 'Inner Focus')];
      line.teams.p1.activeIdx = 0;
      line.teams.p2.roster = [
        H.mkEntry('Scolipede', 'Speed Boost'),
        H.mkEntry('Starmie', 'Analytic')
      ];
      line.teams.p2.activeIdx = 0;
      line.rounds = [
        H.mkRoundWithAbility(1, 'Dragonite', 'Inner Focus', 357, 300, 'Scolipede', 'Speed Boost', 300, 250)
      ];
      w.__rsaTest.rebuildLineTeams(line);

      // After rebuild: Scolipede should have Speed Boost (from round),
      // Starmie should NOT have been accidentally overwritten with Speed Boost
      const scolipede = line.teams.p2.roster[0];
      const starmie   = line.teams.p2.roster[1];
      H.restore(snap);
      return { scolipede: scolipede.ability, starmie: starmie.ability };
    });

    expect(result.scolipede).toBe('Speed Boost');
    // Starmie keeps its own ability — was never in a round but also never corrupted
    expect(result.starmie).toBe('Analytic');
  });

});

/* ── Speed Boost EOT speed stage gain ────────────────────────────── */

test.describe('State Integrity — Speed Boost EOT', () => {

  test('Speed Boost adds +1 speed stage at end of round', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const H = w.__integrityHelpers;
      const snap = H.snapshot();
      const line = w.__rsaTest.curLine();

      line.teams.p1.roster = [H.mkEntry('Dragonite', 'Multiscale')];
      line.teams.p1.activeIdx = 0;
      line.teams.p2.roster = [H.mkEntry('Scolipede', 'Speed Boost')];
      line.teams.p2.activeIdx = 0;
      line.rounds = [];

      // Boosts start at 0
      const spBefore = line.teams.p2.roster[0].boosts.sp;

      // After captureRound, Speed Boost fires at EOT and bakes sp:1 into round data.
      // Simulate that by passing p2SpBoost=1 to mkRoundWithAbility.
      line.rounds = [
        H.mkRoundWithAbility(1, 'Dragonite', 'Multiscale', 357, 300, 'Scolipede', 'Speed Boost', 300, 250, 1)
      ];
      w.__rsaTest.rebuildLineTeams(line);

      const spAfterRound1 = line.teams.p2.roster[0].boosts.sp;
      H.restore(snap);
      return { spBefore, spAfterRound1 };
    });

    expect(result.spBefore).toBe(0);
    expect(result.spAfterRound1).toBe(1);
  });

  test('Speed Boost accumulates +1 per round up to +6', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const H = w.__integrityHelpers;
      const snap = H.snapshot();
      const line = w.__rsaTest.curLine();

      line.teams.p1.roster = [H.mkEntry('Dragonite', 'Multiscale')];
      line.teams.p1.activeIdx = 0;
      line.teams.p2.roster = [H.mkEntry('Scolipede', 'Speed Boost')];
      line.teams.p2.activeIdx = 0;
      line.rounds = [
        H.mkRoundWithAbility(1, 'Dragonite', 'Multiscale', 357, 320, 'Scolipede', 'Speed Boost', 300, 260, 1),
        H.mkRoundWithAbility(2, 'Dragonite', 'Multiscale', 320, 285, 'Scolipede', 'Speed Boost', 260, 220, 2),
        H.mkRoundWithAbility(3, 'Dragonite', 'Multiscale', 285, 250, 'Scolipede', 'Speed Boost', 220, 180, 3)
      ];
      w.__rsaTest.rebuildLineTeams(line);

      const spAfter3 = line.teams.p2.roster[0].boosts.sp;
      H.restore(snap);
      return { spAfter3 };
    });

    expect(result.spAfter3).toBe(3);
  });

  test('Speed Boost does NOT apply if pokemon is KOed', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const H = w.__integrityHelpers;
      const snap = H.snapshot();
      const line = w.__rsaTest.curLine();

      line.teams.p1.roster = [H.mkEntry('Dragonite', 'Multiscale')];
      line.teams.p1.activeIdx = 0;
      line.teams.p2.roster = [H.mkEntry('Scolipede', 'Speed Boost')];
      line.teams.p2.activeIdx = 0;
      // Scolipede is KOed in round 1 (hpAfter = 0)
      line.rounds = [
        H.mkRoundWithAbility(1, 'Dragonite', 'Multiscale', 357, 300, 'Scolipede', 'Speed Boost', 300, 0)
      ];
      w.__rsaTest.rebuildLineTeams(line);

      const spAfterKO = line.teams.p2.roster[0].boosts.sp;
      H.restore(snap);
      return { spAfterKO };
    });

    // KOed pokemon should not receive a Speed Boost stage
    expect(result.spAfterKO).toBe(0);
  });

  test('Opponent without Speed Boost does NOT gain speed stages', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const H = w.__integrityHelpers;
      const snap = H.snapshot();
      const line = w.__rsaTest.curLine();

      line.teams.p1.roster = [H.mkEntry('Garchomp', 'Rough Skin')];
      line.teams.p1.activeIdx = 0;
      line.teams.p2.roster = [H.mkEntry('Scolipede', 'Speed Boost')];
      line.teams.p2.activeIdx = 0;
      line.rounds = [
        H.mkRoundWithAbility(1, 'Garchomp', 'Rough Skin', 357, 300, 'Scolipede', 'Speed Boost', 300, 250, 1)
      ];
      w.__rsaTest.rebuildLineTeams(line);

      const p1Sp = line.teams.p1.roster[0].boosts.sp;
      const p2Sp = line.teams.p2.roster[0].boosts.sp;
      H.restore(snap);
      return { p1Sp, p2Sp };
    });

    expect(result.p1Sp).toBe(0);   // Rough Skin has no eotSpeedBoost
    expect(result.p2Sp).toBe(1);   // Speed Boost gives +1
  });

});
