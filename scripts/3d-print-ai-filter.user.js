// ==UserScript==
// @name         3D Print AI Filter
// @namespace    https://github.com/achyutsharma/3d-print-ai-filter
// @version      3.0.0
// @description  Filter out AI generated models from makerworld, printables, thangs
// @author       Achyut Sharma
// @match        https://makerworld.com/*
// @match        https://www.makerworld.com/*
// @match        https://printables.com/*
// @match        https://www.printables.com/*
// @match        https://thangs.com/*
// @match        https://www.thangs.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

/*
    3D Print AI Filter v3.0.0
    by Achyut Sharma
    
    i got mass downvoted for complaining about AI slop on makerworld so i built this instead
    
    v3 adds:
    - "why flagged" tooltips (finally)
    - engagement filters (min likes/downloads/makes)
    - creator behavior analysis
    - duplicate description detection
    - image analysis for renders vs photos
    - account age checking
    - better context detection so it wont flag "no AI used"
    
    TODO:
    - better thangs support (their html is a mess)
    - maybe add thingiverse if i can figure out their layout
    - community shared blocklists would be cool
*/

(function() {
    'use strict';

    var VERSION = '3.0.0';

    // config
    var cfg = {
        filterTagged: GM_getValue('filterTagged', true),
        filterSuspected: GM_getValue('filterSuspected', false),
        filterLowQual: GM_getValue('filterLowQual', false),
        engagementFilter: GM_getValue('engagementFilter', false),
        
        threshold: GM_getValue('threshold', 65),
        qualThreshold: GM_getValue('qualThreshold', 35),
        
        highlightOnly: GM_getValue('highlightOnly', true),
        showWhyFlagged: GM_getValue('showWhyFlagged', true),
        showScores: GM_getValue('showScores', false),
        analyzeImgs: GM_getValue('analyzeImgs', true),
        analyzeCreatorBehavior: GM_getValue('analyzeCreatorBehavior', true),
        checkAccountAge: GM_getValue('checkAccountAge', true),
        
        minLikes: GM_getValue('minLikes', 0),
        minDownloads: GM_getValue('minDownloads', 0),
        minMakes: GM_getValue('minMakes', 0),
        hideNewAccounts: GM_getValue('hideNewAccounts', false),
        newAccountDays: GM_getValue('newAccountDays', 30),
        
        whitelist: GM_getValue('whitelist', []),
        blacklist: GM_getValue('blacklist', []),
        markedOk: GM_getValue('markedOk', [])
    };

    var stats = { tagged: 0, suspected: 0, lowqual: 0, engagement: 0, ok: 0 };
    var imgCache = {};
    var creatorCache = {};
    var descHashes = {};
    var processing = false;

    // all the AI tools i could find
    // meshy and tripo are the main ones but theres a ton of others now
    var aiTools = [
        'meshy', 'tripo', 'tripo3d', 'rodin', 'luma', 'luma ai', 'csm', 'kaedim',
        'alpha3d', 'masterpiece studio', 'masterpiece x', 'spline ai',
        'point-e', 'shap-e', 'get3d', 'dreamfusion', 'magic3d', 'fantasia3d',
        'sjc', 'stable-dreamfusion', 'zero123', 'one-2-3-45', 'wonder3d',
        'instant3d', 'threestudio', 'text2mesh', 'dreamgaussian', 'gsgen',
        'luciddreamer', 'gaussiandreamer', 'makerlab', 'ai scanner',
        '3dfy', 'anything world', 'brekel', 'captured dimensions',
        'comum', 'cross minds', 'deepmotion', 'genie', 'geniusaiai',
        'havatar', 'heygen', 'ilumine ai', 'in3d', 'kalidoface',
        'kinetix', 'latent labs', 'leonardo ai', 'leia', 'lumafield',
        'mootion', 'move ai', 'nvidia omniverse', 'plask', 'poly',
        'ponzu', 'radical', 'ready player me', 'reallusion', 'rokoko',
        'scenario', 'setpose', 'simpleai', 'sloyd', 'synthesia',
        'text-to-cad', 'textto3d', 'the simulation', 'unity sentis',
        'unrealme', 'vologram', 'wunderwelt', 'xpanceo', 'zoo'
    ];

    var aigcMarkers = ['aigc', 'ai-generated', 'ai generated', 'ai-created', 'ai created'];

    // simple hash for duplicate detection
    function hashStr(str) {
        var hash = 0;
        for (var i = 0; i < str.length; i++) {
            var c = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + c;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    // positive context = they used it
    // negative context = they're saying they didnt use it
    function hasPositiveContext(text, word) {
        var idx = text.toLowerCase().indexOf(word.toLowerCase());
        if (idx === -1) return false;
        
        var start = Math.max(0, idx - 40);
        var end = Math.min(text.length, idx + word.length + 40);
        var ctx = text.substring(start, end).toLowerCase();
        
        // negative - they're saying no AI
        if (/not\s+(made\s+)?(with|using|from|by)|without|no\s+\w*\s*(used|involved)|don't|didn't|hate|against|anti|ban/i.test(ctx)) {
            return false;
        }
        
        // positive - they used it
        if (/made\s+(with|using|by|in)|created\s+(with|using|by)|generated\s+(with|using|by)|using|from|via|through|powered\s+by/i.test(ctx)) {
            return true;
        }
        
        return null; // ambiguous
    }

    function analyzeText(text) {
        if (!text) return { conf: 0, reasons: [] };
        
        var lower = text.toLowerCase();
        var conf = 0;
        var reasons = [];

        // check for explicit aigc markers first - instant flag
        for (var i = 0; i < aigcMarkers.length; i++) {
            if (lower.indexOf(aigcMarkers[i]) !== -1) {
                return { conf: 1.0, reasons: ['AIGC marker'], isTagged: true };
            }
        }

        // check AI tool mentions
        for (var j = 0; j < aiTools.length; j++) {
            var tool = aiTools[j];
            var regex = new RegExp('\\b' + tool.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
            if (regex.test(lower)) {
                var ctx = hasPositiveContext(lower, tool);
                if (ctx === true) {
                    conf += 0.5;
                    reasons.push('made with ' + tool);
                } else if (ctx === null) {
                    conf += 0.2;
                    reasons.push('mentions ' + tool);
                } else {
                    conf -= 0.1; // said they didnt use it
                }
            }
        }

        // generation phrases
        var genPhrases = [
            { p: /generated?\s+(this|the|my)?\s*(model|mesh|3d|object)/i, w: 0.35, r: 'says generated' },
            { p: /convert(ed)?\s+(from|my|a|the)?\s*(photo|image|picture|scan)/i, w: 0.35, r: 'converted from image' },
            { p: /turn(ed)?\s+(my|a|the)?\s*(photo|image|picture)\s*(into|to)/i, w: 0.35, r: 'photo to 3d' },
            { p: /(photo|image|picture)\s*to\s*3d/i, w: 0.4, r: 'image to 3d' },
            { p: /text\s*to\s*3d/i, w: 0.45, r: 'text to 3d' },
            { p: /auto(matic(ally)?)?\s*(generat|creat|model)/i, w: 0.3, r: 'auto generated' },
            { p: /one[\s-]?click\s*(3d|model|generat|creat)/i, w: 0.35, r: 'one click generation' },
            { p: /instant(ly)?\s*(generat|creat|convert)/i, w: 0.3, r: 'instant generation' }
        ];

        for (var k = 0; k < genPhrases.length; k++) {
            var gp = genPhrases[k];
            var match = lower.match(gp.p);
            if (match) {
                var before = lower.substring(Math.max(0, match.index - 20), match.index);
                if (!/not|no|don't|didn't|without|never/i.test(before)) {
                    conf += gp.w;
                    reasons.push(gp.r);
                    break;
                }
            }
        }

        // check for "AI" with context
        var aiMatches = lower.match(/\bai\b/gi);
        if (aiMatches) {
            var aiIdx = lower.indexOf('ai');
            var ctxStart = Math.max(0, aiIdx - 30);
            var ctxEnd = Math.min(lower.length, aiIdx + 30);
            var aiCtx = lower.substring(ctxStart, ctxEnd);
            
            if (/not\s+ai|no\s+ai|anti[\s-]?ai|against\s+ai|hate\s+ai|ban\s+ai|without\s+ai|non[\s-]?ai|human[\s-]?(made|created)|hand[\s-]?(made|crafted)|manually|100%\s*human/i.test(aiCtx)) {
                conf -= 0.15;
            } else if (/made\s+(with|by|using)\s+ai|ai[\s-]?(made|created|generated|assisted|powered)|using\s+ai|with\s+ai|by\s+ai|from\s+ai/i.test(aiCtx)) {
                conf += 0.35;
                reasons.push('made with AI');
            }
        }

        // generic AI-style titles
        var firstLine = text.split('\n')[0].trim();
        if (firstLine.length < 45) {
            if (/^(cute|cool|amazing|beautiful|awesome|epic|stunning|adorable|lovely|pretty)\s+(little\s+)?\w{3,20}$/i.test(firstLine)) {
                conf += 0.12;
                reasons.push('generic title');
            }
            if (/^3d\s*(model|print|printable)\s*(of\s*)?\w+$/i.test(firstLine)) {
                conf += 0.1;
                reasons.push('generic 3d model title');
            }
            if (/^\w+\s*(figure|figurine|statue|bust|sculpture|toy|decoration)$/i.test(firstLine)) {
                conf += 0.08;
                reasons.push('generic item title');
            }
        }

        // human-made indicators - reduce confidence
        if (/designed\s+(by\s+)?(me|myself|hand)/i.test(lower)) conf -= 0.25;
        if (/hand[\s-]?(made|crafted|modeled|designed|sculpted)/i.test(lower)) conf -= 0.25;
        if (/modeled\s+(in|with|using)\s*(blender|fusion|solidworks|freecad|tinkercad|onshape|zbrush|maya|3ds|cinema)/i.test(lower)) conf -= 0.3;
        if (/sculpted|sculpting|carved|drafted|cad\s*design/i.test(lower)) conf -= 0.2;
        if (/original\s+(design|creation|model)/i.test(lower)) conf -= 0.2;
        if (/my\s+(own\s+)?(design|creation|model)/i.test(lower)) conf -= 0.15;
        if (/\d+\s*hours?\s*(of\s*)?(work|modeling|designing|sculpting)/i.test(lower)) conf -= 0.25;
        if (/work\s*in\s*progress|wip\b/i.test(lower)) conf -= 0.15;
        if (/iteration|prototype|v\d+.*improv/i.test(lower)) conf -= 0.15;
        if (/100%\s*(human|original|hand)/i.test(lower)) conf -= 0.3;
        if (/no\s*ai\s*(used|involved|generated)/i.test(lower)) conf -= 0.35;

        conf = Math.max(0, Math.min(1, conf));
        return { conf: conf, reasons: reasons, isTagged: conf >= 0.9 };
    }

    // image analysis - checks for AI render characteristics
    // this isnt perfect but catches the obvious ones
    function analyzeImg(imgEl) {
        return new Promise(function(resolve) {
            if (!imgEl || !imgEl.src) {
                resolve({ conf: 0, isPhoto: false, isRender: false });
                return;
            }

            if (imgCache[imgEl.src]) {
                resolve(imgCache[imgEl.src]);
                return;
            }

            var img = new Image();
            img.crossOrigin = 'anonymous';
            
            var timeout = setTimeout(function() {
                resolve({ conf: 0, isPhoto: false, isRender: false });
            }, 3000);

            img.onload = function() {
                clearTimeout(timeout);
                try {
                    var result = processImg(img);
                    imgCache[imgEl.src] = result;
                    resolve(result);
                } catch (e) {
                    resolve({ conf: 0, isPhoto: false, isRender: false });
                }
            };
            
            img.onerror = function() {
                clearTimeout(timeout);
                resolve({ conf: 0, isPhoto: false, isRender: false });
            };

            img.src = imgEl.src;
        });
    }

    function processImg(img) {
        var canvas = document.createElement('canvas');
        var sz = 100; // downsample for speed
        canvas.width = sz;
        canvas.height = sz;
        
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, sz, sz);
        
        var data;
        try {
            data = ctx.getImageData(0, 0, sz, sz).data;
        } catch (e) {
            return { conf: 0, isPhoto: false, isRender: false };
        }

        // calculate various metrics
        var smoothness = calcSmoothness(data, sz);
        var colorBanding = calcBanding(data, sz);
        var edgeDensity = calcEdges(data, sz);
        var saturation = calcSaturation(data);
        var bgUniformity = calcBgUniform(data, sz);
        var noise = calcNoise(data, sz);
        var texture = calcTexture(data, sz);
        var gradientUniform = calcGradientUniform(data, sz);

        // AI renders tend to be:
        // - too smooth
        // - have color banding
        // - few edges
        // - uniform backgrounds
        // - no sensor noise
        var renderScore = 0;
        
        if (smoothness > 0.7) renderScore += 0.2;
        else if (smoothness > 0.55) renderScore += 0.1;
        
        if (colorBanding > 0.35) renderScore += 0.2;
        else if (colorBanding > 0.2) renderScore += 0.1;
        
        if (gradientUniform > 0.75) renderScore += 0.15;
        
        if (saturation > 0.55) renderScore += 0.1;
        
        if (edgeDensity < 0.06) renderScore += 0.15;
        
        if (texture < 0.12) renderScore += 0.15;
        
        if (bgUniformity > 0.7) renderScore += 0.15;

        // real photos have noise and texture
        var photoScore = 0;
        if (texture > 0.25) photoScore += 0.2;
        if (smoothness < 0.4) photoScore += 0.15;
        if (edgeDensity > 0.12) photoScore += 0.15;
        if (noise > 0.15) photoScore += 0.15;
        if (bgUniformity < 0.4) photoScore += 0.15;
        
        renderScore = Math.max(0, Math.min(1, renderScore - photoScore * 0.5));

        return {
            conf: renderScore,
            isRender: renderScore > 0.45,
            isPhoto: photoScore > 0.4
        };
    }

    function calcSmoothness(data, sz) {
        var totalDiff = 0;
        var cnt = 0;
        
        for (var y = 0; y < sz - 1; y++) {
            for (var x = 0; x < sz - 1; x++) {
                var i = (y * sz + x) * 4;
                var iR = (y * sz + x + 1) * 4;
                var iD = ((y + 1) * sz + x) * 4;
                
                var diffR = Math.abs(data[i] - data[iR]) + Math.abs(data[i+1] - data[iR+1]) + Math.abs(data[i+2] - data[iR+2]);
                var diffD = Math.abs(data[i] - data[iD]) + Math.abs(data[i+1] - data[iD+1]) + Math.abs(data[i+2] - data[iD+2]);
                
                totalDiff += (diffR + diffD) / 2;
                cnt++;
            }
        }
        
        return 1 - Math.min(1, (totalDiff / cnt) / 100);
    }

    function calcBanding(data, sz) {
        var colors = {};
        
        for (var i = 0; i < data.length; i += 4) {
            var r = Math.floor(data[i] / 16) * 16;
            var g = Math.floor(data[i+1] / 16) * 16;
            var b = Math.floor(data[i+2] / 16) * 16;
            var key = r + ',' + g + ',' + b;
            colors[key] = (colors[key] || 0) + 1;
        }
        
        var total = sz * sz;
        var unique = Object.keys(colors).length;
        var maxCnt = 0;
        for (var k in colors) {
            if (colors[k] > maxCnt) maxCnt = colors[k];
        }
        
        var diversity = unique / (total / 4);
        var dominance = maxCnt / total;
        
        return Math.min(1, dominance * 2 + (1 - Math.min(1, diversity)));
    }

    function calcEdges(data, sz) {
        var edges = 0;
        var thresh = 30;
        
        for (var y = 1; y < sz - 1; y++) {
            for (var x = 1; x < sz - 1; x++) {
                var i = (y * sz + x) * 4;
                var iL = (y * sz + x - 1) * 4;
                var iR = (y * sz + x + 1) * 4;
                var iU = ((y - 1) * sz + x) * 4;
                var iD = ((y + 1) * sz + x) * 4;
                
                var gx = Math.abs(data[iR] - data[iL]) + Math.abs(data[iR+1] - data[iL+1]) + Math.abs(data[iR+2] - data[iL+2]);
                var gy = Math.abs(data[iD] - data[iU]) + Math.abs(data[iD+1] - data[iU+1]) + Math.abs(data[iD+2] - data[iU+2]);
                
                if (gx + gy > thresh * 3) edges++;
            }
        }
        
        return edges / (sz * sz);
    }

    function calcSaturation(data) {
        var total = 0;
        var cnt = 0;
        
        for (var i = 0; i < data.length; i += 4) {
            var r = data[i] / 255;
            var g = data[i+1] / 255;
            var b = data[i+2] / 255;
            
            var max = Math.max(r, g, b);
            var min = Math.min(r, g, b);
            var l = (max + min) / 2;
            
            var s = 0;
            if (max !== min) {
                s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
            }
            
            total += s;
            cnt++;
        }
        
        return total / cnt;
    }

    function calcBgUniform(data, sz) {
        // sample edges of image
        var pixels = [];
        
        for (var x = 0; x < sz; x++) {
            pixels.push([data[x * 4], data[x * 4 + 1], data[x * 4 + 2]]);
            var bi = ((sz - 1) * sz + x) * 4;
            pixels.push([data[bi], data[bi + 1], data[bi + 2]]);
        }
        
        for (var y = 0; y < sz; y++) {
            var li = (y * sz) * 4;
            var ri = (y * sz + sz - 1) * 4;
            pixels.push([data[li], data[li + 1], data[li + 2]]);
            pixels.push([data[ri], data[ri + 1], data[ri + 2]]);
        }
        
        var avgR = 0, avgG = 0, avgB = 0;
        for (var i = 0; i < pixels.length; i++) {
            avgR += pixels[i][0];
            avgG += pixels[i][1];
            avgB += pixels[i][2];
        }
        avgR /= pixels.length;
        avgG /= pixels.length;
        avgB /= pixels.length;
        
        var variance = 0;
        for (var j = 0; j < pixels.length; j++) {
            variance += Math.pow(pixels[j][0] - avgR, 2) + Math.pow(pixels[j][1] - avgG, 2) + Math.pow(pixels[j][2] - avgB, 2);
        }
        variance /= pixels.length * 3;
        
        return 1 - Math.min(1, Math.sqrt(variance) / 50);
    }

    function calcNoise(data, sz) {
        var noiseSum = 0;
        
        for (var y = 1; y < sz - 1; y++) {
            for (var x = 1; x < sz - 1; x++) {
                var i = (y * sz + x) * 4;
                var localAvg = 0;
                var cnt = 0;
                
                for (var dy = -1; dy <= 1; dy++) {
                    for (var dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        var ni = ((y + dy) * sz + (x + dx)) * 4;
                        localAvg += (data[ni] + data[ni+1] + data[ni+2]) / 3;
                        cnt++;
                    }
                }
                localAvg /= cnt;
                
                var pixelVal = (data[i] + data[i+1] + data[i+2]) / 3;
                noiseSum += Math.abs(pixelVal - localAvg);
            }
        }
        
        return Math.min(1, noiseSum / (sz * sz) / 10);
    }

    function calcTexture(data, sz) {
        var complexity = 0;
        var blockSize = 8;
        var blocks = 0;
        
        for (var by = 0; by < sz - blockSize; by += blockSize) {
            for (var bx = 0; bx < sz - blockSize; bx += blockSize) {
                var vals = [];
                
                for (var y = by; y < by + blockSize; y++) {
                    for (var x = bx; x < bx + blockSize; x++) {
                        var i = (y * sz + x) * 4;
                        vals.push((data[i] + data[i+1] + data[i+2]) / 3);
                    }
                }
                
                var avg = 0;
                for (var v = 0; v < vals.length; v++) avg += vals[v];
                avg /= vals.length;
                
                var std = 0;
                for (var w = 0; w < vals.length; w++) std += Math.pow(vals[w] - avg, 2);
                std = Math.sqrt(std / vals.length);
                
                complexity += std;
                blocks++;
            }
        }
        
        return blocks > 0 ? Math.min(1, (complexity / blocks) / 60) : 0;
    }

    function calcGradientUniform(data, sz) {
        var uniformRegions = 0;
        var totalRegions = 0;
        var regionSize = 10;
        
        for (var ry = 0; ry < sz - regionSize; ry += regionSize) {
            for (var rx = 0; rx < sz - regionSize; rx += regionSize) {
                var diffs = [];
                
                for (var y = ry; y < ry + regionSize - 1; y++) {
                    for (var x = rx; x < rx + regionSize - 1; x++) {
                        var i = (y * sz + x) * 4;
                        var iR = (y * sz + x + 1) * 4;
                        var diff = Math.abs(data[i] - data[iR]) + Math.abs(data[i+1] - data[iR+1]) + Math.abs(data[i+2] - data[iR+2]);
                        diffs.push(diff);
                    }
                }
                
                var avg = 0;
                for (var d = 0; d < diffs.length; d++) avg += diffs[d];
                avg /= diffs.length;
                
                var variance = 0;
                for (var e = 0; e < diffs.length; e++) variance += Math.pow(diffs[e] - avg, 2);
                variance /= diffs.length;
                
                if (variance < 50) uniformRegions++;
                totalRegions++;
            }
        }
        
        return totalRegions > 0 ? uniformRegions / totalRegions : 0;
    }

    // quality analysis - separate from AI detection
    function analyzeQuality(card, text, imgResult) {
        var score = 0.5;
        var reasons = [];
        var lower = text.toLowerCase();

        if (/printed|test\s*print|print\s*photo|actual\s*print|successfully\s*printed/i.test(text)) {
            score += 0.2;
            reasons.push('+printed');
        }
        if (/layer\s*height|infill|nozzle|filament|pla\b|petg|abs\b|supports?\s*(needed|required|recommended)/i.test(text)) {
            score += 0.15;
            reasons.push('+settings');
        }
        if (text.length > 400) score += 0.1;
        else if (text.length > 200) score += 0.05;
        
        if (/tested|verified|works\s*(great|well|perfectly)|functional/i.test(text)) {
            score += 0.1;
            reasons.push('+tested');
        }
        if (imgResult && imgResult.isPhoto) {
            score += 0.15;
            reasons.push('+real photo');
        }

        // negatives
        if (text.length < 80) {
            score -= 0.2;
            reasons.push('-short desc');
        }
        if (/render|cgi|blender\s*render/i.test(text) && !/printed|print\s*photo/i.test(text)) {
            score -= 0.15;
            reasons.push('-render only');
        }
        if (imgResult && imgResult.isRender && !imgResult.isPhoto) {
            score -= 0.1;
            reasons.push('-render img');
        }

        return { score: Math.max(0, Math.min(1, score)), reasons: reasons };
    }

    // creator behavior analysis
    function analyzeCreatorBehavior(creator, card) {
        if (!creator) return { suspicious: false, score: 0, reasons: [] };
        
        if (creatorCache[creator]) return creatorCache[creator];
        
        var reasons = [];
        var suspicionScore = 0;
        var text = card.textContent || '';
        
        // batch upload patterns
        var modelCountMatch = text.match(/(\d+)\s*(models?|uploads?|designs?)/i);
        if (modelCountMatch) {
            var count = parseInt(modelCountMatch[1]);
            if (count > 100) {
                suspicionScore += 0.15;
                reasons.push(count + ' uploads');
            }
        }
        
        // engagement ratio
        var metrics = getMetrics(card);
        if (metrics.downloads > 10) {
            var ratio = (metrics.likes + metrics.downloads) / Math.max(1, metrics.downloads);
            if (ratio < 0.1) {
                suspicionScore += 0.1;
                reasons.push('low engagement');
            }
        }
        
        // account age
        if (cfg.checkAccountAge) {
            var age = getAccountAge(card);
            if (age !== null && age < 30) {
                suspicionScore += 0.15;
                reasons.push('new account (' + age + 'd)');
            }
        }
        
        var result = {
            suspicious: suspicionScore >= 0.2,
            score: Math.min(1, suspicionScore),
            reasons: reasons
        };
        
        creatorCache[creator] = result;
        return result;
    }

    // duplicate description detection
    function checkDupDesc(desc, creator) {
        if (!desc || desc.length < 50) return { isDup: false };
        
        var normalized = desc.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim().substring(0, 200);
        var hash = hashStr(normalized);
        
        if (descHashes[hash]) {
            descHashes[hash].count++;
            if (descHashes[hash].count > 2) {
                return { isDup: true, count: descHashes[hash].count, reason: 'same desc ' + descHashes[hash].count + 'x' };
            }
        } else {
            descHashes[hash] = { count: 1, creator: creator };
        }
        
        return { isDup: false };
    }

    // extract info from card
    function getCreator(card) {
        var sels = [
            '[class*="author"] a', '[class*="Author"] a',
            '[class*="creator"] a', '[class*="Creator"] a',
            '[class*="user"] a', '[class*="User"] a',
            'a[href*="/u/"]', 'a[href*="/@"]',
            'a[href*="/user/"]', 'a[href*="/profile/"]',
            '.user-link', '.author-link', '[class*="designer"] a',
            '[class*="username"]', '[class*="Username"]'
        ];
        
        for (var i = 0; i < sels.length; i++) {
            var el = card.querySelector(sels[i]);
            if (el) {
                var name = el.textContent ? el.textContent.trim() : null;
                if (!name || name.length < 2) {
                    var href = el.href || '';
                    var match = href.match(/\/(?:u|user|profile|@)\/([^\/\?]+)/i);
                    if (match) name = match[1];
                }
                if (name && name.length >= 2 && name.length < 50) {
                    return name.toLowerCase().trim();
                }
            }
        }
        return null;
    }

    function getModelUrl(card) {
        var link = card.querySelector('a[href*="/model"]') || card.querySelector('a[href*="/print"]') || card.querySelector('a');
        return link ? link.href : null;
    }

    function getDescription(card) {
        var sels = [
            '[class*="description"]', '[class*="Description"]',
            '[class*="summary"]', '[class*="Summary"]',
            'p', '.text-content'
        ];
        
        for (var i = 0; i < sels.length; i++) {
            var el = card.querySelector(sels[i]);
            if (el && el.textContent.length > 20) {
                return el.textContent.trim();
            }
        }
        return card.textContent ? card.textContent.substring(0, 500) : '';
    }

    function getMetrics(card) {
        var text = card.textContent || '';
        var m = { likes: 0, downloads: 0, makes: 0, views: 0 };
        
        var likesMatch = text.match(/(\d+[\d,]*[kKmM]?)\s*(likes?|hearts?)/i);
        var dlMatch = text.match(/(\d+[\d,]*[kKmM]?)\s*(downloads?)/i);
        var makesMatch = text.match(/(\d+[\d,]*[kKmM]?)\s*(makes?|prints?|printed)/i);
        var viewsMatch = text.match(/(\d+[\d,]*[kKmM]?)\s*(views?)/i);
        
        if (likesMatch) m.likes = parseNum(likesMatch[1]);
        if (dlMatch) m.downloads = parseNum(dlMatch[1]);
        if (makesMatch) m.makes = parseNum(makesMatch[1]);
        if (viewsMatch) m.views = parseNum(viewsMatch[1]);
        
        // also check data attributes
        var likeSels = '[class*="like"] [class*="count"], [class*="Like"] [class*="num"], [data-likes]';
        var dlSels = '[class*="download"] [class*="count"], [data-downloads]';
        var makeSels = '[class*="make"] [class*="count"], [class*="print"] [class*="count"], [data-makes]';
        
        var likeEl = card.querySelector(likeSels);
        var dlEl = card.querySelector(dlSels);
        var makeEl = card.querySelector(makeSels);
        
        if (likeEl) {
            var n = parseNum(likeEl.textContent || likeEl.dataset.likes);
            if (n > m.likes) m.likes = n;
        }
        if (dlEl) {
            var n2 = parseNum(dlEl.textContent || dlEl.dataset.downloads);
            if (n2 > m.downloads) m.downloads = n2;
        }
        if (makeEl) {
            var n3 = parseNum(makeEl.textContent || makeEl.dataset.makes);
            if (n3 > m.makes) m.makes = n3;
        }
        
        return m;
    }

    function getAccountAge(card) {
        var text = card.textContent || '';
        
        var patterns = [
            /member\s+(for\s+)?(\d+)\s*(days?)/i,
            /joined\s+(\d+)\s*(days?|months?|years?)\s*ago/i,
            /(\d+)\s*(days?|months?|years?)\s*old\s*account/i
        ];
        
        for (var i = 0; i < patterns.length; i++) {
            var match = text.match(patterns[i]);
            if (match) {
                var days = parseInt(match[2] || match[1]);
                var unit = (match[3] || match[2] || '').toLowerCase();
                if (unit.indexOf('month') !== -1) days *= 30;
                if (unit.indexOf('year') !== -1) days *= 365;
                return days;
            }
        }
        
        // check for date strings
        var dateMatch = text.match(/(?:joined|since|created)[:\s]*(\w+\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})/i);
        if (dateMatch) {
            try {
                var joinDate = new Date(dateMatch[1]);
                var days = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
                if (days > 0 && days < 10000) return days;
            } catch (e) {}
        }
        
        return null;
    }

    function parseNum(str) {
        if (!str) return 0;
        var n = parseFloat(str.replace(/,/g, ''));
        if (/[kK]/.test(str)) n *= 1000;
        if (/[mM]/.test(str)) n *= 1000000;
        return Math.floor(n);
    }

    // check for explicit AI markers (badges, urls)
    function checkExplicit(card) {
        // aigc badge
        var badge = card.querySelector('[class*="aigc" i], [class*="ai-badge" i], [class*="ai-label" i], [data-ai="true"], [class*="AIGenerated" i]');
        if (badge) return { ai: true, reason: 'AIGC badge' };

        // makerworld AI categories
        var url = getModelUrl(card) || '';
        if (/\/3d-models\/(2000|2006)/.test(url) || /category=(2000|2006)/.test(url)) {
            return { ai: true, reason: 'AI category' };
        }

        return { ai: false };
    }

    // engagement filter check
    function checkEngagement(metrics) {
        if (!cfg.engagementFilter) return { pass: true, reasons: [] };
        
        var reasons = [];
        var pass = true;
        
        if (cfg.minLikes > 0 && metrics.likes < cfg.minLikes) {
            pass = false;
            reasons.push('<' + cfg.minLikes + ' likes');
        }
        if (cfg.minDownloads > 0 && metrics.downloads < cfg.minDownloads) {
            pass = false;
            reasons.push('<' + cfg.minDownloads + ' downloads');
        }
        if (cfg.minMakes > 0 && metrics.makes < cfg.minMakes) {
            pass = false;
            reasons.push('<' + cfg.minMakes + ' makes');
        }
        
        return { pass: pass, reasons: reasons };
    }

    // main card analysis
    async function analyzeCard(card) {
        var result = {
            tagged: false,
            suspected: false,
            lowQual: false,
            failsEngagement: false,
            conf: 0,
            qualScore: 0.5,
            creator: null,
            url: null,
            whitelisted: false,
            blacklisted: false,
            markedOk: false,
            reasons: [],
            allReasons: [],
            metrics: null,
            imgResult: null
        };

        result.creator = getCreator(card);
        result.url = getModelUrl(card);
        result.metrics = getMetrics(card);

        // check whitelist
        if (result.creator && cfg.whitelist.indexOf(result.creator.toLowerCase()) !== -1) {
            result.whitelisted = true;
            return result;
        }

        // check marked ok
        if (result.url && cfg.markedOk.indexOf(result.url) !== -1) {
            result.markedOk = true;
            return result;
        }

        // check blacklist
        if (result.creator && cfg.blacklist.indexOf(result.creator.toLowerCase()) !== -1) {
            result.blacklisted = true;
            result.tagged = true;
            result.conf = 1.0;
            result.reasons.push('blacklisted');
            return result;
        }

        // engagement filter
        var engCheck = checkEngagement(result.metrics);
        if (!engCheck.pass) {
            result.failsEngagement = true;
            result.reasons = result.reasons.concat(engCheck.reasons);
        }

        // account age
        if (cfg.hideNewAccounts) {
            var age = getAccountAge(card);
            if (age !== null && age < cfg.newAccountDays) {
                result.failsEngagement = true;
                result.reasons.push('account <' + cfg.newAccountDays + 'd');
            }
        }

        // explicit markers
        var explicit = checkExplicit(card);
        if (explicit.ai) {
            result.tagged = true;
            result.conf = 1.0;
            result.reasons.push(explicit.reason);
            result.allReasons.push(explicit.reason);
            return result;
        }

        // text analysis
        var text = card.textContent || '';
        var desc = getDescription(card);
        var textResult = analyzeText(text);
        result.conf = textResult.conf;
        result.allReasons = result.allReasons.concat(textResult.reasons);

        if (textResult.isTagged) {
            result.tagged = true;
            result.reasons = result.reasons.concat(textResult.reasons.slice(0, 2));
            return result;
        }

        // duplicate description
        var dupCheck = checkDupDesc(desc, result.creator);
        if (dupCheck.isDup) {
            result.conf += 0.2;
            result.allReasons.push(dupCheck.reason);
        }

        // creator behavior
        if (cfg.analyzeCreatorBehavior) {
            var behaviorCheck = analyzeCreatorBehavior(result.creator, card);
            if (behaviorCheck.suspicious) {
                result.conf += behaviorCheck.score * 0.3;
                result.allReasons = result.allReasons.concat(behaviorCheck.reasons);
            }
        }

        // image analysis
        if (cfg.analyzeImgs && result.conf < 0.85) {
            var img = card.querySelector('img[src*="thumb"], img[src*="cover"], img[src*="preview"], img[src*="image"], img');
            if (img && img.src && img.src.indexOf('avatar') === -1 && img.src.indexOf('profile') === -1 && img.src.indexOf('logo') === -1) {
                var imgResult = await analyzeImg(img);
                result.imgResult = imgResult;
                
                if (imgResult.isRender && imgResult.conf > 0.4) {
                    result.conf = Math.min(1, result.conf + imgResult.conf * 0.25);
                    result.allReasons.push('render-style img');
                }
                if (imgResult.isPhoto) {
                    result.conf = Math.max(0, result.conf - 0.15);
                }
            }
        }

        // check threshold
        if (result.conf >= cfg.threshold / 100) {
            result.suspected = true;
            result.reasons = result.reasons.concat(result.allReasons.slice(0, 3));
        }

        // quality
        var qualResult = analyzeQuality(card, text, result.imgResult);
        result.qualScore = qualResult.score;
        if (qualResult.score < cfg.qualThreshold / 100) {
            result.lowQual = true;
            result.reasons = result.reasons.concat(qualResult.reasons.slice(0, 2));
        }

        return result;
    }

    // list management
    function addWhitelist(name) {
        if (!name) return false;
        name = name.toLowerCase().trim();
        if (cfg.whitelist.indexOf(name) === -1) {
            cfg.whitelist.push(name);
            GM_setValue('whitelist', cfg.whitelist);
            removeBlacklist(name);
            return true;
        }
        return false;
    }

    function removeWhitelist(name) {
        var idx = cfg.whitelist.indexOf(name.toLowerCase().trim());
        if (idx > -1) {
            cfg.whitelist.splice(idx, 1);
            GM_setValue('whitelist', cfg.whitelist);
            return true;
        }
        return false;
    }

    function addBlacklist(name) {
        if (!name) return false;
        name = name.toLowerCase().trim();
        if (cfg.blacklist.indexOf(name) === -1) {
            cfg.blacklist.push(name);
            GM_setValue('blacklist', cfg.blacklist);
            removeWhitelist(name);
            return true;
        }
        return false;
    }

    function removeBlacklist(name) {
        var idx = cfg.blacklist.indexOf(name.toLowerCase().trim());
        if (idx > -1) {
            cfg.blacklist.splice(idx, 1);
            GM_setValue('blacklist', cfg.blacklist);
            return true;
        }
        return false;
    }

    function markOk(url) {
        if (!url) return false;
        if (cfg.markedOk.indexOf(url) === -1) {
            cfg.markedOk.push(url);
            GM_setValue('markedOk', cfg.markedOk);
            return true;
        }
        return false;
    }

    function doExport() {
        var data = {
            version: VERSION,
            exportDate: new Date().toISOString(),
            whitelist: cfg.whitelist,
            blacklist: cfg.blacklist,
            markedOk: cfg.markedOk,
            settings: {
                threshold: cfg.threshold,
                qualThreshold: cfg.qualThreshold,
                minLikes: cfg.minLikes,
                minDownloads: cfg.minDownloads,
                minMakes: cfg.minMakes,
                newAccountDays: cfg.newAccountDays
            }
        };
        var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = '3d-filter-backup-' + new Date().toISOString().slice(0,10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function doImport() {
        var inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.json';
        inp.onchange = function(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(e) {
                try {
                    var data = JSON.parse(e.target.result);
                    if (data.whitelist) {
                        for (var i = 0; i < data.whitelist.length; i++) {
                            if (cfg.whitelist.indexOf(data.whitelist[i]) === -1) {
                                cfg.whitelist.push(data.whitelist[i]);
                            }
                        }
                        GM_setValue('whitelist', cfg.whitelist);
                    }
                    if (data.blacklist) {
                        for (var j = 0; j < data.blacklist.length; j++) {
                            if (cfg.blacklist.indexOf(data.blacklist[j]) === -1) {
                                cfg.blacklist.push(data.blacklist[j]);
                            }
                        }
                        GM_setValue('blacklist', cfg.blacklist);
                    }
                    if (data.markedOk) {
                        for (var k = 0; k < data.markedOk.length; k++) {
                            if (cfg.markedOk.indexOf(data.markedOk[k]) === -1) {
                                cfg.markedOk.push(data.markedOk[k]);
                            }
                        }
                        GM_setValue('markedOk', cfg.markedOk);
                    }
                    alert('imported ' + cfg.whitelist.length + ' whitelisted, ' + cfg.blacklist.length + ' blacklisted');
                    runFilter();
                } catch (err) {
                    alert('error: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        inp.click();
    }

    // ui
    function buildUI() {
        var css = document.createElement('style');
        css.textContent = '#aif-panel{position:fixed;bottom:20px;right:20px;background:#1a1a2e;color:#e0e0e0;padding:12px;border-radius:10px;font-family:-apple-system,sans-serif;font-size:11px;z-index:999999;box-shadow:0 4px 20px rgba(0,0,0,0.5);min-width:240px;max-width:280px}#aif-panel.min{min-width:auto;padding:6px 10px}#aif-panel.min .aif-body{display:none}.aif-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;cursor:pointer}.aif-title{font-weight:600;font-size:12px}.aif-ver{font-size:8px;color:#666;margin-left:4px}.aif-minbtn{background:none;border:none;color:#555;font-size:14px;cursor:pointer}.aif-sec{background:rgba(255,255,255,0.03);border-radius:5px;padding:6px;margin-bottom:5px}.aif-sec-title{font-size:7px;color:#555;text-transform:uppercase;margin-bottom:4px}.aif-row{display:flex;justify-content:space-between;align-items:center;padding:2px 0}.aif-label{font-size:10px;color:#aaa}.aif-tog{position:relative;width:28px;height:16px}.aif-tog input{opacity:0;width:0;height:0}.aif-sl{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:#333;border-radius:16px;transition:.2s}.aif-sl:before{position:absolute;content:"";height:10px;width:10px;left:3px;bottom:3px;background:#888;border-radius:50%;transition:.2s}input:checked+.aif-sl{background:#6366f1}input:checked+.aif-sl:before{transform:translateX(12px);background:#fff}.aif-inp{width:45px;padding:2px 4px;border-radius:3px;border:1px solid #333;background:#252542;color:#fff;font-size:10px;text-align:center}.aif-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:2px;margin-top:5px}.aif-stat{background:rgba(255,255,255,0.03);padding:4px 2px;border-radius:3px;text-align:center}.aif-num{font-size:12px;font-weight:700}.aif-num.pur{color:#818cf8}.aif-num.pnk{color:#f472b6}.aif-num.org{color:#fb923c}.aif-num.gry{color:#888}.aif-num.grn{color:#4ade80}.aif-lbl{font-size:6px;color:#555;text-transform:uppercase}.aif-btn{background:rgba(255,255,255,0.05);border:none;color:#888;padding:4px 6px;border-radius:3px;cursor:pointer;font-size:8px;flex:1}.aif-btn:hover{background:rgba(255,255,255,0.1);color:#fff}.aif-btns{display:flex;gap:3px;margin-top:5px}.aif-hide{display:none!important}.aif-hl{outline:3px solid #818cf8!important;outline-offset:2px;position:relative}.aif-hl-sus{outline-color:#f472b6!important}.aif-hl-low{outline-color:#fb923c!important}.aif-hl-eng{outline-color:#888!important}.aif-badge{position:absolute;top:3px;right:3px;padding:2px 5px;border-radius:3px;font-size:8px;font-weight:600;color:#fff;z-index:100}.aif-badge.tag{background:#6366f1}.aif-badge.sus{background:#ec4899}.aif-badge.low{background:#f97316}.aif-badge.eng{background:#666}.aif-why{position:absolute;bottom:3px;right:3px;max-width:140px;padding:2px 5px;border-radius:3px;font-size:7px;background:rgba(0,0,0,0.85);color:#ccc;z-index:100;display:none;line-height:1.3}.aif-hl:hover .aif-why{display:block}.aif-acts{position:absolute;top:3px;left:3px;display:flex;gap:2px;z-index:101}.aif-act{background:rgba(0,0,0,0.8);border:none;color:#fff;width:18px;height:18px;border-radius:2px;cursor:pointer;font-size:9px;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s}.aif-hl:hover .aif-act,.aif-done:hover .aif-act{opacity:1}.aif-act:hover{background:rgba(0,0,0,0.95)}.aif-act.ok{background:#22c55e;opacity:1}.aif-act.bl{background:#dc2626;opacity:1}.aif-score{position:absolute;bottom:3px;left:3px;padding:2px 4px;border-radius:3px;font-size:7px;background:rgba(0,0,0,0.8);color:#aaa;font-family:monospace;z-index:100}';
        document.head.appendChild(css);

        var panel = document.createElement('div');
        panel.id = 'aif-panel';
        panel.innerHTML = '<div class="aif-head"><span><span class="aif-title">AI Filter</span><span class="aif-ver">v' + VERSION + '</span></span><button class="aif-minbtn">-</button></div><div class="aif-body"><div class="aif-sec"><div class="aif-sec-title">filters</div><div class="aif-row"><span class="aif-label">tagged AI</span><label class="aif-tog"><input type="checkbox" id="aif-tagged"' + (cfg.filterTagged ? ' checked' : '') + '><span class="aif-sl"></span></label></div><div class="aif-row"><span class="aif-label">suspected AI</span><label class="aif-tog"><input type="checkbox" id="aif-sus"' + (cfg.filterSuspected ? ' checked' : '') + '><span class="aif-sl"></span></label></div><div class="aif-row"><span class="aif-label">low quality</span><label class="aif-tog"><input type="checkbox" id="aif-qual"' + (cfg.filterLowQual ? ' checked' : '') + '><span class="aif-sl"></span></label></div><div class="aif-row"><span class="aif-label">engagement</span><label class="aif-tog"><input type="checkbox" id="aif-eng"' + (cfg.engagementFilter ? ' checked' : '') + '><span class="aif-sl"></span></label></div></div><div class="aif-sec" id="aif-eng-sec" style="' + (cfg.engagementFilter ? '' : 'display:none') + '"><div class="aif-sec-title">minimums</div><div class="aif-row"><span class="aif-label">likes</span><input type="number" class="aif-inp" id="aif-min-likes" value="' + cfg.minLikes + '" min="0"></div><div class="aif-row"><span class="aif-label">downloads</span><input type="number" class="aif-inp" id="aif-min-dl" value="' + cfg.minDownloads + '" min="0"></div><div class="aif-row"><span class="aif-label">makes</span><input type="number" class="aif-inp" id="aif-min-makes" value="' + cfg.minMakes + '" min="0"></div><div class="aif-row"><span class="aif-label">hide new accounts</span><label class="aif-tog"><input type="checkbox" id="aif-new"' + (cfg.hideNewAccounts ? ' checked' : '') + '><span class="aif-sl"></span></label></div></div><div class="aif-sec"><div class="aif-sec-title">options</div><div class="aif-row"><span class="aif-label">highlight only</span><label class="aif-tog"><input type="checkbox" id="aif-hl"' + (cfg.highlightOnly ? ' checked' : '') + '><span class="aif-sl"></span></label></div><div class="aif-row"><span class="aif-label">show reasons</span><label class="aif-tog"><input type="checkbox" id="aif-why"' + (cfg.showWhyFlagged ? ' checked' : '') + '><span class="aif-sl"></span></label></div><div class="aif-row"><span class="aif-label">analyze images</span><label class="aif-tog"><input type="checkbox" id="aif-img"' + (cfg.analyzeImgs ? ' checked' : '') + '><span class="aif-sl"></span></label></div><div class="aif-row"><span class="aif-label">threshold</span><input type="number" class="aif-inp" id="aif-thresh" value="' + cfg.threshold + '" min="0" max="100"></div></div><div class="aif-sec"><div class="aif-sec-title">lists (' + cfg.whitelist.length + ' ok / ' + cfg.blacklist.length + ' blocked)</div><div class="aif-btns"><button class="aif-btn" id="aif-manage">manage</button><button class="aif-btn" id="aif-imp">import</button><button class="aif-btn" id="aif-exp">export</button></div></div><div class="aif-stats"><div class="aif-stat"><div class="aif-num pur" id="aif-s-tag">0</div><div class="aif-lbl">tag</div></div><div class="aif-stat"><div class="aif-num pnk" id="aif-s-sus">0</div><div class="aif-lbl">sus</div></div><div class="aif-stat"><div class="aif-num org" id="aif-s-low">0</div><div class="aif-lbl">low</div></div><div class="aif-stat"><div class="aif-num gry" id="aif-s-eng">0</div><div class="aif-lbl">eng</div></div><div class="aif-stat"><div class="aif-num grn" id="aif-s-ok">0</div><div class="aif-lbl">ok</div></div></div></div>';
        document.body.appendChild(panel);

        // events
        panel.querySelector('.aif-head').onclick = function(e) {
            if (e.target.tagName !== 'BUTTON') panel.classList.toggle('min');
        };
        panel.querySelector('.aif-minbtn').onclick = function() {
            panel.classList.toggle('min');
        };

        var toggles = {
            'aif-tagged': 'filterTagged',
            'aif-sus': 'filterSuspected',
            'aif-qual': 'filterLowQual',
            'aif-eng': 'engagementFilter',
            'aif-hl': 'highlightOnly',
            'aif-why': 'showWhyFlagged',
            'aif-img': 'analyzeImgs',
            'aif-new': 'hideNewAccounts'
        };

        for (var id in toggles) {
            (function(i, k) {
                var el = document.getElementById(i);
                if (el) {
                    el.onchange = function(e) {
                        cfg[k] = e.target.checked;
                        GM_setValue(k, e.target.checked);
                        if (k === 'engagementFilter') {
                            document.getElementById('aif-eng-sec').style.display = e.target.checked ? '' : 'none';
                        }
                        runFilter();
                    };
                }
            })(id, toggles[id]);
        }

        document.getElementById('aif-thresh').onchange = function(e) {
            cfg.threshold = parseInt(e.target.value) || 65;
            GM_setValue('threshold', cfg.threshold);
            runFilter();
        };

        document.getElementById('aif-min-likes').onchange = function(e) {
            cfg.minLikes = parseInt(e.target.value) || 0;
            GM_setValue('minLikes', cfg.minLikes);
            runFilter();
        };

        document.getElementById('aif-min-dl').onchange = function(e) {
            cfg.minDownloads = parseInt(e.target.value) || 0;
            GM_setValue('minDownloads', cfg.minDownloads);
            runFilter();
        };

        document.getElementById('aif-min-makes').onchange = function(e) {
            cfg.minMakes = parseInt(e.target.value) || 0;
            GM_setValue('minMakes', cfg.minMakes);
            runFilter();
        };

        document.getElementById('aif-manage').onclick = showLists;
        document.getElementById('aif-imp').onclick = doImport;
        document.getElementById('aif-exp').onclick = doExport;
    }

    function showLists() {
        var old = document.getElementById('aif-modal');
        if (old) old.remove();

        var modal = document.createElement('div');
        modal.id = 'aif-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:9999999;display:flex;align-items:center;justify-content:center';

        var wlHtml = cfg.whitelist.length === 0 ? '<p style="color:#444;text-align:center;padding:12px">empty</p>' : cfg.whitelist.map(function(c) {
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 6px;background:rgba(34,197,94,0.1);border-radius:3px;margin-bottom:3px"><span style="font-size:10px">' + c + '</span><button data-c="' + c + '" data-l="w" class="aif-rm" style="background:#ef4444;border:none;color:#fff;padding:2px 5px;border-radius:2px;cursor:pointer;font-size:8px">x</button></div>';
        }).join('');

        var blHtml = cfg.blacklist.length === 0 ? '<p style="color:#444;text-align:center;padding:12px">empty</p>' : cfg.blacklist.map(function(c) {
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 6px;background:rgba(239,68,68,0.1);border-radius:3px;margin-bottom:3px"><span style="font-size:10px">' + c + '</span><button data-c="' + c + '" data-l="b" class="aif-rm" style="background:#22c55e;border:none;color:#fff;padding:2px 5px;border-radius:2px;cursor:pointer;font-size:8px">ok</button></div>';
        }).join('');

        modal.innerHTML = '<div style="background:#1a1a2e;border-radius:8px;padding:12px;max-width:350px;width:90%;max-height:80vh;overflow-y:auto;color:#e0e0e0;font-family:-apple-system,sans-serif"><div style="display:flex;gap:6px;margin-bottom:10px"><button id="aif-tw" style="flex:1;padding:6px;border:none;background:#22c55e;color:#fff;border-radius:4px;cursor:pointer;font-size:10px">trusted (' + cfg.whitelist.length + ')</button><button id="aif-tb" style="flex:1;padding:6px;border:none;background:#333;color:#888;border-radius:4px;cursor:pointer;font-size:10px">blocked (' + cfg.blacklist.length + ')</button></div><input type="text" id="aif-add" placeholder="add creator..." style="width:100%;padding:6px;border-radius:4px;border:1px solid #333;background:#252542;color:#fff;font-size:10px;box-sizing:border-box;margin-bottom:8px"><div id="aif-wl">' + wlHtml + '</div><div id="aif-bl" style="display:none">' + blHtml + '</div><button id="aif-close" style="width:100%;margin-top:10px;padding:8px;border-radius:4px;border:none;background:#333;color:#fff;cursor:pointer;font-size:10px">done</button></div>';

        document.body.appendChild(modal);

        var list = 'w';

        document.getElementById('aif-tw').onclick = function() {
            list = 'w';
            document.getElementById('aif-tw').style.background = '#22c55e';
            document.getElementById('aif-tw').style.color = '#fff';
            document.getElementById('aif-tb').style.background = '#333';
            document.getElementById('aif-tb').style.color = '#888';
            document.getElementById('aif-wl').style.display = '';
            document.getElementById('aif-bl').style.display = 'none';
        };

        document.getElementById('aif-tb').onclick = function() {
            list = 'b';
            document.getElementById('aif-tb').style.background = '#ef4444';
            document.getElementById('aif-tb').style.color = '#fff';
            document.getElementById('aif-tw').style.background = '#333';
            document.getElementById('aif-tw').style.color = '#888';
            document.getElementById('aif-wl').style.display = 'none';
            document.getElementById('aif-bl').style.display = '';
        };

        document.getElementById('aif-add').onkeypress = function(e) {
            if (e.key === 'Enter' && e.target.value.trim()) {
                var name = e.target.value.trim();
                if (list === 'w') addWhitelist(name);
                else addBlacklist(name);
                modal.remove();
                showLists();
                runFilter();
            }
        };

        var rmBtns = modal.querySelectorAll('.aif-rm');
        for (var i = 0; i < rmBtns.length; i++) {
            rmBtns[i].onclick = function() {
                var c = this.dataset.c;
                if (this.dataset.l === 'w') removeWhitelist(c);
                else removeBlacklist(c);
                modal.remove();
                showLists();
                runFilter();
            };
        }

        document.getElementById('aif-close').onclick = function() { modal.remove(); };
        modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
    }

    function updateStats() {
        document.getElementById('aif-s-tag').textContent = stats.tagged;
        document.getElementById('aif-s-sus').textContent = stats.suspected;
        document.getElementById('aif-s-low').textContent = stats.lowqual;
        document.getElementById('aif-s-eng').textContent = stats.engagement;
        document.getElementById('aif-s-ok').textContent = stats.ok;
    }

    // filtering
    function findCards() {
        var sels = [
            '[class*="model-card" i]', '[class*="modelcard" i]', '[class*="ModelCard"]',
            '.print-card', 'article[class*="print" i]',
            '[class*="thingcard" i]', '[class*="searchresult" i]', '[class*="SearchResult"]',
            '[class*="GridItem"]', '[class*="grid-item"]'
        ];
        
        var cards = [];
        var seen = {};
        for (var i = 0; i < sels.length; i++) {
            var els = document.querySelectorAll(sels[i]);
            for (var j = 0; j < els.length; j++) {
                var el = els[j];
                if (el.offsetHeight > 50 && el.offsetWidth > 50 && !seen[el]) {
                    seen[el] = true;
                    cards.push(el);
                }
            }
        }
        return cards;
    }

    async function runFilter() {
        if (processing) return;
        processing = true;

        stats.tagged = 0;
        stats.suspected = 0;
        stats.lowqual = 0;
        stats.engagement = 0;
        stats.ok = 0;

        // clear old
        var oldEls = document.querySelectorAll('.aif-hide, .aif-hl, .aif-hl-sus, .aif-hl-low, .aif-hl-eng, .aif-done');
        for (var i = 0; i < oldEls.length; i++) {
            oldEls[i].classList.remove('aif-hide', 'aif-hl', 'aif-hl-sus', 'aif-hl-low', 'aif-hl-eng', 'aif-done');
        }
        var oldBadges = document.querySelectorAll('.aif-badge, .aif-why, .aif-acts, .aif-score');
        for (var j = 0; j < oldBadges.length; j++) {
            oldBadges[j].remove();
        }

        var cards = findCards();

        for (var k = 0; k < cards.length; k++) {
            await processCard(cards[k]);
        }

        updateStats();
        processing = false;
    }

    async function processCard(card) {
        var result = await analyzeCard(card);

        card.classList.add('aif-done');
        card.style.position = 'relative';

        if (result.whitelisted || result.markedOk) {
            stats.ok++;
            return;
        }

        var shouldFilter = false;
        var filterType = null;
        var badgeText = '';

        if (cfg.filterTagged && result.tagged) {
            shouldFilter = true;
            filterType = 'tag';
            badgeText = 'AI';
            stats.tagged++;
        } else if (cfg.filterSuspected && result.suspected) {
            shouldFilter = true;
            filterType = 'sus';
            badgeText = Math.round(result.conf * 100) + '%';
            stats.suspected++;
        } else if (cfg.filterLowQual && result.lowQual && !result.tagged && !result.suspected) {
            shouldFilter = true;
            filterType = 'low';
            badgeText = 'low';
            stats.lowqual++;
        } else if (cfg.engagementFilter && result.failsEngagement && !result.tagged && !result.suspected) {
            shouldFilter = true;
            filterType = 'eng';
            badgeText = 'eng';
            stats.engagement++;
        }

        if (!shouldFilter) {
            if (cfg.highlightOnly && result.conf > 0.35) {
                addActions(card, result);
            }
            return;
        }

        if (cfg.highlightOnly) {
            card.classList.add('aif-hl');
            if (filterType === 'sus') card.classList.add('aif-hl-sus');
            if (filterType === 'low') card.classList.add('aif-hl-low');
            if (filterType === 'eng') card.classList.add('aif-hl-eng');

            var badge = document.createElement('div');
            badge.className = 'aif-badge ' + filterType;
            badge.textContent = badgeText;
            card.appendChild(badge);

            if (cfg.showWhyFlagged && result.reasons.length > 0) {
                var why = document.createElement('div');
                why.className = 'aif-why';
                why.textContent = result.reasons.slice(0, 4).join(' / ');
                card.appendChild(why);
            }

            addActions(card, result);
        } else {
            card.classList.add('aif-hide');
        }

        if (cfg.showScores) {
            var score = document.createElement('div');
            score.className = 'aif-score';
            score.textContent = 'AI:' + Math.round(result.conf * 100) + '%';
            card.appendChild(score);
        }
    }

    function addActions(card, result) {
        var acts = document.createElement('div');
        acts.className = 'aif-acts';

        // ok button
        var okBtn = document.createElement('button');
        okBtn.className = 'aif-act';
        okBtn.textContent = 'ok';
        okBtn.title = 'mark as ok';
        okBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (result.url && markOk(result.url)) {
                okBtn.classList.add('ok');
                card.classList.remove('aif-hl', 'aif-hl-sus', 'aif-hl-low', 'aif-hl-eng');
                var b = card.querySelector('.aif-badge');
                if (b) b.remove();
                var w = card.querySelector('.aif-why');
                if (w) w.remove();
            }
        };
        acts.appendChild(okBtn);

        if (result.creator) {
            // whitelist
            var wlBtn = document.createElement('button');
            wlBtn.className = 'aif-act';
            wlBtn.textContent = '+';
            wlBtn.title = 'trust ' + result.creator;
            wlBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (addWhitelist(result.creator)) {
                    runFilter();
                }
            };
            acts.appendChild(wlBtn);

            // blacklist
            var blBtn = document.createElement('button');
            blBtn.className = 'aif-act';
            blBtn.textContent = 'x';
            blBtn.title = 'block ' + result.creator;
            blBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (addBlacklist(result.creator)) {
                    blBtn.classList.add('bl');
                    runFilter();
                }
            };
            acts.appendChild(blBtn);
        }

        card.appendChild(acts);
    }

    // observer
    function watch() {
        var timeout;
        var obs = new MutationObserver(function() {
            clearTimeout(timeout);
            timeout = setTimeout(runFilter, 400);
        });
        obs.observe(document.body, { childList: true, subtree: true });

        var scrollTimeout;
        window.addEventListener('scroll', function() {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(runFilter, 500);
        }, { passive: true });
    }

    // init
    function init() {
        console.log('[AI Filter] v' + VERSION);
        buildUI();
        watch();
        setTimeout(runFilter, 700);

        if (typeof GM_registerMenuCommand !== 'undefined') {
            GM_registerMenuCommand('refresh', runFilter);
            GM_registerMenuCommand('manage lists', showLists);
            GM_registerMenuCommand('export', doExport);
            GM_registerMenuCommand('import', doImport);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
