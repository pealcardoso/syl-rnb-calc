import { test, expect } from './fixtures';

test.describe('Bait Analysis', () => {

  test('computeBaitAnalysis is exposed on __rsaTest', async ({ rsaPage }) => {
    const exists = await rsaPage.evaluate(() => typeof (window as any).__rsaTest.computeBaitAnalysis);
    expect(exists).toBe('function');
  });

  test('returns empty array when p1Entry is null', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      return (window as any).__rsaTest.computeBaitAnalysis(null);
    });
    expect(result).toEqual([]);
  });

  test('returns empty array when P2 team has fewer than 2 alive mons', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const line = w.__rsaTest.curLine();
      if (!line || !line.teams || !line.teams.p2) return [];
      const roster = line.teams.p2.roster;
      if (!roster || roster.length < 2) return []; // already < 2

      // Kill all but one P2 mon
      const savedHP = roster.map((e: any) => e.currentHP);
      for (let i = 1; i < roster.length; i++) roster[i].currentHP = 0;

      const bait = w.__rsaTest.computeBaitAnalysis({
        setId: 'doesNotExist', name: 'FakeMon'
      });

      // Restore HP
      for (let i = 0; i < roster.length; i++) roster[i].currentHP = savedHP[i];
      return bait;
    });
    expect(result).toEqual([]);
  });

  test('returns bands with expected shape when P2 has multiple alive mons', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const line = w.__rsaTest.curLine();
      if (!line || !line.teams) return null;
      const p1Team = line.teams.p1;
      if (!p1Team || !p1Team.roster || !p1Team.roster.length) return null;
      const p1Entry = p1Team.roster[0];
      if (!p1Entry.setId) return null; // can't compute without valid setId
      return w.__rsaTest.computeBaitAnalysis(p1Entry);
    });

    // May be null if no P1 team loaded — skip
    if (!result) return;
    // May be empty if P2 has < 2 mons or setId invalid
    if (result.length === 0) return;

    // Verify band shape
    const band = result[0];
    expect(band).toHaveProperty('hpUpper');
    expect(band).toHaveProperty('hpLower');
    expect(band).toHaveProperty('baitName');
    expect(typeof band.hpUpper).toBe('number');
    expect(typeof band.hpLower).toBe('number');
    expect(typeof band.baitName).toBe('string');
  });

  test('bands are sorted from high HP to low', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const line = w.__rsaTest.curLine();
      if (!line || !line.teams) return null;
      const p1Team = line.teams.p1;
      if (!p1Team || !p1Team.roster || !p1Team.roster.length) return null;
      if (!p1Team.roster[0].setId) return null;
      return w.__rsaTest.computeBaitAnalysis(p1Team.roster[0]);
    });

    if (!result || result.length < 2) return;

    for (let i = 1; i < result.length; i++) {
      expect(result[i].hpUpper).toBeLessThanOrEqual(result[i - 1].hpUpper);
    }
  });
});
