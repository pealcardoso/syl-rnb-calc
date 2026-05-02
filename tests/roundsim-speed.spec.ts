import { test, expect } from './fixtures';

test.describe('Speed Calculation', () => {

  // ── Item modifiers ────────────────────────────────────────────
  const ITEM_CASES = [
    { item: 'Choice Scarf', baseSpe: 100, expected: 150, label: 'Choice Scarf ×1.5' },
    { item: 'Iron Ball', baseSpe: 200, expected: 100, label: 'Iron Ball ×0.5' },
    { item: 'Macho Brace', baseSpe: 200, expected: 100, label: 'Macho Brace ×0.5' },
    { item: 'Power Weight', baseSpe: 100, expected: 50, label: 'Power Weight ×0.5' },
    { item: 'Power Bracer', baseSpe: 100, expected: 50, label: 'Power Bracer ×0.5' },
    { item: 'Power Belt', baseSpe: 100, expected: 50, label: 'Power Belt ×0.5' },
    { item: 'Power Lens', baseSpe: 100, expected: 50, label: 'Power Lens ×0.5' },
    { item: 'Power Band', baseSpe: 100, expected: 50, label: 'Power Band ×0.5' },
    { item: 'Power Anklet', baseSpe: 100, expected: 50, label: 'Power Anklet ×0.5' },
    { item: 'Leftovers', baseSpe: 100, expected: 100, label: 'Leftovers — no speed change' },
  ];

  for (const tc of ITEM_CASES) {
    test(`item: ${tc.label}`, async ({ rsaPage }) => {
      const spd = await rsaPage.evaluate(
        ([item, baseSpe]) => (window as any).__rsaTest.calcEffectiveSpeed(
          { item, ability: '', status: '', boosts: {} }, baseSpe
        ),
        [tc.item, tc.baseSpe]
      );
      expect(spd).toBe(tc.expected);
    });
  }

  // ── Quick Powder (Ditto only) ─────────────────────────────────
  test('Quick Powder doubles speed on Ditto', async ({ rsaPage }) => {
    const spd = await rsaPage.evaluate(
      () => (window as any).__rsaTest.calcEffectiveSpeed(
        { name: 'Ditto', item: 'Quick Powder', ability: '', status: '', boosts: {} }, 100
      ),
    );
    expect(spd).toBe(200);
  });

  test('Quick Powder has no effect on non-Ditto', async ({ rsaPage }) => {
    const spd = await rsaPage.evaluate(
      () => (window as any).__rsaTest.calcEffectiveSpeed(
        { name: 'Pikachu', item: 'Quick Powder', ability: '', status: '', boosts: {} }, 100
      ),
    );
    expect(spd).toBe(100);
  });

  // ── Weather ability doublers ──────────────────────────────────
  const WEATHER_CASES = [
    { ability: 'Swift Swim', weather: 'Rain', expected: 200, label: 'Swift Swim in Rain' },
    { ability: 'Swift Swim', weather: 'Heavy Rain', expected: 200, label: 'Swift Swim in Heavy Rain' },
    { ability: 'Swift Swim', weather: 'Sun', expected: 100, label: 'Swift Swim in Sun — no effect' },
    { ability: 'Chlorophyll', weather: 'Sun', expected: 200, label: 'Chlorophyll in Sun' },
    { ability: 'Chlorophyll', weather: 'Harsh Sunshine', expected: 200, label: 'Chlorophyll in Harsh Sunshine' },
    { ability: 'Chlorophyll', weather: 'Rain', expected: 100, label: 'Chlorophyll in Rain — no effect' },
    { ability: 'Sand Rush', weather: 'Sand', expected: 200, label: 'Sand Rush in Sand' },
    { ability: 'Sand Rush', weather: 'Rain', expected: 100, label: 'Sand Rush in Rain — no effect' },
    { ability: 'Slush Rush', weather: 'Snow', expected: 200, label: 'Slush Rush in Snow' },
    { ability: 'Slush Rush', weather: 'Hail', expected: 200, label: 'Slush Rush in Hail' },
    { ability: 'Slush Rush', weather: 'Sand', expected: 100, label: 'Slush Rush in Sand — no effect' },
  ];

  for (const tc of WEATHER_CASES) {
    test(`weather: ${tc.label}`, async ({ rsaPage }) => {
      const spd = await rsaPage.evaluate(
        ([ability, weather]) => (window as any).__rsaTest.calcEffectiveSpeed(
          { item: '', ability, status: '', boosts: {} }, 100, weather
        ),
        [tc.ability, tc.weather]
      );
      expect(spd).toBe(tc.expected);
    });
  }

  // ── Surge Surfer (terrain, not weather) ───────────────────────
  test('Surge Surfer doubles speed in Electric Terrain', async ({ rsaPage }) => {
    const spd = await rsaPage.evaluate(
      () => (window as any).__rsaTest.calcEffectiveSpeed(
        { item: '', ability: 'Surge Surfer', status: '', boosts: {} }, 100, 'None', 'Electric'
      ),
    );
    expect(spd).toBe(200);
  });

  test('Surge Surfer no effect without Electric Terrain', async ({ rsaPage }) => {
    const spd = await rsaPage.evaluate(
      () => (window as any).__rsaTest.calcEffectiveSpeed(
        { item: '', ability: 'Surge Surfer', status: '', boosts: {} }, 100, 'None', 'Grassy'
      ),
    );
    expect(spd).toBe(100);
  });

  // ── Paralysis ─────────────────────────────────────────────────
  test('Paralysis halves speed', async ({ rsaPage }) => {
    const spd = await rsaPage.evaluate(
      () => (window as any).__rsaTest.calcEffectiveSpeed(
        { item: '', ability: '', status: 'Paralysis', boosts: {} }, 100
      ),
    );
    expect(spd).toBe(50);
  });

  // ── Quick Feet ────────────────────────────────────────────────
  test('Quick Feet gives ×1.5 when statused', async ({ rsaPage }) => {
    const spd = await rsaPage.evaluate(
      () => (window as any).__rsaTest.calcEffectiveSpeed(
        { item: '', ability: 'Quick Feet', status: 'Paralysis', boosts: {} }, 100
      ),
    );
    expect(spd).toBe(150); // Quick Feet ×1.5, paralysis penalty is bypassed
  });

  test('Quick Feet no effect when healthy', async ({ rsaPage }) => {
    const spd = await rsaPage.evaluate(
      () => (window as any).__rsaTest.calcEffectiveSpeed(
        { item: '', ability: 'Quick Feet', status: '', boosts: {} }, 100
      ),
    );
    expect(spd).toBe(100);
  });

  // ── Slow Start ────────────────────────────────────────────────
  test('Slow Start halves speed', async ({ rsaPage }) => {
    const spd = await rsaPage.evaluate(
      () => (window as any).__rsaTest.calcEffectiveSpeed(
        { item: '', ability: 'Slow Start', status: '', boosts: {} }, 100
      ),
    );
    expect(spd).toBe(50);
  });

  // ── Boost stages ──────────────────────────────────────────────
  const BOOST_CASES = [
    { boost: 1, baseSpe: 100, expected: Math.floor(100 * 3 / 2), label: '+1 Spe' },
    { boost: 2, baseSpe: 100, expected: Math.floor(100 * 4 / 2), label: '+2 Spe' },
    { boost: 3, baseSpe: 100, expected: Math.floor(100 * 5 / 2), label: '+3 Spe' },
    { boost: 6, baseSpe: 100, expected: Math.floor(100 * 8 / 2), label: '+6 Spe' },
    { boost: -1, baseSpe: 100, expected: Math.floor(100 * 2 / 3), label: '-1 Spe' },
    { boost: -2, baseSpe: 100, expected: Math.floor(100 * 2 / 4), label: '-2 Spe' },
    { boost: -6, baseSpe: 100, expected: Math.floor(100 * 2 / 8), label: '-6 Spe' },
  ];

  for (const tc of BOOST_CASES) {
    test(`boost: ${tc.label}`, async ({ rsaPage }) => {
      const spd = await rsaPage.evaluate(
        ([boost, baseSpe]) => (window as any).__rsaTest.calcEffectiveSpeed(
          { item: '', ability: '', status: '', boosts: { sp: boost } }, baseSpe
        ),
        [tc.boost, tc.baseSpe]
      );
      expect(spd).toBe(tc.expected);
    });
  }

  // ── Combined modifiers ────────────────────────────────────────
  test('Choice Scarf + Swift Swim in Rain', async ({ rsaPage }) => {
    const spd = await rsaPage.evaluate(
      () => (window as any).__rsaTest.calcEffectiveSpeed(
        { item: 'Choice Scarf', ability: 'Swift Swim', status: '', boosts: {} }, 100, 'Rain'
      ),
    );
    // Choice Scarf: floor(100 * 1.5) = 150, then Swift Swim with Rain would NOT stack
    // because the code uses else-if for weather abilities after item check
    // Actually Choice Scarf applies first (150), then Swift Swim is in a separate else-if chain
    // Let's verify: item check → 150, then weather ability check → *2 = 300?
    // No — looking at the code: item is applied first (150), THEN weather ability doubles (150*2=300)
    // Wait — the code does else-if for abilities, but item and ability are separate blocks
    expect(spd).toBe(300); // 100 * 1.5 (scarf) * 2 (swift swim)
  });

  test('Paralysis + Choice Scarf', async ({ rsaPage }) => {
    const spd = await rsaPage.evaluate(
      () => (window as any).__rsaTest.calcEffectiveSpeed(
        { item: 'Choice Scarf', ability: '', status: 'Paralysis', boosts: {} }, 100
      ),
    );
    // Scarf: floor(100 * 1.5) = 150, Paralysis: floor(150 * 0.5) = 75
    expect(spd).toBe(75);
  });

  test('Iron Ball + Paralysis (double debuff)', async ({ rsaPage }) => {
    const spd = await rsaPage.evaluate(
      () => (window as any).__rsaTest.calcEffectiveSpeed(
        { item: 'Iron Ball', ability: '', status: 'Paralysis', boosts: {} }, 100
      ),
    );
    // Iron Ball: floor(100 * 0.5) = 50, Paralysis: floor(50 * 0.5) = 25
    expect(spd).toBe(25);
  });

  test('+2 boost with Choice Scarf', async ({ rsaPage }) => {
    const spd = await rsaPage.evaluate(
      () => (window as any).__rsaTest.calcEffectiveSpeed(
        { item: 'Choice Scarf', ability: '', status: '', boosts: { sp: 2 } }, 100
      ),
    );
    // Scarf: floor(100 * 1.5) = 150, +2 boost: floor(150 * 4/2) = 300
    expect(spd).toBe(300);
  });
});
