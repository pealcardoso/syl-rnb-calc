import { test as base, expect, Page, Browser } from '@playwright/test';

/**
 * Close the changelog modal that appears on page load and sometimes during rounds.
 */
async function closeChangelog(page: Page) {
  await page.evaluate(() => {
    const close = document.getElementById('changelog-close');
    if (close) (close as HTMLElement).click();
    const overlay = document.getElementById('changelog-overlay');
    if (overlay) overlay.style.display = 'none';
  });
  await page.waitForTimeout(200);
}

/**
 * Wait for the round sim app to be fully initialised.
 * Checks that key globals and DOM elements exist.
 */
async function waitForAppReady(page: Page) {
  await page.waitForFunction(() => {
    return typeof (window as any).calc !== 'undefined' &&
           typeof (window as any).BattleMovedex !== 'undefined' &&
           typeof (window as any).BattleAbilities !== 'undefined' &&
           typeof (window as any).selectTrainer === 'function';
  }, { timeout: 10000 });
}

/**
 * Expose internal IIFE functions onto window.__rsaTest for unit-style testing.
 * This injects a small script that patches the round sim IIFE by re-accessing
 * the functions through the module's closure. Since we can't reach into the
 * IIFE directly, we rely on functions that ARE accessible or test via the DOM.
 *
 * For truly internal functions (getTypeMultiplier, calcEntryHazardDamage, etc.),
 * we replicate their logic using the same data (calc.TYPE_CHART, BattleMovedex)
 * that the IIFE uses — this lets us verify the DATA is correct even if we can't
 * call the exact function.
 */
