/* ============================================================
   Round Simulator v2 — Lines, Teams, Worst-Case HP, P2 Crit
   ============================================================ */
(function () {
    'use strict';

    // ────────────────────────────────────────────────────────────
    // STATE
    // ────────────────────────────────────────────────────────────
    var lines = [];        // array of Line objects
    var currentLineIdx = 0;
    var lineIdCounter = 0;

    // Line = { id, name, rounds[], roundCounter, teams: { p1:{}, p2:{} } }
    // teams.pN = { roster: { name → {name,sprite,item,ability,maxHP,currentHP} }, activeSlot: name }

    function createLine(name) {
        return {
            id: ++lineIdCounter,
            name: name || ('Line ' + lineIdCounter),
            rounds: [],
            roundCounter: 0,
            teams: {
                p1: { roster: {}, activeSlot: null },
                p2: { roster: {}, activeSlot: null }
            }
        };
    }

    function curLine() { return lines[currentLineIdx]; }

    // ────────────────────────────────────────────────────────────
    // HELPERS — read from the calculator form
    // ────────────────────────────────────────────────────────────
    function getP1Name() {
        var v = $("#p1 input.set-selector").val();
        if (!v) return 'Pokémon 1';
        return v.indexOf('(') !== -1 ? v.substring(0, v.indexOf(' (')) : v;
    }
    function getP2Name() {
        var v = $("#p2 input.set-selector").val();
        if (!v) return 'Pokémon 2';
        return v.indexOf('(') !== -1 ? v.substring(0, v.indexOf(' (')) : v;
    }
    function getP1Sprite() { return $("#p1mon").attr("src") || ""; }
    function getP2Sprite() { return $("#p2mon").attr("src") || ""; }
    function getP1Item()    { return $("#p1 .item").val() || "None"; }
    function getP2Item()    { return $("#p2 .item").val() || "None"; }
    function getP1Ability() { return $("#p1 .ability").val() || "None"; }
    function getP2Ability() { return $("#p2 .ability").val() || "None"; }
    function getP1Status()  { return $("#p1 .status").val() || "Healthy"; }
    function getP2Status()  { return $("#p2 .status").val() || "Healthy"; }

    function getResultMoveNames(side) {
        var pfx = side === 'L' ? 'L' : 'R';
        var names = [];
        for (var i = 1; i <= 4; i++) {
            var t = $("label[for='resultMove" + pfx + i + "']").text();
            names.push(t && t !== 'Loading...' ? t : '(No Move)');
        }
        return names;
    }
    function getFormMoveNames(side) {
        var pfx = side === 'L' ? '#p1' : '#p2';
        var names = [];
        for (var i = 1; i <= 4; i++) {
            var s = $(pfx + " .move" + i + " .move-selector").val();
            names.push(s || "(No Move)");
        }
        return names;
    }
    function getMoveNames(side) {
        var r = getResultMoveNames(side);
        if (r.every(function(n) { return n === '(No Move)'; })) return getFormMoveNames(side);
        return r;
    }

    function getCurrentHP(side) {
        var pfx = side === 'L' ? '#p1' : '#p2';
        return { current: ~~$(pfx + " .current-hp").val(), max: ~~$(pfx + " .max-hp").text() };
    }

    function getSpeedInfo() {
        var p1s = ~~$("#p1 .sp .totalMod").text() || ~~$("#p1 .sp .total").text();
        var p2s = ~~$("#p2 .sp .totalMod").text() || ~~$("#p2 .sp .total").text();
        var tr = $("#trickroom").prop("checked");
        var f;
        if (p1s === p2s) f = 'tie';
        else if (tr)     f = p1s < p2s ? 'p1' : 'p2';
        else             f = p1s > p2s ? 'p1' : 'p2';
        return { p1: p1s, p2: p2s, trickRoom: tr, faster: f };
    }

    function getDamageInfo(sideIdx, moveIdx) {
        if (typeof damageResults === 'undefined' || !damageResults ||
            !damageResults[sideIdx] || !damageResults[sideIdx][moveIdx]) return null;
        var r = damageResults[sideIdx][moveIdx];
        var rng = r.range();
        return {
            desc: r.moveDesc(notation),
            fullDesc: r.fullDesc(notation, false),
            range: rng,
            minDmg: rng[0],
            maxDmg: rng[1]
        };
    }

    function getCritDamageInfo(sideIdx, moveIdx) {
        try {
            var p1 = createPokemon($("#p1"));
            var p2 = createPokemon($("#p2"));
            var p1f = createField();
            var p2f = p1f.clone().swap();
            var atk, def, fld, src;
            if (sideIdx === 0) { atk=p1; def=p2; fld=p1f; src=$("#p1"); }
            else               { atk=p2; def=p1; fld=p2f; src=$("#p2"); }
            var md = src.find(".move" + (moveIdx + 1));
            var mn = md.find("select.move-selector").val();
            if (!mn || mn === '(No Move)') return null;
            var mv = new calc.Move(gen, mn, {
                ability: atk.ability, item: atk.item, isCrit: true,
                hits: +md.find(".move-hits").val() || undefined,
                overrides: { basePower: +md.find(".move-bp").val(), type: md.find(".move-type").val() }
            });
            var res = calc.calculate(gen, atk, def, mv, fld);
            var rng = res.range();
            return { desc: res.moveDesc(notation), range: rng, minDmg: rng[0], maxDmg: rng[1] };
        } catch (e) { return null; }
    }

    function getAIPercentages() {
        var p = [];
        for (var i = 1; i <= 4; i++) p.push($("#resultMoveRateR" + i).text());
        return p;
    }
    function getWeather() { return $("input:radio[name='weather']:checked").val() || 'None'; }
    function getTerrain() { return $("input:checkbox[name='terrain']:checked").val() || 'None'; }

    // ────────────────────────────────────────────────────────────
    // TEAM ROSTER TRACKING
    // ────────────────────────────────────────────────────────────
    // Ensures a pokemon is in the roster; returns its tracked HP
    function ensureInRoster(teamObj, name, sprite, item, ability, formHP) {
        if (!teamObj.roster[name]) {
            teamObj.roster[name] = {
                name: name,
                sprite: sprite,
                item: item,
                ability: ability,
                maxHP: formHP.max,
                currentHP: formHP.current,
                status: ''
            };
        }
        teamObj.activeSlot = name;
        return teamObj.roster[name];
    }

    function getRosterHP(teamObj, name) {
        if (teamObj.roster[name]) return teamObj.roster[name].currentHP;
        return null;
    }

    function setRosterHP(teamObj, name, hp) {
        if (teamObj.roster[name]) teamObj.roster[name].currentHP = Math.max(0, hp);
    }

    function setRosterStatus(teamObj, name, status) {
        if (teamObj.roster[name]) teamObj.roster[name].status = status || '';
    }

    function getRosterStatus(teamObj, name) {
        if (teamObj.roster[name]) return teamObj.roster[name].status || '';
        return '';
    }

    // Map RS status names → main calc form status names
    var RS_TO_CALC_STATUS = {
        'Burn': 'Burned',
        'Paralysis': 'Paralyzed',
        'Poison': 'Poisoned',
        'Badly Poisoned': 'Badly Poisoned',
        'Sleep': 'Asleep',
        'Freeze': 'Frozen'
    };

    // Sync roster status to the main calc form so damage calcs reflect burn/para/etc.
    function syncStatusToCalcForm() {
        var line = curLine();
        var p1Name = getP1Name(), p2Name = getP2Name();
        var p1St = getRosterStatus(line.teams.p1, p1Name);
        var p2St = getRosterStatus(line.teams.p2, p2Name);

        var calcP1 = RS_TO_CALC_STATUS[p1St] || 'Healthy';
        var calcP2 = RS_TO_CALC_STATUS[p2St] || 'Healthy';

        $('#statusL1').val(calcP1).trigger('change');
        $('#statusR1').val(calcP2).trigger('change');
    }

    // ────────────────────────────────────────────────────────────
    // CAPTURE ROUND
    // ────────────────────────────────────────────────────────────
    function captureRoundData(p1ActionType, p1MoveIdx, p2MoveIdx, p2Crit, p1StatusInflict, p2StatusInflict, comment) {
        var line = curLine();
        var speed = getSpeedInfo();
        var p1Moves = getMoveNames('L');
        var p2Moves = getMoveNames('R');

        var p1Name = getP1Name();
        var p2Name = getP2Name();
        var formHP1 = getCurrentHP('L');
        var formHP2 = getCurrentHP('R');

        // Ensure pokemon in roster
        var p1Entry = ensureInRoster(line.teams.p1, p1Name, getP1Sprite(), getP1Item(), getP1Ability(), formHP1);
        var p2Entry = ensureInRoster(line.teams.p2, p2Name, getP2Sprite(), getP2Item(), getP2Ability(), formHP2);

        // Apply any new status inflicted this round
        if (p1StatusInflict) setRosterStatus(line.teams.p1, p1Name, p1StatusInflict);
        if (p2StatusInflict) setRosterStatus(line.teams.p2, p2Name, p2StatusInflict);

        var p1Status = getRosterStatus(line.teams.p1, p1Name);
        var p2Status = getRosterStatus(line.teams.p2, p2Name);

        // HP before = tracked HP from roster
        var p1HPBefore = { current: p1Entry.currentHP, max: p1Entry.maxHP };
        var p2HPBefore = { current: p2Entry.currentHP, max: p2Entry.maxHP };

        // Build actions
        var p1Action, p2Action;

        if (p1ActionType === 'switch') {
            p1Action = { type: 'switch', label: 'Switch' };
        } else if (p1MoveIdx === 'none') {
            p1Action = { type: 'none', label: 'No Move' };
        } else {
            var dmg = getDamageInfo(0, p1MoveIdx);
            var critDmg = getCritDamageInfo(0, p1MoveIdx);
            p1Action = { type: 'attack', move: p1Moves[p1MoveIdx], moveIdx: p1MoveIdx, damage: dmg, critDamage: critDmg };
        }

        if (p2MoveIdx === 'none') {
            p2Action = { type: 'none', label: 'No Move', aiPcts: getAIPercentages() };
        } else {
            var dmg2 = getDamageInfo(1, p2MoveIdx);
            var critDmg2 = getCritDamageInfo(1, p2MoveIdx);
            p2Action = { type: 'attack', move: p2Moves[p2MoveIdx], moveIdx: p2MoveIdx, damage: dmg2, critDamage: critDmg2, aiPcts: getAIPercentages() };
        }

        // ── Worst-case HP simulation for P1 ──
        // P2 attacking P1: use MAX damage (worst for P1). If p2Crit, use crit max.
        // P1 attacking P2: use MIN damage (worst for P1 — opponent keeps more HP).
        var firstSide = (speed.faster === 'p2') ? 'p2' : 'p1';
        var p1HPAfter = p1HPBefore.current;
        var p2HPAfter = p2HPBefore.current;

        function p2DmgToP1() {
            if (p2Action.type !== 'attack') return 0;
            if (p2Crit && p2Action.critDamage) return p2Action.critDamage.maxDmg;
            if (p2Action.damage) return p2Action.damage.maxDmg;
            return 0;
        }
        function p1DmgToP2() {
            if (p1Action.type !== 'attack') return 0;
            if (p1Action.damage) return p1Action.damage.minDmg;
            return 0;
        }

        if (firstSide === 'p1') {
            p2HPAfter = Math.max(0, p2HPAfter - p1DmgToP2());
            if (p2HPAfter > 0) p1HPAfter = Math.max(0, p1HPAfter - p2DmgToP1());
        } else {
            p1HPAfter = Math.max(0, p1HPAfter - p2DmgToP1());
            if (p1HPAfter > 0) p2HPAfter = Math.max(0, p2HPAfter - p1DmgToP2());
        }

        // Update roster HP
        setRosterHP(line.teams.p1, p1Name, p1HPAfter);
        setRosterHP(line.teams.p2, p2Name, p2HPAfter);

        return {
            roundNum: ++line.roundCounter,
            p1: {
                name: p1Name, sprite: getP1Sprite(), item: getP1Item(), ability: getP1Ability(), status: p1Status,
                hpBefore: p1HPBefore, hpAfter: { current: p1HPAfter, max: p1HPBefore.max }, action: p1Action
            },
            p2: {
                name: p2Name, sprite: getP2Sprite(), item: getP2Item(), ability: getP2Ability(), status: p2Status,
                hpBefore: p2HPBefore, hpAfter: { current: p2HPAfter, max: p2HPBefore.max }, action: p2Action
            },
            speed: speed,
            weather: getWeather(),
            terrain: getTerrain(),
            trickRoom: speed.trickRoom,
            p2Crit: p2Crit,
            comment: comment || ''
        };
    }

    // ────────────────────────────────────────────────────────────
    // RENDERING
    // ────────────────────────────────────────────────────────────
    function esc(str) {
        if (!str) return '';
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function hpColor(pct) {
        var n = parseFloat(pct);
        if (n > 50) return '#4caf50';
        if (n > 20) return '#ff9800';
        return '#f44336';
    }

    // ── Line tabs ────
    function renderLineTabs() {
        var html = '';
        for (var i = 0; i < lines.length; i++) {
            var l = lines[i];
            var active = i === currentLineIdx ? ' rs-tab-active' : '';
            html += '<button class="rs-tab' + active + '" data-line-idx="' + i + '">' +
                        esc(l.name) + ' <small>(' + l.rounds.length + ')</small>' +
                    '</button>';
        }
        $('#rs-lines-tabs').html(html);
    }

    // ── Team roster display ────
    function renderTeams() {
        var line = curLine();
        renderTeamRoster('#rs-team-p1', line.teams.p1, 'p1');
        renderTeamRoster('#rs-team-p2', line.teams.p2, 'p2');
    }

    function renderTeamRoster(selector, teamObj, side) {
        var names = Object.keys(teamObj.roster);
        if (names.length === 0) {
            $(selector).html('<span class="rs-team-empty">No Pokémon tracked yet</span>');
            return;
        }
        var html = '';
        for (var i = 0; i < names.length; i++) {
            var pk = teamObj.roster[names[i]];
            var pct = pk.maxHP > 0 ? (pk.currentHP / pk.maxHP * 100).toFixed(0) : '100';
            var col = hpColor(pct);
            var isActive = teamObj.activeSlot === pk.name ? ' rs-roster-active' : '';
            var fainted = pk.currentHP <= 0 ? ' rs-roster-fainted' : '';
            var statusHtml = pk.status && pk.status !== 'Healthy' ? '<div class="rs-roster-status rs-status-' + pk.status.toLowerCase().replace(/\s+/g,'-') + '">' + esc(pk.status) + '</div>' : '';
            html += '<div class="rs-roster-mon' + isActive + fainted + '" title="' + esc(pk.name) + ' ' + pk.currentHP + '/' + pk.maxHP + '">' +
                        (pk.sprite ? '<img class="rs-roster-sprite" src="' + esc(pk.sprite) + '" alt="">' : '') +
                        '<div class="rs-roster-info">' +
                            '<div class="rs-roster-name">' + esc(pk.name) + '</div>' +
                            '<div class="rs-roster-hp-bar"><div class="rs-roster-hp-fill" style="width:' + Math.max(0,Math.min(100,pct)) + '%;background:' + col + '"></div></div>' +
                            '<div class="rs-roster-hp-text">' + pk.currentHP + '/' + pk.maxHP + '</div>' +
                            statusHtml +
                        '</div>' +
                    '</div>';
        }
        $(selector).html(html);
    }

    // ── Round cards ────
    function renderRoundCard(rd) {
        var speedIcon = rd.speed.trickRoom ? '🔄' : '⚡';
        var fasterLabel;
        if (rd.speed.faster === 'tie') fasterLabel = 'Speed Tie';
        else if (rd.speed.faster === 'p1') fasterLabel = rd.p1.name + ' moves first';
        else fasterLabel = rd.p2.name + ' moves first';

        var first, firstS, second, secondS;
        if (rd.speed.faster === 'p2') { first=rd.p2; firstS='p2'; second=rd.p1; secondS='p1'; }
        else                          { first=rd.p1; firstS='p1'; second=rd.p2; secondS='p2'; }

        var tags = '';
        if (rd.weather !== 'None')  tags += '<span class="rs-tag rs-weather">' + esc(rd.weather) + '</span>';
        if (rd.terrain !== 'None')  tags += '<span class="rs-tag rs-terrain">' + esc(rd.terrain) + ' Terrain</span>';
        if (rd.trickRoom)           tags += '<span class="rs-tag rs-trickroom">Trick Room</span>';
        if (rd.p2Crit)              tags += '<span class="rs-tag rs-crit-tag">P2 CRIT</span>';

        var cmnt = rd.comment ? '<div class="rs-comment">' + esc(rd.comment) + '</div>' : '';

        return '<div class="rs-round-card" data-round="' + rd.roundNum + '">' +
            '<div class="rs-round-header">' +
                '<span class="rs-round-num">Round ' + rd.roundNum + '</span>' +
                '<span class="rs-speed-info">' + speedIcon + ' ' + esc(fasterLabel) + ' <small>(' + rd.speed.p1 + ' vs ' + rd.speed.p2 + ')</small></span>' +
                '<div class="rs-conditions">' + tags + '</div>' +
                '<button class="rs-delete-round" data-round="' + rd.roundNum + '" title="Delete round">&times;</button>' +
            '</div>' +
            '<div class="rs-round-body">' +
                '<div class="rs-action-order">' +
                    '<div class="rs-action-first"><div class="rs-order-label">1st</div>' + renderActor(first, firstS, rd) + '</div>' +
                    '<div class="rs-action-arrow">➜</div>' +
                    '<div class="rs-action-second"><div class="rs-order-label">2nd</div>' + renderActor(second, secondS, rd) + '</div>' +
                '</div>' +
            '</div>' +
            cmnt +
        '</div>';
    }

    function renderActor(actor, side, rd) {
        var bPct = actor.hpBefore.max > 0 ? (actor.hpBefore.current / actor.hpBefore.max * 100).toFixed(1) : '100';
        var aPct = actor.hpAfter.max > 0 ? (actor.hpAfter.current / actor.hpAfter.max * 100).toFixed(1) : '100';
        var bCol = hpColor(bPct), aCol = hpColor(aPct);
        var cls = side === 'p1' ? 'rs-p1' : 'rs-p2';
        var diff = actor.hpBefore.current - actor.hpAfter.current;

        var actHtml;
        if (actor.action.type === 'switch') {
            actHtml = '<div class="rs-move-name rs-switch">↔ Switch</div>';
        } else if (actor.action.type === 'none') {
            actHtml = '<div class="rs-move-name rs-no-move">— No Move</div>';
        } else {
            var d = actor.action.damage, cd = actor.action.critDamage;
            var rng = d ? '<span class="rs-damage-range"><span class="rs-range-label">Dmg:</span> ' + d.minDmg + '-' + d.maxDmg + '</span>' : '';
            var crit = cd ? '<span class="rs-crit-info">⚔ Crit: ' + cd.minDmg + '-' + cd.maxDmg + '</span>' : '';
            actHtml = '<div class="rs-move-name">' + esc(actor.action.move) + '</div>' +
                '<div class="rs-damage-text">' + esc(d ? d.desc : '—') + '</div>' +
                '<div class="rs-damage-inline">' + rng + crit + '</div>';
        }

        var aiHtml = '';
        if (side === 'p2' && actor.action.aiPcts && actor.action.type === 'attack') {
            var pcts = actor.action.aiPcts;
            if (pcts.some(function(p){return p && p!=='??%';})) {
                aiHtml = '<div class="rs-ai-pct">AI %: ' + esc(pcts[actor.action.moveIdx] || '??%') + '</div>';
            }
        }

        var hpSim = '';
        if (diff !== 0) {
            hpSim = '<div class="rs-hp-sim">' +
                '<div class="rs-hp-sim-label">After round:</div>' +
                '<div class="rs-hp-bar-wrap"><div class="rs-hp-bar" style="width:'+Math.max(0,Math.min(100,aPct))+'%;background:'+aCol+'"></div></div>' +
                '<div class="rs-hp-after-text">' + actor.hpAfter.current + '/' + actor.hpAfter.max + ' ('+aPct+'%) <span class="rs-hp-diff">-'+diff+'</span></div>' +
            '</div>';
        }

        return '<div class="rs-actor ' + cls + '">' +
            '<div class="rs-actor-header">' +
                (actor.sprite ? '<img class="rs-sprite" src="'+esc(actor.sprite)+'" alt="">' : '') +
                '<div class="rs-actor-info">' +
                    '<div class="rs-actor-name">' + esc(actor.name) + '</div>' +
                    '<div class="rs-hp-bar-wrap"><div class="rs-hp-bar" style="width:'+Math.max(0,Math.min(100,bPct))+'%;background:'+bCol+'"></div></div>' +
                    '<div class="rs-hp-text">' + actor.hpBefore.current + '/' + actor.hpBefore.max + ' ('+bPct+'%)</div>' +
                '</div>' +
            '</div>' +
            '<div class="rs-details">' +
                '<span class="rs-tag rs-item">🎒 ' + esc(actor.item) + '</span>' +
                '<span class="rs-tag rs-ability">' + esc(actor.ability) + '</span>' +
                (actor.status && actor.status !== 'Healthy' ? '<span class="rs-tag rs-status rs-status-' + actor.status.toLowerCase().replace(/\s+/g,'-') + '">' + esc(actor.status) + '</span>' : '') +
            '</div>' +
            actHtml + aiHtml + hpSim +
        '</div>';
    }

    function renderAllRounds() {
        var line = curLine();
        var $log = $('#rs-round-log');
        if (line.rounds.length === 0) {
            $log.html('<div class="rs-empty">No rounds recorded yet. Use the controls above to log a round.</div>');
        } else {
            var h = '';
            for (var i = 0; i < line.rounds.length; i++) h += renderRoundCard(line.rounds[i]);
            $log.html(h);
            $log.scrollTop($log[0].scrollHeight);
        }
        $('#rs-round-count').text(getTotalRounds());
        renderLineTabs();
        renderTeams();
    }

    function getTotalRounds() {
        var n = 0;
        for (var i = 0; i < lines.length; i++) n += lines[i].rounds.length;
        return n;
    }

    // ── Populate move selectors ────
    function populateMoveOptions() {
        var p1M = getMoveNames('L'), p2M = getMoveNames('R');
        var $p1 = $('#rs-p1-move'), $p2 = $('#rs-p2-move');
        var v1 = $p1.val(), v2 = $p2.val();
        $p1.empty().append('<option value="none">(No Move)</option>');
        $p2.empty().append('<option value="none">(No Move)</option>');
        for (var i = 0; i < p1M.length; i++) {
            if (p1M[i] && p1M[i] !== '(No Move)') $p1.append('<option value="'+i+'">'+esc(p1M[i])+'</option>');
        }
        for (var i = 0; i < p2M.length; i++) {
            if (p2M[i] && p2M[i] !== '(No Move)') $p2.append('<option value="'+i+'">'+esc(p2M[i])+'</option>');
        }
        if (v1 !== null) $p1.val(v1);
        if (v2 !== null) $p2.val(v2);

    }

    // ── Rebuild roster HP after deleting a round ────
    function rebuildLineTeams(line) {
        // Reset roster
        line.teams = { p1: { roster: {}, activeSlot: null }, p2: { roster: {}, activeSlot: null } };
        // Replay rounds
        for (var i = 0; i < line.rounds.length; i++) {
            var rd = line.rounds[i];
            // Re-register pokemon
            if (!line.teams.p1.roster[rd.p1.name]) {
                line.teams.p1.roster[rd.p1.name] = { name: rd.p1.name, sprite: rd.p1.sprite, item: rd.p1.item, ability: rd.p1.ability, maxHP: rd.p1.hpBefore.max, currentHP: rd.p1.hpBefore.max, status: '' };
            }
            if (!line.teams.p2.roster[rd.p2.name]) {
                line.teams.p2.roster[rd.p2.name] = { name: rd.p2.name, sprite: rd.p2.sprite, item: rd.p2.item, ability: rd.p2.ability, maxHP: rd.p2.hpBefore.max, currentHP: rd.p2.hpBefore.max, status: '' };
            }
            line.teams.p1.roster[rd.p1.name].currentHP = rd.p1.hpAfter.current;
            line.teams.p2.roster[rd.p2.name].currentHP = rd.p2.hpAfter.current;
            if (rd.p1.status) line.teams.p1.roster[rd.p1.name].status = rd.p1.status;
            if (rd.p2.status) line.teams.p2.roster[rd.p2.name].status = rd.p2.status;
            line.teams.p1.activeSlot = rd.p1.name;
            line.teams.p2.activeSlot = rd.p2.name;
        }
    }

    // ── Export ────
    function exportLinesText() {
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
                out.push(rd.p1.name + ' [' + rd.p1.item + ' / ' + rd.p1.ability + ']' + (rd.p1.status ? ' {' + rd.p1.status + '}' : ''));
                out.push('  HP: ' + rd.p1.hpBefore.current + '/' + rd.p1.hpBefore.max + ' → ' + rd.p1.hpAfter.current + '/' + rd.p1.hpAfter.max);
                if (rd.p1.action.type === 'switch') out.push('  Action: Switch');
                else if (rd.p1.action.type === 'none') out.push('  Action: No Move');
                else {
                    out.push('  Action: ' + rd.p1.action.move);
                    if (rd.p1.action.damage) out.push('  Damage: ' + rd.p1.action.damage.minDmg + ' - ' + rd.p1.action.damage.maxDmg);
                    if (rd.p1.action.critDamage) out.push('  Crit Damage: ' + rd.p1.action.critDamage.minDmg + ' - ' + rd.p1.action.critDamage.maxDmg);
                }
                out.push('');
                out.push(rd.p2.name + ' [' + rd.p2.item + ' / ' + rd.p2.ability + ']' + (rd.p2.status ? ' {' + rd.p2.status + '}' : ''));
                out.push('  HP: ' + rd.p2.hpBefore.current + '/' + rd.p2.hpBefore.max + ' → ' + rd.p2.hpAfter.current + '/' + rd.p2.hpAfter.max);
                if (rd.p2.action.type === 'none') out.push('  Action: No Move');
                else {
                    out.push('  Action: ' + rd.p2.action.move);
                    if (rd.p2.action.damage) out.push('  Damage: ' + rd.p2.action.damage.minDmg + ' - ' + rd.p2.action.damage.maxDmg);
                    if (rd.p2.action.critDamage) out.push('  Crit Damage: ' + rd.p2.action.critDamage.minDmg + ' - ' + rd.p2.action.critDamage.maxDmg);
                }
                if (rd.p2.action.aiPcts) out.push('  AI %: ' + rd.p2.action.aiPcts.join(' / '));
                out.push('');
                if (rd.comment) out.push('Comment: ' + rd.comment);
                out.push('');
            }
            // Team summary
            out.push('Team summary:');
            var rosterP1 = Object.keys(line.teams.p1.roster);
            for (var k = 0; k < rosterP1.length; k++) {
                var pk = line.teams.p1.roster[rosterP1[k]];
                out.push('  P1 ' + pk.name + ': ' + pk.currentHP + '/' + pk.maxHP + (pk.status ? ' [' + pk.status + ']' : ''));
            }
            var rosterP2 = Object.keys(line.teams.p2.roster);
            for (var k = 0; k < rosterP2.length; k++) {
                var pk = line.teams.p2.roster[rosterP2[k]];
                out.push('  P2 ' + pk.name + ': ' + pk.currentHP + '/' + pk.maxHP + (pk.status ? ' [' + pk.status + ']' : ''));
            }
            out.push('');
        }
        return out.length ? out.join('\n') : 'No rounds recorded.';
    }

    // ────────────────────────────────────────────────────────────
    // EVENT BINDING
    // ────────────────────────────────────────────────────────────
    $(document).ready(function () {
        // Initialize first line
        lines.push(createLine('Line 1'));
        renderAllRounds();

        // Toggle panel
        $('#rs-toggle-btn').on('click', function () {
            var $p = $('#rs-panel'), $i = $(this).find('.rs-toggle-icon');
            if ($p.is(':visible')) { $p.slideUp(200); $i.text('▶'); }
            else { $p.slideDown(200); $i.text('▼'); populateMoveOptions(); }
        });

        // Refresh moves on calc change
        $(".calc-trigger").on("change keyup", function () { setTimeout(populateMoveOptions, 150); });
        $("#p1 .set-selector, #p2 .set-selector").on("change", function () { setTimeout(populateMoveOptions, 400); });

        // P1 action type
        $('#rs-p1-action-type').on('change', function () {
            var sw = $(this).val() === 'switch';
            $('#rs-p1-move').prop('disabled', sw).css('opacity', sw ? 0.4 : 1);
        });

        // Line tabs
        $('#rs-lines-tabs').on('click', '.rs-tab', function () {
            currentLineIdx = ~~$(this).data('line-idx');
            renderAllRounds();
        });

        // New line
        $('#rs-new-line').on('click', function () {
            var name = prompt('Name for the new line:', 'Line ' + (lines.length + 1));
            if (name === null) return;
            lines.push(createLine(name || 'Line ' + (lines.length + 1)));
            currentLineIdx = lines.length - 1;
            renderAllRounds();
        });

        // Delete line
        $('#rs-delete-line').on('click', function () {
            if (lines.length <= 1) { alert('Cannot delete the only line.'); return; }
            if (!confirm('Delete "' + curLine().name + '" and all its rounds?')) return;
            lines.splice(currentLineIdx, 1);
            currentLineIdx = Math.min(currentLineIdx, lines.length - 1);
            renderAllRounds();
        });

        // Log round
        $('#rs-log-round').on('click', function () {
            var p1ActionType = $('#rs-p1-action-type').val();
            var p1Raw = $('#rs-p1-move').val();
            var p1MoveIdx = p1Raw === 'none' ? 'none' : ~~p1Raw;
            var p2Raw = $('#rs-p2-move').val();
            var p2MoveIdx = p2Raw === 'none' ? 'none' : ~~p2Raw;
            var p2Crit = $('#rs-p2-crit').is(':checked');
            var p1StatusInflict = $('#rs-p1-status').val();
            var p2StatusInflict = $('#rs-p2-status').val();
            var comment = $('#rs-comment').val().trim();

            var rd = captureRoundData(p1ActionType, p1MoveIdx, p2MoveIdx, p2Crit, p1StatusInflict, p2StatusInflict, comment);
            curLine().rounds.push(rd);
            syncStatusToCalcForm();
            renderAllRounds();
            $('#rs-comment').val('');
            $('#rs-p1-status').val('');
            $('#rs-p2-status').val('');
        });

        // Delete round
        $('#rs-round-log').on('click', '.rs-delete-round', function () {
            var num = ~~$(this).data('round');
            var line = curLine();
            line.rounds = line.rounds.filter(function (r) { return r.roundNum !== num; });
            rebuildLineTeams(line);
            renderAllRounds();
        });

        // Clear line
        $('#rs-clear-all').on('click', function () {
            var line = curLine();
            if (line.rounds.length === 0) return;
            if (!confirm('Clear all ' + line.rounds.length + ' rounds in "' + line.name + '"?')) return;
            line.rounds = [];
            line.roundCounter = 0;
            line.teams = { p1: { roster: {}, activeSlot: null }, p2: { roster: {}, activeSlot: null } };
            renderAllRounds();
        });

        // Export
        $('#rs-export').on('click', function () {
            var text = exportLinesText();
            navigator.clipboard.writeText(text).then(function () {
                var $b = $('#rs-export'), o = $b.html();
                $b.text('Copied!');
                setTimeout(function () { $b.html(o); }, 1500);
            });
        });

        // Initial populate
        setTimeout(populateMoveOptions, 1000);
    });
})();
