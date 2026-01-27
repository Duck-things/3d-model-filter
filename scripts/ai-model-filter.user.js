// ==UserScript==
// @name         3D Model AI Filter - MakerWorld, Printables, Thangs
// @namespace    https://github.com/ai-model-filter
// @version      1.0.0
// @description  Filter out AI-generated 3D models from MakerWorld, Printables, and Thangs
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

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        enabled: GM_getValue('aiFilterEnabled', true),
        showCount: GM_getValue('showFilterCount', true),
        highlightInstead: GM_getValue('highlightInstead', false), // Highlight instead of hide
        debug: false
    };

    // Statistics
    let stats = {
        hidden: 0,
        total: 0
    };

    // AI detection keywords and patterns
    const AI_INDICATORS = {
        tags: [
            'ai', 'ai-generated', 'ai generated', 'aigc', 'ai-assisted',
            'meshy', 'tripo', 'rodin', 'luma', 'csm', 'stable-diffusion',
            'text-to-3d', 'image-to-3d', 'generative', 'ai model',
            'makerlab', 'ai scanner', 'ai-created'
        ],
        categories: [
            'generative-3d-model', 'ai-scanner', '2000', '2006'
        ],
        textPatterns: [
            /\bai[\s-]?generated\b/i,
            /\baigc\b/i,
            /\bgenerat(ed|ive)\s*(by|with|using)?\s*ai\b/i,
            /\bmeshy\b/i,
            /\btripo\s*(ai|3d)?\b/i,
            /\btext[\s-]?to[\s-]?3d\b/i,
            /\bimage[\s-]?to[\s-]?3d\b/i,
            /\bcreated\s*(with|using|by)\s*ai\b/i,
            /\bai[\s-]?assisted\b/i,
            /\brodin\s*ai\b/i,
            /\bmakerlab\b/i
        ]
    };

    // Logging helper
    function log(...args) {
        if (CONFIG.debug) {
            console.log('[AI Filter]', ...args);
        }
    }

    // Create and inject the control panel UI
    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'ai-filter-panel';
        panel.innerHTML = `
            <style>
                #ai-filter-panel {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    color: #fff;
                    padding: 12px 16px;
                    border-radius: 12px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 13px;
                    z-index: 999999;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                    min-width: 200px;
                    transition: all 0.3s ease;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                #ai-filter-panel:hover {
                    box-shadow: 0 6px 25px rgba(0,0,0,0.4);
                }
                #ai-filter-panel.minimized {
                    min-width: auto;
                    padding: 8px 12px;
                }
                #ai-filter-panel.minimized .panel-content {
                    display: none;
                }
                #ai-filter-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 10px;
                    cursor: pointer;
                }
                #ai-filter-panel.minimized #ai-filter-header {
                    margin-bottom: 0;
                }
                #ai-filter-title {
                    font-weight: 600;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                #ai-filter-title svg {
                    width: 16px;
                    height: 16px;
                }
                #ai-filter-minimize {
                    background: none;
                    border: none;
                    color: #888;
                    cursor: pointer;
                    padding: 2px;
                    font-size: 16px;
                    line-height: 1;
                }
                #ai-filter-minimize:hover {
                    color: #fff;
                }
                .panel-content {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .filter-toggle {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                .filter-toggle:last-child {
                    border-bottom: none;
                }
                .toggle-switch {
                    position: relative;
                    width: 44px;
                    height: 24px;
                }
                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .toggle-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #444;
                    transition: 0.3s;
                    border-radius: 24px;
                }
                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: 0.3s;
                    border-radius: 50%;
                }
                input:checked + .toggle-slider {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                input:checked + .toggle-slider:before {
                    transform: translateX(20px);
                }
                .filter-stats {
                    background: rgba(255,255,255,0.05);
                    padding: 8px 10px;
                    border-radius: 8px;
                    text-align: center;
                    font-size: 12px;
                }
                .filter-stats .count {
                    font-size: 18px;
                    font-weight: 700;
                    color: #667eea;
                }
                .filter-label {
                    color: #aaa;
                    font-size: 12px;
                }
                .ai-highlighted {
                    outline: 3px solid #ff6b6b !important;
                    outline-offset: 2px;
                    position: relative;
                }
                .ai-highlighted::after {
                    content: '🤖 AI';
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    background: #ff6b6b;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: bold;
                    z-index: 100;
                }
                .ai-hidden {
                    display: none !important;
                }
            </style>
            <div id="ai-filter-header">
                <span id="ai-filter-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                    AI Model Filter
                </span>
                <button id="ai-filter-minimize">−</button>
            </div>
            <div class="panel-content">
                <div class="filter-toggle">
                    <span class="filter-label">Filter Enabled</span>
                    <label class="toggle-switch">
                        <input type="checkbox" id="toggle-enabled" ${CONFIG.enabled ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="filter-toggle">
                    <span class="filter-label">Highlight Only</span>
                    <label class="toggle-switch">
                        <input type="checkbox" id="toggle-highlight" ${CONFIG.highlightInstead ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="filter-stats">
                    <div class="count" id="hidden-count">0</div>
                    <div>AI models filtered</div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        // Event listeners
        document.getElementById('ai-filter-minimize').addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.toggle('minimized');
        });

        document.getElementById('toggle-enabled').addEventListener('change', (e) => {
            CONFIG.enabled = e.target.checked;
            GM_setValue('aiFilterEnabled', CONFIG.enabled);
            applyFiltering();
        });

        document.getElementById('toggle-highlight').addEventListener('change', (e) => {
            CONFIG.highlightInstead = e.target.checked;
            GM_setValue('highlightInstead', CONFIG.highlightInstead);
            applyFiltering();
        });

        return panel;
    }

    // Update the stats display
    function updateStats() {
        const countEl = document.getElementById('hidden-count');
        if (countEl) {
            countEl.textContent = stats.hidden;
        }
    }

    // Check if text contains AI indicators
    function containsAIIndicators(text) {
        if (!text) return false;
        const lowerText = text.toLowerCase();

        // Check tags
        for (const tag of AI_INDICATORS.tags) {
            if (lowerText.includes(tag)) {
                log('Found AI tag:', tag, 'in:', text.substring(0, 100));
                return true;
            }
        }

        // Check regex patterns
        for (const pattern of AI_INDICATORS.textPatterns) {
            if (pattern.test(text)) {
                log('Found AI pattern:', pattern, 'in:', text.substring(0, 100));
                return true;
            }
        }

        return false;
    }

    // Check if URL contains AI category indicators
    function containsAICategory(url) {
        if (!url) return false;
        const lowerUrl = url.toLowerCase();

        for (const cat of AI_INDICATORS.categories) {
            if (lowerUrl.includes(cat) || lowerUrl.includes(`/${cat}/`) || lowerUrl.includes(`category=${cat}`)) {
                return true;
            }
        }
        return false;
    }

    // ==================== MAKERWORLD ====================
    function processMakerWorld() {
        // Model cards in grid view
        const modelCards = document.querySelectorAll('[class*="model-card"], [class*="ModelCard"], .mw-model-card, a[href*="/models/"]');

        modelCards.forEach(card => {
            if (card.dataset.aiChecked) return;
            card.dataset.aiChecked = 'true';

            let isAI = false;

            // Check for AIGC badge/label
            const aigcBadge = card.querySelector('[class*="aigc"], [class*="AIGC"], .ai-badge, .ai-label');
            if (aigcBadge) {
                isAI = true;
            }

            // Check card text content
            const cardText = card.textContent || '';
            if (containsAIIndicators(cardText)) {
                isAI = true;
            }

            // Check href for AI categories
            const href = card.href || card.querySelector('a')?.href || '';
            if (containsAICategory(href)) {
                isAI = true;
            }

            // Check for AI-related data attributes
            const allElements = card.querySelectorAll('*');
            allElements.forEach(el => {
                const attrs = Array.from(el.attributes || []);
                attrs.forEach(attr => {
                    if (containsAIIndicators(attr.value)) {
                        isAI = true;
                    }
                });
            });

            // Check for specific MakerWorld AI categories in URL
            if (href.includes('/3d-models/2000') || href.includes('/3d-models/2006')) {
                isAI = true;
            }

            if (isAI) {
                applyFilterToElement(card);
            }
        });

        // Also check grid item wrappers
        const gridItems = document.querySelectorAll('[class*="grid"] > div, [class*="Grid"] > div, .model-list > div');
        gridItems.forEach(item => {
            if (item.dataset.aiChecked) return;

            const link = item.querySelector('a[href*="/models/"]');
            if (link) {
                const href = link.href || '';
                if (containsAICategory(href) || containsAIIndicators(item.textContent)) {
                    item.dataset.aiChecked = 'true';
                    applyFilterToElement(item);
                }
            }
        });
    }

    // ==================== PRINTABLES ====================
    function processPrintables() {
        // Model cards
        const modelCards = document.querySelectorAll('.print-card, .model-card, [class*="PrintCard"], article[class*="print"]');

        modelCards.forEach(card => {
            if (card.dataset.aiChecked) return;
            card.dataset.aiChecked = 'true';

            let isAI = false;

            // Check for AI badge - Printables uses specific AI labels
            const aiBadge = card.querySelector('.ai-badge, .ai-label, [class*="ai-generated"], [class*="AiGenerated"], [title*="AI"]');
            if (aiBadge) {
                isAI = true;
            }

            // Check for AI icon/indicator
            const aiIndicator = card.querySelector('[class*="artificial"], svg[class*="ai"]');
            if (aiIndicator) {
                isAI = true;
            }

            // Check text content
            const cardText = card.textContent || '';
            if (containsAIIndicators(cardText)) {
                isAI = true;
            }

            // Check for data attributes
            if (card.dataset.aiGenerated === 'true' || card.dataset.ai === 'true') {
                isAI = true;
            }

            // Look for the AI tag specifically used by Printables
            const tags = card.querySelectorAll('.tag, .badge, [class*="tag"], [class*="badge"]');
            tags.forEach(tag => {
                const tagText = tag.textContent?.toLowerCase() || '';
                if (tagText === 'ai' || tagText.includes('ai generated') || tagText.includes('aigc')) {
                    isAI = true;
                }
            });

            if (isAI) {
                applyFilterToElement(card);
            }
        });

        // Grid containers
        const gridItems = document.querySelectorAll('.prints-grid > *, .models-grid > *, [class*="grid"] > article');
        gridItems.forEach(item => {
            if (item.dataset.aiChecked) return;
            item.dataset.aiChecked = 'true';

            if (containsAIIndicators(item.textContent)) {
                applyFilterToElement(item);
            }
        });
    }

    // ==================== THANGS ====================
    function processThangs() {
        // Thangs model cards
        const modelCards = document.querySelectorAll('[class*="ModelCard"], [class*="model-card"], .thing-card, [class*="ThingCard"]');

        modelCards.forEach(card => {
            if (card.dataset.aiChecked) return;
            card.dataset.aiChecked = 'true';

            let isAI = false;

            // Check text content for AI indicators
            const cardText = card.textContent || '';
            if (containsAIIndicators(cardText)) {
                isAI = true;
            }

            // Check for AI badges or labels
            const badges = card.querySelectorAll('[class*="badge"], [class*="tag"], [class*="label"]');
            badges.forEach(badge => {
                if (containsAIIndicators(badge.textContent)) {
                    isAI = true;
                }
            });

            // Check links
            const links = card.querySelectorAll('a');
            links.forEach(link => {
                if (containsAICategory(link.href)) {
                    isAI = true;
                }
            });

            if (isAI) {
                applyFilterToElement(card);
            }
        });

        // Search results
        const searchResults = document.querySelectorAll('[class*="SearchResult"], [class*="search-result"]');
        searchResults.forEach(result => {
            if (result.dataset.aiChecked) return;
            result.dataset.aiChecked = 'true';

            if (containsAIIndicators(result.textContent)) {
                applyFilterToElement(result);
            }
        });
    }

    // Apply filter or highlight to element
    function applyFilterToElement(element) {
        if (!CONFIG.enabled) {
            element.classList.remove('ai-hidden', 'ai-highlighted');
            return;
        }

        if (CONFIG.highlightInstead) {
            element.classList.remove('ai-hidden');
            element.classList.add('ai-highlighted');
        } else {
            element.classList.remove('ai-highlighted');
            element.classList.add('ai-hidden');
        }

        if (!element.dataset.aiCounted) {
            element.dataset.aiCounted = 'true';
            stats.hidden++;
            updateStats();
        }
    }

    // Main filtering function
    function applyFiltering() {
        stats.hidden = 0;

        // Reset all previously marked elements
        document.querySelectorAll('[data-ai-checked]').forEach(el => {
            el.classList.remove('ai-hidden', 'ai-highlighted');
            el.removeAttribute('data-ai-checked');
            el.removeAttribute('data-ai-counted');
        });

        if (!CONFIG.enabled) {
            updateStats();
            return;
        }

        const hostname = window.location.hostname;

        if (hostname.includes('makerworld')) {
            processMakerWorld();
        } else if (hostname.includes('printables')) {
            processPrintables();
        } else if (hostname.includes('thangs')) {
            processThangs();
        }

        updateStats();
    }

    // Observe DOM changes for dynamic content
    function setupObserver() {
        const observer = new MutationObserver((mutations) => {
            let shouldProcess = false;

            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            shouldProcess = true;
                            break;
                        }
                    }
                }
                if (shouldProcess) break;
            }

            if (shouldProcess) {
                // Debounce processing
                clearTimeout(window.aiFilterDebounce);
                window.aiFilterDebounce = setTimeout(applyFiltering, 200);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Initialize
    function init() {
        log('Initializing AI Model Filter');

        // Create control panel
        createControlPanel();

        // Initial filtering
        applyFiltering();

        // Setup observer for dynamic content
        setupObserver();

        // Also re-run on scroll for lazy-loaded content
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(applyFiltering, 300);
        });

        // Register menu commands for Tampermonkey
        if (typeof GM_registerMenuCommand !== 'undefined') {
            GM_registerMenuCommand('Toggle AI Filter', () => {
                CONFIG.enabled = !CONFIG.enabled;
                GM_setValue('aiFilterEnabled', CONFIG.enabled);
                document.getElementById('toggle-enabled').checked = CONFIG.enabled;
                applyFiltering();
            });

            GM_registerMenuCommand('Toggle Highlight Mode', () => {
                CONFIG.highlightInstead = !CONFIG.highlightInstead;
                GM_setValue('highlightInstead', CONFIG.highlightInstead);
                document.getElementById('toggle-highlight').checked = CONFIG.highlightInstead;
                applyFiltering();
            });
        }

        log('AI Model Filter initialized');
    }

    // Wait for page to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
