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

    // Preload all type/category sprite images immediately so the browser
    // caches them before injectMoveLabelSprites() is first called. Using
    // new Image() triggers a real browser fetch (bypasses CORS) and stores
    // the result in the browser's image cache for instant use later.
    (function preloadTypeSprites() {
        var types = ['Normal','Fire','Water','Electric','Grass','Ice','Fighting',
                     'Poison','Ground','Flying','Psychic','Bug','Rock','Ghost',
                     'Dragon','Dark','Steel','Fairy','???'];
        var categories = ['Physical','Special','Status'];
        var preloadList = types.map(function(t) { return TYPE_SPRITE_BASE + t + '.png'; })
                    .concat(categories.map(function(c) { return CATEGORY_SPRITE_BASE + c + '.png'; }));
        for (var i = 0; i < preloadList.length; i++) {
            var img = new Image();
            img.src = preloadList[i];
        }
    })();

    // ── Two-turn (charge) move constants ───────────────────────
    // Moves that make the user semi-invulnerable on the charge turn.
    // Maps normalised move key → invulnerability bucket.
    var CHARGE_SEMI_INVULN = {
        'fly':          'air',
        'bounce':       'air',
        'skydrop':      'air',
        'dig':          'underground',
        'dive':         'underwater',
        'phantomforce': 'phantom',
        'shadowforce':  'phantom'
    };
    // Non-semi-invulnerable charge moves (Solar Beam, etc.).
    // The user still charges for one turn, but CAN be hit normally while charging.
    var CHARGE_ONLY_MOVES = {
        'solarbeam': true, 'solarblade': true,
        'skullbash': true, 'razorwind': true,
        'skyattack': true, 'freezeshock': true, 'iceburn': true
    };
    // Moves that bypass each invulnerability type.
    var INVULN_BYPASSES = {
        'air':          ['thunder', 'hurricane', 'gust', 'twister', 'skyuppercut', 'smackdown', 'thousandarrows'],
        'underground':  ['earthquake', 'magnitude'],
        'underwater':   ['surf', 'whirlpool'],
        'phantom':      []   // nothing bypasses Phantom/Shadow Force
    };
    // Human-readable names for invulnerability types (for badges / tooltips).
    var INVULN_LABEL = {
        'air':         'In the air',
        'underground': 'Underground',
        'underwater':  'Underwater',
        'phantom':     'Shadow realm'
    };

    // ════════════════════════════════════════════════════════════
    // POKÉMON TAG / BADGE SYSTEM
    // cat:'util' = blue tier  |  cat:'threat' = red/orange tier
    // Each tag: { id, cat, emoji, name, desc, check(entry, mvKeys, mdata) }
    // ════════════════════════════════════════════════════════════
    var TAG_DEFS = [
        // ── Utility tags ────────────────────────────────────────
        { id:'FO',   cat:'util',   emoji:'👋', name:'Fake Out',
          desc:'Forces flinch on first turn — guaranteed priority flinch turn 1',
          check: function(e,mv) { return mv.indexOf('fakeout')>=0; },
          tier: function() { return 'gold'; } },

        { id:'INT',  cat:'util',   emoji:'😤', name:'Intimidate',
          desc:'Drops opponent Attack on switch-in',
          check: function(e) { return e.ability==='Intimidate'; } },

        { id:'SPD',  cat:'util',   emoji:'⏱️', name:'Speed Control',
          desc:'Controls turn order — Gold: Tailwind, Trick Room, Cotton Down | Silver: speed-lowering/setting moves',
          check: function(e,mv) {
            if (e.ability==='Cotton Down') return true;
            var m=['icywind','glaciate','electroweb','stringshot','scaryface',
                   'tailwind','trickroom','stickyweb','quash','afteryou',
                   'speedswap','batonpass','bulldoze','mudshot','rocktomb',
                   'cottonspore','lowsweep','skittersmack','gunkshot'];
            for (var i=0;i<m.length;i++) if (mv.indexOf(m[i])>=0) return true;
            return false; },
          tier: function(e,mv) {
            if (e.ability==='Cotton Down') return 'gold';
            var gold=['tailwind','trickroom'];
            for (var i=0;i<gold.length;i++) if (mv.indexOf(gold[i])>=0) return 'gold';
            return 'silver'; } },

        { id:'CI',   cat:'util',   emoji:'🛡️', name:'Crit Immunity',
          desc:'Battle Armor or Shell Armor — immune to critical hits',
          check: function(e) { return e.ability==='Battle Armor'||e.ability==='Shell Armor'; } },

        { id:'MB',   cat:'util',   emoji:'🔨', name:'Mold Breaker',
          desc:'Ignores abilities (Mold Breaker / Turboblaze / Teravolt / Mycelium Might / Neutralizing Gas)',
          check: function(e) {
            return ['Mold Breaker','Turboblaze','Teravolt','Mycelium Might','Neutralizing Gas'].indexOf(e.ability)>=0; } },

        { id:'PRO',  cat:'util',   emoji:'🔒', name:'Protect',
          desc:'Has a Protect-variant move (Protect, Detect, Wide Guard, Quick Guard, etc.)',
          check: function(e,mv) {
            var p=['protect','detect','kingsshield','banefulbunker','silktrap','spikyshield',
                   'wideguard','quickguard','matblock','craftyshield','obstruct'];
            for (var i=0;i<p.length;i++) if (mv.indexOf(p[i])>=0) return true;
            return false; },
          tier: function() { return 'gold'; } },

        { id:'PRI',  cat:'util',   emoji:'⚡', name:'Priority Move',
          desc:'Has a move with increased priority (Extremespeed, Bullet Punch, etc.)',
          check: function(e,mv,mdata) { return mdata.hasPriority; } },

        { id:'SPR',  cat:'util',   emoji:'💫', name:'Spread Move',
          desc:'Has a move that hits multiple targets (Earthquake, Surf, Dazzling Gleam, etc.)',
          check: function(e,mv,mdata) { return mdata.hasSpread; } },

        { id:'ACC',  cat:'util',   emoji:'🎯', name:'Never Misses',
          desc:'Has a damaging move that always hits (Swift, Aerial Ace, Magical Leaf, etc.)',
          check: function(e,mv,mdata) { return mdata.hasNoMiss; } },

        { id:'IMM',  cat:'util',   emoji:'💊', name:'Status Immune',
          desc:'Ability grants immunity to one or more status conditions',
          check: function(e) {
            return ['Limber','Water Veil','Immunity','Insomnia','Vital Spirit','Own Tempo',
                    'Inner Focus','Oblivious','Sweet Veil','Comatose','Purifying Salt',
                    'Flower Veil','Leaf Guard','Magic Guard','Natural Cure','Shed Skin'].indexOf(e.ability)>=0; } },

        { id:'FLY',  cat:'util',   emoji:'🕊️', name:'Ground Immune',
          desc:'Flying type or Levitate — immune to Ground-type moves',
          check: function(e) {
            return (e.types&&e.types.indexOf('Flying')>=0)||e.ability==='Levitate'; } },

        { id:'SOAK', cat:'util',   emoji:'💧', name:'Soaker',
          desc:'Has Soak — changes the target\'s type to Water',
          check: function(e,mv) { return mv.indexOf('soak')>=0; } },

        { id:'FM',   cat:'util',   emoji:'📣', name:'Follow Me',
          desc:'Has Follow Me or Rage Powder — redirects single-target attacks to itself',
          check: function(e,mv) { return mv.indexOf('followme')>=0||mv.indexOf('ragepowder')>=0; } },

        { id:'KO',   cat:'util',   emoji:'🎒', name:'Knock Off',
          desc:'Has Knock Off — removes the target\'s held item',
          check: function(e,mv) { return mv.indexOf('knockoff')>=0; } },

        { id:'RN',   cat:'threat', emoji:'🌧️', name:'Rain Synergy',
          desc:'Red: speed/power-boosting rain ability (Swift Swim, Drizzle) | Blue: Water type, Hydration+Water move, or minor rain ability',
          check: function(e,mv) {
            if (e.types&&e.types.indexOf('Water')>=0) return true;
            if (['Swift Swim','Drizzle','Rain Dish','Dry Skin'].indexOf(e.ability)>=0) return true;
            if (e.ability==='Hydration'&&mv&&mv.some(function(m){return m.indexOf('water')>=0||m==='surf'||m==='waterfall'||m==='scald'||m==='hydropump'||m==='aquatail'||m==='liquidation'||m==='wavecrash'||m==='muddywater'||m==='watergun'||m==='bubblebeam'||m==='bubble'||m==='crabhammer';})) return true;
            return false; },
          tier: function(e) {
            return ['Swift Swim','Drizzle'].indexOf(e.ability)>=0 ? null : 'silver'; } },

        { id:'SND',  cat:'threat', emoji:'🏜️', name:'Sand Synergy',
          desc:'Red: speed/power-boosting sand ability (Sand Rush, Sand Force, etc.) | Blue: immune type (Rock/Steel/Ground) or minor ability',
          check: function(e) {
            return (e.types&&e.types.some(function(t){return ['Rock','Steel','Ground'].indexOf(t)>=0;}))||
                   ['Sand Rush','Sand Force','Sand Stream','Sand Spit'].indexOf(e.ability)>=0; },
          tier: function(e) {
            return ['Sand Rush','Sand Force','Sand Stream','Sand Spit'].indexOf(e.ability)>=0 ? null : 'silver'; } },

        { id:'SUN',  cat:'threat', emoji:'☀️', name:'Sun Synergy',
          desc:'Red: speed/power-boosting sun ability (Chlorophyll, Drought, Solar Power) | Blue: Fire type or minor ability',
          check: function(e) {
            return (e.types&&e.types.indexOf('Fire')>=0)||
                   ['Chlorophyll','Drought','Solar Power','Flower Gift'].indexOf(e.ability)>=0; },
          tier: function(e) {
            return ['Chlorophyll','Drought','Solar Power'].indexOf(e.ability)>=0 ? null : 'silver'; } },

        { id:'SNW',  cat:'threat', emoji:'❄️', name:'Snow Synergy',
          desc:'Red: speed-boosting snow ability (Slush Rush, Snow Warning) | Blue: Ice type or minor ability',
          check: function(e) {
            return (e.types&&e.types.indexOf('Ice')>=0)||
                   ['Snow Warning','Slush Rush','Ice Body','Snow Cloak'].indexOf(e.ability)>=0; },
          tier: function(e) {
            return ['Slush Rush','Snow Warning'].indexOf(e.ability)>=0 ? null : 'silver'; } },

        { id:'HRC',  cat:'util',   emoji:'🧹', name:'Hazard Remover',
          desc:'Has Rapid Spin or Defog — clears entry hazards from the field',
          check: function(e,mv) { return mv.indexOf('rapidspin')>=0||mv.indexOf('defog')>=0; },
          tier: function() { return 'gold'; } },

        { id:'BBR',  cat:'util',   emoji:'🪟', name:'Barrier Breaker',
          desc:'Has Brick Break or Psychic Fangs — destroys Reflect, Light Screen, and Aurora Veil',
          check: function(e,mv) { return mv.indexOf('brickbreak')>=0||mv.indexOf('psychicfangs')>=0; } },

        { id:'SHL',  cat:'threat', emoji:'💚', name:'Self Healer',
          desc:'Gold: healing move+item+ability | Red: two healing sources | Blue: one healing source (move or item)',
          check: function(e,mv) {
            var healMoves=['recover','roost','moonlight','synthesis','morningsun','slackoff',
                           'softboiled','healpulse','lifedew','lunarblessing','milkdrink',
                           'wish','aquaring','rest','shoreup','floralhealing'];
            var healItems=['Leftovers','Black Sludge','Shell Bell','Sitrus Berry'];
            var healAbils=['Regenerator','Rain Dish','Ice Body','Healer','Poison Heal'];
            var hasMove=healMoves.some(function(m){return mv.indexOf(m)>=0;});
            var hasItem=healItems.indexOf(e.item)>=0;
            var hasAbil=healAbils.indexOf(e.ability)>=0;
            return hasMove||hasItem||hasAbil; },
          tier: function(e,mv) {
            var healMoves=['recover','roost','moonlight','synthesis','morningsun','slackoff',
                           'softboiled','healpulse','lifedew','lunarblessing','milkdrink',
                           'wish','aquaring','rest','shoreup','floralhealing'];
            var healItems=['Leftovers','Black Sludge','Shell Bell','Sitrus Berry'];
            var healAbils=['Regenerator','Rain Dish','Ice Body','Healer','Poison Heal'];
            var score=(healMoves.some(function(m){return mv.indexOf(m)>=0;})?1:0)+
                      (healItems.indexOf(e.item)>=0?1:0)+
                      (healAbils.indexOf(e.ability)>=0?1:0);
            if (score>=3) return 'gold';
            if (score===2) return null;
            return 'silver'; } },

        // ── Threat tags ─────────────────────────────────────────
        { id:'BOOM', cat:'threat', emoji:'💣', name:'Exploder',
          desc:'Has Explosion, Self-Destruct, or Misty Explosion — sacrifices itself for massive damage',
          check: function(e,mv) {
            return mv.indexOf('explosion')>=0||mv.indexOf('selfdestruct')>=0||mv.indexOf('mistyexplosion')>=0; } },

        { id:'STU',  cat:'threat', emoji:'🧱', name:'Sturdy / Sash',
          desc:'Sturdy ability or Focus Sash — survives any OHKO from full HP',
          check: function(e) { return e.ability==='Sturdy'||e.item==='Focus Sash'; } },

        { id:'HAZ',  cat:'threat', emoji:'⚠️', name:'Hazard Setter',
          desc:'Can set entry hazards: Stealth Rock, Spikes, Toxic Spikes, or Sticky Web',
          check: function(e,mv) {
            return mv.indexOf('stealthrock')>=0||mv.indexOf('spikes')>=0||
                   mv.indexOf('toxicspikes')>=0||mv.indexOf('stickyweb')>=0; } },

        { id:'SCR',  cat:'threat', emoji:'🪞', name:'Screen Setter',
          desc:'Can set Reflect, Light Screen, or Aurora Veil',
          check: function(e,mv) {
            return mv.indexOf('reflect')>=0||mv.indexOf('lightscreen')>=0||mv.indexOf('auroraveil')>=0; } },

        { id:'WTH',  cat:'threat', emoji:'🌦️', name:'Weather Setter',
          desc:'Sets weather via ability (Drizzle/Drought/Sand Stream/Snow Warning) or moves',
          check: function(e,mv) {
            return ['Drizzle','Drought','Sand Stream','Snow Warning'].indexOf(e.ability)>=0||
                   mv.indexOf('sunnyday')>=0||mv.indexOf('raindance')>=0||
                   mv.indexOf('sandstorm')>=0||mv.indexOf('snowscape')>=0||mv.indexOf('hail')>=0; } },

        { id:'ACC-', cat:'threat', emoji:'🌫️', name:'Accuracy Reducer',
          desc:'Red: evasion ability + evasion item stacked | Blue: just ability, item, or accuracy-lowering move',
          check: function(e,mv) {
            if (e.item==='Bright Powder'||e.item==='Lax Incense') return true;
            if (['Sand Veil','Snow Cloak','Tangling Hair'].indexOf(e.ability)>=0) return true;
            var m=['flash','mudslap','smokescreen','sweetkiss','mudbomb','octazooka','nightdaze'];
            for (var i=0;i<m.length;i++) if (mv.indexOf(m[i])>=0) return true;
            return false; },
          tier: function(e) {
            var hasAbility=['Sand Veil','Snow Cloak','Tangling Hair'].indexOf(e.ability)>=0;
            var hasItem=e.item==='Bright Powder'||e.item==='Lax Incense';
            return (hasAbility&&hasItem) ? null : 'silver'; } },

        { id:'QCL',  cat:'threat', emoji:'🐾', name:'Quick Claw',
          desc:'Red: Quick Claw + Quick Draw stacked | Blue: Quick Claw item or Quick Draw ability alone',
          check: function(e) { return e.item==='Quick Claw'||e.ability==='Quick Draw'; },
          tier: function(e) {
            return (e.item==='Quick Claw'&&e.ability==='Quick Draw') ? null : 'silver'; } },

        { id:'CRIT', cat:'threat', emoji:'🎲', name:'Crit Machine',
          desc:'Red: Sniper ability + Scope Lens/Razor Claw stacked | Blue: ability, item, or high-crit move alone',
          check: function(e,mv) {
            if (e.ability==='Sniper') return true;
            if (e.item==='Scope Lens'||e.item==='Razor Claw') return true;
            var m=['focusenergy','frostbreath','stormthrow','surgingstrikes','wickedblow'];
            for (var i=0;i<m.length;i++) if (mv.indexOf(m[i])>=0) return true;
            return false; },
          tier: function(e) {
            var hasAbility=e.ability==='Sniper';
            var hasItem=e.item==='Scope Lens'||e.item==='Razor Claw';
            return (hasAbility&&hasItem) ? null : 'silver'; } },

        { id:'SPB',  cat:'threat', emoji:'🏎️', name:'Speed Booster',
          desc:'Primary: Speed Boost ability — threat red | Secondary: speed-raising moves (Agility, Dragon Dance, etc.) — utility blue',
          check: function(e,mv) {
            if (e.ability==='Speed Boost') return true;
            var m=['agility','rockpolish','dragondance','quiverdance','shiftgear','autotomize','flamecharge'];
            for (var i=0;i<m.length;i++) if (mv.indexOf(m[i])>=0) return true;
            return false; },
          tier: function(e) { return e.ability==='Speed Boost' ? null : 'silver'; } },

        { id:'RET',  cat:'threat', emoji:'↩️', name:'Retaliator',
          desc:'Move powered by ally\'s death: Retaliate (x2 if ally fainted), Last Respects (+50 BP per fainted)',
          check: function(e,mv) {
            return mv.indexOf('retaliate')>=0||mv.indexOf('lastrespects')>=0; } },

        { id:'PRI!', cat:'threat', emoji:'❗', name:'Priority Proc',
          desc:'Quick Draw ability or Quick Claw item — may randomly act first',
          check: function(e) { return e.ability==='Quick Draw'||e.item==='Quick Claw'; } },

        { id:'TRAP', cat:'threat', emoji:'🕸️', name:'Trapper',
          desc:'Arena Trap / Shadow Tag / Magnet Pull — prevents opponent from switching out',
          check: function(e) {
            return ['Arena Trap','Shadow Tag','Magnet Pull'].indexOf(e.ability)>=0; } },

        { id:'STS',  cat:'threat', emoji:'☠️', name:'Status Inducer',
          desc:'Primary: dedicated status move (Spore, T-Wave, etc.) — threat red | Secondary: status proc chance (Scald, etc.) — utility blue',
          check: function(e,mv,mdata) {
            var primary=['toxic','thunderwave','spore','sleeppowder','willowisp','glare',
                         'stunspore','hypnosis','yawn','sing','nuzzle','toxicthread','darkvoid'];
            for (var i=0;i<primary.length;i++) if (mv.indexOf(primary[i])>=0) return true;
            return mdata.hasSecondaryStatus||false; },
          tier: function(e,mv,mdata) {
            var primary=['toxic','thunderwave','spore','sleeppowder','willowisp','glare',
                         'stunspore','hypnosis','yawn','sing','nuzzle','toxicthread','darkvoid'];
            for (var i=0;i<primary.length;i++) if (mv.indexOf(primary[i])>=0) return null;
            return 'silver'; } },

        { id:'DEB',  cat:'threat', emoji:'📉', name:'Debuffer',
          desc:'Gold: guaranteed stat-drop (Charm, Lunge, Breaking Swipe, etc.) | Silver: secondary chance',
          check: function(e,mv) {
            var primary=['charm','growl','screech','faketears','partingshot','eerieimpulse',
                         'tickle','featherdance','memento',
                         'lunge','breakingswipe','snarl','acidspray','mysticalfire'];
            for (var i=0;i<primary.length;i++) if (mv.indexOf(primary[i])>=0) return true;
            return e._hasDebuffMove||false; },
          tier: function(e,mv) {
            var primary=['charm','growl','screech','faketears','partingshot','eerieimpulse',
                         'tickle','featherdance','memento',
                         'lunge','breakingswipe','snarl','acidspray','mysticalfire'];
            for (var i=0;i<primary.length;i++) if (mv.indexOf(primary[i])>=0) return 'gold';
            return 'silver'; } },

        { id:'BOOST',cat:'threat', emoji:'📈', name:'Self Booster',
          desc:'Has moves that sharply raise own stats (Swords Dance, Nasty Plot, Dragon Dance, Shell Smash, etc.)',
          check: function(e,mv) {
            var m=['swordsdance','nastyplot','calmmind','dragondance','quiverdance',
                   'tailglow','geomancy','shiftgear','rockpolish','shellsmash',
                   'growth','workup','noretreat','victorydance'];
            for (var i=0;i<m.length;i++) if (mv.indexOf(m[i])>=0) return true;
            return false; } },

        { id:'TR',   cat:'threat', emoji:'🔄', name:'Trick Room',
          desc:'Has Trick Room — reverses speed order for 5 turns',
          check: function(e,mv) { return mv.indexOf('trickroom')>=0; } },

        { id:'PUR',  cat:'threat', emoji:'🏃', name:'Pursuit',
          desc:'Has Pursuit — doubles in power when the target switches out',
          check: function(e,mv) { return mv.indexOf('pursuit')>=0; } },

        { id:'DB',   cat:'threat', emoji:'🪢', name:'Destiny Bond',
          desc:'Has Destiny Bond — if the user faints this turn, the attacker also faints',
          check: function(e,mv) { return mv.indexOf('destinybond')>=0; } },

    ];

    /**
     * Compute tags for a roster entry.
     * Returns an array of matching TAG_DEFS objects.
     */
    function computeEntryTags(entry) {
        if (!entry) return [];
        // Enrich missing types/ability from set data so team-panel entries
        // behave the same as box entries (which use getMonTypeInfo explicitly).
        if ((!entry.types || entry.types.length === 0) && entry.name) {
            try {
                var _enrichInfo = getMonTypeInfo(entry.name, entry.setId);
                if (_enrichInfo.types && _enrichInfo.types.length) entry.types = _enrichInfo.types;
                if (!entry.ability && _enrichInfo.ability) entry.ability = _enrichInfo.ability;
            } catch(ex) {}
        }
        var moves = getEntryMoves(entry);
        var mvKeys = [];
        for (var i=0;i<moves.length;i++) {
            if (moves[i]&&moves[i]!=='(No Move)')
                mvKeys.push(moves[i].toLowerCase().replace(/[\s\-\']+/g,''));
        }
        // Pre-scan move data for common binary properties
        var mdata = { hasPriority:false, hasSpread:false, hasNoMiss:false, hasSecondaryStatus:false };
        var hasDebuffMove = false;
        for (var mi=0;mi<moves.length;mi++) {
            if (!moves[mi]||moves[mi]==='(No Move)') continue;
            var md = lookupMoveData(moves[mi]);
            if (!md) continue;
            if (md.priority&&md.priority>0&&md.category!=='Status') mdata.hasPriority = true;
            if (md.target&&(md.target==='allAdjacentFoes'||md.target==='allAdjacent'||md.target==='all')) mdata.hasSpread = true;
            // Only flag always-hitting damaging moves (not Status moves like Toxic, Protect)
            if (md.accuracy===true&&md.category!=='Status') mdata.hasNoMiss = true;
            // Secondary status (Scald burn, Body Slam paralysis, etc.)
            if (md.secondary&&md.secondary.status) mdata.hasSecondaryStatus = true;
            if (md.boosts) {
                for (var stat in md.boosts) {
                    if (md.boosts[stat]<0&&md.target!=='self'&&md.target!=='allySide') hasDebuffMove = true;
                }
            }
            if (md.secondary&&md.secondary.boosts) {
                for (var stat2 in md.secondary.boosts) {
                    if (md.secondary.boosts[stat2]<0) hasDebuffMove = true;
                }
            }
        }
        entry._hasDebuffMove = hasDebuffMove;

        var result = [];
        for (var t=0;t<TAG_DEFS.length;t++) {
            try {
                if (!TAG_DEFS[t].check(entry,mvKeys,mdata)) continue;
                var tier = TAG_DEFS[t].tier ? TAG_DEFS[t].tier(entry,mvKeys,mdata) : null;
                result.push({ def: TAG_DEFS[t], tier: tier });
            } catch(ex) {}
        }
        return result;
    }

    // Expose for Playwright regression tests
    if (typeof window !== 'undefined') {
        if (!window.__rsaTest) window.__rsaTest = {};
        window.__rsaTest.computeEntryTags = computeEntryTags;
        window.__rsaTest.TAG_DEFS = TAG_DEFS;
    }

    /** Sort tag results: gold first, then threat (red), then util (blue), then silver. */
    function sortTagResults(tagged) {
        return tagged.slice().sort(function(a,b){
            function key(tr){ return tr.tier==='gold'?0:tr.def.cat==='threat'?1:tr.def.cat==='util'?2:3; }
            return key(a)-key(b);
        });
    }

    /** Render emoji badge HTML for a list of { def, tier } tag results. */
    function renderTagBadges(tagResults) {
        if (!tagResults||!tagResults.length) return '';
        tagResults = sortTagResults(tagResults);
        var html = '<div class="rsa-tag-badges">';
        for (var i=0;i<tagResults.length;i++) {
            var t = tagResults[i].def;
            var tier = tagResults[i].tier;
            var tierCls = tier ? ' rsa-tag-tier-' + tier : '';
            var tierLabel = tier ? ' (' + (tier==='gold' ? 'Primary' : 'Secondary') + ')' : '';
            var tip = esc(t.name + tierLabel + ': ' + t.desc);
            html += '<span class="rsa-tag-badge rsa-tag-' + t.cat + tierCls + '" data-tooltip="' + tip + '">' + t.emoji + '</span>';
        }
        html += '</div>';
        return html;
    }

    // Active tag filters for the box: { 'FO': true, ... }
    var tagFilters = { box:{} };
    var tagTierFilters = { box:'all' };

    /** Render the tag filter bar HTML for the box */
    function renderTagFilterBar(side) {
        var currentTier = tagTierFilters[side] || 'all';
        var html = '<div class="rsa-tag-filter-bar" id="rsa-tag-filter-' + side + '">';
        html += '<span class="rsa-tier-filter-group">' +
            '<span class="rsa-tier-filter-pill' + (currentTier==='all'?' rsa-tier-pill-active':'') + '" data-side="' + side + '" data-tier="all">All</span>' +
            '<span class="rsa-tier-filter-pill rsa-tier-pill-gold' + (currentTier==='gold'?' rsa-tier-pill-active':'') + '" data-side="' + side + '" data-tier="gold" title="Gold tier">\u2605</span>' +
            '<span class="rsa-tier-filter-pill rsa-tier-pill-primary' + (currentTier==='primary'?' rsa-tier-pill-active':'') + '" data-side="' + side + '" data-tier="primary" title="Primary tier">\u25cf</span>' +
            '<span class="rsa-tier-filter-pill rsa-tier-pill-silver' + (currentTier==='silver'?' rsa-tier-pill-active':'') + '" data-side="' + side + '" data-tier="silver" title="Silver tier">\u25cc</span>' +
        '</span>';
        for (var i=0;i<TAG_DEFS.length;i++) {
            var t = TAG_DEFS[i];
            var active = tagFilters[side][t.id] ? ' rsa-tag-filter-active' : '';
            var tip = esc('Filter: ' + t.name + ' - ' + t.desc);
            var alwaysGold = false;
            if (t.tier) { try { alwaysGold = t.tier({ability:'',item:'',types:[]}, [], {}) === 'gold'; } catch(ex) {} }
            var btnGoldCls = alwaysGold ? ' rsa-tag-tier-gold' : '';
            var tierDots = '';
            if (t.tier && !alwaysGold) {
                var src = t.tier.toString();
                tierDots = '<span class="rsa-tier-dots">';
                if (src.indexOf("'gold'") >= 0) tierDots += '<span class="rsa-tier-dot rsa-tier-dot-gold">\u2605</span>';
                if (src.indexOf('return null') >= 0 || src.indexOf('? null') >= 0)
                    tierDots += '<span class="rsa-tier-dot rsa-tier-dot-' + t.cat + '">\u25cf</span>';
                tierDots += '<span class="rsa-tier-dot rsa-tier-dot-silver">\u25cc</span>';
                tierDots += '</span>';
            }
            html += '<span class="rsa-tag-filter-btn rsa-tag-' + t.cat + btnGoldCls + active + '"' +
                ' data-side="' + side + '" data-tagid="' + esc(t.id) + '"' +
                ' data-tooltip="' + tip + '">' + t.emoji + ' <span class="rsa-tag-filter-name">' + esc(t.name) + '</span>' + tierDots + '</span>';
        }
        html += '<button class="rsa-tag-filter-clear" data-side="' + side + '" title="Clear all tag filters">\u2715</button>';
        html += '</div>';
        return html;
    }

    /** Render the box tag coverage modal body — analyses all box Pokémon */
    function renderUtilityModal() {
        var mons = getBoxPokemon('p1');
        var html = '<div class="rsa-util-section-title">\ud83d\udce6 Box Tag Coverage</div>';
        if (!mons||!mons.length) {
            html += '<p style="color:#a0aec0">No Pok\u00e9mon in box.</p>';
            return html;
        }
        var entries = [];
        for (var bi=0;bi<mons.length;bi++) {
            var m = mons[bi];
            var info = { types:[], ability:'' };
            try { info = getMonTypeInfo(m.name, m.setId); } catch(ex) {}
            var item = '';
            try { var _set = lookupSet(m.setId); if (_set) item = _set.item||''; } catch(ex) {}
            entries.push({ name:m.name, setId:m.setId, ability:info.ability, item:item, types:info.types });
        }
        var coveredRows = '', missingRows = '';
        for (var ti=0;ti<TAG_DEFS.length;ti++) {
            var td = TAG_DEFS[ti];
            var matching = [];
            for (var mi=0;mi<entries.length;mi++) {
                try {
                    var tags = computeEntryTags(entries[mi]);
                    for (var k=0;k<tags.length;k++) {
                        if (tags[k].def.id===td.id) { matching.push(entries[mi].name); break; }
                    }
                } catch(ex) {}
            }
            var isMissing = !matching.length;
            var nameList = esc(matching.join(', '));
            var row = '<div class="rsa-util-row' + (isMissing ? ' rsa-util-missing' : '') + '">' +
                '<span class="rsa-tag-badge rsa-tag-' + td.cat + '" data-tooltip="' + esc(td.name+': '+td.desc) + '">' + td.emoji + '</span>' +
                '<span class="rsa-util-tag-name">' + esc(td.name) + '</span>' +
                '<span class="rsa-util-count">' + (isMissing ? '\u2014' : matching.length) + '</span>' +
                '<span class="rsa-util-names">' + (isMissing ? '<em style="color:#4a5568">not covered</em>' : nameList) + '</span>' +
            '</div>';
            if (isMissing) missingRows += row; else coveredRows += row;
        }
        html += '<div class="rsa-util-grid">' + coveredRows + missingRows + '</div>';
        return html;
    }

    /** Render the Battle Tag Analysis modal: compare P1 team vs P2 team tag-by-tag */
    function renderBattleTagModal() {
        var line = curLine();
        var p1roster = line && line.teams && line.teams.p1 ? line.teams.p1.roster : [];
        var p2roster = line && line.teams && line.teams.p2 ? line.teams.p2.roster : [];
        if (!p1roster.length && !p2roster.length) {
            return '<p style="color:#a0aec0">No teams in current battle.</p>';
        }

        // Index tags per roster
        function tagIndex(roster) {
            var idx = {}; // tagId -> [name, ...]
            for (var ri=0;ri<roster.length;ri++) {
                var tgs = computeEntryTags(roster[ri]);
                for (var ti=0;ti<tgs.length;ti++) {
                    var id = tgs[ti].def.id;
                    if (!idx[id]) idx[id] = { names:[], tier: tgs[ti].tier };
                    idx[id].names.push(roster[ri].name);
                }
            }
            return idx;
        }
        var p1idx = tagIndex(p1roster);
        var p2idx = tagIndex(p2roster);

        var html = '<div class="rsa-bta-grid">';
        // Header
        html += '<div class="rsa-bta-row rsa-bta-header">' +
            '<div class="rsa-bta-cell rsa-bta-badge"></div>' +
            '<div class="rsa-bta-cell rsa-bta-tagname">Tag</div>' +
            '<div class="rsa-bta-cell rsa-bta-side rsa-bta-p1">Your Team</div>' +
            '<div class="rsa-bta-cell rsa-bta-side rsa-bta-p2">Opponent</div>' +
        '</div>';
        for (var ti=0;ti<TAG_DEFS.length;ti++) {
            var td = TAG_DEFS[ti];
            var p1has = p1idx[td.id];
            var p2has = p2idx[td.id];
            if (!p1has && !p2has) continue;
            var onlyP1 = p1has && !p2has;
            var onlyP2 = !p1has && p2has;
            var rowCls = onlyP1 ? ' rsa-bta-adv-p1' : onlyP2 ? ' rsa-bta-adv-p2' : '';
            var tierCls = (p1has && p1has.tier ? ' rsa-tag-tier-'+p1has.tier : '') ||
                          (p2has && p2has.tier ? ' rsa-tag-tier-'+p2has.tier : '');
            html += '<div class="rsa-bta-row' + rowCls + '">' +
                '<div class="rsa-bta-cell rsa-bta-badge"><span class="rsa-tag-badge rsa-tag-' + td.cat + tierCls + '" data-tooltip="' + esc(td.name+': '+td.desc) + '">' + td.emoji + '</span></div>' +
                '<div class="rsa-bta-cell rsa-bta-tagname">' + esc(td.name) + '</div>' +
                '<div class="rsa-bta-cell rsa-bta-side rsa-bta-p1">' + (p1has ? '<span class="rsa-bta-names rsa-bta-names-p1">' + esc(p1has.names.join(', ')) + '</span>' : '<span class="rsa-bta-miss">\u2014</span>') + '</div>' +
                '<div class="rsa-bta-cell rsa-bta-side rsa-bta-p2">' + (p2has ? '<span class="rsa-bta-names rsa-bta-names-p2">' + esc(p2has.names.join(', ')) + '</span>' : '<span class="rsa-bta-miss">\u2014</span>') + '</div>' +
            '</div>';
        }
        html += '</div>';
        return html;
    }

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

    /** Ability-based full type immunities: abilityKey → immuneType
     *  DEPRECATED: Replaced by EffectsRegistry.abilities[key].typeImmunity in Phase 2.1.
     *  Kept here as a fallback in case the registry hasn't loaded (defensive).
     */
    var ABILITY_IMMUNITIES = {
        levitate: 'Ground', flashfire: 'Fire',
        lightningrod: 'Electric', voltabsorb: 'Electric', motordrive: 'Electric',
        waterabsorb: 'Water', stormdrain: 'Water', dryskin: 'Water',
        sapsipper: 'Grass', eartheater: 'Ground', wellbakedbody: 'Fire'
    };

    /** Lookup an ability's effect entry from the EffectsRegistry. Returns null if
     *  the registry hasn't loaded or the ability isn't registered. */
    function getAbilityEffects(abilityName) {
        if (!abilityName) return null;
        if (typeof window === 'undefined' || !window.EffectsRegistry) return null;
        var key = String(abilityName).toLowerCase().replace(/[\s\-\']+/g, '');
        return window.EffectsRegistry.abilities[key] || null;
    }

    /** Lookup an item's effect entry from the EffectsRegistry. Returns null if
     *  the registry hasn't loaded or the item isn't registered. */
    function getItemEffects(itemName) {
        if (!itemName) return null;
        if (typeof window === 'undefined' || !window.EffectsRegistry) return null;
        var key = String(itemName).toLowerCase().replace(/[\s\-\']+/g, '');
        return window.EffectsRegistry.items[key] || null;
    }

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
        // Check ability immunity via EffectsRegistry (with hardcoded fallback)
        if (abilityName) {
            var ab = getAbilityEffects(abilityName);
            if (ab) {
                if (ab.typeImmunity === atkType) mult = 0;
                if (ab.typeDamageMod && ab.typeDamageMod.type === atkType) {
                    mult *= ab.typeDamageMod.multiplier;
                }
                if (ab.wonderGuard && mult <= 1) mult = 0;
            } else {
                // Fallback: registry not loaded — use legacy hardcoded constants
                var key = abilityName.toLowerCase().replace(/[\s\-\']+/g, '');
                if (ABILITY_IMMUNITIES[key] && ABILITY_IMMUNITIES[key] === atkType) mult = 0;
                if (key === 'dryskin' && atkType === 'Fire') mult *= 1.25;
                if (key === 'wonderguard' && mult <= 1) mult = 0;
            }
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
    /** Apply simulated item multiplier from boxCalcSettings to a damage % */
    function applySimItemMultiplier(pct) {
        switch (boxCalcSettings.simItem) {
            case 'choice': return pct * 1.5;
            case 'lifeorb': return pct * 1.3;
            case 'typeenhance': return pct * 1.2;
            case 'band': return pct * 1.1;
            default: return pct;
        }
    }

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
                // Use effective speed including weather/terrain/item/ability modifiers
                var _bEntry = { item: p1.item || '', ability: p1.ability || '', status: '', boosts: { sp: (p1.boosts && p1.boosts.spe) || 0 } };
                speed = calcEffectiveSpeed(_bEntry, p1.stats ? p1.stats.spe : 0);

                // Offensive rank: best of all P1 moves vs P2
                for (var j = 0; j < 4; j++) {
                    var r0 = results[0][j];
                    // Skip Explosion / Self-Destruct if setting enabled
                    if (boxCalcSettings.ignoreSelfdestruct && p1.moves[j]) {
                        var mvName0 = p1.moves[j].name || '';
                        var mvData0 = lookupMoveData(mvName0);
                        if (mvData0 && mvData0.selfdestruct) continue;
                    }
                    var dmg0 = Array.isArray(r0.damage) ? r0.damage[r0.damage.length - 1] : r0.damage;
                    var hits0 = p1.moves[j] ? (p1.moves[j].hits || 1) : 1;
                    var pct0 = dmg0 * hits0 / p2hp * 100;
                    // Apply simulated item multiplier
                    pct0 = applySimItemMultiplier(pct0);
                    // Apply Guts boost if applicable
                    var p1AeBox = getAbilityEffects(p1.ability);
                    var p1HasGutsBox = p1AeBox ? !!p1AeBox.burnAttackBoost : (p1.ability === 'Guts');
                    if (boxCalcSettings.burnGuts && p1HasGutsBox) {
                        var cat0 = p1.moves[j] ? p1.moves[j].category : '';
                        if (cat0 === 'Physical') pct0 *= 1.5;
                    }
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

    // Box calc settings — affect color coding and offense/defense rankings
    var boxCalcSettings = {
        ignoreSelfdestruct: false,  // skip Explosion / Self-Destruct in offense calcs
        burnGuts: false,            // apply 1.5× Atk multiplier for Guts mons
        simItem: ''                 // '', 'choice', 'lifeorb', 'typeenhance', 'band'
    };
    // Attempt to restore from localStorage
    try {
        var _bcs = JSON.parse(localStorage.getItem('rsa-box-calc-settings'));
        if (_bcs) boxCalcSettings = _bcs;
    } catch (e) {}
    function saveBoxCalcSettings() {
        try { localStorage.setItem('rsa-box-calc-settings', JSON.stringify(boxCalcSettings)); } catch (e) {}
    }

    // ════════════════════════════════════════════════════════════
    // AI SWITCH-IN PREDICTION ENGINE
    // ════════════════════════════════════════════════════════════

    /**
     * Compute the AI switch-in score for one AI pokemon vs the player's pokemon.
     * p1calc = calc.Pokemon for the player's mon (with current HP/boosts)
     * p2calc = calc.Pokemon for the AI candidate (fresh, full HP)
     * returns { score, reason }
     */
    // p1SpdOverride: effective P1 speed including current boost stage (from getSpeedInfo)
    function computeSwitchScore(p1calc, p2calc, p1SpdOverride) {
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

            // Speed comparison — use effective P1 speed (including boosts) when provided
            var p1spd = (p1SpdOverride != null) ? p1SpdOverride : (p1calc.stats ? p1calc.stats.spe : 0);
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
    /**
     * Predict the best P2 switch-in against a given P1 reference pokemon.
     * @param {string} p1SetIdOrCalc  setId of P1's relevant mon, or '$p1' to read the form.
     * @param {string} [forSlot]      'p2a' or 'p2b' — used in doubles-2t to restrict candidates
     *                                to only the trainer whose slot fainted.
     */
    function predictSwitchIn(p1SetIdOrCalc, forSlot) {
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
        var activeP2B = getActiveEntryB(team); // in doubles, second active slot must also be excluded

        // In doubles-2t, restrict candidates to the same trainer's mons.
        // Left trainer owns indices 0..leftMax-1; right trainer owns leftMax..end.
        var idxMin = 0, idxMax = team.roster.length - 1;
        if (battleFormat === 'doubles-2t' && line.teamSplit && forSlot) {
            var leftMax2t = line.teamSplit.left || 3;
            if (forSlot === 'p2a') {
                idxMax = leftMax2t - 1;
            } else if (forSlot === 'p2b') {
                idxMin = leftMax2t;
            }
        }

        // Pass effective P1 speed (including current boost stages) for accurate speed comparison
        var p1SpdOverride = null;
        if (p1SetIdOrCalc === '$p1') {
            try { p1SpdOverride = getSpeedInfo().p1; } catch (e) {}
        }

        var candidates = [];

        for (var i = idxMin; i <= Math.min(idxMax, team.roster.length - 1); i++) {
            var e = team.roster[i];
            // Skip both active P2 slots and fainted mons
            if (activeP2 && e.name === activeP2.name) continue;
            if (activeP2B && e.name === activeP2B.name) continue;
            if (e.currentHP <= 0) continue;

            var p2;
            try { p2 = createPokemon(e.setId); } catch (ex) {
                // createPokemon() requires setdex[name][setName] to exist — it throws
                // (not null-safe) when trainer sets aren't present in the smogon setdex.
                // Fall back: build a calc.Pokemon directly from roster + lookupSet data.
                try {
                    var fbSet = lookupSet(e.setId);
                    var fbMoveNames = (e.moves || []).slice(0, 4);
                    while (fbMoveNames.length < 4) fbMoveNames.push('(No Move)');
                    var fbCalcMoves = [];
                    for (var mi = 0; mi < 4; mi++) {
                        fbCalcMoves.push(new calc.Move(gen, fbMoveNames[mi] || '(No Move)'));
                    }
                    // Build EVs/IVs from set data (stored in legacy stat keys: hp/at/df/sa/sd/sp)
                    var fbEvs = {}, fbIvs = {};
                    var legacyToCalc = { hp: 'hp', at: 'atk', df: 'def', sa: 'spa', sd: 'spd', sp: 'spe' };
                    for (var lk in legacyToCalc) {
                        var ck = legacyToCalc[lk];
                        fbEvs[ck] = (fbSet && fbSet.evs && fbSet.evs[lk] != null) ? fbSet.evs[lk] : 0;
                        fbIvs[ck] = (fbSet && fbSet.ivs && fbSet.ivs[lk] != null) ? fbSet.ivs[lk] : 31;
                    }
                    p2 = new calc.Pokemon(gen, e.name, {
                        level: fbSet ? (fbSet.level || 50) : 50,
                        ability: e.ability || '',
                        item: e.item || '',
                        nature: fbSet ? (fbSet.nature || 'Hardy') : 'Hardy',
                        ivs: fbIvs,
                        evs: fbEvs,
                        moves: fbCalcMoves
                    });
                } catch (ex2) { continue; }
            }

            var result = computeSwitchScore(p1, p2, p1SpdOverride);
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
                 reason: best.reason, partyIdx: best.partyIdx, scores: candidates };
    }

    // ════════════════════════════════════════════════════════════
    // BAIT ANALYSIS — HP threshold → switch-in / move distribution
    // ════════════════════════════════════════════════════════════

    /**
     * Sweep P1's HP from 100% down to 0 and at each step determine:
     *  - which P2 candidate wins the switch-in prediction
     *  - what move distribution that winner would use
     * Returns an array of threshold bands, sorted from high HP to low:
     *   [{ hpUpper, hpLower, pctUpper, pctLower, baitName, baitSprite,
     *      reason, score, faster, moves: [{move, rate}] }, ...]
     */
    function computeBaitAnalysis(p1Entry) {
        var line = curLine();
        var team = line.teams.p2;
        if (!p1Entry || team.roster.length < 2) return [];

        // Build P1 calc pokemon once, then vary its HP
        var p1calc;
        try { p1calc = createPokemon(p1Entry.setId); } catch (e) { return []; }
        if (p1Entry.item !== undefined) p1calc.item = p1Entry.item;
        if (p1Entry.ability) p1calc.ability = p1Entry.ability;
        var maxHP = p1calc.rawStats ? p1calc.rawStats.hp : (p1calc.stats ? p1calc.stats.hp : 100);
        if (maxHP <= 0) return [];

        // P1 speed (effective, from form or roster)
        var p1Spd;
        try { p1Spd = getSpeedInfo().p1; } catch (e) { p1Spd = computeEntrySpeed(p1Entry); }
        var tr = $('#trickroom').is(':checked');

        // Pre-build all alive P2 candidate calc.Pokemon objects
        var activeP2 = getActiveEntry(team);
        var candidates = [];
        for (var i = 0; i < team.roster.length; i++) {
            var e = team.roster[i];
            if (activeP2 && e.name === activeP2.name) continue;
            if (e.currentHP <= 0) continue;
            var p2calc;
            try { p2calc = createPokemon(e.setId); } catch (ex) {
                try {
                    var fbSet = lookupSet(e.setId);
                    var fbMoveNames = (e.moves || []).slice(0, 4);
                    while (fbMoveNames.length < 4) fbMoveNames.push('(No Move)');
                    var fbCalcMoves = [];
                    for (var mi = 0; mi < 4; mi++) fbCalcMoves.push(new calc.Move(gen, fbMoveNames[mi] || '(No Move)'));
                    var fbEvs = {}, fbIvs = {};
                    var legacyToCalc = { hp: 'hp', at: 'atk', df: 'def', sa: 'spa', sd: 'spd', sp: 'spe' };
                    for (var lk in legacyToCalc) {
                        var ck = legacyToCalc[lk];
                        fbEvs[ck] = (fbSet && fbSet.evs && fbSet.evs[lk] != null) ? fbSet.evs[lk] : 0;
                        fbIvs[ck] = (fbSet && fbSet.ivs && fbSet.ivs[lk] != null) ? fbSet.ivs[lk] : 31;
                    }
                    p2calc = new calc.Pokemon(gen, e.name, {
                        level: fbSet ? (fbSet.level || 50) : 50,
                        ability: e.ability || '', item: e.item || '',
                        nature: fbSet ? (fbSet.nature || 'Hardy') : 'Hardy',
                        ivs: fbIvs, evs: fbEvs, moves: fbCalcMoves
                    });
                } catch (ex2) { continue; }
            }
            if (e.item !== undefined) p2calc.item = e.item;
            if (e.ability) p2calc.ability = e.ability;
            candidates.push({ entry: e, poke: p2calc, idx: i });
        }
        if (candidates.length === 0) return [];

        // Pre-compute damage results and calc fields once (reused every HP sample)
        var field = createField();
        var fieldSwap = field.clone().swap();

        // Pre-compute AI damage from each candidate and player damage to each candidate
        var precomp = [];
        for (var ci = 0; ci < candidates.length; ci++) {
            var c = candidates[ci];
            var aiDmgs = []; // each move's max damage to P1
            for (var m = 0; m < 4; m++) {
                try {
                    var res = calc.calculate(gen, c.poke, p1calc, c.poke.moves[m], fieldSwap);
                    var d = res.damage;
                    var maxD = Array.isArray(d) ? d[d.length - 1] : d;
                    var hits = c.poke.moves[m] ? (c.poke.moves[m].hits || 1) : 1;
                    aiDmgs.push(maxD * hits);
                } catch (e) { aiDmgs.push(0); }
            }
            var plDmgs = []; // each of P1's move's max damage to candidate
            var p2hp = c.poke.curHP ? c.poke.curHP() : (c.poke.stats ? c.poke.stats.hp : 100);
            if (!p2hp) p2hp = 100;
            for (var m = 0; m < 4; m++) {
                try {
                    var res = calc.calculate(gen, p1calc, c.poke, p1calc.moves[m], field);
                    var d = res.damage;
                    var maxD = Array.isArray(d) ? d[d.length - 1] : d;
                    var hits = p1calc.moves[m] ? (p1calc.moves[m].hits || 1) : 1;
                    plDmgs.push(maxD * hits);
                } catch (e) { plDmgs.push(0); }
            }
            var p2spd = c.poke.stats ? c.poke.stats.spe : 0;
            var aiFaster = tr ? (p2spd < p1Spd) : (p2spd > p1Spd);
            if (p1Spd === p2spd) aiFaster = false;

            precomp.push({
                candidate: c,
                aiDmgs: aiDmgs,
                plDmgs: plDmgs,
                p2hp: p2hp,
                p2spd: p2spd,
                aiFaster: aiFaster,
                aiSlower: !aiFaster && p1Spd !== p2spd
            });
        }

        // Sample HP at every 1% granularity (fine enough for accurate thresholds)
        var step = Math.max(1, Math.floor(maxHP / 100));
        var bands = [];
        var prevBaitName = null;
        var prevMoveKey = null;

        for (var hp = maxHP; hp >= 1; hp -= step) {
            // Score each candidate at this P1 HP level
            var bestScore = -999, bestIdx = -1;
            for (var ci = 0; ci < precomp.length; ci++) {
                var pc = precomp[ci];
                // Recalculate damage % relative to current HP
                var bestAiPct = 0;
                for (var m = 0; m < pc.aiDmgs.length; m++) {
                    var pct = pc.aiDmgs[m] / hp * 100;
                    if (pct > bestAiPct) bestAiPct = pct;
                }
                var bestPlPct = 0;
                for (var m = 0; m < pc.plDmgs.length; m++) {
                    var pct = pc.plDmgs[m] / pc.p2hp * 100;
                    if (pct > bestPlPct) bestPlPct = pct;
                }
                var aiOHKO = bestAiPct >= 100;
                var plOHKO = bestPlPct >= 100;

                var score;
                var aiName = (pc.candidate.poke.name || '').toLowerCase();
                if (aiName === 'ditto') { score = 2; }
                else if (aiName === 'wynaut' || aiName === 'wobbuffet') {
                    score = (pc.aiSlower && plOHKO) ? 0 : 2;
                }
                else if (pc.aiFaster && aiOHKO) score = 5;
                else if (pc.aiSlower && aiOHKO && !plOHKO) score = 4;
                else if (pc.aiFaster && bestAiPct > bestPlPct) score = 3;
                else if (pc.aiSlower && bestAiPct > bestPlPct) score = 2;
                else if (pc.aiFaster) score = 1;
                else if (pc.aiSlower && plOHKO) score = -1;
                else score = 0;

                if (score > bestScore || (score === bestScore && bestIdx === -1)) {
                    bestScore = score;
                    bestIdx = ci;
                }
            }

            if (bestIdx < 0) continue;
            var winner = precomp[bestIdx];
            var baitName = winner.candidate.entry.name;

            // Get move rates for this matchup at this P1 HP
            var fakeP1 = $.extend(true, {}, p1Entry);
            fakeP1.currentHP = hp;
            var moveRates = calcP2MoveRates(winner.candidate.entry, fakeP1);
            // Count active moves (rate > ~0%) to group by
            var activeMoveCount = 0;
            for (var ri = 0; ri < moveRates.rates.length; ri++) {
                if (moveRates.rates[ri].rate >= 0.005) activeMoveCount++;
            }
            var moveKey = baitName + '|' + activeMoveCount;

            if (moveKey !== prevMoveKey) {
                // New band — initialise min/max tracking per move
                var movesWithRange = [];
                for (var ri = 0; ri < moveRates.rates.length; ri++) {
                    movesWithRange.push({
                        move: moveRates.rates[ri].move,
                        minRate: moveRates.rates[ri].rate,
                        maxRate: moveRates.rates[ri].rate
                    });
                }
                bands.push({
                    hpUpper: hp,
                    hpLower: hp,
                    pctUpper: Math.round(hp / maxHP * 100),
                    pctLower: Math.round(hp / maxHP * 100),
                    baitName: baitName,
                    baitSprite: winner.candidate.entry.sprite || getSprite(baitName),
                    reason: winner.aiFaster ? 'Faster' : (winner.aiSlower ? 'Slower' : 'Tie'),
                    score: bestScore,
                    faster: winner.aiFaster,
                    moves: movesWithRange
                });
                prevMoveKey = moveKey;
                prevBaitName = baitName;
            } else {
                // Extend current band and widen min/max ranges
                var cur = bands[bands.length - 1];
                cur.hpLower = hp;
                cur.pctLower = Math.round(hp / maxHP * 100);
                for (var ri = 0; ri < moveRates.rates.length; ri++) {
                    if (cur.moves[ri]) {
                        cur.moves[ri].minRate = Math.min(cur.moves[ri].minRate, moveRates.rates[ri].rate);
                        cur.moves[ri].maxRate = Math.max(cur.moves[ri].maxRate, moveRates.rates[ri].rate);
                    }
                }
            }
        }
        return bands;
    }

    /**
     * Render the bait analysis panel HTML from computed bands.
     * currentHP/maxHP are P1's HP at time of analysis (for the position marker).
     */
    function renderBaitPanel(bands, p1Entry, currentHP, maxHP) {
        if (!bands || bands.length === 0) {
            return '<div class="rsa-bait-empty">No bait data — need at least 2 alive P2 mons.</div>';
        }

        // Assign a stable color to each unique bait name
        var baitColors = {};
        var colorPalette = ['#63b3ed','#fc8181','#68d391','#f6ad55','#b794f4','#f687b3','#4fd1c5','#ecc94b'];
        var colorIdx = 0;
        for (var i = 0; i < bands.length; i++) {
            if (!baitColors[bands[i].baitName]) {
                baitColors[bands[i].baitName] = colorPalette[colorIdx % colorPalette.length];
                colorIdx++;
            }
        }

        // Build the visual HP threshold bar
        var barHtml = '<div class="rsa-bait-bar">';
        for (var i = 0; i < bands.length; i++) {
            var b = bands[i];
            var left = (100 - b.pctUpper);
            var width = b.pctUpper - b.pctLower;
            if (width < 1) width = 1;
            var col = baitColors[b.baitName];
            barHtml += '<div class="rsa-bait-segment" ' +
                'style="left:' + left + '%;width:' + width + '%;background:' + col + '" ' +
                'title="' + esc(b.baitName) + ' (' + b.pctLower + '–' + b.pctUpper + '%)">' +
            '</div>';
        }
        // Current HP marker
        if (maxHP > 0) {
            var curPct = Math.round(currentHP / maxHP * 100);
            var markerPos = 100 - curPct;
            barHtml += '<div class="rsa-bait-marker" style="left:' + markerPos + '%" title="Current HP: ' + currentHP + '/' + maxHP + ' (' + curPct + '%)"></div>';
        }
        barHtml += '</div>';

        // Build the band detail rows
        var detailHtml = '';
        for (var i = 0; i < bands.length; i++) {
            var b = bands[i];
            var col = baitColors[b.baitName];
            var spdIcon = b.faster ? '⚡' : '🐢';
            var spdLabel = b.reason;

            // Move breakdown — show [min–max] range; skip moves always at ~0%
            var moveHtml = '';
            for (var mi = 0; mi < b.moves.length; mi++) {
                var m = b.moves[mi];
                if (m.maxRate < 0.005) continue; // skip moves that never fire
                var minPct = Math.round(m.minRate * 100);
                var maxPct = Math.round(m.maxRate * 100);
                var label = minPct === maxPct ? minPct + '%' : minPct + '–' + maxPct + '%';
                var barW = Math.max(2, maxPct);
                // Show a lighter section for the min portion inside the bar
                var minW = Math.max(0, minPct);
                moveHtml += '<div class="rsa-bait-move">' +
                    '<span class="rsa-bait-move-name">' + esc(m.move) + '</span>' +
                    '<div class="rsa-bait-move-bar-wrap">' +
                        '<div class="rsa-bait-move-bar" style="width:' + barW + '%;background:' + col + ';opacity:0.45"></div>' +
                        '<div class="rsa-bait-move-bar rsa-bait-move-bar-min" style="width:' + minW + '%;background:' + col + '"></div>' +
                    '</div>' +
                    '<span class="rsa-bait-move-pct">' + label + '</span>' +
                '</div>';
            }

            var hpRange = b.pctLower === b.pctUpper
                ? b.pctUpper + '%'
                : b.pctLower + '–' + b.pctUpper + '%';

            detailHtml += '<div class="rsa-bait-band">' +
                '<div class="rsa-bait-band-header">' +
                    '<span class="rsa-bait-swatch" style="background:' + col + '"></span>' +
                    '<img class="rsa-bait-sprite" src="' + esc(b.baitSprite) + '" alt="" onerror="this.style.display=\'none\'">' +
                    '<span class="rsa-bait-name">' + esc(b.baitName) + '</span>' +
                    '<span class="rsa-bait-hp-range">' + hpRange + '</span>' +
                    '<span class="rsa-bait-speed">' + spdIcon + ' ' + spdLabel + '</span>' +
                '</div>' +
                '<div class="rsa-bait-moves">' + moveHtml + '</div>' +
            '</div>';
        }

        return '<div class="rsa-bait-content">' +
            '<div class="rsa-bait-title">🎯 Bait Analysis — HP Thresholds</div>' +
            barHtml +
            '<div class="rsa-bait-bands">' + detailHtml + '</div>' +
        '</div>';
    }

    /**
     * Show a modal overlay asking the user to choose who goes first in a speed tie.
     * nameA / nameB are displayed on the two buttons. callback receives 'a' or 'b'.
     */
    function showSpeedTieModal(nameA, nameB, callback) {
        var overlay = document.getElementById('rsa-tie-overlay');
        if (!overlay) {
            var el = document.createElement('div');
            el.id = 'rsa-tie-overlay';
            el.innerHTML =
                '<div id="rsa-tie-modal">' +
                '<div class="rsa-tie-title">⚡ Speed Tie!</div>' +
                '<div class="rsa-tie-msg">Same speed — who goes first this turn?</div>' +
                '<div class="rsa-tie-btns">' +
                '<button id="rsa-tie-btn-a"></button>' +
                '<button id="rsa-tie-btn-b"></button>' +
                '</div></div>';
            el.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;' +
                'background:rgba(0,0,0,0.55);z-index:9999;align-items:center;justify-content:center';
            document.body.appendChild(el);
            var modal = document.getElementById('rsa-tie-modal');
            modal.style.cssText = 'background:var(--bg-card,#23272f);color:var(--text,#e8eaf0);' +
                'border-radius:10px;padding:24px 28px;text-align:center;min-width:280px;' +
                'box-shadow:0 6px 32px rgba(0,0,0,0.4);max-width:90vw';
            document.getElementById('rsa-tie-title') && (document.getElementById('rsa-tie-title').style.cssText = 'font-weight:700;font-size:1.15em;margin-bottom:6px');
            overlay = el;
        }
        var btnA = document.getElementById('rsa-tie-btn-a');
        var btnB = document.getElementById('rsa-tie-btn-b');
        btnA.textContent = nameA + ' first';
        btnB.textContent = nameB + ' first';
        var btnStyle = 'flex:1;padding:9px 16px;cursor:pointer;border-radius:6px;border:1px solid #666;' +
            'font-weight:600;font-size:0.95em;margin:4px;background:var(--bg-btn,#343a46);color:inherit';
        btnA.style.cssText = btnStyle;
        btnB.style.cssText = btnStyle;
        var tieMsg = document.getElementById('rsa-tie-modal').querySelector('.rsa-tie-msg');
        if (tieMsg) tieMsg.style.cssText = 'margin:6px 0 16px;color:var(--text-muted,#9aa0b0);font-size:0.9em';
        var tieBtns = document.getElementById('rsa-tie-modal').querySelector('.rsa-tie-btns');
        if (tieBtns) tieBtns.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-top:4px';
        overlay.style.display = 'flex';
        $(btnA).off('click').on('click', function () { overlay.style.display = 'none'; callback('a'); });
        $(btnB).off('click').on('click', function () { overlay.style.display = 'none'; callback('b'); });
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
        if (moveData.selfSwitch) primaryParts.push('User switches out');
        if (moveData.selfdestruct) primaryParts.push('User faints');
        if (moveData.breaksProtect) primaryParts.push('Breaks Protect');
        if (moveData.weather) {
            var wInfo = WEATHER_MAP[moveData.weather];
            primaryParts.push('Sets ' + (wInfo ? wInfo.label : moveData.weather));
        }
        if (moveData.terrain) {
            var tInfo = TERRAIN_MAP[moveData.terrain];
            primaryParts.push('Sets ' + (tInfo ? tInfo.label + ' Terrain' : moveData.terrain));
        }
        if (moveData.sideCondition) {
            var scKey = moveData.sideCondition.toLowerCase().replace(/[\s\-\']+/g, '');
            var scInfo = SIDE_CONDITION_MAP[scKey];
            if (scInfo) primaryParts.push('Sets ' + moveData.name);
        }
        if (moveData.clearsHazards) {
            var clrLabels = { self: 'Clears own hazards', both: 'Clears all hazards', swap: 'Swaps hazards' };
            primaryParts.push(clrLabels[moveData.clearsHazards] || 'Clears hazards');
        }
        if (moveData.onHit) {
            var hitLabels = { stripItem: 'Removes item', stealItem: 'Steals item', swapItems: 'Swaps items', removeItemBerry: 'Destroys Berry' };
            primaryParts.push(hitLabels[moveData.onHit] || moveData.onHit);
        }
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

    // Rock-type effectiveness vs each type (for Stealth Rock damage)
    var SR_EFFECTIVENESS = {
        'Normal':1,'Fire':2,'Water':0.5,'Electric':1,'Grass':1,'Ice':2,
        'Fighting':0.5,'Poison':1,'Ground':0.5,'Flying':2,'Psychic':1,
        'Bug':2,'Rock':1,'Ghost':1,'Dragon':1,'Dark':1,'Steel':0.5,'Fairy':1
    };

    /**
     * Ensure a line's fieldState has the hazards sub-object and return the side's hazards.
     */
    function getFieldHazards(side) {
        var fld = curLine().fieldState;
        if (!fld.hazards) {
            fld.hazards = {
                p1: { sr: false, spikes: 0, tspikes: 0, stickyWeb: false },
                p2: { sr: false, spikes: 0, tspikes: 0, stickyWeb: false }
            };
        }
        if (!fld.hazards[side]) fld.hazards[side] = { sr: false, spikes: 0, tspikes: 0, stickyWeb: false };
        return fld.hazards[side];
    }

    /**
     * Calculate entry hazard damage and any status the pokemon would receive
     * when switching in while hazards are active.
     * Returns { damage: number, status: string }
     */
    function calcEntryHazardDamage(entry, hazards) {
        if (!hazards) return { damage: 0, status: '' };
        var types = entry.types || [];
        var ability = entry.ability || '';
        var item = entry.item || '';
        var maxHP = entry.maxHP || 100;

        var abilityEffects = getAbilityEffects(ability);
        var itemEffects = getItemEffects(item);
        var hasMagicGuard = abilityEffects ? !!abilityEffects.indirectDamageImmunity : (ability === 'Magic Guard');
        var isFlying = types.indexOf('Flying') !== -1;
        var hasLevitate = abilityEffects && abilityEffects.typeImmunity === 'Ground';
        if (!abilityEffects) hasLevitate = (ability === 'Levitate');
        var hasAirBalloon = itemEffects ? !!itemEffects.floatImmunity : (item === 'Air Balloon');
        var isGrounded = !isFlying && !hasLevitate && !hasAirBalloon;
        // Heavy-Duty Boots: ignore all entry hazards
        var hasHazardImmunity = !!(itemEffects && itemEffects.hazardImmunity);
        // Poison and Steel types absorb Toxic Spikes
        var absorbsTSpikes = types.indexOf('Poison') !== -1 || types.indexOf('Steel') !== -1;

        var totalDamage = 0;
        var status = '';

        if (hasHazardImmunity) {
            return { damage: 0, status: '' };
        }

        // Stealth Rocks — all pokemon, blocked only by Magic Guard
        if (hazards.sr && !hasMagicGuard) {
            var eff = 1;
            for (var i = 0; i < types.length; i++) {
                eff *= (SR_EFFECTIVENESS[types[i]] || 1);
            }
            totalDamage += Math.max(1, Math.floor(maxHP * eff / 8));
        }

        // Spikes — only grounded pokemon, blocked by Magic Guard
        if (hazards.spikes > 0 && isGrounded && !hasMagicGuard) {
            var spkDiv = [0, 8, 6, 4];
            totalDamage += Math.max(1, Math.floor(maxHP / spkDiv[Math.min(hazards.spikes, 3)]));
        }

        // Toxic Spikes — only grounded pokemon; Poison/Steel absorb them
        if (hazards.tspikes > 0 && isGrounded) {
            if (absorbsTSpikes) {
                // absorbed — no damage, no status
            } else {
                var alreadyStatused = entry.status && entry.status !== '' && entry.status !== 'Healthy';
                if (!alreadyStatused) {
                    status = hazards.tspikes >= 2 ? 'Badly Poisoned' : 'Poison';
                }
            }
        }

        return { damage: totalDamage, status: status };
    }

    /**
     * Build a compact hazard description string for a side
     * (used in round badge and labels).
     */
    function hazardDesc(hazards, prefix) {
        if (!hazards) return '';
        var parts = [];
        if (hazards.sr) parts.push('SR');
        if (hazards.spikes > 0) parts.push('Spikes×' + hazards.spikes);
        if (hazards.tspikes > 0) parts.push('T.Spikes×' + hazards.tspikes);
        if (hazards.stickyWeb) parts.push('Web');
        return parts.length ? (prefix ? prefix + ':' + parts.join(',') : parts.join(', ')) : '';
    }

    /**
     * Sync the field-state hazards to the calc's UI checkboxes/radios so the
     * damage engine accounts for them.
     */
    function syncHazardsToCalc() {
        var fld = curLine().fieldState;
        if (!fld.hazards) return;
        var h1 = fld.hazards.p1 || {};
        var h2 = fld.hazards.p2 || {};
        // Batch-set all hazard controls WITHOUT triggering change cascades
        window.NO_CALC = true;
        // L = attacker side = P1, R = defender side = P2
        $('#srL').prop('checked', !!h1.sr);
        $('#srR').prop('checked', !!h2.sr);
        $('input[name=spikesL][value=' + (h1.spikes || 0) + ']').prop('checked', true);
        $('input[name=spikesR][value=' + (h2.spikes || 0) + ']').prop('checked', true);
        $('input[name=tspikesL][value=' + (h1.tspikes || 0) + ']').prop('checked', true);
        $('input[name=tspikesR][value=' + (h2.tspikes || 0) + ']').prop('checked', true);
        window.NO_CALC = false;
        // Single recalculation for all hazard changes
        try { performCalculations(); } catch (e) {}
    }

    // ── Weather / Terrain / Screen / Tailwind  data-driven mappings ──
    // Maps moveData.weather value → { radio: DOM radio id, label: display label }
    var WEATHER_MAP = {
        'sunnyday':   { radio: 'sun',   label: 'Sun' },
        'RainDance':  { radio: 'rain',  label: 'Rain' },
        'Sandstorm':  { radio: 'sand',  label: 'Sand' },
        'hail':       { radio: 'snow',  label: 'Snow' }
    };
    // Maps moveData.terrain value → { cbId: DOM checkbox id, label: display label }
    var TERRAIN_MAP = {
        'electricterrain': { cbId: 'electric', label: 'Electric' },
        'grassyterrain':   { cbId: 'grassy',   label: 'Grassy' },
        'psychicterrain':  { cbId: 'psychic',  label: 'Psychic' },
        'mistyterrain':    { cbId: 'misty',    label: 'Misty' }
    };
    // Maps moveData.sideCondition value → { cbPrefix: checkbox base id, type, defaultDuration }
    var SIDE_CONDITION_MAP = {
        'reflect':     { cbPrefix: 'reflect',     type: 'screen', defaultDuration: 5 },
        'lightscreen': { cbPrefix: 'lightScreen', type: 'screen', defaultDuration: 5 },
        'auroraveil':  { cbPrefix: 'auroraVeil',  type: 'screen', defaultDuration: 5 },
        'tailwind':    { cbPrefix: 'tailwind',     type: 'tailwind', defaultDuration: 4 }
    };
    // Hazard sideConditions (not screens/tailwind)
    var HAZARD_SIDE_CONDITIONS = {
        'stealthrock': 'sr',
        'spikes':      'spikes',
        'toxicspikes': 'tspikes',
        'stickyweb':   'stickyWeb'
    };
    // Weather-extending items and their weather targets
    var WEATHER_EXTEND_ITEMS = {
        'Heat Rock':   'Sun',
        'Damp Rock':   'Rain',
        'Smooth Rock': 'Sand',
        'Icy Rock':    'Snow'
    };

    /**
     * After a move is used, check if it sets weather and auto-apply it.
     * @param {object} moveData - RBDex move data
     * @param {object} userEntry - the roster entry of the move user (for item check)
     */
    function applyMoveWeather(moveData, userEntry) {
        if (!moveData || !moveData.weather) return;
        var info = WEATHER_MAP[moveData.weather];
        if (!info) return;
        var fld = curLine().fieldState;
        // Set the hidden radio button
        $('#' + info.radio).prop('checked', true);
        // Sync the dropdown
        $('#rsa-weather-select').val(info.label);
        // Duration: 5 normally, 8 with the matching weather rock
        var dur = 5;
        if (userEntry && userEntry.item && WEATHER_EXTEND_ITEMS[userEntry.item] === info.label) dur = 8;
        fld.weatherTurns = dur;
        fld.permanentWeather = false;
        try { performCalculations(); } catch (e) {}
    }

    /**
     * After a move is used, check if it sets terrain and auto-apply it.
     */
    function applyMoveTerrain(moveData, userEntry) {
        if (!moveData || !moveData.terrain) return;
        var info = TERRAIN_MAP[moveData.terrain];
        if (!info) return;
        var fld = curLine().fieldState;
        // Uncheck all terrains, then check the right one
        $('input:checkbox[name="terrain"]').prop('checked', false);
        $('#' + info.cbId).prop('checked', true);
        $('#rsa-terrain-select').val(info.label);
        // Duration: 5 normally, 8 with Terrain Extender
        var dur = 5;
        if (userEntry && userEntry.item === 'Terrain Extender') dur = 8;
        fld.terrainTurns = dur;
        try { performCalculations(); } catch (e) {}
    }

    /**
     * After a move is used, check if it sets a screen or tailwind and auto-apply it.
     * @param {string} userSide - 'p1' or 'p2'
     */
    function applyMoveSideCondition(moveData, userSide, userEntry) {
        if (!moveData || !moveData.sideCondition) return;
        var sc = moveData.sideCondition.toLowerCase().replace(/[\s\-\']+/g, '');
        var info = SIDE_CONDITION_MAP[sc];
        if (!info) return; // hazard sideConditions are handled separately
        var suffix = userSide === 'p1' ? 'L' : 'R';
        var cbId = info.cbPrefix + suffix;
        $('#' + cbId).prop('checked', true);
        var fld = curLine().fieldState;
        if (info.type === 'screen') {
            if (!fld.screenTurns) fld.screenTurns = {};
            var dur = info.defaultDuration;
            if (userEntry && userEntry.item === 'Light Clay') dur = 8;
            fld.screenTurns[cbId] = dur;
        } else if (info.type === 'tailwind') {
            if (!fld.tailwindTurns) fld.tailwindTurns = {};
            fld.tailwindTurns[userSide] = info.defaultDuration;
        }
        try { performCalculations(); } catch (e) {}
    }

    /**
     * Decrement all field turn counters at the start of a round.
     * Mirrors the existing Trick Room decrement pattern.
     */
    function decrementFieldCounters() {
        var fld = curLine().fieldState;

        // Weather turns
        if (fld.weatherTurns > 0 && !fld.permanentWeather) {
            fld.weatherTurns--;
            if (fld.weatherTurns <= 0) {
                fld.weatherTurns = 0;
                // Clear weather: check the "none" radio
                $('input:radio[name="weather"][value=""]').prop('checked', true);
                $('#rsa-weather-select').val('');
                try { performCalculations(); } catch (e) {}
            }
        }

        // Terrain turns
        if (fld.terrainTurns > 0) {
            fld.terrainTurns--;
            if (fld.terrainTurns <= 0) {
                fld.terrainTurns = 0;
                $('input:checkbox[name="terrain"]').prop('checked', false);
                $('#rsa-terrain-select').val('');
                try { performCalculations(); } catch (e) {}
            }
        }

        // Screen turns (per checkbox id)
        if (fld.screenTurns) {
            for (var cbId in fld.screenTurns) {
                if (fld.screenTurns[cbId] > 0) {
                    fld.screenTurns[cbId]--;
                    if (fld.screenTurns[cbId] <= 0) {
                        fld.screenTurns[cbId] = 0;
                        $('#' + cbId).prop('checked', false);
                    }
                }
            }
            try { performCalculations(); } catch (e) {}
        }

        // Tailwind turns (per side)
        if (fld.tailwindTurns) {
            var twChanged = false;
            if (fld.tailwindTurns.p1 > 0) {
                fld.tailwindTurns.p1--;
                if (fld.tailwindTurns.p1 <= 0) { fld.tailwindTurns.p1 = 0; $('#tailwindL').prop('checked', false); twChanged = true; }
            }
            if (fld.tailwindTurns.p2 > 0) {
                fld.tailwindTurns.p2--;
                if (fld.tailwindTurns.p2 <= 0) { fld.tailwindTurns.p2 = 0; $('#tailwindR').prop('checked', false); twChanged = true; }
            }
            if (twChanged) { try { performCalculations(); } catch (e) {} }
        }
    }

    /**
     * Apply item manipulation effects from moves like Knock Off, Thief, Trick.
     * @param {string} effectType - 'stripItem', 'stealItem', 'swapItems', 'removeItemBerry'
     * @param {object} userEntry - the attacking pokemon's roster entry
     * @param {object} targetEntry - the defending pokemon's roster entry
     * @param {string} userSide - 'p1' or 'p2'
     * @param {string} targetSide - 'p1' or 'p2'
     */
    function applyMoveItemEffect(effectType, userEntry, targetEntry, userSide, targetSide) {
        if (!targetEntry || !targetEntry.item) return;
        if (effectType === 'stripItem') {
            targetEntry.item = '';
            $('#' + targetSide + ' .item').val('');
        } else if (effectType === 'stealItem') {
            if (!userEntry.item) {
                userEntry.item = targetEntry.item;
                $('#' + userSide + ' .item').val(userEntry.item);
            }
            targetEntry.item = '';
            $('#' + targetSide + ' .item').val('');
        } else if (effectType === 'swapItems') {
            var tmp = userEntry.item || '';
            userEntry.item = targetEntry.item;
            targetEntry.item = tmp;
            $('#' + userSide + ' .item').val(userEntry.item);
            $('#' + targetSide + ' .item').val(targetEntry.item);
        } else if (effectType === 'removeItemBerry') {
            var itemKey = targetEntry.item.toLowerCase().replace(/[\s\-\']+/g, '');
            if (itemKey.indexOf('berry') >= 0) {
                targetEntry.item = '';
                $('#' + targetSide + ' .item').val('');
            }
        }
        try { performCalculations(); } catch (e) {}
    }

    // Map of hazard-setting move names to sideCondition key (legacy fallback)
    var HAZARD_SET_MOVES = {
        'Stealth Rock': 'sr',
        'Spikes': 'spikes',
        'Toxic Spikes': 'tspikes',
        'Sticky Web': 'stickyWeb'
    };
    // Moves that clear hazards (legacy fallback)
    var HAZARD_CLEAR_MOVES = ['Rapid Spin', 'Defog', 'Mortal Spin', 'Tidy Up', 'Court Change'];

    /**
     * Apply a hazard to the target side.
     */
    function applyHazardToSide(hazKey, targetSide) {
        var h = getFieldHazards(targetSide);
        if (hazKey === 'sr' || hazKey === 'stickyWeb') {
            h[hazKey] = true;
        } else if (hazKey === 'spikes') {
            h.spikes = Math.min(3, (h.spikes || 0) + 1);
        } else if (hazKey === 'tspikes') {
            h.tspikes = Math.min(2, (h.tspikes || 0) + 1);
        }
    }

    /**
     * After a round is captured, check both sides' moves for hazard effects and
     * update the field state accordingly.
     * Now reads moveData.sideCondition and moveData.clearsHazards generically,
     * falling back to legacy name-based lookup.
     */
    function applyHazardMoves(p1MoveName, p2MoveName) {
        if (!p1MoveName && !p2MoveName) return;

        function clearSide(side) {
            var h = getFieldHazards(side);
            h.sr = false; h.spikes = 0; h.tspikes = 0; h.stickyWeb = false;
        }

        function swapHazards() {
            var tmp = $.extend({}, getFieldHazards('p1'));
            var p2h = getFieldHazards('p2');
            var p1h = getFieldHazards('p1');
            p1h.sr = p2h.sr; p1h.spikes = p2h.spikes; p1h.tspikes = p2h.tspikes; p1h.stickyWeb = p2h.stickyWeb;
            p2h.sr = tmp.sr; p2h.spikes = tmp.spikes; p2h.tspikes = tmp.tspikes; p2h.stickyWeb = tmp.stickyWeb;
        }

        function processSide(moveName, userSide) {
            if (!moveName) return;
            var oppSide = userSide === 'p1' ? 'p2' : 'p1';
            var moveData = lookupMoveData(moveName);

            // Hazard setting: prefer data-driven sideCondition, fall back to legacy dict
            if (moveData && moveData.sideCondition) {
                var sc = moveData.sideCondition.toLowerCase().replace(/[\s\-\']+/g, '');
                var hazKey = HAZARD_SIDE_CONDITIONS[sc];
                if (hazKey) {
                    applyHazardToSide(hazKey, oppSide);
                }
            } else if (HAZARD_SET_MOVES[moveName]) {
                applyHazardToSide(HAZARD_SET_MOVES[moveName], oppSide);
            }

            // Hazard clearing: prefer data-driven clearsHazards field
            var clearMode = moveData && moveData.clearsHazards;
            if (clearMode) {
                if (clearMode === 'self') {
                    clearSide(userSide);
                } else if (clearMode === 'both') {
                    clearSide('p1'); clearSide('p2');
                } else if (clearMode === 'swap') {
                    swapHazards();
                }
            } else {
                // Legacy fallback: name-based clearing
                if (moveName === 'Rapid Spin' || moveName === 'Mortal Spin' || moveName === 'Tidy Up') {
                    clearSide(userSide);
                } else if (moveName === 'Defog') {
                    clearSide('p1'); clearSide('p2');
                } else if (moveName === 'Court Change') {
                    swapHazards();
                }
            }
        }

        processSide(p1MoveName, 'p1');
        processSide(p2MoveName, 'p2');

        syncHazardsToCalc();
    }

    /**
     * Compute what hazards changed between two snapshots.
     * Returns { cleared: [], set: [] } — arrays of human-readable strings.
     */
    function diffHazards(before, after) {
        var cleared = [];
        var set = [];
        var sides = ['p1', 'p2'];
        var sideLabel = { p1: 'P1', p2: 'P2' };
        for (var si = 0; si < sides.length; si++) {
            var s = sides[si];
            var b = before[s] || {};
            var a = after[s]  || {};
            var lbl = sideLabel[s];
            // Cleared
            if (b.sr && !a.sr)                           cleared.push('⚑ SR (' + lbl + ')');
            if ((b.spikes || 0) > (a.spikes || 0))       cleared.push('Spikes (' + lbl + ')');
            if ((b.tspikes || 0) > (a.tspikes || 0))     cleared.push('T.Spikes (' + lbl + ')');
            if (b.stickyWeb && !a.stickyWeb)             cleared.push('⛓ Web (' + lbl + ')');
            // Set
            if (!b.sr && a.sr)                           set.push('⚑ SR (' + lbl + ')');
            if ((a.spikes || 0) > (b.spikes || 0))       set.push('Spikes×' + a.spikes + ' (' + lbl + ')');
            if ((a.tspikes || 0) > (b.tspikes || 0))     set.push('T.Spikes×' + a.tspikes + ' (' + lbl + ')');
            if (!b.stickyWeb && a.stickyWeb)             set.push('⛓ Web (' + lbl + ')');
        }
        return (cleared.length || set.length) ? { cleared: cleared, set: set } : null;
    }

    // Abilities that ignore the defender's ability (for Sturdy, Disguise, Ice Face, etc.)
    var MOLD_BREAKER_ABILITIES = [
        'Mold Breaker', 'Turboblaze', 'Teravolt', 'Mycelium Might'
    ];

    /** Check if the attacker's ability ignores the defender's ability */
    function ignoresAbility(attackerAbility) {
        var ae = getAbilityEffects(attackerAbility);
        if (ae) return !!ae.ignoresAbility;
        return MOLD_BREAKER_ABILITIES.indexOf(attackerAbility) !== -1;
    }

    /**
     * Apply survival checks for a defender hit by an attacker.
     * Handles Focus Sash (item) and Sturdy (ability), respecting Mold Breaker.
     * Returns { survived: bool, sashed: bool, sturdied: bool }
     */
    function applySurvivalChecks(defEntry, hpAfter, hpBefore, maxHP, atkAbility) {
        var result = { survived: false, sashed: false, sturdied: false };
        if (hpAfter > 0) return result; // not KO'd, no check needed
        if (hpBefore <= 0) return result; // already fainted

        // Focus Sash-style: survive at 1 HP if at full HP (not blocked by Mold Breaker — it's an item)
        var defItemEff = getItemEffects(defEntry.item);
        var itemSurvives = defItemEff ? !!defItemEff.survivalFullHP : (defEntry.item === 'Focus Sash');
        if (itemSurvives && hpBefore >= maxHP) {
            result.survived = true;
            result.sashed = true;
            return result;
        }

        // Sturdy-style: survive at 1 HP if at full HP (blocked by Mold Breaker/Turboblaze/Teravolt)
        var defAbilEff = getAbilityEffects(defEntry.ability);
        var abilSurvives = defAbilEff ? !!defAbilEff.survivalFullHP : (defEntry.ability === 'Sturdy');
        if (abilSurvives && hpBefore >= maxHP && !ignoresAbility(atkAbility)) {
            result.survived = true;
            result.sturdied = true;
            return result;
        }

        return result;
    }

    // ════════════════════════════════════════════════════════════
    // STATE
    // ════════════════════════════════════════════════════════════

    var lines = [createLine('Line A')];
    var currentLineIdx = 0;

    // ════════════════════════════════════════════════════════════
    // SESSION SAVE / LOAD
    // ════════════════════════════════════════════════════════════

    var RSA_STORAGE_KEY = 'rsa-session-v1';

    function serializeSession() {
        return JSON.stringify({
            v: 1,
            battleFormat: battleFormat,
            currentLineIdx: currentLineIdx,
            lines: lines
        });
    }

    function deserializeSession(json) {
        var data = JSON.parse(json);
        if (!data || !Array.isArray(data.lines) || data.lines.length === 0) return false;
        lines = data.lines;
        // Migrate old sessions that predate the branch feature
        for (var li = 0; li < lines.length; li++) {
            if (!Array.isArray(lines[li].branches)) lines[li].branches = [];
            if (lines[li].activeBranchIdx == null) lines[li].activeBranchIdx = -1;
            // Rebuild HP/status/items from round history to fix any stale values
            // that may have been persisted from earlier builds with contamination bugs.
            try { rebuildLineTeams(lines[li]); } catch (e) {}
        }
        battleFormat = data.battleFormat || 'singles';
        currentLineIdx = Math.min(data.currentLineIdx || 0, lines.length - 1);
        return true;
    }

    function autoSave() {
        try { localStorage.setItem(RSA_STORAGE_KEY, serializeSession()); } catch (e) {}
    }

    function hasSavedSession() {
        return !!localStorage.getItem(RSA_STORAGE_KEY);
    }

    function showSaveToast(msg, duration) {
        var toast = document.getElementById('rsa-save-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'rsa-save-toast';
            toast.style.cssText = 'position:fixed;bottom:22px;right:22px;background:var(--bg-card,#23272f);' +
                'color:var(--text,#e8eaf0);border:1px solid #4caf50;border-radius:8px;padding:9px 18px;' +
                'font-size:0.9em;z-index:10000;box-shadow:0 4px 16px rgba(0,0,0,0.35);transition:opacity 0.4s;pointer-events:none';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        clearTimeout(toast._t);
        toast._t = setTimeout(function () { toast.style.opacity = '0'; }, duration || 2000);
    }

    // Track selected moves from calc radio buttons (independent for P1 and P2)
    var selectedP1Move = 'none';  // 0-3 or 'none'
    var selectedP2Move = 'none';
    var suppressP2Sync = false;  // Prevent syncP2Team during intentional switches
    var _loadingForm = false;      // Suppress calc-trigger handler during batch form loads

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
            teamSplit: null,  // for doubles-2t: { left: number } — first N mons are left team
            battleFormat: 'singles',  // per-line format
            // ── Branch support ──
            branches: [],       // array of { id, name, forkRoundIdx, rounds[] }
            activeBranchIdx: -1 // -1 = main line, >=0 = index into branches[]
        };
    }
    function curLine() { return lines[currentLineIdx]; }

    // ── Branch helpers ──────────────────────────────────────
    function createBranch(line, forkRoundIdx, name) {
        var branchNum = line.branches.length + 1;
        var branch = {
            id: Date.now() + Math.random(),
            name: name || (line.name + ' → B' + branchNum),
            forkRoundIdx: forkRoundIdx, // rounds[0..forkRoundIdx-1] inherited from main
            rounds: []                  // only rounds from forkRoundIdx onward
        };
        line.branches.push(branch);
        return line.branches.length - 1;
    }

    /** Get the full round list for a branch (inherited + own) */
    function getBranchRounds(line, branchIdx) {
        if (branchIdx < 0) return line.rounds; // main line
        var branch = line.branches[branchIdx];
        if (!branch) return line.rounds;
        return line.rounds.slice(0, branch.forkRoundIdx).concat(branch.rounds);
    }

    /** Get the rounds array that should be appended to (for logging new rounds) */
    function getActiveRounds(line) {
        if (!line.branches || line.activeBranchIdx == null || line.activeBranchIdx < 0) return line.rounds;
        var branch = line.branches[line.activeBranchIdx];
        return branch ? branch.rounds : line.rounds;
    }

    /** Get all display columns: main + visible branches */
    function getVisibleColumns(line) {
        var cols = [{ idx: -1, name: 'Main', rounds: line.rounds, forkRoundIdx: 0 }];
        for (var i = 0; i < line.branches.length; i++) {
            cols.push({
                idx: i,
                name: line.branches[i].name,
                rounds: getBranchRounds(line, i),
                forkRoundIdx: line.branches[i].forkRoundIdx
            });
        }
        return cols;
    }

    /** Rebuild teams state for a specific branch view */
    function rebuildBranchTeams(line, branchIdx) {
        var rounds = getBranchRounds(line, branchIdx);
        // Reset all roster HP/status/items to initial state
        for (var s = 0; s < 2; s++) {
            var side = s === 0 ? 'p1' : 'p2';
            var team = line.teams[side];
            // Reset active indices to first pokemon — replay will advance them correctly
            team.activeIdx = team.roster.length > 0 ? 0 : -1;
            if (team.activeIdxB !== undefined) {
                // Only set slot-B in doubles; in singles always reset to -1 so slot-B
                // is never mistakenly populated and hidden from predictSwitchIn.
                team.activeIdxB = (isDoubles() && team.roster.length > 1) ? 1 : -1;
            }
            for (var ri = 0; ri < team.roster.length; ri++) {
                var entry = team.roster[ri];
                entry.currentHP = entry.maxHP;
                entry.bestCaseHP = entry.maxHP;
                entry.status = '';
                entry.toxicCounter = 0;
                entry.boosts = { at: 0, df: 0, sa: 0, sd: 0, sp: 0 };
                if (entry.initialItem !== undefined) entry.item = entry.initialItem;
            }
        }
        // Replay this branch's rounds
        for (var i = 0; i < rounds.length; i++) {
            var rd = rounds[i];
            if (rd.isDoubles && rd.fighters) {
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
                    var idx = findInRoster(mapping.team, f.name);
                    if (idx >= 0) {
                        var fHpCur = typeof f.hpAfter === 'object' ? f.hpAfter.current : f.hpAfter;
                        var fHpBest = typeof f.hpAfter === 'object' ? (f.hpAfter.bestCase != null ? f.hpAfter.bestCase : fHpCur) : fHpCur;
                        mapping.team.roster[idx].currentHP = fHpCur;
                        mapping.team.roster[idx].bestCaseHP = fHpBest;
                        if (f.item !== undefined) mapping.team.roster[idx].item = f.item;
                        if (f.status !== undefined) mapping.team.roster[idx].status = f.status;
                        mapping.team[mapping.idxKey] = idx;
                    }
                }
            } else {
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

        // If user confirmed a send-in after a KO (pendingSwitchP2Idx), apply it now
        // so renderInlineControls shows the 'Next Round' panel rather than p2ko.
        var _branchObj = (branchIdx >= 0 && line.branches) ? line.branches[branchIdx] : null;
        var _pendingIdx = _branchObj ? _branchObj.pendingSwitchP2Idx :
                          (branchIdx < 0 ? line.pendingSwitchP2Idx : undefined);
        if (_pendingIdx !== undefined && _pendingIdx !== null &&
            _pendingIdx >= 0 && _pendingIdx < line.teams.p2.roster.length) {
            line.teams.p2.activeIdx = _pendingIdx;
        }

        // After replay, re-anchor both active indices to whatever pokemon is currently
        // loaded in the calc form.  rebuildBranchTeams resets activeIdx = 0 before
        // replay; if rounds exist but don't reference the loaded pokemon (e.g. user
        // manually changed the form after the last logged round), activeIdx stays at
        // the last-replayed index even though the form has a different pokemon.
        // Only apply this when there are logged rounds — with 0 rounds the first
        // pokemon in roster order (index 0) is always the correct active one, and
        // re-anchoring to the form would pick up stale pokemon from a previous trainer.
        if (rounds.length > 0) {
            var _formP2Name = getP2Name ? getP2Name() : null;
            if (_formP2Name) {
                var _formP2i = findInRoster(line.teams.p2, _formP2Name);
                if (_formP2i >= 0) line.teams.p2.activeIdx = _formP2i;
            }
            var _formP1Name = getP1Name ? getP1Name() : null;
            if (_formP1Name) {
                var _formP1i = findInRoster(line.teams.p1, _formP1Name);
                if (_formP1i >= 0) line.teams.p1.activeIdx = _formP1i;
            }
        }

        // Restore user-set pre-damage HP for P1 entries not referenced in any
        // replayed round.  preDamageHP is set by the hp-edit handler and persists
        // until the user explicitly changes it to a new value.
        for (var _bpi = 0; _bpi < line.teams.p1.roster.length; _bpi++) {
            var _bpe = line.teams.p1.roster[_bpi];
            if (_bpe.preDamageHP !== undefined && _bpe.preDamageHP < _bpe.maxHP) {
                var _bInRound = rounds.some(function(rd) {
                    if (rd.isDoubles && rd.fighters) {
                        for (var _bs in rd.fighters) {
                            if (rd.fighters[_bs] && rd.fighters[_bs].name === _bpe.name) return true;
                        }
                        return false;
                    }
                    return rd.p1 && rd.p1.name === _bpe.name;
                });
                if (!_bInRound) {
                    _bpe.currentHP  = _bpe.preDamageHP;
                    _bpe.bestCaseHP = _bpe.preDamageHP;
                }
            }
        }
    }

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
        // Slot B only exists in doubles — always return null in singles so that
        // a stale activeIdxB value (e.g. from a previous doubles session saved in
        // localStorage, or from rebuildBranchTeams) never ghosts a pokemon out of
        // predictSwitchIn candidates.
        if (!isDoubles()) return null;
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

    /**
     * Compute the effective Speed stat for a roster entry, applying item and status modifiers.
     * Used for both turn-order sorting and tie-break pre-computation.
     */
    function computeEntrySpeed(entry) {
        var spd = 0;
        try {
            var poke = createPokemon(entry.setId);
            spd = poke.stats.spe || 50;
            spd = applySpeedModifiers(spd, entry, '', '');
            // Stat boost modifier
            var spdBoost = (entry.boosts && entry.boosts.sp) || 0;
            if (spdBoost > 0) spd = Math.floor(spd * (2 + spdBoost) / 2);
            else if (spdBoost < 0) spd = Math.floor(spd * 2 / (2 - spdBoost));
        } catch (err) {}
        return spd;
    }

    /**
     * Apply item, ability, and paralysis speed modifiers in the canonical order.
     * Returns the new speed value. Does NOT apply boost stages — caller handles those.
     *
     *   spd            : current speed value
     *   entry          : roster entry (.item, .ability, .status, .name)
     *   weather        : weather string (or '' to skip weather-conditional mods)
     *   terrain        : terrain string (or '' to skip terrain-conditional mods)
     *
     * Reads from EffectsRegistry. Falls back to legacy hardcoded behavior if the
     * registry has not loaded.
     */
    function applySpeedModifiers(spd, entry, weather, terrain) {
        var item    = entry.item    || '';
        var ability = entry.ability || '';
        var status  = entry.status  || '';
        var species = entry.name    || '';

        // --- Item speed modifier (registry-driven) ---
        var itemReg = getItemEffects(item);
        if (itemReg && itemReg.speedMod) {
            var im = itemReg.speedMod;
            var imApplies = true;
            if (im.condition && im.condition.speciesOnly) {
                imApplies = (species === im.condition.speciesOnly);
            }
            if (imApplies) {
                spd = (im.multiplier === 2)
                    ? spd * im.multiplier              // doubling — no floor (matches Quick Powder)
                    : Math.floor(spd * im.multiplier); // halving / 1.5x — floored
            }
        } else if (!window.EffectsRegistry) {
            // Fallback: registry not loaded — legacy hardcoded behavior
            if (item === 'Iron Ball' || item === 'Macho Brace' || item === 'Power Weight' ||
                item === 'Power Bracer' || item === 'Power Belt' || item === 'Power Lens' ||
                item === 'Power Band' || item === 'Power Anklet') {
                spd = Math.floor(spd * 0.5);
            } else if (item === 'Choice Scarf') {
                spd = Math.floor(spd * 1.5);
            } else if (item === 'Quick Powder' && species === 'Ditto') {
                spd = spd * 2;
            }
        }

        // --- Ability speed modifier (registry-driven) ---
        // Original behavior: only ONE ability speedMod applies (mutually exclusive
        // if-else chain). Preserve that by short-circuiting on first match.
        var abReg = getAbilityEffects(ability);
        if (abReg && abReg.speedMod) {
            var am = abReg.speedMod;
            var amApplies = true;
            var cond = am.condition || null;
            if (cond) {
                if (cond.weather)   amApplies = amApplies && cond.weather.indexOf(weather) !== -1;
                if (cond.terrain)   amApplies = amApplies && cond.terrain.indexOf(terrain) !== -1;
                if (cond.hasStatus) amApplies = amApplies && !!status;
            }
            if (amApplies) {
                spd = (am.multiplier === 2)
                    ? spd * am.multiplier
                    : Math.floor(spd * am.multiplier);
            }
        } else if (!window.EffectsRegistry) {
            // Fallback: registry not loaded
            if (ability === 'Swift Swim' && (weather === 'Rain' || weather === 'Heavy Rain')) spd = spd * 2;
            else if (ability === 'Chlorophyll' && (weather === 'Sun' || weather === 'Harsh Sunshine')) spd = spd * 2;
            else if (ability === 'Sand Rush' && weather === 'Sand') spd = spd * 2;
            else if (ability === 'Slush Rush' && (weather === 'Snow' || weather === 'Hail')) spd = spd * 2;
            else if (ability === 'Surge Surfer' && terrain === 'Electric') spd = spd * 2;
            else if (ability === 'Quick Feet' && status) spd = Math.floor(spd * 1.5);
            else if (ability === 'Slow Start') spd = Math.floor(spd * 0.5);
        }

        // --- Status modifier (paralysis halves; Quick Feet bypasses) ---
        // Quick Feet bypass uses the registry hasStatus speedMod check above by NAME.
        // Preserve original behavior by checking for Quick Feet ability name directly.
        if (status === 'Paralysis' && ability !== 'Quick Feet') {
            spd = Math.floor(spd * 0.5);
        }

        return spd;
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
        if (p1s === p2s) {
            // Use stored tiebreaker (set by click handler after user chose via modal)
            f = window._rsaTiebreaker || 'tie';
        } else if (tr) {
            f = p1s < p2s ? 'p1' : 'p2';
        } else {
            f = p1s > p2s ? 'p1' : 'p2';
        }
        return { p1: p1s, p2: p2s, trickRoom: tr, faster: f };
    }

    function getWeather() { return $("input:radio[name='weather']:checked").val() || 'None'; }
    function getTerrain() { return $("input:checkbox[name='terrain']:checked").val() || 'None'; }

    /**
     * Sync the RSA field bar controls (weather/terrain/trick room/permanent)
     * from the current hidden calc form state + fieldState, so that when
     * switching lines or restoring a session, the bar reflects truth.
     */
    function syncFieldBarFromState() {
        // Weather: read from hidden radio (authoritative)
        var w = getWeather();
        $('#rsa-weather-select').val(w === 'None' ? '' : w);

        // Terrain
        var t = getTerrain();
        $('#rsa-terrain-select').val(t === 'None' ? '' : t);

        // Trick Room
        var tr = $('#trickroom').is(':checked');
        $('#rsa-trickroom').prop('checked', tr);
        $('#rsa-trickroom').closest('.rsa-trickroom-toggle').toggleClass('rsa-tr-active', tr);

        // Permanent weather
        var perma = !!(curLine().fieldState && curLine().fieldState.permanentWeather);
        $('#rsa-perma-weather').prop('checked', perma);

        // Update display panel
        if (typeof window._rsaUpdateFieldPanel === 'function') window._rsaUpdateFieldPanel();
    }

    /**
     * Compute effective displayed speed for a roster entry.
     * Applies item, ability (including weather abilities), status, and boost modifiers.
     * `entry` = roster entry (has .item, .ability, .status, .boosts)
     * `baseSpe` = base stat speed from createPokemon().stats.spe
     * `weather` = current weather string (optional, defaults to getWeather())
     * `terrain` = current terrain string (optional, defaults to getTerrain())
     * `boostStages` = current boost on .sp (optional)
     */
    function calcEffectiveSpeed(entry, baseSpe, weather, terrain) {
        if (!baseSpe) return 0;
        var spd = baseSpe;
        var w = weather != null ? weather : getWeather();
        var t = terrain != null ? terrain : getTerrain();
        var boost = (entry.boosts && entry.boosts.sp) || 0;

        // Apply item, ability, and paralysis speed modifiers via shared helper
        spd = applySpeedModifiers(spd, entry, w, t);

        // Boost stages
        if (boost !== 0) {
            var boostMult = boost > 0 ? (2 + boost) / 2 : 2 / (2 - boost);
            spd = Math.floor(spd * boostMult);
        }

        return spd;
    }

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

        var atkAbilEff = getAbilityEffects(attacker.ability);
        var atkItemEff = getItemEffects(attacker.item);
        var atkMagicGuard = atkAbilEff ? !!atkAbilEff.indirectDamageImmunity : (attacker.ability === 'Magic Guard');
        var atkRockHead   = atkAbilEff ? !!atkAbilEff.recoilImmunity : (attacker.ability === 'Rock Head');
        // In Gen 5+, recoil is based on the raw damage roll, NOT capped at the
        // defender's remaining HP.  Drain moves ARE capped at actual HP lost.
        var defCurHP = Math.max(1, defender.currentHP || defender.maxHP);
        var effMinDmg = Math.min(moveInfo.minDmg, defCurHP);
        var effMaxDmg = Math.min(moveInfo.maxDmg, defCurHP);

        // --- Life Orb-style recoil on attacker (blocked by Magic Guard) ---
        var atkSelfRecoilFrac = atkItemEff && atkItemEff.attackerSelfRecoil ? atkItemEff.attackerSelfRecoil : (attacker.item === 'Life Orb' ? 1/10 : 0);
        if (atkSelfRecoilFrac > 0 && moveInfo.minDmg > 0 && !atkMagicGuard) {
            var loRecoil = Math.max(1, Math.floor(atkMaxHP * atkSelfRecoilFrac));
            extras.push({
                target: 'attacker',
                source: attacker.item,
                damage: loRecoil,
                type: 'recoil'
            });
        }

        // --- Move recoil (blocked by Magic Guard / Rock Head; based on raw damage roll in Gen 5+) ---
        if (move.recoil && moveInfo.maxDmg > 0 && !atkMagicGuard && !atkRockHead) {
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

        // --- Contact damage (Iron Barbs, Rough Skin, Rocky Helmet) — blocked by Magic Guard ---
        var isContact = !!(move.makesContact || move.flags && move.flags.contact);
        // Protective Pads / Punching Glove: attacker bypasses contact effects
        var atkContactAvoid = !!(atkItemEff && atkItemEff.contactAvoidance);
        if (isContact && !atkContactAvoid && moveInfo.minDmg > 0 && !atkMagicGuard) {
            // Defender ability
            var defAbilEff = getAbilityEffects(defender.ability);
            var defContactFrac = defAbilEff && defAbilEff.contactRecoil
                ? defAbilEff.contactRecoil
                : (CONTACT_DAMAGE_ABILITIES[defender.ability] || 0);
            if (defContactFrac > 0) {
                var contactDmg = Math.max(1, Math.floor(atkMaxHP * defContactFrac));
                extras.push({
                    target: 'attacker',
                    source: defender.ability,
                    damage: contactDmg,
                    type: 'contact'
                });
            }
            // Defender item
            var defItemEff = getItemEffects(defender.item);
            var defItemContactFrac = defItemEff && defItemEff.contactRecoilToAttacker
                ? defItemEff.contactRecoilToAttacker
                : (CONTACT_DAMAGE_ITEMS[defender.item] || 0);
            if (defItemContactFrac > 0) {
                var contactDmg2 = Math.max(1, Math.floor(atkMaxHP * defItemContactFrac));
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
        var ability = entry.ability || '';
        var abilEff = getAbilityEffects(ability);
        var itemEff = getItemEffects(entry.item || '');
        var hasMagicGuard = abilEff ? !!abilEff.indirectDamageImmunity : (ability === 'Magic Guard');
        var hasPoisonHeal = abilEff && abilEff.statusHeal && (abilEff.statusHeal.status === 'Poison' || abilEff.statusHeal.status === 'Badly Poisoned');
        if (!abilEff) hasPoisonHeal = (ability === 'Poison Heal');
        // Guts suppresses burn damage (but burn SpAtk drop still applies)
        var hasGuts = abilEff ? !!abilEff.burnAttackBoost : (ability === 'Guts');

        // --- Status damage (blocked by Magic Guard / Guts for burn) ---
        if (entry.status === 'Burn' && !hasMagicGuard && !hasGuts) {
            var burnDmg = Math.max(1, Math.floor(maxHP / 16));
            eot.push({ source: 'Burn', damage: burnDmg });
        }
        // Poison Heal: heal 1/8 instead of taking poison/toxic damage
        var phHealFrac = (abilEff && abilEff.statusHeal && abilEff.statusHeal.frac) ? abilEff.statusHeal.frac : 1/8;
        if (hasPoisonHeal && (entry.status === 'Poison' || entry.status === 'Badly Poisoned')) {
            eot.push({ source: 'Poison Heal', damage: -Math.max(1, Math.floor(maxHP * phHealFrac)) });
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

        // --- Healing items (registry-driven via eotHealing) ---
        if (itemEff && itemEff.eotHealing) {
            var heal = itemEff.eotHealing;
            var cond = heal.condition;
            if (!cond) {
                eot.push({ source: entry.item, damage: -Math.max(1, Math.floor(maxHP * heal.frac)) });
            } else if (cond.holderType) {
                if (hasType(entry, [cond.holderType])) {
                    eot.push({ source: entry.item, damage: -Math.max(1, Math.floor(maxHP * heal.frac)) });
                } else if (!hasMagicGuard) {
                    var penalty = cond.elseDamageFrac || (heal.frac * 2);
                    eot.push({ source: entry.item, damage: Math.max(1, Math.floor(maxHP * penalty)) });
                }
            }
        } else {
            // Fallback to legacy hardcoded behavior
            if (entry.item === 'Leftovers') {
                var leftHeal = Math.max(1, Math.floor(maxHP / 16));
                eot.push({ source: 'Leftovers', damage: -leftHeal });
            }
            if (entry.item === 'Black Sludge') {
                if (hasType(entry, ['Poison'])) {
                    eot.push({ source: 'Black Sludge', damage: -Math.max(1, Math.floor(maxHP / 16)) });
                } else if (!hasMagicGuard) {
                    eot.push({ source: 'Black Sludge', damage: Math.max(1, Math.floor(maxHP / 8)) });
                }
            }
        }

        // --- Grassy Terrain healing ---
        if (getTerrain() === 'Grassy') {
            eot.push({ source: 'Grassy Terrain', damage: -Math.max(1, Math.floor(maxHP / 16)) });
        }

        // --- Item EOT damage (Sticky Barb) — blocked by Magic Guard ---
        if (itemEff && itemEff.eotDamage && !hasMagicGuard) {
            var ed = itemEff.eotDamage;
            eot.push({ source: entry.item, damage: Math.max(1, Math.floor(maxHP * ed.frac)) });
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
        var ae = getAbilityEffects(ability);
        if (ae) return !!ae.weatherDamageImmunity;
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
        // Suppress cascading recalculations during form population
        _loadingForm = true;
        // Use val() + change() on the underlying input element only (not the Select2 DIV wrapper).
        // Triggering change on the full '.set-selector' collection would also fire the DIV's
        // calc-trigger handler BEFORE the set-selector handler populates the form, producing
        // a spurious performCalculations() call with stale data. The Select2 display text is
        // updated manually below, so we only need to trigger on the input that has class 'opposing'.
        var $sel = $('#' + side + ' .set-selector');
        var $inputSel = $('#' + side + ' input.set-selector');
        $sel.val(entry.setId);
        ($inputSel.length ? $inputSel : $sel).change();
        // Update the Select2 display text to match
        $('#' + side + ' .set-selector').closest('.select2-container').find('.select2-chosen').text(entry.setId);

        // Immediately calculate so move labels show the new pokemon's moves right away.
        // .set-selector.change() already set NO_CALC = false before returning, so
        // performCalculations() is safe to call. The MutationObserver will inject
        // sprites synchronously before the next paint.
        try { performCalculations(); } catch (e) {}

        // After the calc form has fully loaded, batch-set tracked values
        // with NO_CALC + _loadingForm to prevent cascading recalculations.
        // 0ms timeout: yield to the browser so Select2's internal handlers can
        // settle, then immediately apply HP/status/ability/item/boosts and recalc.
        setTimeout(function () {
            window.NO_CALC = true;

            if (entry.currentHP !== undefined) {
                $('#' + side + ' .current-hp').val(entry.currentHP);
            }
            if (entry.status) {
                var calcStatus = RS_TO_CALC[entry.status] || 'Healthy';
                $('#' + side + ' .status').val(calcStatus);
                // Manually toggle toxic counter visibility (mirrors shared_controls handler)
                if (calcStatus === 'Badly Poisoned') {
                    $('#' + side + ' .toxic-counter').show();
                    if (entry.toxicCounter) {
                        $('#' + side + ' .toxic-counter').val(entry.toxicCounter);
                    }
                } else {
                    $('#' + side + ' .toxic-counter').hide();
                }
            }
            // Restore item and ability (may have changed from set defaults)
            if (entry.item !== undefined) {
                $('#' + side + ' .item').val(entry.item);
            }
            if (entry.ability) {
                $('#' + side + ' .ability').val(entry.ability);
            }
            // Set boosts
            if (entry.boosts) {
                var stats = ['at', 'df', 'sa', 'sd', 'sp'];
                for (var i = 0; i < stats.length; i++) {
                    var b = entry.boosts[stats[i]] || 0;
                    $('#' + side + ' .' + stats[i] + ' .boost').val(b);
                }
            }

            // Unsuppress and trigger ONE recalculation for the batch
            window.NO_CALC = false;
            _loadingForm = false;
            try { performCalculations(); } catch (e) {}

            // Sync first-turn-out checkbox for P2 so AI percentages are correct
            if (side === 'p2') {
                syncFirstTurnOut();
            }
            // Re-inject damage badges now that the new pokemon is loaded
            injectDamageBadges();
            injectMoveLabelSprites();
            // Re-render inline controls so damage % is up to date
            renderRoundLog();
        }, 0);
    }

    /**
     * Auto-sync the #firstTurnOutAiOpt checkbox to match whether the current P2
     * has appeared in any prior round. Ensures AI percentages are accurate.
     */
    function syncFirstTurnOut() {
        var p2Name = getP2Name();
        if (!p2Name) return;
        var isFirst = isP2FirstTurnOut(p2Name);
        var $cb = $('#firstTurnOutAiOpt');
        if ($cb.prop('checked') !== isFirst) {
            $cb.prop('checked', isFirst).trigger('change');
        }
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
        // Rebuild from round history first so oldEntries has accurate (post-replay) HP.
        // This prevents stale 0-HP values from a previous deleted sim from leaking in.
        // When in a branch, rebuildLineTeams replays main-line rounds and would advance
        // line.teams.p1.activeIdx to the main-line's final pokemon (e.g. the switched-in
        // mon from a switch round that the branch forks before). Save and restore it so
        // the branch-context active pokemon is unchanged after the rebuild.
        var _savedP1ActiveIdx = (line.activeBranchIdx >= 0) ? line.teams.p1.activeIdx : null;
        // rebuildLineTeams syncs the OLD roster's active entry item/HP to the P2 calc
        // form. If a new trainer was just loaded, the form currently has the CORRECT
        // item from selectTrainer — but the old roster still points at the previous
        // trainer's pokemon. Save the form values before rebuildLineTeams clobbers them
        // and restore after, so getItem('p2') below reads the new trainer's data.
        var _formP2Name = getP2Name();
        var _oldP2Active = getActiveEntry(team);
        var _savedFormItem = null, _savedFormAbility = null;
        if (_formP2Name && (!_oldP2Active || _oldP2Active.name !== _formP2Name)) {
            _savedFormItem = getItem('p2');
            _savedFormAbility = getAbility('p2');
        }
        rebuildLineTeams(line);
        if (_savedFormItem !== null) {
            window.NO_CALC = true;
            $('#p2 .item').val(_savedFormItem);
            if (_savedFormAbility) $('#p2 .ability').val(_savedFormAbility);
            window.NO_CALC = false;
        }
        if (_savedP1ActiveIdx !== null && line.activeBranchIdx >= 0) {
            line.teams.p1.activeIdx = _savedP1ActiveIdx;
        }
        // Preserve HP/status only for pokemon that have been involved in logged rounds.
        // Deep-copy each entry to prevent object-reference sharing between oldEntries
        // and the final newRoster — otherwise rebuildLineTeams mutations on shared
        // references corrupt ability/item/status across roster slots.
        var oldEntries = {};
        for (var i = 0; i < team.roster.length; i++) {
            oldEntries[team.roster[i].name] = $.extend(true, {}, team.roster[i]);
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

            // Only advance activeIdx past 0 when we have logged rounds — with no rounds
            // the form's currently loaded pokemon may be stale (previous trainer or a
            // non-lead pokemon), so we always default to slot 0 (the lead / first pokemon).
            if (pokeName === p2Name && line.rounds.length > 0) newActiveIdx = k;

            if (oldEntries[pokeName] && line.rounds.length > 0) {
                if (pokeName === p2Name) {
                    // Keep tracked HP/item/ability (from rebuildLineTeams replay).
                    // Ability and item are NOT read from the form here to avoid async-transition
                    // contamination (the set-selector updates before ability/item fields do).
                    var preserved = oldEntries[pokeName];
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

        // Normalize: P2 pokemon not yet in any logged round should have set-definition
        // items, not stale items from a previous trainer that shared the same pokemon name.
        for (var ni = 0; ni < newRoster.length; ni++) {
            var ne = newRoster[ni];
            var seenInRound = line.rounds.some(function(rd) {
                if (rd.isDoubles && rd.fighters) {
                    for (var _s2 in rd.fighters) {
                        if (rd.fighters[_s2] && rd.fighters[_s2].name === ne.name) return true;
                    }
                    return false;
                }
                return rd.p2 && rd.p2.name === ne.name;
            });
            if (!seenInRound) {
                var freshSet = lookupSet(ne.setId);
                if (freshSet && freshSet.item !== undefined) ne.item = freshSet.item || '';
            }
        }

        team.roster = newRoster;
        team.activeIdx = newActiveIdx;
        if (team.activeIdx < 0 && newRoster.length > 0) team.activeIdx = 0;
        if (team.activeIdx >= newRoster.length) team.activeIdx = newRoster.length - 1;
        // In singles, always clear slot-B so a stale value from a saved session or
        // a previous doubles match never hides the #2 roster pokemon from predictions.
        if (!isDoubles()) team.activeIdxB = -1;
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
        // If currently on a branch, rebuildLineTeams (called above) replayed main-line
        // rounds and left both P1 and P2 roster HP in the main-line end state (e.g. 0 after
        // a KO).  Rebuild for the active branch so HP reflects that branch's own round history.
        if (line.activeBranchIdx >= 0) {
            rebuildBranchTeams(line, line.activeBranchIdx);
            syncActiveStateToForm();
        }

        renderTeamPanel('p2');
        if (isDoubles()) refreshDoublesUI();
        // Sync first-turn-out checkbox when P2 team changes
        setTimeout(syncFirstTurnOut, 100);
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

    /**
     * Ensure the P2 roster contains every pokemon from CURRENT_TRAINER_POKS.
     * Adds any missing entries (with full HP) so predictSwitchIn never misses a candidate.
     * Called after rebuild operations that might leave the roster incomplete.
     */
    function ensureP2RosterComplete() {
        if (!window.CURRENT_TRAINER_POKS || !window.CURRENT_TRAINER_POKS.length) return;
        var line = curLine();
        var team = line.teams.p2;
        var existing = {};
        for (var i = 0; i < team.roster.length; i++) {
            existing[team.roster[i].name] = true;
        }
        var added = false;
        for (var t = 0; t < window.CURRENT_TRAINER_POKS.length; t++) {
            var raw = window.CURRENT_TRAINER_POKS[t];
            var setId = raw.indexOf(']') !== -1 ? raw.slice(raw.indexOf(']') + 1) : raw;
            var pokeName = String(setId).split(' (')[0];
            if (!pokeName || existing[pokeName]) continue;
            // This pokemon is missing from the roster — add it
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
            team.roster.push(entry);
            existing[pokeName] = true;
            added = true;
        }
        if (added) {
            renderTeamPanel('p2');
        }
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

        // Always save form state so item/status/ability changes persist
        saveFormToRoster(side);

        // Reset boosts on the outgoing pokemon (boosts clear on switch)
        var outgoing = getActiveEntry(team);
        if (outgoing) {
            outgoing.boosts = { at: 0, df: 0, sa: 0, sd: 0, sp: 0 };
            // Semi-invulnerability and confusion are volatile — clear on switch out
            outgoing.chargingMove   = null;
            outgoing.semiInvulnType = null;
            outgoing.confused       = false;
            outgoing.confuseRounds  = 0;
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
        if (_loadingForm) return; // form is mid-transition — values are stale
        var line = curLine();
        var team = line.teams[side];
        var entry = getActiveEntry(team);
        if (!entry) return;
        // Verify the form's loaded pokemon matches the roster entry to prevent
        // writing one pokemon's ability/item onto another's roster slot.
        var formName = (side === 'p1') ? getP1Name() : getP2Name();
        if (formName && formName !== entry.name) return;

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
        window.NO_CALC = true;
        for (var si = 0; si < sides.length; si++) {
            var side = sides[si];
            var entry = getActiveEntry(line.teams[side]);
            if (!entry) continue;
            for (var sti = 0; sti < stats.length; sti++) {
                var val = (entry.boosts && entry.boosts[stats[sti]]) || 0;
                $('#' + side + ' .' + stats[sti] + ' .boost').val(val);
            }
        }
        window.NO_CALC = false;
        try { performCalculations(); } catch (e) {}
    }

    // ════════════════════════════════════════════════════════════
    // CAPTURE ROUND
    // ════════════════════════════════════════════════════════════

    function captureRound(p1MoveIdx, p2MoveIdx, p2Crit, p1PreDmg, p1PreStatus, comment, p1ApplySecondary, p2ApplySecondary) {
        var line = curLine();

        // Decrement trick room counter at the start of each singles round
        var fldSR = line.fieldState;
        if ($('#trickroom').is(':checked') && fldSR.trickRoomTurns > 0) {
            fldSR.trickRoomTurns--;
            if (fldSR.trickRoomTurns <= 0) {
                fldSR.trickRoomTurns = 0;
                $('#trickroom').prop('checked', false).trigger('change');
            }
        }

        // Decrement weather / terrain / screen / tailwind counters
        decrementFieldCounters();

        // Save current form state to roster
        saveFormToRoster('p1');
        saveFormToRoster('p2');

        // Pre-damage is NOT cleared here — if this round is later deleted,
        // rebuildLineTeams/rebuildBranchTeams will restore the user's pre-damage
        // HP using preDamageHP.  It is only cleared when a NEW pre-damage value
        // is set (hp-edit handler) or when the mon reaches maxHP after rebuild.

        // Sync boosts from roster to calc form before damage calculation
        syncBoostsToCalc();

        var speed = getSpeedInfo();

        var p1Entry = getActiveEntry(line.teams.p1);
        var p2Entry = getActiveEntry(line.teams.p2);
        if (!p1Entry || !p2Entry) {
            alert('Both sides need an active Pokémon on their team.');
            return null;
        }

        // Get damage info (always compute; will be nulled out below if charge/invuln rules apply)
        var p1Dmg = (p1MoveIdx !== 'none' && p1MoveIdx !== -1) ? getDamageInfo(0, p1MoveIdx) : null;
        var p2Dmg = (p2MoveIdx !== 'none' && p2MoveIdx !== -1) ? getDamageInfo(1, p2MoveIdx) : null;
        var p2CritInfo = (p2MoveIdx !== 'none' && p2MoveIdx !== -1) ? getCritResult(1, p2MoveIdx) : null;

        // Look up RBDex move data for detailed info
        var p1MoveName = (p1MoveIdx !== 'none' && p1MoveIdx !== -1) ? getMoveNames(0, p1MoveIdx) : null;
        var p2MoveName = (p2MoveIdx !== 'none' && p2MoveIdx !== -1) ? getMoveNames(1, p2MoveIdx) : null;
        var p1MoveData = p1MoveName ? lookupMoveData(p1MoveName) : null;
        var p2MoveData = p2MoveName ? lookupMoveData(p2MoveName) : null;

        // ── Two-turn charge move state detection ──────────────────
        // Normalise move keys (same scheme as lookupMoveData)
        var p1MoveKey = p1MoveName ? p1MoveName.toLowerCase().replace(/[\s\-\']+/g, '') : '';
        var p2MoveKey = p2MoveName ? p2MoveName.toLowerCase().replace(/[\s\-\']+/g, '') : '';

        // Is this a semi-invulnerable charge move?
        // Prefer data-driven moveData.semiInvuln, fall back to legacy CHARGE_SEMI_INVULN dict
        var p1HasSemiInvuln = (p1MoveData && p1MoveData.semiInvuln) || CHARGE_SEMI_INVULN.hasOwnProperty(p1MoveKey);
        var p2HasSemiInvuln = (p2MoveData && p2MoveData.semiInvuln) || CHARGE_SEMI_INVULN.hasOwnProperty(p2MoveKey);
        // Is this ANY charge move (including Solar Beam etc.)?
        var p1IsAnyChargeMove = (p1MoveData && p1MoveData.flags && p1MoveData.flags.charge) || CHARGE_ONLY_MOVES[p1MoveKey];
        var p2IsAnyChargeMove = (p2MoveData && p2MoveData.flags && p2MoveData.flags.charge) || CHARGE_ONLY_MOVES[p2MoveKey];

        // Determine charge turn vs strike turn based on persisted entry state
        var p1ChargeTurn = !!(p1IsAnyChargeMove && !p1Entry.chargingMove);
        var p1StrikeTurn = !!(p1IsAnyChargeMove && p1Entry.chargingMove === p1MoveKey);
        var p2ChargeTurn = !!(p2IsAnyChargeMove && !p2Entry.chargingMove);
        var p2StrikeTurn = !!(p2IsAnyChargeMove && p2Entry.chargingMove === p2MoveKey);

        // On the charge turn the attacker deals NO damage
        if (p1ChargeTurn) { p1Dmg = null; }
        if (p2ChargeTurn) { p2Dmg = null; p2CritInfo = null; }

        // Semi-invulnerability: if the DEFENDER was in a semi-invuln state at the START
        // of this round, the attacker deals 0 unless their move bypasses it.
        // Invulnerability persists across both the charge round (set at end) and the
        // entire strike round until the defender attacks — so it applies here always.
        var p1WasBypassed = false; // whether P1 bypassed P2's invuln
        var p2WasBypassed = false;
        if (p2Entry.semiInvulnType) {
            var bypP2 = INVULN_BYPASSES[p2Entry.semiInvulnType] || [];
            p1WasBypassed = bypP2.indexOf(p1MoveKey) !== -1;
            if (!p1WasBypassed) p1Dmg = null;
        }
        if (p1Entry.semiInvulnType) {
            var bypP1 = INVULN_BYPASSES[p1Entry.semiInvulnType] || [];
            p2WasBypassed = bypP1.indexOf(p2MoveKey) !== -1;
            if (!p2WasBypassed) { p2Dmg = null; p2CritInfo = null; }
        }
        var p1Priority = (p1MoveData && typeof p1MoveData.priority === 'number') ? p1MoveData.priority : 0;
        var p2Priority = (p2MoveData && typeof p2MoveData.priority === 'number') ? p2MoveData.priority : 0;

        // Ability priority modifiers (Prankster, Gale Wings, Triage)
        function applyAbilityPriorityMod(entry, basePrio, moveData) {
            if (!moveData) return basePrio;
            var ae = getAbilityEffects(entry.ability);
            if (!ae || !ae.priorityMod) return basePrio;
            var pm = ae.priorityMod;
            var c = pm.condition || {};
            if (c.alwaysLast) return basePrio; // Stall handled separately via lastInBracket
            if (c.category && moveData.category !== c.category) return basePrio;
            if (c.moveType && moveData.type !== c.moveType) return basePrio;
            if (c.fullHP && entry.currentHP < entry.maxHP) return basePrio;
            if (c.isHealing && !(moveData.heal || moveData.drain)) return basePrio;
            return basePrio + (pm.boost || 0);
        }
        p1Priority = applyAbilityPriorityMod(p1Entry, p1Priority, p1MoveData);
        p2Priority = applyAbilityPriorityMod(p2Entry, p2Priority, p2MoveData);

        // Custap Berry: gives +1 priority bracket when at ≤25% HP (≤50% with Gluttony)
        var p1Custap = false, p2Custap = false;
        if (p1Entry.item === 'Custap Berry' && p1MoveIdx !== 'none') {
            var threshold = p1Entry.ability === 'Gluttony' ? 2 : 4;
            if (p1Entry.currentHP <= Math.floor(p1Entry.maxHP / threshold)) {
                p1Priority += 1;
                p1Custap = true;
            }
        }
        if (p2Entry.item === 'Custap Berry' && p2MoveIdx !== 'none') {
            var threshold2 = p2Entry.ability === 'Gluttony' ? 2 : 4;
            if (p2Entry.currentHP <= Math.floor(p2Entry.maxHP / threshold2)) {
                p2Priority += 1;
                p2Custap = true;
            }
        }

        if (p1Priority !== p2Priority) {
            // Higher priority bracket goes first (regardless of speed)
            speed.faster = p1Priority > p2Priority ? 'p1' : 'p2';
        } else {
            // Same bracket: check moveLastInBracket (Lagging Tail / Full Incense) and Stall
            function movesLast(entry) {
                var ie = getItemEffects(entry.item);
                if (ie && ie.moveLastInBracket) return true;
                var ae = getAbilityEffects(entry.ability);
                if (ae && ae.priorityMod && ae.priorityMod.condition && ae.priorityMod.condition.alwaysLast) return true;
                return false;
            }
            var p1Last = movesLast(p1Entry);
            var p2Last = movesLast(p2Entry);
            if (p1Last && !p2Last) speed.faster = 'p2';
            else if (p2Last && !p1Last) speed.faster = 'p1';
            // If both or neither, keep speed.faster as-is
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
            // Hazard damage is flat (no roll), so apply identically to bestCaseHP
            if (p1Entry.bestCaseHP != null) {
                p1Entry.bestCaseHP = Math.max(0, p1Entry.bestCaseHP - p1PreDmg);
            }
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

        // Bug fix: if P2's move type has 0 effectiveness against P1 (type immunity),
        // the move fails entirely — no secondary effects should be applied to P1.
        if (p2Eff && p2MoveData && p2MoveData.type) {
            var p2MoveTypeMult = getTypeMultiplier(p2MoveData.type, p1Entry.types || [], p1Entry.ability || '');
            if (p2MoveTypeMult === 0) p2Eff = null;
        }
        // Similarly, if P1's move type has 0 effectiveness against P2, skip P1's secondary effects.
        if (p1Eff && p1MoveData && p1MoveData.type) {
            var p1MoveTypeMult = getTypeMultiplier(p1MoveData.type, p2Entry.types || [], p2Entry.ability || '');
            if (p1MoveTypeMult === 0) p1Eff = null;
        }

        // Helper: check if a pokemon is immune to sleep
        function isSleepImmune(entry) {
            var ae = getAbilityEffects(entry.ability || '');
            if (ae && ae.statusImmunity && ae.statusImmunity.indexOf('Sleep') !== -1) return true;
            var ab = (entry.ability || '').toLowerCase().replace(/\s/g, '');
            return ab === 'insomnia' || ab === 'vitalspirit' || ab === 'sweetveil';
        }
        // Helper: check if a pokemon is immune to freeze
        function isFreezeImmune(entry) {
            var ae = getAbilityEffects(entry.ability || '');
            if (ae && ae.statusImmunity && ae.statusImmunity.indexOf('Freeze') !== -1) return true;
            var ab = (entry.ability || '').toLowerCase().replace(/\s/g, '');
            if (ab === 'magmaarmor') return true;
            // Ice types are freeze-immune in gen 6+
            if (entry.types && entry.types.indexOf('Ice') !== -1) return true;
            return false;
        }
        // Helper: check if item cures a status
        function itemCuresStatus(entry, status) {
            var ie = getItemEffects(entry.item || '');
            if (ie && ie.statusCure) {
                if (ie.statusCure === 'any') return true;
                if (ie.statusCure === status) return true;
                // Treat Badly Poisoned as Poison for cure purposes
                if (ie.statusCure === 'Poison' && status === 'Badly Poisoned') return true;
            }
            var it = (entry.item || '').toLowerCase().replace(/\s/g, '');
            if (it === 'lumberry') return true;
            if (status === 'Sleep' && it === 'chestoberry') return true;
            if (status === 'Freeze' && it === 'aspearberry') return true;
            return false;
        }

        // Helper: check type-based status immunity
        function isStatusImmune(entry, status) {
            var types = entry.types || [];
            if (status === 'Burn'    && types.indexOf('Fire')  !== -1) return true;
            if (status === 'Poison'  && (types.indexOf('Poison')  !== -1 || types.indexOf('Steel') !== -1)) return true;
            if (status === 'Badly Poisoned' && (types.indexOf('Poison') !== -1 || types.indexOf('Steel') !== -1)) return true;
            if (status === 'Freeze'  && types.indexOf('Ice')   !== -1) return true;
            if (status === 'Paralysis' && types.indexOf('Electric') !== -1 && gen >= 6) return true; // Gen 6+ Electric immune to paralysis
            return false;
        }

        // Apply effects in turn order: first mover applies effects, then check blocking
        var firstMover  = (speed.faster === 'p2') ? 'p2' : 'p1';
        var secondMover = (firstMover === 'p1') ? 'p2' : 'p1';
        var firstEff    = (firstMover === 'p1') ? p1Eff : p2Eff;
        var secondEff   = (firstMover === 'p1') ? p2Eff : p1Eff;
        var firstEntry  = (firstMover === 'p1') ? p1Entry : p2Entry;
        var secondEntry = (firstMover === 'p1') ? p2Entry : p1Entry;

        // Track berry-nullified status/confusion for display in round card
        var p1StatusNullifiedByBerry = null; // { status, berry }
        var p2StatusNullifiedByBerry = null;
        // Track any consumed item (Focus Sash, Custap Berry, Sitrus Berry, etc.) for display
        var p1ItemConsumed = null; // item name string
        var p2ItemConsumed = null;

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
                if (isStatusImmune(secondEntry, firstEff.status)) blocked = true;
                if (!blocked) {
                    secondEntry.status = firstEff.status;
                    // Check if status blocks second mover from attacking
                    if (firstEff.status === 'Sleep') {
                        if (!itemCuresStatus(secondEntry, 'Sleep')) {
                            secondMoverBlocked = true;
                            secondMoverBlockReason = 'sleep';
                        } else {
                            // Berry cured the sleep before it could block action
                            var _sleepBerry = (secondEntry.item || '');
                            secondEntry.status = '';
                            secondEntry.item = ''; $('#' + (secondMover === 'p1' ? 'p1' : 'p2') + ' .item').val('');
                            if (secondMover === 'p1') p1StatusNullifiedByBerry = { status: 'Sleep', berry: _sleepBerry };
                            else p2StatusNullifiedByBerry = { status: 'Sleep', berry: _sleepBerry };
                        }
                    } else if (firstEff.status === 'Freeze') {
                        if (!itemCuresStatus(secondEntry, 'Freeze')) {
                            secondMoverBlocked = true;
                            secondMoverBlockReason = 'freeze';
                        } else {
                            var _freezeBerry = (secondEntry.item || '');
                            secondEntry.status = '';
                            secondEntry.item = ''; $('#' + (secondMover === 'p1' ? 'p1' : 'p2') + ' .item').val('');
                            if (secondMover === 'p1') p1StatusNullifiedByBerry = { status: 'Freeze', berry: _freezeBerry };
                            else p2StatusNullifiedByBerry = { status: 'Freeze', berry: _freezeBerry };
                        }
                    }
                }
            }
            // Confusion applied to second mover
            if (firstEff.volatile === 'confusion') {
                if (!secondEntry.confused) {
                    secondEntry.confused = true;
                    secondEntry.confuseRounds = 5; // max 5 rounds
                    // Check if Persim Berry cures confusion immediately
                    var secItlc = (secondEntry.item || '').toLowerCase().replace(/\s/g, '');
                    if (secItlc === 'persimberry' || secItlc === 'lumberry') {
                        secondEntry.confused = false;
                        secondEntry.confuseRounds = 0;
                        var _confBerry1 = secondEntry.item;
                        secondEntry.item = ''; $('#' + (secondMover === 'p1' ? 'p1' : 'p2') + ' .item').val('');
                        if (secondMover === 'p1') p1StatusNullifiedByBerry = { status: 'Confusion', berry: _confBerry1 };
                        else p2StatusNullifiedByBerry = { status: 'Confusion', berry: _confBerry1 };
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

        // NOTE: Second mover's target effects are deferred until after HP calculation
        // (we must know if the second mover is KO'd before applying their effects)

        // Set blocked flags for HP calculation
        var p1Flinched = secondMoverBlocked && (secondMover === 'p1');
        var p2Flinched = secondMoverBlocked && (secondMover === 'p2');

        // ── Contact/hit ability effects ──
        // Cotton Down: when hit by a damaging move, -1 Speed to all other pokemon on the field
        // In singles: the attacker gets -1 Spe
        function reactiveDrop(defAbility) {
            var ae = getAbilityEffects(defAbility);
            if (ae && ae.reactiveSpeedDrop) return ae.reactiveSpeedDrop;
            return defAbility === 'Cotton Down' ? 1 : 0;
        }
        var p2Reactive = reactiveDrop(p2Entry.ability);
        if (p1Dmg && p1Dmg.maxDmg > 0 && !p1Flinched && p2Reactive) {
            applyBoosts(p1Entry, { spe: -p2Reactive });
        }
        var p1Reactive = reactiveDrop(p1Entry.ability);
        if (p2Dmg && p2Dmg.maxDmg > 0 && !p2Flinched && p1Reactive) {
            applyBoosts(p2Entry, { spe: -p1Reactive });
        }

        // Increment toxic counter before EOT so the correct turn count is used
        if (p1Entry.status === 'Badly Poisoned') p1Entry.toxicCounter = (p1Entry.toxicCounter || 0) + 1;
        if (p2Entry.status === 'Badly Poisoned') p2Entry.toxicCounter = (p2Entry.toxicCounter || 0) + 1;

        // Confusion round tick: decrement each round; clear when reaching 0
        // Also calculate max self-hit damage for display
        function calcConfuseSelfHit(entry) {
            // Confusion self-hit: 40 BP typeless physical, attacker vs own defense
            // Standard Gen 3+ formula: floor(floor(floor(2*50/5+2)*40*Atk/Def)/50+2) * roll
            // Returns max damage (100% roll)
            try {
                var poke = createPokemon(entry.setId);
                if (!poke || !poke.stats) return null;
                var rawAtk = poke.stats.atk || 1;
                var rawDef = poke.stats.def || 1;
                // Apply current boosts
                var atkBoost = (entry.boosts && entry.boosts.at) || 0;
                var defBoost = (entry.boosts && entry.boosts.df) || 0;
                function applyBoostMult(base, boost) {
                    return boost >= 0 ? Math.floor(base * (2 + boost) / 2) : Math.floor(base * 2 / (2 - boost));
                }
                var boostedAtk = applyBoostMult(rawAtk, atkBoost);
                var boostedDef = applyBoostMult(rawDef, defBoost);
                // Burn halves Attack
                if (entry.status === 'Burn') boostedAtk = Math.floor(boostedAtk / 2);
                // Max roll (100/100)
                var dmg = Math.floor(Math.floor(Math.floor(2 * 50 / 5 + 2) * 40 * boostedAtk / boostedDef) / 50) + 2;
                return Math.max(1, dmg);
            } catch (e) { return null; }
        }
        var p1ConfuseSelfHitMax = null, p2ConfuseSelfHitMax = null;
        if (p1Entry.confused) {
            p1ConfuseSelfHitMax = calcConfuseSelfHit(p1Entry);
            p1Entry.confuseRounds = Math.max(0, (p1Entry.confuseRounds || 1) - 1);
            if (p1Entry.confuseRounds <= 0) {
                p1Entry.confused = false;
                p1Entry.confuseRounds = 0;
            }
        }
        if (p2Entry.confused) {
            p2ConfuseSelfHitMax = calcConfuseSelfHit(p2Entry);
            p2Entry.confuseRounds = Math.max(0, (p2Entry.confuseRounds || 1) - 1);
            if (p2Entry.confuseRounds <= 0) {
                p2Entry.confused = false;
                p2Entry.confuseRounds = 0;
            }
        }

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

        // Apply in speed order with inline survival checks (Focus Sash, Sturdy)
        // Survival must fire BEFORE deciding if the second mover can attack
        var p1Sashed = false, p2Sashed = false;
        var p1Sturdied = false, p2Sturdied = false;

        if (speed.faster === 'p1' || speed.faster === 'tie') {
            // P1 attacks P2 first
            p2HPAfter = Math.max(0, p2HPAfter - p1DmgToP2Min);
            p2BestAfter = Math.max(0, p2BestAfter - p1DmgToP2Max);

            // Survival checks for P2 (defender) — P1 is attacker
            var p2Surv = applySurvivalChecks(p2Entry, p2HPAfter, p2HPBefore, p2Entry.maxHP, p1Entry.ability);
            if (p2Surv.survived) {
                if (p2HPAfter <= 0) p2HPAfter = 1;
                p2Sashed = p2Surv.sashed;
                p2Sturdied = p2Surv.sturdied;
            }
            var p2SurvBest = applySurvivalChecks(p2Entry, p2BestAfter, p2BestBefore, p2Entry.maxHP, p1Entry.ability);
            if (p2SurvBest.survived && p2BestAfter <= 0) {
                if (p2BestBefore >= p2Entry.maxHP) p2BestAfter = 1;
            }

            // P2 attacks P1 only if P2 survived (including via sash/sturdy)
            if (p2HPAfter > 0) {
                p1HPAfter = Math.max(0, p1HPAfter - p2DmgToP1Max);
            }
            if (p2BestAfter > 0) {
                p1BestAfter = Math.max(0, p1BestAfter - p2DmgToP1Min);
            } else {
                p1BestAfter = p1BestBefore; // P2 KO'd, P1 takes no damage in best case
            }

            // Survival checks for P1 (defender) — P2 is attacker
            if (p2HPAfter > 0) {
                var p1Surv = applySurvivalChecks(p1Entry, p1HPAfter, p1HPBefore, p1Entry.maxHP, p2Entry.ability);
                if (p1Surv.survived) {
                    if (p1HPAfter <= 0) p1HPAfter = 1;
                    p1Sashed = p1Surv.sashed;
                    p1Sturdied = p1Surv.sturdied;
                }
            }
            if (p2BestAfter > 0) {
                var p1SurvBest = applySurvivalChecks(p1Entry, p1BestAfter, p1BestBefore, p1Entry.maxHP, p2Entry.ability);
                if (p1SurvBest.survived && p1BestAfter <= 0 && p1BestBefore >= p1Entry.maxHP) p1BestAfter = 1;
            }
        } else {
            // P2 attacks P1 first
            p1HPAfter = Math.max(0, p1HPAfter - p2DmgToP1Max);
            p1BestAfter = Math.max(0, p1BestAfter - p2DmgToP1Min);

            // Survival checks for P1 (defender) — P2 is attacker
            var p1Surv = applySurvivalChecks(p1Entry, p1HPAfter, p1HPBefore, p1Entry.maxHP, p2Entry.ability);
            if (p1Surv.survived) {
                if (p1HPAfter <= 0) p1HPAfter = 1;
                p1Sashed = p1Surv.sashed;
                p1Sturdied = p1Surv.sturdied;
            }
            var p1SurvBest = applySurvivalChecks(p1Entry, p1BestAfter, p1BestBefore, p1Entry.maxHP, p2Entry.ability);
            if (p1SurvBest.survived && p1BestAfter <= 0 && p1BestBefore >= p1Entry.maxHP) p1BestAfter = 1;

            // P1 attacks P2 only if P1 survived (including via sash/sturdy)
            if (p1HPAfter > 0) {
                p2HPAfter = Math.max(0, p2HPAfter - p1DmgToP2Min);
            }
            if (p1BestAfter > 0) {
                p2BestAfter = Math.max(0, p2BestAfter - p1DmgToP2Max);
            } else {
                p2BestAfter = p2BestBefore;
            }

            // Survival checks for P2 (defender) — P1 is attacker
            if (p1HPAfter > 0) {
                var p2Surv = applySurvivalChecks(p2Entry, p2HPAfter, p2HPBefore, p2Entry.maxHP, p1Entry.ability);
                if (p2Surv.survived) {
                    if (p2HPAfter <= 0) p2HPAfter = 1;
                    p2Sashed = p2Surv.sashed;
                    p2Sturdied = p2Surv.sturdied;
                }
            }
            if (p1BestAfter > 0) {
                var p2SurvBest = applySurvivalChecks(p2Entry, p2BestAfter, p2BestBefore, p2Entry.maxHP, p1Entry.ability);
                if (p2SurvBest.survived && p2BestAfter <= 0 && p2BestBefore >= p2Entry.maxHP) p2BestAfter = 1;
            }
        }

        // Consume Focus Sash after speed-order resolution (Sturdy is not consumed)
        if (p1Sashed) { p1ItemConsumed = p1Entry.item; p1Entry.item = ''; $('#p1 .item').val(''); }
        if (p2Sashed) { p2ItemConsumed = p2Entry.item; p2Entry.item = ''; $('#p2 .item').val(''); }

        // Consume Custap Berry after it activated
        if (p1Custap) { p1ItemConsumed = p1Entry.item; p1Entry.item = ''; $('#p1 .item').val(''); }
        if (p2Custap) { p2ItemConsumed = p2Entry.item; p2Entry.item = ''; $('#p2 .item').val(''); }

        // Apply second mover's secondary effects ONLY if they are not blocked AND survived
        // (deferred until here so we can check if the second mover was KO'd)
        var secondMoverHPAfter = (secondMover === 'p1') ? p1HPAfter : p2HPAfter;
        if (secondEff && !secondMoverBlocked && secondMoverHPAfter > 0) {
            if (secondMover === 'p1') p1SecondaryApplied = secondEff;
            else p2SecondaryApplied = secondEff;

            if (secondEff.status && !firstEntry.status) {
                var blocked2 = false;
                if (secondEff.status === 'Sleep'  && isSleepImmune(firstEntry))  blocked2 = true;
                if (secondEff.status === 'Freeze' && isFreezeImmune(firstEntry)) blocked2 = true;
                if (isStatusImmune(firstEntry, secondEff.status))                blocked2 = true;
                if (!blocked2) {
                    firstEntry.status = secondEff.status;
                    // Check if first mover's berry cures the status immediately
                    if (itemCuresStatus(firstEntry, secondEff.status)) {
                        var _berry2 = firstEntry.item;
                        firstEntry.status = '';
                        firstEntry.item = ''; $('#' + (firstMover === 'p1' ? 'p1' : 'p2') + ' .item').val('');
                        if (firstMover === 'p1') p1StatusNullifiedByBerry = { status: secondEff.status, berry: _berry2 };
                        else p2StatusNullifiedByBerry = { status: secondEff.status, berry: _berry2 };
                    }
                }
            }
            // Confusion applied to first mover
            if (secondEff.volatile === 'confusion') {
                if (!firstEntry.confused) {
                    firstEntry.confused = true;
                    firstEntry.confuseRounds = 5;
                    var fstItlc = (firstEntry.item || '').toLowerCase().replace(/\s/g, '');
                    if (fstItlc === 'persimberry' || fstItlc === 'lumberry') {
                        firstEntry.confused = false;
                        firstEntry.confuseRounds = 0;
                        var _confBerry2 = firstEntry.item;
                        firstEntry.item = ''; $('#' + (firstMover === 'p1' ? 'p1' : 'p2') + ' .item').val('');
                        if (firstMover === 'p1') p1StatusNullifiedByBerry = { status: 'Confusion', berry: _confBerry2 };
                        else p2StatusNullifiedByBerry = { status: 'Confusion', berry: _confBerry2 };
                    }
                }
            }
            if (secondEff.boosts)     applyBoosts(firstEntry,  secondEff.boosts);
            if (secondEff.selfBoosts) applyBoosts(secondEntry, secondEff.selfBoosts);
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
                    p1BestAfter = Math.max(0, p1BestAfter - (ex.damageMin != null ? ex.damageMin : ex.damage));
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
                    p2BestAfter = Math.max(0, p2BestAfter - (ex.damageMin != null ? ex.damageMin : ex.damage));
                }
            }
        }

        // Apply end-of-turn damage (same for both — EOT is fixed)
        // Skip EOT effects (including healing) for a tracker already at 0 HP — a fainted
        // Pokémon cannot receive end-of-turn healing (e.g. Black Sludge, Leftovers).
        for (var i = 0; i < p1EOT.length; i++) {
            if (p1HPAfter > 0) p1HPAfter = Math.max(0, Math.min(p1Entry.maxHP, p1HPAfter - p1EOT[i].damage));
            if (p1BestAfter > 0) p1BestAfter = Math.max(0, Math.min(p1Entry.maxHP, p1BestAfter - p1EOT[i].damage));
        }
        for (var i = 0; i < p2EOT.length; i++) {
            if (p2HPAfter > 0) p2HPAfter = Math.max(0, Math.min(p2Entry.maxHP, p2HPAfter - p2EOT[i].damage));
            if (p2BestAfter > 0) p2BestAfter = Math.max(0, Math.min(p2Entry.maxHP, p2BestAfter - p2EOT[i].damage));
        }

        // ── Post-EOT item effects ──
        // Helper to clear a consumed item from the entry and its calc form
        function consumeItem(entry, side) {
            entry.item = '';
            $('#' + side + ' .item').val('');
        }

        // Status-curing berries activate end-of-turn (after EOT status damage)
        // Sitrus Berry heals 25% max HP when at ≤ 50% HP
        function applyPostEOTBerries(entry, hpVar, bestVar, eotList, side) {
            if (!entry.item || entry.currentHP <= 0) return { hp: hpVar, best: bestVar, berryCured: null, itemConsumed: null };
            var itlc = entry.item.toLowerCase().replace(/\s/g, '');
            var itemName = entry.item;
            var cured = false;
            var curedStatus = null;

            if (hpVar > 0) {
                if (itlc === 'lumberry' && (entry.status || entry.confused)) {
                    curedStatus = entry.status || 'Confusion';
                    entry.status = ''; entry.toxicCounter = 0; entry.confused = false; entry.confuseRounds = 0; cured = true;
                } else if (itlc === 'persimberry' && entry.confused) {
                    curedStatus = 'Confusion';
                    entry.confused = false; entry.confuseRounds = 0; cured = true;
                } else if (itlc === 'rawstberry' && entry.status === 'Burn') {
                    curedStatus = 'Burn';
                    entry.status = ''; cured = true;
                } else if (itlc === 'pechaberry' && (entry.status === 'Poison' || entry.status === 'Badly Poisoned')) {
                    curedStatus = entry.status;
                    entry.status = ''; entry.toxicCounter = 0; cured = true;
                } else if (itlc === 'cheriberry' && entry.status === 'Paralysis') {
                    curedStatus = 'Paralysis';
                    entry.status = ''; cured = true;
                } else if (itlc === 'chestoberry' && entry.status === 'Sleep') {
                    curedStatus = 'Sleep';
                    entry.status = ''; cured = true;
                } else if (itlc === 'aspearberry' && entry.status === 'Freeze') {
                    curedStatus = 'Freeze';
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
                    // Sitrus is not a status cure — show it as a generic item consumption
                    return { hp: hpVar, best: bestVar, berryCured: null, itemConsumed: itemName };
                }
            }
            return {
                hp: hpVar, best: bestVar,
                berryCured: cured ? { status: curedStatus, berry: itlc } : null,
                // Status-cure berries are shown via berryCured/statusNullifiedByBerry — no double-tag
                itemConsumed: null
            };
        }

        var p1PostEOT = applyPostEOTBerries(p1Entry, p1HPAfter, p1BestAfter, p1EOT, 'p1');
        p1HPAfter = p1PostEOT.hp; p1BestAfter = p1PostEOT.best;
        if (p1PostEOT.berryCured && !p1StatusNullifiedByBerry) p1StatusNullifiedByBerry = p1PostEOT.berryCured;
        if (p1PostEOT.itemConsumed && !p1ItemConsumed) p1ItemConsumed = p1PostEOT.itemConsumed;
        var p2PostEOT = applyPostEOTBerries(p2Entry, p2HPAfter, p2BestAfter, p2EOT, 'p2');
        p2HPAfter = p2PostEOT.hp; p2BestAfter = p2PostEOT.best;
        if (p2PostEOT.berryCured && !p2StatusNullifiedByBerry) p2StatusNullifiedByBerry = p2PostEOT.berryCured;
        if (p2PostEOT.itemConsumed && !p2ItemConsumed) p2ItemConsumed = p2PostEOT.itemConsumed;

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

        // ── Item manipulation from move data (Knock Off, Thief, Trick, etc.) ──
        // P1 attacks P2: check p1MoveData.onHit
        if (p1MoveData && p1MoveData.onHit && !p1Flinched && p2HPAfter > 0) {
            applyMoveItemEffect(p1MoveData.onHit, p1Entry, p2Entry, 'p1', 'p2');
        }
        // P2 attacks P1: check p2MoveData.onHit
        if (p2MoveData && p2MoveData.onHit && !p2Flinched && p1HPAfter > 0) {
            applyMoveItemEffect(p2MoveData.onHit, p2Entry, p1Entry, 'p2', 'p1');
        }

        // ── HP cost moves (Belly Drum) ──
        if (p1MoveData && p1MoveData.hpCost && !p1Flinched) {
            var hpLoss = Math.floor(p1Entry.maxHP * p1MoveData.hpCost);
            if (p1HPAfter > hpLoss) {
                p1HPAfter -= hpLoss;
                p1BestAfter = Math.max(0, p1BestAfter - hpLoss);
            }
        }
        if (p2MoveData && p2MoveData.hpCost && !p2Flinched) {
            var hpLoss2 = Math.floor(p2Entry.maxHP * p2MoveData.hpCost);
            if (p2HPAfter > hpLoss2) {
                p2HPAfter -= hpLoss2;
                p2BestAfter = Math.max(0, p2BestAfter - hpLoss2);
            }
        }

        // Selfdestruct moves KO the user if they dealt damage
        if (p1MoveData && p1MoveData.selfdestruct && !p1Flinched && p1DmgToP2Max > 0) {
            p1HPAfter = 0; p1BestAfter = 0;
        }
        if (p2MoveData && p2MoveData.selfdestruct && !p2Flinched && p2DmgToP1Max > 0) {
            p2HPAfter = 0; p2BestAfter = 0;
        }

        // Trick Room: if either side used Trick Room, toggle the checkbox and counter
        if ((p1MoveData && p1MoveData.pseudoWeather === 'trickroom') ||
            (p2MoveData && p2MoveData.pseudoWeather === 'trickroom')) {
            var fldS = curLine().fieldState;
            if (fldS.trickRoomTurns > 0) {
                fldS.trickRoomTurns = 0;
                $('#trickroom').prop('checked', false).trigger('change');
            } else {
                fldS.trickRoomTurns = 5;
                $('#trickroom').prop('checked', true).trigger('change');
            }
        }

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
        var _activeBranchObj = (line.branches && line.activeBranchIdx >= 0) ? line.branches[line.activeBranchIdx] : null;
        var rd = {
            roundNum: _activeBranchObj
                ? (_activeBranchObj.forkRoundIdx + _activeBranchObj.rounds.length + 1)
                : ++line.roundCounter,
            speed: speed,
            p1Priority: p1Priority,
            p2Priority: p2Priority,
            weather: getWeather(),
            terrain: getTerrain(),
            trickRoom: speed.trickRoom,
            p2Crit: p2Crit,
            p1Charging: p1ChargeTurn,
            p2Charging: p2ChargeTurn,
            p1StrikeTurn: p1StrikeTurn,
            p2StrikeTurn: p2StrikeTurn,
            p1SemiInvuln: !!(p2Entry.semiInvulnType),   // P2 was invuln when P1 attacked
            p2SemiInvuln: !!(p1Entry.semiInvulnType),   // P1 was invuln when P2 attacked
            p1InvulnType: p2Entry.semiInvulnType || null,
            p2InvulnType: p1Entry.semiInvulnType || null,
            p1PreDmg: p1PreDmg || 0,
            p1PreStatus: p1PreStatus || '',
            comment: comment || '',
            probability: roundProb,
            hazards: {
                p1: $.extend({}, getFieldHazards('p1')),
                p2: $.extend({}, getFieldHazards('p2'))
            },
            p1: {
                name: p1Entry.name,
                sprite: p1Entry.sprite,
                item: p1Entry.item,
                ability: p1Entry.ability,
                status: p1Entry.status,
                confused: !!p1Entry.confused,
                confuseRounds: p1Entry.confused ? (p1Entry.confuseRounds || 0) : 0,
                confuseSelfHitMax: p1Entry.confused ? p1ConfuseSelfHitMax : null,
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
                statusNullifiedByBerry: p1StatusNullifiedByBerry,
                itemConsumed: p1ItemConsumed,
                sashed: p1Sashed,
                sturdied: p1Sturdied,
                custap: p1Custap,
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
                confused: !!p2Entry.confused,
                confuseRounds: p2Entry.confused ? (p2Entry.confuseRounds || 0) : 0,
                confuseSelfHitMax: p2Entry.confused ? p2ConfuseSelfHitMax : null,
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
                statusNullifiedByBerry: p2StatusNullifiedByBerry,
                itemConsumed: p2ItemConsumed,
                sashed: p2Sashed,
                custap: p2Custap,
                sturdied: p2Sturdied,
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

        // Re-sync first-turn-out so the next round's AI percentages are correct
        // (P2 has now appeared, so firstTurnOut should become false after this round)
        setTimeout(syncFirstTurnOut, 50);

        // If P2 is KO'd, predict who switches in next
        if (p2HPAfter <= 0) {
            try {
                rd.switchPred = predictSwitchIn('$p1');
            } catch (e) { rd.switchPred = null; }
        }

        // ── Update two-turn charge/invuln state on entries (after rd is built) ──
        // Charge turn: mark the pokemon as charging + set semi-invuln for next round
        if (p2ChargeTurn) {
            p2Entry.chargingMove   = p2MoveKey;
            p2Entry.semiInvulnType = (p2MoveData && p2MoveData.semiInvuln) || CHARGE_SEMI_INVULN[p2MoveKey] || null;
        } else if (p2StrikeTurn || (p2MoveIdx !== 'none' && !p2IsAnyChargeMove)) {
            p2Entry.chargingMove   = null;
            p2Entry.semiInvulnType = null;
        }
        if (p1ChargeTurn) {
            p1Entry.chargingMove   = p1MoveKey;
            p1Entry.semiInvulnType = (p1MoveData && p1MoveData.semiInvuln) || CHARGE_SEMI_INVULN[p1MoveKey] || null;
        } else if (p1StrikeTurn || (p1MoveIdx !== 'none' && !p1IsAnyChargeMove)) {
            p1Entry.chargingMove   = null;
            p1Entry.semiInvulnType = null;
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
        // Decrement trick room counter at start of round (after previous round set it)
        var fld2 = curLine().fieldState;
        if (tr && fld2.trickRoomTurns != null && fld2.trickRoomTurns > 0) {
            fld2.trickRoomTurns--;
            if (fld2.trickRoomTurns <= 0) {
                fld2.trickRoomTurns = 0;
                $('#trickroom').prop('checked', false).trigger('change');
                tr = false;
            }
        }
        // Decrement weather / terrain / screen / tailwind counters
        decrementFieldCounters();

        var order = [];
        for (var si = 0; si < slotIds.length; si++) {
            var sid = slotIds[si];
            var act = actions[sid];
            if (!act.entry || act.fainted) continue;

            // Get speed from entry (includes all item/ability/status/boost modifiers)
            var spd = computeEntrySpeed(act.entry);

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
            if (a.speed !== b.speed) return tr ? a.speed - b.speed : b.speed - a.speed;
            // Speed tie: use stored tiebreaker (set by click handler via showSpeedTieModal)
            if (window._rsaDoubleTiebreakers) {
                var keyAB = a.slot + ',' + b.slot;
                var keyBA = b.slot + ',' + a.slot;
                if (window._rsaDoubleTiebreakers[keyAB] === a.slot) return -1;
                if (window._rsaDoubleTiebreakers[keyAB] === b.slot) return 1;
                if (window._rsaDoubleTiebreakers[keyBA] === b.slot) return -1;
                if (window._rsaDoubleTiebreakers[keyBA] === a.slot) return 1;
            }
            return 0; // preserve insertion order (stable)
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
        // Track protected mons — set when a mon uses Protect/Spiky Shield/etc.
        var protected_ = {}; // { [slot]: 'protect' | 'spikyshield' | 'kingsshield' | 'banefulbunker' | 'obstruct' | 'silktrap' | 'craftyshield' }

        // Protect-type move detection
        var PROTECT_VOLATILE = {
            protect: 'protect', detect: 'protect', kingsshield: 'kingsshield',
            spikyshield: 'spikyshield', banefulbunker: 'banefulbunker',
            obstruct: 'obstruct', silktrap: 'silktrap'
        };
        function isProtectMove(md) {
            if (!md) return false;
            if (md.stallingMove && md.target === 'self') return true;
            var vs = md.volatileStatus ? md.volatileStatus.toLowerCase().replace(/[\s\-]+/g, '') : '';
            return !!(PROTECT_VOLATILE[vs]);
        }
        function getProtectType(md) {
            if (!md) return null;
            var vs = md.volatileStatus ? md.volatileStatus.toLowerCase().replace(/[\s\-]+/g, '') : '';
            return PROTECT_VOLATILE[vs] || (md.stallingMove && md.target === 'self' ? 'protect' : null);
        }

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

            // Protect-type move: mark this mon as protected, no damage dealt
            if (isProtectMove(moveData)) {
                protected_[sid] = getProtectType(moveData);
                roundActions.push({
                    slot: sid, name: act.entry.name, move: act.moveName,
                    moveData: moveData, targets: [], extras: [],
                    speed: order[oi].speed, priority: order[oi].priority,
                    flinched: false, protected: true
                });
                continue;
            }

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
            var isContact = !!(moveData && (moveData.makesContact || (moveData.flags && moveData.flags.contact)));
            for (var ti = 0; ti < targets.length; ti++) {
                var tgt = targets[ti];
                var defEntry = fighters[tgt];
                if (!defEntry || defEntry.currentHP <= 0) continue;

                // Telepathy: skip damage from ally's spread move
                var isSameTeam = sid.substring(0, 2) === tgt.substring(0, 2);
                if (isSameTeam && defEntry.ability === 'Telepathy') {
                    dmgResults.push({
                        target: tgt, targetName: defEntry.name,
                        minDmg: 0, maxDmg: 0, applied: 0, sashed: false, ko: false, blocked: 'telepathy'
                    });
                    continue;
                }

                // Protect check: skip damage if target is protected
                if (protected_[tgt]) {
                    var protType = protected_[tgt];
                    var protResult = { target: tgt, targetName: defEntry.name,
                        minDmg: 0, maxDmg: 0, applied: 0, sashed: false, ko: false, blocked: 'protect' };
                    // Spiky Shield: deal 1/8 max HP to contact attacker
                    if (protType === 'spikyshield' && isContact && act.entry.currentHP > 0) {
                        var spikeDmg = Math.max(1, Math.floor(act.entry.maxHP / 8));
                        act.entry.currentHP = Math.max(0, act.entry.currentHP - spikeDmg);
                        if (act.entry.bestCaseHP != null) act.entry.bestCaseHP = Math.max(0, act.entry.bestCaseHP - spikeDmg);
                        protResult.spikyRecoil = spikeDmg;
                    }
                    // Baneful Bunker: poison contact attacker
                    if (protType === 'banefulbunker' && isContact && !act.entry.status) {
                        act.entry.status = 'Poison';
                        protResult.bunkerPoison = true;
                    }
                    // King's Shield: -2 Atk on contact attacker (tracked as note, no stat model here)
                    dmgResults.push(protResult);
                    continue;
                }

                var dmg = calcDamageDirect(act.entry, defEntry, act.moveName);
                if (!dmg) continue;

                // Apply damage (worst case = max damage)
                var applied = Math.min(defEntry.currentHP, dmg.maxDmg);
                // Best case = min damage
                var appliedMin = Math.min(defEntry.bestCaseHP != null ? defEntry.bestCaseHP : defEntry.currentHP, dmg.minDmg);

                // Survival checks (Focus Sash, Sturdy — respects Mold Breaker)
                var sashed = false;
                var sturdied = false;
                var hpAfterHit = Math.max(0, defEntry.currentHP - applied);
                var survCheck = applySurvivalChecks(defEntry, hpAfterHit, defEntry.currentHP, defEntry.maxHP, act.entry.ability);
                if (survCheck.survived) {
                    defEntry.currentHP = 1;
                    if (defEntry.bestCaseHP != null) defEntry.bestCaseHP = 1;
                    sashed = survCheck.sashed;
                    sturdied = survCheck.sturdied;
                    if (sashed) defEntry.item = '';
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
                    sturdied: sturdied,
                    ko: defEntry.currentHP <= 0
                });
            }

            // Apply recoil/Life Orb/contact damage per target
            var actionExtras = [];
            // Find the first result that actually dealt damage (not blocked/protected/telepathy)
            var firstRealDmg = null;
            for (var di = 0; di < dmgResults.length; di++) {
                if (!dmgResults[di].blocked) { firstRealDmg = dmgResults[di]; break; }
            }
            if (firstRealDmg && act.entry.currentHP > 0) {
                var firstDmg = firstRealDmg;
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
                // (isContact already computed above for protect checks)
                if (moveData) {
                    isContact = !!(moveData.makesContact || (moveData.flags && moveData.flags.contact));
                }
                if (isContact && act.entry.ability !== 'Magic Guard') {
                    for (var di = 0; di < dmgResults.length; di++) {
                        if (dmgResults[di].blocked) continue; // no contact damage through protect/telepathy
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
                        var hitAe = hitEntry ? getAbilityEffects(hitEntry.ability) : null;
                        var flinchBlocked = hitAe ? (!!hitAe.flinchImmunity || !!hitAe.secondaryImmunity)
                            : (hitEntry && (hitEntry.ability === 'Inner Focus' || hitEntry.ability === 'Shield Dust'));
                        if (hitEntry && !flinchBlocked) {
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

            // Selfdestruct moves (Explosion, Self-Destruct) KO the user
            if (moveData && moveData.selfdestruct && dmgResults.length > 0) {
                // Only KO if at least one target was actually hit (not all protected)
                var hitAny = false;
                for (var di = 0; di < dmgResults.length; di++) {
                    if (!dmgResults[di].blocked) { hitAny = true; break; }
                }
                if (hitAny) {
                    act.entry.currentHP = 0;
                    if (act.entry.bestCaseHP != null) act.entry.bestCaseHP = 0;
                }
            }

            // Trick Room: detect and set counter on the line
            if (moveData && moveData.pseudoWeather === 'trickroom') {
                var fld = curLine().fieldState;
                if (fld.trickRoomTurns > 0) {
                    // Second TR cancels the first
                    fld.trickRoomTurns = 0;
                    $('#trickroom').prop('checked', false).trigger('change');
                } else {
                    fld.trickRoomTurns = 5;
                    $('#trickroom').prop('checked', true).trigger('change');
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
        var _activeBranchObjD = (line.branches && line.activeBranchIdx >= 0) ? line.branches[line.activeBranchIdx] : null;
        var rd = {
            roundNum: _activeBranchObjD
                ? (_activeBranchObjD.forkRoundIdx + _activeBranchObjD.rounds.length + 1)
                : ++line.roundCounter,
            isDoubles: true,
            weather: weather,
            terrain: getTerrain(),
            trickRoom: tr,
            comment: comment || '',
            order: order,
            actions: roundActions,
            fighters: {},
            eot: eotAll,
            hazards: {
                p1: $.extend({}, getFieldHazards('p1')),
                p2: $.extend({}, getFieldHazards('p2'))
            }
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
        // Store trick room turns remaining in round data for display
        rd.trickRoomTurns = curLine().fieldState.trickRoomTurns || 0;

        // AI: predict switch-ins for fainted P2 mons (position-based: across the field)
        rd.switchPreds = {};
        if (fighters.p2a && fighters.p2a.currentHP <= 0) {
            // Left P2 fainted — predict using P1 left (same-side reference)
            try {
                var acrossEntry2a = fighters.p1a;
                rd.switchPreds.p2a = acrossEntry2a
                    ? predictSwitchIn(acrossEntry2a.setId, 'p2a')
                    : predictSwitchIn('$p1', 'p2a');
            } catch (e) {}
        }
        if (fighters.p2b && fighters.p2b.currentHP <= 0) {
            // Right P2 fainted — predict using P1 right (same-side reference)
            try {
                var acrossEntry2b = fighters.p1b;
                rd.switchPreds.p2b = acrossEntry2b
                    ? predictSwitchIn(acrossEntry2b.setId, 'p2b')
                    : predictSwitchIn('$p1', 'p2b');
            } catch (e) {}
        }

        // Re-sync first-turn-out so the next doubles round's AI percentages are correct
        setTimeout(syncFirstTurnOut, 50);

        return rd;
    }

    // ════════════════════════════════════════════════════════════
    // DOUBLES — ROUND LOG RENDERING
    // ════════════════════════════════════════════════════════════

    function renderDoublesRoundCard(rd) {
        var tags = '';
        if (rd.weather !== 'None') tags += '<span class="rsa-tag rsa-weather">' + esc(rd.weather) + '</span>';
        if (rd.terrain !== 'None') tags += '<span class="rsa-tag rsa-terrain">' + esc(rd.terrain) + '</span>';
        if (rd.trickRoom) {
            var trTurns = rd.trickRoomTurns > 0 ? ' (' + rd.trickRoomTurns + ' left)' : '';
            tags += '<span class="rsa-tag rsa-trickroom">Trick Room' + trTurns + '</span>';
        }
        // Hazard badges (doubles)
        if (rd.hazards) {
            var dh1 = rd.hazards.p1 || {};
            var dh2 = rd.hazards.p2 || {};
            if (dh1.sr)          tags += '<span class="rsa-tag rsa-hazard-p1" title="Stealth Rock on P1 side">⚑ SR</span>';
            if (dh1.spikes > 0)  tags += '<span class="rsa-tag rsa-hazard-p1" title="Spikes on P1 side">Spikes×' + dh1.spikes + '</span>';
            if (dh1.tspikes > 0) tags += '<span class="rsa-tag rsa-hazard-p1" title="Toxic Spikes on P1 side">T.Spikes×' + dh1.tspikes + '</span>';
            if (dh1.stickyWeb)   tags += '<span class="rsa-tag rsa-hazard-p1" title="Sticky Web on P1 side">⛓ Web</span>';
            if (dh2.sr)          tags += '<span class="rsa-tag rsa-hazard-p2" title="Stealth Rock on P2 side">⚑ SR (P2)</span>';
            if (dh2.spikes > 0)  tags += '<span class="rsa-tag rsa-hazard-p2" title="Spikes on P2 side">Spikes×' + dh2.spikes + ' (P2)</span>';
            if (dh2.tspikes > 0) tags += '<span class="rsa-tag rsa-hazard-p2" title="Toxic Spikes on P2 side">T.Spikes×' + dh2.tspikes + ' (P2)</span>';
            if (dh2.stickyWeb)   tags += '<span class="rsa-tag rsa-hazard-p2" title="Sticky Web on P2 side">⛓ Web (P2)</span>';
        }
        // Hazard change badges (doubles)
        if (rd.hazardChanges) {
            var dhc = rd.hazardChanges;
            for (var dci = 0; dci < (dhc.cleared || []).length; dci++) {
                tags += '<span class="rsa-tag rsa-hazard-cleared" title="Hazards cleared">🧹 ' + esc(dhc.cleared[dci]) + '</span>';
            }
            for (var dsi = 0; dsi < (dhc.set || []).length; dsi++) {
                tags += '<span class="rsa-tag rsa-hazard-set" title="Hazards set">⚠ ' + esc(dhc.set[dsi]) + '</span>';
            }
        }

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
                    '<span class="rsa-hp-text">' + f.hpBefore + ' HP (' + bPct.toFixed(0) + '%)</span>' +
                '</div>' +
            '</div>';

            // Move info
            if (act.protected) {
                var md = act.moveData;
                var typeSprite = md && md.type ? '<img class="rsa-type-sprite" src="' + esc(getTypeSpriteUrl(md.type)) + '" alt="" title="' + esc(md.type) + '">' : '';
                var catSprite = md && md.category ? '<img class="rsa-cat-sprite" src="' + esc(getCategorySpriteUrl(md.category)) + '" alt="" title="' + esc(md.category) + '">' : '';
                actionsHtml += '<div class="rsa-move-line">' +
                    '<div class="rsa-move-name">' + typeSprite + catSprite + ' ' + esc(act.move) + '</div>' +
                    '<span class="rsa-tag rsa-flinch-tag" style="background:#4a5568">PROTECTED</span>' +
                '</div>';
            } else if (act.flinched) {
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
                        var sturdyBadge = t.sturdied ? ' <span class="rsa-tag rsa-sash-tag">Sturdy!</span>' : '';

                        actionsHtml += '<div class="rsa-dbl-target-result">';
                        if (tFighter) {
                            actionsHtml += '<img class="rsa-target-sprite" src="' + esc(tFighter.sprite) + '" alt="">';
                        }
                        actionsHtml += '<span class="rsa-target-arrow">→</span>';
                        actionsHtml += '<span class="rsa-target-name">' + esc(t.targetName) + ' [' + tSlotLabel + ']</span>';

                        if (t.blocked === 'protect') {
                            actionsHtml += ' <span class="rsa-tag rsa-flinch-tag">PROTECTED</span>';
                            if (t.spikyRecoil) actionsHtml += ' <span class="rsa-extra rsa-extra-dmg" style="font-size:0.8em">Spiky Shield: -' + t.spikyRecoil + '</span>';
                            if (t.bunkerPoison) actionsHtml += ' <span class="rsa-tag rsa-status-tag">POISONED</span>';
                        } else if (t.blocked === 'telepathy') {
                            actionsHtml += ' <span class="rsa-tag rsa-ability-tag">TELEPATHY</span>';
                        } else {
                            actionsHtml += '<span class="rsa-dmg-range">' + t.minDmg + '-' + t.maxDmg + ' dmg</span>';
                            actionsHtml += killBadge + sashBadge + sturdyBadge;
                        }
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
                // P2: solid bar at bestHP floor, stripes extend right to hpAfterCur
                var bestPct2 = (hpAfterBest / f.maxHP * 100);
                var uncertPct2 = aPct - bestPct2;
                aCol = hpColor(bestPct2);
                aPct = bestPct2;
                stripedBar = '<div class="rsa-hp-bar rsa-hp-bar-uncertain rsa-hp-bar-uncertain-p2" style="width:' + uncertPct2.toFixed(0) + '%;left:' + bestPct2.toFixed(0) + '%"></div>';
                rangeText = ' <span class="rsa-hp-range">(' + hpAfterBest + '–' + hpAfterCur + ')</span>';
                hpAfterCur = hpAfterBest; // display floor as primary HP value
            }

            hpHtml += '<div class="rsa-dbl-hp-entry">';
            hpHtml += '<img class="rsa-hp-sprite" src="' + esc(f.sprite) + '" alt="">';
            hpHtml += '<div class="rsa-hp-entry-info">';
            hpHtml += '<span class="' + nameCls + '" style="font-size:0.8em;font-weight:600">' + esc(f.name) + ' [' + slotLabel + ']</span>';
            hpHtml += '<div class="rsa-hp-bar-wrap" style="height:6px;position:relative"><div class="rsa-hp-bar" style="width:' + aPct.toFixed(0) + '%;background:' + aCol + '"></div>' + stripedBar + '</div>';
            hpHtml += '<span class="rsa-hp-text" style="font-size:0.7em">' + hpAfterCur + ' HP (' + aPct.toFixed(0) + '%)' + rangeText;
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

    /** Sync the calc form status fields for both active P1 and P2 pokemon. */
    function syncActiveStatusToForm() {
        var line = curLine();
        var p1Entry = getActiveEntry(line.teams.p1);
        var p2Entry = getActiveEntry(line.teams.p2);
        if (p1Entry) syncStatusToForm('p1', p1Entry);
        if (p2Entry) syncStatusToForm('p2', p2Entry);
    }

    /**
     * Full sync of active pokemon state (HP, item, ability, status, boosts) to
     * the calc form for both sides.  Call after any rebuild/round-delete so the
     * calc form and roster never drift apart.
     */
    function syncActiveStateToForm() {
        var line = curLine();
        window.NO_CALC = true;
        var sides = ['p1', 'p2'];
        for (var si = 0; si < sides.length; si++) {
            var side = sides[si];
            var entry = getActiveEntry(line.teams[side]);
            if (!entry) continue;
            // HP
            $('#' + side + ' .current-hp').val(entry.currentHP);
            // Item
            if (entry.item !== undefined) $('#' + side + ' .item').val(entry.item);
            // Ability
            if (entry.ability) $('#' + side + ' .ability').val(entry.ability);
            // Status
            syncStatusToForm(side, entry);
            // Boosts
            if (entry.boosts) {
                var stats = ['at', 'df', 'sa', 'sd', 'sp'];
                for (var sti = 0; sti < stats.length; sti++) {
                    var b = entry.boosts[stats[sti]] || 0;
                    $('#' + side + ' .' + stats[sti] + ' .boost').val(b);
                }
            }
        }
        window.NO_CALC = false;
        try { performCalculations(); } catch (e) {}
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

    /**
     * Toggle P2 crit on a specific round and cascade HP changes.
     * When crit is enabled:  P2's damage to P1 uses critDamage.maxDmg (worst case for P1).
     * When crit is disabled: P2's damage to P1 uses damage.maxDmg.
     * The HP delta is propagated to all subsequent rounds for the same P1 pokemon.
     */
    function toggleP2Crit(roundNum) {
        var line = curLine();
        var rdIdx = -1;
        // Search main rounds first, then active branch rounds
        for (var i = 0; i < line.rounds.length; i++) {
            if (line.rounds[i].roundNum === roundNum) { rdIdx = i; break; }
        }
        if (rdIdx < 0 && line.branches && line.activeBranchIdx >= 0) {
            var _activeBr = line.branches[line.activeBranchIdx];
            if (_activeBr) {
                for (var i = 0; i < _activeBr.rounds.length; i++) {
                    if (_activeBr.rounds[i].roundNum === roundNum) {
                        // Toggle crit directly on the branch round
                        var brd = _activeBr.rounds[i];
                        if (!brd.isDoubles && brd.p2 && brd.p2.damage) {
                            brd.p2Crit = !brd.p2Crit;
                            rebuildBranchTeams(line, line.activeBranchIdx);
                            renderAll();
                            syncActiveStatusToForm();
                            autoSave();
                        }
                        return;
                    }
                }
            }
        }
        if (rdIdx < 0) return;
        var rd = line.rounds[rdIdx];
        if (rd.isDoubles || !rd.p2 || !rd.p2.damage) return; // nothing to toggle

        // If critDamage wasn't stored (old round), try to compute it now from the calc form
        if (!rd.p2.critDamage && rd.p2.moveIdx !== 'none' && rd.p2.moveIdx !== -1) {
            rd.p2.critDamage = getCritResult(1, rd.p2.moveIdx);
        }

        // Toggle the crit flag
        rd.p2Crit = !rd.p2Crit;

        // If crit damage still unavailable, just toggle the label and exit
        if (!rd.p2.critDamage) {
            rebuildLineTeams(line);
            renderAll();
            syncActiveStatusToForm();
            autoSave();
            return;
        }

        // Determine old and new P2 max damage to P1
        // P1 takes P2's max damage (worst case), so:
        //   non-crit: rd.p2.damage.maxDmg
        //   crit:     rd.p2.critDamage.maxDmg
        var normalMax = rd.p2.damage ? rd.p2.damage.maxDmg : 0;
        var critMax   = rd.p2.critDamage ? rd.p2.critDamage.maxDmg : 0;
        var oldDmg = rd.p2Crit ? normalMax : critMax;   // what it was before toggle
        var newDmg = rd.p2Crit ? critMax   : normalMax;  // what it is now

        var delta = newDmg - oldDmg;  // positive = more damage to P1

        // Apply delta to this round's P1 HP
        if (delta !== 0) {
            var p1Name = rd.p1.name;
            // Check if P2 was alive to attack (P2 hp > 0 after P1's attack)
            var p2Alive = rd.p2.hpAfter.current > 0 || rd.p2.sashed || rd.p2.sturdied;
            // If P1 goes first and KO'd P2, P2 doesn't attack — delta does not apply
            var p1First = rd.speed.faster === 'p1' || rd.speed.faster === 'tie';
            if (p1First && !p2Alive) delta = 0;

            if (delta !== 0) {
                // Adjust this round's P1 HP
                rd.p1.hpAfter.current = Math.max(0, rd.p1.hpAfter.current - delta);
                // Adjust bestCase too (opposite direction for P1 best case)
                // Best case uses min damage, but for crit toggle the min also changes
                var normalMin = rd.p2.damage ? rd.p2.damage.minDmg : 0;
                var critMin   = rd.p2.critDamage ? rd.p2.critDamage.minDmg : 0;
                var bestDelta = (rd.p2Crit ? critMin : normalMin) - (rd.p2Crit ? normalMin : critMin);
                if (rd.p1.hpAfter.bestCase != null) {
                    rd.p1.hpAfter.bestCase = Math.max(0, rd.p1.hpAfter.bestCase - bestDelta);
                }

                // Cascade delta to subsequent rounds for the same P1 pokemon
                for (var j = rdIdx + 1; j < line.rounds.length; j++) {
                    var next = line.rounds[j];
                    if (next.isDoubles) continue;
                    if (next.p1.name !== p1Name) break; // different mon, stop cascade
                    // Shift HP before and after
                    next.p1.hpBefore.current = Math.max(0, next.p1.hpBefore.current - delta);
                    next.p1.hpAfter.current  = Math.max(0, next.p1.hpAfter.current - delta);
                    if (next.p1.hpBefore.bestCase != null) {
                        next.p1.hpBefore.bestCase = Math.max(0, next.p1.hpBefore.bestCase - bestDelta);
                    }
                    if (next.p1.hpAfter.bestCase != null) {
                        next.p1.hpAfter.bestCase = Math.max(0, next.p1.hpAfter.bestCase - bestDelta);
                    }
                }
            }
        }

        // Rebuild team state from the modified rounds
        rebuildLineTeams(line);
        renderAll();
        syncActiveStatusToForm();
        autoSave();
    }

    function rebuildLineTeams(line) {
        // For P1 entries not involved in any logged round (pre-first-round or after
        // round deletion), preserve their serialized currentHP so user-set pre-damage
        // survives the reset+replay cycle.
        // Critically: do NOT read HP from the calc form here — the calc persists its
        // own form state independently and may still show stale HP from a deleted round
        // even though RSA's localStorage already has the correct value.
        var _preDamageHP = {};
        var _p1Roster = line.teams.p1.roster;
        for (var _pi = 0; _pi < _p1Roster.length; _pi++) {
            var _pe = _p1Roster[_pi];
            var _inAnyRound = line.rounds.some(function (rd) {
                if (rd.isDoubles && rd.fighters) {
                    for (var _s in rd.fighters) {
                        if (rd.fighters[_s] && rd.fighters[_s].name === _pe.name) return true;
                    }
                    return false;
                }
                return rd.p1 && rd.p1.name === _pe.name;
            });
            // Only preserve HP if the user explicitly set it as pre-damage
            // (preDamageHP is set by the HP-edit handler and cleared when a
            // round is captured).  Never restore stale post-round HP.
            if (!_inAnyRound && _pe.preDamageHP !== undefined && _pe.preDamageHP < _pe.maxHP) {
                _preDamageHP[_pe.name] = { current: _pe.preDamageHP, best: _pe.preDamageHP };
            }
        }

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
        // Rebuild hazard state by replaying each round's moves
        if (line.fieldState && line.fieldState.hazards) {
            line.fieldState.hazards = {
                p1: { sr: false, spikes: 0, tspikes: 0, stickyWeb: false },
                p2: { sr: false, spikes: 0, tspikes: 0, stickyWeb: false }
            };
        }
        for (var i = 0; i < line.rounds.length; i++) {
            var rd = line.rounds[i];
            if (rd.isDoubles && rd.actions) {
                for (var a = 0; a < rd.actions.length; a++) {
                    var act = rd.actions[a];
                    var actSide = (act.slot || '').substring(0, 2);
                    if (actSide === 'p1') applyHazardMoves(act.move, null);
                    else if (actSide === 'p2') applyHazardMoves(null, act.move);
                }
            } else {
                applyHazardMoves(rd.p1 && rd.p1.move, rd.p2 && rd.p2.move);
            }
        }
        // Restore pre-damage HP for P1 entries not involved in any round
        for (var _ri = 0; _ri < _p1Roster.length; _ri++) {
            var _re = _p1Roster[_ri];
            if (_preDamageHP[_re.name]) {
                _re.currentHP  = _preDamageHP[_re.name].current;
                _re.bestCaseHP = _preDamageHP[_re.name].best;
            }
        }

        // Sync the updated HP and item to calc form
        window.NO_CALC = true;
        var p1Active = getActiveEntry(line.teams.p1);
        var p2Active = getActiveEntry(line.teams.p2);
        if (p1Active) {
            $('#p1 .current-hp').val(p1Active.currentHP);
            $('#p1 .item').val(p1Active.item || '');
        }
        if (p2Active) {
            $('#p2 .current-hp').val(p2Active.currentHP);
            $('#p2 .item').val(p2Active.item || '');
        }
        window.NO_CALC = false;
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
    /** Build a compact status <select> for a P1 roster slot */
    function renderStatusSelect(side, idx, currentStatus) {
        var statuses = ['', 'Burn', 'Paralysis', 'Poison', 'Badly Poisoned', 'Sleep', 'Freeze'];
        var html = '<select class="rsa-status-select" data-side="' + side + '" data-idx="' + idx + '" title="Set status">';
        for (var s = 0; s < statuses.length; s++) {
            var sel = statuses[s] === currentStatus ? ' selected' : '';
            html += '<option value="' + esc(statuses[s]) + '"' + sel + '>' + (statuses[s] || '— Status —') + '</option>';
        }
        html += '</select>';
        return html;
    }

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
                    var hpEditHtml = side === 'p1'
                        ? '<div class="rsa-team-hp-text" style="font-size:0.7em"><input type="number" class="rsa-hp-edit" data-side="p1" data-idx="' + s.idx + '" value="' + e.currentHP + '" min="0" max="' + e.maxHP + '" title="Edit HP before round" /><span class="rsa-hp-max"> HP (' + hpPct(e.currentHP, e.maxHP).toFixed(0) + '%)</span></div>' +
                          renderStatusSelect('p1', s.idx, e.status)
                        : '<div class="rsa-team-hp-text" style="font-size:0.7em">' + e.currentHP + ' HP (' + hpPct(e.currentHP, e.maxHP).toFixed(0) + '%)</div>' +
                          (e.status ? '<span class="rsa-status-badge rsa-status-' + e.status.toLowerCase().replace(/\s+/g, '-') + '" style="font-size:0.65em">' + esc(e.status) + '</span>' : '');
                    activeHtml += '<div class="rsa-active-slot ' + s.cls + faintCls + '" data-side="' + side + '" data-idx="' + s.idx + '">' +
                        '<div class="rsa-field-label">' + s.label + '</div>' +
                        '<img class="rsa-team-sprite" src="' + esc(e.sprite) + '" alt="' + esc(e.name) + '">' +
                        '<div class="rsa-team-name">' + esc(e.name) + '</div>' +
                        '<div class="rsa-team-hp-bar"><div class="rsa-team-hp-fill" style="width:' + pct.toFixed(0) + '%;background:' + col + '"></div></div>' +
                        hpEditHtml +
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
            var solidFillPct = pct;
            var solidFillCol = col;

            if (side === 'p1' && bestHP > e.currentHP) {
                // P1: bestCase > currentHP — solid bar at currentHP, stripes extend right into gray
                var uncertaintyPct = e.maxHP > 0 ? ((bestHP - e.currentHP) / e.maxHP * 100) : 0;
                teamUncertainBar = '<div class="rsa-team-hp-uncertain" style="width:' +
                    Math.min(100, uncertaintyPct).toFixed(1) + '%;left:' + pct.toFixed(1) + '%"></div>';
                teamRangeText = '<span class="rsa-team-hp-range">(' + e.currentHP + '–' + bestHP + ')</span>';
            } else if (side === 'p2' && bestHP < e.currentHP) {
                // P2: solid bar at bestHP (guaranteed min HP floor), stripes extend right to currentHP
                var bestPct = e.maxHP > 0 ? (bestHP / e.maxHP * 100) : 0;
                var uncertaintyPct = pct - bestPct;
                solidFillPct = bestPct;
                solidFillCol = hpColor(bestPct);
                teamUncertainBar = '<div class="rsa-team-hp-uncertain rsa-hp-bar-uncertain-p2" style="width:' +
                    Math.min(100, uncertaintyPct).toFixed(1) + '%;left:' + bestPct.toFixed(1) + '%"></div>';
                teamRangeText = '<span class="rsa-team-hp-range">(' + bestHP + '–' + e.currentHP + ')</span>';
            }

            // Speed stat lookup (apply item/ability/status/weather/boost modifiers for accurate display)
            var speedText = '';
            try {
                var tmpPoke = createPokemon(e.setId);
                if (tmpPoke && tmpPoke.stats && tmpPoke.stats.spe) {
                    var dispSpd = calcEffectiveSpeed(e, tmpPoke.stats.spe);
                    speedText = '<span class="rsa-team-speed" title="Speed: ' + dispSpd + '">⚡' + dispSpd + '</span>';
                }
            } catch (ex) {}

            // Item row: dropdown for P1, static badge for P2
            var itemHtml = (side === 'p1')
                ? '<select class="rsa-item-select" data-side="' + side + '" data-idx="' + i + '">' + getItemOptionsHtml() + '</select>'
                : (e.item ? '<span class="rsa-item-badge" title="' + esc(getItemDesc(e.item)) + '"><img class="rsa-item-sprite" src="' + esc(getItemSpriteUrl(e.item)) + '" alt="" onerror="this.style.display=\'none\'"> ' + esc(e.item) + '</span>' : '');

            var dragAttr = isDoubles() ? ' draggable="true"' : '';
            html += '<div class="rsa-team-slot rsa-team-slot-' + side + active + fainted + statusCls + ccClass + '"' + dragAttr + ' data-side="' + side + '" data-idx="' + i + '">' +
                '<button class="rsa-info-btn" data-side="' + side + '" data-idx="' + i + '" title="Show details">ⓘ</button>' +
                '<div class="rsa-sprite-col">' +
                    '<img class="rsa-team-sprite" src="' + esc(e.sprite) + '" alt="' + esc(e.name) + '">' +
                    speedText +
                '</div>' +
                '<div class="rsa-team-info">' +
                    '<div class="rsa-team-name">' + esc(e.name) + '</div>' +
                    '<div class="rsa-team-hp-bar"><div class="rsa-team-hp-fill" style="width:' + solidFillPct.toFixed(0) + '%;background:' + solidFillCol + '"></div>' + teamUncertainBar + '</div>' +
                    (side === 'p1'
                        ? '<div class="rsa-team-hp-text"><input type="number" class="rsa-hp-edit" data-side="p1" data-idx="' + i + '" value="' + e.currentHP + '" min="0" max="' + e.maxHP + '" title="Edit HP before round" /><span class="rsa-hp-max"> HP (' + pct.toFixed(0) + '%)' + (bestHP !== e.currentHP ? ' <span class="rsa-team-hp-range">(' + (side === 'p1' ? e.currentHP + '\u2013' + bestHP : bestHP + '\u2013' + e.currentHP) + ')</span>' : '') + '</span></div>' +
                           renderStatusSelect('p1', i, e.status)
                        : '<div class="rsa-team-hp-text">' + (bestHP !== e.currentHP
                            ? (side === 'p2' ? bestHP + '\u2013' + e.currentHP : e.currentHP + '\u2013' + bestHP) + ' HP (' + pct.toFixed(0) + '%) ' + teamRangeText
                            : e.currentHP + ' HP (' + pct.toFixed(0) + '%)'
                          ) + '</div>' +
                           (e.status ? '<span class="rsa-status-badge rsa-status-' + e.status.toLowerCase().replace(/\s+/g, '-') + '">' + esc(e.status) + '</span>' : '')) +
                    (e.ability ? '<span class="rsa-ability-badge" title="' + esc(getAbilityDesc(e.ability)) + '">' + esc(e.ability) + '</span>' : '') +
                    itemHtml +
                    renderTagBadges(computeEntryTags(e)) +
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

        // Get predicted move distribution for the winner
        var movesHtml = '';
        try {
            var line = curLine();
            var p2Entry = (pred.partyIdx != null) ? line.teams.p2.roster[pred.partyIdx] : null;
            var p1Entry = getActiveEntry(line.teams.p1);
            if (p2Entry && p1Entry) {
                var moveRates = calcP2MoveRates(p2Entry, p1Entry);
                if (moveRates.rates && moveRates.rates.length) {
                    var moveParts = [];
                    for (var mi = 0; mi < moveRates.rates.length; mi++) {
                        var mr = moveRates.rates[mi];
                        if (mr.rate > 0) {
                            moveParts.push('<span class="rsa-swpred-move" title="' + esc(mr.move) + '">' +
                                esc(mr.move) + ' <small>' + Math.round(mr.rate * 100) + '%</small></span>');
                        }
                    }
                    if (moveParts.length) {
                        movesHtml = '<div class="rsa-swpred-moves">Moves: ' + moveParts.join(', ') + '</div>';
                    }
                }
            }
        } catch (e) {}

        $el.html(
            '<div class="rsa-swpred-bar">' +
                '<span class="rsa-swpred-label">🔮 AI sends:</span>' +
                '<img class="rsa-swpred-sprite" src="' + esc(pred.sprite) + '" alt="">' +
                '<span class="rsa-swpred-name">' + esc(pred.name) + '</span>' +
                '<span class="rsa-swpred-detail">(' + (pred.score > 0 ? '+' : '') + pred.score + ' — ' + esc(pred.reason) + ')</span>' +
            '</div>' +
            movesHtml +
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
        var hasBranches = line.branches && line.branches.length > 0;

        if (line.rounds.length === 0 && !hasBranches) {
            $log.html('<div class="rsa-empty">No rounds yet. Set your teams, load the calc, and log rounds.</div>');
            return;
        }

        if (!hasBranches) {
            // Single column (original behavior)
            var html = '';
            for (var i = 0; i < line.rounds.length; i++) {
                var rd = line.rounds[i];
                html += rd.isDoubles ? renderDoublesRoundCard(rd) : renderRoundCard(rd, -1);
            }
            if (!isDoubles()) html += renderInlineControls();
            $log.html(html);
            $('#rsa-round-count').text(line.rounds.length);
            syncInlineControls();
            return;
        }

        // ── Multi-column branch layout ───────────────────────────
        var cols = getVisibleColumns(line);
        var maxVisible = 3;
        var visibleCols = cols.slice(0, maxVisible);
        var hiddenCols = cols.slice(maxVisible);

        var html = '<div class="rsa-branch-bar">';
        for (var ci = 0; ci < cols.length; ci++) {
            var col = cols[ci];
            var active = col.idx === line.activeBranchIdx ? ' rsa-branch-tab-active' : '';
            var hidden = ci >= maxVisible ? ' rsa-branch-tab-hidden' : '';
            var tabClose = col.idx >= 0
                ? ' <span class="rsa-branch-tab-delete" data-branch-idx="' + col.idx + '" title="Delete branch">&times;</span>'
                : '';
            html += '<button class="rsa-branch-tab' + active + hidden + '" data-branch-idx="' + col.idx + '">' +
                esc(col.name) + ' <small>(' + col.rounds.length + ')</small>' + tabClose + '</button>';
        }
        html += '</div>';

        html += '<div class="rsa-branch-columns" style="--branch-count:' + Math.min(cols.length, maxVisible) + '">';

        for (var ci = 0; ci < visibleCols.length; ci++) {
            var col = visibleCols[ci];
            var isActive = col.idx === line.activeBranchIdx;
            var colClass = 'rsa-branch-col' + (isActive ? ' rsa-branch-col-active' : '');
            html += '<div class="' + colClass + '" data-branch-idx="' + col.idx + '">';
            html += '<div class="rsa-branch-col-header">' +
                '<span class="rsa-branch-col-title">' + esc(col.name) + '</span>' +
                (col.idx >= 0 ? '<button class="rsa-branch-delete" data-branch-idx="' + col.idx + '" title="Delete branch">×</button>' : '') +
            '</div>';

            // Rebuild teams for this branch to get correct HP state
            rebuildBranchTeams(line, col.idx);

            for (var ri = 0; ri < col.rounds.length; ri++) {
                var rd = col.rounds[ri];
                var inherited = (col.idx >= 0 && ri < col.forkRoundIdx);
                // Fork separator between last inherited round and first own round
                if (col.idx >= 0 && col.forkRoundIdx > 0 && ri === col.forkRoundIdx) {
                    html += '<div class="rsa-fork-separator"><span>⑂ Branch diverges here</span></div>';
                }
                var cardHtml = rd.isDoubles ? renderDoublesRoundCard(rd) : renderRoundCard(rd, col.idx);
                if (inherited) {
                    cardHtml = '<div class="rsa-inherited-round">' + cardHtml + '</div>';
                }
                html += cardHtml;
            }
            // Fork separator when branch has no own rounds yet (only inherited)
            if (col.idx >= 0 && col.forkRoundIdx > 0 && col.forkRoundIdx >= col.rounds.length) {
                html += '<div class="rsa-fork-separator"><span>⑂ Branch diverges here</span></div>';
            }

            // Inline controls for this column (only for active branch)
            if (isActive && !isDoubles()) {
                html += renderInlineControls();
            }

            html += '</div>'; // .rsa-branch-col
        }

        html += '</div>'; // .rsa-branch-columns

        // Rebuild teams for the active branch so team panel shows correct state
        rebuildBranchTeams(line, line.activeBranchIdx);

        $log.html(html);
        var activeRounds = getBranchRounds(line, line.activeBranchIdx);
        $('#rsa-round-count').text(activeRounds.length);
        syncInlineControls();
    }

    /** Render inline quick-controls at the bottom of the round log */
    function renderInlineControls() {
        var line = curLine();
        var p1 = getActiveEntry(line.teams.p1);
        var p2 = getActiveEntry(line.teams.p2);
        if (!p1 || p1.currentHP <= 0) return '';

        // ── P2 KO panel: P2 is fainted, pick who comes in ────────────
        if (!p2 || p2.currentHP <= 0) {
            // Check if any P2 pokemon are still alive
            var p2HasAlive = false;
            for (var si = 0; si < line.teams.p2.roster.length; si++) {
                if (line.teams.p2.roster[si].currentHP > 0) { p2HasAlive = true; break; }
            }

            // No more P2 pokemon — battle is over
            if (!p2HasAlive) {
                return '<div class="rsa-inline-controls rsa-inline-battle-ended">' +
                    '<div class="rsa-inline-header rsa-battle-ended-header">🏆 Battle Ended — User team wins!</div>' +
                '</div>';
            }

            // Predict who P2 sends in
            var pred = null;
            try { pred = predictSwitchIn('$p1'); } catch (e) {}

            // Build P2 roster options (available mons)
            var p2SendOpts = '<option value="">— P2 sends... —</option>';
            for (var si = 0; si < line.teams.p2.roster.length; si++) {
                var se = line.teams.p2.roster[si];
                if (se.currentHP <= 0) continue;
                var sel = (pred && pred.name === se.name) ? ' selected' : '';
                p2SendOpts += '<option value="' + si + '"' + sel + '>' + esc(se.name) +
                    ' (' + se.currentHP + '/' + se.maxHP + ')</option>';
            }

            // Build P1 move options
            var p1MoveOpts = '<option value="none">— P1 Move —</option>';
            for (var m = 0; m < 4; m++) {
                var ml = getMoveNames(0, m);
                if (ml && ml !== '—' && ml !== '(No Move)') {
                    var sel = (selectedP1Move === m) ? ' selected' : '';
                    p1MoveOpts += '<option value="' + m + '"' + sel + '>' + esc(ml) + '</option>';
                }
            }

            var predHtml = '';
            if (pred) {
                var predMovesHtml = '';
                try {
                    var p2PredEntry = (pred.partyIdx != null) ? line.teams.p2.roster[pred.partyIdx] : null;
                    if (p2PredEntry && p1) {
                        var predMoveRates = calcP2MoveRates(p2PredEntry, p1);
                        if (predMoveRates.rates && predMoveRates.rates.length) {
                            var predMoveParts = [];
                            for (var pmi = 0; pmi < predMoveRates.rates.length; pmi++) {
                                var pmr = predMoveRates.rates[pmi];
                                if (pmr.rate > 0) {
                                    predMoveParts.push(esc(pmr.move) + ' <small>' + Math.round(pmr.rate * 100) + '%</small>');
                                }
                            }
                            if (predMoveParts.length) predMovesHtml = '<div class="rsa-swpred-moves" style="font-size:0.8em">' + predMoveParts.join(', ') + '</div>';
                        }
                    }
                } catch (e) {}
                predHtml = '<div class="rsa-inline-pred">' +
                    '<img class="rsa-inline-sprite" src="' + esc(pred.sprite) + '" alt="">' +
                    '<span class="rsa-swpred-label">🔮 ' + esc(pred.name) + '</span>' +
                    predMovesHtml +
                '</div>';
            }

            var p1Sprite = p1.sprite ? '<img class="rsa-inline-sprite" src="' + esc(p1.sprite) + '" alt="">' : '';

            return '<div class="rsa-inline-controls rsa-inline-p2ko">' +
                '<div class="rsa-inline-header">⟳ P2 Fainted — Select who comes in</div>' +
                '<div class="rsa-inline-row">' +
                    predHtml +
                    '<select class="rsa-inline-p2-send">' + p2SendOpts + '</select>' +
                    '<button class="rsa-btn rsa-btn-primary rsa-inline-p2-confirm">Confirm →</button>' +
                '</div>' +
            '</div>';
        }

        // ── Normal panel: both mons alive ────────────────────────────
        var p1Sprite = p1.sprite ? '<img class="rsa-inline-sprite" src="' + esc(p1.sprite) + '" alt="">' : '';
        var p2Sprite = p2.sprite ? '<img class="rsa-inline-sprite" src="' + esc(p2.sprite) + '" alt="">' : '';

        // Build P1 move options with min damage %
        // Prefer roster moves (always match the current branch's active mon) over form moves
        var p1MoveOpts = '';
        for (var m = 0; m < 4; m++) {
            var rosterLabel1 = p1.moves && p1.moves[m];
            var formLabel1 = getMoveNames(0, m);
            var label = (rosterLabel1 && rosterLabel1 !== '—' && rosterLabel1 !== '(No Move)') ? rosterLabel1 : formLabel1;
            if (label && label !== '—' && label !== '(No Move)') {
                var sel = (selectedP1Move === m) ? ' selected' : '';
                var dmgTag = '';
                var info = getDamageInfo(0, m);
                if (info && p2.maxHP > 0) {
                    dmgTag = ' (' + Math.floor(info.minDmg / p2.maxHP * 100) + '%)';
                }
                p1MoveOpts += '<option value="' + m + '"' + sel + '>' + esc(label) + dmgTag + '</option>';
            }
        }

        // Build P2 move options with max damage % and AI probability
        var p2MoveOpts = '';
        for (var m = 0; m < 4; m++) {
            var rosterLabel2 = p2.moves && p2.moves[m];
            var formLabel2 = getMoveNames(1, m);
            var label = (rosterLabel2 && rosterLabel2 !== '—' && rosterLabel2 !== '(No Move)') ? rosterLabel2 : formLabel2;
            if (label && label !== '—' && label !== '(No Move)') {
                var sel = (selectedP2Move === m) ? ' selected' : '';
                var dmgTag = '';
                var info = getDamageInfo(1, m);
                if (info && p1.maxHP > 0) {
                    dmgTag = ' (' + Math.floor(info.maxDmg / p1.maxHP * 100) + '%)';
                }
                var aiPct = $('#resultMoveRateR' + (m + 1)).text() || '';
                if (aiPct) dmgTag += ' ' + aiPct;
                p2MoveOpts += '<option value="' + m + '"' + sel + '>' + esc(label) + dmgTag + '</option>';
            }
        }

        // Build P1 switch options
        var switchOpts = '<option value="">— Switch P1 —</option>';
        for (var si = 0; si < line.teams.p1.roster.length; si++) {
            var se = line.teams.p1.roster[si];
            if (si === line.teams.p1.activeIdx) continue;
            if (se.currentHP <= 0) continue;
            switchOpts += '<option value="' + si + '">' + esc(se.name) + ' (' + se.currentHP + '/' + se.maxHP + ')</option>';
        }

        return '<div class="rsa-inline-controls">' +
            '<div class="rsa-inline-header">Next Round</div>' +
            '<div class="rsa-inline-row">' +
                p1Sprite +
                '<span class="rsa-inline-name">' + esc(p1.name) + '</span>' +
                '<select class="rsa-inline-p1-move" title="P1 Move">' +
                    '<option value="none">— P1 Move —</option>' +
                    p1MoveOpts +
                '</select>' +
            '</div>' +
            '<div class="rsa-inline-row">' +
                p2Sprite +
                '<span class="rsa-inline-name">' + esc(p2.name) + '</span>' +
                '<select class="rsa-inline-p2-move" title="P2 Move">' +
                    '<option value="none">— P2 Move —</option>' +
                    p2MoveOpts +
                '</select>' +
            '</div>' +
            '<div class="rsa-inline-row">' +
                '<label class="rsa-inline-check"><input type="checkbox" class="rsa-inline-p2-crit" /> P2 Crit</label>' +
                '<label class="rsa-inline-check"><input type="checkbox" class="rsa-inline-p1-eff" /> P1 Eff</label>' +
                '<label class="rsa-inline-check"><input type="checkbox" class="rsa-inline-p2-eff" checked /> P2 Eff</label>' +
            '</div>' +
            '<div class="rsa-inline-row">' +
                '<input type="text" class="rsa-inline-comment" placeholder="Comment..." />' +
            '</div>' +
            '<div class="rsa-inline-row">' +
                '<button class="rsa-btn rsa-btn-primary rsa-inline-log">▶ Log Round</button>' +
                '<select class="rsa-inline-switch" title="Switch P1">' + switchOpts + '</select>' +
                '<button class="rsa-btn rsa-btn-switch rsa-inline-do-switch">⇄ Switch</button>' +
            '</div>' +
        '</div>';
    }

    /** Sync inline control values to/from main controls */
    function syncInlineControls() {
        // Sync P1 move selection
        var $inlineP1 = $('.rsa-inline-p1-move');
        if ($inlineP1.length && selectedP1Move !== 'none') {
            $inlineP1.val(selectedP1Move);
        }
        // Sync P2 move selection
        var $inlineP2 = $('.rsa-inline-p2-move');
        if ($inlineP2.length && selectedP2Move !== 'none') {
            $inlineP2.val(selectedP2Move);
        }
    }

    function renderRoundCard(rd, branchIdx) {
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
        if (rd.p1Charging)          tags += '<span class="rsa-tag rsa-charge-tag" title="P1 is charging — no damage dealt this turn">P1 ⬆ Charging</span>';
        if (rd.p2Charging)          tags += '<span class="rsa-tag rsa-charge-tag" title="P2 is charging — no damage dealt this turn">P2 ⬆ Charging</span>';
        if (rd.p1StrikeTurn)        tags += '<span class="rsa-tag rsa-strike-tag" title="P1 executes the two-turn move">P1 ⬇ Strikes</span>';
        if (rd.p2StrikeTurn)        tags += '<span class="rsa-tag rsa-strike-tag" title="P2 executes the two-turn move">P2 ⬇ Strikes</span>';
        if (rd.p1SemiInvuln && !rd.p1Charging) {
            var invLabel1 = rd.p1InvulnType ? (INVULN_LABEL[rd.p1InvulnType] || rd.p1InvulnType) : 'Invulnerable';
            tags += '<span class="rsa-tag rsa-invuln-tag" title="P2 is semi-invulnerable — P1\'s attack misses">P2 🛡 ' + invLabel1 + '</span>';
        }
        if (rd.p2SemiInvuln && !rd.p2Charging) {
            var invLabel2 = rd.p2InvulnType ? (INVULN_LABEL[rd.p2InvulnType] || rd.p2InvulnType) : 'Invulnerable';
            tags += '<span class="rsa-tag rsa-invuln-tag" title="P1 is semi-invulnerable — P2\'s attack misses">P1 🛡 ' + invLabel2 + '</span>';
        }
        if (rd.p1PreDmg)            tags += '<span class="rsa-tag rsa-predmg-tag">P1 Pre-Dmg: -' + rd.p1PreDmg + '</span>';
        if (rd.p1PreStatus)         tags += '<span class="rsa-tag rsa-prestatus-tag">P1 Pre: ' + esc(rd.p1PreStatus) + '</span>';
        // Hazard state badges (active at time of round)
        if (rd.hazards) {
            var h1 = rd.hazards.p1 || {};
            var h2 = rd.hazards.p2 || {};
            if (h1.sr)           tags += '<span class="rsa-tag rsa-hazard-p1" title="Stealth Rock on P1 side">⚑ SR</span>';
            if (h1.spikes > 0)   tags += '<span class="rsa-tag rsa-hazard-p1" title="Spikes on P1 side">Spikes×' + h1.spikes + '</span>';
            if (h1.tspikes > 0)  tags += '<span class="rsa-tag rsa-hazard-p1" title="Toxic Spikes on P1 side">T.Spikes×' + h1.tspikes + '</span>';
            if (h1.stickyWeb)    tags += '<span class="rsa-tag rsa-hazard-p1" title="Sticky Web on P1 side">⛓ Web</span>';
            if (h2.sr)           tags += '<span class="rsa-tag rsa-hazard-p2" title="Stealth Rock on P2 side">⚑ SR (P2)</span>';
            if (h2.spikes > 0)   tags += '<span class="rsa-tag rsa-hazard-p2" title="Spikes on P2 side">Spikes×' + h2.spikes + ' (P2)</span>';
            if (h2.tspikes > 0)  tags += '<span class="rsa-tag rsa-hazard-p2" title="Toxic Spikes on P2 side">T.Spikes×' + h2.tspikes + ' (P2)</span>';
            if (h2.stickyWeb)    tags += '<span class="rsa-tag rsa-hazard-p2" title="Sticky Web on P2 side">⛓ Web (P2)</span>';
        }
        // Hazard change badges (what was set or cleared THIS round)
        if (rd.hazardChanges) {
            var hc = rd.hazardChanges;
            for (var ci = 0; ci < (hc.cleared || []).length; ci++) {
                tags += '<span class="rsa-tag rsa-hazard-cleared" title="Hazards cleared">🧹 ' + esc(hc.cleared[ci]) + '</span>';
            }
            for (var si2 = 0; si2 < (hc.set || []).length; si2++) {
                tags += '<span class="rsa-tag rsa-hazard-set" title="Hazards set">⚠ ' + esc(hc.set[si2]) + '</span>';
            }
        }

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
                (rd.isDoubles ? '' : '<button class="rsa-toggle-crit' + (rd.p2Crit ? ' rsa-crit-active' : '') + '" data-round="' + rd.roundNum + '" title="Toggle P2 critical hit and recalculate">⚔ Crit</button>') +
                '<button class="rsa-branch-round" data-round="' + rd.roundNum + '" data-branch-idx="' + (branchIdx != null ? branchIdx : -1) + '" title="Branch from this round">🔀</button>' +
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
        // Berry-nullified status tag — computed up-front so it can show even when no move was used
        var berryNullHtml = '';
        if (actor.statusNullifiedByBerry && actor.statusNullifiedByBerry.status) {
            var _bn = actor.statusNullifiedByBerry;
            var _berryName = (_bn.berry || 'Berry').replace(/berry$/i, ' Berry');
            berryNullHtml = '<span class="rsa-tag rsa-berry-cure-tag" title="' +
                esc(_bn.status) + ' was nullified by ' + esc(_berryName) + '">🍓 ' +
                esc(_bn.status) + ' → ' + esc(_berryName) + '</span>';
        }
        if (actor.moveIdx === 'none' || actor.moveIdx === -1) {
            moveHtml = '<div class="rsa-move-name rsa-no-move">— No Move</div>' + berryNullHtml;
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
            effectsHtml + blockedHtml + berryNullHtml +
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

            // Solid bar defaults to aPct; may be overridden to bestPct for P2
            var solidBarPct = aPct;
            var solidBarCol = aCol;

            if (side === 'p1' && bestHP > worstHP) {
                // P1: solid bar at worstHP, stripes extend RIGHT into gray
                var uncertaintyPct = actor.hpAfter.max > 0 ? ((bestHP - worstHP) / actor.hpAfter.max * 100) : 0;
                stripedBar = '<div class="rsa-hp-bar rsa-hp-bar-uncertain" style="width:' +
                    Math.min(100, uncertaintyPct).toFixed(1) + '%;left:' +
                    Math.min(100, aPct).toFixed(1) + '%"></div>';
                rangeText = ' <span class="rsa-hp-range">(' + worstHP + '–' + bestHP + ')</span>';
            } else if (side === 'p2' && bestHP < worstHP) {
                // P2: solid bar at bestHP (guaranteed min HP floor), stripes extend RIGHT to worstHP
                var bestPctP2 = actor.hpAfter.max > 0 ? (bestHP / actor.hpAfter.max * 100) : 0;
                var uncertaintyPct = aPct - bestPctP2;
                solidBarPct = bestPctP2;
                solidBarCol = hpColor(bestPctP2);
                stripedBar = '<div class="rsa-hp-bar rsa-hp-bar-uncertain rsa-hp-bar-uncertain-p2" style="width:' +
                    Math.min(100, uncertaintyPct).toFixed(1) + '%;left:' +
                    Math.max(0, bestPctP2).toFixed(1) + '%"></div>';
                rangeText = ' <span class="rsa-hp-range">(' + bestHP + '–' + worstHP + ')</span>';
            }

            hpSim = '<div class="rsa-hp-sim">' +
                '<div class="rsa-hp-bar-wrap">' +
                    '<div class="rsa-hp-bar" style="width:' + Math.max(0, Math.min(100, solidBarPct)).toFixed(0) + '%;background:' + solidBarCol + '"></div>' +
                    stripedBar +
                '</div>' +
                '<span class="rsa-hp-after">' + actor.hpAfter.current + ' HP (' + aPct.toFixed(0) + '%)' +
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
                        (actor.confused ? '<span class="rsa-tag rsa-status-tag rsa-status-confused" title="' + (actor.confuseSelfHitMax != null ? 'Max self-hit: ' + actor.confuseSelfHitMax + ' HP' : 'Confused') + '">Confused' + (actor.confuseRounds > 0 ? ' (' + actor.confuseRounds + ')' : '') + (actor.confuseSelfHitMax != null ? ' · -' + actor.confuseSelfHitMax : '') + '</span>' : '') +
                        boostHtml +
                    '</div>' +
                    '<div class="rsa-hp-bar-wrap"><div class="rsa-hp-bar" style="width:' + bPct.toFixed(0) + '%;background:' + bCol + '"></div></div>' +
                    '<span class="rsa-hp-text">' + actor.hpBefore.current + ' HP (' + bPct.toFixed(0) + '%)</span>' +
                '</div>' +
            '</div>' +
            moveHtml + extrasHtml + eotHtml + hpSim +
            (side === 'p1' ? '<button class="rsa-bait-toggle" data-round="' + rd.roundNum + '" title="Analyze bait thresholds at this HP">🎯 Bait</button><div class="rsa-bait-panel" data-round="' + rd.roundNum + '"></div>' : '') +
            (actor.sashed ? '<span class=\"rsa-tag rsa-sash-tag\">Focus Sash!</span>' : '') +
            (actor.sturdied ? '<span class=\"rsa-tag rsa-sash-tag\">Sturdy!</span>' : '') +
            (actor.custap ? '<span class=\"rsa-tag rsa-sash-tag\">Custap Berry!</span>' : '') +
            (actor.itemConsumed ? '<span class=\"rsa-tag rsa-item-consumed-tag\" title=\"' + esc(actor.itemConsumed) + ' was consumed\">🎒 ' + esc(actor.itemConsumed) + ' consumed</span>' : '') +
        '</div>';
    }

    // ── Render All ───────────────────────────────────────────
    function renderAll() {
        renderLineTabs();
        renderTeamPanel('p1');
        renderTeamPanel('p2');
        renderBox('p1');
        renderRoundLog(); // rebuilds branch teams at end, leaving active branch state
        // Re-render team panels now that renderRoundLog has set the correct branch HP
        var _rl = curLine();
        if (_rl.branches && _rl.branches.length > 0) {
            renderTeamPanel('p1');
            renderTeamPanel('p2');
        }
        updateMovePickDisplay();
        populateSwitchDropdown();
        syncHazardsToCalc();
        if (isDoubles()) refreshDoublesUI();
        // Sync field bar controls from fieldState
        syncFieldBarFromState();
        // Passively persist a compact debug snapshot after every render so
        // Playwright can read the latest state without any user action.
        try { localStorage.setItem('_rsaState', captureDebugSnapshot()); } catch(e) {}
    }

    function captureDebugSnapshot() {
        var line = curLine();
        var p2Team = line.teams.p2;
        var p1Team = line.teams.p1;
        var _activeBranchRounds = (line.activeBranchIdx >= 0 && line.branches && line.branches[line.activeBranchIdx])
            ? getBranchRounds(line, line.activeBranchIdx).length : 0;
        var snap = {
            ts: new Date().toISOString(),
            format: battleFormat,
            lineIdx: currentLineIdx,
            activeBranchIdx: line.activeBranchIdx,
            roundCount: line.rounds.length,
            activeBranchRoundCount: _activeBranchRounds,
            p1: {
                activeIdx: p1Team.activeIdx,
                activeIdxB: p1Team.activeIdxB,
                roster: p1Team.roster.map(function(e, i) {
                    return { i: i, name: e.name, hp: e.currentHP + '/' + e.maxHP,
                             active: i === p1Team.activeIdx || i === p1Team.activeIdxB };
                })
            },
            p2: {
                activeIdx: p2Team.activeIdx,
                activeIdxB: p2Team.activeIdxB,
                roster: p2Team.roster.map(function(e, i) {
                    return { i: i, name: e.name, hp: e.currentHP + '/' + e.maxHP,
                             active: i === p2Team.activeIdx || i === p2Team.activeIdxB,
                             setId: e.setId };
                })
            },
            CURRENT_TRAINER_POKS: window.CURRENT_TRAINER_POKS || [],
            p1Form: typeof getP1Name === 'function' ? getP1Name() : null,
            p2Form: typeof getP2Name === 'function' ? getP2Name() : null
        };
        return JSON.stringify(snap, null, 2);
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
        // Re-anchor the calc's move-result-group into our moves area.
        // The calc framework regenerates this element on every set change
        // (loadPokemonIntoForm -> $sel.change()), so the one-time relocation
        // at init is not enough — check on every render and re-append if needed.
        var moveGroup = document.querySelector('.move-result-group');
        var movesArea = document.getElementById('rsa-moves-area');
        var _justAnchored = false;
        if (moveGroup && movesArea && !movesArea.contains(moveGroup)) {
            movesArea.appendChild(moveGroup);
            _justAnchored = true;
        }
        // Re-inject type/category sprites whenever the group is freshly anchored
        // (calc framework resets label text on pokemon change) or always if not
        // currently loading a form (lightweight, idempotent).
        if (!_loadingForm) {
            injectMoveLabelSprites();
        }

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
    function autoSelectP2MostProbable(retries) {
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
            syncInlineControls();
            // Recompute defensive rankings for the auto-selected P2 move
            setTimeout(function () {
                try { cachedRankings = computeBoxRankings(); } catch (e) { cachedRankings = []; }
                renderBox('p1');
            }, 50);
        } else if ((retries || 0) < 3) {
            // AI percentages may not be populated yet — retry after a short delay
            setTimeout(function () { autoSelectP2MostProbable((retries || 0) + 1); }, 300);
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
        var isChargeMove = md.flags && md.flags.charge;
        var chargeHtml = '';
        if (isChargeMove) {
            var line = curLine();
            var entry = side === 'p1' ? getActiveEntry(line.teams.p1) : getActiveEntry(line.teams.p2);
            var mKey = moveName.toLowerCase().replace(/[\s\-\']+/g, '');
            var hasSemiInvuln = CHARGE_SEMI_INVULN.hasOwnProperty(mKey);
            if (entry && entry.chargingMove === mKey) {
                // Strike turn coming
                chargeHtml = '<div class="rsa-preview-strike-note">⬇ Strike turn — ' + esc(md.name) + ' will land this round</div>';
            } else if (entry) {
                // About to charge
                var invDesc = hasSemiInvuln ? ' · ' + (INVULN_LABEL[CHARGE_SEMI_INVULN[mKey]] || '') : '';
                chargeHtml = '<div class="rsa-preview-charge-note">⬆ Charge turn (1st turn) — no damage dealt' + invDesc + '</div>';
            }
        }
        // Show warning if the OPPONENT is semi-invulnerable and this move won't hit
        var opponentInvulnHtml = '';
        var line2 = curLine();
        var oppEntry = side === 'p1' ? getActiveEntry(line2.teams.p2) : getActiveEntry(line2.teams.p1);
        if (oppEntry && oppEntry.semiInvulnType) {
            var bypList = INVULN_BYPASSES[oppEntry.semiInvulnType] || [];
            var thisMoveKey = moveName.toLowerCase().replace(/[\s\-\']+/g, '');
            var invLbl = INVULN_LABEL[oppEntry.semiInvulnType] || oppEntry.semiInvulnType;
            if (bypList.indexOf(thisMoveKey) !== -1) {
                opponentInvulnHtml = '<div class="rsa-preview-bypass-note">✓ Hits through ' + esc(invLbl) + '!</div>';
            } else {
                opponentInvulnHtml = '<div class="rsa-preview-invuln-note">✗ Opponent is ' + esc(invLbl) + ' — will deal 0</div>';
            }
        }
        $panel.html(
            '<div class="rsa-preview-header">' + typeImg + catImg + '<span class="rsa-preview-name">' + esc(md.name) + '</span></div>' +
            '<div class="rsa-preview-stats">' + stats.join(' · ') + '</div>' +
            (md.shortDesc ? '<div class="rsa-preview-desc">' + esc(md.shortDesc) + '</div>' : '') +
            chargeHtml +
            opponentInvulnHtml +
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

                // Skip if sprites are already injected (avoids redundant work)
                if ($label.find('.rsa-btn-move-sprites').length) continue;

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
        // Compute color code with boxCalcSettings applied
        // (replaces external calculationsColors which ignores our settings)
        try {
            var p1 = createPokemon(setId);
            var p2Info = $('#p2');
            var p2 = createPokemon(p2Info);
            var p1field = createField();
            var p2field = p1field.clone().swap();
            var results = calculateAllMoves(gen, p1, p1field, p2, p2field);

            var p1hp = results[0][0].attacker.stats.hp;
            var p2hp = results[1][0].attacker.stats.hp;

            // Effective speed: use calcEffectiveSpeed to include weather/terrain/item/ability/status
            // For P1 box mon, build an entry-like object from the calc pokemon and current conditions
            var p1Entry4cc = {
                item: p1.item || '',
                ability: p1.ability || '',
                status: '',
                boosts: { sp: (p1.boosts && p1.boosts.spe) || 0 }
            };
            var p1s = calcEffectiveSpeed(p1Entry4cc, p1.stats ? p1.stats.spe : 0);
            // For P2 playing on the field, read the form's totalMod (already accounts for Swift Swim etc.)
            var p2sRaw = p2.stats ? p2.stats.spe : 0;
            var p2sMod = parseInt($('#p2 .sp .totalMod').text()) || 0;
            var p2sBase = parseInt($('#p2 .sp .total').text()) || p2sRaw;
            var p2s = p2sMod || p2sBase || p2sRaw;
            // Also apply paralysis if P2 is paralyzed (the form may already handle this)
            if ($('#p2 .status').val() === 'Paralyzed' && p2s === p2sBase) p2s = Math.floor(p2s * 0.75);

            var p1AbilityToggle = $('#p1').find('.abilityToggle').is(':checked');
            var p1AbilEffBox = getAbilityEffects(p1.ability);
            var p1HasUnburden = p1AbilEffBox ? !!p1AbilEffBox.unburden : (p1.ability === 'Unburden');
            if (p1HasUnburden && !p1AbilityToggle) p1s = Math.floor(p1s / 2);
            var fastest = p1s > p2s ? 'F' : p1s < p2s ? 'S' : 'T';

            var p1KO = 0, p2KO = 0, p1HD = 0, p2HD = 0;
            for (var i = 0; i < 4; i++) {
                // --- P1 offense ---
                var r0 = results[0][i];
                // Skip selfdestruct moves if setting enabled
                if (boxCalcSettings.ignoreSelfdestruct && p1.moves[i]) {
                    var mn0 = p1.moves[i].name || '';
                    var md0 = lookupMoveData(mn0);
                    if (md0 && md0.selfdestruct) continue;
                }
                var lo0 = Array.isArray(r0.damage) ? (r0.damage[0] || r0.damage) : r0.damage;
                var hi0 = Array.isArray(r0.damage) ? (r0.damage[r0.damage.length - 1] || r0.damage) : r0.damage;
                var hits0 = p1.moves[i] ? (p1.moves[i].hits || 1) : 1;
                var loPct0 = lo0 * hits0 / p2hp * 100;
                var hiPct0 = hi0 * hits0 / p2hp * 100;
                // Apply sim item multiplier
                loPct0 = applySimItemMultiplier(loPct0);
                hiPct0 = applySimItemMultiplier(hiPct0);
                // Apply Guts burn boost
                var p1AeBox2 = getAbilityEffects(p1.ability);
                var p1HasGutsBox2 = p1AeBox2 ? !!p1AeBox2.burnAttackBoost : (p1.ability === 'Guts');
                if (boxCalcSettings.burnGuts && p1HasGutsBox2) {
                    var cat0 = p1.moves[i] ? (p1.moves[i].category || '') : '';
                    if (cat0 === 'Physical') { loPct0 *= 1.5; hiPct0 *= 1.5; }
                }
                if (hiPct0 > p1HD) p1HD = hiPct0;
                if (loPct0 >= 100) { p1KO = 1; }
                else if (hiPct0 >= 100 && p1KO === 0) { p1KO = 2; }

                // --- P2 offense ---
                var r1 = results[1][i];
                var lo1 = Array.isArray(r1.damage) ? (r1.damage[0] || r1.damage) : r1.damage;
                var hi1 = Array.isArray(r1.damage) ? (r1.damage[r1.damage.length - 1] || r1.damage) : r1.damage;
                var hits1 = p2.moves[i] ? (p2.moves[i].hits || 1) : 1;
                var loPct1 = lo1 * hits1 / p1hp * 100;
                var hiPct1 = hi1 * hits1 / p1hp * 100;
                if (hiPct1 > p2HD) p2HD = hiPct1;
                if (loPct1 >= 100) { p2KO = 4; }
                else if (hiPct1 >= 100 && p2KO < 3) { p2KO = 3; }
            }

            // Wall check: if P2 can't 3-shot us and we outdamage them
            if (Math.round(p2HD * 3) < 100 && p1HD > p2HD) {
                if (p1HD > 100) return { speed: fastest, code: 'WMO' };
                return { speed: fastest, code: 'W' };
            }

            var code = (p1KO > 0 ? p1KO.toString() : '') + (p2KO > 0 ? p2KO.toString() : '');
            return { speed: fastest, code: code };
        } catch (e) {
            return { speed: '', code: '' };
        }
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
            var ccClass = '', dmgCls = '';
            if (side === 'p1' && m.setId) {
                var cc = getColorCode(m.setId);
                if (cc.speed) ccClass += ' rsa-speed-' + cc.speed;
                if (cc.code) dmgCls = 'rsa-dmg-' + cc.code;
            }

            // Defensive type tooltip
            var tooltip = m.name;
            var _boxTypeInfo = { types:[], ability:'' };
            try {
                _boxTypeInfo = getMonTypeInfo(m.name, m.setId);
                tooltip = buildDefTooltip(m.name, _boxTypeInfo.types, _boxTypeInfo.ability);
            } catch(e) {}

            // Tag filter: skip this box mon if it doesn't match any active tag
            var _activeBoxTags = Object.keys(tagFilters.box).filter(function(k){return tagFilters.box[k];});
            if (_activeBoxTags.length && side === 'p1') {
                var _boxItem = '';
                try { var _bs = lookupSet(m.setId); if (_bs) _boxItem = _bs.item||''; } catch(ex2) {}
                var _boxEntry = { name:m.name, setId:m.setId, ability:_boxTypeInfo.ability, item:_boxItem, types:_boxTypeInfo.types };
                var _boxEntryTags = computeEntryTags(_boxEntry).map(function(tr){return tr.def.id;});
                if (!_activeBoxTags.some(function(id){return _boxEntryTags.indexOf(id)>=0;})) continue;
            }

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

            // Tag badges for this box card
            var boxTagBadgesHtml = '';
            if (side === 'p1') {
                try {
                    var _btItem = '';
                    try { var _bts = lookupSet(m.setId); if (_bts) _btItem = _bts.item||''; } catch(ex3) {}
                    var _btEntry = { name:m.name, setId:m.setId, ability:_boxTypeInfo.ability, item:_btItem, types:_boxTypeInfo.types };
                    var _btTags = sortTagResults(computeEntryTags(_btEntry));
                    // Apply tier filter
                    var _tTier = tagTierFilters.box || 'all';
                    if (_tTier !== 'all') {
                        _btTags = _btTags.filter(function(tr) {
                            if (_tTier === 'gold')    return tr.tier === 'gold';
                            if (_tTier === 'primary') return !tr.tier;
                            if (_tTier === 'silver')  return tr.tier === 'silver';
                            return true;
                        });
                    }
                    if (_btTags.length) {
                        boxTagBadgesHtml = '<div class="rsa-box-tag-badges">';
                        for (var bti=0;bti<_btTags.length;bti++) {
                            var _bt = _btTags[bti].def;
                            var _btTier = _btTags[bti].tier;
                            var _btTierCls = _btTier ? ' rsa-tag-tier-' + _btTier : '';
                            var _btTip = esc(_bt.name + (_btTier ? ' ('+ (_btTier==='gold'?'Primary':'Secondary') +')' : '') + ': ' + _bt.desc);
                            boxTagBadgesHtml += '<span class="rsa-box-tag-badge rsa-tag-' + _bt.cat + _btTierCls + '" data-tooltip="' + _btTip + '">' + _bt.emoji + '</span>';
                        }
                        boxTagBadgesHtml += '</div>';
                    }
                } catch(ex4) {}
            }
            html += '<div class="rsa-box-slot' + inTeam + ccClass + '" draggable="true" data-side="' + side + '" data-set-id="' + esc(m.setId) + '" data-name="' + esc(m.name) + '">' +
                deleteX +
                speedHtml +
                '<div class="rsa-box-sprite-wrap' + (dmgCls ? ' ' + dmgCls : '') + '">' +
                    '<img class="rsa-box-sprite" src="' + esc(m.sprite) + '" alt="' + esc(m.name) + '" title="' + esc(tooltip) + '">' +
                '</div>' +
                '<span class="rsa-box-name">' + esc(m.name) + '</span>' +
                rankHtml +
                baitHtml +
                boxTagBadgesHtml +
            '</div>';
        }
        $box.html(html);
        // Repopulate tag filter bar (P1 box only)
        if (side === 'p1') $('#rsa-tag-filter-bar-box').html(renderTagFilterBar('box'));
        $('#rsa-box-count-' + side).text(mons.length);
    }

    // ════════════════════════════════════════════════════════════
    // EVENT BINDING
    // ════════════════════════════════════════════════════════════

    $(document).ready(function () {

        // ── Floating tooltip (viewport-aware, replaces CSS ::after tooltips) ──
        var $ftip = $('<div id="rsa-ftip"></div>').appendTo('body');
        function positionFtip(e) {
            var tw = $ftip.outerWidth()||0, th = $ftip.outerHeight()||0;
            var x = e.clientX + 14, y = e.clientY - th - 10;
            if (x + tw > window.innerWidth  - 8) x = e.clientX - tw - 14;
            if (x < 8) x = 8;
            if (y < 8) y = e.clientY + 22;
            $ftip.css({ left: x, top: y });
        }
        $(document).on('mouseenter', '[data-tooltip]', function(e) {
            var text = $(this).data('tooltip');
            if (!text) return;
            $ftip.text(text).show();
            positionFtip(e);
        }).on('mousemove', '[data-tooltip]', positionFtip)
          .on('mouseleave', '[data-tooltip]', function() { $ftip.hide(); });


        var _savedSession = localStorage.getItem(RSA_STORAGE_KEY);
        if (_savedSession) {
            try {
                deserializeSession(_savedSession);
                // Restore format UI after deserializing
                if (isDoubles()) {
                    $('body').addClass('rsa-format-doubles');
                    $('[data-format="' + battleFormat + '"]').addClass('rsa-format-active');
                    $('#rsa-doubles-moves').show();
                }
                // Load active Pokémon from restored session into the calc form
                // Use a delay to ensure Select2 and calc form are fully initialized
                var _line = curLine();
                var _p1Active = getActiveEntry(_line.teams.p1);
                var _p2Active = getActiveEntry(_line.teams.p2);
                setTimeout(function () {
                    if (_p1Active) loadPokemonIntoForm('p1', _p1Active);
                    if (_p2Active) {
                        suppressP2Sync = true;
                        loadPokemonIntoForm('p2', _p2Active);
                        setTimeout(function () { suppressP2Sync = false; }, 500);
                    }
                }, 500);
            } catch (ex) {
                console.warn('RSA: failed to restore session', ex);
            }
        }
        renderAll();

        // ── Format selector ──
        $(document).on('click', '.rsa-format-btn', function () {
            var fmt = $(this).data('format');
            if (fmt === battleFormat) return;
            battleFormat = fmt;
            curLine().battleFormat = fmt;
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
            // When a P2 move row is selected, load that P2 mon and refresh box rankings
            if (slot && slot.indexOf('p2') === 0 && move !== 'none') {
                var line = curLine();
                var isA = slot === 'p2a';
                var p2Entry = isA ? getActiveEntry(line.teams.p2) : getActiveEntryB(line.teams.p2);
                if (p2Entry) {
                    suppressP2Sync = true;
                    loadPokemonIntoForm('p2', p2Entry);
                    setTimeout(function () { suppressP2Sync = false; }, 500);
                    var moveName = move;
                    var moves = getEntryMoves(p2Entry);
                    var moveIdx = moves.indexOf(moveName);
                    selectedP2Move = moveIdx >= 0 ? moveIdx : 'none';
                    setTimeout(function () {
                        try { cachedRankings = computeBoxRankings(); } catch (e) { cachedRankings = []; }
                        renderBox('p1');
                    }, 300);
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

        // Update move display when calc recalculates (debounced)
        var _calcTriggerTimer = null;
        $(document).on('change', '.calc-trigger', function () {
            if (_loadingForm) return; // skip during batch form loading
            clearTimeout(_calcTriggerTimer);
            _calcTriggerTimer = setTimeout(function () {
                if (_loadingForm) return;
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

        // ── Auto-refresh P1 box when calc's team/box DOM changes (debounced) ──
        var _boxMutTimer = null;
        var boxContainers = ['team-poke-list', 'box-poke-list'];
        for (var i = 0; i < boxContainers.length; i++) {
            var el = document.getElementById(boxContainers[i]);
            if (el) {
                new MutationObserver(function () {
                    clearTimeout(_boxMutTimer);
                    _boxMutTimer = setTimeout(function () { renderBox('p1'); }, 100);
                }).observe(el, { childList: true, subtree: true });
            }
        }

        var _oppMutTimer = null;
        var oppList = document.querySelector('.trainer-pok-list-opposing');
        if (oppList) {
            new MutationObserver(function () {
                clearTimeout(_oppMutTimer);
                _oppMutTimer = setTimeout(function () {
                    syncP2Team();
                    setTimeout(autoSelectP2MostProbable, 300);
                }, 150);
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
                // Load the active P1 from roster into the calc form (session restore)
                try {
                    var _line = curLine();
                    var _p1Active = getActiveEntry(_line.teams.p1);
                    if (_p1Active && _p1Active.setId) loadPokemonIntoForm('p1', _p1Active);
                } catch (e) {}
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
        $('#rsa-bug-report').on('click', function () {
            var snap = captureDebugSnapshot();
            var btn = $(this);
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(snap).then(function() {
                    btn.addClass('rsa-copied').text('✅ Copied!');
                    setTimeout(function() { btn.removeClass('rsa-copied').text('📋 Bug Report'); }, 2000);
                });
            } else {
                // Fallback for non-secure contexts
                var ta = document.createElement('textarea');
                ta.value = snap;
                ta.style.position = 'fixed'; ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                btn.addClass('rsa-copied').text('✅ Copied!');
                setTimeout(function() { btn.removeClass('rsa-copied').text('📋 Bug Report'); }, 2000);
            }
        });

        $('#rsa-add-line').on('click', function () {
            var name = prompt('Name for new line:', 'Line ' + String.fromCharCode(65 + lines.length));
            if (!name) return;
            lines.push(createLine(name));
            currentLineIdx = lines.length - 1;
            // Inherit the current P1 and trainer's roster into the new line
            initP1Team();
            syncP2Team();
            renderAll();
            autoSave();
        });

        $('#rsa-delete-line').on('click', function () {
            if (lines.length <= 1) { alert('Cannot delete the only line.'); return; }
            if (!confirm('Delete "' + curLine().name + '" and all its rounds?')) return;
            lines.splice(currentLineIdx, 1);
            currentLineIdx = Math.min(currentLineIdx, lines.length - 1);
            renderAll();
            autoSave();
        });

        // ── Session save / load / clear ──
        $('#rsa-save-session').on('click', function () {
            autoSave();
            showSaveToast('✅ Session saved!');
        });

        $('#rsa-load-session').on('click', function () {
            var saved = localStorage.getItem(RSA_STORAGE_KEY);
            if (!saved) { alert('No saved session found.'); return; }
            if (!confirm('Load saved session? Unsaved current work will be overwritten.')) return;
            try {
                if (deserializeSession(saved)) {
                    // Restore format UI
                    $('.rsa-format-btn').removeClass('rsa-format-active');
                    $('[data-format="' + battleFormat + '"]').addClass('rsa-format-active');
                    if (isDoubles()) {
                        $('body').addClass('rsa-format-doubles');
                        $('#rsa-doubles-moves').show();
                        $('.rsa-active-field').addClass('rsa-show');
                        $('.rsa-doubles-switch').show();
                    } else {
                        $('body').removeClass('rsa-format-doubles');
                        $('#rsa-doubles-moves').hide();
                        $('.rsa-active-field').removeClass('rsa-show');
                        $('.rsa-doubles-switch').hide();
                    }
                    renderAll();
                    showSaveToast('📂 Session loaded!');
                }
            } catch (ex) { alert('Failed to load session: ' + ex.message); }
        });

        $('#rsa-clear-session').on('click', function () {
            if (!hasSavedSession()) { alert('No saved session to clear.'); return; }
            if (!confirm('Delete the saved session from browser storage?')) return;
            localStorage.removeItem(RSA_STORAGE_KEY);
            showSaveToast('🗑️ Saved session cleared.');
        });

        $('#rsa-line-tabs').on('click', '.rsa-tab', function () {
            var idx = ~~$(this).data('line-idx');
            if (idx === currentLineIdx) return;

            // Save current form to roster before switching
            saveFormToRoster('p1');
            saveFormToRoster('p2');

            currentLineIdx = idx;

            // Restore battle format for the new line
            var lineFmt = lines[idx].battleFormat || 'singles';
            battleFormat = lineFmt;
            $('.rsa-format-btn').removeClass('rsa-format-active');
            $('[data-format="' + battleFormat + '"]').addClass('rsa-format-active');
            if (isDoubles()) {
                $('body').addClass('rsa-format-doubles');
                $('#rsa-doubles-moves').show();
                $('.rsa-active-field').addClass('rsa-show');
                $('.rsa-doubles-switch').show();
                $('#rsa-team-split').toggle(battleFormat === 'doubles-2t');
                $('#rsa-switch-p1').closest('.rsa-switch-group').not('.rsa-doubles-switch').hide();
            } else {
                $('body').removeClass('rsa-format-doubles');
                $('#rsa-doubles-moves').hide();
                $('.rsa-active-field').removeClass('rsa-show');
                $('.rsa-doubles-switch').hide();
                $('#rsa-team-split').hide();
                $('#rsa-switch-p1').closest('.rsa-switch-group').not('.rsa-doubles-switch').show();
            }

            renderAll();

            // Load active pokemon from new line into forms
            var line = curLine();
            var p1Active = getActiveEntry(line.teams.p1);
            var p2Active = getActiveEntry(line.teams.p2);
            if (p1Active) loadPokemonIntoForm('p1', p1Active);
            if (p2Active) {
                suppressP2Sync = true;
                loadPokemonIntoForm('p2', p2Active);
                setTimeout(function () { suppressP2Sync = false; }, 500);
            }
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
            if (isDoubles()) {
                // In doubles, P2 click loads that mon for box color/ranking evaluation
                if (side === 'p2') {
                    var line = curLine();
                    var entry = line.teams.p2.roster[idx];
                    if (!entry) return;
                    suppressP2Sync = true;
                    loadPokemonIntoForm('p2', entry);
                    setTimeout(function () {
                        suppressP2Sync = false;
                        try { cachedRankings = computeBoxRankings(); } catch (e) { cachedRankings = []; }
                        renderBox('p1');
                    }, 500);
                }
                return; // In doubles, P1 uses drag-to-slot
            }
            switchActive(side, idx);
        });

        // In doubles, clicking a P2 active-field slot also refreshes box rankings
        $(document).on('click', '.rsa-active-slot[data-side="p2"]', function () {
            if (!isDoubles()) return;
            var idx = ~~$(this).data('idx');
            var line = curLine();
            var entry = line.teams.p2.roster[idx];
            if (!entry || entry.currentHP <= 0) return;
            suppressP2Sync = true;
            loadPokemonIntoForm('p2', entry);
            setTimeout(function () {
                suppressP2Sync = false;
                try { cachedRankings = computeBoxRankings(); } catch (e) { cachedRankings = []; }
                renderBox('p1');
            }, 500);
        });

        // ── Log round ──
        $('#rsa-log-round').on('click', function () {
            // Guard: if a form transition is still in progress (loadPokemonIntoForm
            // 300ms timer hasn't fired yet), the HP/item/ability fields may be stale.
            // Block the capture and let the user click again once the form settles.
            if (_loadingForm) {
                showSaveToast('⏳ Form still loading — please wait a moment and try again.', 2000);
                return;
            }
            var comment = $('#rsa-comment').val().trim();

            function finishRound(rd) {
                if (!rd) return;
                getActiveRounds(curLine()).push(rd);
                // Clear pending-switch flag now that the round has been logged
                var _fl = curLine();
                if (_fl.activeBranchIdx >= 0 && _fl.branches && _fl.branches[_fl.activeBranchIdx]) {
                    _fl.branches[_fl.activeBranchIdx].pendingSwitchP2Idx = undefined;
                } else {
                    _fl.pendingSwitchP2Idx = undefined;
                }

                // Snapshot hazard state before applying move effects
                var hazBefore = {
                    p1: $.extend({}, getFieldHazards('p1')),
                    p2: $.extend({}, getFieldHazards('p2'))
                };

                // Auto-detect hazard-setting/clearing moves and update field state
                if (rd.isDoubles && rd.actions) {
                    for (var ai = 0; ai < rd.actions.length; ai++) {
                        var act = rd.actions[ai];
                        if (act && act.move && act.move !== '—') {
                            var actSide = act.slot ? act.slot.substring(0, 2) : '';
                            if (actSide === 'p1') applyHazardMoves(act.move, null);
                            else if (actSide === 'p2') applyHazardMoves(null, act.move);
                        }
                    }
                } else {
                    var p1Move = (rd.p1 && rd.p1.move !== '—') ? rd.p1.move : null;
                    var p2Move = (rd.p2 && rd.p2.move !== '—') ? rd.p2.move : null;
                    applyHazardMoves(p1Move, p2Move);
                }

                // Compute hazard diff (what changed this round) and store on round
                var hazAfter = {
                    p1: $.extend({}, getFieldHazards('p1')),
                    p2: $.extend({}, getFieldHazards('p2'))
                };
                rd.hazardChanges = diffHazards(hazBefore, hazAfter);

                // Auto-apply weather / terrain / screens / tailwind from move data
                if (rd.isDoubles && rd.actions) {
                    for (var fi = 0; fi < rd.actions.length; fi++) {
                        var fAct = rd.actions[fi];
                        if (!fAct || !fAct.moveData || fAct.move === '—') continue;
                        var fMd = lookupMoveData(fAct.move);
                        var fSide = fAct.slot ? fAct.slot.substring(0, 2) : '';
                        var fEntry = fAct.entry || (rd.fighters && rd.fighters[fAct.slot]);
                        applyMoveWeather(fMd, fEntry);
                        applyMoveTerrain(fMd, fEntry);
                        applyMoveSideCondition(fMd, fSide, fEntry);
                    }
                } else {
                    var _p1Md = (rd.p1 && rd.p1.move !== '—') ? lookupMoveData(rd.p1.move) : null;
                    var _p2Md = (rd.p2 && rd.p2.move !== '—') ? lookupMoveData(rd.p2.move) : null;
                    var _line = curLine();
                    var _p1Entry = _line.teams.p1 ? getActiveEntry(_line.teams.p1) : null;
                    var _p2Entry = _line.teams.p2 ? getActiveEntry(_line.teams.p2) : null;
                    if (_p1Md) {
                        applyMoveWeather(_p1Md, _p1Entry);
                        applyMoveTerrain(_p1Md, _p1Entry);
                        applyMoveSideCondition(_p1Md, 'p1', _p1Entry);
                    }
                    if (_p2Md) {
                        applyMoveWeather(_p2Md, _p2Entry);
                        applyMoveTerrain(_p2Md, _p2Entry);
                        applyMoveSideCondition(_p2Md, 'p2', _p2Entry);
                    }
                }

                syncActiveStateToForm();
                updateFieldPanel();
                renderAll();
                autoSave();
                if (isDoubles()) refreshDoublesUI();
                $('#rsa-comment').val('');
                if (!isDoubles()) {
                    $('#rsa-p1-apply-secondary').prop('checked', false);
                }
            }

            function doCaptureSingles() {
                var p1MoveIdx = selectedP1Move;
                var p2MoveIdx = selectedP2Move;
                var p2Crit = $('#rsa-p2-crit').is(':checked');
                var p1ApplySec = $('#rsa-p1-apply-secondary').is(':checked');
                var p2ApplySec = $('#rsa-p2-apply-secondary').is(':checked');
                // p1PreDmg and p1PreStatus are now edited directly on the P1 card;
                // entry.currentHP and entry.status already reflect any changes.
                return captureRound(p1MoveIdx, p2MoveIdx, p2Crit, 0, '', comment, p1ApplySec, p2ApplySec);
            }

            if (isDoubles()) {
                // Pre-compute speed order to detect ties before logging the round
                var lineDbl = curLine();
                var trPre = $('#trickroom').is(':checked');
                var slotsPre = ['p1a', 'p1b', 'p2a', 'p2b'];
                var specsPre = [];
                for (var sp = 0; sp < slotsPre.length; sp++) {
                    var spSid = slotsPre[sp];
                    var spTeam = spSid.substring(0, 2) === 'p1' ? lineDbl.teams.p1 : lineDbl.teams.p2;
                    var spEntry = spSid.charAt(2) === 'a' ? getActiveEntry(spTeam) : getActiveEntryB(spTeam);
                    var spSel = dblSelections[spSid];
                    if (!spEntry || spEntry.currentHP <= 0) continue;
                    var spMd = spSel && spSel.move ? lookupMoveData(spSel.move) : null;
                    var spPri = spMd && typeof spMd.priority === 'number' ? spMd.priority : 0;
                    specsPre.push({ slot: spSid, name: spEntry.name, speed: computeEntrySpeed(spEntry), priority: spPri });
                }
                specsPre.sort(function (a, b) {
                    if (a.priority !== b.priority) return b.priority - a.priority;
                    return trPre ? a.speed - b.speed : b.speed - a.speed;
                });
                var tiePairs = [];
                for (var tp = 0; tp + 1 < specsPre.length; tp++) {
                    if (specsPre[tp].priority === specsPre[tp + 1].priority &&
                        specsPre[tp].speed === specsPre[tp + 1].speed) {
                        tiePairs.push({
                            slotA: specsPre[tp].slot, nameA: specsPre[tp].name,
                            slotB: specsPre[tp + 1].slot, nameB: specsPre[tp + 1].name
                        });
                    }
                }
                if (tiePairs.length > 0) {
                    window._rsaDoubleTiebreakers = {};
                    function resolvePairs(idx) {
                        if (idx >= tiePairs.length) {
                            finishRound(captureDoublesRound(comment));
                            window._rsaDoubleTiebreakers = null;
                            return;
                        }
                        var pair = tiePairs[idx];
                        showSpeedTieModal(pair.nameA, pair.nameB, function (winner) {
                            window._rsaDoubleTiebreakers[pair.slotA + ',' + pair.slotB] =
                                winner === 'a' ? pair.slotA : pair.slotB;
                            resolvePairs(idx + 1);
                        });
                    }
                    resolvePairs(0);
                    return;
                }
                finishRound(captureDoublesRound(comment));
                return;
            }

            // Singles: check for speed tie before capturing
            var speedPre = getSpeedInfo();
            if (speedPre.faster === 'tie') {
                var lineS = curLine();
                var p1EntryPre = getActiveEntry(lineS.teams.p1);
                var p2EntryPre = getActiveEntry(lineS.teams.p2);
                var p1NameTie = p1EntryPre ? p1EntryPre.name : 'P1';
                var p2NameTie = p2EntryPre ? p2EntryPre.name : 'P2';
                showSpeedTieModal(p1NameTie, p2NameTie, function (winner) {
                    window._rsaTiebreaker = winner === 'a' ? 'p1' : 'p2';
                    finishRound(doCaptureSingles());
                    window._rsaTiebreaker = null;
                });
                return;
            }

            finishRound(doCaptureSingles());
        });

        // ── Switch P1 in (takes the P2 move) ──
        var _switchInProgress = false;
        $('#rsa-do-switch').on('click', function (e) {
            e.preventDefault();
            if (_switchInProgress) return;
            var switchIdx = parseInt($('#rsa-switch-p1').val());
            if (isNaN(switchIdx)) {
                alert('Select a Pokémon to switch in.');
                return;
            }
            _switchInProgress = true;
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
                // rebuildBranchTeams (fired by loadPokemonIntoForm's 300ms timer) may have
                // reset team.p1.activeIdx back to the pre-switch mon via replay. Re-apply
                // the switch index so captureRound uses the correct incoming pokemon.
                curLine().teams.p1.activeIdx = switchIdx;

                // Auto-apply entry hazard damage for the incoming P1 pokemon
                var switchEntry = getActiveEntry(curLine().teams.p1);
                var hazResult = { damage: 0, status: '' };
                if (switchEntry) {
                    hazResult = calcEntryHazardDamage(switchEntry, getFieldHazards('p1'));
                }

                var rd = captureRound('none', p2MoveIdx, p2Crit, hazResult.damage, hazResult.status,
                    comment ? comment : 'Switch in: ' + switchName, false, p2ApplySec);
                if (!rd) return;
                rd.isSwitch = true;

                // Detect hazard moves from P2's attack
                var p2Move = (rd.p2 && rd.p2.move !== '—') ? rd.p2.move : null;
                if (p2Move) applyHazardMoves(null, p2Move);

                getActiveRounds(curLine()).push(rd);
                renderAll();

                $('#rsa-comment').val('');
                $('#rsa-switch-p1').val('');
                _switchInProgress = false;
            }, 600);
        });

        // ── Collapse / expand all rounds ──
        $('#rsa-collapse-all').on('click', function () {
            var $log = $('#rsa-round-log');
            var collapsed = $log.toggleClass('rsa-all-collapsed').hasClass('rsa-all-collapsed');
            $(this).text(collapsed ? '\u229e Expand All' : '\u2296 Collapse All');
        });

        // ── Click header to toggle individual round card collapse ──
        $(document).on('click', '.rsa-round-header', function (e) {
            // Don't toggle when clicking the delete or crit button
            if ($(e.target).hasClass('rsa-delete-round')) return;
            if ($(e.target).hasClass('rsa-toggle-crit')) return;
            $(this).closest('.rsa-round-card').toggleClass('rsa-collapsed');
        });

        // ── Toggle P2 Crit on a round ──
        $(document).on('click', '.rsa-toggle-crit', function (e) {
            e.stopPropagation();
            var num = ~~$(this).data('round');
            toggleP2Crit(num);
        });

        // ── Delete round ──
        $(document).on('click', '.rsa-delete-round', function (e) {
            e.stopPropagation();
            var num = ~~$(this).data('round');
            var line = curLine();
            var oldP1 = getActiveEntry(line.teams.p1);
            var oldP2 = getActiveEntry(line.teams.p2);
            // Suppress async syncP2Team calls (MutationObserver / set-selector change)
            // during the entire rebuild+render cycle to prevent roster corruption.
            suppressP2Sync = true;
            // Delete from the correct round array (main or active branch)
            if (line.activeBranchIdx >= 0) {
                var branch = line.branches[line.activeBranchIdx];
                if (branch) {
                    branch.rounds = branch.rounds.filter(function (r) { return r.roundNum !== num; });
                }
            } else {
                line.rounds = line.rounds.filter(function (r) { return r.roundNum !== num; });
            }
            rebuildBranchTeams(line, line.activeBranchIdx);
            ensureP2RosterComplete();
            var newP1 = getActiveEntry(line.teams.p1);
            var newP2 = getActiveEntry(line.teams.p2);
            // If the active mon changed after rebuild, reload the calc form
            if (newP1 && (!oldP1 || oldP1.name !== newP1.name)) loadPokemonIntoForm('p1', newP1);
            if (newP2 && (!oldP2 || oldP2.name !== newP2.name)) {
                loadPokemonIntoForm('p2', newP2);
            }
            // Full-sync HP/item/ability/status/boosts so calc form matches roster
            syncActiveStateToForm();
            renderAll();
            autoSave();
            // After all async form mutations have settled (loadPokemonIntoForm 300ms timer,
            // performCalculations callbacks, etc.), re-anchor the roster HP to the rebuilt
            // state and save again.  This prevents any stale form value written by an
            // in-flight async timer from corrupting the persisted roster HP.
            setTimeout(function () {
                rebuildBranchTeams(curLine(), curLine().activeBranchIdx);
                syncActiveStateToForm();
                renderAll();
                autoSave();
                suppressP2Sync = false;
            }, 700);
        });

        // ── Bait Analysis toggle (🎯 button) ──
        $(document).on('click', '.rsa-bait-toggle', function (e) {
            e.stopPropagation();
            var $btn = $(this);
            var $panel = $btn.next('.rsa-bait-panel');
            if ($panel.hasClass('rsa-bait-open')) {
                $panel.removeClass('rsa-bait-open').html('');
                return;
            }
            // Find the P1 entry at this round's HP state
            var roundNum = ~~$btn.data('round');
            var line = curLine();
            var rounds = line.activeBranchIdx >= 0 ? getBranchRounds(line, line.activeBranchIdx) : line.rounds;
            var rd = null;
            for (var i = 0; i < rounds.length; i++) {
                if (rounds[i].roundNum === roundNum) { rd = rounds[i]; break; }
            }
            if (!rd || !rd.p1) return;
            // Build a fake P1 entry at this round's after-HP
            var p1Entry = getActiveEntry(line.teams.p1);
            if (!p1Entry) return;
            var fakeP1 = $.extend(true, {}, p1Entry);
            fakeP1.currentHP = rd.p1.hpAfter.current;
            fakeP1.item = rd.p1.item;
            fakeP1.ability = rd.p1.ability;
            fakeP1.status = rd.p1.status;
            fakeP1.boosts = rd.p1.boosts ? $.extend({}, rd.p1.boosts) : { at:0,df:0,sa:0,sd:0,sp:0 };
            // Find the matching roster entry for the correct setId
            for (var ri = 0; ri < line.teams.p1.roster.length; ri++) {
                if (line.teams.p1.roster[ri].name === rd.p1.name) {
                    fakeP1.setId = line.teams.p1.roster[ri].setId;
                    fakeP1.name = rd.p1.name;
                    fakeP1.sprite = rd.p1.sprite;
                    fakeP1.moves = line.teams.p1.roster[ri].moves;
                    fakeP1.maxHP = rd.p1.hpAfter.max;
                    break;
                }
            }
            $panel.html('<div class="rsa-bait-loading">Computing bait thresholds…</div>');
            $panel.addClass('rsa-bait-open');
            setTimeout(function () {
                var bands = computeBaitAnalysis(fakeP1);
                $panel.html(renderBaitPanel(bands, fakeP1, rd.p1.hpAfter.current, rd.p1.hpAfter.max));
            }, 20);
        });

        // ── Branch from round (🔀 button) ──
        $(document).on('click', '.rsa-branch-round', function (e) {
            e.stopPropagation();
            var roundNum = ~~$(this).data('round');
            var line = curLine();
            // Find forkRoundIdx: how many rounds to inherit (rounds before this one)
            var forkIdx = 0;
            for (var i = 0; i < line.rounds.length; i++) {
                if (line.rounds[i].roundNum === roundNum) { forkIdx = i; break; }
            }
            var newIdx = createBranch(line, forkIdx);
            line.activeBranchIdx = newIdx;
            rebuildBranchTeams(line, newIdx);
            // Sync calc form to the branch's HP state so captureRound starts from correct HP
            var _bp1 = getActiveEntry(line.teams.p1);
            var _bp2 = getActiveEntry(line.teams.p2);
            if (_bp1) loadPokemonIntoForm('p1', _bp1);
            if (_bp2) {
                suppressP2Sync = true;
                loadPokemonIntoForm('p2', _bp2);
                setTimeout(function () { suppressP2Sync = false; }, 500);
            }
            // Full sync (HP, item, ability, status, boosts) — same as branch-tab handler.
            // captureRound reads HP from the form immediately, so this must be synchronous.
            // loadPokemonIntoForm's setTimeout(0) only sets form HP asynchronously; without
            // this call the form still shows the previous round's HP (0 after a KO) until
            // the timeout fires, causing the branch's first round to start from 0 HP.
            syncActiveStateToForm();
            renderAll();
            autoSave();
        });

        // ── Branch tab click (switch active branch) ──
        $(document).on('click', '.rsa-branch-tab', function (e) {
            e.stopPropagation();
            var branchIdx = ~~$(this).data('branch-idx');
            var line = curLine();
            line.activeBranchIdx = branchIdx;
            rebuildBranchTeams(line, branchIdx);
            ensureP2RosterComplete();
            var p1 = getActiveEntry(line.teams.p1);
            var p2 = getActiveEntry(line.teams.p2);
            if (p1) loadPokemonIntoForm('p1', p1);
            if (p2) {
                suppressP2Sync = true;
                loadPokemonIntoForm('p2', p2);
                setTimeout(function () { suppressP2Sync = false; }, 500);
            }
            syncActiveStateToForm();
            renderAll();
            autoSave();
        });

        // ── Branch delete (column header × or tab ×) ──
        $(document).on('click', '.rsa-branch-delete, .rsa-branch-tab-delete', function (e) {
            e.stopPropagation();
            var branchIdx = ~~$(this).data('branch-idx');
            var line = curLine();
            if (branchIdx < 0 || branchIdx >= line.branches.length) return;
            var branchName = line.branches[branchIdx].name;
            if (!confirm('Delete branch "' + branchName + '"?')) return;
            line.branches.splice(branchIdx, 1);
            // Fix activeBranchIdx after removal
            if (line.activeBranchIdx === branchIdx) {
                line.activeBranchIdx = -1; // back to main
            } else if (line.activeBranchIdx > branchIdx) {
                line.activeBranchIdx--;
            }
            rebuildBranchTeams(line, line.activeBranchIdx);
            ensureP2RosterComplete();
            syncActiveStateToForm();
            renderAll();
            autoSave();
        });

        // ── Branch rename (double-click tab) ──
        $(document).on('dblclick', '.rsa-branch-tab', function (e) {
            e.stopPropagation();
            var branchIdx = ~~$(this).data('branch-idx');
            var line = curLine();
            if (branchIdx < 0) {
                // Rename main line
                var newName = prompt('Rename main line:', line.name);
                if (newName && newName.trim()) { line.name = newName.trim(); }
            } else if (line.branches[branchIdx]) {
                var newName = prompt('Rename branch:', line.branches[branchIdx].name);
                if (newName && newName.trim()) { line.branches[branchIdx].name = newName.trim(); }
            }
            renderAll();
            autoSave();
        });

        // ── Delete All Rounds (log header button) ──
        $(document).on('click', '#rsa-delete-all-rounds', function () {
            var line = curLine();
            var totalRounds = line.rounds.length;
            for (var _bi = 0; _bi < line.branches.length; _bi++) {
                totalRounds += line.branches[_bi].rounds.length;
            }
            if (totalRounds === 0) return;
            if (!confirm('Delete all ' + totalRounds + ' rounds (including ' + line.branches.length + ' branch(es)) in "' + line.name + '"?')) return;
            suppressP2Sync = true;
            line.rounds = [];
            line.roundCounter = 0;
            line.branches = [];
            line.activeBranchIdx = -1;
            rebuildLineTeams(line);
            ensureP2RosterComplete();
            syncActiveStateToForm();
            renderAll();
            autoSave();
            setTimeout(function () {
                rebuildLineTeams(curLine());
                syncActiveStateToForm();
                renderAll();
                autoSave();
                suppressP2Sync = false;
            }, 700);
        });

        // ── Clear line ──
        $('#rsa-clear-line').on('click', function () {
            var line = curLine();
            if (line.rounds.length === 0) return;
            if (!confirm('Clear all rounds in "' + line.name + '"?')) return;
            suppressP2Sync = true;
            line.rounds = [];
            line.roundCounter = 0;
            rebuildLineTeams(line);
            ensureP2RosterComplete();
            syncActiveStateToForm();
            renderAll();
            autoSave();
            setTimeout(function () {
                rebuildLineTeams(curLine());
                syncActiveStateToForm();
                renderAll();
                autoSave();
                suppressP2Sync = false;
            }, 700);
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

        // ── Trainer search ──
        (function () {
            var $input = $('#rsa-trainer-search');
            var $sugg  = $('#rsa-trainer-suggestions');

            $input.on('input', function () {
                var query = $(this).val().trim().toLowerCase();
                $sugg.empty();
                if (!query) { $sugg.hide(); return; }

                // TR_NAMES entries: "[index]MonName (Trainer Name)"
                var seen = {};
                var results = [];
                (window.TR_NAMES || []).forEach(function (entry) {
                    var idxMatch     = entry.match(/^\[(\d+)\]/);
                    var trainerMatch = entry.match(/\(([^)]+)\)$/);
                    if (!idxMatch || !trainerMatch) return;
                    var idx  = parseInt(idxMatch[1], 10);
                    var name = trainerMatch[1];
                    if (seen[idx]) return;
                    if (name.toLowerCase().includes(query)) {
                        seen[idx] = true;
                        results.push({ idx: idx, name: name });
                    }
                });

                if (!results.length) { $sugg.hide(); return; }

                results.slice(0, 20).forEach(function (r) {
                    $('<div class="rsa-trainer-sugg-item">')
                        .text(r.name)
                        .on('click', function () {
                            $input.val(r.name);
                            $sugg.hide();
                            var line = curLine();
                            if (line.rounds.length > 0) {
                                var save = confirm(
                                    'You have ' + line.rounds.length + ' round(s) logged in "' + line.name + '".\n\n' +
                                    'OK = Save this line and start a new one\n' +
                                    'Cancel = Discard rounds and load next opponent'
                                );
                                if (save) {
                                    lines.push(createLine('Line ' + String.fromCharCode(65 + lines.length)));
                                    currentLineIdx = lines.length - 1;
                                } else {
                                    line.rounds = [];
                                    line.roundCounter = 0;
                                    line.teams = { p1: { roster: [], activeIdx: -1 }, p2: { roster: [], activeIdx: -1 } };
                                }
                                renderAll();
                            }
                            selectTrainer(r.idx);
                            setTimeout(function () {
                                syncP2Team();
                                setTimeout(autoSelectP2MostProbable, 500);
                            }, 500);
                        })
                        .appendTo($sugg);
                });
                $sugg.show();
            });

            $(document).on('click', function (e) {
                if (!$(e.target).closest('.rsa-trainer-search-wrap').length) {
                    $sugg.hide();
                }
            });
        })();

        // ── Export ──
        $('#rsa-export').on('click', function () {
            var text = exportLines();
            var $btn = $(this);
            function showCopied() {
                var orig = $btn.html();
                $btn.html('&#10003; Copied!');
                setTimeout(function () { $btn.html(orig); }, 1500);
            }
            // Try clipboard API first
            var copied = false;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(function () {
                        copied = true;
                        showCopied();
                    }).catch(function () {
                        showCopyModal(text);
                    });
                    return;
                }
            } catch (e) {}
            // Try execCommand
            try {
                var ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.left = '0';
                ta.style.top = '0';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                copied = document.execCommand('copy');
                document.body.removeChild(ta);
            } catch (e) {}
            if (copied) {
                showCopied();
            } else {
                showCopyModal(text);
            }
        });

        function showCopyModal(text) {
            // Remove any existing modal
            $('.rsa-copy-modal-overlay').remove();
            var $overlay = $('<div class="rsa-copy-modal-overlay"></div>');
            var $modal = $('<div class="rsa-copy-modal"></div>');
            var $header = $('<div class="rsa-copy-modal-header">Copy Log <button class="rsa-copy-modal-close">&times;</button></div>');
            var $ta = $('<textarea class="rsa-copy-modal-text" readonly></textarea>').val(text);
            var $hint = $('<div class="rsa-copy-modal-hint">Select All (Ctrl+A) then Copy (Ctrl+C)</div>');
            $modal.append($header).append($ta).append($hint);
            $overlay.append($modal);
            $('body').append($overlay);
            // Select all text
            $ta[0].focus();
            $ta[0].select();
            // Close handlers
            $overlay.on('click', function (e) {
                if ($(e.target).hasClass('rsa-copy-modal-overlay')) $overlay.remove();
            });
            $modal.on('click', '.rsa-copy-modal-close', function () { $overlay.remove(); });
        }

        // ── Inline controls (at bottom of round log) ──
        // P1 move change in KO panel → sync to main move selector
        $(document).on('change', '.rsa-inline-p1-move-ko', function () {
            var val = $(this).val();
            if (val === 'none') return;
            $('input#resultMoveL' + (parseInt(val) + 1)).prop('checked', true).trigger('change');
        });

        // P2 KO switch button → switch P2 active mon, then log a switch round
        $(document).on('click', '.rsa-inline-p2-switch', function () {
            var p2SendIdx = parseInt($('.rsa-inline-p2-send').val());
            if (isNaN(p2SendIdx)) { alert('Select who P2 sends in.'); return; }
            var line = curLine();
            var incomingName = line.teams.p2.roster[p2SendIdx] ? line.teams.p2.roster[p2SendIdx].name : '?';

            // Sync P1 move from the KO panel's move selector
            var koP1Move = $('.rsa-inline-p1-move-ko').val();
            if (koP1Move && koP1Move !== 'none') {
                $('input#resultMoveL' + (parseInt(koP1Move) + 1)).prop('checked', true).trigger('change');
            }
            var inlineComment = $('.rsa-inline-comment-ko').val() || ('P2 sends ' + incomingName);

            // Switch P2 active mon (loads into form, resets boosts)
            switchActive('p2', p2SendIdx);

            // Wait for the form to fully load, then capture the round
            setTimeout(function () {
                // rebuildBranchTeams (fired by loadPokemonIntoForm's 300ms timer) may have
                // reset team.p2.activeIdx back to the KO'd mon via replay. Re-apply the
                // send-in index so captureRound logs the correct incoming pokemon.
                curLine().teams.p2.activeIdx = p2SendIdx;

                var p1MoveIdx = selectedP1Move;
                var rd = captureRound(p1MoveIdx, 'none', false, 0, '', inlineComment, false, false);
                if (!rd) { return; }
                rd.isP2Switch = true;
                getActiveRounds(curLine()).push(rd);
                renderAll();
                syncActiveStatusToForm();
                autoSave();
            }, 750);
        });

        // P2 KO: Confirm button (or change) switches P2 in and transitions to full normal panel
        function doP2SendIn() {
            var idx = parseInt($('.rsa-inline-p2-send').val());
            if (isNaN(idx)) { alert('Select who P2 sends in.'); return; }
            var line = curLine();
            var entry = line.teams.p2.roster[idx];
            if (!entry) return;
            // Persist the confirmed send-in so rebuildBranchTeams restores it correctly
            // (loadPokemonIntoForm -> renderRoundLog -> rebuildBranchTeams would otherwise
            //  reset activeIdx back to the KO'd pokemon)
            if (line.activeBranchIdx >= 0 && line.branches && line.branches[line.activeBranchIdx]) {
                line.branches[line.activeBranchIdx].pendingSwitchP2Idx = idx;
            } else {
                line.pendingSwitchP2Idx = idx;
            }
            switchActive('p2', idx);
            setTimeout(function () {
                // Ensure the switch is still applied (failsafe: rebuildBranchTeams
                // checks pendingSwitchP2Idx, but also set activeIdx directly here)
                var line2 = curLine();
                line2.teams.p2.activeIdx = idx;
                var $existingInline = $('#rsa-round-log .rsa-inline-controls');
                if ($existingInline.length) {
                    var newInlineHtml = renderInlineControls();
                    $existingInline.replaceWith($(newInlineHtml));
                    syncInlineControls();
                }
                $('.rsa-inline-comment').val('P2 sends ' + entry.name);
            }, 400);
        }
        $(document).on('click', '.rsa-inline-p2-confirm', doP2SendIn);

        // P1 move change → sync to main move selector
        $(document).on('change', '.rsa-inline-p1-move', function () {
            var val = $(this).val();
            if (val === 'none') return;
            var idx = parseInt(val);
            $('input#resultMoveL' + (idx + 1)).prop('checked', true).trigger('change');
        });

        // P2 move change → sync to main move selector
        $(document).on('change', '.rsa-inline-p2-move', function () {
            var val = $(this).val();
            if (val === 'none') return;
            var idx = parseInt(val);
            // Click the main move radio to trigger the move selection
            $('input#resultMoveR' + (idx + 1)).prop('checked', true).trigger('change');
        });

        // Log round via inline button
        $(document).on('click', '.rsa-inline-log', function () {
            // Sync inline options to main controls
            var inlineP2Crit = $('.rsa-inline-p2-crit').is(':checked');
            var inlineP1Eff  = $('.rsa-inline-p1-eff').is(':checked');
            var inlineP2Eff  = $('.rsa-inline-p2-eff').is(':checked');
            var inlineComment = $('.rsa-inline-comment').val() || '';
            $('#rsa-p2-crit').prop('checked', inlineP2Crit);
            $('#rsa-p1-apply-secondary').prop('checked', inlineP1Eff);
            $('#rsa-p2-apply-secondary').prop('checked', inlineP2Eff);
            $('#rsa-comment').val(inlineComment);
            // Trigger the main log button
            $('#rsa-log-round').trigger('click');
        });

        // Switch via inline button
        $(document).on('click', '.rsa-inline-do-switch', function () {
            var val = $('.rsa-inline-switch').val();
            if (!val) return;
            $('#rsa-switch-p1').val(val);
            // Sync crit/eff from inline
            var inlineP2Crit = $('.rsa-inline-p2-crit').is(':checked');
            var inlineP2Eff  = $('.rsa-inline-p2-eff').is(':checked');
            var inlineComment = $('.rsa-inline-comment').val() || '';
            $('#rsa-p2-crit').prop('checked', inlineP2Crit);
            $('#rsa-p2-apply-secondary').prop('checked', inlineP2Eff);
            $('#rsa-comment').val(inlineComment);
            // Trigger the main switch button
            $('#rsa-do-switch').trigger('click');
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
                var typeInfo = getMonTypeInfo(data.name, data.setId);
                var entry = createRosterEntry(
                    data.name, data.setId,
                    getSprite(data.name),
                    set ? (set.item || '') : '',
                    set ? (set.ability || '') : '',
                    set ? (set.moves || []) : [],
                    maxHP, typeInfo.types
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

        // ── Tag / Utility analysis button ──
        $(document).on('click', '#rsa-utility-btn', function () {
            var $modal = $('#rsa-utility-modal');
            $modal.find('.rsa-util-body').html(renderUtilityModal());
            $modal.show();
        });
        $(document).on('click', '#rsa-utility-close', function () {
            $('#rsa-utility-modal').hide();
        });

        // ── Battle Tag Analysis button (P1 team header) ──
        $(document).on('click', '#rsa-battletag-btn', function () {
            var $modal = $('#rsa-battletag-modal');
            $modal.find('.rsa-bta-body').html(renderBattleTagModal());
            $modal.show();
        });
        $(document).on('click', '#rsa-battletag-close', function () {
            $('#rsa-battletag-modal').hide();
        });

        // ── Tag filter bar (event delegation) ── filters box, not team panels
        $(document).on('click', '.rsa-tag-filter-btn', function () {
            var tagId = $(this).data('tagid');
            tagFilters.box[tagId] = !tagFilters.box[tagId];
            if (!tagFilters.box[tagId]) delete tagFilters.box[tagId];
            renderBox('p1');
        });
        $(document).on('click', '.rsa-tier-filter-pill', function () {
            var side = $(this).data('side');
            tagTierFilters[side] = $(this).data('tier');
            renderBox('p1');
        });
        $(document).on('click', '.rsa-tag-filter-clear', function () {
            tagFilters.box = {};
            renderBox('p1');
        });
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
            // Re-render card so speed badge updates immediately
            renderTeamPanel(side);
        });

        // ── Inline HP edit on P1 card ──
        $(document).on('change', '.rsa-hp-edit', function () {
            var side = $(this).data('side');
            var idx = parseInt($(this).data('idx'));
            var line = curLine();
            var entry = line.teams[side] && line.teams[side].roster[idx];
            if (!entry) return;
            var val = parseInt($(this).val());
            if (isNaN(val)) val = entry.currentHP;
            val = Math.max(0, Math.min(entry.maxHP, val));
            entry.currentHP = val;
            // User explicitly set HP — clear uncertainty range
            entry.bestCaseHP = val;
            // Remember this as the user-set pre-damage baseline so it can be
            // restored after round deletion (cleared when a round is logged).
            if (side === 'p1') entry.preDamageHP = val;
            // Sync to calc form so damage calculations use the updated HP
            if (idx === line.teams[side].activeIdx) {
                $('#' + side + ' .current-hp').val(val);
                try { performCalculations(); } catch (e) {}
            }
            renderTeamPanel(side);
            autoSave();
        });

        // ── Inline status select on P1 card ──
        $(document).on('change', '.rsa-status-select', function () {
            var side = $(this).data('side');
            var idx = parseInt($(this).data('idx'));
            var val = $(this).val();
            var line = curLine();
            var entry = line.teams[side] && line.teams[side].roster[idx];
            if (!entry) return;
            entry.status = val;
            // Sync to calc form if this is the active mon
            if (idx === line.teams[side].activeIdx) {
                syncStatusToForm(side, entry);
            }
            renderTeamPanel(side);
            autoSave();
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

        // ── Box calc settings panel ──
        $('#rsa-box-settings-toggle').on('click', function () {
            $('#rsa-box-settings').toggle();
        });
        // Restore checkbox/select state from settings
        $('#rsa-set-ignore-sd').prop('checked', boxCalcSettings.ignoreSelfdestruct);
        $('#rsa-set-burn-guts').prop('checked', boxCalcSettings.burnGuts);
        $('#rsa-set-sim-item').val(boxCalcSettings.simItem || '');
        // On setting change: persist, recompute rankings, re-render
        $('#rsa-set-ignore-sd').on('change', function () {
            boxCalcSettings.ignoreSelfdestruct = $(this).is(':checked');
            saveBoxCalcSettings();
            cachedRankings = []; try { cachedRankings = computeBoxRankings(); } catch (e) {}
            renderBox('p1');
        });
        $('#rsa-set-burn-guts').on('change', function () {
            boxCalcSettings.burnGuts = $(this).is(':checked');
            saveBoxCalcSettings();
            cachedRankings = []; try { cachedRankings = computeBoxRankings(); } catch (e) {}
            renderBox('p1');
        });
        $('#rsa-set-sim-item').on('change', function () {
            boxCalcSettings.simItem = $(this).val();
            saveBoxCalcSettings();
            cachedRankings = []; try { cachedRankings = computeBoxRankings(); } catch (e) {}
            renderBox('p1');
        });

        // ── Refresh rankings when P2 changes ──
        $(document).on('change', '#p2 .set-selector', function () {
            setTimeout(function () {
                try { cachedRankings = computeBoxRankings(); } catch (e) { cachedRankings = []; }
                renderBox('p1');
                injectDamageBadges();
            }, 400);
        });

        // ══════════════════════════════════════════════════════════════
        //  RSA Field Bar — wire weather/terrain/trick room controls
        // ══════════════════════════════════════════════════════════════

        // Weather dropdown → sync to hidden radio buttons
        $('#rsa-weather-select').on('change', function () {
            var val = $(this).val();
            if (val) {
                // Map value to the hidden radio id
                var radioMap = {
                    'Sun': 'sun', 'Rain': 'rain', 'Sand': 'sand', 'Snow': 'snow', 'Hail': 'hail',
                    'Harsh Sunshine': 'harsh-sunshine', 'Heavy Rain': 'heavy-rain', 'Strong Winds': 'strong-winds'
                };
                var radioId = radioMap[val];
                if (radioId) $('#' + radioId).prop('checked', true);
            } else {
                // None — check the "clear" radio
                $('input:radio[name="weather"][value=""]').prop('checked', true);
            }
            try { performCalculations(); } catch (e) {}
            updateFieldPanel();
            refreshTeamSpeeds();
        });

        // Permanent weather checkbox
        $('#rsa-perma-weather').on('change', function () {
            curLine().fieldState.permanentWeather = $(this).is(':checked');
            updateFieldPanel();
            autoSave();
        });

        // Terrain dropdown → sync to hidden checkboxes
        $('#rsa-terrain-select').on('change', function () {
            var val = $(this).val();
            // Uncheck all terrain checkboxes first
            $('input:checkbox[name="terrain"]').prop('checked', false);
            if (val) {
                var terrainMap = { 'Electric': 'electric', 'Grassy': 'grassy', 'Misty': 'misty', 'Psychic': 'psychic' };
                var cbId = terrainMap[val];
                if (cbId) $('#' + cbId).prop('checked', true);
            }
            try { performCalculations(); } catch (e) {}
            updateFieldPanel();
            refreshTeamSpeeds();
        });

        // Trick Room toggle
        $('#rsa-trickroom').on('change', function () {
            var on = $(this).is(':checked');
            $('#trickroom').prop('checked', on);
            $(this).closest('.rsa-trickroom-toggle').toggleClass('rsa-tr-active', on);
            try { performCalculations(); } catch (e) {}
            updateFieldPanel();
            autoSave();
        });

        // Field state panel collapse/expand
        $('#rsa-field-panel-toggle').on('click', function () {
            $('#rsa-field-panel').toggleClass('rsa-collapsed');
        });
        // Start collapsed
        $('#rsa-field-panel').addClass('rsa-collapsed');

        // ══════════════════════════════════════════════════════════════
        //  RSA Info Tooltip (ⓘ button) — click to show/hide popup
        // ══════════════════════════════════════════════════════════════
        var _activeInfoPopup = null;

        function closeInfoPopup() {
            if (_activeInfoPopup) { _activeInfoPopup.remove(); _activeInfoPopup = null; }
        }

        function describeAbilityEffects(name) {
            var reg = window.EffectsRegistry && window.EffectsRegistry.ability(name);
            if (!reg) return '';
            var parts = [];
            if (reg.typeImmunity)           parts.push('Immune to ' + reg.typeImmunity);
            if (reg.wonderGuard)            parts.push('Only super-effective moves hit');
            if (reg.speedMod) {
                var cond = reg.speedMod.condition;
                var desc = reg.speedMod.multiplier + '× Speed';
                if (cond) {
                    if (cond.weather)   desc += ' in ' + cond.weather.join('/');
                    if (cond.terrain)   desc += ' on ' + cond.terrain.join('/') + ' Terrain';
                    if (cond.hasStatus) desc += ' when statused';
                }
                parts.push(desc);
            }
            if (reg.weatherDamageImmunity)  parts.push('Immune to weather damage');
            if (reg.indirectDamageImmunity) parts.push('Immune to indirect damage');
            if (reg.recoilImmunity)         parts.push('Immune to recoil');
            if (reg.contactRecoil)          parts.push('1/' + Math.round(1/reg.contactRecoil) + ' attacker HP on contact');
            if (reg.ignoresAbility)         parts.push('Ignores defender abilities');
            if (reg.survivalFullHP)         parts.push('Survives one hit at 1 HP from full');
            if (reg.statusImmunity)         parts.push('Immune to: ' + reg.statusImmunity.join(', '));
            if (reg.burnAttackBoost)        parts.push('Ignores burn Atk drop + chip');
            if (reg.priorityMod) {
                var pm = reg.priorityMod;
                if (pm.condition && pm.condition.alwaysLast) parts.push('Always moves last');
                else parts.push('+' + pm.boost + ' priority' + (pm.condition ? ' (conditional)' : ''));
            }
            if (reg.unburden)               parts.push('2× Speed when item lost');
            return parts.join(' · ');
        }

        function describeItemEffects(name) {
            var reg = window.EffectsRegistry && window.EffectsRegistry.item(name);
            if (!reg) return '';
            var parts = [];
            if (reg.speedMod)                   parts.push(reg.speedMod.multiplier + '× Speed');
            if (reg.contactRecoilToAttacker)    parts.push('1/' + Math.round(1/reg.contactRecoilToAttacker) + ' attacker HP on contact');
            if (reg.attackerSelfRecoil)         parts.push('1/' + Math.round(1/reg.attackerSelfRecoil) + ' self HP after attacking');
            if (reg.eotHealing)                 parts.push('Heals 1/' + Math.round(1/reg.eotHealing.frac) + ' HP/turn');
            if (reg.eotStatusInflict)           parts.push('Inflicts ' + reg.eotStatusInflict + ' at EOT');
            if (reg.survivalFullHP)             parts.push('Survives one hit at 1 HP from full');
            if (reg.statusCure)                 parts.push('Cures ' + reg.statusCure);
            if (reg.hpRestore)                  parts.push('Restores 1/' + Math.round(1/reg.hpRestore.frac) + ' HP');
            if (reg.floatImmunity)              parts.push('Ground immunity (floats)');
            if (reg.hazardImmunity)             parts.push('Immune to hazards');
            if (reg.moveLastInBracket)          parts.push('Moves last in bracket');
            if (reg.contactAvoidance)           parts.push('Avoids contact effects');
            return parts.join(' · ');
        }

        function buildInfoPopup(entry, side) {
            var $pop = $('<div class="rsa-info-popup"></div>');
            var typeSprite = function (t) { return '<img class="rsa-info-type-sprite" src="' + getTypeSpriteUrl(t) + '" alt="' + t + '">'; };

            // Header: sprite + type icons + name
            var spriteSrc = entry.sprite || '';
            var $header = $('<div class="rsa-info-popup-header"></div>');
            if (spriteSrc) $header.append('<img class="rsa-info-popup-sprite" src="' + spriteSrc + '" alt="">');
            var headerTypes = entry.types || [];
            if (!headerTypes.length) {
                try { headerTypes = getMonTypeInfo(entry.name, entry.setId).types || []; } catch(ex){}
            }
            $header.append('<span class="rsa-info-popup-name">' + (entry.species || entry.name || '?') + '</span>');
            for (var _ti = 0; _ti < headerTypes.length; _ti++) {
                $header.append(typeSprite(headerTypes[_ti]));
            }
            $pop.append($header);

            // Types with sprites
            var types = entry.types || [];
            if (types.length) {
                var typeHtml = types.map(function (t) { return typeSprite(t) + ' ' + t; }).join(' / ');
                $pop.append('<div class="rsa-info-row"><span class="rsa-info-key">Types</span><span class="rsa-info-val">' + typeHtml + '</span></div>');
            }

            // Ability
            if (entry.ability) {
                var abEff = describeAbilityEffects(entry.ability);
                $pop.append('<div class="rsa-info-row"><span class="rsa-info-key">Ability</span><span class="rsa-info-val">' + entry.ability +
                    (abEff ? '<br><span class="rsa-info-effect">' + abEff + '</span>' : '') + '</span></div>');
            }

            // Item
            if (entry.item) {
                var itEff = describeItemEffects(entry.item);
                $pop.append('<div class="rsa-info-row"><span class="rsa-info-key">Item</span><span class="rsa-info-val">' + entry.item +
                    (itEff ? '<br><span class="rsa-info-effect">' + itEff + '</span>' : '') + '</span></div>');
            }

            // Stats table — Base / IV / EV / Final / Effective
            try {
                var _poke = createPokemon(entry.setId);
                if (_poke && _poke.stats) {
                    var statNames = [
                        { key: 'hp',  label: 'HP' },
                        { key: 'atk', label: 'Atk' },
                        { key: 'def', label: 'Def' },
                        { key: 'spa', label: 'SpA' },
                        { key: 'spd', label: 'SpD' },
                        { key: 'spe', label: 'Spe' }
                    ];
                    var boostKeyMap = { atk: 'at', def: 'df', spa: 'sa', spd: 'sd', spe: 'sp' };
                    var baseStats = (_poke.species && _poke.species.baseStats) || {};
                    var ivs = _poke.ivs || {};
                    var evs = _poke.evs || {};
                    var nature = _poke.nature || '';

                    var tbl = '<table class="rsa-stat-table"><thead><tr>' +
                        '<th></th><th>Base</th><th>IV</th><th>EV</th><th>Final</th><th>Boost</th><th>Eff.</th>' +
                        '</tr></thead><tbody>';

                    for (var si = 0; si < statNames.length; si++) {
                        var sn = statNames[si];
                        var base = baseStats[sn.key] || 0;
                        var iv = ivs[sn.key] != null ? ivs[sn.key] : 31;
                        var ev = evs[sn.key] || 0;
                        var final = _poke.rawStats[sn.key] || _poke.stats[sn.key] || 0;
                        var bKey = boostKeyMap[sn.key];
                        var boost = (bKey && entry.boosts && entry.boosts[bKey]) || 0;
                        var effective = final;
                        if (sn.key !== 'hp' && boost !== 0) {
                            effective = boost >= 0
                                ? Math.floor(final * (2 + boost) / 2)
                                : Math.floor(final * 2 / (2 - boost));
                        }
                        // Apply speed modifiers for Spe row
                        if (sn.key === 'spe') {
                            var w = getWeather(), t = getTerrain();
                            effective = computeEntrySpeed(entry, w, t);
                        }
                        var boostStr = boost === 0 ? '—' : (boost > 0 ? '<span style="color:#68d391">+' + boost + '</span>' : '<span style="color:#fc8181">' + boost + '</span>');
                        var effStr = (effective !== final || boost !== 0) ? '<b>' + effective + '</b>' : '' + effective;
                        // Highlight nature effects
                        var natureUp = '', natureDown = '';
                        try {
                            var nData = calc.NATURES && calc.NATURES[nature];
                            if (nData) { natureUp = nData[0] || ''; natureDown = nData[1] || ''; }
                        } catch (ex) {}
                        var labelCls = '';
                        if (sn.key === natureUp) labelCls = ' style="color:#68d391"';
                        else if (sn.key === natureDown) labelCls = ' style="color:#fc8181"';

                        tbl += '<tr><td' + labelCls + '>' + sn.label + '</td>' +
                            '<td>' + base + '</td><td>' + iv + '</td><td>' + ev + '</td>' +
                            '<td>' + final + '</td><td>' + boostStr + '</td><td>' + effStr + '</td></tr>';
                    }
                    tbl += '</tbody></table>';
                    if (nature) tbl = '<div class="rsa-info-nature">Nature: <b>' + nature + '</b></div>' + tbl;
                    $pop.append('<div class="rsa-info-stats">' + tbl + '</div>');
                }
            } catch (ex) {}

            // HP
            if (entry.currentHP !== undefined && entry.maxHP) {
                var pct = Math.round(entry.currentHP / entry.maxHP * 100);
                $pop.append('<div class="rsa-info-row"><span class="rsa-info-key">HP</span><span class="rsa-info-val">' +
                    entry.currentHP + '/' + entry.maxHP + ' (' + pct + '%)</span></div>');
            }

            // Status
            if (entry.status && entry.status !== 'Healthy') {
                $pop.append('<div class="rsa-info-row"><span class="rsa-info-key">Status</span><span class="rsa-info-val">' + entry.status + '</span></div>');
            }

            // Defensive Profile (weaknesses/resistances/immunities) with type sprites
            try {
                var tInfo = getMonTypeInfo(entry.name, entry.setId);
                var profile = getDefensiveProfile(tInfo.types, tInfo.ability);
                var immunes = [], quad = [], resists = [], weak = [], quadWeak = [];
                for (var dt in profile) {
                    var m = profile[dt];
                    if (m === 0) immunes.push(dt);
                    else if (m <= 0.25) quad.push(dt);
                    else if (m < 1 && m > 0.25) resists.push(dt);
                    else if (m >= 4) quadWeak.push(dt);
                    else if (m > 1 && m < 4) weak.push(dt);
                }
                var defHtml = '';
                if (immunes.length) defHtml += '<div class="rsa-def-row"><span class="rsa-def-label rsa-def-immune">Immune:</span> ' + immunes.map(function(t){ return typeSprite(t); }).join(' ') + '</div>';
                if (quad.length) defHtml += '<div class="rsa-def-row"><span class="rsa-def-label rsa-def-qresist">¼× Resist:</span> ' + quad.map(function(t){ return typeSprite(t); }).join(' ') + '</div>';
                if (resists.length) defHtml += '<div class="rsa-def-row"><span class="rsa-def-label rsa-def-resist">½× Resist:</span> ' + resists.map(function(t){ return typeSprite(t); }).join(' ') + '</div>';
                if (weak.length) defHtml += '<div class="rsa-def-row"><span class="rsa-def-label rsa-def-weak">2× Weak:</span> ' + weak.map(function(t){ return typeSprite(t); }).join(' ') + '</div>';
                if (quadWeak.length) defHtml += '<div class="rsa-def-row"><span class="rsa-def-label rsa-def-qweak">4× Weak:</span> ' + quadWeak.map(function(t){ return typeSprite(t); }).join(' ') + '</div>';
                if (defHtml) {
                    $pop.append('<div class="rsa-info-defense"><div class="rsa-info-section-title">Defensive Profile</div>' + defHtml + '</div>');
                }
            } catch (ex) {}

            return $pop;
        }

        // Globally delegate click on ⓘ buttons
        $(document).on('click', '.rsa-info-btn', function (e) {
            e.stopPropagation();
            closeInfoPopup();

            var $btn = $(this);
            var side = $btn.data('side');
            var idx = parseInt($btn.data('idx'));
            var line = curLine();
            var team = line.teams[side];
            if (!team || !team.roster[idx]) return;

            var entry = team.roster[idx];
            var $pop = buildInfoPopup(entry, side);

            // Position near the button
            var btnOff = $btn.offset();
            $pop.css({ top: btnOff.top + 22, left: Math.min(btnOff.left, window.innerWidth - 340) });
            $('body').append($pop);
            _activeInfoPopup = $pop;
        });

        // Close popup on click outside
        $(document).on('click', function () { closeInfoPopup(); });

        // ══════════════════════════════════════════════════════════════
        //  Update Field Panel display state
        // ══════════════════════════════════════════════════════════════
        function updateFieldPanel() {
            var w = getWeather(), t = getTerrain();
            var tr = $('#rsa-trickroom').is(':checked');
            var fld = curLine().fieldState;
            var perma = fld.permanentWeather;

            // Weather
            var wText = (w && w !== 'None') ? w : 'None';
            if (wText !== 'None' && perma) wText += ' <span class="rsa-fp-permanent">(Permanent)</span>';
            else if (wText !== 'None' && fld.weatherTurns > 0) wText += ' <span class="rsa-fp-turns">(' + fld.weatherTurns + ' turns)</span>';
            $('#rsa-fp-weather-val').html(wText).toggleClass('rsa-fp-active', wText !== 'None');

            // Terrain
            var tText = (t && t !== 'None') ? t + ' Terrain' : 'None';
            if (tText !== 'None' && fld.terrainTurns > 0) tText += ' (' + fld.terrainTurns + ' turns)';
            $('#rsa-fp-terrain-val').text(tText).toggleClass('rsa-fp-active', tText !== 'None');

            // Trick Room
            var trText = tr ? 'Active' : 'Off';
            if (tr && fld.trickRoomTurns > 0) trText += ' (' + fld.trickRoomTurns + ' turns)';
            $('#rsa-fp-trickroom-val').text(trText).toggleClass('rsa-fp-active', tr);

            // Gravity
            var grav = $('#gravity').is(':checked');
            $('#rsa-fp-gravity-val').text(grav ? 'Active' : 'Off').toggleClass('rsa-fp-active', grav);

            // Screens (per side)
            ['L', 'R'].forEach(function (suffix, i) {
                var side = i === 0 ? 'p1' : 'p2';
                var screens = [];
                if ($('#reflect' + suffix).is(':checked')) {
                    var rTurns = fld.screenTurns && fld.screenTurns['reflect' + suffix];
                    screens.push('Reflect' + (rTurns > 0 ? ' (' + rTurns + ')' : ''));
                }
                if ($('#lightScreen' + suffix).is(':checked')) {
                    var lTurns = fld.screenTurns && fld.screenTurns['lightScreen' + suffix];
                    screens.push('Light Screen' + (lTurns > 0 ? ' (' + lTurns + ')' : ''));
                }
                if ($('#auroraVeil' + suffix).is(':checked')) {
                    var aTurns = fld.screenTurns && fld.screenTurns['auroraVeil' + suffix];
                    screens.push('Aurora Veil' + (aTurns > 0 ? ' (' + aTurns + ')' : ''));
                }
                $('#rsa-fp-screens-' + side + '-val').text(screens.length ? screens.join(', ') : 'None').toggleClass('rsa-fp-active', screens.length > 0);
            });

            // Tailwind (per side)
            ['L', 'R'].forEach(function (suffix, i) {
                var side = i === 0 ? 'p1' : 'p2';
                var tw = $('#tailwind' + suffix).is(':checked');
                var twTurns = fld.tailwindTurns && fld.tailwindTurns[side];
                var twText = tw ? ('Active' + (twTurns > 0 ? ' (' + twTurns + ' turns)' : '')) : 'Off';
                $('#rsa-fp-tailwind-' + side + '-val').text(twText).toggleClass('rsa-fp-active', tw);
            });

            // Hazards
            var fld = curLine().fieldState;
            var hazards = (fld && fld.hazards) || {};
            ['p1', 'p2'].forEach(function (s) {
                var h = hazards[s] || {};
                var parts = [];
                if (h.sr) parts.push('SR');
                if (h.spikes) parts.push('Spikes ×' + h.spikes);
                if (h.tspikes) parts.push('T.Spikes ×' + h.tspikes);
                if (h.stickyWeb) parts.push('Sticky Web');
                $('#rsa-fp-hazards-' + s + '-val').text(parts.length ? parts.join(', ') : 'None').toggleClass('rsa-fp-active', parts.length > 0);
            });

            // Other modifiers
            var others = [];
            if ($('#magicroom').is(':checked')) others.push('Magic Room');
            if ($('#wonderroom').is(':checked')) others.push('Wonder Room');
            ['L', 'R'].forEach(function (suffix, i) {
                var tag = i === 0 ? 'P1' : 'P2';
                if ($('#protect' + suffix).is(':checked')) others.push(tag + ' Protect');
                if ($('#leechSeed' + suffix).is(':checked')) others.push(tag + ' Leech Seed');
                if ($('#foresight' + suffix).is(':checked')) others.push(tag + ' Foresight');
                if ($('#helpingHand' + suffix).is(':checked')) others.push(tag + ' Helping Hand');
                if ($('#substitute' + suffix).is(':checked')) others.push(tag + ' Substitute');
                if ($('#focusEnergy' + suffix).is(':checked')) others.push(tag + ' Focus Energy');
                if ($('#battery' + suffix).is(':checked')) others.push(tag + ' Battery');
                if ($('#powerSpot' + suffix).is(':checked')) others.push(tag + ' Power Spot');
            });
            $('#rsa-fp-other-val').text(others.length ? others.join(', ') : '—').toggleClass('rsa-fp-active', others.length > 0);

            // Also update hazard badges in field bar
            updateHazardBadges();
        }

        function updateHazardBadges() {
            var $container = $('#rsa-hazard-badges').empty();
            var fld = curLine().fieldState;
            var hazards = (fld && fld.hazards) || {};
            ['p1', 'p2'].forEach(function (s) {
                var h = hazards[s] || {};
                var badgeClass = (s === 'p1') ? 'rsa-hz-badge-p1' : 'rsa-hz-badge-p2';
                var prefix = s.toUpperCase() + ': ';
                if (h.sr) $container.append('<span class="rsa-hz-badge ' + badgeClass + '">' + prefix + 'SR</span>');
                if (h.spikes) $container.append('<span class="rsa-hz-badge ' + badgeClass + '">' + prefix + 'Spikes ×' + h.spikes + '</span>');
                if (h.tspikes) $container.append('<span class="rsa-hz-badge ' + badgeClass + '">' + prefix + 'T.Spikes ×' + h.tspikes + '</span>');
                if (h.stickyWeb) $container.append('<span class="rsa-hz-badge ' + badgeClass + '">' + prefix + 'Web</span>');
            });
        }

        // Refresh team speed displays when weather/terrain change
        function refreshTeamSpeeds() {
            try {
                renderTeam('p1');
                renderTeam('p2');
            } catch (e) {}
        }

        // Expose updateFieldPanel for use from other parts of the code
        window._rsaUpdateFieldPanel = updateFieldPanel;

        // ── Inject initial damage badges after calc loads ──
        setTimeout(function () {
            renderBox('p1');
            injectDamageBadges();
            injectMoveLabelSprites();
            // Try to compute initial rankings
            try { cachedRankings = computeBoxRankings(); renderBox('p1'); } catch (e) {}

            // ── MutationObserver: auto-reinject sprites when calc overwrites labels ──
            // performCalculations() in index_randoms_controls.js uses jQuery .text()
            // to write plain move names into the <label> elements, wiping our sprite
            // HTML.  This observer fires as a microtask immediately after the DOM
            // mutation and re-injects sprites synchronously, so the user never sees
            // a frame without sprites.
            var _spriteReinjectPending = false;
            var moveLabels = document.querySelectorAll(
                'label[for^="resultMoveL"], label[for^="resultMoveR"]'
            );
            var spriteObserver = new MutationObserver(function () {
                // Guard: injectMoveLabelSprites itself mutates labels (adding sprite
                // spans), which re-triggers this observer.  The skip-if-present check
                // inside injectMoveLabelSprites handles idempotency, but we still
                // avoid redundant calls in the same microtask batch.
                if (_spriteReinjectPending) return;
                _spriteReinjectPending = true;
                // Use queueMicrotask so all 8 label mutations in one
                // performCalculations() call are batched into one re-inject.
                queueMicrotask(function () {
                    _spriteReinjectPending = false;
                    injectMoveLabelSprites();
                });
            });
            for (var li = 0; li < moveLabels.length; li++) {
                spriteObserver.observe(moveLabels[li], { childList: true, characterData: true, subtree: true });
            }
        }, 2500);
    });

})();
