import { test, expect } from './fixtures';

test.describe('Berry Reminders', () => {

  test('_autoGenerateBerryReminders is exposed on __rsaTest', async ({ rsaPage }) => {
    const exists = await rsaPage.evaluate(() => typeof (window as any).__rsaTest._autoGenerateBerryReminders);
    expect(exists).toBe('function');
  });

  test('does nothing when line is null', async ({ rsaPage }) => {
    const threw = await rsaPage.evaluate(() => {
      try {
        (window as any).__rsaTest._autoGenerateBerryReminders(null);
        return false;
      } catch (e) { return true; }
    });
    expect(threw).toBe(false);
  });

  test('does nothing when line has no rounds', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const line = w.__rsaTest.curLine();
      // Temporarily clear rounds
      const origRounds = line.rounds ? line.rounds.slice() : [];
      const origBranches = line.branches ? JSON.parse(JSON.stringify(line.branches)) : [];
      line.rounds = [];
      line.branches = [];
      line.activeBranchIdx = -1;
      line.pdReminders = [];

      w.__rsaTest._autoGenerateBerryReminders(line);
      const result = line.pdReminders.slice();

      // Restore
      line.rounds = origRounds;
      line.branches = origBranches;
      return result;
    });
    expect(result).toEqual([]);
  });

  test('generates auto reminder when P1 berry is consumed', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const line = w.__rsaTest.curLine();
      if (!line || !line.teams || !line.teams.p1 || !line.teams.p1.roster.length) return null;

      const p1Name = line.teams.p1.roster[0].name;
      const fakeRound = {
        roundNum: 1,
        branchIdx: -1,
        p1: {
          name: p1Name,
          itemConsumed: 'Sitrus Berry',
          hpAfter: { current: 80, max: 100 },
          sprite: ''
        },
        p2: { name: 'Foe', hpAfter: { current: 60, max: 100 } }
      };

      const origRounds = line.rounds ? line.rounds.slice() : [];
      const origBranches = line.branches ? JSON.parse(JSON.stringify(line.branches)) : [];
      line.rounds = [fakeRound];
      line.branches = [];
      line.activeBranchIdx = -1;
      line.pdReminders = [];
      line._autoBerryDismissed = {};

      w.__rsaTest._autoGenerateBerryReminders(line);
      const reminders = (line.pdReminders || []).filter((r: any) => r.auto);

      // Restore
      line.rounds = origRounds;
      line.branches = origBranches;
      return reminders;
    });

    if (!result) return;
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].item).toBe('Sitrus Berry');
    expect(result[0].auto).toBe(true);
  });

  test('augments existing manual reminder with berry item', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const line = w.__rsaTest.curLine();
      if (!line || !line.teams || !line.teams.p1 || !line.teams.p1.roster.length) return null;

      const p1Name = line.teams.p1.roster[0].name;
      const fakeRound = {
        roundNum: 1,
        branchIdx: -1,
        p1: {
          name: p1Name,
          itemConsumed: 'Lum Berry',
          hpAfter: { current: 50, max: 100 },
          sprite: ''
        },
        p2: { name: 'Foe', hpAfter: { current: 60, max: 100 } }
      };

      const origRounds = line.rounds ? line.rounds.slice() : [];
      const origBranches = line.branches ? JSON.parse(JSON.stringify(line.branches)) : [];
      line.rounds = [fakeRound];
      line.branches = [];
      line.activeBranchIdx = -1;
      line._autoBerryDismissed = {};
      // Manual reminder without item
      line.pdReminders = [{ name: p1Name, sprite: '', targetHP: 100, maxHP: 100, predmg: 0 }];

      w.__rsaTest._autoGenerateBerryReminders(line);
      const manual = (line.pdReminders || []).find((r: any) => !r.auto && r.name === p1Name);

      // Restore
      line.rounds = origRounds;
      line.branches = origBranches;
      return manual ? manual.item : undefined;
    });

    if (result === null) return;
    expect(result).toBe('Lum Berry');
  });

  test('dismissed berries are not re-added', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const line = w.__rsaTest.curLine();
      if (!line || !line.teams || !line.teams.p1 || !line.teams.p1.roster.length) return null;

      const p1Name = line.teams.p1.roster[0].name;
      const fakeRound = {
        roundNum: 1,
        branchIdx: -1,
        p1: {
          name: p1Name,
          itemConsumed: 'Sitrus Berry',
          hpAfter: { current: 80, max: 100 },
          sprite: ''
        },
        p2: { name: 'Foe', hpAfter: { current: 60, max: 100 } }
      };

      const origRounds = line.rounds ? line.rounds.slice() : [];
      const origBranches = line.branches ? JSON.parse(JSON.stringify(line.branches)) : [];
      line.rounds = [fakeRound];
      line.branches = [];
      line.activeBranchIdx = -1;
      line.pdReminders = [];
      line._autoBerryDismissed = {};
      line._autoBerryDismissed[p1Name] = true;

      w.__rsaTest._autoGenerateBerryReminders(line);
      const autoReminders = (line.pdReminders || []).filter((r: any) => r.auto);

      // Restore
      line.rounds = origRounds;
      line.branches = origBranches;
      return autoReminders.length;
    });

    if (result === null) return;
    expect(result).toBe(0);
  });
});