async function exposeTestHelpers(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    Object.assign(w.__rsaTest || (w.__rsaTest = {}), {
      /**
       * Replicate getTypeMultiplier using the same TYPE_CHART and ABILITY_IMMUNITIES
       * that the round sim uses.
       */
      getTypeMultiplier(atkType: string, defTypes: string[], abilityName?: string) {
        const gen = w.gen || 9;
        const chart = w.calc.TYPE_CHART[gen];
        if (!chart || !chart[atkType]) return 1;
        let mult = 1;
        for (const dt of defTypes) {
          const x = chart[atkType][dt];
          if (typeof x === 'number') mult *= x;
        }
        if (abilityName) {
          const key = abilityName.toLowerCase().replace(/[\s\-\']+/g, '');
          const ABILITY_IMMUNITIES: Record<string, string> = {
            levitate: 'Ground', flashfire: 'Fire',
            lightningrod: 'Electric', voltabsorb: 'Electric', motordrive: 'Electric',
            waterabsorb: 'Water', stormdrain: 'Water', dryskin: 'Water',
            sapsipper: 'Grass', eartheater: 'Ground', wellbakedbody: 'Fire'
          };
          if (ABILITY_IMMUNITIES[key] && ABILITY_IMMUNITIES[key] === atkType) mult = 0;
          if (key === 'dryskin' && atkType === 'Fire') mult *= 1.25;
          if (key === 'wonderguard' && mult <= 1) mult = 0;
        }
        return mult;
      },

      /**
       * Replicate calcEntryHazardDamage using the same SR_EFFECTIVENESS table.
       */
      calcEntryHazardDamage(entry: any, hazards: any) {
        if (!hazards) return { damage: 0, status: '' };
        const types = entry.types || [];
        const ability = entry.ability || '';
        const item = entry.item || '';
        const maxHP = entry.maxHP || 100;

        const hasMagicGuard = ability === 'Magic Guard';
        const isFlying = types.indexOf('Flying') !== -1;
        const hasLevitate = ability === 'Levitate';
        const hasAirBalloon = item === 'Air Balloon';
        const isGrounded = !isFlying && !hasLevitate && !hasAirBalloon;
        const absorbsTSpikes = types.indexOf('Poison') !== -1 || types.indexOf('Steel') !== -1;

        const SR_EFFECTIVENESS: Record<string, number> = {
          Normal:1,Fire:2,Water:0.5,Electric:1,Grass:1,Ice:2,
          Fighting:0.5,Poison:1,Ground:0.5,Flying:2,Psychic:1,
          Bug:2,Rock:1,Ghost:1,Dragon:1,Dark:1,Steel:0.5,Fairy:1
        };

        let totalDamage = 0;
        let status = '';

        if (hazards.sr && !hasMagicGuard) {
          let eff = 1;
          for (const t of types) eff *= (SR_EFFECTIVENESS[t] || 1);
          totalDamage += Math.max(1, Math.floor(maxHP * eff / 8));
        }

        if (hazards.spikes > 0 && isGrounded && !hasMagicGuard) {
          const spkDiv = [0, 8, 6, 4];
          totalDamage += Math.max(1, Math.floor(maxHP / spkDiv[Math.min(hazards.spikes, 3)]));
        }

        if (hazards.tspikes > 0 && isGrounded) {
          if (absorbsTSpikes) {
            // absorbed
          } else {
            const alreadyStatused = entry.status && entry.status !== '' && entry.status !== 'Healthy';
            if (!alreadyStatused) {
              status = hazards.tspikes >= 2 ? 'Badly Poisoned' : 'Poison';
            }
          }
        }

        return { damage: totalDamage, status };
      },

      /**
       * Replicate calcEffectiveSpeed.
       */
      calcEffectiveSpeed(entry: any, baseSpe: number, weather?: string, terrain?: string) {
        if (!baseSpe) return 0;
        let spd = baseSpe;
        const item = entry.item || '';
        const ability = entry.ability || '';
        const status = entry.status || '';
        const boost = (entry.boosts && entry.boosts.sp) || 0;
        const w = weather || 'None';
        const t = terrain || 'None';

        // Item mods
        const HALF_SPEED_ITEMS = ['Iron Ball','Macho Brace','Power Weight','Power Bracer',
          'Power Belt','Power Lens','Power Band','Power Anklet'];
        if (HALF_SPEED_ITEMS.includes(item)) spd = Math.floor(spd * 0.5);
        else if (item === 'Choice Scarf') spd = Math.floor(spd * 1.5);
        else if (item === 'Quick Powder' && (entry.name || '') === 'Ditto') spd = spd * 2;

        // Weather/terrain abilities
        if (ability === 'Swift Swim' && (w === 'Rain' || w === 'Heavy Rain')) spd *= 2;
        else if (ability === 'Chlorophyll' && (w === 'Sun' || w === 'Harsh Sunshine')) spd *= 2;
        else if (ability === 'Sand Rush' && w === 'Sand') spd *= 2;
        else if (ability === 'Slush Rush' && (w === 'Snow' || w === 'Hail')) spd *= 2;
        else if (ability === 'Surge Surfer' && t === 'Electric') spd *= 2;
        else if (ability === 'Quick Feet' && status) spd = Math.floor(spd * 1.5);
        else if (ability === 'Slow Start') spd = Math.floor(spd * 0.5);

        // Paralysis
        if (status === 'Paralysis' && ability !== 'Quick Feet') spd = Math.floor(spd * 0.5);

        // Boost stages
        if (boost > 0) spd = Math.floor(spd * (2 + boost) / 2);
        else if (boost < 0) spd = Math.floor(spd * 2 / (2 - boost));

        return spd;
      },

      /**
       * Replicate calcEndOfTurnDamage.
       */
      calcEndOfTurnDamage(entry: any, weather: string, terrain?: string) {
        const eot: any[] = [];
        const maxHP = entry.maxHP;
        const ability = entry.ability || '';
        const hasMagicGuard = ability === 'Magic Guard';
        const hasPoisonHeal = ability === 'Poison Heal';
        const WEATHER_IMMUNE_ABILITIES = [
          'Overcoat','Magic Guard','Sand Veil','Sand Rush','Sand Force',
          'Ice Body','Snow Cloak','Slush Rush'
        ];
        function isWeatherImmune(ab: string) { return WEATHER_IMMUNE_ABILITIES.includes(ab); }
        function _hasType(e: any, ts: string[]) {
          if (!e.types) return false;
          return ts.some((t: string) => e.types.includes(t));
        }

        // Status damage
        if (entry.status === 'Burn' && !hasMagicGuard) {
          eot.push({ source: 'Burn', damage: Math.max(1, Math.floor(maxHP / 16)) });
        }
        if (hasPoisonHeal && (entry.status === 'Poison' || entry.status === 'Badly Poisoned')) {
          eot.push({ source: 'Poison Heal', damage: -Math.max(1, Math.floor(maxHP / 8)) });
        } else {
          if (entry.status === 'Poison' && !hasMagicGuard) {
            eot.push({ source: 'Poison', damage: Math.max(1, Math.floor(maxHP / 8)) });
          }
          if (entry.status === 'Badly Poisoned' && !hasMagicGuard) {
            const toxN = Math.min(entry.toxicCounter || 1, 15);
            eot.push({ source: 'Toxic', damage: Math.max(1, Math.floor(maxHP * toxN / 16)) });
          }
        }

        // Weather
        if (weather === 'Sand') {
          const immune = _hasType(entry, ['Rock','Ground','Steel']) || isWeatherImmune(ability);
          if (!immune) eot.push({ source: 'Sandstorm', damage: Math.max(1, Math.floor(maxHP / 16)) });
        }
        if (weather === 'Hail') {
          const immune = _hasType(entry, ['Ice']) || isWeatherImmune(ability);
          if (!immune) eot.push({ source: 'Hail', damage: Math.max(1, Math.floor(maxHP / 16)) });
        }

        // Items
        if (entry.item === 'Leftovers') {
          eot.push({ source: 'Leftovers', damage: -Math.max(1, Math.floor(maxHP / 16)) });
        }
        if (entry.item === 'Black Sludge') {
          if (_hasType(entry, ['Poison'])) {
            eot.push({ source: 'Black Sludge', damage: -Math.max(1, Math.floor(maxHP / 16)) });
          } else if (!hasMagicGuard) {
            eot.push({ source: 'Black Sludge', damage: Math.max(1, Math.floor(maxHP / 8)) });
          }
        }

        // Grassy Terrain (BUG: doesn't check groundedness — mirrors the current source)
        if ((terrain || 'None') === 'Grassy') {
          eot.push({ source: 'Grassy Terrain', damage: -Math.max(1, Math.floor(maxHP / 16)) });
        }

        return eot;
      },

      /**
       * Replicate applySurvivalChecks.
       */
      applySurvivalChecks(defEntry: any, hpAfter: number, hpBefore: number, maxHP: number, atkAbility: string) {
        const result = { survived: false, sashed: false, sturdied: false };
        if (hpAfter > 0 || hpBefore <= 0) return result;
        const MOLD_BREAKER_ABILITIES = ['Mold Breaker','Turboblaze','Teravolt','Mycelium Might'];

        if (defEntry.item === 'Focus Sash' && hpBefore >= maxHP) {
          result.survived = true;
          result.sashed = true;
          return result;
        }
        if (defEntry.ability === 'Sturdy' && hpBefore >= maxHP) {
          if (!MOLD_BREAKER_ABILITIES.includes(atkAbility)) {
            result.survived = true;
            result.sturdied = true;
          }
        }
        return result;
      },
    });
  });
}

/** Extended test fixture with automatic page setup */
export const test = base.extend<{ rsaPage: Page }, { sharedPage: Page }>({
  sharedPage: [async ({ browser }, use) => {
    const page = await browser.newPage();
    await page.goto('/roundsim.html');
    await waitForAppReady(page);
    await closeChangelog(page);
    await exposeTestHelpers(page);
    await use(page);
    await page.close();
  }, { scope: 'worker' }],

  rsaPage: async ({ sharedPage }, use) => {
    await use(sharedPage);
  },
});

export { expect, closeChangelog };
