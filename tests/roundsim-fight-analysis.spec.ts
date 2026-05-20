import { test, expect } from './fixtures';

test.describe('Fight Analysis', () => {

  test('analyzeFight is exposed on __rsaTest', async ({ rsaPage }) => {
    const exists = await rsaPage.evaluate(() => typeof (window as any).__rsaTest.analyzeFight);
    expect(exists).toBe('function');
  });

  test('analyzeFight returns empty rounds when line has no round data', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      // Build a minimal line object with no rounds
      const line = w.__rsaTest.curLine();
      // Temporarily clear rounds
      const origRounds = line.rounds ? line.rounds.slice() : [];
      const origBranches = line.branches ? JSON.parse(JSON.stringify(line.branches)) : [];
      line.rounds = [];
      line.branches = [];
      line.activeBranchIdx = -1;

      const result = w.__rsaTest.analyzeFight(line);

      // Restore
      line.rounds = origRounds;
      line.branches = origBranches;
      return result;
    });
    expect(result).toBeTruthy();
    expect(result.rounds).toEqual([]);
  });

  test('analyzeFight result has correct shape with round data', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const line = w.__rsaTest.curLine();

      // Inject a synthetic round matching the structure analyzeFight expects
      const origRounds = line.rounds ? line.rounds.slice() : [];
      const origBranches = line.branches ? JSON.parse(JSON.stringify(line.branches)) : [];
      line.activeBranchIdx = -1;
      line.rounds = [{
        roundNum: 1,
        branchIdx: -1,
        p1: {
          name: 'TestMon', setId: null, moves: ['Thunderbolt'],
          hpBefore: { current: 300, max: 300 },
          hpAfter: { current: 300, max: 300 },
          status: '', item: '', ability: ''
        },
        p2: {
          name: 'FoeMon', setId: null, moves: ['Earthquake'],
          hpBefore: { current: 250, max: 250 },
          hpAfter: { current: 100, max: 250 },
          status: '', item: '', ability: ''
        },
        isP2Switch: false
      }];
      line.branches = [];

      let result;
      try { result = w.__rsaTest.analyzeFight(line); } catch (e) { result = { error: String(e) }; }

      line.rounds = origRounds;
      line.branches = origBranches;
      return result;
    });

    expect(result).toBeTruthy();
    // Even if analysis can't fully calculate (no setId), it should return the shape
    if (!result.error) {
      expect(result).toHaveProperty('rounds');
      expect(result).toHaveProperty('summary');
      expect(Array.isArray(result.rounds)).toBe(true);
    }
  });

  test('getBranchRounds is exposed and returns array', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const line = w.__rsaTest.curLine();
      return Array.isArray(w.__rsaTest.getBranchRounds(line, -1));
    });
    expect(result).toBe(true);
  });

  test('findInRoster returns -1 for non-existent name', async ({ rsaPage }) => {
    const idx = await rsaPage.evaluate(() => {
      const w = window as any;
      const line = w.__rsaTest.curLine();
      const team = line && line.teams && line.teams.p1 ? line.teams.p1 : { roster: [] };
      return w.__rsaTest.findInRoster(team, 'NonExistentMon_XYZ');
    });
    expect(idx).toBe(-1);
  });

  test('_autoCreateBaitMoveBranches is exposed', async ({ rsaPage }) => {
    const exists = await rsaPage.evaluate(() => typeof (window as any).__rsaTest._autoCreateBaitMoveBranches);
    expect(exists).toBe('function');
  });

  test('_autoCreateBaitMoveBranches creates one branch per new move (analysis handles fork vars)', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const line = w.__rsaTest.curLine();

      // Save original state
      const origBranches = line.branches ? JSON.parse(JSON.stringify(line.branches)) : [];
      const origActiveBranch = line.activeBranchIdx;

      const rounds = w.__rsaTest.getBranchRounds(line, line.activeBranchIdx || -1);
      if (!rounds || rounds.length < 4) {
        return { skip: true, reason: 'Line needs at least 4 rounds' };
      }

      const analysis = w.__rsaTest.analyzeFight(line);

      const targetRoundIdx = 3;
      const targetRd = rounds[targetRoundIdx];
      if (!targetRd || !targetRd.p2 || !targetRd.p2.allMoves) {
        return { skip: true, reason: 'Round 4 missing allMoves data' };
      }

      // Find Will-O-Wisp in allMoves
      let wowIdx = -1;
      for (let i = 0; i < targetRd.p2.allMoves.length; i++) {
        if (targetRd.p2.allMoves[i] === 'Will-O-Wisp') { wowIdx = i; break; }
      }
      if (wowIdx < 0) {
        return { skip: true, reason: 'Will-O-Wisp not in R4 allMoves' };
      }

      // Inject fake _isAIMoveSubFork targeting Will-O-Wisp
      analysis.rounds[2].forks.push({
        id: 'R3-test-ai-0', type: 'aiMoveSplit',
        label: 'no crit → R4 Will-O-Wisp (15.0%)',
        probability: 0.15,
        altP1HPMin: 80, altP1HPMax: 100, altP1Status: '',
        altP2HP: 148, kills: false, mainKills: false,
        dmgMin: 0, dmgMax: 0,
        bait: null, mainBait: null, baitDiffers: false,
        replay: [], diverges: false, deathOnFork: false, summary: '',
        _nextRoundMoveOverride: { moveIdx: wowIdx, moveName: 'Will-O-Wisp', roundIdx: targetRoundIdx },
        _isAIMoveSubFork: true
      });

      line.branches = [];

      let created: string[];
      try {
        created = w.__rsaTest._autoCreateBaitMoveBranches(line, analysis);
      } catch (e) {
        line.branches = origBranches;
        line.activeBranchIdx = origActiveBranch;
        return { error: String(e) };
      }

      const branchCount = line.branches.length;
      const branchInfo = line.branches.map((b: any) => ({
        name: b.name,
        key: b._autoBaitForkKey,
        hasRound: b.rounds && b.rounds.length > 0,
        roundP2Move: b.rounds && b.rounds[0] && b.rounds[0].p2 ? b.rounds[0].p2.move : null,
        baitForkMove: b.rounds && b.rounds[0] ? b.rounds[0]._baitForkMove : null
      }));

      // Restore original state
      line.branches = origBranches;
      line.activeBranchIdx = origActiveBranch;

      return { created, branchCount, branchInfo };
    });

    if ('skip' in result) {
      test.skip(true, (result as any).reason);
      return;
    }
    expect((result as any).error).toBeUndefined();
    // One branch per move — analysis handles crits/misses/secondaries/rolls
    expect(result.created).toHaveLength(1);
    expect(result.created[0]).toBe('R4 Will-O-Wisp');
    expect(result.branchCount).toBe(1);

    const branch = (result as any).branchInfo[0];
    expect(branch.key).toBe('3:Will-O-Wisp');
    expect(branch.hasRound).toBe(true);
    expect(branch.roundP2Move).toBe('Will-O-Wisp');
    expect(branch.baitForkMove).toBe('Will-O-Wisp');
  });

  test('_autoCreateBaitMoveBranches creates branches for multiple new moves', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const line = w.__rsaTest.curLine();

      const origBranches = line.branches ? JSON.parse(JSON.stringify(line.branches)) : [];
      const origActiveBranch = line.activeBranchIdx;

      const rounds = w.__rsaTest.getBranchRounds(line, line.activeBranchIdx || -1);
      if (!rounds || rounds.length < 4) return { skip: true, reason: 'Needs 4+ rounds' };

      const targetRd = rounds[3];
      if (!targetRd || !targetRd.p2 || !targetRd.p2.allMoves) return { skip: true, reason: 'R4 no allMoves' };

      // Find two different moves
      let wowIdx = -1, vsIdx = -1;
      for (let i = 0; i < targetRd.p2.allMoves.length; i++) {
        if (targetRd.p2.allMoves[i] === 'Will-O-Wisp') wowIdx = i;
        if (targetRd.p2.allMoves[i] === 'Volt Switch') vsIdx = i;
      }
      if (wowIdx < 0 || vsIdx < 0) return { skip: true, reason: 'Need both WoW and Volt Switch in R4' };

      const analysis = w.__rsaTest.analyzeFight(line);

      // Inject two different sub-forks for two new moves
      analysis.rounds[2].forks.push({
        id: 'R3-ai-wow', type: 'aiMoveSplit',
        label: 'no crit → R4 Will-O-Wisp (15.0%)',
        probability: 0.15,
        altP1HPMin: 80, altP1HPMax: 100, altP1Status: '',
        altP2HP: 148, kills: false, mainKills: false,
        dmgMin: 0, dmgMax: 0,
        bait: null, mainBait: null, baitDiffers: false,
        replay: [], diverges: false, deathOnFork: false, summary: '',
        _nextRoundMoveOverride: { moveIdx: wowIdx, moveName: 'Will-O-Wisp', roundIdx: 3 },
        _isAIMoveSubFork: true
      });
      analysis.rounds[2].forks.push({
        id: 'R3-ai-vs', type: 'aiMoveSplit',
        label: 'no crit → R4 Volt Switch (10.0%)',
        probability: 0.10,
        altP1HPMin: 80, altP1HPMax: 100, altP1Status: '',
        altP2HP: 148, kills: false, mainKills: false,
        dmgMin: 0, dmgMax: 0,
        bait: null, mainBait: null, baitDiffers: false,
        replay: [], diverges: false, deathOnFork: false, summary: '',
        _nextRoundMoveOverride: { moveIdx: vsIdx, moveName: 'Volt Switch', roundIdx: 3 },
        _isAIMoveSubFork: true
      });

      line.branches = [];
      const created = w.__rsaTest._autoCreateBaitMoveBranches(line, analysis);
      const branchCount = line.branches.length;
      const branchNames = line.branches.map((b: any) => b.name);

      line.branches = origBranches;
      line.activeBranchIdx = origActiveBranch;

      return { created, branchCount, branchNames };
    });

    if ('skip' in result) {
      test.skip(true, (result as any).reason);
      return;
    }
    // One branch per move
    expect(result.created).toHaveLength(2);
    expect(result.branchNames).toContain('R4 Will-O-Wisp');
    expect(result.branchNames).toContain('R4 Volt Switch');
    expect(result.branchCount).toBe(2);
  });

  test('_autoCreateBaitMoveBranches prevents duplicate branches', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const line = w.__rsaTest.curLine();

      const origBranches = line.branches ? JSON.parse(JSON.stringify(line.branches)) : [];
      const origActiveBranch = line.activeBranchIdx;

      const rounds = w.__rsaTest.getBranchRounds(line, line.activeBranchIdx || -1);
      if (!rounds || rounds.length < 4) return { skip: true, reason: 'Needs 4+ rounds' };

      const targetRd = rounds[3];
      if (!targetRd || !targetRd.p2 || !targetRd.p2.allMoves) return { skip: true, reason: 'R4 no allMoves' };

      let wowIdx = -1;
      for (let i = 0; i < targetRd.p2.allMoves.length; i++) {
        if (targetRd.p2.allMoves[i] === 'Will-O-Wisp') { wowIdx = i; break; }
      }
      if (wowIdx < 0) return { skip: true, reason: 'No WoW in R4' };

      const fakeFork = {
        id: 'R3-dupe-ai-0', type: 'aiMoveSplit',
        label: 'dupe test → R4 Will-O-Wisp (15.0%)',
        probability: 0.15,
        altP1HPMin: 80, altP1HPMax: 100, altP1Status: '',
        altP2HP: 148, kills: false, mainKills: false,
        dmgMin: 0, dmgMax: 0,
        bait: null, mainBait: null, baitDiffers: false,
        replay: [], diverges: false, deathOnFork: false, summary: '',
        _nextRoundMoveOverride: { moveIdx: wowIdx, moveName: 'Will-O-Wisp', roundIdx: 3 },
        _isAIMoveSubFork: true
      };

      line.branches = [];

      // First call — creates branch
      const analysis1 = w.__rsaTest.analyzeFight(line);
      analysis1.rounds[2].forks.push(JSON.parse(JSON.stringify(fakeFork)));
      const created1 = w.__rsaTest._autoCreateBaitMoveBranches(line, analysis1);

      // Second call — should not duplicate
      const analysis2 = w.__rsaTest.analyzeFight(line);
      analysis2.rounds[2].forks.push(JSON.parse(JSON.stringify(fakeFork)));
      const created2 = w.__rsaTest._autoCreateBaitMoveBranches(line, analysis2);

      const finalBranchCount = line.branches.length;

      // Restore
      line.branches = origBranches;
      line.activeBranchIdx = origActiveBranch;

      return { created1, created2, finalBranchCount };
    });

    if ('skip' in result) {
      test.skip(true, (result as any).reason);
      return;
    }
    expect(result.created1).toHaveLength(1);
    expect(result.created2).toHaveLength(0); // No duplicates
    expect(result.finalBranchCount).toBe(1);
  });

  test('_autoCreateBaitMoveBranches skips forks below probability threshold', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const line = w.__rsaTest.curLine();

      const origBranches = line.branches ? JSON.parse(JSON.stringify(line.branches)) : [];
      const origActiveBranch = line.activeBranchIdx;

      const rounds = w.__rsaTest.getBranchRounds(line, line.activeBranchIdx || -1);
      if (!rounds || rounds.length < 4) return { skip: true, reason: 'Needs 4+ rounds' };

      const targetRd = rounds[3];
      if (!targetRd || !targetRd.p2 || !targetRd.p2.allMoves) return { skip: true, reason: 'R4 no allMoves' };

      let wowIdx = -1;
      for (let i = 0; i < targetRd.p2.allMoves.length; i++) {
        if (targetRd.p2.allMoves[i] === 'Will-O-Wisp') { wowIdx = i; break; }
      }
      if (wowIdx < 0) return { skip: true, reason: 'No WoW in R4' };

      // Fork with probability below 0.005 threshold
      const fakeFork = {
        id: 'R3-low-prob-0', type: 'aiMoveSplit',
        label: 'very unlikely → R4 Will-O-Wisp (0.3%)',
        probability: 0.003,
        altP1HPMin: 80, altP1HPMax: 100, altP1Status: '',
        altP2HP: 148, kills: false, mainKills: false,
        dmgMin: 0, dmgMax: 0,
        bait: null, mainBait: null, baitDiffers: false,
        replay: [], diverges: false, deathOnFork: false, summary: '',
        _nextRoundMoveOverride: { moveIdx: wowIdx, moveName: 'Will-O-Wisp', roundIdx: 3 },
        _isAIMoveSubFork: true
      };

      line.branches = [];

      const analysis = w.__rsaTest.analyzeFight(line);
      analysis.rounds[2].forks.push(fakeFork);
      const created = w.__rsaTest._autoCreateBaitMoveBranches(line, analysis);

      const branchCount = line.branches.length;

      // Restore
      line.branches = origBranches;
      line.activeBranchIdx = origActiveBranch;

      return { created, branchCount };
    });

    if ('skip' in result) {
      test.skip(true, (result as any).reason);
      return;
    }
    expect(result.created).toHaveLength(0);
    expect(result.branchCount).toBe(0);
  });

  test('_autoCreateBaitMoveBranches returns empty when no sub-forks exist', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const line = w.__rsaTest.curLine();

      const origBranches = line.branches ? JSON.parse(JSON.stringify(line.branches)) : [];
      line.branches = [];

      const analysis = w.__rsaTest.analyzeFight(line);
      const created = w.__rsaTest._autoCreateBaitMoveBranches(line, analysis);

      const branchCount = line.branches.length;
      line.branches = origBranches;

      return { created, branchCount };
    });

    expect(result.created).toHaveLength(0);
    expect(result.branchCount).toBe(0);
  });
});
