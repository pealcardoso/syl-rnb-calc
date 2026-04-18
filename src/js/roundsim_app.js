/**
 * Round Simulator App — Full battle planning tool
 * Manages teams, lines, rounds, extra damage sources, and integrates with the calc engine.
 */
(function () {
    'use strict';

    // ════════════════════════════════════════════════════════════
    // CONSTANTS
    // ════════════════════════════════════════════════════════════

    var SPRITE_BASE = 'https://raw.githubusercontent.com/May8th1995/sprites/master/';
    var ITEM_SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/';
    var TYPE_SPRITE_BASE = 'https://play.pokemonshowdown.com/sprites/types/';
    var CATEGORY_SPRITE_BASE = 'https://play.pokemonshowdown.com/sprites/categories/';
    var MAX_TEAM_SIZE = 6;

    // ── RBDex move data lookup ──────────────────────────────────
    function lookupMoveData(moveName) {
        if (!moveName || !window.BattleMovedex) return null;
        var key = moveName.toLowerCase().replace(/[\s\-\']+/g, '');
        return window.BattleMovedex[key] || null;
    }

    function lookupItemData(itemName) {
        if (!itemName || !window.BattleItems) return null;
        var key = itemName.toLowerCase().replace(/[\s\-\']+/g, '');
        return window.BattleItems[key] || null;
    }

    function getItemSpriteUrl(itemName) {
        if (!itemName) return '';
        var slug = itemName.toLowerCase().replace(/\s+/g, '-');
        return ITEM_SPRITE_BASE + slug + '.png';
    }

    function getTypeSpriteUrl(type) {
        if (!type) return '';
        return TYPE_SPRITE_BASE + type + '.png';
    }

    function getCategorySpriteUrl(category) {
        if (!category) return '';
        return CATEGORY_SPRITE_BASE + category + '.png';
    }

    /** Parse secondary effects from BattleMovedex entry */
    function parseMoveEffects(moveData) {
        if (!moveData) return null;
        var effects = { primary: null, secondary: null };

        // Primary effects (non-secondary, inherent to the move)
        var primaryParts = [];
        if (moveData.drain) primaryParts.push('Drains ' + moveData.drain[0] + '/' + moveData.drain[1] + ' HP');
        if (moveData.recoil) primaryParts.push('Recoil ' + moveData.recoil[0] + '/' + moveData.recoil[1]);
        if (moveData.heal) primaryParts.push('Heals ' + moveData.heal[0] + '/' + moveData.heal[1] + ' HP');
        if (moveData.hasCrashDamage) primaryParts.push('Crash damage on miss');
        if (moveData.willCrit) primaryParts.push('Always crits');
        if (moveData.forceSwitch) primaryParts.push('Forces switch');
        if (moveData.selfdestruct) primaryParts.push('User faints');
        if (moveData.breaksProtect) primaryParts.push('Breaks Protect');
        if (moveData.status) primaryParts.push('Inflicts ' + formatStatus(moveData.status));
        if (moveData.boosts) {
            var parts = formatBoosts(moveData.boosts);
            if (parts) primaryParts.push(parts);
        }
        if (moveData.self && moveData.self.boosts) {
            var selfParts = formatBoosts(moveData.self.boosts);
            if (selfParts) primaryParts.push('User: ' + selfParts);
        }
        if (primaryParts.length) effects.primary = primaryParts.join('; ');

        // Secondary effects
        if (moveData.secondary) {
            var sec = moveData.secondary;
            var secParts = [];
            if (sec.chance) secParts.push(sec.chance + '% chance');
            if (sec.status) secParts.push(formatStatus(sec.status));
            if (sec.volatileStatus) secParts.push(formatVolatile(sec.volatileStatus));
            if (sec.boosts) secParts.push(formatBoosts(sec.boosts));
            if (sec.self && sec.self.boosts) secParts.push('User: ' + formatBoosts(sec.self.boosts));
            if (secParts.length) effects.secondary = secParts.join(' ');
        }

        // secondaries (array form, e.g. Triple Arrows)
        if (moveData.secondaries && moveData.secondaries.length) {
            var secAll = [];
            for (var i = 0; i < moveData.secondaries.length; i++) {
                var s = moveData.secondaries[i];
                var sp = [];
                if (s.chance) sp.push(s.chance + '%');
                if (s.status) sp.push(formatStatus(s.status));
                if (s.volatileStatus) sp.push(formatVolatile(s.volatileStatus));
                if (s.boosts) sp.push(formatBoosts(s.boosts));
                if (sp.length) secAll.push(sp.join(' '));
            }
            if (secAll.length) effects.secondary = secAll.join('; ');
        }

        return (effects.primary || effects.secondary) ? effects : null;
    }

    function formatStatus(s) {
        var map = { brn: 'Burn', par: 'Paralysis', psn: 'Poison', tox: 'Badly Poisoned', slp: 'Sleep', frz: 'Freeze' };
        return map[s] || s;
    }

    function formatVolatile(v) {
        var map = { flinch: 'Flinch', confusion: 'Confusion', partiallytrapped: 'Trap', leechseed: 'Leech Seed' };
        return map[v] || v;
    }

    function formatBoosts(boosts) {
        if (!boosts) return '';
        var names = { atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe', accuracy: 'Acc', evasion: 'Eva' };
        var parts = [];
        for (var stat in boosts) {
            var val = boosts[stat];
            parts.push(names[stat] || stat);
            parts[parts.length - 1] += (val > 0 ? '+' : '') + val;
        }
        return parts.join('/');
    }

    // ── Apply secondary effect to battle state ──────────────────
    /** Check if a move has 100% guaranteed effects (always apply regardless of checkbox) */
    function isGuaranteedEffect(moveData) {
        if (!moveData) return false;
        // Primary status moves (e.g., Thunder Wave, Will-O-Wisp, Toxic) — always 100%
        if (moveData.status) return true;
        // Primary boosts on target (e.g., Charm -2 Atk) — always 100%
        if (moveData.boosts) return true;
        // Self boosts that always happen (e.g., Close Combat, Shell Smash)
        if (moveData.self && moveData.self.boosts) return true;
        // Secondary with 100% chance (e.g., Scald's 30% is not guaranteed, but some moves have 100%)
        if (moveData.secondary && moveData.secondary.chance === 100) return true;
        // secondaries array — all 100%
        if (moveData.secondaries) {
            var allGuaranteed = true;
            for (var i = 0; i < moveData.secondaries.length; i++) {
                if (moveData.secondaries[i].chance && moveData.secondaries[i].chance < 100) {
                    allGuaranteed = false;
                    break;
                }
            }
            if (allGuaranteed) return true;
        }
        return false;
    }

    /** Given move data, determine state changes. guaranteedOnly = only apply 100% effects */
    function resolveSecondaryEffects(moveData, targetSide, guaranteedOnly) {
        var changes = { status: '', volatile: '', boosts: null, selfBoosts: null };
        if (!moveData) return changes;

        // Primary status (e.g., Thunder Wave always paralyzes) — always guaranteed
        if (moveData.status) {
            changes.status = formatStatus(moveData.status);
        }
        // Primary boosts — check target to determine if self or opponent
        if (moveData.boosts) {
            if (moveData.target === 'self' || moveData.target === 'allies' || moveData.target === 'allySide') {
                // Self-targeting moves: boosts apply to the user (e.g., Swords Dance, Calm Mind)
                changes.selfBoosts = moveData.boosts;
            } else {
                // Target-directed moves: boosts apply to opponent (e.g., Charm, Growl)
                changes.boosts = moveData.boosts;
            }
        }
        // Self boosts from .self property (e.g., Close Combat self stat drops) — always guaranteed
        if (moveData.self && moveData.self.boosts) {
            // Merge with any existing self boosts
            if (changes.selfBoosts) {
                var existing = changes.selfBoosts;
                var incoming = moveData.self.boosts;
                var merged = {};
                for (var s in existing) merged[s] = existing[s];
                for (var s in incoming) merged[s] = (merged[s] || 0) + incoming[s];
                changes.selfBoosts = merged;
            } else {
                changes.selfBoosts = moveData.self.boosts;
            }
        }

        // Secondary effects — apply if not in guaranteedOnly mode, OR if chance is 100%
        if (moveData.secondary) {
            var sec = moveData.secondary;
            var isSecGuaranteed = !sec.chance || sec.chance === 100;
            if (!guaranteedOnly || isSecGuaranteed) {
                if (sec.status) changes.status = formatStatus(sec.status);
                if (sec.volatileStatus) changes.volatile = sec.volatileStatus;
                if (sec.boosts) changes.boosts = sec.boosts;
                if (sec.self && sec.self.boosts) changes.selfBoosts = sec.self.boosts;
            }
        }

        return changes;
    }

    // Map RS status names ↔ calc form status names
    var RS_TO_CALC = {
        'Burn': 'Burned', 'Paralysis': 'Paralyzed', 'Poison': 'Poisoned',
        'Badly Poisoned': 'Badly Poisoned', 'Sleep': 'Asleep', 'Freeze': 'Frozen'
    };
    var CALC_TO_RS = {};
    for (var k in RS_TO_CALC) CALC_TO_RS[RS_TO_CALC[k]] = k;

    // Contact-damage abilities
    var CONTACT_DAMAGE_ABILITIES = {
        'Iron Barbs': 1/8, 'Rough Skin': 1/8
    };

    // Contact-damage items on defender
    var CONTACT_DAMAGE_ITEMS = {
        'Rocky Helmet': 1/6
    };

    // Recoil items on attacker
    var RECOIL_ITEMS = {
        'Life Orb': 1/10
    };

    // Healing items
    var HEALING_ITEMS = {
        'Leftovers': { frac: 1/16, condition: null },
        'Black Sludge': { frac: 1/16, condition: 'poison-type' }
    };

    // Abilities that block weather damage
    var WEATHER_IMMUNE_ABILITIES = [
        'Overcoat', 'Magic Guard', 'Sand Veil', 'Sand Rush', 'Sand Force',
        'Ice Body', 'Snow Cloak', 'Slush Rush'
    ];

    // ════════════════════════════════════════════════════════════
    // STATE
    // ════════════════════════════════════════════════════════════

    var lines = [createLine('Line A')];
    var currentLineIdx = 0;

    // Track selected moves from calc radio buttons (independent for P1 and P2)
    var selectedP1Move = 'none';  // 0-3 or 'none'
    var selectedP2Move = 'none';
    var suppressP2Sync = false;  // Prevent syncP2Team during intentional switches

    function createLine(name) {
        return {
            id: Date.now() + Math.random(),
            name: name,
            rounds: [],
            roundCounter: 0,
            teams: {
                p1: { roster: [], activeIdx: -1 },
                p2: { roster: [], activeIdx: -1 }
            },
            fieldState: {}  // track field conditions per line
        };
    }
    function curLine() { return lines[currentLineIdx]; }

    // ════════════════════════════════════════════════════════════
    // ROSTER MANAGEMENT
    // ════════════════════════════════════════════════════════════

    function createRosterEntry(name, setId, sprite, item, ability, moves, maxHP, types) {
        return {
            name: name,
            setId: setId,       // full set ID like "Garchomp (Gym Leader Hassel)"
            sprite: sprite,
            item: item,
            ability: ability,
            moves: moves || [],
            types: types || [],
            maxHP: maxHP,
            currentHP: maxHP,   // worst-case HP (displayed as solid bar)
            bestCaseHP: maxHP,  // best-case HP (upper bound of uncertainty range)
            status: '',
            toxicCounter: 0,
            boosts: { at: 0, df: 0, sa: 0, sd: 0, sp: 0 }
        };
    }

    function findInRoster(team, name) {
        for (var i = 0; i < team.roster.length; i++) {
            if (team.roster[i].name === name) return i;
        }
        return -1;
    }

    function getActiveEntry(team) {
        if (team.activeIdx >= 0 && team.activeIdx < team.roster.length) {
            return team.roster[team.activeIdx];
        }
        return null;
    }

    // ════════════════════════════════════════════════════════════
    // CALC INTEGRATION — reading from the existing calc form
    // ════════════════════════════════════════════════════════════

    function getP1Name() {
        var v = $('#p1 .set-selector').val();
        return v ? v.split(' (')[0] : '';
    }
    function getP2Name() {
        var v = $('#p2 .set-selector').val();
        return v ? v.split(' (')[0] : '';
    }
    function getSetId(side) {
        return $('#' + side + ' .set-selector').val() || '';
    }
    function getSprite(name) {
        if (!name) return '';
        if (name === 'Aegislash-Shield') return SPRITE_BASE + 'Aegislash.png';
        return SPRITE_BASE + name + '.png';
    }
    function getItem(side) { return $('#' + side + ' .item').val() || ''; }
    function getAbility(side) { return $('#' + side + ' .ability').val() || ''; }
    function getStatus(side) { return $('#' + side + ' .status').val() || 'Healthy'; }
    function getMoves(side) {
        var m = [];
        for (var i = 1; i <= 4; i++) {
            var v = $('#' + side + ' .move' + i + ' .move-selector').val();
            m.push(v || '(No Move)');
        }
        return m;
    }
    function getTypes(side) {
        var t1 = $('#' + side + ' .type1').val() || '';
        var t2 = $('#' + side + ' .type2').val() || '';
        return t2 ? [t1, t2] : [t1];
    }
    function getCurrentHP(side) {
        var cur = parseInt($('#' + side + ' .current-hp').val()) || 0;
        var max = parseInt($('#' + side + ' .max-hp').text()) || 0;
        return { current: cur, max: max };
    }

    function getSpeedInfo() {
        var p1s = parseInt($('#p1 .sp .total').text()) || 0;
        var p2s = parseInt($('#p2 .sp .total').text()) || 0;
        var p1sMod = $('#p1 .sp .totalMod').text();
        var p2sMod = $('#p2 .sp .totalMod').text();
        if (p1sMod) p1s = parseInt(p1sMod) || p1s;
        if (p2sMod) p2s = parseInt(p2sMod) || p2s;
        // Apply paralysis speed penalty (speed drops to 75% of original)
        if ($('#p1 .status').val() === 'Paralyzed') p1s = Math.floor(p1s * 0.75);
        if ($('#p2 .status').val() === 'Paralyzed') p2s = Math.floor(p2s * 0.75);
        var tr = $('#trickroom').is(':checked');
        var f;
        if (tr) f = p1s === p2s ? 'tie' : (p1s < p2s ? 'p1' : 'p2');
        else    f = p1s === p2s ? 'tie' : (p1s > p2s ? 'p1' : 'p2');
        return { p1: p1s, p2: p2s, trickRoom: tr, faster: f };
    }

    function getWeather() { return $("input:radio[name='weather']:checked").val() || 'None'; }
    function getTerrain() { return $("input:checkbox[name='terrain']:checked").val() || 'None'; }

    // ════════════════════════════════════════════════════════════
    // DAMAGE CALCULATIONS
    // ════════════════════════════════════════════════════════════

    function getDamageInfo(sideIdx, moveIdx) {
        if (typeof damageResults === 'undefined' || !damageResults ||
            !damageResults[sideIdx] || !damageResults[sideIdx][moveIdx]) return null;
        var r = damageResults[sideIdx][moveIdx];
        var rng = r.range();
        return {
            desc: r.moveDesc(notation),
            range: rng,
            minDmg: rng[0],
            maxDmg: rng[1],
            move: r.move
        };
    }

    function getCritResult(sideIdx, moveIdx) {
        try {
            var p1 = createPokemon($('#p1'));
            var p2 = createPokemon($('#p2'));
            var p1f = createField();
            var p2f = p1f.clone().swap();
            var atk, def, fld, src;
            if (sideIdx === 0) { atk=p1; def=p2; fld=p1f; src=$('#p1'); }
            else               { atk=p2; def=p1; fld=p2f; src=$('#p2'); }
            var md = src.find('.move' + (moveIdx + 1));
            var mn = md.find('select.move-selector').val();
            if (!mn || mn === '(No Move)') return null;
            var mv = new calc.Move(gen, mn, {
                ability: atk.ability, item: atk.item, isCrit: true,
                hits: +md.find('.move-hits').val() || undefined,
                overrides: { basePower: +md.find('.move-bp').val(), type: md.find('.move-type').val() }
            });
            var res = calc.calculate(gen, atk, def, mv, fld);
            var rng = res.range();
            return { minDmg: rng[0], maxDmg: rng[1] };
        } catch (e) { return null; }
    }

    // ════════════════════════════════════════════════════════════
    // EXTRA DAMAGE SOURCES
    // ════════════════════════════════════════════════════════════

    function calcExtraDamage(attacker, defender, moveInfo, weather) {
        var extras = [];
        if (!moveInfo || !moveInfo.move) return extras;

        var atkMaxHP = attacker.maxHP;
        var defMaxHP = defender.maxHP;
        var move = moveInfo.move;

        // --- Life Orb recoil on attacker ---
        if (attacker.item === 'Life Orb' && moveInfo.minDmg > 0) {
            var loRecoil = Math.max(1, Math.floor(atkMaxHP / 10));
            extras.push({
                target: 'attacker',
                source: 'Life Orb',
                damage: loRecoil,
                type: 'recoil'
            });
        }

        // --- Move recoil ---
        if (move.recoil && moveInfo.maxDmg > 0) {
            var recoilMin = Math.max(1, Math.floor(moveInfo.minDmg * move.recoil[0] / move.recoil[1]));
            var recoilMax = Math.max(1, Math.floor(moveInfo.maxDmg * move.recoil[0] / move.recoil[1]));
            extras.push({
                target: 'attacker',
                source: 'Recoil (' + move.recoil[0] + '/' + move.recoil[1] + ')',
                damage: recoilMax,  // worst-case
                damageMin: recoilMin,
                type: 'recoil'
            });
        }

        // --- Contact damage (Iron Barbs, Rough Skin, Rocky Helmet) ---
        var isContact = !!(move.makesContact || move.flags && move.flags.contact);
        if (isContact && moveInfo.minDmg > 0) {
            // Defender ability
            if (CONTACT_DAMAGE_ABILITIES[defender.ability]) {
                var frac = CONTACT_DAMAGE_ABILITIES[defender.ability];
                var contactDmg = Math.max(1, Math.floor(atkMaxHP * frac));
                extras.push({
                    target: 'attacker',
                    source: defender.ability,
                    damage: contactDmg,
                    type: 'contact'
                });
            }
            // Defender item
            if (CONTACT_DAMAGE_ITEMS[defender.item]) {
                var frac2 = CONTACT_DAMAGE_ITEMS[defender.item];
                var contactDmg2 = Math.max(1, Math.floor(atkMaxHP * frac2));
                extras.push({
                    target: 'attacker',
                    source: defender.item,
                    damage: contactDmg2,
                    type: 'contact'
                });
            }
        }

        // --- Drain / healing moves ---
        if (move.drain && moveInfo.maxDmg > 0) {
            var drainMin = Math.max(1, Math.floor(moveInfo.minDmg * move.drain[0] / move.drain[1]));
            var drainMax = Math.max(1, Math.floor(moveInfo.maxDmg * move.drain[0] / move.drain[1]));
            extras.push({
                target: 'attacker',
                source: 'Drain (' + move.drain[0] + '/' + move.drain[1] + ')',
                damage: -drainMax,  // negative = healing, worst-case for P1 = min heal
                damageMin: -drainMin,
                type: 'drain'
            });
        }

        return extras;
    }

    function calcEndOfTurnDamage(entry, weather) {
        var eot = [];
        var maxHP = entry.maxHP;

        // --- Status damage ---
        if (entry.status === 'Burn') {
            var burnDmg = Math.max(1, Math.floor(maxHP / 16));
            eot.push({ source: 'Burn', damage: burnDmg });
        }
        if (entry.status === 'Poison') {
            var psnDmg = Math.max(1, Math.floor(maxHP / 8));
            eot.push({ source: 'Poison', damage: psnDmg });
        }
        if (entry.status === 'Badly Poisoned') {
            var toxN = Math.min(entry.toxicCounter || 1, 15);
            var toxDmg = Math.max(1, Math.floor(maxHP * toxN / 16));
            eot.push({ source: 'Toxic (' + toxN + '/16)', damage: toxDmg });
        }

        // --- Weather damage ---
        if (weather === 'Sand') {
            var immuneToSand = hasType(entry, ['Rock', 'Ground', 'Steel']) ||
                isWeatherImmune(entry.ability);
            if (!immuneToSand) {
                eot.push({ source: 'Sandstorm', damage: Math.max(1, Math.floor(maxHP / 16)) });
            }
        }
        if (weather === 'Hail' || weather === 'Snow') {
            // Snow doesn't do damage in gen 9, but Hail does in earlier gens
            // For simplicity, only apply if Hail
            if (weather === 'Hail') {
                var immuneToHail = hasType(entry, ['Ice']) || isWeatherImmune(entry.ability);
                if (!immuneToHail) {
                    eot.push({ source: 'Hail', damage: Math.max(1, Math.floor(maxHP / 16)) });
                }
            }
        }

        // --- Healing items ---
        if (entry.item === 'Leftovers') {
            var leftHeal = Math.max(1, Math.floor(maxHP / 16));
            eot.push({ source: 'Leftovers', damage: -leftHeal });
        }
        if (entry.item === 'Black Sludge') {
            if (hasType(entry, ['Poison'])) {
                eot.push({ source: 'Black Sludge', damage: -Math.max(1, Math.floor(maxHP / 16)) });
            } else {
                eot.push({ source: 'Black Sludge', damage: Math.max(1, Math.floor(maxHP / 8)) });
            }
        }

        // --- Grassy Terrain healing ---
        if (getTerrain() === 'Grassy') {
            eot.push({ source: 'Grassy Terrain', damage: -Math.max(1, Math.floor(maxHP / 16)) });
        }

        return eot;
    }

    function hasType(entry, types) {
        if (!entry.types) return false;
        for (var i = 0; i < types.length; i++) {
            for (var j = 0; j < entry.types.length; j++) {
                if (entry.types[j] === types[i]) return true;
            }
        }
        return false;
    }

    function isWeatherImmune(ability) {
        return ability === 'Overcoat' || ability === 'Magic Guard';
    }

    // ════════════════════════════════════════════════════════════
    // ROUND PROBABILITY CALCULATION
    // ════════════════════════════════════════════════════════════

    function calcRoundProbability(p2MoveIdx, p2Crit, p1MoveData, p2MoveData,
        p1ApplySec, p2ApplySec, p1Guaranteed, p2Guaranteed, p2AllAIPcts) {
        var factors = [];
        var totalProb = 1.0;

        // 1. P2 move selection probability (from AI percentages)
        var p2MoveProb = 1.0;
        if (p2MoveIdx !== 'none' && p2MoveIdx !== -1 && p2AllAIPcts && p2AllAIPcts[p2MoveIdx]) {
            var pctStr = p2AllAIPcts[p2MoveIdx].replace('%', '').trim();
            var pctVal = parseFloat(pctStr);
            if (!isNaN(pctVal) && pctVal > 0 && pctVal < 100) {
                p2MoveProb = pctVal / 100;
            }
        }
        factors.push({ name: 'P2 Move Selection', prob: p2MoveProb });
        totalProb *= p2MoveProb;

        // 2. P2 crit probability (1/24 = 4.17% base crit rate)
        var CRIT_RATE = 1 / 24;
        if (p2Crit) {
            factors.push({ name: 'P2 Critical Hit', prob: CRIT_RATE });
            totalProb *= CRIT_RATE;
        } else {
            factors.push({ name: 'P2 No Crit', prob: 1 - CRIT_RATE });
            totalProb *= (1 - CRIT_RATE);
        }

        // 3. P1 effect application probability
        if (p1ApplySec && !p1Guaranteed && p1MoveData) {
            var p1EffChance = 1.0;
            if (p1MoveData.secondary && p1MoveData.secondary.chance) {
                p1EffChance = p1MoveData.secondary.chance / 100;
            }
            factors.push({ name: 'P1 Effect Applied', prob: p1EffChance });
            totalProb *= p1EffChance;
        }

        // 4. P2 effect application probability
        if (p2ApplySec && !p2Guaranteed && p2MoveData) {
            var p2EffChance = 1.0;
            if (p2MoveData.secondary && p2MoveData.secondary.chance) {
                p2EffChance = p2MoveData.secondary.chance / 100;
            }
            factors.push({ name: 'P2 Effect Applied', prob: p2EffChance });
            totalProb *= p2EffChance;
        }

        // 5. P2 accuracy (miss chance)
        if (p2MoveData && p2MoveData.accuracy && p2MoveData.accuracy !== true) {
            var accProb = p2MoveData.accuracy / 100;
            factors.push({ name: 'P2 Move Hits', prob: accProb });
            totalProb *= accProb;
        }

        return { total: totalProb, factors: factors };
    }

    // ════════════════════════════════════════════════════════════
    // LOAD POKEMON INTO CALC FORM
    // ════════════════════════════════════════════════════════════

    function loadPokemonIntoForm(side, entry) {
        if (!entry || !entry.setId) return;
        // Use val() + change() + select2-chosen text update (same pattern as trainer click handlers)
        var $sel = $('#' + side + ' .set-selector');
        $sel.val(entry.setId);
        $sel.change();
        // Update the Select2 display text to match
        $('#' + side + ' .set-selector').closest('.select2-container').find('.select2-chosen').text(entry.setId);

        // After the calc form has fully loaded, set the tracked HP, status, and boosts
        setTimeout(function () {
            if (entry.currentHP !== undefined) {
                $('#' + side + ' .current-hp').val(entry.currentHP).trigger('input');
            }
            if (entry.status) {
                var calcStatus = RS_TO_CALC[entry.status] || 'Healthy';
                $('#' + side + ' .status').val(calcStatus).trigger('change');
                if (entry.status === 'Badly Poisoned' && entry.toxicCounter) {
                    $('#' + side + ' .toxic-counter').val(entry.toxicCounter);
                }
            }
            // Set boosts
            if (entry.boosts) {
                var stats = ['at', 'df', 'sa', 'sd', 'sp'];
                for (var i = 0; i < stats.length; i++) {
                    var b = entry.boosts[stats[i]] || 0;
                    $('#' + side + ' .' + stats[i] + ' .boost').val(b);
                }
            }
            // Re-inject damage badges now that the new pokemon is loaded
            injectDamageBadges();
        }, 300);
    }

    // ════════════════════════════════════════════════════════════
    // TEAM PANEL — Auto-sync from calc's box/team & opposing team
    // ════════════════════════════════════════════════════════════

    /** Initialize P1 roster from the currently loaded calc form pokemon (called once on load) */
    function initP1Team() {
        var line = curLine();
        var team = line.teams.p1;
        if (team.roster.length > 0) return; // already initialized

        var p1Name = getP1Name();
        if (p1Name) {
            var p1SetId = getSetId('p1');
            var hp = getCurrentHP('p1');
            var entry = createRosterEntry(
                p1Name, p1SetId,
                getSprite(p1Name),
                getItem('p1'),
                getAbility('p1'),
                getMoves('p1'),
                hp.max || 100,
                getTypes('p1')
            );
            entry.currentHP = hp.current || entry.maxHP;
            team.roster.push(entry);
            team.activeIdx = 0;
        }
        renderTeamPanel('p1');
        renderBox('p1');
    }

    /** Sync P2 roster from the calc's P2 selector + .trainer-pok-opposing images.
     *  Always builds fresh entries at full HP — HP only changes via captureRound. */
    function syncP2Team() {
        if (suppressP2Sync) return;
        var line = curLine();
        var team = line.teams.p2;
        // Preserve HP/status only for pokemon that have been involved in logged rounds
        var oldEntries = {};
        for (var i = 0; i < team.roster.length; i++) {
            oldEntries[team.roster[i].name] = team.roster[i];
        }

        var newRoster = [];

        // The currently loaded P2 pokemon
        var p2SetId = getSetId('p2');
        var p2Name = getP2Name();
        if (p2Name) {
            if (oldEntries[p2Name] && line.rounds.length > 0) {
                // Preserve HP from rounds
                newRoster.push(oldEntries[p2Name]);
            } else {
                var hp = getCurrentHP('p2');
                var maxHP = hp.max || 100;
                var entry = createRosterEntry(
                    p2Name, p2SetId,
                    getSprite(p2Name),
                    getItem('p2'),
                    getAbility('p2'),
                    getMoves('p2'),
                    maxHP,
                    getTypes('p2')
                );
                // Always start at full HP if no rounds logged
                entry.currentHP = maxHP;
                newRoster.push(entry);
            }
        }

        // Other opposing team pokemon (from trainer set)
        $('.trainer-pok-list-opposing img.trainer-pok').each(function () {
            var setId = $(this).data('id');
            if (!setId) return;
            var pokeName = String(setId).split(' (')[0];
            if (!pokeName) return;
            // Skip if already added (the currently loaded P2)
            for (var j = 0; j < newRoster.length; j++) {
                if (newRoster[j].name === pokeName) return;
            }

            if (oldEntries[pokeName] && line.rounds.length > 0) {
                newRoster.push(oldEntries[pokeName]);
            } else {
                var set = lookupSet(setId);
                var maxHP = set ? calcMaxHP(pokeName, set) : 100;
                var types = [];
                try {
                    var species = calc.SPECIES[gen.num][pokeName];
                    if (species && species.types) types = species.types;
                } catch (e) {}
                var entry = createRosterEntry(
                    pokeName, setId,
                    getSprite(pokeName),
                    set ? (set.item || '') : '',
                    set ? (set.ability || '') : '',
                    set ? (set.moves || []) : [],
                    maxHP, types
                );
                newRoster.push(entry);
            }
        });

        team.roster = newRoster;
        if (team.activeIdx < 0 && newRoster.length > 0) team.activeIdx = 0;
        if (team.activeIdx >= newRoster.length) team.activeIdx = newRoster.length - 1;
        renderTeamPanel('p2');
    }

    /** Look up a set from SETDEX by its setId string like "Garchomp (Gym Leader Hassel)" */
    function lookupSet(setId) {
        var parts = String(setId).match(/^(.+?) \((.+)\)$/);
        if (!parts) return null;
        var pokeName = parts[1];
        var setName = parts[2];
        // Use the global setdex (tracks current gen) with fallback to SETDEX_SV
        var sd = window.setdex || window.SETDEX_SV || {};
        return (sd[pokeName] && sd[pokeName][setName]) || null;
    }

    function addToTeam(side) {
        // Now unused — teams auto-sync from the calc
    }

    function removeFromTeam(side, idx) {
        var line = curLine();
        var team = line.teams[side];
        team.roster.splice(idx, 1);
        if (team.activeIdx >= team.roster.length) team.activeIdx = team.roster.length - 1;
        renderTeamPanel(side);
    }

    function switchActive(side, idx) {
        var line = curLine();
        var team = line.teams[side];
        if (idx < 0 || idx >= team.roster.length) return;
        if (idx === team.activeIdx) return; // already active

        // Only save form state if rounds have been logged (preserves HP changes)
        if (line.rounds.length > 0) {
            saveFormToRoster(side);
        }

        // Reset boosts on the outgoing pokemon (boosts clear on switch)
        var outgoing = getActiveEntry(team);
        if (outgoing) {
            outgoing.boosts = { at: 0, df: 0, sa: 0, sd: 0, sp: 0 };
        }

        team.activeIdx = idx;
        var entry = team.roster[idx];

        // Suppress P2 sync while we load a P2 pokemon intentionally
        if (side === 'p2') suppressP2Sync = true;

        // Load the new active into the calc form
        loadPokemonIntoForm(side, entry);
        renderTeamPanel(side);

        if (side === 'p2') {
            setTimeout(function () { suppressP2Sync = false; }, 500);
        }
    }

    function saveFormToRoster(side) {
        var line = curLine();
        var team = line.teams[side];
        var entry = getActiveEntry(team);
        if (!entry) return;

        // Save current HP
        var hp = getCurrentHP(side);
        entry.currentHP = hp.current;
        entry.maxHP = hp.max;

        // Save status
        var calcStatus = getStatus(side);
        entry.status = CALC_TO_RS[calcStatus] || '';
        if (calcStatus === 'Badly Poisoned') {
            entry.toxicCounter = parseInt($('#' + side + ' .toxic-counter').val()) || 1;
        }

        // Boosts are tracked in roster entry directly (not from UI selects)

        // Save item/ability (might have changed)
        entry.item = getItem(side);
        entry.ability = getAbility(side);
    }

    // ════════════════════════════════════════════════════════════
    // SYNC BOOSTS
    // ════════════════════════════════════════════════════════════

    function syncBoostsToCalc() {
        var line = curLine();
        if (!line) return;
        var sides = ['p1', 'p2'];
        var stats = ['at', 'df', 'sa', 'sd', 'sp'];
        for (var si = 0; si < sides.length; si++) {
            var side = sides[si];
            var entry = getActiveEntry(line.teams[side]);
            if (!entry) continue;
            for (var sti = 0; sti < stats.length; sti++) {
                var val = (entry.boosts && entry.boosts[stats[sti]]) || 0;
                $('#' + side + ' .' + stats[sti] + ' .boost').val(val).trigger('change');
            }
        }
    }

    // ════════════════════════════════════════════════════════════
    // CAPTURE ROUND
    // ════════════════════════════════════════════════════════════

    function captureRound(p1MoveIdx, p2MoveIdx, p2Crit, p1PreDmg, p1PreStatus, comment, p1ApplySecondary, p2ApplySecondary) {
        var line = curLine();

        // Save current form state to roster
        saveFormToRoster('p1');
        saveFormToRoster('p2');

        // Sync boosts from roster to calc form before damage calculation
        syncBoostsToCalc();

        var speed = getSpeedInfo();

        var p1Entry = getActiveEntry(line.teams.p1);
        var p2Entry = getActiveEntry(line.teams.p2);
        if (!p1Entry || !p2Entry) {
            alert('Both sides need an active Pokémon on their team.');
            return null;
        }

        // Get damage info
        var p1Dmg = (p1MoveIdx !== 'none' && p1MoveIdx !== -1) ? getDamageInfo(0, p1MoveIdx) : null;
        var p2Dmg = (p2MoveIdx !== 'none' && p2MoveIdx !== -1) ? getDamageInfo(1, p2MoveIdx) : null;
        var p2CritInfo = (p2Crit && p2MoveIdx !== 'none' && p2MoveIdx !== -1) ? getCritResult(1, p2MoveIdx) : null;

        // Look up RBDex move data for detailed info
        var p1MoveName = (p1MoveIdx !== 'none' && p1MoveIdx !== -1) ? getMoveNames(0, p1MoveIdx) : null;
        var p2MoveName = (p2MoveIdx !== 'none' && p2MoveIdx !== -1) ? getMoveNames(1, p2MoveIdx) : null;
        var p1MoveData = p1MoveName ? lookupMoveData(p1MoveName) : null;
        var p2MoveData = p2MoveName ? lookupMoveData(p2MoveName) : null;

        // ── Move priority determines turn order ──
        var p1Priority = (p1MoveData && typeof p1MoveData.priority === 'number') ? p1MoveData.priority : 0;
        var p2Priority = (p2MoveData && typeof p2MoveData.priority === 'number') ? p2MoveData.priority : 0;
        if (p1Priority !== p2Priority) {
            // Higher priority bracket goes first (regardless of speed)
            speed.faster = p1Priority > p2Priority ? 'p1' : 'p2';
        }
        // If same priority bracket, speed.faster from getSpeedInfo() is used as-is

        // Capture all P2 AI percentages and move names for display in the round log
        var p2AllMoves = [], p2AllAIPcts = [];
        for (var ai = 0; ai < 4; ai++) {
            p2AllMoves.push(getMoveNames(1, ai));
            p2AllAIPcts.push($('#resultMoveRateR' + (ai + 1)).text() || '');
        }

        // Apply P1 pre-damage (e.g., hazard damage, prior chip)
        if (p1PreDmg && p1PreDmg > 0) {
            p1Entry.currentHP = Math.max(0, p1Entry.currentHP - p1PreDmg);
        }
        // Apply P1 pre-status (e.g., from a previous turn's move)
        if (p1PreStatus) {
            p1Entry.status = p1PreStatus;
        }

        // Determine which effects are guaranteed (100% chance) vs optional (checkbox)
        var p1Guaranteed = isGuaranteedEffect(p1MoveData);
        var p2Guaranteed = isGuaranteedEffect(p2MoveData);

        // Resolve secondary effects for both sides (but apply in speed order)
        var p1SecondaryApplied = null, p2SecondaryApplied = null;
        var p1Eff = ((p1ApplySecondary || p1Guaranteed) && p1MoveData) ? resolveSecondaryEffects(p1MoveData, 'p2', p1Guaranteed) : null;
        var p2Eff = ((p2ApplySecondary || p2Guaranteed) && p2MoveData) ? resolveSecondaryEffects(p2MoveData, 'p1', p2Guaranteed) : null;

        // Helper: check if a pokemon is immune to sleep
        function isSleepImmune(entry) {
            var ab = (entry.ability || '').toLowerCase().replace(/\s/g, '');
            return ab === 'insomnia' || ab === 'vitalspirit' || ab === 'sweetveil';
        }
        // Helper: check if a pokemon is immune to freeze
        function isFreezeImmune(entry) {
            var ab = (entry.ability || '').toLowerCase().replace(/\s/g, '');
            if (ab === 'magmaarmor') return true;
            // Ice types are freeze-immune in gen 6+
            if (entry.types && entry.types.indexOf('Ice') !== -1) return true;
            return false;
        }
        // Helper: check if item cures a status
        function itemCuresStatus(entry, status) {
            var it = (entry.item || '').toLowerCase().replace(/\s/g, '');
            if (it === 'lumberry') return true;
            if (status === 'Sleep' && it === 'chestoberry') return true;
            if (status === 'Freeze' && it === 'aspearberry') return true;
            return false;
        }

        // Apply effects in turn order: first mover applies effects, then check blocking
        var firstMover  = (speed.faster === 'p2') ? 'p2' : 'p1';
        var secondMover = (firstMover === 'p1') ? 'p2' : 'p1';
        var firstEff    = (firstMover === 'p1') ? p1Eff : p2Eff;
        var secondEff   = (firstMover === 'p1') ? p2Eff : p1Eff;
        var firstEntry  = (firstMover === 'p1') ? p1Entry : p2Entry;
        var secondEntry = (firstMover === 'p1') ? p2Entry : p1Entry;

        // Apply first mover's secondary effects
        var secondMoverBlocked = false;
        var secondMoverBlockReason = '';
        if (firstEff) {
            if (firstMover === 'p1') p1SecondaryApplied = firstEff;
            else p2SecondaryApplied = firstEff;

            // Target effects (damages the defender = second mover)
            if (firstEff.status && !secondEntry.status) {
                var blocked = false;
                if (firstEff.status === 'Sleep' && isSleepImmune(secondEntry)) blocked = true;
                if (firstEff.status === 'Freeze' && isFreezeImmune(secondEntry)) blocked = true;
                if (!blocked) {
                    secondEntry.status = firstEff.status;
                    // Check if status blocks second mover from attacking
                    if (firstEff.status === 'Sleep') {
                        if (!itemCuresStatus(secondEntry, 'Sleep')) {
                            secondMoverBlocked = true;
                            secondMoverBlockReason = 'sleep';
                        }
                    } else if (firstEff.status === 'Freeze') {
                        if (!itemCuresStatus(secondEntry, 'Freeze')) {
                            secondMoverBlocked = true;
                            secondMoverBlockReason = 'freeze';
                        }
                    }
                }
            }
            if (firstEff.boosts) {
                applyBoosts(secondEntry, firstEff.boosts);
            }
            if (firstEff.selfBoosts) {
                applyBoosts(firstEntry, firstEff.selfBoosts);
            }
            if (firstEff.volatile === 'flinch') {
                if (firstMover === 'p1') { firstEff.flinchTarget = true; p1SecondaryApplied = firstEff; }
                else { firstEff.flinchTarget = true; p2SecondaryApplied = firstEff; }
                secondMoverBlocked = true;
                secondMoverBlockReason = 'flinch';
            }
        }

        // Apply second mover's secondary effects ONLY if they are not blocked
        if (secondEff && !secondMoverBlocked) {
            if (secondMover === 'p1') p1SecondaryApplied = secondEff;
            else p2SecondaryApplied = secondEff;

            if (secondEff.status && !firstEntry.status) {
                firstEntry.status = secondEff.status;
            }
            if (secondEff.boosts) {
                applyBoosts(firstEntry, secondEff.boosts);
            }
            if (secondEff.selfBoosts) {
                applyBoosts(secondEntry, secondEff.selfBoosts);
            }
            // Flinch from second mover doesn't matter (first mover already attacked)
        }

        // Set blocked flags for HP calculation
        var p1Flinched = secondMoverBlocked && (secondMover === 'p1');
        var p2Flinched = secondMoverBlocked && (secondMover === 'p2');

        // Increment toxic counter before EOT so the correct turn count is used
        if (p1Entry.status === 'Badly Poisoned') p1Entry.toxicCounter = (p1Entry.toxicCounter || 0) + 1;
        if (p2Entry.status === 'Badly Poisoned') p2Entry.toxicCounter = (p2Entry.toxicCounter || 0) + 1;

        // Extra damage sources
        var p1Extras = p1Dmg ? calcExtraDamage(p1Entry, p2Entry, p1Dmg, getWeather()) : [];
        var p2Extras = p2Dmg ? calcExtraDamage(p2Entry, p1Entry, p2Dmg, getWeather()) : [];

        // End-of-turn damage (uses current status, including newly inflicted this turn)
        var p1EOT = calcEndOfTurnDamage(p1Entry, getWeather());
        var p2EOT = calcEndOfTurnDamage(p2Entry, getWeather());

        // HP tracking — worst case for P1 (P2 max damage, P1 min damage)
        var p1HPBefore = p1Entry.currentHP;
        var p2HPBefore = p2Entry.currentHP;
        var p1HPAfter = p1HPBefore;
        var p2HPAfter = p2HPBefore;

        // Best-case HP tracking (for uncertainty range bar)
        var p1BestBefore = p1Entry.bestCaseHP != null ? p1Entry.bestCaseHP : p1HPBefore;
        var p2BestBefore = p2Entry.bestCaseHP != null ? p2Entry.bestCaseHP : p2HPBefore;
        var p1BestAfter = p1BestBefore;
        var p2BestAfter = p2BestBefore;

        // Calc move damage to HP
        // Worst case: P2 max damage to P1, P1 min damage to P2
        // Best case: P2 min damage to P1, P1 max damage to P2
        // If P2 crits: worst = crit max, best = non-crit min (per user request)
        var p2DmgToP1Max = (p2Dmg && !p2Flinched) ? (p2Crit && p2CritInfo ? p2CritInfo.maxDmg : p2Dmg.maxDmg) : 0;
        var p2DmgToP1Min = (p2Dmg && !p2Flinched) ? (p2Crit ? p2Dmg.minDmg : p2Dmg.minDmg) : 0;
        var p1DmgToP2Min = (p1Dmg && !p1Flinched) ? p1Dmg.minDmg : 0;
        var p1DmgToP2Max = (p1Dmg && !p1Flinched) ? p1Dmg.maxDmg : 0;

        // Apply in speed order (worst case)
        if (speed.faster === 'p1' || speed.faster === 'tie') {
            p2HPAfter = Math.max(0, p2HPAfter - p1DmgToP2Min);
            if (p2HPAfter > 0) p1HPAfter = Math.max(0, p1HPAfter - p2DmgToP1Max);
            // Best case
            p2BestAfter = Math.max(0, p2BestAfter - p1DmgToP2Max);
            if (p2BestAfter > 0) p1BestAfter = Math.max(0, p1BestAfter - p2DmgToP1Min);
            else p1BestAfter = p1BestBefore; // P2 KO'd, P1 takes no damage in best case
        } else {
            p1HPAfter = Math.max(0, p1HPAfter - p2DmgToP1Max);
            if (p1HPAfter > 0) p2HPAfter = Math.max(0, p2HPAfter - p1DmgToP2Min);
            // Best case
            p1BestAfter = Math.max(0, p1BestAfter - p2DmgToP1Min);
            if (p1BestAfter > 0) p2BestAfter = Math.max(0, p2BestAfter - p1DmgToP2Max);
            else p2BestAfter = p2BestBefore; // P1 KO'd in best case, but that's not best...
        }

        // Apply extra damage from attacks (same for worst and best — extras are fixed values)
        for (var i = 0; i < p1Extras.length; i++) {
            var ex = p1Extras[i];
            if (ex.target === 'attacker') {
                if (ex.type === 'drain') {
                    p1HPAfter = Math.min(p1Entry.maxHP, p1HPAfter - (ex.damageMin || ex.damage));
                    p1BestAfter = Math.min(p1Entry.maxHP, p1BestAfter - (ex.damageMin || ex.damage));
                } else {
                    p1HPAfter = Math.max(0, p1HPAfter - ex.damage);
                    p1BestAfter = Math.max(0, p1BestAfter - ex.damage);
                }
            }
        }
        for (var i = 0; i < p2Extras.length; i++) {
            var ex = p2Extras[i];
            if (ex.target === 'attacker') {
                if (ex.type === 'drain') {
                    p2HPAfter = Math.min(p2Entry.maxHP, p2HPAfter - (ex.damageMin || ex.damage));
                    p2BestAfter = Math.min(p2Entry.maxHP, p2BestAfter - (ex.damageMin || ex.damage));
                } else {
                    p2HPAfter = Math.max(0, p2HPAfter - ex.damage);
                    p2BestAfter = Math.max(0, p2BestAfter - ex.damage);
                }
            }
        }

        // Apply end-of-turn damage (same for both — EOT is fixed)
        for (var i = 0; i < p1EOT.length; i++) {
            p1HPAfter = Math.max(0, Math.min(p1Entry.maxHP, p1HPAfter - p1EOT[i].damage));
            p1BestAfter = Math.max(0, Math.min(p1Entry.maxHP, p1BestAfter - p1EOT[i].damage));
        }
        for (var i = 0; i < p2EOT.length; i++) {
            p2HPAfter = Math.max(0, Math.min(p2Entry.maxHP, p2HPAfter - p2EOT[i].damage));
            p2BestAfter = Math.max(0, Math.min(p2Entry.maxHP, p2BestAfter - p2EOT[i].damage));
        }

        // P1 bestCase: best for P1 = P1 has MORE HP, so bestCase >= worst
        p1BestAfter = Math.max(p1BestAfter, p1HPAfter);
        // P2 bestCase (from P1's perspective): best for P1 = P2 has LESS HP, so bestCase <= worst
        p2BestAfter = Math.min(p2BestAfter, p2HPAfter);

        // Update roster HP
        p1Entry.currentHP = p1HPAfter;
        p1Entry.bestCaseHP = p1BestAfter;
        p2Entry.currentHP = p2HPAfter;
        p2Entry.bestCaseHP = p2BestAfter;

        // ── Round probability calculation ──
        var roundProb = calcRoundProbability(p2MoveIdx, p2Crit, p1MoveData, p2MoveData,
            p1ApplySecondary, p2ApplySecondary, p1Guaranteed, p2Guaranteed,
            p2AllAIPcts);

        // Build round data
        var rd = {
            roundNum: ++line.roundCounter,
            speed: speed,
            p1Priority: p1Priority,
            p2Priority: p2Priority,
            weather: getWeather(),
            terrain: getTerrain(),
            trickRoom: speed.trickRoom,
            p2Crit: p2Crit,
            p1PreDmg: p1PreDmg || 0,
            p1PreStatus: p1PreStatus || '',
            comment: comment || '',
            probability: roundProb,
            p1: {
                name: p1Entry.name,
                sprite: p1Entry.sprite,
                item: p1Entry.item,
                ability: p1Entry.ability,
                status: p1Entry.status,
                boosts: $.extend({}, p1Entry.boosts),
                hpBefore: { current: p1HPBefore, max: p1Entry.maxHP, bestCase: p1BestBefore },
                hpAfter: { current: p1HPAfter, max: p1Entry.maxHP, bestCase: p1BestAfter },
                move: p1Dmg ? getMoveNames(0, p1MoveIdx) : '—',
                moveIdx: p1MoveIdx,
                moveData: p1MoveData ? {
                    type: p1MoveData.type || '',
                    category: p1MoveData.category || '',
                    basePower: p1MoveData.basePower || 0,
                    accuracy: p1MoveData.accuracy || 0,
                    pp: p1MoveData.pp || 0,
                    effects: parseMoveEffects(p1MoveData),
                    shortDesc: p1MoveData.shortDesc || ''
                } : null,
                flinched: p1Flinched,
                blockReason: (secondMover === 'p1') ? secondMoverBlockReason : '',
                secondaryApplied: p1ApplySecondary && p1SecondaryApplied,
                damage: p1Dmg,
                critDamage: null,
                extras: p1Extras,
                eot: p1EOT
            },
            p2: {
                name: p2Entry.name,
                sprite: p2Entry.sprite,
                item: p2Entry.item,
                ability: p2Entry.ability,
                status: p2Entry.status,
                boosts: $.extend({}, p2Entry.boosts),
                hpBefore: { current: p2HPBefore, max: p2Entry.maxHP, bestCase: p2BestBefore },
                hpAfter: { current: p2HPAfter, max: p2Entry.maxHP, bestCase: p2BestAfter },
                move: p2Dmg ? getMoveNames(1, p2MoveIdx) : '—',
                moveIdx: p2MoveIdx,
                moveData: p2MoveData ? {
                    type: p2MoveData.type || '',
                    category: p2MoveData.category || '',
                    basePower: p2MoveData.basePower || 0,
                    accuracy: p2MoveData.accuracy || 0,
                    pp: p2MoveData.pp || 0,
                    effects: parseMoveEffects(p2MoveData),
                    shortDesc: p2MoveData.shortDesc || ''
                } : null,
                flinched: p2Flinched,
                blockReason: (secondMover === 'p2') ? secondMoverBlockReason : '',
                secondaryApplied: p2ApplySecondary && p2SecondaryApplied,
                damage: p2Dmg,
                critDamage: p2CritInfo,
                extras: p2Extras,
                eot: p2EOT,
                aiPcts: p2AllAIPcts,
                allMoves: p2AllMoves
            }
        };

        // Sync status to calc form
        syncStatusToForm('p1', p1Entry);
        syncStatusToForm('p2', p2Entry);

        // Sync boosts to calc form so next round's damage uses updated boosts
        syncBoostsToCalc();

        // Update form HP
        $('#p1 .current-hp').val(p1HPAfter);
        $('#p2 .current-hp').val(p2HPAfter);

        return rd;
    }

    function getMoveNames(sideIdx, moveIdx) {
        if (moveIdx === 'none' || moveIdx === -1) return '—';
        var side = sideIdx === 0 ? 'L' : 'R';
        var label = $('label[for="resultMove' + side + (moveIdx + 1) + '"]').text();
        if (label) return label.trim();
        var sel = sideIdx === 0 ? '#p1' : '#p2';
        return $(sel + ' .move' + (moveIdx + 1) + ' .move-selector').val() || '—';
    }

    function syncStatusToForm(side, entry) {
        if (!entry) return;
        var calcStatus = RS_TO_CALC[entry.status] || 'Healthy';
        $('#' + side + ' .status').val(calcStatus).trigger('change');
        if (entry.status === 'Badly Poisoned') {
            $('#' + side + ' .toxic-counter').val(entry.toxicCounter || 1);
        }
    }

    /** Apply stat boost changes to a roster entry, clamping to ±6 */
    function applyBoosts(entry, boosts) {
        if (!entry || !boosts) return;
        var map = { atk: 'at', def: 'df', spa: 'sa', spd: 'sd', spe: 'sp' };
        for (var stat in boosts) {
            var key = map[stat] || stat;
            if (entry.boosts[key] !== undefined) {
                entry.boosts[key] = Math.max(-6, Math.min(6, (entry.boosts[key] || 0) + boosts[stat]));
            }
        }
    }

    // ════════════════════════════════════════════════════════════
    // REBUILD TEAMS (after round deletion)
    // ════════════════════════════════════════════════════════════

    function rebuildLineTeams(line) {
        // Reset all roster HP/status to initial
        for (var s = 0; s < 2; s++) {
            var side = s === 0 ? 'p1' : 'p2';
            var team = line.teams[side];
            for (var i = 0; i < team.roster.length; i++) {
                team.roster[i].currentHP = team.roster[i].maxHP;
                team.roster[i].bestCaseHP = team.roster[i].maxHP;
                team.roster[i].status = '';
                team.roster[i].toxicCounter = 0;
                team.roster[i].boosts = { at: 0, df: 0, sa: 0, sd: 0, sp: 0 };
            }
        }
        // Replay rounds to reconstruct HP/status/boosts
        for (var i = 0; i < line.rounds.length; i++) {
            var rd = line.rounds[i];
            // P1
            var p1i = findInRoster(line.teams.p1, rd.p1.name);
            if (p1i >= 0) {
                line.teams.p1.roster[p1i].currentHP = rd.p1.hpAfter.current;
                line.teams.p1.roster[p1i].bestCaseHP = rd.p1.hpAfter.bestCase != null ? rd.p1.hpAfter.bestCase : rd.p1.hpAfter.current;
                if (rd.p1.status) line.teams.p1.roster[p1i].status = rd.p1.status;
                if (rd.p1.boosts) line.teams.p1.roster[p1i].boosts = $.extend({}, rd.p1.boosts);
                line.teams.p1.activeIdx = p1i;
            }
            // P2
            var p2i = findInRoster(line.teams.p2, rd.p2.name);
            if (p2i >= 0) {
                line.teams.p2.roster[p2i].currentHP = rd.p2.hpAfter.current;
                line.teams.p2.roster[p2i].bestCaseHP = rd.p2.hpAfter.bestCase != null ? rd.p2.hpAfter.bestCase : rd.p2.hpAfter.current;
                if (rd.p2.status) line.teams.p2.roster[p2i].status = rd.p2.status;
                if (rd.p2.boosts) line.teams.p2.roster[p2i].boosts = $.extend({}, rd.p2.boosts);
                line.teams.p2.activeIdx = p2i;
            }
        }
        // Renumber remaining rounds sequentially
        line.roundCounter = 0;
        for (var i = 0; i < line.rounds.length; i++) {
            line.rounds[i].roundNum = ++line.roundCounter;
        }
        // Sync the updated HP to calc form
        var p1Active = getActiveEntry(line.teams.p1);
        var p2Active = getActiveEntry(line.teams.p2);
        if (p1Active) {
            $('#p1 .current-hp').val(p1Active.currentHP);
        }
        if (p2Active) {
            $('#p2 .current-hp').val(p2Active.currentHP);
        }
        // Sync boosts to calc form
        syncBoostsToCalc();
    }

    // ════════════════════════════════════════════════════════════
    // RENDERING
    // ════════════════════════════════════════════════════════════

    function esc(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function hpColor(pct) {
        if (pct > 50) return '#4caf50';
        if (pct > 20) return '#ff9800';
        return '#f44336';
    }

    function hpPct(cur, max) {
        if (!max || max <= 0) return 100;
        return Math.max(0, Math.min(100, cur / max * 100));
    }

    // ── Team Panel ───────────────────────────────────────────
    function renderTeamPanel(side) {
        var line = curLine();
        var team = line.teams[side];
        var $panel = $('#rsa-team-' + side);
        if (!$panel.length) return;

        var html = '';
        for (var i = 0; i < team.roster.length; i++) {
            var e = team.roster[i];
            var pct = hpPct(e.currentHP, e.maxHP);
            var col = hpColor(pct);
            var active = i === team.activeIdx ? ' rsa-active' : '';
            var fainted = e.currentHP <= 0 ? ' rsa-fainted' : '';
            var statusCls = e.status ? ' rsa-has-status' : '';

            // Color coding for P1 team slots (matchup vs current P2)
            var ccClass = '';
            if (side === 'p1' && e.setId) {
                var cc = getColorCode(e.setId);
                if (cc.speed) ccClass += ' rsa-speed-' + cc.speed;
                if (cc.code) ccClass += ' rsa-dmg-' + cc.code;
            }

            // Uncertainty range for team panel
            var bestHP = e.bestCaseHP != null ? e.bestCaseHP : e.currentHP;
            var teamUncertainBar = '';
            var teamRangeText = '';

            if (side === 'p1' && bestHP > e.currentHP) {
                // P1: bestCase > currentHP — bar extends right
                var uncertaintyPct = e.maxHP > 0 ? ((bestHP - e.currentHP) / e.maxHP * 100) : 0;
                teamUncertainBar = '<div class="rsa-team-hp-uncertain" style="width:' +
                    Math.min(100, uncertaintyPct).toFixed(1) + '%;left:' + pct.toFixed(1) + '%"></div>';
                teamRangeText = '<span class="rsa-team-hp-range">(' + e.currentHP + '–' + bestHP + ')</span>';
            } else if (side === 'p2' && bestHP < e.currentHP) {
                // P2: bestCase < currentHP — bar overlays the solid portion (P2 might have less HP)
                var bestPct = e.maxHP > 0 ? (bestHP / e.maxHP * 100) : 0;
                var uncertaintyPct = pct - bestPct;
                teamUncertainBar = '<div class="rsa-team-hp-uncertain rsa-hp-bar-uncertain-p2" style="width:' +
                    Math.min(100, uncertaintyPct).toFixed(1) + '%;left:' + bestPct.toFixed(1) + '%"></div>';
                teamRangeText = '<span class="rsa-team-hp-range">(' + bestHP + '–' + e.currentHP + ')</span>';
            }

            html += '<div class="rsa-team-slot rsa-team-slot-' + side + active + fainted + statusCls + ccClass + '" data-side="' + side + '" data-idx="' + i + '">' +
                '<img class="rsa-team-sprite" src="' + esc(e.sprite) + '" alt="' + esc(e.name) + '" title="' + esc(e.name) + '">' +
                '<div class="rsa-team-info">' +
                    '<div class="rsa-team-name">' + esc(e.name) + '</div>' +
                    '<div class="rsa-team-hp-bar"><div class="rsa-team-hp-fill" style="width:' + pct.toFixed(0) + '%;background:' + col + '"></div>' + teamUncertainBar + '</div>' +
                    '<div class="rsa-team-hp-text">' + e.currentHP + '/' + e.maxHP + ' ' + teamRangeText + '</div>' +
                    (e.status ? '<span class="rsa-status-badge rsa-status-' + e.status.toLowerCase().replace(/\s+/g, '-') + '">' + esc(e.status) + '</span>' : '') +
                    (e.ability ? '<span class="rsa-ability-badge">' + esc(e.ability) + '</span>' : '') +
                    (e.item ? '<span class="rsa-item-badge"><img class="rsa-item-sprite" src="' + esc(getItemSpriteUrl(e.item)) + '" alt="" onerror="this.style.display=\'none\'"> ' + esc(e.item) + '</span>' : '') +
                '</div>' +
                (side === 'p1' ? '<button class="rsa-team-remove" data-side="' + side + '" data-idx="' + i + '" title="Remove">×</button>' : '') +
            '</div>';
        }

        $panel.html(html);

        // Update counter badges
        $('#rsa-team-count-' + side).text(team.roster.length);

        // Keep switch dropdown in sync whenever P1 team changes
        if (side === 'p1') populateSwitchDropdown();
    }

    // ── Line Tabs ────────────────────────────────────────────
    function renderLineTabs() {
        var html = '';
        for (var i = 0; i < lines.length; i++) {
            var l = lines[i];
            var active = i === currentLineIdx ? ' rsa-tab-active' : '';
            html += '<button class="rsa-tab' + active + '" data-line-idx="' + i + '">' +
                esc(l.name) + ' <small>(' + l.rounds.length + ')</small>' +
            '</button>';
        }
        $('#rsa-line-tabs').html(html);
    }

    // ── Round Log ────────────────────────────────────────────
    function renderRoundLog() {
        var line = curLine();
        var $log = $('#rsa-round-log');
        if (line.rounds.length === 0) {
            $log.html('<div class="rsa-empty">No rounds yet. Set your teams, load the calc, and log rounds.</div>');
            return;
        }
        var html = '';
        for (var i = 0; i < line.rounds.length; i++) {
            html += renderRoundCard(line.rounds[i]);
        }
        $log.html(html);
        // Update round counter badge
        $('#rsa-round-count').text(line.rounds.length);
    }

    function renderRoundCard(rd) {
        var speedLabel;
        var priorityOverride = (rd.p1Priority !== undefined && rd.p2Priority !== undefined && rd.p1Priority !== rd.p2Priority);
        if (rd.speed.faster === 'tie') speedLabel = 'Speed Tie';
        else if (rd.speed.faster === 'p1') speedLabel = rd.p1.name + ' first';
        else speedLabel = rd.p2.name + ' first';
        if (priorityOverride) {
            var prioMon = rd.p1Priority > rd.p2Priority ? rd.p1.name : rd.p2.name;
            var prioVal = Math.max(rd.p1Priority, rd.p2Priority);
            speedLabel += ' (Priority +' + prioVal + ')';
        }

        var tags = '';
        if (rd.weather !== 'None')  tags += '<span class="rsa-tag rsa-weather">' + esc(rd.weather) + '</span>';
        if (rd.terrain !== 'None')  tags += '<span class="rsa-tag rsa-terrain">' + esc(rd.terrain) + '</span>';
        if (rd.trickRoom)           tags += '<span class="rsa-tag rsa-trickroom">Trick Room</span>';
        if (rd.isSwitch)            tags += '<span class="rsa-tag rsa-switch-tag">⇄ SWITCH</span>';
        if (rd.p2Crit)              tags += '<span class="rsa-tag rsa-crit-tag">P2 CRIT</span>';
        if (rd.p1PreDmg)            tags += '<span class="rsa-tag rsa-predmg-tag">P1 Pre-Dmg: -' + rd.p1PreDmg + '</span>';
        if (rd.p1PreStatus)         tags += '<span class="rsa-tag rsa-prestatus-tag">P1 Pre: ' + esc(rd.p1PreStatus) + '</span>';

        // Determine who moves first for the indicator
        var p1First = rd.speed.faster === 'p1' || rd.speed.faster === 'tie';
        var p1Indicator = p1First ? '<span class="rsa-first-badge">1st</span>' : '<span class="rsa-second-badge">2nd</span>';
        var p2Indicator = p1First ? '<span class="rsa-second-badge">2nd</span>' : '<span class="rsa-first-badge">1st</span>';

        var cmnt = rd.comment ? '<div class="rsa-comment">' + esc(rd.comment) + '</div>' : '';

        // Probability display
        var probHtml = '';
        if (rd.probability) {
            var pct = (rd.probability.total * 100);
            var probClass = pct >= 50 ? 'rsa-prob-high' : pct >= 20 ? 'rsa-prob-mid' : 'rsa-prob-low';
            var tooltip = '';
            if (rd.probability.factors && rd.probability.factors.length) {
                var parts = [];
                for (var fi = 0; fi < rd.probability.factors.length; fi++) {
                    var f = rd.probability.factors[fi];
                    parts.push(f.name + ': ' + (f.prob * 100).toFixed(1) + '%');
                }
                tooltip = parts.join('\n');
            }
            probHtml = '<span class="rsa-tag rsa-prob-tag ' + probClass + '" title="' + esc(tooltip) + '">📊 ' + pct.toFixed(1) + '%</span>';
        }

        return '<div class="rsa-round-card" data-round="' + rd.roundNum + '">' +
            '<div class="rsa-round-header">' +
                '<span class="rsa-round-num">Round ' + rd.roundNum + '</span>' +
                '<span class="rsa-speed">⚡ ' + rd.speed.p1 + ' vs ' + rd.speed.p2 + ' — ' + speedLabel + '</span>' +
                tags +
                probHtml +
                '<button class="rsa-delete-round" data-round="' + rd.roundNum + '" title="Delete round">×</button>' +
            '</div>' +
            '<div class="rsa-round-body">' +
                renderActorCard(rd.p1, 'p1', rd, p1Indicator) +
                '<div class="rsa-vs">VS</div>' +
                renderActorCard(rd.p2, 'p2', rd, p2Indicator) +
            '</div>' +
            cmnt +
        '</div>';
    }

    function renderActorCard(actor, side, rd, orderIndicator) {
        var bPct = hpPct(actor.hpBefore.current, actor.hpBefore.max);
        var aPct = hpPct(actor.hpAfter.current, actor.hpAfter.max);
        var bCol = hpColor(bPct), aCol = hpColor(aPct);
        var cls = side === 'p1' ? 'rsa-p1' : 'rsa-p2';
        var diff = actor.hpBefore.current - actor.hpAfter.current;

        // Move + damage
        var moveHtml;
        if (actor.moveIdx === 'none' || actor.moveIdx === -1) {
            moveHtml = '<div class="rsa-move-name rsa-no-move">— No Move</div>';
        } else {
            var d = actor.damage;
            var rng = d ? '<span class="rsa-dmg-range">Dmg: ' + d.minDmg + '-' + d.maxDmg + '</span>' : '';
            var crit = actor.critDamage ? '<span class="rsa-crit-info">⚔ Crit: ' + actor.critDamage.minDmg + '-' + actor.critDamage.maxDmg + '</span>' : '';

            // Move type and category sprites
            var md = actor.moveData;
            var typeSprite = md && md.type ? '<img class="rsa-type-sprite" src="' + esc(getTypeSpriteUrl(md.type)) + '" alt="' + esc(md.type) + '" title="' + esc(md.type) + '">' : '';
            var catSprite = md && md.category ? '<img class="rsa-cat-sprite" src="' + esc(getCategorySpriteUrl(md.category)) + '" alt="' + esc(md.category) + '" title="' + esc(md.category) + '">' : '';

            // Move stats line (BP / Acc / PP)
            var moveStats = '';
            if (md) {
                var statParts = [];
                if (md.basePower) statParts.push('BP: ' + md.basePower);
                if (md.accuracy === true) statParts.push('Acc: —');
                else if (md.accuracy) statParts.push('Acc: ' + md.accuracy);
                if (md.pp) statParts.push('PP: ' + md.pp);
                if (statParts.length) moveStats = '<span class="rsa-move-stats">' + statParts.join(' · ') + '</span>';
            }

            // Effects line
            var effectsHtml = '';
            if (md && md.effects) {
                var efParts = [];
                if (md.effects.primary) efParts.push('<span class="rsa-effect-primary">' + esc(md.effects.primary) + '</span>');
                if (md.effects.secondary) efParts.push('<span class="rsa-effect-secondary">' + esc(md.effects.secondary) + '</span>');
                if (efParts.length) effectsHtml = '<div class="rsa-move-effects">' + efParts.join(' ') + '</div>';
            }

            // Blocked indicator (flinch, sleep, freeze)
            var blockedHtml = '';
            if (actor.flinched) {
                var reason = actor.blockReason || 'flinch';
                var label = reason === 'sleep' ? 'ASLEEP' : reason === 'freeze' ? 'FROZEN' : 'FLINCHED';
                blockedHtml = '<span class="rsa-tag rsa-flinch-tag">' + label + '</span>';
            }

            moveHtml = '<div class="rsa-move-line">' +
                '<div class="rsa-move-name">' + typeSprite + catSprite + ' ' + esc(actor.move) + '</div>' +
                moveStats +
            '</div>' +
            effectsHtml + blockedHtml +
            '<div class="rsa-damage-inline">' + rng + crit + '</div>';
        }

        // Extra damage sources
        var extrasHtml = '';
        if (actor.extras && actor.extras.length > 0) {
            extrasHtml = '<div class="rsa-extras">';
            for (var i = 0; i < actor.extras.length; i++) {
                var ex = actor.extras[i];
                var sign = ex.damage > 0 ? '-' : '+';
                var absD = Math.abs(ex.damage);
                var exCls = ex.damage > 0 ? 'rsa-extra-dmg' : 'rsa-extra-heal';
                extrasHtml += '<span class="rsa-extra ' + exCls + '">' + esc(ex.source) + ': ' + sign + absD + '</span>';
            }
            extrasHtml += '</div>';
        }

        // EOT damage
        var eotHtml = '';
        if (actor.eot && actor.eot.length > 0) {
            eotHtml = '<div class="rsa-eot">';
            for (var i = 0; i < actor.eot.length; i++) {
                var e = actor.eot[i];
                var sign = e.damage > 0 ? '-' : '+';
                var absD = Math.abs(e.damage);
                var eCls = e.damage > 0 ? 'rsa-extra-dmg' : 'rsa-extra-heal';
                eotHtml += '<span class="rsa-extra ' + eCls + '">' + esc(e.source) + ': ' + sign + absD + '</span>';
            }
            eotHtml += '</div>';
        }

        // HP sim
        var hpSim = '';
        if (diff !== 0 || (actor.hpAfter.bestCase != null && actor.hpAfter.bestCase !== actor.hpAfter.current)) {
            var diffSign = diff > 0 ? '-' : '+';
            // Uncertainty range (striped bar)
            var bestHP = actor.hpAfter.bestCase != null ? actor.hpAfter.bestCase : actor.hpAfter.current;
            var worstHP = actor.hpAfter.current;
            var stripedBar = '';
            var rangeText = '';

            if (side === 'p1' && bestHP > worstHP) {
                // P1: bestCase >= currentHP — striped bar extends RIGHT of solid bar
                var uncertaintyPct = actor.hpAfter.max > 0 ? ((bestHP - worstHP) / actor.hpAfter.max * 100) : 0;
                stripedBar = '<div class="rsa-hp-bar rsa-hp-bar-uncertain" style="width:' +
                    Math.min(100, uncertaintyPct).toFixed(1) + '%;left:' +
                    Math.min(100, aPct).toFixed(1) + '%"></div>';
                rangeText = ' <span class="rsa-hp-range">(' + worstHP + '–' + bestHP + ')</span>';
            } else if (side === 'p2' && bestHP < worstHP) {
                // P2: bestCase <= currentHP (best for P1 = P2 has less HP)
                // Striped bar shows the portion of the solid bar that MIGHT be gone
                var bestPct = actor.hpAfter.max > 0 ? (bestHP / actor.hpAfter.max * 100) : 0;
                var uncertaintyPct = aPct - bestPct;
                stripedBar = '<div class="rsa-hp-bar rsa-hp-bar-uncertain rsa-hp-bar-uncertain-p2" style="width:' +
                    Math.min(100, uncertaintyPct).toFixed(1) + '%;left:' +
                    Math.max(0, bestPct).toFixed(1) + '%"></div>';
                rangeText = ' <span class="rsa-hp-range">(' + bestHP + '–' + worstHP + ')</span>';
            }

            hpSim = '<div class="rsa-hp-sim">' +
                '<div class="rsa-hp-bar-wrap">' +
                    '<div class="rsa-hp-bar" style="width:' + Math.max(0, Math.min(100, aPct)).toFixed(0) + '%;background:' + aCol + '"></div>' +
                    stripedBar +
                '</div>' +
                '<span class="rsa-hp-after">' + actor.hpAfter.current + '/' + actor.hpAfter.max + ' (' + aPct.toFixed(0) + '%)' +
                    (diff !== 0 ? ' <span class="rsa-hp-diff">' + diffSign + Math.abs(diff) + '</span>' : '') +
                    rangeText +
                '</span>' +
            '</div>';
        }

        // Boost tags
        var boostHtml = '';
        if (actor.boosts) {
            var statNames = { at: 'Atk', df: 'Def', sa: 'SpA', sd: 'SpD', sp: 'Spe' };
            var boostParts = [];
            for (var s in statNames) {
                if (actor.boosts[s] && actor.boosts[s] !== 0) {
                    boostParts.push(statNames[s] + (actor.boosts[s] > 0 ? '+' : '') + actor.boosts[s]);
                }
            }
            if (boostParts.length > 0) {
                boostHtml = '<span class="rsa-tag rsa-boost-tag">' + boostParts.join(' ') + '</span>';
            }
        }

        return '<div class="rsa-actor ' + cls + '">' +
            '<div class="rsa-actor-header">' +
                (actor.sprite ? '<img class="rsa-sprite" src="' + esc(actor.sprite) + '" alt="">' : '') +
                '<div class="rsa-actor-info">' +
                    '<div class="rsa-actor-name">' + esc(actor.name) + ' ' + (orderIndicator || '') + '</div>' +
                    '<div class="rsa-actor-tags">' +
                        '<span class="rsa-tag rsa-item-tag"><img class="rsa-item-sprite-sm" src="' + esc(getItemSpriteUrl(actor.item)) + '" alt="" onerror="this.style.display=\'none\'"> ' + esc(actor.item) + '</span>' +
                        '<span class="rsa-tag rsa-ability-tag">' + esc(actor.ability) + '</span>' +
                        (actor.status ? '<span class="rsa-tag rsa-status-tag rsa-status-' + actor.status.toLowerCase().replace(/\s+/g, '-') + '">' + esc(actor.status) + '</span>' : '') +
                        boostHtml +
                    '</div>' +
                    '<div class="rsa-hp-bar-wrap"><div class="rsa-hp-bar" style="width:' + bPct.toFixed(0) + '%;background:' + bCol + '"></div></div>' +
                    '<span class="rsa-hp-text">' + actor.hpBefore.current + '/' + actor.hpBefore.max + '</span>' +
                '</div>' +
            '</div>' +
            moveHtml + extrasHtml + eotHtml + hpSim +
        '</div>';
    }

    // ── Render All ───────────────────────────────────────────
    function renderAll() {
        renderLineTabs();
        renderTeamPanel('p1');
        renderTeamPanel('p2');
        renderBox('p1');
        renderRoundLog();
        updateMovePickDisplay();
        populateSwitchDropdown();
    }

    function populateSwitchDropdown() {
        var $sel = $('#rsa-switch-p1');
        var line = curLine();
        var team = line.teams.p1;
        var html = '<option value="">— Switch P1 —</option>';
        for (var i = 0; i < team.roster.length; i++) {
            if (i === team.activeIdx) continue; // can't switch to current
            if (team.roster[i].currentHP <= 0) continue; // can't switch to fainted
            html += '<option value="' + i + '">' + esc(team.roster[i].name) + '</option>';
        }
        $sel.html(html);
    }

    // ════════════════════════════════════════════════════════════
    // MOVE SELECTION — integrated with calc radio buttons
    // ════════════════════════════════════════════════════════════

    function updateMovePickDisplay() {
        // Highlight the selected move rows
        $('.move-result-subgroupL > div').removeClass('rsa-move-selected');
        if (selectedP1Move !== 'none') {
            $('.move-result-subgroupL > div').eq(selectedP1Move + 1).addClass('rsa-move-selected');
        }
        $('.move-result-subgroupR > div').removeClass('rsa-move-selected-r rsa-move-most-probable');
        if (selectedP2Move !== 'none') {
            $('.move-result-subgroupR > div').eq(selectedP2Move + 1).addClass('rsa-move-selected-r');
        }

        // Highlight most probable P2 move from AI percentages
        var maxPct = 0;
        var maxIdx = -1;
        for (var i = 1; i <= 4; i++) {
            var pctText = $('#resultMoveRateR' + i).text();
            if (pctText) {
                var pctVal = parseFloat(pctText);
                if (!isNaN(pctVal) && pctVal > maxPct) {
                    maxPct = pctVal;
                    maxIdx = i;
                }
            }
        }
        if (maxIdx > 0 && maxPct > 0) {
            $('.move-result-subgroupR > div').eq(maxIdx).addClass('rsa-move-most-probable');
        }

        // Update move info preview panels
        updateMovePreview('p1', selectedP1Move);
        updateMovePreview('p2', selectedP2Move);
    }

    function updateMovePreview(side, moveIdx) {
        var $panel = $('#rsa-move-preview-' + side);
        if (!$panel.length) return;
        if (moveIdx === 'none' || moveIdx === -1) {
            $panel.html('<span class="rsa-preview-empty">Select a move</span>');
            return;
        }
        var moveName = getMoveNames(side === 'p1' ? 0 : 1, moveIdx);
        var md = lookupMoveData(moveName);
        if (!md) {
            $panel.html('<span class="rsa-preview-name">' + esc(moveName) + '</span>');
            return;
        }
        var typeImg = md.type ? '<img class="rsa-type-sprite" src="' + esc(getTypeSpriteUrl(md.type)) + '" alt="' + esc(md.type) + '">' : '';
        var catImg = md.category ? '<img class="rsa-cat-sprite" src="' + esc(getCategorySpriteUrl(md.category)) + '" alt="' + esc(md.category) + '">' : '';
        var stats = [];
        if (md.basePower) stats.push('BP: ' + md.basePower);
        if (md.accuracy === true) stats.push('Acc: —');
        else if (md.accuracy) stats.push('Acc: ' + md.accuracy);
        if (md.pp) stats.push('PP: ' + md.pp);
        var effects = parseMoveEffects(md);
        var effHtml = '';
        if (effects) {
            if (effects.primary) effHtml += '<div class="rsa-effect-primary">' + esc(effects.primary) + '</div>';
            if (effects.secondary) effHtml += '<div class="rsa-effect-secondary">' + esc(effects.secondary) + '</div>';
        }
        $panel.html(
            '<div class="rsa-preview-header">' + typeImg + catImg + '<span class="rsa-preview-name">' + esc(md.name) + '</span></div>' +
            '<div class="rsa-preview-stats">' + stats.join(' · ') + '</div>' +
            (md.shortDesc ? '<div class="rsa-preview-desc">' + esc(md.shortDesc) + '</div>' : '') +
            effHtml
        );
    }

    // ════════════════════════════════════════════════════════════
    // EXPORT
    // ════════════════════════════════════════════════════════════

    function exportLines() {
        var out = [];
        for (var li = 0; li < lines.length; li++) {
            var line = lines[li];
            if (line.rounds.length === 0) continue;
            out.push('═══ ' + line.name + ' ═══');
            out.push('');
            for (var i = 0; i < line.rounds.length; i++) {
                var rd = line.rounds[i];
                out.push('--- Round ' + rd.roundNum + ' ---');
                var spd = rd.speed.faster === 'tie' ? 'Speed Tie' : (rd.speed.faster === 'p1' ? rd.p1.name : rd.p2.name) + ' moves first';
                out.push('Speed: ' + rd.speed.p1 + ' vs ' + rd.speed.p2 + ' (' + spd + (rd.trickRoom ? ', Trick Room' : '') + ')');
                if (rd.weather !== 'None') out.push('Weather: ' + rd.weather);
                if (rd.terrain !== 'None') out.push('Terrain: ' + rd.terrain);
                if (rd.p2Crit) out.push('** P2 CRIT **');
                out.push('');
                // P1
                out.push(rd.p1.name + ' [' + rd.p1.item + ' / ' + rd.p1.ability + ']' + (rd.p1.status ? ' {' + rd.p1.status + '}' : ''));
                out.push('  HP: ' + rd.p1.hpBefore.current + '/' + rd.p1.hpBefore.max + ' → ' + rd.p1.hpAfter.current + '/' + rd.p1.hpAfter.max);
                out.push('  Move: ' + rd.p1.move);
                if (rd.p1.damage) out.push('  Damage: ' + rd.p1.damage.minDmg + '-' + rd.p1.damage.maxDmg);
                if (rd.p1.extras) {
                    for (var j = 0; j < rd.p1.extras.length; j++) {
                        var ex = rd.p1.extras[j];
                        out.push('  ' + ex.source + ': ' + (ex.damage > 0 ? '-' : '+') + Math.abs(ex.damage));
                    }
                }
                if (rd.p1.eot) {
                    for (var j = 0; j < rd.p1.eot.length; j++) {
                        var e = rd.p1.eot[j];
                        out.push('  EOT ' + e.source + ': ' + (e.damage > 0 ? '-' : '+') + Math.abs(e.damage));
                    }
                }
                out.push('');
                // P2
                out.push(rd.p2.name + ' [' + rd.p2.item + ' / ' + rd.p2.ability + ']' + (rd.p2.status ? ' {' + rd.p2.status + '}' : ''));
                out.push('  HP: ' + rd.p2.hpBefore.current + '/' + rd.p2.hpBefore.max + ' → ' + rd.p2.hpAfter.current + '/' + rd.p2.hpAfter.max);
                out.push('  Move: ' + rd.p2.move);
                if (rd.p2.damage) out.push('  Damage: ' + rd.p2.damage.minDmg + '-' + rd.p2.damage.maxDmg);
                if (rd.p2.critDamage) out.push('  Crit Damage: ' + rd.p2.critDamage.minDmg + '-' + rd.p2.critDamage.maxDmg);
                if (rd.p2.extras) {
                    for (var j = 0; j < rd.p2.extras.length; j++) {
                        var ex = rd.p2.extras[j];
                        out.push('  ' + ex.source + ': ' + (ex.damage > 0 ? '-' : '+') + Math.abs(ex.damage));
                    }
                }
                if (rd.p2.eot) {
                    for (var j = 0; j < rd.p2.eot.length; j++) {
                        var e = rd.p2.eot[j];
                        out.push('  EOT ' + e.source + ': ' + (e.damage > 0 ? '-' : '+') + Math.abs(e.damage));
                    }
                }
                out.push('');
                if (rd.comment) out.push('Comment: ' + rd.comment);
                out.push('');
            }
            // Team summary
            out.push('Team Summary:');
            for (var s = 0; s < 2; s++) {
                var side = s === 0 ? 'p1' : 'p2';
                var team = line.teams[side];
                for (var i = 0; i < team.roster.length; i++) {
                    var pk = team.roster[i];
                    out.push('  ' + (s === 0 ? 'P1' : 'P2') + ' ' + pk.name + ': ' + pk.currentHP + '/' + pk.maxHP +
                        (pk.status ? ' [' + pk.status + ']' : ''));
                }
            }
            out.push('');
        }
        return out.length ? out.join('\n') : 'No rounds recorded.';
    }

    function calcMaxHP(pokeName, set) {
        // Use the calc engine to compute HP stat
        try {
            var species = calc.SPECIES[gen.num][pokeName];
            if (!species) return 100;
            var baseHP = species.bs.hp;
            var level = set.level || 100;
            var iv = (set.ivs && set.ivs.hp !== undefined) ? set.ivs.hp : 31;
            var ev = (set.evs && set.evs.hp !== undefined) ? set.evs.hp : 0;
            // Standard HP formula (gen 3+)
            return Math.floor((2 * baseHP + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
        } catch (e) {
            return 100;
        }
    }

    // ════════════════════════════════════════════════════════════
    // COMPACT DAMAGE BADGES
    // ════════════════════════════════════════════════════════════

    function getDmgClass(minPct, maxPct) {
        if (maxPct >= 100) return minPct >= 100 ? 'rsa-dmg-ohko' : 'rsa-dmg-high';
        if (maxPct >= 50) return 'rsa-dmg-mid';
        if (maxPct > 0) return 'rsa-dmg-low';
        return 'rsa-dmg-none';
    }

    function injectDamageBadges() {
        if (typeof damageResults === 'undefined' || !damageResults) return;

        var sides = [
            { idx: 0, prefix: 'L', subgroup: '.move-result-subgroupL' },
            { idx: 1, prefix: 'R', subgroup: '.move-result-subgroupR' }
        ];

        for (var s = 0; s < sides.length; s++) {
            var side = sides[s];
            for (var i = 0; i < 4; i++) {
                var r = damageResults[side.idx] && damageResults[side.idx][i];
                if (!r) continue;

                var label = $('#resultMove' + side.prefix + (i + 1) + ' + label');
                if (!label.length) continue;

                // Remove any existing badge
                label.next('.rsa-dmg-badge').remove();

                var rng = r.range();
                var minDmg = rng[0];
                var maxDmg = rng[1];

                if (minDmg === 0 && maxDmg === 0) continue;

                // Get defender max HP for percentage calculation
                var defHP = side.idx === 0
                    ? parseInt($('#p2 .hp .total').text()) || parseInt($('#p2 .current-hp').val()) || 1
                    : parseInt($('#p1 .hp .total').text()) || parseInt($('#p1 .current-hp').val()) || 1;

                var minPct = (minDmg / defHP * 100);
                var maxPct = (maxDmg / defHP * 100);
                var cls = getDmgClass(minPct, maxPct);

                // Possible damage amounts
                var damageArr = r.damage;
                var amounts = '';
                if (typeof damageArr === 'number') {
                    amounts = String(damageArr);
                } else if (damageArr && damageArr.length > 2) {
                    amounts = damageArr.join(', ');
                } else if (damageArr && damageArr.length === 2) {
                    if (typeof damageArr[0] === 'number') {
                        amounts = '1st: ' + damageArr[0] + ' / 2nd: ' + damageArr[1];
                    } else {
                        amounts = '1st: ' + damageArr[0].join(', ') + ' / 2nd: ' + damageArr[1].join(', ');
                    }
                }

                var badge = $('<span class="rsa-dmg-badge ' + cls + '">' +
                    minDmg + '-' + maxDmg + ' (' + minPct.toFixed(0) + '-' + maxPct.toFixed(0) + '%)' +
                    '<span class="rsa-dmg-detail">' + esc(amounts) + '</span>' +
                '</span>');

                badge.on('click', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    $(this).toggleClass('rsa-dmg-open');
                });

                label.after(badge);
            }
        }
    }

    // ════════════════════════════════════════════════════════════
    // POKEMON BOX — available pokemon with color coding
    // ════════════════════════════════════════════════════════════

    function getBoxPokemon(side) {
        var mons = [];
        if (side === 'p1') {
            $('#team-poke-list img.trainer-pok, #box-poke-list img.trainer-pok').each(function () {
                var setId = $(this).data('id');
                if (!setId) return;
                var name = String(setId).split(' (')[0];
                mons.push({ name: name, setId: setId, sprite: getSprite(name) });
            });
        } else {
            // P2: current loaded + opposing trainer list
            var p2Name = getP2Name();
            var p2SetId = getSetId('p2');
            if (p2Name) {
                mons.push({ name: p2Name, setId: p2SetId, sprite: getSprite(p2Name) });
            }
            $('.trainer-pok-list-opposing img.trainer-pok').each(function () {
                var setId = $(this).data('id');
                if (!setId) return;
                var name = String(setId).split(' (')[0];
                // Skip duplicates
                for (var j = 0; j < mons.length; j++) {
                    if (mons[j].name === name) return;
                }
                mons.push({ name: name, setId: setId, sprite: getSprite(name) });
            });
        }
        return mons;
    }

    function getColorCode(setId) {
        // Reuse the existing calculationsColors function from index_randoms_controls
        // Save and restore damageResults since calculationsColors overwrites it
        if (typeof calculationsColors === 'function') {
            var savedResults = (typeof damageResults !== 'undefined') ? damageResults : null;
            try {
                var result = calculationsColors(setId);
                damageResults = savedResults;
                return result;
            } catch (e) {
                damageResults = savedResults;
            }
        }
        return { speed: '', code: '' };
    }

    function renderBox(side) {
        var mons = getBoxPokemon(side);
        var $box = $('#rsa-box-' + side);
        if (!$box.length) return;

        var line = curLine();
        var team = line.teams[side];
        var teamNames = {};
        for (var i = 0; i < team.roster.length; i++) {
            teamNames[team.roster[i].name] = true;
        }

        var html = '';
        for (var i = 0; i < mons.length; i++) {
            var m = mons[i];
            var inTeam = teamNames[m.name] ? ' rsa-in-team' : '';

            // Color coding — only for P1 box (their matchup vs current P2)
            var ccClass = '';
            if (side === 'p1' && m.setId) {
                var cc = getColorCode(m.setId);
                if (cc.speed) ccClass += ' rsa-speed-' + cc.speed;
                if (cc.code) ccClass += ' rsa-dmg-' + cc.code;
            }

            html += '<div class="rsa-box-slot' + inTeam + ccClass + '" draggable="true" data-side="' + side + '" data-set-id="' + esc(m.setId) + '" data-name="' + esc(m.name) + '">' +
                '<img class="rsa-box-sprite" src="' + esc(m.sprite) + '" alt="' + esc(m.name) + '">' +
                '<span class="rsa-box-name">' + esc(m.name) + '</span>' +
            '</div>';
        }
        $box.html(html);
        $('#rsa-box-count-' + side).text(mons.length);
    }

    // ════════════════════════════════════════════════════════════
    // EVENT BINDING
    // ════════════════════════════════════════════════════════════

    $(document).ready(function () {
        renderAll();

        // ── Move the move-result-group into the controls area ──
        var moveGroup = document.querySelector('.move-result-group');
        var movesArea = document.getElementById('rsa-moves-area');
        if (moveGroup && movesArea) {
            movesArea.appendChild(moveGroup);
        }

        // ── Sync boosts from roster to calc form ──
        var stats = ['at', 'df', 'sa', 'sd', 'sp'];
        var sides = ['p1', 'p2'];

        // ── Move selection tracking ──
        $(document).on('change', 'input[id^="resultMoveL"]', function () {
            var id = this.id;
            var idx = parseInt(id.replace('resultMoveL', '')) - 1;
            selectedP1Move = idx;
            updateMovePickDisplay();
        });
        $(document).on('change', 'input[id^="resultMoveR"]', function () {
            var id = this.id;
            var idx = parseInt(id.replace('resultMoveR', '')) - 1;
            selectedP2Move = idx;
            updateMovePickDisplay();
        });

        // Update move display when calc recalculates
        $(document).on('change', '.calc-trigger', function () {
            setTimeout(function () {
                updateMovePickDisplay();
                // Render box first (uses calculationsColors which temporarily overwrites damageResults)
                // then inject damage badges using the correct damageResults
                renderBox('p1');
                injectDamageBadges();
            }, 200);
        });

        // ── Auto-refresh P1 box when calc's team/box DOM changes ──
        var boxContainers = ['team-poke-list', 'box-poke-list'];
        for (var i = 0; i < boxContainers.length; i++) {
            var el = document.getElementById(boxContainers[i]);
            if (el) {
                new MutationObserver(function () { renderBox('p1'); }).observe(el, { childList: true, subtree: true });
            }
        }

        var oppList = document.querySelector('.trainer-pok-list-opposing');
        if (oppList) {
            new MutationObserver(function () { syncP2Team(); }).observe(oppList, { childList: true, subtree: true });
        }

        $(document).on('change', '#p2 .set-selector', function () {
            setTimeout(syncP2Team, 300);
        });

        // ── Intercept trainer switch (next/previous) to offer saving the line ──
        $(document).on('click', '#next-trainer, #previous-trainer', function (e) {
            var line = curLine();
            if (line.rounds.length > 0) {
                var save = confirm(
                    'You have ' + line.rounds.length + ' round(s) logged in "' + line.name + '".\n\n' +
                    'OK = Save this line and start a new one\n' +
                    'Cancel = Discard rounds and load next opponent'
                );
                if (save) {
                    // Keep current line, create a new one for the next trainer
                    lines.push(createLine('Line ' + String.fromCharCode(65 + lines.length)));
                    currentLineIdx = lines.length - 1;
                } else {
                    // Discard: clear current line's rounds and reset teams
                    line.rounds = [];
                    line.roundCounter = 0;
                    line.teams = {
                        p1: { roster: [], activeIdx: -1 },
                        p2: { roster: [], activeIdx: -1 }
                    };
                }
                renderAll();
                // Re-init P1 team after the form loads the new trainer
                setTimeout(function () {
                    initP1Team();
                    syncP2Team();
                }, 500);
            }
        });

        // Initial sync after calc loads
        setTimeout(function () {
            initP1Team();
            syncP2Team();
            syncBoostsToCalc();
        }, 2000);

        // ── Line management ──
        $('#rsa-add-line').on('click', function () {
            var name = prompt('Name for new line:', 'Line ' + String.fromCharCode(65 + lines.length));
            if (!name) return;
            lines.push(createLine(name));
            currentLineIdx = lines.length - 1;
            renderAll();
        });

        $('#rsa-delete-line').on('click', function () {
            if (lines.length <= 1) { alert('Cannot delete the only line.'); return; }
            if (!confirm('Delete "' + curLine().name + '" and all its rounds?')) return;
            lines.splice(currentLineIdx, 1);
            currentLineIdx = Math.min(currentLineIdx, lines.length - 1);
            renderAll();
        });

        $('#rsa-line-tabs').on('click', '.rsa-tab', function () {
            var idx = ~~$(this).data('line-idx');
            if (idx === currentLineIdx) return;

            // Save current form to roster before switching
            saveFormToRoster('p1');
            saveFormToRoster('p2');

            currentLineIdx = idx;
            renderAll();

            // Load active pokemon from new line into forms
            var line = curLine();
            var p1Active = getActiveEntry(line.teams.p1);
            var p2Active = getActiveEntry(line.teams.p2);
            if (p1Active) loadPokemonIntoForm('p1', p1Active);
            if (p2Active) loadPokemonIntoForm('p2', p2Active);
        });

        // ── Team management (click to switch active, click × to remove) ──
        $(document).on('click', '.rsa-team-remove', function (e) {
            e.stopPropagation();
            var side = $(this).data('side');
            var idx = ~~$(this).data('idx');
            removeFromTeam(side, idx);
            renderBox(side);
        });

        $(document).on('click', '.rsa-team-slot', function (e) {
            if ($(e.target).hasClass('rsa-team-remove')) return;
            var side = $(this).data('side');
            var idx = ~~$(this).data('idx');
            switchActive(side, idx);
        });

        // ── Log round ──
        $('#rsa-log-round').on('click', function () {
            var p1MoveIdx = selectedP1Move;
            var p2MoveIdx = selectedP2Move;
            var p2Crit = $('#rsa-p2-crit').is(':checked');
            var p1PreDmg = parseInt($('#rsa-p1-predmg').val()) || 0;
            var p1PreStatus = $('#rsa-p1-prestatus').val();
            var comment = $('#rsa-comment').val().trim();
            var p1ApplySec = $('#rsa-p1-apply-secondary').is(':checked');
            var p2ApplySec = $('#rsa-p2-apply-secondary').is(':checked');

            var rd = captureRound(p1MoveIdx, p2MoveIdx, p2Crit, p1PreDmg, p1PreStatus, comment, p1ApplySec, p2ApplySec);
            if (!rd) return;

            curLine().rounds.push(rd);
            renderAll();

            // Reset controls (keep P2 crit and P2 effect persistent across rounds)
            $('#rsa-comment').val('');
            $('#rsa-p1-predmg').val(0);
            $('#rsa-p1-prestatus').val('');
            $('#rsa-p1-apply-secondary').prop('checked', false);
        });

        // ── Switch P1 in (takes the P2 move) ──
        $('#rsa-do-switch').on('click', function () {
            var switchIdx = parseInt($('#rsa-switch-p1').val());
            if (isNaN(switchIdx)) {
                alert('Select a Pokémon to switch in.');
                return;
            }
            var line = curLine();
            var p2MoveIdx = selectedP2Move;
            var p2Crit = $('#rsa-p2-crit').is(':checked');
            var p2ApplySec = $('#rsa-p2-apply-secondary').is(':checked');
            var comment = $('#rsa-comment').val().trim();
            var switchName = line.teams.p1.roster[switchIdx].name;

            // Perform the switch (resets outgoing boosts, loads new mon into form)
            switchActive('p1', switchIdx);

            // Wait for the calc engine to recalculate with the new P1 pokemon
            setTimeout(function () {
                var rd = captureRound('none', p2MoveIdx, p2Crit, 0, '',
                    comment ? comment : 'Switch in: ' + switchName, false, p2ApplySec);
                if (!rd) return;
                rd.isSwitch = true;

                line.rounds.push(rd);
                renderAll();

                $('#rsa-comment').val('');
                $('#rsa-switch-p1').val('');
            }, 600);
        });

        // ── Delete round ──
        $(document).on('click', '.rsa-delete-round', function (e) {
            e.stopPropagation();
            var num = ~~$(this).data('round');
            var line = curLine();
            line.rounds = line.rounds.filter(function (r) { return r.roundNum !== num; });
            rebuildLineTeams(line);
            renderAll();
        });

        // ── Clear line ──
        $('#rsa-clear-line').on('click', function () {
            var line = curLine();
            if (line.rounds.length === 0) return;
            if (!confirm('Clear all rounds in "' + line.name + '"?')) return;
            line.rounds = [];
            line.roundCounter = 0;
            rebuildLineTeams(line);
            renderAll();
        });

        // ── Import panel toggle ──
        $('#rsa-import-toggle').on('click', function () {
            $('#rsa-import-panel').toggle();
        });
        $('#rsa-import-cancel').on('click', function () {
            $('#rsa-import-panel').hide();
        });
        $('#rsa-import-go').on('click', function () {
            var text = $('#rsa-import-text').val().trim();
            if (!text) return;
            var name = $('#rsa-import-name').val().trim() || 'Custom Set';
            addSets(text, name);
            $('#rsa-import-text').val('');
            $('#rsa-import-panel').hide();
            // Re-render box after import so new mons appear
            setTimeout(function () { renderBox('p1'); }, 400);
        });

        // ── Trainer nav buttons ──
        $('#rsa-prev-trainer').on('click', function () {
            $('#previous-trainer').trigger('click');
        });
        $('#rsa-next-trainer').on('click', function () {
            $('#next-trainer').trigger('click');
        });
        $('#rsa-reset-trainer').on('click', function () {
            var line = curLine();
            line.teams.p2 = { roster: [], activeIdx: -1 };
            syncP2Team();
            renderAll();
        });

        // ── Export ──
        $('#rsa-export').on('click', function () {
            var text = exportLines();
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(function () {
                    alert('Log copied to clipboard!');
                });
            } else {
                prompt('Copy this log:', text);
            }
        });

        // ── Drag & Drop from box to team ──
        $(document).on('dragstart', '.rsa-box-slot', function (e) {
            if ($(this).hasClass('rsa-in-team')) {
                e.preventDefault();
                return;
            }
            $(this).addClass('dragging');
            e.originalEvent.dataTransfer.setData('text/plain', JSON.stringify({
                side: $(this).data('side'),
                setId: $(this).data('set-id'),
                name: $(this).data('name')
            }));
            e.originalEvent.dataTransfer.effectAllowed = 'copy';
        });

        $(document).on('dragend', '.rsa-box-slot', function () {
            $(this).removeClass('dragging');
            $('.rsa-team-drop').removeClass('rsa-drag-over');
        });

        $(document).on('dragover', '.rsa-team-drop', function (e) {
            e.preventDefault();
            e.originalEvent.dataTransfer.dropEffect = 'copy';
            $(this).addClass('rsa-drag-over');
        });

        $(document).on('dragleave', '.rsa-team-drop', function () {
            $(this).removeClass('rsa-drag-over');
        });

        $(document).on('drop', '.rsa-team-drop', function (e) {
            e.preventDefault();
            $(this).removeClass('rsa-drag-over');
            try {
                var data = JSON.parse(e.originalEvent.dataTransfer.getData('text/plain'));
                if (!data || !data.setId) return;
                var side = 'p1'; // Only P1 team is droppable
                var line = curLine();
                var team = line.teams[side];

                // Don't add duplicates
                for (var i = 0; i < team.roster.length; i++) {
                    if (team.roster[i].name === data.name) return;
                }
                if (team.roster.length >= MAX_TEAM_SIZE) return;

                var set = lookupSet(data.setId);
                var maxHP = set ? calcMaxHP(data.name, set) : 100;
                var entry = createRosterEntry(
                    data.name, data.setId,
                    getSprite(data.name),
                    set ? (set.item || '') : '',
                    set ? (set.ability || '') : '',
                    set ? (set.moves || []) : [],
                    maxHP, []
                );
                team.roster.push(entry);
                if (team.activeIdx < 0) team.activeIdx = 0;
                renderTeamPanel(side);
                renderBox(side);
            } catch (ex) { /* ignore bad data */ }
        });

        // Click box slot to add to P1 team (alternative to drag)
        $(document).on('click', '.rsa-box-slot', function () {
            if ($(this).hasClass('rsa-in-team')) return;
            var setId = $(this).data('set-id');
            var name = $(this).data('name');

            var line = curLine();
            var team = line.teams.p1;
            for (var i = 0; i < team.roster.length; i++) {
                if (team.roster[i].name === name) return;
            }
            if (team.roster.length >= MAX_TEAM_SIZE) return;
            var set = lookupSet(setId);
            var maxHP = set ? calcMaxHP(name, set) : 100;
            var entry = createRosterEntry(
                name, setId,
                getSprite(name),
                set ? (set.item || '') : '',
                set ? (set.ability || '') : '',
                set ? (set.moves || []) : [],
                maxHP, []
            );
            team.roster.push(entry);
            if (team.activeIdx < 0) team.activeIdx = 0;
            renderTeamPanel('p1');
            renderBox('p1');
        });

        // ── Inject initial damage badges after calc loads ──
        setTimeout(function () {
            renderBox('p1');
            injectDamageBadges();
        }, 2500);
    });

})();
