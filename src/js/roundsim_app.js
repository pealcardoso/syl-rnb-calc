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

    function getItemDesc(itemName) {
        var d = lookupItemData(itemName);
        return d ? (d.shortDesc || d.desc || '') : '';
    }

    function getAbilityDesc(abilityName) {
        if (!abilityName || !window.BattleAbilities) return '';
        var key = abilityName.toLowerCase().replace(/[\s\-\']+/g, '');
        var d = window.BattleAbilities[key];
        return d ? (d.shortDesc || d.desc || '') : '';
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

    // ════════════════════════════════════════════════════════════
    // TYPE EFFECTIVENESS ENGINE (ability-aware)
    // ════════════════════════════════════════════════════════════

    var ALL_TYPES = ['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison',
                     'Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'];

    /** Ability-based full type immunities: abilityKey → immuneType */
    var ABILITY_IMMUNITIES = {
        levitate: 'Ground', flashfire: 'Fire',
        lightningrod: 'Electric', voltabsorb: 'Electric', motordrive: 'Electric',
        waterabsorb: 'Water', stormdrain: 'Water', dryskin: 'Water',
        sapsipper: 'Grass', eartheater: 'Ground', wellbakedbody: 'Fire'
    };

    /** Get the defensive type multiplier for a single attacking type vs this pokemon.
     *  Takes into account dual typing and ability immunities. */
    function getTypeMultiplier(atkType, defTypes, abilityName) {
        var chart;
        try { chart = calc.TYPE_CHART[gen || 9]; } catch(e) {}
        if (!chart || !chart[atkType]) return 1;
        var mult = 1;
        for (var i = 0; i < defTypes.length; i++) {
            var x = chart[atkType][defTypes[i]];
            if (typeof x === 'number') mult *= x;
        }
        // Check ability immunity
        if (abilityName) {
            var key = abilityName.toLowerCase().replace(/[\s\-\']+/g, '');
            if (ABILITY_IMMUNITIES[key] && ABILITY_IMMUNITIES[key] === atkType) mult = 0;
            // Dry Skin: Fire attacks do 1.25x damage
            if (key === 'dryskin' && atkType === 'Fire') mult *= 1.25;
            // Wonder Guard: only super-effective moves hit
            if (key === 'wonderguard' && mult <= 1) mult = 0;
        }
        return mult;
    }

    /** Get full defensive profile: { type: multiplier } for all 18 types */
    function getDefensiveProfile(types, abilityName) {
        var profile = {};
        for (var i = 0; i < ALL_TYPES.length; i++) {
            profile[ALL_TYPES[i]] = getTypeMultiplier(ALL_TYPES[i], types, abilityName);
        }
        return profile;
    }

    /** Lookup pokemon types and ability from species name + setId */
    function getMonTypeInfo(name, setId) {
        var types = [];
        var ability = '';
        // Try calc.SPECIES first
        try {
            var species = calc.SPECIES[gen || 9][name];
            if (species && species.types) types = species.types.slice();
        } catch (e) {}
        // Fallback to BattlePokedex
        if (types.length === 0 && window.BattlePokedex) {
            var key = name.toLowerCase().replace(/[\s\-\']+/g, '');
            var pd = window.BattlePokedex[key];
            if (pd && pd.types) types = pd.types.slice();
        }
        // Get ability from set
        if (setId) {
            var set = lookupSet(setId);
            if (set && set.ability) ability = set.ability;
        }
        if (!ability && window.BattlePokedex) {
            var key = name.toLowerCase().replace(/[\s\-\']+/g, '');
            var pd = window.BattlePokedex[key];
            if (pd && pd.abilities) ability = pd.abilities['0'] || '';
        }
        return { types: types, ability: ability };
    }

    /** Build tooltip text for defensive profile */
    function buildDefTooltip(name, types, ability) {
        var profile = getDefensiveProfile(types, ability);
        var immunes = [], quad = [], resists = [], weak = [], quadWeak = [];
        for (var t in profile) {
            var m = profile[t];
            if (m === 0) immunes.push(t);
            else if (m <= 0.25) quad.push(t);
            else if (m < 1 && m > 0.25) resists.push(t);
            else if (m >= 4) quadWeak.push(t);
            else if (m > 1 && m < 4) weak.push(t);
        }
        var lines = [];
        if (immunes.length) lines.push('Immune: ' + immunes.join(', '));
        if (quad.length) lines.push('¼× Resist: ' + quad.join(', '));
        if (resists.length) lines.push('½× Resist: ' + resists.join(', '));
        if (quadWeak.length) lines.push('4× Weak: ' + quadWeak.join(', '));
        if (weak.length) lines.push('2× Weak: ' + weak.join(', '));
        if (ability) lines.push('Ability: ' + ability);
        return name + ' (' + types.join('/') + ')\n' + lines.join('\n');
    }

    // ════════════════════════════════════════════════════════════
    // BOX RANKING ENGINE
    // ════════════════════════════════════════════════════════════

    /** Compute offensive (P1→P2) and defensive (P2→P1) damage for each box mon.
     *  Returns array of { name, setId, offMax, defMax } sorted for ranking. */
    function computeBoxRankings() {
        var mons = getBoxPokemon('p1');
        if (!mons.length) return [];
        var p2Info = $('#p2');
        if (!p2Info.length) return [];

        // Use the currently selected P2 move index (0-3), or -1 for none
        var p2MoveIdx = (selectedP2Move !== 'none') ? selectedP2Move : -1;

        var rankings = [];
        for (var i = 0; i < mons.length; i++) {
            var m = mons[i];
            var offMax = 0, defDmg = null, defAllMax = null, speed = 0, isImmune = false, isImmuneAll = false;
            try {
                var p1 = createPokemon(m.setId);
                var p2 = createPokemon(p2Info);
                var p1field = createField();
                var p2field = p1field.clone().swap();
                var results = calculateAllMoves(gen, p1, p1field, p2, p2field);

                var p1hp = results[0][0].attacker.stats.hp;
                var p2hp = results[1][0].attacker.stats.hp;
                speed = p1.stats ? p1.stats.spe : 0;

                // Offensive rank: best of all P1 moves vs P2
                for (var j = 0; j < 4; j++) {
                    var r0 = results[0][j];
                    var dmg0 = Array.isArray(r0.damage) ? r0.damage[r0.damage.length - 1] : r0.damage;
                    var hits0 = p1.moves[j] ? (p1.moves[j].hits || 1) : 1;
                    var pct0 = dmg0 * hits0 / p2hp * 100;
                    if (pct0 > offMax) offMax = pct0;
                }

                // Defensive rank (selected move): only the selected P2 move
                if (p2MoveIdx >= 0 && results[1][p2MoveIdx]) {
                    var r1 = results[1][p2MoveIdx];
                    var dmg1 = Array.isArray(r1.damage) ? r1.damage[r1.damage.length - 1] : r1.damage;
                    var hits1 = p2.moves[p2MoveIdx] ? (p2.moves[p2MoveIdx].hits || 1) : 1;
                    var pct1 = dmg1 * hits1 / p1hp * 100;
                    if (pct1 > 0) defDmg = pct1;
                    else isImmune = true; // 0 damage = immune
                }

                // Defensive rank (all moves): worst P2 move (highest damage)
                var allMovesMax = 0;
                var anyDamageAll = false;
                for (var j = 0; j < 4; j++) {
                    var ra = results[1][j];
                    var dmga = Array.isArray(ra.damage) ? ra.damage[ra.damage.length - 1] : ra.damage;
                    var hitsa = p2.moves[j] ? (p2.moves[j].hits || 1) : 1;
                    var pcta = dmga * hitsa / p1hp * 100;
                    if (pcta > allMovesMax) allMovesMax = pcta;
                    if (pcta > 0) anyDamageAll = true;
                }
                if (anyDamageAll) defAllMax = allMovesMax;
                else isImmuneAll = true; // immune to all P2 moves
            } catch (e) { /* skip mons that fail to create */ }
            rankings.push({ name: m.name, setId: m.setId, offMax: offMax, defDmg: defDmg, defAllMax: defAllMax, speed: speed, isImmune: isImmune, isImmuneAll: isImmuneAll });
        }

        // Offensive rank: highest offMax = rank 1
        var offSorted = rankings.slice().sort(function(a, b) { return b.offMax - a.offMax; });
        for (var i = 0; i < offSorted.length; i++) {
            for (var k = 0; k < rankings.length; k++) {
                if (rankings[k].name === offSorted[i].name && rankings[k].setId === offSorted[i].setId) {
                    rankings[k].offRank = i + 1; break;
                }
            }
        }

        // Defensive rank (selected move): lowest defDmg = rank 1; immune mons = rank 0
        for (var k = 0; k < rankings.length; k++) {
            if (rankings[k].isImmune) rankings[k].defRank = 0;
        }
        var defRankable = rankings.filter(function(r) { return r.defDmg !== null; });
        defRankable.sort(function(a, b) { return a.defDmg - b.defDmg; });
        for (var i = 0; i < defRankable.length; i++) {
            for (var k = 0; k < rankings.length; k++) {
                if (rankings[k].name === defRankable[i].name && rankings[k].setId === defRankable[i].setId) {
                    rankings[k].defRank = i + 1; break;
                }
            }
        }

        // Defensive rank (all moves): lowest defAllMax = rank 1; immune to all = rank 0
        for (var k = 0; k < rankings.length; k++) {
            if (rankings[k].isImmuneAll) rankings[k].defAllRank = 0;
        }
        var defAllRankable = rankings.filter(function(r) { return r.defAllMax !== null; });
        defAllRankable.sort(function(a, b) { return a.defAllMax - b.defAllMax; });
        for (var i = 0; i < defAllRankable.length; i++) {
            for (var k = 0; k < rankings.length; k++) {
                if (rankings[k].name === defAllRankable[i].name && rankings[k].setId === defAllRankable[i].setId) {
                    rankings[k].defAllRank = i + 1; break;
                }
            }
        }

        return rankings;
    }

    var cachedRankings = [];
    var boxSortMode = 'default'; // 'default', 'offense', 'defense', 'defenseAll'

    // ════════════════════════════════════════════════════════════
    // AI SWITCH-IN PREDICTION ENGINE
    // ════════════════════════════════════════════════════════════

    /**
     * Compute the AI switch-in score for one AI pokemon vs the player's pokemon.
     * p1calc = calc.Pokemon for the player's mon (with current HP/boosts)
     * p2calc = calc.Pokemon for the AI candidate (fresh, full HP)
     * returns { score, reason }
     */
    function computeSwitchScore(p1calc, p2calc) {
        try {
            var field = createField();
            var fieldSwap = field.clone().swap();
            // AI candidate attacks player
            var aiMoves = [];
            for (var i = 0; i < 4; i++) {
                aiMoves.push(calc.calculate(gen, p2calc, p1calc, p2calc.moves[i], fieldSwap));
            }
            // Player attacks AI candidate
            var plMoves = [];
            for (var i = 0; i < 4; i++) {
                plMoves.push(calc.calculate(gen, p1calc, p2calc, p1calc.moves[i], field));
            }

            var p1hp = p1calc.curHP();
            var p2hp = p2calc.curHP();
            if (!p1hp) p1hp = p1calc.stats ? p1calc.stats.hp : 100;
            if (!p2hp) p2hp = p2calc.stats ? p2calc.stats.hp : 100;

            // Best damage AI deals to player (% of player HP)
            var bestAiPct = 0;
            for (var i = 0; i < aiMoves.length; i++) {
                var d = aiMoves[i].damage;
                var maxD = Array.isArray(d) ? d[d.length - 1] : d;
                var hits = p2calc.moves[i] ? (p2calc.moves[i].hits || 1) : 1;
                var pct = maxD * hits / p1hp * 100;
                if (pct > bestAiPct) bestAiPct = pct;
            }

            // Best damage player deals to AI candidate (% of AI HP)
            var bestPlPct = 0;
            for (var i = 0; i < plMoves.length; i++) {
                var d = plMoves[i].damage;
                var maxD = Array.isArray(d) ? d[d.length - 1] : d;
                var hits = p1calc.moves[i] ? (p1calc.moves[i].hits || 1) : 1;
                var pct = maxD * hits / p2hp * 100;
                if (pct > bestPlPct) bestPlPct = pct;
            }

            var aiOHKO = bestAiPct >= 100;
            var plOHKO = bestPlPct >= 100;

            // Speed comparison
            var p1spd = p1calc.stats ? p1calc.stats.spe : 0;
            var p2spd = p2calc.stats ? p2calc.stats.spe : 0;
            var tr = $('#trickroom').is(':checked');
            var aiFaster = tr ? (p2spd < p1spd) : (p2spd > p1spd);
            // tie goes to... neither is faster per the logic table (+1 for faster, 0 for default)
            if (p1spd === p2spd) aiFaster = false;
            var aiSlower = !aiFaster && p1spd !== p2spd;

            // Special cases
            var aiName = (p2calc.name || '').toLowerCase();
            if (aiName === 'ditto') return { score: 2, reason: 'Ditto' };
            if (aiName === 'wynaut' || aiName === 'wobbuffet') {
                if (aiSlower && plOHKO) return { score: 0, reason: 'Default' };
                return { score: 2, reason: aiName.charAt(0).toUpperCase() + aiName.slice(1) };
            }

            // Main scoring table
            if (aiFaster && aiOHKO) return { score: 5, reason: 'Faster + OHKO' };
            if (aiSlower && aiOHKO && !plOHKO) return { score: 4, reason: 'OHKO + survives' };
            if (aiFaster && bestAiPct > bestPlPct) return { score: 3, reason: 'Faster + better trade' };
            if (aiSlower && bestAiPct > bestPlPct) return { score: 2, reason: 'Better trade' };
            if (aiFaster) return { score: 1, reason: 'Faster' };
            if (aiSlower && plOHKO) return { score: -1, reason: 'Slower + OHKO\'d' };
            return { score: 0, reason: 'Default' };
        } catch (e) {
            return { score: 0, reason: 'Error' };
        }
    }

    /**
     * Predict which P2 mon will switch in against a given P1 pokemon.
     * p1SetIdOrCalc = setId string for full-HP box mode, or '$p1' for live form
     * Returns { name, sprite, score, reason, scores[] } or null
     */
    function predictSwitchIn(p1SetIdOrCalc) {
        var line = curLine();
        var team = line.teams.p2;
        if (team.roster.length < 2) return null;

        // Build P1 calc pokemon
        var p1;
        try {
            if (p1SetIdOrCalc === '$p1') {
                p1 = createPokemon($('#p1'));
            } else {
                p1 = createPokemon(p1SetIdOrCalc);
            }
        } catch (e) { return null; }

        var activeP2 = getActiveEntry(team);
        var candidates = [];

        for (var i = 0; i < team.roster.length; i++) {
            var e = team.roster[i];
            // Skip active P2 and fainted mons
            if (activeP2 && e.name === activeP2.name) continue;
            if (e.currentHP <= 0) continue;

            var p2;
            try { p2 = createPokemon(e.setId); } catch (ex) { continue; }

            var result = computeSwitchScore(p1, p2);
            candidates.push({
                name: e.name,
                sprite: e.sprite || getSprite(e.name),
                score: result.score,
                reason: result.reason,
                partyIdx: i
            });
        }

        if (candidates.length === 0) return null;

        // Ties go to first in party order (stable sort — keep original order)
        var best = candidates[0];
        for (var i = 1; i < candidates.length; i++) {
            if (candidates[i].score > best.score) best = candidates[i];
        }

        return { name: best.name, sprite: best.sprite, score: best.score,
                 reason: best.reason, scores: candidates };
    }

    /** Cached switch-in prediction for current live state */
    var cachedSwitchPred = null;
    var boxDeleteMode = false;
    var boxExcluded = [];
    try { boxExcluded = JSON.parse(localStorage.getItem('rsa-box-excluded') || '[]'); } catch (ex) {}

    var _itemOptionsHtml = null;
    function getItemOptionsHtml() {
        if (_itemOptionsHtml) return _itemOptionsHtml;
        var items = window.BattleItems || {};
        var names = [];
        for (var k in items) {
            if (items[k] && items[k].name) names.push(items[k].name);
        }
        names.sort();
        var parts = ['<option value="">(no item)</option>'];
        for (var ii = 0; ii < names.length; ii++) {
            parts.push('<option value="' + esc(names[ii]) + '">' + esc(names[ii]) + '</option>');
        }
        // Only cache once BattleItems is actually loaded (has >1 item)
        if (names.length > 1) _itemOptionsHtml = parts.join('');
        return parts.join('');
    }

    // ════════════════════════════════════════════════════════════
    // TYPE COVERAGE ANALYSIS
    // ════════════════════════════════════════════════════════════

    function buildCoverageAnalysis() {
        var mons = getBoxPokemon('p1');
        if (!mons.length) return null;

        // For each type, count how many mons have each multiplier bracket
        var coverage = {};
        var monProfiles = [];
        for (var t = 0; t < ALL_TYPES.length; t++) {
            coverage[ALL_TYPES[t]] = { immune: [], quad_resist: [], resist: [], neutral: [], weak: [], quad_weak: [] };
        }

        for (var i = 0; i < mons.length; i++) {
            var info = getMonTypeInfo(mons[i].name, mons[i].setId);
            var profile = getDefensiveProfile(info.types, info.ability);
            monProfiles.push({ name: mons[i].name, types: info.types, ability: info.ability, profile: profile });

            for (var t = 0; t < ALL_TYPES.length; t++) {
                var type = ALL_TYPES[t];
                var m = profile[type];
                if (m === 0) coverage[type].immune.push(mons[i].name);
                else if (m <= 0.25) coverage[type].quad_resist.push(mons[i].name);
                else if (m < 1) coverage[type].resist.push(mons[i].name);
                else if (m === 1) coverage[type].neutral.push(mons[i].name);
                else if (m >= 4) coverage[type].quad_weak.push(mons[i].name);
                else coverage[type].weak.push(mons[i].name);
            }
        }

        // For each type, who's the best physical/special wall?
        // Use actual damage calc if we have a P2, otherwise use type mult as proxy
        var bestWalls = {};
        for (var t = 0; t < ALL_TYPES.length; t++) {
            var type = ALL_TYPES[t];
            var bestPhys = null, bestSpec = null;
            var bestPhysMult = 999, bestSpecMult = 999;
            for (var i = 0; i < monProfiles.length; i++) {
                var mp = monProfiles[i];
                var mult = mp.profile[type];
                // Physical: prefer lower mult AND higher Def
                var def = 0, spd = 0;
                try {
                    var species = calc.SPECIES[gen || 9][mp.name];
                    if (species) { def = species.bs.df || 0; spd = species.bs.sd || 0; }
                } catch (e) {}
                // Score = mult * 1000 - def (lower is better for physical)
                var physScore = mult * 1000 - def;
                var specScore = mult * 1000 - spd;
                if (physScore < bestPhysMult) { bestPhysMult = physScore; bestPhys = mp.name; }
                if (specScore < bestSpecMult) { bestSpecMult = specScore; bestSpec = mp.name; }
            }
            bestWalls[type] = { physical: bestPhys, special: bestSpec };
        }

        return { coverage: coverage, bestWalls: bestWalls, monProfiles: monProfiles };
    }

    /** Parse secondary effects from BattleMovedex entry */
    function parseMoveEffects(moveData) {
        if (!moveData) return null;
        var effects = { primary: null, secondary: null };

        // Primary effects (non-secondary, inherent to the move)
        var primaryParts = [];
        if (moveData.priority && moveData.priority !== 0) {
            var prioSign = moveData.priority > 0 ? '+' : '';
            primaryParts.push('Priority ' + prioSign + moveData.priority);
        }
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

    // Battle format: 'singles' | 'doubles-1t' | 'doubles-2t'
    var battleFormat = 'singles';

    function isDoubles() { return battleFormat === 'doubles-1t' || battleFormat === 'doubles-2t'; }

    function createLine(name) {
        return {
            id: Date.now() + Math.random(),
            name: name,
            rounds: [],
            roundCounter: 0,
            teams: {
                p1: { roster: [], activeIdx: -1, activeIdxB: -1 },
                p2: { roster: [], activeIdx: -1, activeIdxB: -1 }
            },
            fieldState: {},  // track field conditions per line
            teamSplit: null  // for doubles-2t: { left: number } — first N mons are left team
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
            initialItem: item,  // preserved for round-deletion rebuild (consumed items are restored)
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

    /** Get the second active entry (B slot) for doubles */
    function getActiveEntryB(team) {
        if (team.activeIdxB >= 0 && team.activeIdxB < team.roster.length) {
            return team.roster[team.activeIdxB];
        }
        return null;
    }

    /** Get both active entries as { a: entry, b: entry } for doubles, or { a: entry, b: null } for singles */
    function getActiveEntries(team) {
        return {
            a: getActiveEntry(team),
            b: isDoubles() ? getActiveEntryB(team) : null
        };
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
    // DOUBLES — DAMAGE CALCULATION ENGINE
    // ════════════════════════════════════════════════════════════

    /** Calculate damage for a specific attacker entry → defender entry using a named move.
     *  Uses the calc engine directly (no form needed). Returns { minDmg, maxDmg, move } or null. */
    function calcDamageDirect(atkEntry, defEntry, moveName) {
        if (!atkEntry || !defEntry || !moveName || moveName === '(No Move)') return null;
        try {
            var atk = createPokemon(atkEntry.setId);
            var def = createPokemon(defEntry.setId);
            // Apply roster state overrides: current HP, status, boosts, item
            var atkHP = atkEntry.currentHP || atk.rawStats.hp;
            atk.originalCurHP = Math.min(atkHP, atk.rawStats.hp);
            var defHP = defEntry.currentHP || def.rawStats.hp;
            def.originalCurHP = Math.min(defHP, def.rawStats.hp);
            if (atkEntry.item !== undefined) atk.item = atkEntry.item;
            if (defEntry.item !== undefined) def.item = defEntry.item;
            if (atkEntry.ability) atk.ability = atkEntry.ability;
            if (defEntry.ability) def.ability = defEntry.ability;

            var field = createField();
            // Ensure doubles gameType
            field = new calc.Field({ ...field, gameType: 'Doubles' });

            var mv = new calc.Move(gen || 9, moveName, {
                ability: atk.ability,
                item: atk.item
            });

            var res = calc.calculate(gen || 9, atk, def, mv, field);
            var rng = res.range();
            return {
                desc: res.moveDesc(notation),
                range: rng,
                minDmg: rng[0],
                maxDmg: rng[1],
                move: res.move
            };
        } catch (e) {
            return null;
        }
    }

    /** Get all 4 move names for a roster entry */
    function getEntryMoves(entry) {
        if (!entry) return [];
        if (entry.moves && entry.moves.length > 0) {
            // Check if there's at least one real move
            var hasReal = false;
            for (var i = 0; i < entry.moves.length; i++) {
                if (entry.moves[i] && entry.moves[i] !== '(No Move)') { hasReal = true; break; }
            }
            if (hasReal) return entry.moves;
        }
        // Fallback: try to get moves from the set
        if (entry.setId) {
            var set = lookupSet(entry.setId);
            if (set && set.moves && set.moves.length > 0) {
                entry.moves = set.moves; // also fix the entry for future use
                return set.moves;
            }
        }
        return entry.moves || [];
    }

    /**
     * Check if a P2 Pokémon is appearing for the first time (hasn't been in any previous round).
     * Used to auto-set firstTurnOutAiOpt for Fake Out / First Impression detection.
     */
    function isP2FirstTurnOut(p2Name) {
        var line = curLine();
        if (!line || !line.rounds || line.rounds.length === 0) return true;
        for (var ri = 0; ri < line.rounds.length; ri++) {
            var rd = line.rounds[ri];
            if (rd.isDoubles && rd.fighters) {
                for (var sid in rd.fighters) {
                    if (sid.indexOf('p2') === 0 && rd.fighters[sid] && rd.fighters[sid].name === p2Name) return false;
                }
            } else if (rd.p2 && rd.p2.name === p2Name) {
                return false;
            }
        }
        return true;
    }

    /**
     * Compute AI move-choice probability distribution for a P2 entry against a specific P1 target.
     * Returns an object { rates: [{move, rate}], moveMap: {moveName: rate} }.
     */
    function calcP2MoveRates(p2Entry, p1Entry) {
        if (!p2Entry || !p1Entry || p2Entry.currentHP <= 0 || p1Entry.currentHP <= 0) return { rates: [], moveMap: {} };
        try {
            var p2Poke = createPokemon(p2Entry.setId);
            var p1Poke = createPokemon(p1Entry.setId);

            p2Poke.originalCurHP = Math.min(p2Entry.currentHP || p2Poke.rawStats.hp, p2Poke.rawStats.hp);
            p1Poke.originalCurHP = Math.min(p1Entry.currentHP || p1Poke.rawStats.hp, p1Poke.rawStats.hp);
            if (p2Entry.item !== undefined) p2Poke.item = p2Entry.item;
            if (p1Entry.item !== undefined) p1Poke.item = p1Entry.item;
            if (p2Entry.ability) p2Poke.ability = p2Entry.ability;
            if (p1Entry.ability) p1Poke.ability = p1Entry.ability;

            var field = createField();
            field = new calc.Field({ ...field, gameType: 'Doubles' });
            var field2 = field.clone().swap();

            var p1Results = [];
            for (var i = 0; i < 4; i++) {
                var mv = p1Poke.moves[i] || new calc.Move(gen || 9, '(No Move)');
                p1Results.push(calc.calculate(gen || 9, p1Poke, p2Poke, mv, field));
            }
            var p2Results = [];
            for (var i = 0; i < 4; i++) {
                var mv = p2Poke.moves[i] || new calc.Move(gen || 9, '(No Move)');
                p2Results.push(calc.calculate(gen || 9, p2Poke, p1Poke, mv, field2));
            }

            var damageResults = [p1Results, p2Results];
            var fastestSide = p1Poke.stats.spe >= p2Poke.stats.spe ? '0' : '1';
            var aiOptions = typeof createAiOptionsDict === 'function' ? createAiOptionsDict() : {};

            // Auto-detect first-turn-out for moves like Fake Out / First Impression
            aiOptions.firstTurnOutAiOpt = isP2FirstTurnOut(p2Entry.name);

            var rates = calc.generateMoveDist(damageResults, fastestSide, aiOptions);

            var moves = getEntryMoves(p2Entry);
            var result = [];
            var moveMap = {};
            for (var i = 0; i < rates.length; i++) {
                var mn = moves[i] || (p2Poke.moves[i] ? p2Poke.moves[i].name : null);
                if (mn && mn !== '(No Move)') {
                    result.push({ move: mn, rate: rates[i] });
                    moveMap[mn] = rates[i];
                }
            }
            return { rates: result, moveMap: moveMap };
        } catch (e) {
            return { rates: [], moveMap: {} };
        }
    }

    /**
     * Compute per-target AI move rates and target probabilities for a P2 slot.
     * Returns { targets: { targetSlot: { moveMap, targetProb } } }
     * targetProb = probability of choosing this target (derived from best move score per target).
     */
    function calcP2TargetRates(p2Entry, enemyEntries) {
        // enemyEntries: array of { slot, entry } for alive P1 mons
        if (!p2Entry || p2Entry.currentHP <= 0 || enemyEntries.length === 0) return {};

        var result = {};
        var targetInfo = {};

        for (var ti = 0; ti < enemyEntries.length; ti++) {
            var te = enemyEntries[ti];
            var rateData = calcP2MoveRates(p2Entry, te.entry);

            // Find the best move: the one with highest probability
            var bestMoveRate = 0;
            var bestMoveName = null;
            var canKO = false;
            for (var ri = 0; ri < rateData.rates.length; ri++) {
                if (rateData.rates[ri].rate > bestMoveRate) {
                    bestMoveRate = rateData.rates[ri].rate;
                    bestMoveName = rateData.rates[ri].move;
                }
            }

            // Check if any move can KO this target
            var moves = getEntryMoves(p2Entry);
            var koMoveRate = 0; // rate of best move that can KO
            for (var mi = 0; mi < moves.length; mi++) {
                var mn = moves[mi];
                if (!mn || mn === '(No Move)') continue;
                var dmg = calcDamageDirect(p2Entry, te.entry, mn);
                if (dmg && dmg.maxDmg >= te.entry.currentHP) {
                    canKO = true;
                    var r = rateData.moveMap[mn] || 0;
                    if (r > koMoveRate) koMoveRate = r;
                }
            }

            targetInfo[te.slot] = {
                moveMap: rateData.moveMap,
                bestMoveRate: bestMoveRate,
                canKO: canKO,
                koMoveRate: koMoveRate  // highest rate among KO-capable moves
            };
            result[te.slot] = { moveMap: rateData.moveMap, targetProb: 0 };
        }

        // Determine target probability based on KO opportunities
        var slots = Object.keys(targetInfo);
        if (slots.length === 1) {
            // Only one target — 100%
            result[slots[0]].targetProb = 1;
        } else if (slots.length === 2) {
            var a = targetInfo[slots[0]];
            var b = targetInfo[slots[1]];

            if (a.canKO && !b.canKO && a.koMoveRate >= 0.99) {
                // A can be KO'd with a move the AI would pick 100% → target A guaranteed
                result[slots[0]].targetProb = 1;
                result[slots[1]].targetProb = 0;
            } else if (b.canKO && !a.canKO && b.koMoveRate >= 0.99) {
                // B can be KO'd with a move the AI would pick 100% → target B guaranteed
                result[slots[0]].targetProb = 0;
                result[slots[1]].targetProb = 1;
            } else if (a.canKO && !b.canKO) {
                // A can be KO'd but move isn't 100% — lean towards A
                // Weight = 0.5 + 0.5 * koMoveRate (e.g., 70% rate → 85% target prob)
                var probA = 0.5 + 0.5 * a.koMoveRate;
                result[slots[0]].targetProb = probA;
                result[slots[1]].targetProb = 1 - probA;
            } else if (b.canKO && !a.canKO) {
                // B can be KO'd but move isn't 100%
                var probB = 0.5 + 0.5 * b.koMoveRate;
                result[slots[0]].targetProb = 1 - probB;
                result[slots[1]].targetProb = probB;
            } else {
                // Both can KO, or neither can KO → 50/50
                result[slots[0]].targetProb = 0.5;
                result[slots[1]].targetProb = 0.5;
            }
        }

        return result;
    }

    // ── Doubles selection state: tracks which move+target each slot picked ──
    var dblSelections = { p1a: { move: null, target: null }, p1b: { move: null, target: null },
                          p2a: { move: null, target: null }, p2b: { move: null, target: null } };

    /** Build the full doubles move grid — 4 panels, each showing all moves × all targets with damage */
    function refreshDoublesUI() {
        if (!isDoubles()) return;
        var line = curLine();
        var entries = {
            p1a: getActiveEntry(line.teams.p1),
            p1b: getActiveEntryB(line.teams.p1),
            p2a: getActiveEntry(line.teams.p2),
            p2b: getActiveEntryB(line.teams.p2)
        };
        var slotIds = ['p1a', 'p1b', 'p2a', 'p2b'];
        var slotLabels = { p1a: 'Left', p1b: 'Right', p2a: 'Left', p2b: 'Right' };

        var html = '';
        for (var si = 0; si < slotIds.length; si++) {
            var sid = slotIds[si];
            var entry = entries[sid];
            var isP2 = sid.indexOf('p2') === 0;
            var panelCls = isP2 ? ' rsa-dbl-panel-p2' : '';
            var nameCls = isP2 ? 'rsa-dbl-panel-name-p2' : 'rsa-dbl-panel-name-p1';
            var lblCls = slotLabels[sid] === 'Left' ? 'rsa-dbl-panel-slot-label-left' : 'rsa-dbl-panel-slot-label-right';

            html += '<div class="rsa-dbl-panel' + panelCls + '" data-slot="' + sid + '">';

            // Header
            if (entry) {
                html += '<div class="rsa-dbl-panel-header">' +
                    '<img class="rsa-dbl-panel-sprite" src="' + esc(entry.sprite) + '" alt="">' +
                    '<span class="rsa-dbl-panel-name ' + nameCls + '">' + esc(entry.name) + '</span>' +
                    '<span class="rsa-dbl-panel-slot-label ' + lblCls + '">' + slotLabels[sid] + '</span>' +
                '</div>';
            } else {
                html += '<div class="rsa-dbl-panel-header"><span class="rsa-dbl-panel-name ' + nameCls + '">Empty</span></div>';
                html += '<div class="rsa-dbl-no-move">No Pokémon in this slot</div></div>';
                continue;
            }

            if (entry.currentHP <= 0) {
                html += '<div class="rsa-dbl-no-move">Fainted</div></div>';
                continue;
            }

            // Determine target slots (the other 3 mons)
            var targets = [];
            for (var ti = 0; ti < slotIds.length; ti++) {
                if (slotIds[ti] !== sid) targets.push(slotIds[ti]);
            }

            // For P2 slots, compute per-target AI move rates and target probabilities
            var p2TargetRates = {};
            if (isP2) {
                // Find alive enemy (P1) targets
                var enemyTargets = [];
                for (var ti = 0; ti < targets.length; ti++) {
                    var tgt = targets[ti];
                    if (tgt.indexOf('p1') === 0 && entries[tgt] && entries[tgt].currentHP > 0) {
                        enemyTargets.push({ slot: tgt, entry: entries[tgt] });
                    }
                }
                if (enemyTargets.length > 0) {
                    p2TargetRates = calcP2TargetRates(entry, enemyTargets);
                }
            }

            // Target header row
            html += '<div class="rsa-dbl-target-headers">';
            html += '<div class="rsa-dbl-target-hdr">Move</div>';
            for (var ti = 0; ti < targets.length; ti++) {
                var tgt = targets[ti];
                var tEntry = entries[tgt];
                var tLabel = tEntry ? tEntry.name : tgt;
                var tSlotTag = slotLabels[tgt] === 'Left' ? 'L' : 'R';
                var tSide = tgt.indexOf('p1') === 0 ? 'P1' : 'P2';
                // Show target probability for P2 panels on enemy targets
                var tgtProbHtml = '';
                if (isP2 && p2TargetRates[tgt] && p2TargetRates[tgt].targetProb > 0) {
                    var tpPct = (p2TargetRates[tgt].targetProb * 100).toFixed(0);
                    tgtProbHtml = '<br><span class="rsa-dbl-tgt-prob">🎯 ' + tpPct + '%</span>';
                }
                html += '<div class="rsa-dbl-target-hdr">' + esc(tLabel) + ' <small>(' + tSide + tSlotTag + ')</small>' + tgtProbHtml + '</div>';
            }
            html += '</div>';

            // Move rows
            var moves = getEntryMoves(entry);
            var hasMoves = false;

            var sel = dblSelections[sid];
            for (var mi = 0; mi < moves.length; mi++) {
                var moveName = moves[mi];
                if (!moveName || moveName === '(No Move)') continue;
                hasMoves = true;

                var md = lookupMoveData(moveName);
                var typeSprite = md && md.type ? '<img class="rsa-type-sprite" src="' + esc(getTypeSpriteUrl(md.type)) + '" alt="" title="' + esc(md.type) + '">' : '';
                var catSprite = md && md.category ? '<img class="rsa-cat-sprite" src="' + esc(getCategorySpriteUrl(md.category)) + '" alt="" title="' + esc(md.category) + '">' : '';

                var isSelectedMove = sel && sel.move === moveName;
                var rowCls = isSelectedMove ? ' rsa-dbl-selected' : '';

                html += '<div class="rsa-dbl-move-row' + rowCls + '" data-slot="' + sid + '" data-move="' + esc(moveName) + '">';
                html += '<div class="rsa-dbl-move-name">' + typeSprite + catSprite + ' ' + esc(moveName) + '</div>';

                // Damage cell for each target
                for (var ti = 0; ti < targets.length; ti++) {
                    var tgt = targets[ti];
                    var defEntry = entries[tgt];
                    var isSelectedTarget = isSelectedMove && sel.target === tgt;
                    var cellCls = isSelectedTarget ? ' rsa-dbl-target-selected' : '';

                    // Per-target move probability for P2 panels
                    var cellProbHtml = '';
                    if (isP2 && p2TargetRates[tgt] && p2TargetRates[tgt].moveMap[moveName] !== undefined) {
                        var cellPct = (p2TargetRates[tgt].moveMap[moveName] * 100).toFixed(1);
                        cellProbHtml = '<br><span class="rsa-dbl-cell-prob">' + cellPct + '%</span>';
                    }

                    if (!defEntry || defEntry.currentHP <= 0) {
                        html += '<div class="rsa-dbl-dmg-cell rsa-dbl-dmg-immune' + cellCls + '" data-slot="' + sid + '" data-move="' + esc(moveName) + '" data-target="' + tgt + '">—</div>';
                        continue;
                    }

                    var dmg = calcDamageDirect(entry, defEntry, moveName);
                    if (!dmg || (dmg.minDmg === 0 && dmg.maxDmg === 0)) {
                        html += '<div class="rsa-dbl-dmg-cell rsa-dbl-dmg-immune' + cellCls + '" data-slot="' + sid + '" data-move="' + esc(moveName) + '" data-target="' + tgt + '">immune' + cellProbHtml + '</div>';
                        continue;
                    }

                    var defHP = defEntry.currentHP || defEntry.maxHP;
                    var isKO = dmg.minDmg >= defHP;
                    var pctMin = defEntry.maxHP > 0 ? (dmg.minDmg / defEntry.maxHP * 100).toFixed(0) : 0;
                    var pctMax = defEntry.maxHP > 0 ? (dmg.maxDmg / defEntry.maxHP * 100).toFixed(0) : 0;
                    var koCls = isKO ? ' rsa-dbl-dmg-ko' : '';

                    html += '<div class="rsa-dbl-dmg-cell' + koCls + cellCls + '" data-slot="' + sid + '" data-move="' + esc(moveName) + '" data-target="' + tgt + '">' +
                        dmg.minDmg + '-' + dmg.maxDmg +
                        '<br><small>' + pctMin + '-' + pctMax + '%' + (isKO ? ' KO!' : '') + '</small>' +
                        cellProbHtml +
                    '</div>';
                }
                html += '</div>';
            }

            if (!hasMoves) {
                html += '<div class="rsa-dbl-no-move">No moves available</div>';
            }

            // "No move" option row
            var noMoveSelected = sel && sel.move === null;
            html += '<div class="rsa-dbl-move-row' + (noMoveSelected ? ' rsa-dbl-selected' : '') + '" data-slot="' + sid + '" data-move="none">';
            html += '<div class="rsa-dbl-move-name" style="color:#718096;font-style:italic">— No Move —</div>';
            for (var ti = 0; ti < targets.length; ti++) {
                html += '<div class="rsa-dbl-dmg-cell"></div>';
            }
            html += '</div>';

            html += '</div>'; // close panel
        }

        $('#rsa-dbl-grid').html(html);
    }

    // Alias for backward compat
    function updateDblDamagePreview() { refreshDoublesUI(); }

    // ════════════════════════════════════════════════════════════
    // EXTRA DAMAGE SOURCES
    // ════════════════════════════════════════════════════════════

    function calcExtraDamage(attacker, defender, moveInfo, weather) {
        var extras = [];
        if (!moveInfo || !moveInfo.move) return extras;

        var atkMaxHP = attacker.maxHP;
        var defMaxHP = defender.maxHP;
        var move = moveInfo.move;

        var atkMagicGuard = attacker.ability === 'Magic Guard';
        var atkRockHead   = attacker.ability === 'Rock Head';
        // Recoil/drain are based on actual damage dealt, which is capped at the defender's current HP
        var defCurHP = Math.max(1, defender.currentHP || defender.maxHP);
        var effMinDmg = Math.min(moveInfo.minDmg, defCurHP);
        var effMaxDmg = Math.min(moveInfo.maxDmg, defCurHP);

        // --- Life Orb recoil on attacker (blocked by Magic Guard; fixed 1/10 of attacker maxHP) ---
        if (attacker.item === 'Life Orb' && moveInfo.minDmg > 0 && !atkMagicGuard) {
            var loRecoil = Math.max(1, Math.floor(atkMaxHP / 10));
            extras.push({
                target: 'attacker',
                source: 'Life Orb',
                damage: loRecoil,
                type: 'recoil'
            });
        }

        // --- Move recoil (blocked by Magic Guard / Rock Head; based on actual damage dealt) ---
        if (move.recoil && moveInfo.maxDmg > 0 && !atkMagicGuard && !atkRockHead) {
            var recoilMin = Math.max(1, Math.floor(effMinDmg * move.recoil[0] / move.recoil[1]));
            var recoilMax = Math.max(1, Math.floor(effMaxDmg * move.recoil[0] / move.recoil[1]));
            extras.push({
                target: 'attacker',
                source: 'Recoil (' + move.recoil[0] + '/' + move.recoil[1] + ')',
                damage: recoilMax,  // worst-case
                damageMin: recoilMin,
                type: 'recoil'
            });
        }

        // --- Contact damage (Iron Barbs, Rough Skin, Rocky Helmet) — blocked by Magic Guard ---
        var isContact = !!(move.makesContact || move.flags && move.flags.contact);
        if (isContact && moveInfo.minDmg > 0 && !atkMagicGuard) {
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

        // --- Drain / healing moves (based on actual damage dealt, capped at defender current HP) ---
        if (move.drain && moveInfo.maxDmg > 0) {
            var drainMin = Math.max(1, Math.floor(effMinDmg * move.drain[0] / move.drain[1]));
            var drainMax = Math.max(1, Math.floor(effMaxDmg * move.drain[0] / move.drain[1]));
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
        var hasMagicGuard = entry.ability === 'Magic Guard';
        var hasPoisonHeal = entry.ability === 'Poison Heal';

        // --- Status damage (blocked by Magic Guard) ---
        if (entry.status === 'Burn' && !hasMagicGuard) {
            var burnDmg = Math.max(1, Math.floor(maxHP / 16));
            eot.push({ source: 'Burn', damage: burnDmg });
        }
        // Poison Heal: heal 1/8 instead of taking poison/toxic damage
        if (hasPoisonHeal && (entry.status === 'Poison' || entry.status === 'Badly Poisoned')) {
            eot.push({ source: 'Poison Heal', damage: -Math.max(1, Math.floor(maxHP / 8)) });
        } else {
            if (entry.status === 'Poison' && !hasMagicGuard) {
                var psnDmg = Math.max(1, Math.floor(maxHP / 8));
                eot.push({ source: 'Poison', damage: psnDmg });
            }
            if (entry.status === 'Badly Poisoned' && !hasMagicGuard) {
                var toxN = Math.min(entry.toxicCounter || 1, 15);
                var toxDmg = Math.max(1, Math.floor(maxHP * toxN / 16));
                eot.push({ source: 'Toxic (' + toxN + '/16)', damage: toxDmg });
            }
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
            } else if (!hasMagicGuard) {
                // Magic Guard blocks Black Sludge damage (but not healing)
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
        return WEATHER_IMMUNE_ABILITIES.indexOf(ability) !== -1;
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
            injectMoveLabelSprites();
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

        var p2SetId = getSetId('p2');
        var p2Name = getP2Name();

        // Use window.CURRENT_TRAINER_POKS (global from shared_controls) as the primary source
        // of truth — it holds ALL trainer pokemon in the correct [N] sorted order, including
        // the currently-loaded one which is intentionally absent from .trainer-pok-list-opposing.
        var trainerOrder = [];
        if (window.CURRENT_TRAINER_POKS && window.CURRENT_TRAINER_POKS.length) {
            for (var t = 0; t < window.CURRENT_TRAINER_POKS.length; t++) {
                var raw = window.CURRENT_TRAINER_POKS[t];
                // Format: "[N]PokeName (TrainerSet)"  — setId is everything after the first "]"
                var setId = raw.indexOf(']') !== -1 ? raw.slice(raw.indexOf(']') + 1) : raw;
                var pokeName = String(setId).split(' (')[0];
                if (pokeName) trainerOrder.push({ name: pokeName, setId: setId });
            }
        }

        // Fallback: build from DOM list + currently loaded pokemon
        if (trainerOrder.length === 0) {
            if (p2Name) trainerOrder.push({ name: p2Name, setId: p2SetId });
            $('.trainer-pok-list-opposing img.trainer-pok').each(function () {
                var sid = $(this).data('id');
                if (!sid) return;
                var pName = String(sid).split(' (')[0];
                if (pName && pName !== p2Name) trainerOrder.push({ name: pName, setId: sid });
            });
        }

        // If still empty just use the loaded pokemon
        if (trainerOrder.length === 0 && p2Name) {
            trainerOrder.push({ name: p2Name, setId: p2SetId });
        }

        var newActiveIdx = 0;
        for (var k = 0; k < trainerOrder.length; k++) {
            var pok = trainerOrder[k];
            var pokeName = pok.name;
            var setId = pok.setId;

            // Track which index is the currently active (loaded) pokemon
            if (pokeName === p2Name) newActiveIdx = k;

            if (oldEntries[pokeName] && line.rounds.length > 0) {
                if (pokeName === p2Name) {
                    // Refresh live data (item/ability/moves may have changed) but keep tracked HP
                    var preserved = oldEntries[pokeName];
                    preserved.item = getItem('p2') || preserved.item;
                    preserved.ability = getAbility('p2') || preserved.ability;
                    var formMoves = getMoves('p2');
                    // Only update moves if the form has real moves (not all empty/No Move)
                    var hasRealMove = formMoves && formMoves.some(function(m) { return m && m !== '(No Move)'; });
                    if (hasRealMove) preserved.moves = formMoves;
                    newRoster.push(preserved);
                } else {
                    newRoster.push(oldEntries[pokeName]);
                }
            } else if (pokeName === p2Name) {
                // Use live calc form data for the currently loaded pokemon
                var hp = getCurrentHP('p2');
                var maxHP = hp.max || 100;
                var formMoves2 = getMoves('p2');
                var hasRealMove2 = formMoves2 && formMoves2.some(function(m) { return m && m !== '(No Move)'; });
                // Fall back to set moves if form hasn't populated yet
                if (!hasRealMove2) {
                    var setFallback = lookupSet(setId);
                    if (setFallback && setFallback.moves) formMoves2 = setFallback.moves;
                }
                var entry = createRosterEntry(
                    pokeName, setId,
                    getSprite(pokeName),
                    getItem('p2'),
                    getAbility('p2'),
                    formMoves2,
                    maxHP,
                    getTypes('p2')
                );
                entry.currentHP = maxHP;
                newRoster.push(entry);
            } else {
                var set = lookupSet(setId);
                var maxHP = set ? calcMaxHP(pokeName, set) : 100;
                var types = [];
                try {
                    var species = calc.SPECIES[gen || 9][pokeName];
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
        }

        team.roster = newRoster;
        team.activeIdx = newActiveIdx;
        if (team.activeIdx < 0 && newRoster.length > 0) team.activeIdx = 0;
        if (team.activeIdx >= newRoster.length) team.activeIdx = newRoster.length - 1;
        // Doubles: auto-set A and B slots
        if (isDoubles() && team.roster.length >= 2) {
            if (battleFormat === 'doubles-2t' && line.teamSplit) {
                // 2-trainer: left team mon 0 → slot A, right team mon 0 → slot B
                var leftMax = line.teamSplit.left || 3;
                // A slot = first alive mon in left group (indices 0..leftMax-1)
                var foundA = false;
                for (var li = 0; li < Math.min(leftMax, team.roster.length); li++) {
                    if (team.roster[li].currentHP > 0) { team.activeIdx = li; foundA = true; break; }
                }
                if (!foundA) team.activeIdx = 0;
                // B slot = first alive mon in right group (indices leftMax..)
                var foundB = false;
                for (var ri = leftMax; ri < team.roster.length; ri++) {
                    if (team.roster[ri].currentHP > 0) { team.activeIdxB = ri; foundB = true; break; }
                }
                if (!foundB && team.roster.length > leftMax) team.activeIdxB = leftMax;
                else if (!foundB) team.activeIdxB = team.activeIdx === 0 ? 1 : 0;
            } else if (team.activeIdxB < 0 || team.activeIdxB === team.activeIdx) {
                // 1-trainer: first non-active alive mon
                for (var bi = 0; bi < team.roster.length; bi++) {
                    if (bi !== team.activeIdx && team.roster[bi].currentHP > 0) {
                        team.activeIdxB = bi;
                        break;
                    }
                }
            }
        }
        renderTeamPanel('p2');
        if (isDoubles()) refreshDoublesUI();
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

        // In doubles, handle slot cleanup before removing
        if (isDoubles()) {
            if (idx === team.activeIdx) {
                // Removed mon was in A slot — find next alive mon not in B
                team.activeIdx = -1;
                for (var ri = 0; ri < team.roster.length; ri++) {
                    if (ri !== idx && ri !== team.activeIdxB && team.roster[ri].currentHP > 0) {
                        team.activeIdx = ri; break;
                    }
                }
            }
            if (idx === team.activeIdxB) {
                // Removed mon was in B slot — find next alive mon not in A
                team.activeIdxB = -1;
                for (var ri = 0; ri < team.roster.length; ri++) {
                    if (ri !== idx && ri !== team.activeIdx && team.roster[ri].currentHP > 0) {
                        team.activeIdxB = ri; break;
                    }
                }
            }
        }

        team.roster.splice(idx, 1);

        // Adjust indices after splice
        if (team.activeIdx >= team.roster.length) team.activeIdx = team.roster.length - 1;
        if (team.activeIdx > idx) team.activeIdx--;
        if (isDoubles()) {
            if (team.activeIdxB >= team.roster.length) team.activeIdxB = -1;
            if (team.activeIdxB > idx) team.activeIdxB--;
            // Ensure A and B aren't the same
            if (team.activeIdxB === team.activeIdx && team.roster.length >= 2) {
                for (var ri = 0; ri < team.roster.length; ri++) {
                    if (ri !== team.activeIdx) { team.activeIdxB = ri; break; }
                }
            }
        }

        renderTeamPanel(side);
        if (isDoubles()) refreshDoublesUI();
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
            // Auto-select the most probable P2 move after calc recalculates
            setTimeout(function () { autoSelectP2MostProbable(); }, 600);
        }
    }

    /** Doubles switch: replace the A or B slot with a new mon from the roster */
    function doDoublesSwitch(side, slot, newIdx) {
        var line = curLine();
        var team = line.teams[side];
        if (newIdx < 0 || newIdx >= team.roster.length) return;
        var otherSlot = (slot === 'a') ? team.activeIdxB : team.activeIdx;
        if (newIdx === otherSlot) return; // can't put same mon in both slots

        // Reset boosts on outgoing
        var outIdx = (slot === 'a') ? team.activeIdx : team.activeIdxB;
        if (outIdx >= 0 && team.roster[outIdx]) {
            team.roster[outIdx].boosts = { at: 0, df: 0, sa: 0, sd: 0, sp: 0 };
        }

        if (slot === 'a') {
            team.activeIdx = newIdx;
        } else {
            team.activeIdxB = newIdx;
        }

        // Reset selection for the switched slot
        var slotKey = (side === 'p1' ? 'p1' : 'p2') + (slot === 'a' ? 'a' : 'b');
        dblSelections[slotKey] = { move: null, target: null };

        renderTeamPanel(side);
        refreshDoublesUI();
        populateSwitchDropdown();
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

        // Apply in speed order with inline Focus Sash check
        // Sash must fire BEFORE deciding if the second mover can attack
        var p1Sashed = false, p2Sashed = false;

        if (speed.faster === 'p1' || speed.faster === 'tie') {
            // P1 attacks P2 first
            p2HPAfter = Math.max(0, p2HPAfter - p1DmgToP2Min);
            p2BestAfter = Math.max(0, p2BestAfter - p1DmgToP2Max);

            // Focus Sash: P2 survives at 1 HP if at full HP before the hit
            if (p2Entry.item === 'Focus Sash' && p2HPBefore >= p2Entry.maxHP && p2HPBefore > 0) {
                if (p2HPAfter <= 0) { p2HPAfter = 1; p2Sashed = true; }
                if (p2BestAfter <= 0 && p2BestBefore >= p2Entry.maxHP) { p2BestAfter = 1; p2Sashed = true; }
            }

            // P2 attacks P1 only if P2 survived (including via sash)
            if (p2HPAfter > 0) {
                p1HPAfter = Math.max(0, p1HPAfter - p2DmgToP1Max);
            }
            if (p2BestAfter > 0) {
                p1BestAfter = Math.max(0, p1BestAfter - p2DmgToP1Min);
            } else {
                p1BestAfter = p1BestBefore; // P2 KO'd, P1 takes no damage in best case
            }
        } else {
            // P2 attacks P1 first
            p1HPAfter = Math.max(0, p1HPAfter - p2DmgToP1Max);
            p1BestAfter = Math.max(0, p1BestAfter - p2DmgToP1Min);

            // Focus Sash: P1 survives at 1 HP if at full HP before the hit
            if (p1Entry.item === 'Focus Sash' && p1HPBefore >= p1Entry.maxHP && p1HPBefore > 0) {
                if (p1HPAfter <= 0) { p1HPAfter = 1; p1Sashed = true; }
                if (p1BestAfter <= 0 && p1BestBefore >= p1Entry.maxHP) { p1BestAfter = 1; p1Sashed = true; }
            }

            // P1 attacks P2 only if P1 survived (including via sash)
            if (p1HPAfter > 0) {
                p2HPAfter = Math.max(0, p2HPAfter - p1DmgToP2Min);
            }
            if (p1BestAfter > 0) {
                p2BestAfter = Math.max(0, p2BestAfter - p1DmgToP2Max);
            } else {
                p2BestAfter = p2BestBefore;
            }
        }

        // Consume Focus Sash after speed-order resolution
        if (p1Sashed) { p1Entry.item = ''; $('#p1 .item').val('').trigger('change'); }
        if (p2Sashed) { p2Entry.item = ''; $('#p2 .item').val('').trigger('change'); }

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

        // ── Post-EOT item effects ──
        // Helper to clear a consumed item from the entry and its calc form
        function consumeItem(entry, side) {
            entry.item = '';
            $('#' + side + ' .item').val('').trigger('change');
        }

        // Status-curing berries activate end-of-turn (after EOT status damage)
        // Sitrus Berry heals 25% max HP when at ≤ 50% HP
        function applyPostEOTBerries(entry, hpVar, bestVar, eotList, side) {
            if (!entry.item || entry.currentHP <= 0) return { hp: hpVar, best: bestVar };
            var itlc = entry.item.toLowerCase().replace(/\s/g, '');
            var cured = false;

            if (hpVar > 0) {
                if (itlc === 'lumberry' && entry.status) {
                    entry.status = ''; entry.toxicCounter = 0; cured = true;
                } else if (itlc === 'rawstberry' && entry.status === 'Burn') {
                    entry.status = ''; cured = true;
                } else if (itlc === 'pechaberry' && (entry.status === 'Poison' || entry.status === 'Badly Poisoned')) {
                    entry.status = ''; entry.toxicCounter = 0; cured = true;
                } else if (itlc === 'cheriberry' && entry.status === 'Paralysis') {
                    entry.status = ''; cured = true;
                } else if (itlc === 'chestoberry' && entry.status === 'Sleep') {
                    entry.status = ''; cured = true;
                } else if (itlc === 'aspearberry' && entry.status === 'Freeze') {
                    entry.status = ''; cured = true;
                }
                if (cured) consumeItem(entry, side);

                // Sitrus Berry: heal 25% max HP when at ≤ 50%
                if (!cured && itlc === 'sitrusberry' && hpVar <= Math.floor(entry.maxHP / 2)) {
                    var sitrusHeal = Math.max(1, Math.floor(entry.maxHP / 4));
                    hpVar  = Math.min(entry.maxHP, hpVar  + sitrusHeal);
                    bestVar = Math.min(entry.maxHP, bestVar + sitrusHeal);
                    eotList.push({ source: 'Sitrus Berry', damage: -sitrusHeal });
                    consumeItem(entry, side);
                }
            }
            return { hp: hpVar, best: bestVar };
        }

        var p1PostEOT = applyPostEOTBerries(p1Entry, p1HPAfter, p1BestAfter, p1EOT, 'p1');
        p1HPAfter = p1PostEOT.hp; p1BestAfter = p1PostEOT.best;
        var p2PostEOT = applyPostEOTBerries(p2Entry, p2HPAfter, p2BestAfter, p2EOT, 'p2');
        p2HPAfter = p2PostEOT.hp; p2BestAfter = p2PostEOT.best;

        // Toxic Orb / Flame Orb: inflict status at end of turn (no damage this turn; starts next)
        if (!p1Entry.status) {
            if (p1Entry.item === 'Toxic Orb') {
                p1Entry.status = 'Badly Poisoned'; p1Entry.toxicCounter = 0;
            } else if (p1Entry.item === 'Flame Orb') {
                p1Entry.status = 'Burn';
            }
        }
        if (!p2Entry.status) {
            if (p2Entry.item === 'Toxic Orb') {
                p2Entry.status = 'Badly Poisoned'; p2Entry.toxicCounter = 0;
            } else if (p2Entry.item === 'Flame Orb') {
                p2Entry.status = 'Burn';
            }
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
                    priority: p1MoveData.priority || 0,
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
                    priority: p2MoveData.priority || 0,
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

        // Update form HP (trigger input so calc display/percentages update too)
        $('#p1 .current-hp').val(p1HPAfter).trigger('input');
        $('#p2 .current-hp').val(p2HPAfter).trigger('input');

        // If P2 is KO'd, predict who switches in next
        if (p2HPAfter <= 0) {
            try {
                rd.switchPred = predictSwitchIn('$p1');
            } catch (e) { rd.switchPred = null; }
        }

        return rd;
    }

    // ════════════════════════════════════════════════════════════
    // DOUBLES — CAPTURE ROUND
    // ════════════════════════════════════════════════════════════

    function captureDoublesRound(comment) {
        var line = curLine();
        var p1Team = line.teams.p1;
        var p2Team = line.teams.p2;
        var weather = getWeather();

        // Get all 4 active entries
        var fighters = {
            p1a: getActiveEntry(p1Team),
            p1b: getActiveEntryB(p1Team),
            p2a: getActiveEntry(p2Team),
            p2b: getActiveEntryB(p2Team)
        };

        // Get selected moves and targets from the doubles selection state
        var actions = {};
        var slotIds = ['p1a', 'p1b', 'p2a', 'p2b'];
        for (var si = 0; si < slotIds.length; si++) {
            var sid = slotIds[si];
            var sel = dblSelections[sid];
            var moveName = sel ? sel.move : null;
            var target = sel ? sel.target : null;
            var entry = fighters[sid];
            actions[sid] = {
                entry: entry,
                moveName: moveName,
                target: target,
                fainted: !entry || entry.currentHP <= 0,
                side: sid.substring(0, 2), // 'p1' or 'p2'
                slot: sid
            };
        }

        // AI targeting for P2 slots: if no target manually selected, auto-target
        var p2Slots = ['p2a', 'p2b'];
        for (var pi = 0; pi < p2Slots.length; pi++) {
            var ps = p2Slots[pi];
            var p2act = actions[ps];
            if (!p2act.entry || p2act.fainted || !p2act.moveName) continue;

            var moveData = lookupMoveData(p2act.moveName);
            var mt = moveData ? (moveData.target || 'normal') : 'normal';
            // Spread moves don't need a target — skip AI targeting
            if (mt === 'allAdjacentFoes' || mt === 'allAdjacent') continue;

            // If a target was manually set and is alive, keep it
            if (p2act.target && fighters[p2act.target] && fighters[p2act.target].currentHP > 0) continue;

            // Calculate damage on both P1 slots
            var p1Targets = [];
            var p1slots = ['p1a', 'p1b'];
            for (var ti = 0; ti < p1slots.length; ti++) {
                var tgt = p1slots[ti];
                var def = fighters[tgt];
                if (!def || def.currentHP <= 0) continue;
                var dmg = calcDamageDirect(p2act.entry, def, p2act.moveName);
                var isKO = dmg && dmg.maxDmg >= def.currentHP;
                p1Targets.push({ slot: tgt, dmg: dmg, isKO: isKO });
            }

            if (p1Targets.length === 0) continue;
            if (p1Targets.length === 1) {
                p2act.target = p1Targets[0].slot;
            } else {
                // Use target probability from calcP2TargetRates
                var enemyTargets = [];
                for (var eti = 0; eti < p1Targets.length; eti++) {
                    enemyTargets.push({ slot: p1Targets[eti].slot, entry: fighters[p1Targets[eti].slot] });
                }
                var tgtRates = calcP2TargetRates(p2act.entry, enemyTargets);
                var tgtProb0 = tgtRates[p1Targets[0].slot] ? tgtRates[p1Targets[0].slot].targetProb : 0.5;
                // Use probability as weighted random
                if (tgtProb0 >= 0.99) {
                    p2act.target = p1Targets[0].slot;
                    p2act.aiNote = 'KO target';
                } else if (tgtProb0 <= 0.01) {
                    p2act.target = p1Targets[1].slot;
                    p2act.aiNote = 'KO target';
                } else {
                    p2act.target = Math.random() < tgtProb0 ? p1Targets[0].slot : p1Targets[1].slot;
                    p2act.aiNote = Math.abs(tgtProb0 - 0.5) < 0.01 ? 'random target' : 'weighted target';
                }
            }
        }

        // Compute speed for all 4 mons and determine turn order
        var tr = $('#trickroom').is(':checked');
        var order = [];
        for (var si = 0; si < slotIds.length; si++) {
            var sid = slotIds[si];
            var act = actions[sid];
            if (!act.entry || act.fainted) continue;

            // Get speed from entry using the calc engine
            var spd = 0;
            try {
                var poke = createPokemon(act.entry.setId);
                spd = poke.stats.spe || 50;
                // Apply paralysis
                if (act.entry.status === 'Paralysis') spd = Math.floor(spd * 0.5);
                // Apply boost multiplier
                var spdBoost = (act.entry.boosts && act.entry.boosts.sp) || 0;
                if (spdBoost > 0) spd = Math.floor(spd * (2 + spdBoost) / 2);
                else if (spdBoost < 0) spd = Math.floor(spd * 2 / (2 - spdBoost));
            } catch (e) {}

            // Get move priority
            var priority = 0;
            if (act.moveName) {
                var md = lookupMoveData(act.moveName);
                if (md && typeof md.priority === 'number') priority = md.priority;
            }

            order.push({ slot: sid, speed: spd, priority: priority });
        }

        // Sort by priority (descending) then speed (descending; ascending if Trick Room)
        order.sort(function (a, b) {
            if (a.priority !== b.priority) return b.priority - a.priority;
            if (tr) return a.speed - b.speed; // Trick Room: slower goes first
            return b.speed - a.speed;
        });

        // Snapshot HP before (worst case = current, best case = bestCaseHP)
        var hpBefore = {};
        var bestHPBefore = {};
        for (var sid in fighters) {
            if (fighters[sid]) {
                hpBefore[sid] = fighters[sid].currentHP;
                bestHPBefore[sid] = fighters[sid].bestCaseHP != null ? fighters[sid].bestCaseHP : fighters[sid].currentHP;
            }
        }

        // Track flinched mons (set by earlier movers, blocks later movers)
        var flinched = {};

        // Process each action in turn order
        var roundActions = [];
        for (var oi = 0; oi < order.length; oi++) {
            var sid = order[oi].slot;
            var act = actions[sid];
            if (!act.entry || act.entry.currentHP <= 0 || !act.moveName) {
                roundActions.push({ slot: sid, move: '—', targets: [], dmgInfo: null, flinched: !!flinched[sid] });
                continue;
            }

            // Check if this mon was flinched by an earlier mover
            if (flinched[sid]) {
                roundActions.push({
                    slot: sid, name: act.entry.name, move: act.moveName,
                    moveData: lookupMoveData(act.moveName),
                    targets: [], extras: [],
                    speed: order[oi].speed, priority: order[oi].priority,
                    flinched: true
                });
                continue;
            }

            var moveData = lookupMoveData(act.moveName);
            var moveTarget = moveData ? (moveData.target || 'normal') : 'normal';

            // Determine actual targets based on move target type
            var targets = [];
            if (moveTarget === 'allAdjacentFoes') {
                // Hits both enemy mons
                var enemy = act.side === 'p1' ? ['p2a', 'p2b'] : ['p1a', 'p1b'];
                for (var ti = 0; ti < enemy.length; ti++) {
                    if (fighters[enemy[ti]] && fighters[enemy[ti]].currentHP > 0) targets.push(enemy[ti]);
                }
            } else if (moveTarget === 'allAdjacent') {
                // Hits everyone except user (including partner!)
                for (var ti = 0; ti < slotIds.length; ti++) {
                    if (slotIds[ti] !== sid && fighters[slotIds[ti]] && fighters[slotIds[ti]].currentHP > 0) {
                        targets.push(slotIds[ti]);
                    }
                }
            } else {
                // Single target — use selected target
                if (act.target && fighters[act.target] && fighters[act.target].currentHP > 0) {
                    targets.push(act.target);
                }
            }

            // Calc damage to each target
            var dmgResults = [];
            for (var ti = 0; ti < targets.length; ti++) {
                var tgt = targets[ti];
                var defEntry = fighters[tgt];
                if (!defEntry || defEntry.currentHP <= 0) continue;

                var dmg = calcDamageDirect(act.entry, defEntry, act.moveName);
                if (!dmg) continue;

                // Apply damage (worst case = max damage)
                var applied = Math.min(defEntry.currentHP, dmg.maxDmg);
                // Best case = min damage
                var appliedMin = Math.min(defEntry.bestCaseHP != null ? defEntry.bestCaseHP : defEntry.currentHP, dmg.minDmg);

                // Focus Sash check
                var sashed = false;
                if (defEntry.item === 'Focus Sash' && defEntry.currentHP >= defEntry.maxHP &&
                    applied >= defEntry.currentHP && defEntry.currentHP > 0) {
                    defEntry.currentHP = 1;
                    if (defEntry.bestCaseHP != null) defEntry.bestCaseHP = 1;
                    defEntry.item = '';
                    sashed = true;
                } else {
                    defEntry.currentHP = Math.max(0, defEntry.currentHP - applied);
                    // Best-case HP uses min damage
                    var bestHP = defEntry.bestCaseHP != null ? defEntry.bestCaseHP : (defEntry.currentHP + applied);
                    defEntry.bestCaseHP = Math.max(0, bestHP - dmg.minDmg);
                }

                dmgResults.push({
                    target: tgt,
                    targetName: defEntry.name,
                    minDmg: dmg.minDmg,
                    maxDmg: dmg.maxDmg,
                    applied: applied,
                    sashed: sashed,
                    ko: defEntry.currentHP <= 0
                });
            }

            // Apply recoil/Life Orb/contact damage per target
            var actionExtras = [];
            if (dmgResults.length > 0 && act.entry.currentHP > 0) {
                var firstDmg = dmgResults[0];
                var firstDef = fighters[firstDmg.target];

                // Life Orb + move recoil — triggered once per attack using first target
                var dummyMoveInfo = { minDmg: firstDmg.minDmg, maxDmg: firstDmg.maxDmg, move: moveData || {} };
                var generalExtras = calcExtraDamage(act.entry, firstDef || act.entry, dummyMoveInfo, weather);
                // Filter out contact damage — we compute that per-target below
                for (var ei = 0; ei < generalExtras.length; ei++) {
                    if (generalExtras[ei].type !== 'contact') {
                        actionExtras.push(generalExtras[ei]);
                        if (generalExtras[ei].target === 'attacker') {
                            if (generalExtras[ei].type === 'drain') {
                                act.entry.currentHP = Math.min(act.entry.maxHP, act.entry.currentHP - generalExtras[ei].damage);
                                if (act.entry.bestCaseHP != null) act.entry.bestCaseHP = Math.min(act.entry.maxHP, act.entry.bestCaseHP - generalExtras[ei].damage);
                            } else {
                                act.entry.currentHP = Math.max(0, act.entry.currentHP - generalExtras[ei].damage);
                                if (act.entry.bestCaseHP != null) act.entry.bestCaseHP = Math.max(0, act.entry.bestCaseHP - generalExtras[ei].damage);
                            }
                        }
                    }
                }

                // Contact damage — check each target individually
                var isContact = false;
                if (moveData) {
                    isContact = !!(moveData.makesContact || (moveData.flags && moveData.flags.contact));
                }
                if (isContact && act.entry.ability !== 'Magic Guard') {
                    for (var di = 0; di < dmgResults.length; di++) {
                        var defE = fighters[dmgResults[di].target];
                        if (!defE || dmgResults[di].minDmg <= 0) continue;
                        var atkMaxHP = act.entry.maxHP;
                        // Defender ability (Iron Barbs, Rough Skin)
                        if (CONTACT_DAMAGE_ABILITIES[defE.ability]) {
                            var frac = CONTACT_DAMAGE_ABILITIES[defE.ability];
                            var cDmg = Math.max(1, Math.floor(atkMaxHP * frac));
                            actionExtras.push({ target: 'attacker', source: defE.ability + ' (' + defE.name + ')', damage: cDmg, type: 'contact' });
                            act.entry.currentHP = Math.max(0, act.entry.currentHP - cDmg);
                            if (act.entry.bestCaseHP != null) act.entry.bestCaseHP = Math.max(0, act.entry.bestCaseHP - cDmg);
                        }
                        // Defender item (Rocky Helmet)
                        if (CONTACT_DAMAGE_ITEMS[defE.item]) {
                            var frac2 = CONTACT_DAMAGE_ITEMS[defE.item];
                            var cDmg2 = Math.max(1, Math.floor(atkMaxHP * frac2));
                            actionExtras.push({ target: 'attacker', source: defE.item + ' (' + defE.name + ')', damage: cDmg2, type: 'contact' });
                            act.entry.currentHP = Math.max(0, act.entry.currentHP - cDmg2);
                            if (act.entry.bestCaseHP != null) act.entry.bestCaseHP = Math.max(0, act.entry.bestCaseHP - cDmg2);
                        }
                    }
                }
            }

            // Resolve secondary effects (flinch, status, boosts)
            if (moveData && dmgResults.length > 0) {
                var eff = resolveSecondaryEffects(moveData, null, true); // guaranteed effects only
                if (eff.volatile === 'flinch') {
                    // Flinch all targets that were hit and haven't moved yet
                    for (var di = 0; di < dmgResults.length; di++) {
                        var hitSlot = dmgResults[di].target;
                        var hitEntry = fighters[hitSlot];
                        // Inner Focus and Shield Dust prevent flinch
                        if (hitEntry && hitEntry.ability !== 'Inner Focus' && hitEntry.ability !== 'Shield Dust') {
                            flinched[hitSlot] = true;
                        }
                    }
                }
                // Apply status/boosts to targets
                if (eff.status) {
                    for (var di = 0; di < dmgResults.length; di++) {
                        var hitEntry2 = fighters[dmgResults[di].target];
                        if (hitEntry2 && !hitEntry2.status && hitEntry2.currentHP > 0) {
                            hitEntry2.status = eff.status;
                        }
                    }
                }
                if (eff.boosts) {
                    for (var di = 0; di < dmgResults.length; di++) {
                        var hitEntry3 = fighters[dmgResults[di].target];
                        if (hitEntry3 && hitEntry3.currentHP > 0) applyBoosts(hitEntry3, eff.boosts);
                    }
                }
                if (eff.selfBoosts) {
                    applyBoosts(act.entry, eff.selfBoosts);
                }
            }

            roundActions.push({
                slot: sid,
                name: act.entry.name,
                move: act.moveName,
                moveData: moveData,
                targets: dmgResults,
                extras: actionExtras,
                speed: order[oi].speed,
                priority: order[oi].priority,
                flinched: false
            });
        }

        // EOT for all mons
        var eotAll = {};
        for (var si = 0; si < slotIds.length; si++) {
            var sid = slotIds[si];
            var e = fighters[sid];
            if (!e || e.currentHP <= 0) continue;
            var eot = calcEndOfTurnDamage(e, weather);
            for (var ei = 0; ei < eot.length; ei++) {
                e.currentHP = Math.max(0, Math.min(e.maxHP, e.currentHP - eot[ei].damage));
                if (e.bestCaseHP != null) e.bestCaseHP = Math.max(0, Math.min(e.maxHP, e.bestCaseHP - eot[ei].damage));
            }
            eotAll[sid] = eot;

            // Toxic counter
            if (e.status === 'Badly Poisoned') e.toxicCounter = (e.toxicCounter || 0) + 1;
        }

        // HP after
        var hpAfter = {};
        var bestHPAfter = {};
        for (var sid in fighters) {
            if (fighters[sid]) {
                hpAfter[sid] = fighters[sid].currentHP;
                bestHPAfter[sid] = fighters[sid].bestCaseHP != null ? fighters[sid].bestCaseHP : fighters[sid].currentHP;
            }
        }

        // Build round data
        var rd = {
            roundNum: ++line.roundCounter,
            isDoubles: true,
            weather: weather,
            terrain: getTerrain(),
            trickRoom: tr,
            comment: comment || '',
            order: order,
            actions: roundActions,
            fighters: {},
            eot: eotAll
        };

        // Snapshot fighter state
        for (var sid in fighters) {
            var e = fighters[sid];
            if (!e) continue;
            rd.fighters[sid] = {
                name: e.name,
                sprite: e.sprite,
                item: e.item,
                ability: e.ability,
                status: e.status,
                hpBefore: hpBefore[sid] || 0,
                hpAfter: { current: hpAfter[sid] || 0, max: e.maxHP, bestCase: bestHPAfter[sid] || 0 },
                maxHP: e.maxHP
            };
        }

        // AI: predict switch-ins for fainted P2 mons (position-based: across the field)
        rd.switchPreds = {};
        if (fighters.p2a && fighters.p2a.currentHP <= 0) {
            // Left P2 fainted — predict using P1 right (across the field)
            try {
                var acrossEntry = fighters.p1b;
                rd.switchPreds.p2a = acrossEntry ? predictSwitchIn(acrossEntry.setId) : predictSwitchIn('$p1');
            } catch (e) {}
        }
        if (fighters.p2b && fighters.p2b.currentHP <= 0) {
            // Right P2 fainted — predict using P1 left (across the field)
            try {
                var acrossEntry = fighters.p1a;
                rd.switchPreds.p2b = acrossEntry ? predictSwitchIn(acrossEntry.setId) : predictSwitchIn('$p1');
            } catch (e) {}
        }

        return rd;
    }

    // ════════════════════════════════════════════════════════════
    // DOUBLES — ROUND LOG RENDERING
    // ════════════════════════════════════════════════════════════

    function renderDoublesRoundCard(rd) {
        var tags = '';
        if (rd.weather !== 'None') tags += '<span class="rsa-tag rsa-weather">' + esc(rd.weather) + '</span>';
        if (rd.terrain !== 'None') tags += '<span class="rsa-tag rsa-terrain">' + esc(rd.terrain) + '</span>';
        if (rd.trickRoom) tags += '<span class="rsa-tag rsa-trickroom">Trick Room</span>';

        // Speed order display with sprites
        var orderHtml = '';
        for (var oi = 0; oi < rd.order.length; oi++) {
            var o = rd.order[oi];
            var f = rd.fighters[o.slot];
            if (!f) continue;
            if (oi > 0) orderHtml += ' <span class="rsa-order-arrow">→</span> ';
            orderHtml += '<img class="rsa-order-sprite" src="' + esc(f.sprite) + '" alt="">';
            orderHtml += '<span class="rsa-order-name">' + esc(f.name) + '</span>';
            orderHtml += '<span class="rsa-order-spd">' + o.speed + '</span>';
            if (o.priority) orderHtml += '<span class="rsa-tag" style="font-size:0.6em">P+' + o.priority + '</span>';
        }

        // Build per-action cards (in turn order)
        var actionsHtml = '';
        for (var ai = 0; ai < rd.actions.length; ai++) {
            var act = rd.actions[ai];
            var f = rd.fighters[act.slot];
            if (!f) continue;
            var isP1 = act.slot.indexOf('p1') === 0;
            var cls = isP1 ? 'rsa-p1' : 'rsa-p2';
            var slotLabel = act.slot.indexOf('a') > 0 ? 'L' : 'R';
            var slotCls = slotLabel === 'L' ? 'rsa-dbl-panel-slot-label-left' : 'rsa-dbl-panel-slot-label-right';
            var bPct = f.maxHP > 0 ? (f.hpBefore / f.maxHP * 100) : 0;
            var bCol = hpColor(bPct);

            actionsHtml += '<div class="rsa-dbl-action-card ' + cls + '">';

            // Actor header: sprite + name + item + ability + HP bar before
            actionsHtml += '<div class="rsa-actor-header">' +
                '<img class="rsa-sprite" src="' + esc(f.sprite) + '" alt="">' +
                '<div class="rsa-actor-info">' +
                    '<div class="rsa-actor-name">' + esc(f.name) + ' <span class="rsa-dbl-panel-slot-label ' + slotCls + '">' + slotLabel + '</span></div>' +
                    '<div class="rsa-actor-tags">' +
                        '<span class="rsa-tag rsa-item-tag" title="' + esc(getItemDesc(f.item)) + '"><img class="rsa-item-sprite-sm" src="' + esc(getItemSpriteUrl(f.item)) + '" alt="" onerror="this.style.display=\'none\'"> ' + esc(f.item) + '</span>' +
                        '<span class="rsa-tag rsa-ability-tag" title="' + esc(getAbilityDesc(f.ability)) + '">' + esc(f.ability) + '</span>' +
                        (f.status ? '<span class="rsa-tag rsa-status-tag rsa-status-' + f.status.toLowerCase().replace(/\s+/g, '-') + '">' + esc(f.status) + '</span>' : '') +
                    '</div>' +
                    '<div class="rsa-hp-bar-wrap"><div class="rsa-hp-bar" style="width:' + bPct.toFixed(0) + '%;background:' + bCol + '"></div></div>' +
                    '<span class="rsa-hp-text">' + f.hpBefore + '/' + f.maxHP + '</span>' +
                '</div>' +
            '</div>';

            // Move info
            if (act.flinched) {
                var md = act.moveData;
                var typeSprite = md && md.type ? '<img class="rsa-type-sprite" src="' + esc(getTypeSpriteUrl(md.type)) + '" alt="" title="' + esc(md.type) + '">' : '';
                var catSprite = md && md.category ? '<img class="rsa-cat-sprite" src="' + esc(getCategorySpriteUrl(md.category)) + '" alt="" title="' + esc(md.category) + '">' : '';
                actionsHtml += '<div class="rsa-move-line">' +
                    '<div class="rsa-move-name">' + typeSprite + catSprite + ' ' + esc(act.move) + '</div>' +
                    '<span class="rsa-tag rsa-flinch-tag">FLINCHED</span>' +
                '</div>';
            } else if (!act.move || act.move === '—') {
                actionsHtml += '<div class="rsa-move-name rsa-no-move">— No Move</div>';
            } else {
                var md = act.moveData;
                var typeSprite = md && md.type ? '<img class="rsa-type-sprite" src="' + esc(getTypeSpriteUrl(md.type)) + '" alt="" title="' + esc(md.type) + '">' : '';
                var catSprite = md && md.category ? '<img class="rsa-cat-sprite" src="' + esc(getCategorySpriteUrl(md.category)) + '" alt="" title="' + esc(md.category) + '">' : '';
                var moveStats = '';
                if (md) {
                    var statParts = [];
                    if (md.basePower) statParts.push('BP: ' + md.basePower);
                    if (md.priority && md.priority !== 0) {
                        var prioSign = md.priority > 0 ? '+' : '';
                        statParts.push('<span class="rsa-prio-tag">Prio ' + prioSign + md.priority + '</span>');
                    }
                    if (statParts.length) moveStats = '<span class="rsa-move-stats">' + statParts.join(' · ') + '</span>';
                }
                actionsHtml += '<div class="rsa-move-line">' +
                    '<div class="rsa-move-name">' + typeSprite + catSprite + ' ' + esc(act.move) + '</div>' +
                    moveStats +
                '</div>';

                // Damage to each target — with target sprite + HP bar
                if (act.targets && act.targets.length > 0) {
                    for (var ti = 0; ti < act.targets.length; ti++) {
                        var t = act.targets[ti];
                        var tFighter = rd.fighters[t.target];
                        var tSlotLabel = t.target && t.target.indexOf('a') > 0 ? 'L' : 'R';
                        var killBadge = t.ko ? ' <span class="rsa-tag rsa-ko-tag">KO</span>' : '';
                        var sashBadge = t.sashed ? ' <span class="rsa-tag rsa-sash-tag">Sash!</span>' : '';

                        actionsHtml += '<div class="rsa-dbl-target-result">';
                        if (tFighter) {
                            actionsHtml += '<img class="rsa-target-sprite" src="' + esc(tFighter.sprite) + '" alt="">';
                        }
                        actionsHtml += '<span class="rsa-target-arrow">→</span>';
                        actionsHtml += '<span class="rsa-target-name">' + esc(t.targetName) + ' [' + tSlotLabel + ']</span>';
                        actionsHtml += '<span class="rsa-dmg-range">' + t.minDmg + '-' + t.maxDmg + ' dmg</span>';
                        actionsHtml += killBadge + sashBadge;
                        actionsHtml += '</div>';
                    }
                }
            }

            // Extra damage sources (Life Orb, Iron Barbs, etc.)
            if (act.extras && act.extras.length > 0) {
                actionsHtml += '<div class="rsa-extras">';
                for (var ei = 0; ei < act.extras.length; ei++) {
                    var ex = act.extras[ei];
                    var sign = ex.damage > 0 ? '-' : '+';
                    var absD = Math.abs(ex.damage);
                    var exCls = ex.damage > 0 ? 'rsa-extra-dmg' : 'rsa-extra-heal';
                    actionsHtml += '<span class="rsa-extra ' + exCls + '">' + esc(ex.source) + ': ' + sign + absD + '</span>';
                }
                actionsHtml += '</div>';
            }

            actionsHtml += '</div>'; // close action card
        }

        // HP summary after round (4 mini cards with HP bars)
        var hpHtml = '<div class="rsa-dbl-hp-summary">';
        var sids = ['p2a', 'p2b', 'p1a', 'p1b'];
        for (var si = 0; si < sids.length; si++) {
            var sid = sids[si];
            var f = rd.fighters[sid];
            if (!f) continue;
            // Support both old (number) and new (object) hpAfter format
            var hpAfterCur = typeof f.hpAfter === 'object' ? f.hpAfter.current : f.hpAfter;
            var hpAfterBest = typeof f.hpAfter === 'object' ? f.hpAfter.bestCase : hpAfterCur;
            var aPct = f.maxHP > 0 ? (hpAfterCur / f.maxHP * 100) : 0;
            var aCol = hpColor(aPct);
            var diff = f.hpBefore - hpAfterCur;
            var isP1 = sid.indexOf('p1') === 0;
            var slotLabel = sid.indexOf('a') > 0 ? 'L' : 'R';
            var nameCls = isP1 ? 'rsa-p1' : 'rsa-p2';

            // Damage range visualization (striped bar for uncertainty)
            var stripedBar = '';
            var rangeText = '';
            if (isP1 && hpAfterBest > hpAfterCur && f.maxHP > 0) {
                // P1 best case = more HP surviving
                var bestPct = (hpAfterBest / f.maxHP * 100);
                var uncertPct = bestPct - aPct;
                stripedBar = '<div class="rsa-hp-bar rsa-hp-bar-uncertain" style="width:' + uncertPct.toFixed(0) + '%;left:' + aPct.toFixed(0) + '%"></div>';
                rangeText = ' <span class="rsa-hp-range">(' + hpAfterCur + '–' + hpAfterBest + ')</span>';
            } else if (!isP1 && hpAfterBest < hpAfterCur && f.maxHP > 0) {
                // P2 best case (for P1) = less HP remaining on P2
                var bestPct2 = (hpAfterBest / f.maxHP * 100);
                var uncertPct2 = aPct - bestPct2;
                stripedBar = '<div class="rsa-hp-bar rsa-hp-bar-uncertain rsa-hp-bar-uncertain-p2" style="width:' + uncertPct2.toFixed(0) + '%;left:' + bestPct2.toFixed(0) + '%"></div>';
                rangeText = ' <span class="rsa-hp-range">(' + hpAfterBest + '–' + hpAfterCur + ')</span>';
            }

            hpHtml += '<div class="rsa-dbl-hp-entry">';
            hpHtml += '<img class="rsa-hp-sprite" src="' + esc(f.sprite) + '" alt="">';
            hpHtml += '<div class="rsa-hp-entry-info">';
            hpHtml += '<span class="' + nameCls + '" style="font-size:0.8em;font-weight:600">' + esc(f.name) + ' [' + slotLabel + ']</span>';
            hpHtml += '<div class="rsa-hp-bar-wrap" style="height:6px;position:relative"><div class="rsa-hp-bar" style="width:' + aPct.toFixed(0) + '%;background:' + aCol + '"></div>' + stripedBar + '</div>';
            hpHtml += '<span class="rsa-hp-text" style="font-size:0.7em">' + hpAfterCur + '/' + f.maxHP + rangeText;
            if (diff > 0) hpHtml += ' <span class="rsa-hp-diff">-' + diff + '</span>';
            if (hpAfterCur <= 0) hpHtml += ' <span class="rsa-tag rsa-ko-tag" style="font-size:0.8em">KO</span>';
            hpHtml += '</span>';

            // EOT for this slot
            if (rd.eot && rd.eot[sid] && rd.eot[sid].length > 0) {
                for (var ei = 0; ei < rd.eot[sid].length; ei++) {
                    var e = rd.eot[sid][ei];
                    var eSign = e.damage > 0 ? '-' : '+';
                    var eAbsD = Math.abs(e.damage);
                    var eCls = e.damage > 0 ? 'rsa-extra-dmg' : 'rsa-extra-heal';
                    hpHtml += '<span class="rsa-extra ' + eCls + '" style="font-size:0.65em">' + esc(e.source) + ': ' + eSign + eAbsD + '</span>';
                }
            }

            hpHtml += '</div></div>';
        }
        hpHtml += '</div>';

        var cmnt = rd.comment ? '<div class="rsa-comment">' + esc(rd.comment) + '</div>' : '';

        // Switch prediction for fainted P2 mons
        var switchPredHtml = '';
        if (rd.switchPreds) {
            for (var spSlot in rd.switchPreds) {
                var sp = rd.switchPreds[spSlot];
                if (!sp) continue;
                var slotLabel = spSlot === 'p2a' ? 'Left' : 'Right';
                switchPredHtml += '<div class="rsa-round-switchpred">' +
                    '<span class="rsa-swpred-label">🔮 AI sends (' + slotLabel + '):</span>' +
                    '<img class="rsa-swpred-sprite" src="' + esc(sp.sprite) + '" alt="">' +
                    '<span class="rsa-swpred-name">' + esc(sp.name) + '</span>' +
                    '<span class="rsa-swpred-detail">(' + (sp.score > 0 ? '+' : '') + sp.score + ' — ' + esc(sp.reason) + ')</span>' +
                '</div>';
            }
        }

        return '<div class="rsa-round-card rsa-round-card-doubles" data-round="' + rd.roundNum + '">' +
            '<div class="rsa-round-header">' +
                '<span class="rsa-round-num">Round ' + rd.roundNum + ' (Doubles)</span>' +
                tags +
                '<button class="rsa-delete-round" data-round="' + rd.roundNum + '" title="Delete round">×</button>' +
            '</div>' +
            '<div class="rsa-dbl-order">⚡ ' + orderHtml + '</div>' +
            '<div class="rsa-round-body rsa-round-body-doubles">' + actionsHtml + '</div>' +
            hpHtml + switchPredHtml + cmnt +
        '</div>';
    }

    function getMoveNames(sideIdx, moveIdx) {
        if (moveIdx === 'none' || moveIdx === -1) return '—';
        var side = sideIdx === 0 ? 'L' : 'R';
        var $label = $('label[for="resultMove' + side + (moveIdx + 1) + '"]');
        // If we injected HTML, use the name span; otherwise fall back to .text()
        var nameSpan = $label.find('.rsa-btn-move-name').text();
        if (nameSpan) return nameSpan.trim();
        var label = $label.text();
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
        // Reset all roster HP/status/items to initial state
        for (var s = 0; s < 2; s++) {
            var side = s === 0 ? 'p1' : 'p2';
            var team = line.teams[side];
            for (var i = 0; i < team.roster.length; i++) {
                var entry = team.roster[i];
                entry.currentHP = entry.maxHP;
                entry.bestCaseHP = entry.maxHP;
                entry.status = '';
                entry.toxicCounter = 0;
                entry.boosts = { at: 0, df: 0, sa: 0, sd: 0, sp: 0 };
                // Restore consumed items (Focus Sash, berries, etc.) to their initial value
                if (entry.initialItem !== undefined) {
                    entry.item = entry.initialItem;
                }
            }
        }
        // Replay rounds to reconstruct HP/status/boosts/items
        for (var i = 0; i < line.rounds.length; i++) {
            var rd = line.rounds[i];

            if (rd.isDoubles && rd.fighters) {
                // Doubles round: each fighter slot has hpAfter, item, status
                var slotToTeam = {
                    p1a: { team: line.teams.p1, idxKey: 'activeIdx' },
                    p1b: { team: line.teams.p1, idxKey: 'activeIdxB' },
                    p2a: { team: line.teams.p2, idxKey: 'activeIdx' },
                    p2b: { team: line.teams.p2, idxKey: 'activeIdxB' }
                };
                for (var sid in rd.fighters) {
                    var f = rd.fighters[sid];
                    var mapping = slotToTeam[sid];
                    if (!f || !mapping) continue;
                    var ri = findInRoster(mapping.team, f.name);
                    if (ri >= 0) {
                        var fHpCur = typeof f.hpAfter === 'object' ? f.hpAfter.current : f.hpAfter;
                        var fHpBest = typeof f.hpAfter === 'object' ? (f.hpAfter.bestCase != null ? f.hpAfter.bestCase : fHpCur) : fHpCur;
                        mapping.team.roster[ri].currentHP = fHpCur;
                        mapping.team.roster[ri].bestCaseHP = fHpBest;
                        if (f.item !== undefined) mapping.team.roster[ri].item = f.item;
                        if (f.status !== undefined) mapping.team.roster[ri].status = f.status;
                        mapping.team[mapping.idxKey] = ri;
                    }
                }
            } else {
                // Singles round
                var p1i = findInRoster(line.teams.p1, rd.p1.name);
                if (p1i >= 0) {
                    line.teams.p1.roster[p1i].currentHP = rd.p1.hpAfter.current;
                    line.teams.p1.roster[p1i].bestCaseHP = rd.p1.hpAfter.bestCase != null ? rd.p1.hpAfter.bestCase : rd.p1.hpAfter.current;
                    if (rd.p1.status) line.teams.p1.roster[p1i].status = rd.p1.status;
                    if (rd.p1.boosts) line.teams.p1.roster[p1i].boosts = $.extend({}, rd.p1.boosts);
                    if (rd.p1.item !== undefined) line.teams.p1.roster[p1i].item = rd.p1.item;
                    line.teams.p1.activeIdx = p1i;
                }
                var p2i = findInRoster(line.teams.p2, rd.p2.name);
                if (p2i >= 0) {
                    line.teams.p2.roster[p2i].currentHP = rd.p2.hpAfter.current;
                    line.teams.p2.roster[p2i].bestCaseHP = rd.p2.hpAfter.bestCase != null ? rd.p2.hpAfter.bestCase : rd.p2.hpAfter.current;
                    if (rd.p2.status) line.teams.p2.roster[p2i].status = rd.p2.status;
                    if (rd.p2.boosts) line.teams.p2.roster[p2i].boosts = $.extend({}, rd.p2.boosts);
                    if (rd.p2.item !== undefined) line.teams.p2.roster[p2i].item = rd.p2.item;
                    line.teams.p2.activeIdx = p2i;
                }
            }
        }
        // Renumber remaining rounds sequentially
        line.roundCounter = 0;
        for (var i = 0; i < line.rounds.length; i++) {
            line.rounds[i].roundNum = ++line.roundCounter;
        }
        // Sync the updated HP and item to calc form
        var p1Active = getActiveEntry(line.teams.p1);
        var p2Active = getActiveEntry(line.teams.p2);
        if (p1Active) {
            $('#p1 .current-hp').val(p1Active.currentHP);
            $('#p1 .item').val(p1Active.item || '').trigger('change');
        }
        if (p2Active) {
            $('#p2 .current-hp').val(p2Active.currentHP);
            $('#p2 .item').val(p2Active.item || '').trigger('change');
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
        var $active = $('#rsa-active-' + side);
        if (!$panel.length) return;

        // In doubles, render the active field slots
        if (isDoubles() && $active.length) {
            var activeHtml = '';
            var slots = [
                { idx: team.activeIdx, label: 'Left', cls: 'rsa-slot-left' },
                { idx: team.activeIdxB, label: 'Right', cls: 'rsa-slot-right' }
            ];
            for (var si = 0; si < slots.length; si++) {
                var s = slots[si];
                var e = (s.idx >= 0 && s.idx < team.roster.length) ? team.roster[s.idx] : null;
                if (e) {
                    var pct = hpPct(e.currentHP, e.maxHP);
                    var col = hpColor(pct);
                    var faintCls = e.currentHP <= 0 ? ' rsa-fainted' : '';
                    activeHtml += '<div class="rsa-active-slot ' + s.cls + faintCls + '" data-side="' + side + '" data-idx="' + s.idx + '">' +
                        '<div class="rsa-field-label">' + s.label + '</div>' +
                        '<img class="rsa-team-sprite" src="' + esc(e.sprite) + '" alt="' + esc(e.name) + '">' +
                        '<div class="rsa-team-name">' + esc(e.name) + '</div>' +
                        '<div class="rsa-team-hp-bar"><div class="rsa-team-hp-fill" style="width:' + pct.toFixed(0) + '%;background:' + col + '"></div></div>' +
                        '<div class="rsa-team-hp-text" style="font-size:0.7em">' + e.currentHP + '/' + e.maxHP + '</div>' +
                        (e.status ? '<span class="rsa-status-badge rsa-status-' + e.status.toLowerCase().replace(/\s+/g, '-') + '" style="font-size:0.65em">' + esc(e.status) + '</span>' : '') +
                    '</div>';
                } else {
                    activeHtml += '<div class="rsa-active-slot ' + s.cls + '" data-side="' + side + '"><div class="rsa-field-label">' + s.label + '</div><span style="color:#718096;font-size:0.8em">Empty</span></div>';
                }
            }
            $active.html(activeHtml);
        }

        // Render roster (bench in doubles, full roster in singles)
        var html = '';
        if (isDoubles()) {
            html += '<div class="rsa-bench-label">Bench</div>';
        }
        for (var i = 0; i < team.roster.length; i++) {
            try {
            var e = team.roster[i];
            var isActiveA = (i === team.activeIdx);
            var isActiveB = (isDoubles() && i === team.activeIdxB);
            var active = isActiveA ? ' rsa-active' : (isActiveB ? ' rsa-active rsa-active-b' : '');
            var pct = hpPct(e.currentHP, e.maxHP);
            var col = hpColor(pct);
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

            // Defensive type tooltip for team sprites
            var teamDefTooltip = e.name;
            try {
                var tInfo = getMonTypeInfo(e.name, e.setId);
                teamDefTooltip = buildDefTooltip(e.name, tInfo.types, tInfo.ability);
            } catch (ex) {}

            // Speed stat lookup
            var speedText = '';
            try {
                var tmpPoke = createPokemon(e.setId);
                if (tmpPoke && tmpPoke.stats && tmpPoke.stats.spe) {
                    speedText = '<span class="rsa-team-speed" title="Speed: ' + tmpPoke.stats.spe + '">⚡' + tmpPoke.stats.spe + '</span>';
                }
            } catch (ex) {}

            // Item row: dropdown for P1, static badge for P2
            var itemHtml = (side === 'p1')
                ? '<select class="rsa-item-select" data-side="' + side + '" data-idx="' + i + '">' + getItemOptionsHtml() + '</select>'
                : (e.item ? '<span class="rsa-item-badge" title="' + esc(getItemDesc(e.item)) + '"><img class="rsa-item-sprite" src="' + esc(getItemSpriteUrl(e.item)) + '" alt="" onerror="this.style.display=\'none\'"> ' + esc(e.item) + '</span>' : '');

            var dragAttr = isDoubles() ? ' draggable="true"' : '';
            html += '<div class="rsa-team-slot rsa-team-slot-' + side + active + fainted + statusCls + ccClass + '"' + dragAttr + ' data-side="' + side + '" data-idx="' + i + '">' +
                '<img class="rsa-team-sprite" src="' + esc(e.sprite) + '" alt="' + esc(e.name) + '" title="' + esc(teamDefTooltip) + '">' +
                '<div class="rsa-team-info">' +
                    '<div class="rsa-team-name">' + esc(e.name) + ' ' + speedText + '</div>' +
                    '<div class="rsa-team-hp-bar"><div class="rsa-team-hp-fill" style="width:' + pct.toFixed(0) + '%;background:' + col + '"></div>' + teamUncertainBar + '</div>' +
                    '<div class="rsa-team-hp-text">' + e.currentHP + '/' + e.maxHP + ' ' + teamRangeText + '</div>' +
                    (e.status ? '<span class="rsa-status-badge rsa-status-' + e.status.toLowerCase().replace(/\s+/g, '-') + '">' + esc(e.status) + '</span>' : '') +
                    (e.ability ? '<span class="rsa-ability-badge" title="' + esc(getAbilityDesc(e.ability)) + '">' + esc(e.ability) + '</span>' : '') +
                    itemHtml +
                '</div>' +
                (side === 'p1' ? '<button class="rsa-team-remove" data-side="' + side + '" data-idx="' + i + '" title="Remove">×</button>' : '') +
            '</div>';
            } catch (ex) { /* skip slot on error */ }
        }

        $panel.html(html);

        // Set item select values for P1 (options are cached without 'selected', set via JS)
        if (side === 'p1') {
            $panel.find('.rsa-item-select').each(function () {
                var idx = parseInt($(this).data('idx'));
                this.value = (team.roster[idx] && team.roster[idx].item) || '';
            });
        }

        // Update counter badges
        $('#rsa-team-count-' + side).text(team.roster.length);

        // Keep switch dropdown in sync whenever P1 team changes
        if (side === 'p1') {
            populateSwitchDropdown();
            renderSwitchPrediction();
        }
    }

    /** Render the AI switch-in prediction below the P1 team panel */
    function renderSwitchPrediction() {
        var $el = $('#rsa-switch-pred');
        if (!$el.length) return;
        try {
            cachedSwitchPred = predictSwitchIn('$p1');
        } catch (e) { cachedSwitchPred = null; }
        if (!cachedSwitchPred) { $el.html(''); return; }
        var pred = cachedSwitchPred;
        var scoresCells = '';
        if (pred.scores && pred.scores.length) {
            for (var i = 0; i < pred.scores.length; i++) {
                var s = pred.scores[i];
                var cls = s.score > 0 ? 'rsa-swpred-pos' : (s.score < 0 ? 'rsa-swpred-neg' : '');
                var best = s.name === pred.name ? ' rsa-swpred-best' : '';
                scoresCells += '<span class="rsa-swpred-score' + best + '" title="' + esc(s.name) + ': ' + esc(s.reason) + '">' +
                    '<img class="rsa-swpred-mini" src="' + esc(s.sprite) + '" alt="">' +
                    '<span class="' + cls + '">' + (s.score > 0 ? '+' : '') + s.score + '</span></span>';
            }
        }
        $el.html(
            '<div class="rsa-swpred-bar">' +
                '<span class="rsa-swpred-label">🔮 AI sends:</span>' +
                '<img class="rsa-swpred-sprite" src="' + esc(pred.sprite) + '" alt="">' +
                '<span class="rsa-swpred-name">' + esc(pred.name) + '</span>' +
                '<span class="rsa-swpred-detail">(' + (pred.score > 0 ? '+' : '') + pred.score + ' — ' + esc(pred.reason) + ')</span>' +
            '</div>' +
            (scoresCells ? '<div class="rsa-swpred-all">' + scoresCells + '</div>' : '')
        );
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
            var rd = line.rounds[i];
            html += rd.isDoubles ? renderDoublesRoundCard(rd) : renderRoundCard(rd);
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

        // Switch-in prediction for KO rounds
        var switchPredHtml = '';
        if (rd.switchPred) {
            var sp = rd.switchPred;
            switchPredHtml = '<div class="rsa-round-switchpred">' +
                '<span class="rsa-swpred-label">🔮 AI sends:</span>' +
                '<img class="rsa-swpred-sprite" src="' + esc(sp.sprite) + '" alt="">' +
                '<span class="rsa-swpred-name">' + esc(sp.name) + '</span>' +
                '<span class="rsa-swpred-detail">(' + (sp.score > 0 ? '+' : '') + sp.score + ' — ' + esc(sp.reason) + ')</span>' +
            '</div>';
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
            switchPredHtml +
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

            // Move stats line (BP / Acc / PP / Priority)
            var moveStats = '';
            if (md) {
                var statParts = [];
                if (md.basePower) statParts.push('BP: ' + md.basePower);
                if (md.accuracy === true) statParts.push('Acc: —');
                else if (md.accuracy) statParts.push('Acc: ' + md.accuracy);
                if (md.pp) statParts.push('PP: ' + md.pp);
                if (md.priority && md.priority !== 0) {
                    var prioSign = md.priority > 0 ? '+' : '';
                    statParts.push('<span class="rsa-prio-tag">Prio ' + prioSign + md.priority + '</span>');
                }
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
                        '<span class="rsa-tag rsa-item-tag" title="' + esc(getItemDesc(actor.item)) + '"><img class="rsa-item-sprite-sm" src="' + esc(getItemSpriteUrl(actor.item)) + '" alt="" onerror="this.style.display=\'none\'"> ' + esc(actor.item) + '</span>' +
                        '<span class="rsa-tag rsa-ability-tag" title="' + esc(getAbilityDesc(actor.ability)) + '">' + esc(actor.ability) + '</span>' +
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
        if (isDoubles()) refreshDoublesUI();
    }

    function populateSwitchDropdown() {
        var line = curLine();
        var team = line.teams.p1;

        if (isDoubles()) {
            // Doubles: populate per-slot switch dropdowns
            var activeA = team.activeIdx;
            var activeB = team.activeIdxB;
            var htmlA = '<option value=\"\">— Switch Left —</option>';
            var htmlB = '<option value=\"\">— Switch Right —</option>';
            for (var i = 0; i < team.roster.length; i++) {
                if (i === activeA || i === activeB) continue;
                if (team.roster[i].currentHP <= 0) continue;
                // In 2-trainer mode, check team split
                if (battleFormat === 'doubles-2t' && line.teamSplit) {
                    var leftMax = line.teamSplit.left || 3;
                    var isLeft = i < leftMax;
                    var isRight = i >= leftMax;
                    if (isLeft) htmlA += '<option value=\"' + i + '\">' + esc(team.roster[i].name) + '</option>';
                    if (isRight) htmlB += '<option value=\"' + i + '\">' + esc(team.roster[i].name) + '</option>';
                } else {
                    var opt = '<option value=\"' + i + '\">' + esc(team.roster[i].name) + '</option>';
                    htmlA += opt;
                    htmlB += opt;
                }
            }
            $('#rsa-switch-p1a').html(htmlA);
            $('#rsa-switch-p1b').html(htmlB);
        } else {
            // Singles: existing logic
            var $sel = $('#rsa-switch-p1');
            var html = '<option value=\"\">— Switch P1 —</option>';
            for (var i = 0; i < team.roster.length; i++) {
                if (i === team.activeIdx) continue;
                if (team.roster[i].currentHP <= 0) continue;
                html += '<option value=\"' + i + '\">' + esc(team.roster[i].name) + '</option>';
            }
            $sel.html(html);
        }
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

    /** Auto-select the most probable P2 move based on AI percentages */
    function autoSelectP2MostProbable() {
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
            selectedP2Move = maxIdx - 1; // 0-indexed
            // Programmatically check the radio button
            var radioId = '#resultMoveR' + maxIdx;
            $(radioId).prop('checked', true);
            updateMovePickDisplay();
            // Recompute defensive rankings for the auto-selected P2 move
            setTimeout(function () {
                try { cachedRankings = computeBoxRankings(); } catch (e) { cachedRankings = []; }
                renderBox('p1');
            }, 50);
        }
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
            var species = calc.SPECIES[gen || 9][pokeName];
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

    function injectMoveLabelSprites() {
        var sides = [
            { prefix: 'L', sideIdx: 0 },
            { prefix: 'R', sideIdx: 1 }
        ];
        for (var s = 0; s < sides.length; s++) {
            var side = sides[s];
            for (var i = 1; i <= 4; i++) {
                var $label = $('label[for="resultMove' + side.prefix + i + '"]');
                if (!$label.length) continue;

                // Get current move name — prefer existing name span, else plain text
                var moveName = $label.find('.rsa-btn-move-name').text().trim() || $label.text().trim();
                if (!moveName || moveName === 'Loading...') continue;

                var md = lookupMoveData(moveName);
                var typeImg = '';
                var catImg = '';
                if (md) {
                    if (md.type) typeImg = '<img class="rsa-btn-type-sprite" src="' + esc(getTypeSpriteUrl(md.type)) + '" alt="' + esc(md.type) + '" title="' + esc(md.type) + '">';
                    if (md.category) catImg = '<img class="rsa-btn-cat-sprite" src="' + esc(getCategorySpriteUrl(md.category)) + '" alt="' + esc(md.category) + '" title="' + esc(md.category) + '">';
                }
                $label.html(
                    '<span class="rsa-btn-move-sprites">' + typeImg + catImg + '</span>' +
                    '<span class="rsa-btn-move-name">' + esc(moveName) + '</span>'
                );
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
            // Filter mons hidden via the delete-from-box feature
            mons = mons.filter(function (m) { return boxExcluded.indexOf(m.setId) === -1; });
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

    /** Render the type coverage analysis modal content */
    function renderCoverageModal() {
        var data = buildCoverageAnalysis();
        if (!data) return '<p>No box pokemon to analyse.</p>';

        var html = '<div class="rsa-cov-grid">';
        html += '<div class="rsa-cov-header">' +
            '<span class="rsa-cov-th">Type</span>' +
            '<span class="rsa-cov-th">Immune</span>' +
            '<span class="rsa-cov-th">¼×</span>' +
            '<span class="rsa-cov-th">½×</span>' +
            '<span class="rsa-cov-th">2×</span>' +
            '<span class="rsa-cov-th">4×</span>' +
            '<span class="rsa-cov-th">Best Phys Wall</span>' +
            '<span class="rsa-cov-th">Best Spec Wall</span>' +
        '</div>';

        for (var t = 0; t < ALL_TYPES.length; t++) {
            var type = ALL_TYPES[t];
            var c = data.coverage[type];
            var w = data.bestWalls[type];
            var typeImg = '<img class="rsa-cov-type-sprite" src="' + esc(getTypeSpriteUrl(type)) + '" alt="' + type + '">';

            html += '<div class="rsa-cov-row">' +
                '<span class="rsa-cov-cell rsa-cov-type">' + typeImg + '</span>' +
                '<span class="rsa-cov-cell rsa-cov-immune" title="' + esc(c.immune.join(', ')) + '">' + c.immune.length + '</span>' +
                '<span class="rsa-cov-cell rsa-cov-qresist" title="' + esc(c.quad_resist.join(', ')) + '">' + c.quad_resist.length + '</span>' +
                '<span class="rsa-cov-cell rsa-cov-resist" title="' + esc(c.resist.join(', ')) + '">' + c.resist.length + '</span>' +
                '<span class="rsa-cov-cell rsa-cov-weak" title="' + esc(c.weak.join(', ')) + '">' + c.weak.length + '</span>' +
                '<span class="rsa-cov-cell rsa-cov-qweak" title="' + esc(c.quad_weak.join(', ')) + '">' + c.quad_weak.length + '</span>' +
                '<span class="rsa-cov-cell rsa-cov-wall" title="Best physical wall vs ' + type + '">' + esc(w.physical || '—') + '</span>' +
                '<span class="rsa-cov-cell rsa-cov-wall" title="Best special wall vs ' + type + '">' + esc(w.special || '—') + '</span>' +
            '</div>';
        }
        html += '</div>';
        return html;
    }

    /** Remove items from all box mons and persist */
    function removeAllBoxItems() {
        if (!confirm('Remove items from ALL box Pokémon? This is persistent.')) return;

        // customsets structure: { pokemonName: { setName: { item, moves, ... } } }
        var customSets = {};
        try { customSets = JSON.parse(localStorage.getItem('customsets') || '{}'); } catch (e) {}
        var changed = false;

        var mons = getBoxPokemon('p1');
        for (var i = 0; i < mons.length; i++) {
            var setId = mons[i].setId;
            var parts = String(setId).match(/^(.+?) \((.+)\)$/);
            if (!parts) continue;
            var pokeName = parts[1];
            var setName = parts[2];

            // Clear item in live setdex (runtime, all gen dexes)
            var dexes = [window.setdex, window.SETDEX_SV, window.SETDEX_SS,
                         window.SETDEX_SM, window.SETDEX_XY, window.SETDEX_BW,
                         window.SETDEX_DPP, window.SETDEX_ADV, window.SETDEX_GSC,
                         window.SETDEX_RBY];
            for (var d = 0; d < dexes.length; d++) {
                if (dexes[d] && dexes[d][pokeName] && dexes[d][pokeName][setName]) {
                    dexes[d][pokeName][setName].item = '';
                }
            }

            // Clear item in persisted customsets (correct two-level structure)
            if (customSets[pokeName] && customSets[pokeName][setName]) {
                customSets[pokeName][setName].item = '';
                changed = true;
            }
        }

        if (changed) {
            localStorage.setItem('customsets', JSON.stringify(customSets));
        }

        // Clear the currently loaded P1 item in the calc form
        $('#p1 .item').val('').trigger('change');

        renderBox('p1');
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

        // Build rank lookup for P1 box
        var rankMap = {};
        if (side === 'p1' && cachedRankings.length) {
            for (var r = 0; r < cachedRankings.length; r++) {
                rankMap[cachedRankings[r].name] = cachedRankings[r];
            }
        }

        // Sort if needed
        if (side === 'p1' && boxSortMode !== 'default' && cachedRankings.length) {
            var sorted = mons.slice();
            sorted.sort(function(a, b) {
                var ra = rankMap[a.name], rb = rankMap[b.name];
                if (!ra) return 1; if (!rb) return -1;
                if (boxSortMode === 'offense') return (ra.offRank || 999) - (rb.offRank || 999);
                if (boxSortMode === 'defense') return (ra.defRank != null ? ra.defRank : 999) - (rb.defRank != null ? rb.defRank : 999);
                if (boxSortMode === 'defenseAll') return (ra.defAllRank != null ? ra.defAllRank : 999) - (rb.defAllRank != null ? rb.defAllRank : 999);
                return 0;
            });
            mons = sorted;
        }

        // Build bait prediction map for each box mon (what P2 switches in at full HP)
        var boxBaitMap = null;
        if (side === 'p1' && curLine().teams.p2.roster.length >= 2) {
            boxBaitMap = {};
            for (var b = 0; b < mons.length; b++) {
                try {
                    var pred = predictSwitchIn(mons[b].setId);
                    if (pred) boxBaitMap[mons[b].setId] = pred;
                } catch (e) {}
            }
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

            // Defensive type tooltip
            var tooltip = m.name;
            try {
                var info = getMonTypeInfo(m.name, m.setId);
                tooltip = buildDefTooltip(m.name, info.types, info.ability);
            } catch(e) {}

            // Rank badges (P1 only)
            var rankHtml = '';
            var speedHtml = '';
            if (side === 'p1' && rankMap[m.name]) {
                var rk = rankMap[m.name];
                var offBadge = '<span class="rsa-rank-off" title="Offense rank: #' + rk.offRank + ' (' + rk.offMax.toFixed(0) + '% max dmg)">⚔' + rk.offRank + '</span>';
                var defBadge = (rk.defRank != null)
                    ? '<span class="rsa-rank-def" title="Move defense rank: #' + rk.defRank + (rk.isImmune ? ' (IMMUNE)' : ' (' + (rk.defDmg != null ? rk.defDmg.toFixed(0) : '0') + '% dmg taken)') + '">' + (rk.defRank === 0 ? '🛡✦' : '🛡' + rk.defRank) + '</span>'
                    : '';
                var defAllBadge = (rk.defAllRank != null)
                    ? '<span class="rsa-rank-def-all" title="All-moves defense rank: #' + rk.defAllRank + (rk.isImmuneAll ? ' (IMMUNE TO ALL)' : ' (' + (rk.defAllMax != null ? rk.defAllMax.toFixed(0) : '0') + '% worst move)') + '">' + (rk.defAllRank === 0 ? '🛡A✦' : '🛡A' + rk.defAllRank) + '</span>'
                    : '';
                rankHtml = '<span class="rsa-rank-badges">' + offBadge + defBadge + defAllBadge + '</span>';
                if (rk.speed) speedHtml = '<span class="rsa-box-speed" title="Speed: ' + rk.speed + '">' + rk.speed + '</span>';
            }
            // Speed fallback: compute if no ranking but we can create the mon
            if (!speedHtml && side === 'p1') {
                try {
                    var tmpMon = createPokemon(m.setId);
                    if (tmpMon && tmpMon.stats && tmpMon.stats.spe) {
                        speedHtml = '<span class="rsa-box-speed" title="Speed: ' + tmpMon.stats.spe + '">' + tmpMon.stats.spe + '</span>';
                    }
                } catch (ex) {}
            }

            // Bait prediction (what P2 mon switches in if this box mon is out)
            var baitHtml = '';
            if (side === 'p1' && boxBaitMap && boxBaitMap[m.setId]) {
                var bp = boxBaitMap[m.setId];
                baitHtml = '<span class="rsa-bait-badge" title="AI sends ' + esc(bp.name) + ' (' + (bp.score > 0 ? '+' : '') + bp.score + ': ' + esc(bp.reason) + ')">' +
                    '<img class="rsa-bait-mini" src="' + esc(bp.sprite) + '" alt=""></span>';
            }

            var deleteX = (side === 'p1' && boxDeleteMode)
                ? '<button class="rsa-box-delete-x" data-set-id="' + esc(m.setId) + '" title="Remove from box">×</button>'
                : '';
            html += '<div class="rsa-box-slot' + inTeam + ccClass + '" draggable="true" data-side="' + side + '" data-set-id="' + esc(m.setId) + '" data-name="' + esc(m.name) + '">' +
                deleteX +
                speedHtml +
                '<img class="rsa-box-sprite" src="' + esc(m.sprite) + '" alt="' + esc(m.name) + '" title="' + esc(tooltip) + '">' +
                rankHtml +
                baitHtml +
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

        // ── Format selector ──
        $(document).on('click', '.rsa-format-btn', function () {
            var fmt = $(this).data('format');
            if (fmt === battleFormat) return;
            battleFormat = fmt;
            $('.rsa-format-btn').removeClass('rsa-format-active');
            $(this).addClass('rsa-format-active');

            // Sync calc format radio
            if (isDoubles()) {
                $('#doubles-format').prop('checked', true).trigger('change');
                $('body').addClass('rsa-format-doubles');
                $('#rsa-doubles-moves').show();
                $('.rsa-active-field').addClass('rsa-show');
                $('.rsa-doubles-switch').show();
                // Hide singles switch controls
                $('#rsa-switch-p1').closest('.rsa-switch-group').not('.rsa-doubles-switch').hide();
            } else {
                $('#singles-format').prop('checked', true).trigger('change');
                $('body').removeClass('rsa-format-doubles');
                $('#rsa-doubles-moves').hide();
                $('.rsa-active-field').removeClass('rsa-show');
                $('.rsa-doubles-switch').hide();
                $('#rsa-switch-p1').closest('.rsa-switch-group').not('.rsa-doubles-switch').show();
            }
            // Show/hide team split for 2-trainer
            $('#rsa-team-split').toggle(fmt === 'doubles-2t');

            // Initialize B slots for doubles if needed
            if (isDoubles()) {
                dblSelections = { p1a: { move: null, target: null }, p1b: { move: null, target: null },
                                  p2a: { move: null, target: null }, p2b: { move: null, target: null } };
                var line = curLine();
                ['p1', 'p2'].forEach(function (side) {
                    var team = line.teams[side];
                    if (team.activeIdxB < 0 && team.roster.length >= 2) {
                        // Set second mon as B slot
                        team.activeIdxB = (team.activeIdx === 0) ? 1 : 0;
                    }
                });
                refreshDoublesUI();
            }
            renderAll();
        });

        // ── Doubles move grid: click a damage cell to select move + target ──
        $(document).on('click', '.rsa-dbl-dmg-cell', function (e) {
            e.stopPropagation();
            var slot = $(this).data('slot');
            var move = $(this).data('move');
            var target = $(this).data('target');
            if (!slot || !move || !target) return;
            dblSelections[slot] = { move: move, target: target };
            refreshDoublesUI();
        });
        // Click a move row to select the move (first valid target auto-selected)
        $(document).on('click', '.rsa-dbl-move-row', function () {
            var slot = $(this).data('slot');
            var move = $(this).data('move');
            if (!slot) return;
            if (move === 'none') {
                dblSelections[slot] = { move: null, target: null };
            } else {
                // Auto-select first valid target if not clicking a specific cell
                var existing = dblSelections[slot];
                if (!existing || existing.move !== move) {
                    var firstTarget = $(this).find('.rsa-dbl-dmg-cell[data-target]').first().data('target');
                    dblSelections[slot] = { move: move, target: firstTarget || null };
                }
            }
            refreshDoublesUI();
        });

        // ── Doubles switch buttons ──
        $(document).on('click', '#rsa-do-switch-p1a', function () {
            var idx = parseInt($('#rsa-switch-p1a').val());
            if (!isNaN(idx)) doDoublesSwitch('p1', 'a', idx);
        });
        $(document).on('click', '#rsa-do-switch-p1b', function () {
            var idx = parseInt($('#rsa-switch-p1b').val());
            if (!isNaN(idx)) doDoublesSwitch('p1', 'b', idx);
        });

        // ── Team split (doubles-2t) ──
        $(document).on('change', '#rsa-split-left', function () {
            var val = parseInt($(this).val()) || 3;
            var line = curLine();
            line.teamSplit = { left: val };
            // Re-assign P2 active slots based on new split
            var team = line.teams.p2;
            if (team.roster.length >= 2) {
                var leftMax = val;
                // A = first alive in left group
                for (var li = 0; li < Math.min(leftMax, team.roster.length); li++) {
                    if (team.roster[li].currentHP > 0) { team.activeIdx = li; break; }
                }
                // B = first alive in right group
                for (var ri = leftMax; ri < team.roster.length; ri++) {
                    if (team.roster[ri].currentHP > 0) { team.activeIdxB = ri; break; }
                }
            }
            renderTeamPanel('p2');
            populateSwitchDropdown();
            refreshDoublesUI();
        });

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
            // Recompute defensive rankings for the newly selected P2 move
            setTimeout(function () {
                try { cachedRankings = computeBoxRankings(); } catch (e) { cachedRankings = []; }
                renderBox('p1');
            }, 50);
        });

        // Update move display when calc recalculates
        $(document).on('change', '.calc-trigger', function () {
            setTimeout(function () {
                updateMovePickDisplay();
                // Recompute rankings so defensive ranks reflect any P2 move/stat changes
                try { cachedRankings = computeBoxRankings(); } catch (e) { cachedRankings = []; }
                // Render box first (uses calculationsColors which temporarily overwrites damageResults)
                // then inject damage badges using the correct damageResults
                renderBox('p1');
                injectDamageBadges();
                injectMoveLabelSprites();
                renderSwitchPrediction();
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
            new MutationObserver(function () {
                syncP2Team();
                setTimeout(autoSelectP2MostProbable, 500);
            }).observe(oppList, { childList: true, subtree: true });
        }

        $(document).on('change', '#p2 .set-selector', function () {
            setTimeout(function () {
                syncP2Team();
                // Auto-select most probable P2 move after calc recalculates
                setTimeout(autoSelectP2MostProbable, 400);
            }, 300);
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
                    // Auto-select most probable P2 move after new trainer loads
                    setTimeout(autoSelectP2MostProbable, 500);
                }, 500);
            }
        });

        // Initial sync after calc loads — poll until the form is ready instead of fixed timeout
        (function pollUntilReady(attempts) {
            var p1Ready = !!getP1Name();
            var p2Ready = !!getP2Name();
            if (p1Ready || p2Ready) {
                try { if (p1Ready) initP1Team(); } catch (e) { console.error('initP1Team error:', e); }
                try { syncP2Team(); } catch (e) { console.error('syncP2Team error:', e); }
                try { syncBoostsToCalc(); } catch (e) {}
                // Second pass after a short delay to catch any remaining async setup
                setTimeout(function () {
                    try {
                        if (curLine().teams.p1.roster.length === 0 && getP1Name()) {
                            initP1Team();
                        }
                        syncP2Team();
                        renderBox('p1');
                        injectDamageBadges();
                        injectMoveLabelSprites();
                    } catch (e) { console.error('Second-pass init error:', e); }
                    try { cachedRankings = computeBoxRankings(); renderBox('p1'); } catch (e) {}
                    // Auto-select most probable P2 move on initial load
                    try { autoSelectP2MostProbable(); } catch (e) {}
                }, 800);
            } else if (attempts > 0) {
                setTimeout(function () { pollUntilReady(attempts - 1); }, 500);
            }
        })(40); // up to 40 × 500ms = 20 seconds

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
            if (isDoubles()) return; // In doubles, use drag-to-slot instead
            var side = $(this).data('side');
            var idx = ~~$(this).data('idx');
            switchActive(side, idx);
        });

        // ── Log round ──
        $('#rsa-log-round').on('click', function () {
            var comment = $('#rsa-comment').val().trim();
            var rd;

            if (isDoubles()) {
                rd = captureDoublesRound(comment);
                if (!rd) return;
            } else {
                var p1MoveIdx = selectedP1Move;
                var p2MoveIdx = selectedP2Move;
                var p2Crit = $('#rsa-p2-crit').is(':checked');
                var p1PreDmg = parseInt($('#rsa-p1-predmg').val()) || 0;
                var p1PreStatus = $('#rsa-p1-prestatus').val();
                var p1ApplySec = $('#rsa-p1-apply-secondary').is(':checked');
                var p2ApplySec = $('#rsa-p2-apply-secondary').is(':checked');

                rd = captureRound(p1MoveIdx, p2MoveIdx, p2Crit, p1PreDmg, p1PreStatus, comment, p1ApplySec, p2ApplySec);
                if (!rd) return;
            }

            curLine().rounds.push(rd);
            renderAll();
            if (isDoubles()) refreshDoublesUI();

            // Reset controls (keep P2 crit and P2 effect persistent across rounds)
            $('#rsa-comment').val('');
            if (!isDoubles()) {
                $('#rsa-p1-predmg').val(0);
                $('#rsa-p1-prestatus').val('');
                $('#rsa-p1-apply-secondary').prop('checked', false);
            }
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
            $('.rsa-active-slot').removeClass('rsa-drag-over');
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
                var newIdx = team.roster.length - 1;
                if (team.activeIdx < 0) team.activeIdx = 0;

                // In doubles, auto-assign to slots
                if (isDoubles()) {
                    if (team.roster.length === 1) {
                        team.activeIdx = 0;
                    } else if (team.roster.length === 2 && team.activeIdxB < 0) {
                        team.activeIdxB = newIdx;
                    }
                } else {
                    team.activeIdx = newIdx;
                }

                loadPokemonIntoForm('p1', entry);
                renderTeamPanel(side);
                renderBox(side);
                if (isDoubles()) refreshDoublesUI();
            } catch (ex) { /* ignore bad data */ }
        });

        // ── Drag team roster mons to active field slots (doubles) ──
        $(document).on('dragstart', '.rsa-team-slot[draggable]', function (e) {
            var side = $(this).data('side');
            var idx = parseInt($(this).data('idx'));
            $(this).addClass('dragging');
            e.originalEvent.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'team-slot', side: side, idx: idx
            }));
            e.originalEvent.dataTransfer.effectAllowed = 'move';
        });
        $(document).on('dragend', '.rsa-team-slot', function () {
            $(this).removeClass('dragging');
            $('.rsa-active-slot').removeClass('rsa-drag-over');
        });
        $(document).on('dragover', '.rsa-active-slot', function (e) {
            e.preventDefault();
            e.originalEvent.dataTransfer.dropEffect = 'move';
            $(this).addClass('rsa-drag-over');
        });
        $(document).on('dragleave', '.rsa-active-slot', function () {
            $(this).removeClass('rsa-drag-over');
        });
        $(document).on('drop', '.rsa-active-slot', function (e) {
            e.preventDefault();
            $(this).removeClass('rsa-drag-over');
            try {
                var data = JSON.parse(e.originalEvent.dataTransfer.getData('text/plain'));
                if (!data || data.type !== 'team-slot') return;
                var side = $(this).data('side');
                if (data.side !== side) return; // can only drop to same side
                var newIdx = data.idx;
                var isLeft = $(this).hasClass('rsa-slot-left');
                var slot = isLeft ? 'a' : 'b';
                doDoublesSwitch(side, slot, newIdx);
            } catch (ex) {}
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
            var newIdx = team.roster.length - 1;
            if (team.activeIdx < 0) team.activeIdx = 0;

            // In doubles, auto-assign to slots
            if (isDoubles()) {
                if (team.roster.length === 1) {
                    team.activeIdx = 0;
                } else if (team.roster.length === 2 && team.activeIdxB < 0) {
                    // Second mon goes to B slot
                    team.activeIdxB = newIdx;
                }
            } else {
                // Singles: select the newly added mon
                team.activeIdx = newIdx;
            }

            loadPokemonIntoForm('p1', entry);
            renderTeamPanel('p1');
            renderBox('p1');
            if (isDoubles()) refreshDoublesUI();
        });

        // ── Coverage analysis button ──
        $(document).on('click', '#rsa-coverage-btn', function () {
            var $modal = $('#rsa-coverage-modal');
            $modal.find('.rsa-cov-body').html(renderCoverageModal());
            $modal.show();
        });
        $(document).on('click', '#rsa-coverage-close', function () {
            $('#rsa-coverage-modal').hide();
        });

        // ── Remove all items ──
        $(document).on('click', '#rsa-remove-items-btn', function () {
            removeAllBoxItems();
        });

        // ── Delete mode toggle ──
        $(document).on('click', '#rsa-delete-toggle', function () {
            boxDeleteMode = !boxDeleteMode;
            $(this).toggleClass('rsa-sort-active', boxDeleteMode);
            renderBox('p1');
        });

        // ── Delete specific pokemon from box ──
        $(document).on('click', '.rsa-box-delete-x', function (e) {
            e.stopPropagation();
            var setId = $(this).closest('[data-set-id]').data('set-id');
            if (!setId) return;
            if (boxExcluded.indexOf(setId) === -1) boxExcluded.push(setId);
            localStorage.setItem('rsa-box-excluded', JSON.stringify(boxExcluded));
            renderBox('p1');
        });

        // ── Team item select ──
        $(document).on('change', '.rsa-item-select', function (e) {
            e.stopPropagation();
            var side = $(this).data('side');
            var idx = parseInt($(this).data('idx'));
            var newItem = $(this).val();
            var line = curLine();
            var team = line.teams[side];
            if (!team || !team.roster[idx]) return;
            team.roster[idx].item = newItem;
            team.roster[idx].initialItem = newItem; // persist manual item changes across rebuilds
            // Update calc form live if this is the active pokemon
            if (idx === team.activeIdx) {
                $('#' + side + ' .item').val(newItem).trigger('change');
            }
        });

        // ── Sort box ──
        $(document).on('click', '#rsa-sort-default', function () {
            boxSortMode = 'default';
            renderBox('p1');
            $('.rsa-sort-btn').removeClass('rsa-sort-active');
            $(this).addClass('rsa-sort-active');
        });
        $(document).on('click', '#rsa-sort-offense', function () {
            boxSortMode = 'offense';
            // Compute rankings if not cached
            if (!cachedRankings.length) {
                try { cachedRankings = computeBoxRankings(); } catch (e) {}
            }
            renderBox('p1');
            $('.rsa-sort-btn').removeClass('rsa-sort-active');
            $(this).addClass('rsa-sort-active');
        });
        $(document).on('click', '#rsa-sort-defense', function () {
            boxSortMode = 'defense';
            if (!cachedRankings.length) {
                try { cachedRankings = computeBoxRankings(); } catch (e) {}
            }
            renderBox('p1');
            $('.rsa-sort-btn').removeClass('rsa-sort-active');
            $(this).addClass('rsa-sort-active');
        });
        $(document).on('click', '#rsa-sort-defense-all', function () {
            boxSortMode = 'defenseAll';
            if (!cachedRankings.length) {
                try { cachedRankings = computeBoxRankings(); } catch (e) {}
            }
            renderBox('p1');
            $('.rsa-sort-btn').removeClass('rsa-sort-active');
            $(this).addClass('rsa-sort-active');
        });

        // ── Refresh rankings when P2 changes ──
        $(document).on('change', '#p2 .set-selector', function () {
            setTimeout(function () {
                try { cachedRankings = computeBoxRankings(); } catch (e) { cachedRankings = []; }
                renderBox('p1');
                injectDamageBadges();
            }, 400);
        });

        // ── Inject initial damage badges after calc loads ──
        setTimeout(function () {
            renderBox('p1');
            injectDamageBadges();
            injectMoveLabelSprites();
            // Try to compute initial rankings
            try { cachedRankings = computeBoxRankings(); renderBox('p1'); } catch (e) {}
        }, 2500);
    });

})();
