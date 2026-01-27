/*
 * AI Model Filter - Bookmarklet Version
 * 
 * To use this:
 * 1. Create a new bookmark in your browser
 * 2. Name it "Filter AI Models"
 * 3. In the URL/Location field, paste the minified version below
 * 
 * Then just click the bookmark when you're on MakerWorld, Printables, or Thangs!
 */

// ============== FULL VERSION (for reference) ==============

(function() {
    'use strict';
    
    // Check if already running
    if (window.aiFilterActive) {
        alert('AI Filter is already running! Look for the panel in the bottom-right corner.');
        return;
    }
    window.aiFilterActive = true;
    
    const AI_TAGS = ['ai', 'ai-generated', 'aigc', 'meshy', 'tripo', 'rodin', 'luma', 'text-to-3d', 'image-to-3d', 'generative', 'makerlab', 'ai scanner', 'ai-created', 'ai-assisted'];
    const AI_PATTERNS = [/\bai[\s-]?generated\b/i, /\baigc\b/i, /\bmeshy\b/i, /\btripo/i, /\btext[\s-]?to[\s-]?3d\b/i, /\bimage[\s-]?to[\s-]?3d\b/i, /\bmakerlab\b/i];
    
    let enabled = true;
    let highlightMode = false;
    let count = 0;
    
    // Create panel
    const panel = document.createElement('div');
    panel.id = 'ai-filter-bookmarklet';
    panel.innerHTML = `
        <style>
            #ai-filter-bookmarklet {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #1a1a2e;
                color: #fff;
                padding: 15px;
                border-radius: 12px;
                font-family: -apple-system, sans-serif;
                font-size: 13px;
                z-index: 999999;
                box-shadow: 0 4px 20px rgba(0,0,0,0.4);
                min-width: 180px;
            }
            #ai-filter-bookmarklet h3 {
                margin: 0 0 12px 0;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            #ai-filter-bookmarklet button {
                display: block;
                width: 100%;
                padding: 8px;
                margin: 5px 0;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }
            #ai-filter-bookmarklet .btn-toggle {
                background: #667eea;
                color: white;
            }
            #ai-filter-bookmarklet .btn-toggle.off {
                background: #444;
            }
            #ai-filter-bookmarklet .btn-mode {
                background: #333;
                color: #aaa;
            }
            #ai-filter-bookmarklet .btn-mode.active {
                background: #ff6b6b;
                color: white;
            }
            #ai-filter-bookmarklet .btn-close {
                background: #333;
                color: #888;
            }
            #ai-filter-bookmarklet button:hover {
                opacity: 0.9;
            }
            #ai-filter-bookmarklet .stats {
                text-align: center;
                padding: 10px;
                background: rgba(255,255,255,0.05);
                border-radius: 6px;
                margin: 10px 0;
            }
            #ai-filter-bookmarklet .stats .num {
                font-size: 24px;
                font-weight: bold;
                color: #667eea;
            }
            .ai-filter-hidden { display: none !important; }
            .ai-filter-highlighted { 
                outline: 3px solid #ff6b6b !important; 
                outline-offset: 2px; 
            }
        </style>
        <h3>🤖 AI Filter</h3>
        <button class="btn-toggle" id="af-toggle">Filter: ON</button>
        <button class="btn-mode" id="af-mode">Highlight Mode</button>
        <div class="stats">
            <div class="num" id="af-count">0</div>
            <div>AI models filtered</div>
        </div>
        <button class="btn-close" id="af-close">Close Panel</button>
    `;
    document.body.appendChild(panel);
    
    function isAI(text) {
        if (!text) return false;
        const lower = text.toLowerCase();
        for (const tag of AI_TAGS) {
            if (lower.includes(tag)) return true;
        }
        for (const pat of AI_PATTERNS) {
            if (pat.test(text)) return true;
        }
        return false;
    }
    
    function processCards() {
        count = 0;
        const selectors = [
            '[class*="model-card"]', '[class*="ModelCard"]',
            '.print-card', '.mw-model-card',
            'a[href*="/models/"]', 'article[class*="print"]',
            '[class*="ThingCard"]', '[class*="SearchResult"]'
        ];
        
        const cards = document.querySelectorAll(selectors.join(','));
        
        cards.forEach(card => {
            card.classList.remove('ai-filter-hidden', 'ai-filter-highlighted');
            
            if (!enabled) return;
            
            let cardIsAI = false;
            
            // Check text content
            if (isAI(card.textContent)) cardIsAI = true;
            
            // Check for badges
            const badges = card.querySelectorAll('[class*="badge"], [class*="tag"], [class*="aigc"], [class*="AIGC"]');
            badges.forEach(b => {
                if (isAI(b.textContent) || b.className.toLowerCase().includes('ai')) cardIsAI = true;
            });
            
            // Check href
            const link = card.href || card.querySelector('a')?.href || '';
            if (link.includes('/3d-models/2000') || link.includes('/3d-models/2006')) cardIsAI = true;
            
            if (cardIsAI) {
                count++;
                if (highlightMode) {
                    card.classList.add('ai-filter-highlighted');
                } else {
                    card.classList.add('ai-filter-hidden');
                }
            }
        });
        
        document.getElementById('af-count').textContent = count;
    }
    
    // Event listeners
    document.getElementById('af-toggle').addEventListener('click', function() {
        enabled = !enabled;
        this.textContent = enabled ? 'Filter: ON' : 'Filter: OFF';
        this.classList.toggle('off', !enabled);
        processCards();
    });
    
    document.getElementById('af-mode').addEventListener('click', function() {
        highlightMode = !highlightMode;
        this.classList.toggle('active', highlightMode);
        this.textContent = highlightMode ? 'Highlight: ON' : 'Highlight Mode';
        processCards();
    });
    
    document.getElementById('af-close').addEventListener('click', function() {
        panel.remove();
        document.querySelectorAll('.ai-filter-hidden, .ai-filter-highlighted').forEach(el => {
            el.classList.remove('ai-filter-hidden', 'ai-filter-highlighted');
        });
        window.aiFilterActive = false;
    });
    
    // Initial processing
    processCards();
    
    // Watch for new content
    const observer = new MutationObserver(() => {
        clearTimeout(window.afDebounce);
        window.afDebounce = setTimeout(processCards, 300);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Also process on scroll
    window.addEventListener('scroll', () => {
        clearTimeout(window.afScrollDebounce);
        window.afScrollDebounce = setTimeout(processCards, 500);
    });
})();


// ============== MINIFIED BOOKMARKLET ==============
// Copy everything below this line (starting with javascript:) and paste as bookmark URL:

/*
javascript:(function(){if(window.aiFilterActive){alert('AI Filter already running!');return;}window.aiFilterActive=true;const t=['ai','ai-generated','aigc','meshy','tripo','rodin','luma','text-to-3d','image-to-3d','generative','makerlab','ai scanner'];const p=[/\bai[\s-]?generated\b/i,/\baigc\b/i,/\bmeshy\b/i,/\btripo/i,/\btext[\s-]?to[\s-]?3d\b/i,/\bmakerlab\b/i];let e=true,h=false,c=0;const d=document.createElement('div');d.id='aif';d.innerHTML=`<style>#aif{position:fixed;bottom:20px;right:20px;background:#1a1a2e;color:#fff;padding:15px;border-radius:12px;font-family:sans-serif;font-size:13px;z-index:999999;box-shadow:0 4px 20px rgba(0,0,0,0.4);min-width:180px}#aif h3{margin:0 0 12px;font-size:14px}#aif button{display:block;width:100%;padding:8px;margin:5px 0;border:none;border-radius:6px;cursor:pointer;font-size:12px}#aif .bt{background:#667eea;color:#fff}#aif .bt.off{background:#444}#aif .bm{background:#333;color:#aaa}#aif .bm.on{background:#ff6b6b;color:#fff}#aif .bc{background:#333;color:#888}#aif .st{text-align:center;padding:10px;background:rgba(255,255,255,0.05);border-radius:6px;margin:10px 0}#aif .st .n{font-size:24px;font-weight:bold;color:#667eea}.afh{display:none!important}.afl{outline:3px solid #ff6b6b!important}</style><h3>🤖 AI Filter</h3><button class="bt" id="aft">Filter: ON</button><button class="bm" id="afm">Highlight Mode</button><div class="st"><div class="n" id="afc">0</div><div>filtered</div></div><button class="bc" id="afc2">Close</button>`;document.body.appendChild(d);function isAI(x){if(!x)return false;const l=x.toLowerCase();for(const i of t)if(l.includes(i))return true;for(const i of p)if(i.test(x))return true;return false}function run(){c=0;document.querySelectorAll('[class*="model-card"],[class*="ModelCard"],.print-card,a[href*="/models/"],article[class*="print"],[class*="ThingCard"]').forEach(el=>{el.classList.remove('afh','afl');if(!e)return;let ai=isAI(el.textContent);el.querySelectorAll('[class*="badge"],[class*="tag"],[class*="aigc"]').forEach(b=>{if(isAI(b.textContent)||b.className.toLowerCase().includes('ai'))ai=true});const l=el.href||el.querySelector('a')?.href||'';if(l.includes('/3d-models/2000')||l.includes('/3d-models/2006'))ai=true;if(ai){c++;el.classList.add(h?'afl':'afh')}});document.getElementById('afc').textContent=c}document.getElementById('aft').onclick=function(){e=!e;this.textContent=e?'Filter: ON':'Filter: OFF';this.classList.toggle('off',!e);run()};document.getElementById('afm').onclick=function(){h=!h;this.classList.toggle('on',h);this.textContent=h?'Highlight: ON':'Highlight Mode';run()};document.getElementById('afc2').onclick=function(){d.remove();document.querySelectorAll('.afh,.afl').forEach(el=>el.classList.remove('afh','afl'));window.aiFilterActive=false};run();new MutationObserver(()=>{clearTimeout(window.afd);window.afd=setTimeout(run,300)}).observe(document.body,{childList:true,subtree:true});window.addEventListener('scroll',()=>{clearTimeout(window.afs);window.afs=setTimeout(run,500)})})();
*/
