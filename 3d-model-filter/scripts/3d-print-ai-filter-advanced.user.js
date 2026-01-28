// ==UserScript==
// @name         3D Print AI Filter - Advanced
// @namespace    https://github.com/3d-print-ai-filter
// @version      3.0.0
// @description  Filter AI-generated and low quality models with heuristic detection
// @author       Anonymous
// @match        https://makerworld.com/*
// @match        https://www.makerworld.com/*
// @match        https://printables.com/*
// @match        https://www.printables.com/*
// @match        https://thangs.com/*
// @match        https://www.thangs.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

// advanced version - heuristics + image analysis
// detects untagged AI models by looking at text patterns and image characteristics
// also has quality filtering and engagement filtering

(function() {
    'use strict';

    // ===== CONFIG =====
    var cfg = {
        filterTagged: true,
        filterSuspected: false,
        filterLowQuality: false,
        filterEngagement: false,
        highlightOnly: true,
        showReasons: true,
        analyzeImages: true,
        threshold: 65,
        minLikes: 0,
        minDownloads: 0,
        minMakes: 0,
        whitelist: [],
        blacklist: [],
        markedOk: []
    };

    var stats = { tagged: 0, suspected: 0, lowq: 0, eng: 0, clean: 0 };

    // ===== AI TOOLS DATABASE =====
    // keep adding to this as new tools come out
    var aiTools = [
        'meshy', 'meshy.ai', 'tripo', 'tripo3d', 'tripo ai', 'rodin',
        'rodin gen-1', 'rodin gen', 'luma ai', 'luma genie', 'luma 3d',
        'csm ai', 'csm.ai', 'kaedim', 'kaedim3d', 'alpha3d', 'alpha 3d',
        'masterpiece studio', 'masterpiece x', 'spline ai', 'spline.ai',
        'point-e', 'pointe', 'openai point', 'shap-e', 'shape', 'openai shape',
        'get3d', 'nvidia get3d', 'dreamfusion', 'google dreamfusion',
        'magic3d', 'nvidia magic3d', 'fantasia3d', 'zero123', 'zero-1-to-3',
        'one-2-3-45', 'wonder3d', 'instant3d', 'threestudio', 'three studio',
        'text2mesh', 'dreamgaussian', 'dream gaussian', 'gsgen', 'gs-gen',
        'luciddreamer', 'lucid dreamer', '3dfy', '3dfy.ai', 'anything world',
        'leonardo ai', 'leonardo.ai', 'leonardo 3d', 'sloyd', 'sloyd.ai',
        'sudoai', 'sudo ai', 'opus ai', 'mochi', 'mochi diffusion',
        'hyper human', 'hyperhuman', 'hyper3d', 'stable diffusion 3d',
        'sd 3d', 'deepmotion', 'move ai', 'moveai', 'plask', 'plask.ai',
        'radical ai', 'kinetix', 'genmo', 'genmo ai', 'pika 3d', 'pika labs',
        'runway 3d', 'runwayml', 'krea 3d', 'krea.ai', 'midjourney 3d',
        'dall-e 3d', 'dalle 3d', 'firefly 3d', 'adobe firefly',
        'imagen 3d', 'google imagen', 'text-to-3d', 'text to 3d',
        'image-to-3d', 'image to 3d', 'img2mesh', 'pic2mesh', 'photo to 3d',
        'picture to 3d', 'ai generated', 'ai-generated', 'aigc',
        'ai sculpture', 'ai figurine', 'ai creation', 'neural 3d',
        'gpt 3d', 'chatgpt 3d', 'ai mesh', 'auto3d', 'instant mesh'
    ];

    // phrases strongly suggesting AI
    var aiPhrases = [
        'generated this model', 'generated using', 'generated with',
        'created using ai', 'created with ai', 'made using ai', 'made with ai',
        'generated from image', 'generated from photo', 'generated from picture',
        'converted from image', 'converted from photo', 'converted to 3d',
        'image to 3d', 'photo to 3d', 'picture to 3d', 'text to 3d',
        'prompt to 3d', 'described to 3d', 'ai generated', 'ai-generated',
        'aigc model', 'generative ai', 'generative model',
        'neural network generated', 'machine learning generated',
        'automatically generated', 'auto-generated model', 'auto generated'
    ];

    // phrases suggesting human made (reduce score)
    var humanPhrases = [
        'designed by me', 'designed myself', 'i designed', 'my design',
        'i created', 'i made', 'i modeled', 'my own design',
        'hand made', 'handmade', 'hand-made', 'hand crafted', 'handcrafted',
        'hand-crafted', 'manually created', 'manually designed',
        'modeled in blender', 'modeled in fusion', 'modeled in solidworks',
        'modeled in freecad', 'modeled in openscad', 'modeled in tinkercad',
        'modeled in maya', 'modeled in 3ds max', 'modeled in cinema 4d',
        'modeled in rhino', 'modeled in sketchup', 'modeled in inventor',
        'created in blender', 'created in fusion', 'made in blender',
        'designed in fusion', 'designed in solidworks', 'designed in freecad',
        'sculpted in zbrush', 'sculpted by hand', 'digital sculpt',
        'hours of work', 'took me hours', 'spent hours', 'many hours',
        'days of work', 'weeks of work', 'months of work',
        'no ai', 'not ai', 'without ai', 'ai free', 'ai-free',
        'original design', 'my original', 'from scratch', 'scratch built'
    ];

    // generic AI-style titles
    var genericTitles = [
        'cute', 'kawaii', 'chibi', 'adorable', 'little', 'tiny', 'mini',
        'baby', 'smol', 'chonky', 'chubby', 'fat', 'thicc',
        'dragon', 'cat', 'dog', 'bunny', 'rabbit', 'bear', 'fox', 'owl',
        'wolf', 'deer', 'frog', 'turtle', 'fish', 'shark', 'whale',
        'unicorn', 'phoenix', 'griffin', 'pegasus', 'fairy', 'elf',
        'robot', 'mech', 'mecha', 'cyborg', 'android', 'bot',
        'creature', 'monster', 'alien', 'beast', 'demon', 'angel',
        'fantasy', 'magical', 'mystical', 'enchanted', 'mythical',
        '3d model of', 'model of a', 'sculpture of', 'figurine of',
        'statue of', 'bust of', 'figure of', 'toy of',
        'printable', 'stl file', 'high detail', 'detailed', 'hd',
        'low poly', 'high poly', 'game ready', 'print ready'
    ];

    // ===== STYLES =====
    var css = '#aif-panel{position:fixed;bottom:20px;right:20px;background:#1a1a2e;color:#eee;padding:12px;border-radius:8px;font-family:system-ui,sans-serif;font-size:12px;z-index:99999;min-width:220px;box-shadow:0 4px 20px rgba(0,0,0,0.5)}#aif-panel h3{margin:0 0 8px;font-size:14px}#aif-panel label{display:flex;align-items:center;margin:3px 0;cursor:pointer;gap:6px}#aif-panel input[type="checkbox"]{margin:0}#aif-panel .stats{display:flex;gap:6px;margin:8px 0;flex-wrap:wrap}#aif-panel .st{background:#2a2a4e;padding:3px 6px;border-radius:4px;font-size:10px}#aif-panel .st.tag{color:#ff6b6b}#aif-panel .st.sus{color:#ffa94d}#aif-panel .st.low{color:#845ef7}#aif-panel .st.eng{color:#339af0}#aif-panel .st.ok{color:#51cf66}#aif-panel button{background:#4a4a6e;color:#fff;border:none;padding:5px 8px;border-radius:4px;cursor:pointer;margin:2px;font-size:10px}#aif-panel button:hover{background:#5a5a8e}#aif-panel .sec{margin:6px 0;padding:6px 0;border-top:1px solid #333}#aif-panel input[type="range"]{width:100%}#aif-panel input[type="number"]{width:45px;background:#2a2a4e;color:#fff;border:1px solid #444;border-radius:3px;padding:2px}#aif-panel .modal{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a2e;padding:20px;border-radius:8px;z-index:100001;min-width:280px;max-height:70vh;overflow-y:auto}#aif-panel .modal textarea{width:100%;height:80px;background:#2a2a4e;color:#fff;border:1px solid #444;border-radius:4px;padding:6px;font-size:11px}#aif-panel .overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:100000}.aif-tag{outline:3px solid #ff6b6b !important;outline-offset:-3px}.aif-sus{outline:3px solid #ffa94d !important;outline-offset:-3px}.aif-low{outline:3px solid #845ef7 !important;outline-offset:-3px}.aif-eng{outline:3px solid #339af0 !important;outline-offset:-3px}.aif-hide{display:none !important}.aif-reason{position:absolute;bottom:100%;left:0;background:#1a1a2e;color:#fff;padding:5px 8px;border-radius:4px;font-size:10px;white-space:nowrap;z-index:10000;opacity:0;transition:opacity 0.15s;pointer-events:none}.aif-card:hover .aif-reason{opacity:1}.aif-btns{position:absolute;top:4px;right:4px;display:none;gap:2px;z-index:100}.aif-card:hover .aif-btns{display:flex}.aif-btns button{background:#1a1a2ecc;color:#fff;border:none;padding:2px 5px;border-radius:3px;cursor:pointer;font-size:9px}.aif-btns button:hover{background:#4a4a6e}';

    // ===== HELPERS =====

    function loadCfg() {
        try {
            var s = GM_getValue('aif_cfg_v3', null);
            if (s) {
                var p = JSON.parse(s);
                for (var k in p) if (cfg.hasOwnProperty(k)) cfg[k] = p[k];
            }
        } catch(e) { console.log('aif: load err', e); }
    }

    function saveCfg() {
        try { GM_setValue('aif_cfg_v3', JSON.stringify(cfg)); }
        catch(e) { console.log('aif: save err', e); }
    }

    function getSite() {
        var h = location.hostname;
        if (h.includes('makerworld')) return 'mw';
        if (h.includes('printables')) return 'pr';
        if (h.includes('thangs')) return 'th';
        return '??';
    }

    // ===== DETECTION =====

    function checkTagged(card, site) {
        var html = card.innerHTML.toLowerCase();
        var href = card.querySelector('a')?.href || '';

        if (site === 'mw') {
            if (card.querySelector('[class*="aigc"]') || card.querySelector('[class*="AIGC"]')) return true;
            if (html.includes('aigc')) return true;
            if (href.includes('/2000') || href.includes('/2006') || href.includes('generative')) return true;
        }
        if (site === 'pr') {
            if (card.querySelector('.tag-ai') || card.querySelector('[class*="ai-tag"]')) return true;
            if (html.includes('ai-generated')) return true;
        }
        if (site === 'th') {
            if (html.includes('ai-generated') || html.includes('aigc')) return true;
        }
        return false;
    }

    function checkHeuristic(card) {
        var score = 0;
        var reasons = [];
        var txt = (card.textContent || '').toLowerCase();
        var title = '';
        var titleEl = card.querySelector('h2, h3, h4, .title, [class*="title"], [class*="name"], [class*="Title"], [class*="Name"]');
        if (titleEl) title = titleEl.textContent.toLowerCase();

        // check AI tool mentions with context
        for (var i = 0; i < aiTools.length; i++) {
            var tool = aiTools[i];
            var idx = txt.indexOf(tool);
            if (idx !== -1) {
                // get surrounding context
                var start = Math.max(0, idx - 40);
                var end = Math.min(txt.length, idx + tool.length + 40);
                var ctx = txt.substring(start, end);

                // skip if negative context
                if (ctx.includes('not ') || ctx.includes('no ') || ctx.includes('without') ||
                    ctx.includes('hate') || ctx.includes('dislike') || ctx.includes('ban') ||
                    ctx.includes('filter') || ctx.includes('block') || ctx.includes('anti')) {
                    continue;
                }

                // strong context
                if (ctx.includes('made with') || ctx.includes('created with') ||
                    ctx.includes('generated') || ctx.includes('using') || ctx.includes('from')) {
                    score += 35;
                    reasons.push(tool + ' (confirmed)');
                } else {
                    score += 12;
                    reasons.push(tool + ' mentioned');
                }
                break; // only count one tool
            }
        }

        // check AI phrases
        for (var j = 0; j < aiPhrases.length; j++) {
            if (txt.includes(aiPhrases[j])) {
                score += 30;
                reasons.push('"' + aiPhrases[j] + '"');
                break;
            }
        }

        // check human phrases (reduce)
        for (var k = 0; k < humanPhrases.length; k++) {
            if (txt.includes(humanPhrases[k])) {
                score = Math.max(0, score - 25);
                reasons.push('human claim (-25)');
                break;
            }
        }

        // generic title check
        var genericHits = 0;
        for (var m = 0; m < genericTitles.length; m++) {
            if (title.includes(genericTitles[m])) genericHits++;
        }
        if (genericHits >= 2) {
            score += 10;
            reasons.push('generic title');
        }

        // very short text
        if (txt.length < 50) {
            score += 8;
            reasons.push('minimal text');
        }

        return { score: Math.min(100, score), reasons: reasons };
    }

    function checkQuality(card) {
        var score = 0;
        var reasons = [];
        var txt = (card.textContent || '').toLowerCase();

        // no print evidence
        if (!txt.includes('print') && !txt.includes('printed') && !txt.includes('pla') &&
            !txt.includes('petg') && !txt.includes('abs') && !txt.includes('filament')) {
            score += 20;
            reasons.push('no print info');
        }

        // minimal description
        if (txt.length < 30) {
            score += 25;
            reasons.push('tiny description');
        } else if (txt.length < 80) {
            score += 12;
            reasons.push('short description');
        }

        // no settings
        if (!txt.includes('layer') && !txt.includes('infill') && !txt.includes('support') &&
            !txt.includes('setting') && !txt.includes('nozzle') && !txt.includes('speed')) {
            score += 15;
            reasons.push('no settings');
        }

        return { score: Math.min(100, score), reasons: reasons };
    }

    function checkEngagement(card) {
        var txt = card.textContent || '';
        var likes = 0, dl = 0, makes = 0;

        var lm = txt.match(/(\d+)\s*(like|heart|♥|❤)/i);
        var dm = txt.match(/(\d+)\s*(download|dl)/i);
        var mm = txt.match(/(\d+)\s*(make|print|made)/i);

        if (lm) likes = parseInt(lm[1]);
        if (dm) dl = parseInt(dm[1]);
        if (mm) makes = parseInt(mm[1]);

        var fails = [];
        if (cfg.minLikes > 0 && likes < cfg.minLikes) fails.push('likes:' + likes);
        if (cfg.minDownloads > 0 && dl < cfg.minDownloads) fails.push('dl:' + dl);
        if (cfg.minMakes > 0 && makes < cfg.minMakes) fails.push('makes:' + makes);

        return { pass: fails.length === 0, reasons: fails };
    }

    // ===== IMAGE ANALYSIS =====

    function analyzeImg(img) {
        return new Promise(function(resolve) {
            if (!img || !img.complete || !img.naturalWidth) {
                resolve({ score: 0, reasons: [] });
                return;
            }
            try {
                var c = document.createElement('canvas');
                var ctx = c.getContext('2d');
                var sz = 80;
                c.width = sz; c.height = sz;
                ctx.drawImage(img, 0, 0, sz, sz);
                var d = ctx.getImageData(0, 0, sz, sz).data;

                var smooth = calcSmooth(d, sz);
                var band = calcBand(d, sz);
                var edge = calcEdge(d, sz);
                var sat = calcSat(d);
                var bg = calcBg(d, sz);
                var noise = calcNoise(d, sz);

                var score = 0;
                var reasons = [];

                if (smooth > 0.88) { score += 25; reasons.push('very smooth'); }
                else if (smooth > 0.75) { score += 12; reasons.push('smooth'); }

                if (band > 0.55) { score += 18; reasons.push('banding'); }
                if (edge < 0.025) { score += 15; reasons.push('low edges'); }
                if (sat > 0.6) { score += 10; reasons.push('saturated'); }
                if (bg > 0.82) { score += 12; reasons.push('uniform bg'); }
                if (noise < 0.015) { score += 12; reasons.push('no noise'); }

                resolve({ score: Math.min(100, score), reasons: reasons });
            } catch(e) {
                resolve({ score: 0, reasons: [] });
            }
        });
    }

    function calcSmooth(d, sz) {
        var diff = 0, n = 0;
        for (var y = 0; y < sz - 1; y++) {
            for (var x = 0; x < sz - 1; x++) {
                var i = (y * sz + x) * 4;
                var j = (y * sz + x + 1) * 4;
                diff += Math.abs(d[i] - d[j]) + Math.abs(d[i+1] - d[j+1]) + Math.abs(d[i+2] - d[j+2]);
                n++;
            }
        }
        return 1 - (diff / n / 765);
    }

    function calcBand(d, sz) {
        var bands = 0, n = 0;
        for (var y = 1; y < sz - 1; y++) {
            for (var x = 1; x < sz - 1; x++) {
                var i = (y * sz + x) * 4;
                var up = ((y-1) * sz + x) * 4;
                var dn = ((y+1) * sz + x) * 4;
                var sameU = Math.abs(d[i] - d[up]) < 5 && Math.abs(d[i+1] - d[up+1]) < 5;
                var sameD = Math.abs(d[i] - d[dn]) < 5 && Math.abs(d[i+1] - d[dn+1]) < 5;
                if (sameU && sameD) bands++;
                n++;
            }
        }
        return bands / n;
    }

    function calcEdge(d, sz) {
        var edges = 0, n = 0;
        for (var y = 1; y < sz - 1; y++) {
            for (var x = 1; x < sz - 1; x++) {
                var i = (y * sz + x) * 4;
                var l = (y * sz + x - 1) * 4;
                var r = (y * sz + x + 1) * 4;
                var u = ((y-1) * sz + x) * 4;
                var dn = ((y+1) * sz + x) * 4;
                var gx = Math.abs(d[r] - d[l]);
                var gy = Math.abs(d[dn] - d[u]);
                if (Math.sqrt(gx*gx + gy*gy) > 30) edges++;
                n++;
            }
        }
        return edges / n;
    }

    function calcSat(d) {
        var total = 0, n = 0;
        for (var i = 0; i < d.length; i += 4) {
            var mx = Math.max(d[i], d[i+1], d[i+2]);
            var mn = Math.min(d[i], d[i+1], d[i+2]);
            total += mx === 0 ? 0 : (mx - mn) / mx;
            n++;
        }
        return total / n;
    }

    function calcBg(d, sz) {
        var corners = [[0,0],[sz-1,0],[0,sz-1],[sz-1,sz-1],[5,5],[sz-6,5],[5,sz-6],[sz-6,sz-6]];
        var cols = corners.map(function(c) {
            var i = (c[1] * sz + c[0]) * 4;
            return [d[i], d[i+1], d[i+2]];
        });
        var diff = 0;
        for (var i = 0; i < cols.length - 1; i++) {
            for (var j = i + 1; j < cols.length; j++) {
                diff += Math.abs(cols[i][0] - cols[j][0]) + Math.abs(cols[i][1] - cols[j][1]) + Math.abs(cols[i][2] - cols[j][2]);
            }
        }
        return 1 - (diff / 28 / 765);
    }

    function calcNoise(d, sz) {
        var noise = 0, n = 0;
        for (var y = 1; y < sz - 1; y += 2) {
            for (var x = 1; x < sz - 1; x += 2) {
                var i = (y * sz + x) * 4;
                var avg = (d[((y-1)*sz+x)*4] + d[((y+1)*sz+x)*4] + d[(y*sz+x-1)*4] + d[(y*sz+x+1)*4]) / 4;
                var df = Math.abs(d[i] - avg);
                if (df > 3 && df < 20) noise++;
                n++;
            }
        }
        return noise / n;
    }

    // ===== CARD PROCESSING =====

    function getSelector(site) {
        if (site === 'mw') return '.model-card,[class*="ModelCard"],[class*="model-card"],[class*="DesignCard"],a[href*="/models/"]';
        if (site === 'pr') return '.print-card,[class*="PrintCard"],[class*="print-card"],a[href*="/model/"]';
        if (site === 'th') return '.model-card,[class*="ModelCard"],[class*="ThingCard"],a[href*="/3d-model/"]';
        return '[class*="card"],[class*="Card"]';
    }

    function getCreator(card) {
        var sels = ['[class*="author"]','[class*="creator"]','[class*="user"]','[class*="Author"]','[class*="Creator"]','.username','a[href*="/user/"]','a[href*="/@"]'];
        for (var i = 0; i < sels.length; i++) {
            var el = card.querySelector(sels[i]);
            if (el) {
                var n = el.textContent.trim().toLowerCase();
                if (n && n.length > 0 && n.length < 50) return n;
            }
        }
        return null;
    }

    function getModelId(card) {
        var a = card.querySelector('a[href*="model"]');
        if (a) {
            var m = a.href.match(/models?\/(\d+)/);
            if (m) return m[1];
        }
        return card.getAttribute('data-id') || null;
    }

    async function processCard(card, site) {
        if (card.hasAttribute('data-aif')) return;
        card.setAttribute('data-aif', '1');

        var creator = getCreator(card);
        var modelId = getModelId(card);

        // whitelist check
        if (creator && cfg.whitelist.includes(creator)) {
            stats.clean++;
            return;
        }
        if (modelId && cfg.markedOk.includes(modelId)) {
            stats.clean++;
            return;
        }

        // blacklist check
        if (creator && cfg.blacklist.includes(creator)) {
            flagCard(card, 'tag', ['blacklisted'], creator, modelId);
            stats.tagged++;
            return;
        }

        var dominated = false;
        var type = null;
        var allReasons = [];

        // 1. tagged
        if (cfg.filterTagged && checkTagged(card, site)) {
            type = 'tag';
            allReasons.push('AIGC tag');
            dominated = true;
            stats.tagged++;
        }

        // 2. heuristic
        if (!dominated && cfg.filterSuspected) {
            var h = checkHeuristic(card);

            if (cfg.analyzeImages) {
                var img = card.querySelector('img');
                if (img) {
                    var imgRes = await analyzeImg(img);
                    h.score += imgRes.score * 0.4;
                    allReasons = allReasons.concat(imgRes.reasons);
                }
            }

            allReasons = allReasons.concat(h.reasons);

            if (h.score >= cfg.threshold) {
                type = 'sus';
                dominated = true;
                stats.suspected++;
            }
        }

        // 3. quality
        if (!dominated && cfg.filterLowQuality) {
            var q = checkQuality(card);
            if (q.score >= 45) {
                type = 'low';
                allReasons = allReasons.concat(q.reasons);
                dominated = true;
                stats.lowq++;
            }
        }

        // 4. engagement
        if (!dominated && cfg.filterEngagement) {
            var e = checkEngagement(card);
            if (!e.pass) {
                type = 'eng';
                allReasons = allReasons.concat(e.reasons);
                dominated = true;
                stats.eng++;
            }
        }

        if (dominated) {
            flagCard(card, type, allReasons, creator, modelId);
        } else {
            stats.clean++;
        }
    }

    function flagCard(card, type, reasons, creator, modelId) {
        card.classList.add('aif-card');

        if (cfg.highlightOnly) {
            card.classList.remove('aif-tag', 'aif-sus', 'aif-low', 'aif-eng');
            card.classList.add('aif-' + type);
        } else {
            card.classList.add('aif-hide');
        }

        // tooltip
        if (cfg.showReasons && reasons.length > 0) {
            var old = card.querySelector('.aif-reason');
            if (old) old.remove();
            var tip = document.createElement('div');
            tip.className = 'aif-reason';
            tip.textContent = reasons.slice(0, 3).join(' | ');
            card.style.position = 'relative';
            card.appendChild(tip);
        }

        // action buttons
        var oldBtns = card.querySelector('.aif-btns');
        if (oldBtns) oldBtns.remove();

        var btns = document.createElement('div');
        btns.className = 'aif-btns';

        if (modelId) {
            var okBtn = document.createElement('button');
            okBtn.textContent = 'ok';
            okBtn.title = 'not AI';
            okBtn.onclick = function(e) {
                e.preventDefault(); e.stopPropagation();
                if (!cfg.markedOk.includes(modelId)) {
                    cfg.markedOk.push(modelId);
                    saveCfg();
                }
                unflag(card);
            };
            btns.appendChild(okBtn);
        }

        if (creator) {
            var wlBtn = document.createElement('button');
            wlBtn.textContent = '+';
            wlBtn.title = 'trust ' + creator;
            wlBtn.onclick = function(e) {
                e.preventDefault(); e.stopPropagation();
                if (!cfg.whitelist.includes(creator)) {
                    cfg.whitelist.push(creator);
                    saveCfg();
                }
                unflag(card);
            };
            btns.appendChild(wlBtn);

            var blBtn = document.createElement('button');
            blBtn.textContent = 'x';
            blBtn.title = 'block ' + creator;
            blBtn.onclick = function(e) {
                e.preventDefault(); e.stopPropagation();
                if (!cfg.blacklist.includes(creator)) {
                    cfg.blacklist.push(creator);
                    saveCfg();
                }
            };
            btns.appendChild(blBtn);
        }

        card.appendChild(btns);
    }

    function unflag(card) {
        card.classList.remove('aif-tag', 'aif-sus', 'aif-low', 'aif-eng', 'aif-hide', 'aif-card');
        var r = card.querySelector('.aif-reason');
        if (r) r.remove();
        var b = card.querySelector('.aif-btns');
        if (b) b.remove();
    }

    // ===== UI =====

    function createPanel() {
        var p = document.createElement('div');
        p.id = 'aif-panel';
        p.innerHTML = '<h3>AI Filter</h3>' +
            '<div class="stats">' +
            '<span class="st tag">TAG:<span id="aif-s-tag">0</span></span>' +
            '<span class="st sus">SUS:<span id="aif-s-sus">0</span></span>' +
            '<span class="st low">LOW:<span id="aif-s-low">0</span></span>' +
            '<span class="st eng">ENG:<span id="aif-s-eng">0</span></span>' +
            '<span class="st ok">OK:<span id="aif-s-ok">0</span></span>' +
            '</div>' +
            '<div class="sec">' +
            '<label><input type="checkbox" id="aif-tagged"> Tagged AI</label>' +
            '<label><input type="checkbox" id="aif-suspected"> Suspected AI</label>' +
            '<label><input type="checkbox" id="aif-lowq"> Low Quality</label>' +
            '<label><input type="checkbox" id="aif-eng"> Engagement</label>' +
            '</div>' +
            '<div class="sec">' +
            '<label><input type="checkbox" id="aif-hl"> Highlight only</label>' +
            '<label><input type="checkbox" id="aif-reasons"> Show reasons</label>' +
            '<label><input type="checkbox" id="aif-img"> Analyze images</label>' +
            '</div>' +
            '<div class="sec">' +
            '<label>Threshold: <span id="aif-tv">65</span></label>' +
            '<input type="range" id="aif-thresh" min="0" max="100" value="65">' +
            '</div>' +
            '<div class="sec" id="aif-eng-sec" style="display:none">' +
            '<label>Min likes: <input type="number" id="aif-ml" min="0" value="0"></label>' +
            '<label>Min downloads: <input type="number" id="aif-md" min="0" value="0"></label>' +
            '<label>Min makes: <input type="number" id="aif-mm" min="0" value="0"></label>' +
            '</div>' +
            '<div class="sec">' +
            '<button id="aif-manage">lists</button>' +
            '<button id="aif-export">export</button>' +
            '<button id="aif-import">import</button>' +
            '<button id="aif-rescan">rescan</button>' +
            '</div>';
        document.body.appendChild(p);
        bindEvents();
        syncPanel();
    }

    function bindEvents() {
        var $ = function(id) { return document.getElementById(id); };

        $('aif-tagged').onchange = function() { cfg.filterTagged = this.checked; saveCfg(); rescan(); };
        $('aif-suspected').onchange = function() { cfg.filterSuspected = this.checked; saveCfg(); rescan(); };
        $('aif-lowq').onchange = function() { cfg.filterLowQuality = this.checked; saveCfg(); rescan(); };
        $('aif-eng').onchange = function() {
            cfg.filterEngagement = this.checked;
            $('aif-eng-sec').style.display = this.checked ? 'block' : 'none';
            saveCfg(); rescan();
        };

        $('aif-hl').onchange = function() { cfg.highlightOnly = this.checked; saveCfg(); rescan(); };
        $('aif-reasons').onchange = function() { cfg.showReasons = this.checked; saveCfg(); rescan(); };
        $('aif-img').onchange = function() { cfg.analyzeImages = this.checked; saveCfg(); rescan(); };

        $('aif-thresh').oninput = function() {
            cfg.threshold = parseInt(this.value);
            $('aif-tv').textContent = this.value;
            saveCfg();
        };
        $('aif-thresh').onchange = rescan;

        $('aif-ml').onchange = function() { cfg.minLikes = parseInt(this.value) || 0; saveCfg(); rescan(); };
        $('aif-md').onchange = function() { cfg.minDownloads = parseInt(this.value) || 0; saveCfg(); rescan(); };
        $('aif-mm').onchange = function() { cfg.minMakes = parseInt(this.value) || 0; saveCfg(); rescan(); };

        $('aif-manage').onclick = showManage;
        $('aif-export').onclick = doExport;
        $('aif-import').onclick = doImport;
        $('aif-rescan').onclick = rescan;
    }

    function syncPanel() {
        var $ = function(id) { return document.getElementById(id); };
        $('aif-tagged').checked = cfg.filterTagged;
        $('aif-suspected').checked = cfg.filterSuspected;
        $('aif-lowq').checked = cfg.filterLowQuality;
        $('aif-eng').checked = cfg.filterEngagement;
        $('aif-hl').checked = cfg.highlightOnly;
        $('aif-reasons').checked = cfg.showReasons;
        $('aif-img').checked = cfg.analyzeImages;
        $('aif-thresh').value = cfg.threshold;
        $('aif-tv').textContent = cfg.threshold;
        $('aif-ml').value = cfg.minLikes;
        $('aif-md').value = cfg.minDownloads;
        $('aif-mm').value = cfg.minMakes;
        $('aif-eng-sec').style.display = cfg.filterEngagement ? 'block' : 'none';
    }

    function updateStats() {
        document.getElementById('aif-s-tag').textContent = stats.tagged;
        document.getElementById('aif-s-sus').textContent = stats.suspected;
        document.getElementById('aif-s-low').textContent = stats.lowq;
        document.getElementById('aif-s-eng').textContent = stats.eng;
        document.getElementById('aif-s-ok').textContent = stats.clean;
    }

    // ===== LIST MANAGEMENT =====

    function showManage() {
        var ov = document.createElement('div');
        ov.className = 'overlay';
        ov.onclick = function(e) { if (e.target === ov) ov.remove(); };

        var m = document.createElement('div');
        m.className = 'modal';
        m.innerHTML = '<h3>Manage Lists</h3>' +
            '<div><h4>Trusted (whitelist)</h4><textarea id="aif-wl">' + cfg.whitelist.join('\n') + '</textarea></div>' +
            '<div><h4>Blocked (blacklist)</h4><textarea id="aif-bl">' + cfg.blacklist.join('\n') + '</textarea></div>' +
            '<div><button id="aif-save">Save</button> <button id="aif-close">Close</button></div>';
        ov.appendChild(m);
        document.body.appendChild(ov);

        document.getElementById('aif-save').onclick = function() {
            cfg.whitelist = document.getElementById('aif-wl').value.split('\n').map(function(s) { return s.trim().toLowerCase(); }).filter(function(s) { return s; });
            cfg.blacklist = document.getElementById('aif-bl').value.split('\n').map(function(s) { return s.trim().toLowerCase(); }).filter(function(s) { return s; });
            saveCfg();
            ov.remove();
            rescan();
        };
        document.getElementById('aif-close').onclick = function() { ov.remove(); };
    }

    function doExport() {
        var data = { whitelist: cfg.whitelist, blacklist: cfg.blacklist, markedOk: cfg.markedOk, date: new Date().toISOString() };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'aifilter-lists.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function doImport() {
        var inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.json';
        inp.onchange = function(e) {
            var f = e.target.files[0];
            if (!f) return;
            var r = new FileReader();
            r.onload = function(ev) {
                try {
                    var d = JSON.parse(ev.target.result);
                    if (d.whitelist) cfg.whitelist = cfg.whitelist.concat(d.whitelist);
                    if (d.blacklist) cfg.blacklist = cfg.blacklist.concat(d.blacklist);
                    if (d.markedOk) cfg.markedOk = cfg.markedOk.concat(d.markedOk);
                    cfg.whitelist = [...new Set(cfg.whitelist)];
                    cfg.blacklist = [...new Set(cfg.blacklist)];
                    cfg.markedOk = [...new Set(cfg.markedOk)];
                    saveCfg();
                    rescan();
                    alert('Imported!');
                } catch(err) {
                    alert('Error: ' + err.message);
                }
            };
            r.readAsText(f);
        };
        inp.click();
    }

    // ===== SCAN =====

    function rescan() {
        stats = { tagged: 0, suspected: 0, lowq: 0, eng: 0, clean: 0 };
        document.querySelectorAll('[data-aif]').forEach(function(c) {
            c.removeAttribute('data-aif');
            unflag(c);
        });
        scan();
    }

    async function scan() {
        var site = getSite();
        var sel = getSelector(site);
        var cards = document.querySelectorAll(sel);
        for (var i = 0; i < cards.length; i++) {
            await processCard(cards[i], site);
        }
        updateStats();
    }

    // ===== INIT =====

    function init() {
        GM_addStyle(css);
        loadCfg();
        createPanel();

        setTimeout(scan, 1000);

        var obs = new MutationObserver(function(muts) {
            var dominated = false;
            for (var i = 0; i < muts.length; i++) {
                if (muts[i].addedNodes.length) { dominated = true; break; }
            }
            if (dominated) setTimeout(scan, 400);
        });
        obs.observe(document.body, { childList: true, subtree: true });

        var lastUrl = location.href;
        setInterval(function() {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                setTimeout(rescan, 800);
            }
        }, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
