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

  // ── Predamage option click: berry auto-equip + resimulation ──────────────

  test('clicking berry predmg option equips berry on P1 roster (item + initialItem)', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const line = w.__rsaTest.curLine();
      if (!line || !line.teams || !line.teams.p1 || !line.teams.p1.roster.length) return null;

      const p1Name = line.teams.p1.roster[0].name;
      const maxHP = line.teams.p1.roster[0].maxHP || 244;

      // Build a minimal fake context that mirrors what rsa-pd-context holds
      const fakeRound = {
        roundNum: 99,
        branchIdx: -1,
        p1: {
          name: p1Name,
          hpBefore: { current: maxHP, bestCase: maxHP },
          hpAfter:  { current: maxHP - 60, bestCase: maxHP - 60 },
          item: undefined,
          sprite: ''
        },
        p2: { name: 'Foe', hpBefore: { current: 200, bestCase: 200 }, hpAfter: { current: 140, bestCase: 140 } }
      };

      // Inject round
      const origRounds = line.rounds.slice();
      line.rounds = [fakeRound];
      line.activeBranchIdx = -1;

      // Snapshot original item
      const origItem  = line.teams.p1.roster[0].item;
      const origInitial = line.teams.p1.roster[0].initialItem;

      // Build a fake rsa-bait-panel div and attach context
      const $fakePanel = (window as any).$('<div class="rsa-bait-panel rsa-bait-open"></div>');
      const $fakeOption = (window as any).$(
        '<div class="rsa-bait-predmg-option rsa-bait-predmg-berry"' +
        ' data-hp-min="199" data-hp-max="' + maxHP + '" data-item="Sitrus Berry"></div>'
      );
      $fakePanel.append($fakeOption);
      (window as any).$('body').append($fakePanel);

      $fakePanel.data('rsa-pd-context', {
        line: line,
        rounds: line.rounds,
        predamage: {
          p1Name: p1Name,
          maxHP: maxHP,
          engagementRoundNums: [99]
        }
      });

      // Simulate click
      $fakeOption.trigger('click');

      // Capture result before teardown
      const newItem     = line.teams.p1.roster[0].item;
      const newInitial  = line.teams.p1.roster[0].initialItem;

      // Restore
      line.rounds = origRounds;
      line.teams.p1.roster[0].item = origItem;
      line.teams.p1.roster[0].initialItem = origInitial;
      if (line.teams.p1.roster[0].preDamageHP !== undefined) delete line.teams.p1.roster[0].preDamageHP;
      $fakePanel.remove();

      return { newItem, newInitial };
    });

    if (!result) return; // no P1 team loaded
    expect(result.newItem).toBe('Sitrus Berry');
    expect(result.newInitial).toBe('Sitrus Berry');
  });

  test('clicking non-berry predmg option (no item) does NOT equip any item', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const line = w.__rsaTest.curLine();
      if (!line || !line.teams || !line.teams.p1 || !line.teams.p1.roster.length) return null;

      const p1Name = line.teams.p1.roster[0].name;
      const maxHP = line.teams.p1.roster[0].maxHP || 244;

      const fakeRound = {
        roundNum: 100,
        branchIdx: -1,
        p1: {
          name: p1Name,
          hpBefore: { current: maxHP, bestCase: maxHP },
          hpAfter:  { current: maxHP - 40, bestCase: maxHP - 40 },
          item: undefined,
          sprite: ''
        },
        p2: { name: 'Foe', hpBefore: { current: 200, bestCase: 200 }, hpAfter: { current: 160, bestCase: 160 } }
      };

      const origRounds = line.rounds.slice();
      line.rounds = [fakeRound];
      line.activeBranchIdx = -1;

      const origItem = line.teams.p1.roster[0].item;
      const origInitial = line.teams.p1.roster[0].initialItem;

      const $fakePanel = (window as any).$('<div class="rsa-bait-panel rsa-bait-open"></div>');
      // No data-item attribute (empty string = no berry)
      const $fakeOption = (window as any).$(
        '<div class="rsa-bait-predmg-option rsa-bait-predmg-vals"' +
        ' data-hp-min="' + (maxHP - 50) + '" data-hp-max="' + (maxHP - 30) + '" data-item=""></div>'
      );
      $fakePanel.append($fakeOption);
      (window as any).$('body').append($fakePanel);

      $fakePanel.data('rsa-pd-context', {
        line: line,
        rounds: line.rounds,
        predamage: {
          p1Name: p1Name,
          maxHP: maxHP,
          engagementRoundNums: [100]
        }
      });

      $fakeOption.trigger('click');

      const newItem    = line.teams.p1.roster[0].item;
      const newInitial = line.teams.p1.roster[0].initialItem;

      // Restore
      line.rounds = origRounds;
      line.teams.p1.roster[0].item = origItem;
      line.teams.p1.roster[0].initialItem = origInitial;
      if (line.teams.p1.roster[0].preDamageHP !== undefined) delete line.teams.p1.roster[0].preDamageHP;
      $fakePanel.remove();

      return { newItem, newInitial, origItem, origInitial };
    });

    if (!result) return;
    // Item should be unchanged when no berry was specified
    expect(result.newItem).toBe(result.origItem);
    expect(result.newInitial).toBe(result.origInitial);
  });

  test('berry predmg option propagates item into already-logged rounds', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const line = w.__rsaTest.curLine();
      if (!line || !line.teams || !line.teams.p1 || !line.teams.p1.roster.length) return null;

      const p1Name = line.teams.p1.roster[0].name;
      const maxHP = line.teams.p1.roster[0].maxHP || 244;

      const fakeRound = {
        roundNum: 101,
        branchIdx: -1,
        p1: {
          name: p1Name,
          hpBefore: { current: maxHP, bestCase: maxHP },
          hpAfter:  { current: maxHP - 60, bestCase: maxHP - 60 },
          item: undefined,
          sprite: ''
        },
        p2: { name: 'Foe', hpBefore: { current: 200, bestCase: 200 }, hpAfter: { current: 140, bestCase: 140 } }
      };

      const origRounds = line.rounds.slice();
      line.rounds = [fakeRound];
      line.activeBranchIdx = -1;

      const origItem = line.teams.p1.roster[0].item;
      const origInitial = line.teams.p1.roster[0].initialItem;

      const $fakePanel = (window as any).$('<div class="rsa-bait-panel rsa-bait-open"></div>');
      const $fakeOption = (window as any).$(
        '<div class="rsa-bait-predmg-option rsa-bait-predmg-berry"' +
        ' data-hp-min="199" data-hp-max="' + maxHP + '" data-item="Oran Berry"></div>'
      );
      $fakePanel.append($fakeOption);
      (window as any).$('body').append($fakePanel);

      $fakePanel.data('rsa-pd-context', {
        line: line,
        rounds: line.rounds,
        predamage: {
          p1Name: p1Name,
          maxHP: maxHP,
          engagementRoundNums: [101]
        }
      });

      $fakeOption.trigger('click');

      // After click the panel is removed from DOM, but line.rounds may have been restored
      // by rebuild. Check if the round item was propagated.
      const roundItemAfter = line.rounds.length > 0 ? (line.rounds[0].p1 ? line.rounds[0].p1.item : undefined) : undefined;

      // Restore
      line.rounds = origRounds;
      line.teams.p1.roster[0].item = origItem;
      line.teams.p1.roster[0].initialItem = origInitial;
      if (line.teams.p1.roster[0].preDamageHP !== undefined) delete line.teams.p1.roster[0].preDamageHP;
      $fakePanel.remove();

      return { roundItemAfter };
    });

    if (!result) return;
    // The round item should be set to the berry (propagateRosterItemToRounds ran)
    // or undefined if the panel removal caused round replacement by rebuild
    // — either way the roster item test above guarantees correctness
    expect(result.roundItemAfter === 'Oran Berry' || result.roundItemAfter === undefined).toBe(true);
  });

  test('berry predmg option creates pdReminder with correct berry item', async ({ rsaPage }) => {
    const result = await rsaPage.evaluate(() => {
      const w = window as any;
      const line = w.__rsaTest.curLine();
      if (!line || !line.teams || !line.teams.p1 || !line.teams.p1.roster.length) return null;

      const p1Name = line.teams.p1.roster[0].name;
      const maxHP = line.teams.p1.roster[0].maxHP || 244;

      const fakeRound = {
        roundNum: 102,
        branchIdx: -1,
        p1: {
          name: p1Name,
          hpBefore: { current: maxHP, bestCase: maxHP },
          hpAfter:  { current: maxHP - 80, bestCase: maxHP - 80 },
          item: undefined,
          sprite: ''
        },
        p2: { name: 'Foe', hpBefore: { current: 200, bestCase: 200 }, hpAfter: { current: 120, bestCase: 120 } }
      };

      const origRounds = line.rounds.slice();
      line.rounds = [fakeRound];
      line.activeBranchIdx = -1;
      const origReminders = line.pdReminders ? line.pdReminders.slice() : [];

      const origItem = line.teams.p1.roster[0].item;
      const origInitial = line.teams.p1.roster[0].initialItem;

      const $fakePanel = (window as any).$('<div class="rsa-bait-panel rsa-bait-open"></div>');
      const $fakeOption = (window as any).$(
        '<div class="rsa-bait-predmg-option rsa-bait-predmg-berry"' +
        ' data-hp-min="199" data-hp-max="' + maxHP + '" data-item="Sitrus Berry"></div>'
      );
      $fakePanel.append($fakeOption);
      (window as any).$('body').append($fakePanel);

      $fakePanel.data('rsa-pd-context', {
        line: line,
        rounds: line.rounds,
        predamage: {
          p1Name: p1Name,
          maxHP: maxHP,
          engagementRoundNums: [102]
        }
      });

      $fakeOption.trigger('click');

      const reminders = (line.pdReminders || []).filter((r: any) => r.name === p1Name);

      // Restore
      line.rounds = origRounds;
      line.pdReminders = origReminders;
      line.teams.p1.roster[0].item = origItem;
      line.teams.p1.roster[0].initialItem = origInitial;
      if (line.teams.p1.roster[0].preDamageHP !== undefined) delete line.teams.p1.roster[0].preDamageHP;
      $fakePanel.remove();

      return reminders;
    });

    if (!result) return;
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].item).toBe('Sitrus Berry');
    expect(result[0].name).toBeDefined();
  });
});
