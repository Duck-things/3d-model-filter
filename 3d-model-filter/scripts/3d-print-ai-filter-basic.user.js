// ==UserScript==
// @name         3D Print AI Filter - Basic
// @namespace    https://github.com/3d-print-ai-filter
// @version      3.0.0
// @description  Filter explicitly tagged AI models from MakerWorld, Printables, Thangs
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

// basic version - only catches explicitly tagged AI models
// if you want heuristic detection use the advanced version
// if you want ML detection use the ml version

(function() {
    'use strict';

    var cfg = {
        enabled: true,
        highlightOnly: true,
        showCount: true
    };

    var count = 0;

    // styles - nothing fancy
    var css = '#aifilter-panel{position:fixed;bottom:20px;right:20px;background:#1a1a2e;color:#eee;padding:10px 15px;border-radius:8px;font-family:system-ui,sans-serif;font-size:12px;z-index:99999;box-shadow:0 4px 15px rgba(0,0,0,0.4)}#aifilter-panel label{display:flex;align-items:center;gap:6px;margin:4px 0;cursor:pointer}.aifilter-flagged{outline:3px solid #ff6b6b !important;outline-offset:-3px}.aifilter-hidden{display:none !important}';

    function loadCfg() {
        try {
            var saved = GM_getValue('aifilter_basic', null);
            if (saved) {
                var p = JSON.parse(saved);
                for (var k in p) if (cfg.hasOwnProperty(k)) cfg[k] = p[k];
            }
        } catch(e) {}
    }

    function saveCfg() {
        try { GM_setValue('aifilter_basic', JSON.stringify(cfg)); } catch(e) {}
    }

    function getSite() {
        var h = location.hostname;
        if (h.includes('makerworld')) return 'makerworld';
        if (h.includes('printables')) return 'printables';
        if (h.includes('thangs')) return 'thangs';
        return 'unknown';
    }

    function checkExplicitAI(card, site) {
        var html = card.innerHTML.toLowerCase();
        var href = card.querySelector('a')?.href || '';

        // makerworld
        if (site === 'makerworld') {
            if (card.querySelector('[class*="aigc"]')) return true;
            if (card.querySelector('[class*="AIGC"]')) return true;
            if (html.includes('aigc')) return true;
            if (href.includes('/2000') || href.includes('/2006')) return true;
            if (href.includes('generative')) return true;
        }

        // printables
        if (site === 'printables') {
            if (card.querySelector('.tag-ai')) return true;
            if (card.querySelector('[class*="ai-tag"]')) return true;
            if (card.querySelector('[class*="ai-generated"]')) return true;
        }

        // thangs - their markup is all over the place
        if (site === 'thangs') {
            if (html.includes('ai-generated')) return true;
            if (html.includes('aigc')) return true;
        }

        return false;
    }

    function getCardSelector(site) {
        if (site === 'makerworld') {
            return '.model-card, [class*="ModelCard"], [class*="model-card"], [class*="DesignCard"], a[href*="/models/"]';
        }
        if (site === 'printables') {
            return '.print-card, [class*="PrintCard"], [class*="print-card"], a[href*="/model/"]';
        }
        if (site === 'thangs') {
            return '.model-card, [class*="ModelCard"], [class*="ThingCard"], a[href*="/3d-model/"]';
        }
        return '[class*="card"], [class*="Card"]';
    }

    function processCard(card, site) {
        if (card.hasAttribute('data-aifilter')) return;
        card.setAttribute('data-aifilter', '1');

        if (!cfg.enabled) return;

        if (checkExplicitAI(card, site)) {
            count++;
            if (cfg.highlightOnly) {
                card.classList.add('aifilter-flagged');
            } else {
                card.classList.add('aifilter-hidden');
            }
            updateCount();
        }
    }

    function scan() {
        var site = getSite();
        var sel = getCardSelector(site);
        var cards = document.querySelectorAll(sel);
        for (var i = 0; i < cards.length; i++) {
            processCard(cards[i], site);
        }
    }

    function reset() {
        count = 0;
        document.querySelectorAll('[data-aifilter]').forEach(function(c) {
            c.removeAttribute('data-aifilter');
            c.classList.remove('aifilter-flagged', 'aifilter-hidden');
        });
        scan();
    }

    function updateCount() {
        var el = document.getElementById('aifilter-count');
        if (el) el.textContent = count;
    }

    function createPanel() {
        var panel = document.createElement('div');
        panel.id = 'aifilter-panel';
        panel.innerHTML = '<strong>AI Filter</strong> <span id="aifilter-count">0</span> found<br>' +
            '<label><input type="checkbox" id="aifilter-on"> Enabled</label>' +
            '<label><input type="checkbox" id="aifilter-hl"> Highlight only</label>';
        document.body.appendChild(panel);

        document.getElementById('aifilter-on').checked = cfg.enabled;
        document.getElementById('aifilter-hl').checked = cfg.highlightOnly;

        document.getElementById('aifilter-on').onchange = function() {
            cfg.enabled = this.checked;
            saveCfg();
            reset();
        };
        document.getElementById('aifilter-hl').onchange = function() {
            cfg.highlightOnly = this.checked;
            saveCfg();
            reset();
        };
    }

    function init() {
        GM_addStyle(css);
        loadCfg();
        createPanel();
        setTimeout(scan, 1000);

        // watch for new cards
        var obs = new MutationObserver(function(muts) {
            var dominated = false;
            for (var i = 0; i < muts.length; i++) {
                if (muts[i].addedNodes.length > 0) { dominated = true; break; }
            }
            if (dominated) setTimeout(scan, 300);
        });
        obs.observe(document.body, { childList: true, subtree: true });

        // spa navigation
        var lastUrl = location.href;
        setInterval(function() {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                setTimeout(reset, 800);
            }
        }, 1000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
