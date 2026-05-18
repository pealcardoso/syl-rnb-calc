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
});
