---
name: roundsim-playwright
description: "Use when: testing the Round Simulator web app with Playwright, simulating battles, logging rounds, verifying bug fixes, or navigating the round sim UI. Covers DOM selectors, JS API, drag-drop, trainer selection, move logging, and battle-end detection."
argument-hint: "What to test (e.g. 'test battle-ended panel', 'confirm immunity to secondary effect')"
---

# Round Simulator — Playwright Testing Expert

## Context

- **App URL**: `http://localhost:8080/roundsim.html`
- **Server**: Python HTTP server serving `dist/` on port 8080
  - Start: `python -m http.server 8080` from `c:\Users\pealcardoso\Documents\round_simulator\dist\`
- **Source file**: `src/js/roundsim_app.js` (~6900 lines, jQuery-based)
- **Build command** (EXACT — no variations): `& "C:\Users\pealcardoso\nodejs\node-v22.14.0-win-x64\node.exe" "c:\Users\pealcardoso\Documents\round_simulator\build" view`
  - Copies `src/js/*`, `src/css/*`, and rebuilds HTML files into `dist/` — required after any source edit
- **Git branch**: `dev/round-simulator`

---

## Critical: Do This First Every Session

```javascript
// Close the changelog modal — opens on page load AND unpredictably during rounds
await page.evaluate(() => {
    const close = document.getElementById('changelog-close');
    if (close) close.click();
    const overlay = document.getElementById('changelog-overlay');
    if (overlay) overlay.style.display = 'none';
});
await page.waitForTimeout(200);
```

**Close the changelog after every `Log Round` action.** If it is open, subsequent interactions will not register.

---

## DOM Selector Map

### Team Panels
| Element | Selector |
|---|---|
| P1 team panel | `.rsa-team-panel-p1` |
| P2 team panel | `.rsa-team-panel-p2` |
| P1 drop zone (drag target) | `.rsa-team-drop` |
| P2 pokemon slots (clickable to set active) | `.rsa-team-slot-p2` |
| P2 slot by index | `document.querySelectorAll('.rsa-team-slot-p2')[n]` |

### Trainer Selection
| Element | Selector / API |
|---|---|
| Trainer search input | `#rsa-trainer-search` — type to filter, autocomplete dropdown appears |
| Trainer suggestion dropdown | `#rsa-trainer-suggestions` — click `.rsa-trainer-sugg-item` to select |
| Previous trainer button | `#rsa-prev-trainer` |
| Next trainer button | `#rsa-next-trainer` |
| Reset trainer button | `#rsa-reset-trainer` |
| JS direct select | `selectTrainer(index)` — bypasses UI, preferred in automated tests |

### Log Round Controls (main panel — before any rounds logged)
| Element | Selector |
|---|---|
| Log Round button | `#rsa-log-round` |
| P1 move radio labels | `label.btn` — find by `.textContent.includes('MoveName')` |
| P1 move radio input | `document.getElementById(label.getAttribute('for'))` |

### Inline Controls (inside round cards — after round 1)
| Element | Selector |
|---|---|
| Inline controls container | `.rsa-inline-controls` |
| Inline Log Round button | `.rsa-inline-log` |
| P1 move select | `.rsa-inline-p1-move` — set `.value = '0'` for first move |
| P2 move select | `.rsa-inline-p2-move` |
| P2 send select (on KO) | `.rsa-inline-p2-send` |
| Confirm next P2 button | find `button` inside `.rsa-inline-controls` where `.textContent.includes('Confirm')` |
| P2 Crit checkbox | `.rsa-inline-p2-crit` |
| P1 Effect checkbox | `.rsa-inline-p1-eff` |
| P2 Effect checkbox | `.rsa-inline-p2-eff` |

### Inline State Detection (read `.rsa-inline-controls.className`)
| Class present | Meaning |
|---|---|
| `rsa-inline-p2ko` | A P2 pokemon just fainted — confirm next before logging |
| `rsa-inline-battle-ended` | All P2 fainted — battle over |
| (neither) | Normal Next Round state |

### Other
| Element | Selector / ID |
|---|---|
| Import textarea | `#rsa-import-text` |
| Import Go button | `#rsa-import-go` |
| Round count display | `#rsa-round-count` |
| All round cards | `.rsa-round-card` |

---

## Global JS Functions (call via `page.evaluate`)

```javascript
selectTrainer(index);          // Set P2 trainer by numeric index
lookupSet(setId);              // Look up a set object by its ID string
getMonTypeInfo(name, setId);   // Get { types: [...] } for a pokemon
calcMaxHP(name, set);          // Calculate max HP from a set object
```

---

## Game Mechanics Reference

### Status Conditions
| Status | Effect |
|---|---|
| **Burn** | Deals 1/8 max HP per turn. Halves **physical Attack** only — has NO effect on special moves |
| **Paralysis** | 25% chance to be fully paralyzed each turn. Halves Speed |
| **Poison** | Deals 1/8 max HP per turn |
| **Bad Poison (Toxic)** | Increasing damage each turn (1/16, 2/16, 3/16...) |
| **Sleep** | Cannot move. Lasts 1-3 turns |
| **Freeze** | Cannot move. 20% chance to thaw each turn |
| **Confusion** | 33% chance to hit itself (50 BP typeless physical) |

> Burn only halves Attack (physical). A pokemon using Special moves is completely unaffected damage-output-wise. If observed damage drops significantly on a special attacker after a burn, check type matchup and the opponent's SpDef — they are the actual cause.

### Type Effectiveness
Multipliers stack across dual types (e.g. Electric vs Water/Flying = 1x * 2x = 2x).

| Multiplier | Result |
|---|---|
| 0x | Immune — move has no effect, including secondary effects |
| 0.5x | Not very effective |
| 1x | Neutral |
| 2x | Super effective |
| 4x | Doubly super effective |

Immunity (0x) means secondary effects of the move also do not apply — e.g. paralysis from Thunder on a Ground-type is completely nullified.

### Key Items
| Item | Effect |
|---|---|
| **Custap Berry** | When HP drops to 25% or below, the holder moves first in the next priority bracket — guaranteed, always activates (not probabilistic) |
| **Sitrus Berry** | Restores 25% of max HP when below 50% HP |
| **Sharp Beak** | Boosts Flying-type moves by 20% |
| **Light Ball** | Doubles Pikachu's Attack and Special Attack |
| **Liechi Berry** | Raises Attack by 1 stage when HP drops to 25% or below |

### Key Abilities
| Ability | Effect |
|---|---|
| **Sturdy** | Survives any OHKO from full HP with exactly 1 HP remaining — does not protect on subsequent hits |
| **Lightning Rod** | Redirects all Electric-type moves to this pokemon; raises SpAtk by 1 stage |
| **Flame Body** | 30% chance to burn the attacker on contact |
| **Static** | 30% chance to paralyze the attacker on contact |
| **Swift Swim** | Doubles Speed in Rain |
| **Hustle** | Attack x1.5, but physical move accuracy reduced to 80% |

### Hazards
| Hazard | Effect per switch-in |
|---|---|
| Stealth Rock | Rock-type damage — 3.125% to 50% depending on type matchup vs Rock |
| Spikes (1 layer) | 1/8 max HP |
| Spikes (2 layers) | 1/6 max HP |
| Spikes (3 layers) | 1/4 max HP |
| Toxic Spikes (1) | Poison |
| Toxic Spikes (2) | Bad Poison |

---

## Recipes

### Import a Pokemon from PS paste

```javascript
const ps = `Zapdos\nAbility: Static\nEVs: 252 SpA / 4 SpD / 252 Spe\nTimid Nature\n- Thunderbolt\n- Heat Wave\n- Roost\n- Tailwind`;
await page.evaluate((ps) => {
    document.getElementById('rsa-import-text').value = ps;
    document.getElementById('rsa-import-text').dispatchEvent(new Event('input'));
}, ps);
await page.waitForTimeout(200);
await page.evaluate(() => document.getElementById('rsa-import-go').click());
await page.waitForTimeout(500);
```

### Set P2 Trainer by Name (via search UI)

```javascript
await page.evaluate((name) => {
    const input = document.getElementById('rsa-trainer-search');
    input.value = name;
    input.dispatchEvent(new Event('input'));
}, 'Bird Keeper Hugh');
await page.waitForTimeout(300);
await page.evaluate(() => document.querySelector('.rsa-trainer-sugg-item')?.click());
await page.waitForTimeout(600);
```

### Set P2 Trainer by Index (direct JS — fastest for tests)

```javascript
await page.evaluate((idx) => selectTrainer(idx), 671);
await page.waitForTimeout(500);
```

### Add Pokemon from Box to P1 Team (drag-drop simulation)

```javascript
const slot = await page.evaluate(() => {
    const s = document.querySelector('.rsa-box-slot[draggable="true"]');
    return s ? { side: s.dataset.side, setId: s.dataset.setId, name: s.dataset.name } : null;
});
await page.evaluate((slot) => {
    const payload = JSON.stringify({ side: slot.side, setId: slot.setId, name: slot.name });
    const dt = new DataTransfer();
    dt.setData('text/plain', payload);
    $(document.querySelector('.rsa-team-drop')).trigger($.Event('drop', {
        originalEvent: { dataTransfer: dt },
        preventDefault: () => {}
    }));
}, slot);
await page.waitForTimeout(400);
```

### Select P2 Active Pokemon

```javascript
await page.evaluate((idx) => {
    document.querySelectorAll('.rsa-team-slot-p2')[idx]?.click();
}, 0);
await page.waitForTimeout(300);
```

### Select P1 Move (main panel)

```javascript
await page.evaluate((moveName) => {
    const label = [...document.querySelectorAll('label.btn')]
        .find(l => l.textContent.includes(moveName));
    if (label) {
        document.getElementById(label.getAttribute('for'))?.click();
        label.click();
    }
}, 'Thunderbolt');
await page.waitForTimeout(200);
```

### Log a Round (main panel — first round only)

```javascript
await page.evaluate(() => document.getElementById('rsa-log-round').click());
await page.waitForTimeout(500);
// Always close changelog after
```

### Log a Round (inline — round 2+)

```javascript
await page.evaluate((idx) => {
    const sel = document.querySelector('.rsa-inline-p1-move');
    if (sel) { sel.value = String(idx); sel.dispatchEvent(new Event('change')); }
}, 0);
await page.waitForTimeout(100);
await page.evaluate(() => document.querySelector('.rsa-inline-log')?.click());
await page.waitForTimeout(400);
// Always close changelog after
```

### Confirm Next P2 After KO

```javascript
await page.evaluate((name) => {
    const sel = document.querySelector('.rsa-inline-p2-send');
    if (sel && name) {
        const opt = [...sel.options].find(o => o.text.includes(name));
        if (opt) sel.value = opt.value;
    }
}, null); // pass null to accept AI recommendation
await page.evaluate(() => {
    [...document.querySelectorAll('.rsa-inline-controls button')]
        .find(b => b.textContent.includes('Confirm'))?.click();
});
await page.waitForTimeout(300);
```

### Full Battle Loop (KO all P2)

```javascript
const closeChangelog = async () => {
    await page.evaluate(() => {
        document.getElementById('changelog-close')?.click();
        const overlay = document.getElementById('changelog-overlay');
        if (overlay) overlay.style.display = 'none';
    });
    await page.waitForTimeout(100);
};

for (let round = 1; round <= 30; round++) {
    await closeChangelog();
    const inline = await page.evaluate(() => {
        const el = document.querySelector('.rsa-inline-controls');
        return el ? { cls: el.className, text: el.textContent.substring(0, 300) } : null;
    });
    if (!inline) break;
    if (inline.cls.includes('rsa-inline-battle-ended')) {
        console.log('BATTLE ENDED:', inline.text); break;
    }
    if (inline.cls.includes('rsa-inline-p2ko')) {
        await page.evaluate(() => {
            [...document.querySelectorAll('.rsa-inline-controls button')]
                .find(b => b.textContent.includes('Confirm'))?.click();
        });
        await page.waitForTimeout(300);
        continue;
    }
    await page.evaluate(() => {
        const sel = document.querySelector('.rsa-inline-p1-move');
        if (sel) { sel.value = '0'; sel.dispatchEvent(new Event('change')); }
        document.querySelector('.rsa-inline-log')?.click();
    });
    await page.waitForTimeout(400);
}
```

---

## Test Setup Template

```javascript
async (page) => {
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(1000);
    await page.evaluate(() => document.getElementById('changelog-close')?.click());
    await page.waitForTimeout(200);

    // Import P1 pokemon
    const ps = `Zapdos\nAbility: Static\nEVs: 252 SpA / 4 SpD / 252 Spe\nTimid Nature\n- Thunderbolt\n- Heat Wave\n- Roost\n- Tailwind`;
    await page.evaluate((ps) => {
        document.getElementById('rsa-import-text').value = ps;
        document.getElementById('rsa-import-text').dispatchEvent(new Event('input'));
    }, ps);
    await page.evaluate(() => document.getElementById('rsa-import-go').click());
    await page.waitForTimeout(500);

    // Set trainer (replace 671 with desired index)
    await page.evaluate((idx) => selectTrainer(idx), 671);
    await page.waitForTimeout(500);

    // Add P1 to team
    const slot = await page.evaluate(() => {
        const s = document.querySelector('.rsa-box-slot[draggable="true"]');
        return s ? { side: s.dataset.side, setId: s.dataset.setId, name: s.dataset.name } : null;
    });
    await page.evaluate((slot) => {
        const payload = JSON.stringify(slot);
        const dt = new DataTransfer();
        dt.setData('text/plain', payload);
        $(document.querySelector('.rsa-team-drop')).trigger($.Event('drop', {
            originalEvent: { dataTransfer: dt },
            preventDefault: () => {}
        }));
    }, slot);
    await page.waitForTimeout(400);

    // Select first P2
    await page.evaluate(() => document.querySelectorAll('.rsa-team-slot-p2')[0]?.click());
    await page.waitForTimeout(300);
}
```

---

## Known Gotchas

### Sturdy
Survives any OHKO from full HP at exactly 1 HP — even 300%+ damage. Always budget a second round. Does not protect on subsequent hits.

### Custap Berry
Activates deterministically (100% guaranteed, not probabilistic) when HP drops to 25% or below. Grants moving first within its priority bracket.

### Burn does NOT reduce special damage
Burn halves physical Attack only. If a special attacker's damage output drops mid-battle, check type effectiveness and opponent SpDef — those are the actual causes.

### Lightning Rod
Redirects all Electric moves to this pokemon. If an Electric-immune pokemon (e.g. Ground-type) is on P2, Electric moves aimed at another P2 member may still be absorbed, but deal 0 damage.

### Inline controls only appear after round 1
Before any rounds: only `#rsa-log-round` works. The `.rsa-inline-log` pattern only exists inside round cards.

### Screenshots come out blank
`window.scrollTo(0, scrollHeight)` overshoots into blank space below content. Use `element.scrollIntoView()` instead.

### `selectTrainer()` requires initialized `TR_NAMES`
`TR_NAMES` loads asynchronously. Always wait at least 500ms after page load before calling `selectTrainer()`.