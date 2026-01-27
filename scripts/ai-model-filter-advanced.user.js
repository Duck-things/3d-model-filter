// ==UserScript==
// @name         3D Model AI & Quality Filter (Advanced)
// @namespace    https://github.com/ai-model-filter
// @version      2.0.0
// @description  Advanced filter for AI-generated and low-quality 3D models on MakerWorld, Printables, and Thangs with ML-based detection
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
// @grant        GM_xmlhttpRequest
// @connect      *
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // ==================== CONFIGURATION ====================
    const CONFIG = {
        // Filter modes
        filterTaggedAI: GM_getValue('filterTaggedAI', true),
        filterSuspectedAI: GM_getValue('filterSuspectedAI', false),
        filterLowQuality: GM_getValue('filterLowQuality', false),
        
        // Detection thresholds
        aiConfidenceThreshold: GM_getValue('aiConfidenceThreshold', 0.6),
        qualityThreshold: GM_getValue('qualityThreshold', 0.4),
        
        // Display options
        highlightInstead: GM_getValue('highlightInstead', false),
        showScores: GM_getValue('showScores', false),
        
        // Advanced
        analyzeImages: GM_getValue('analyzeImages', true),
        debug: false
    };

    // Statistics
    const stats = {
        taggedAI: 0,
        suspectedAI: 0,
        lowQuality: 0,
        total: 0
    };

    // ==================== AI DETECTION PATTERNS ====================
    
    // Explicit AI tags/labels
    const EXPLICIT_AI_TAGS = [
        'ai', 'ai-generated', 'ai generated', 'aigc', 'ai-assisted',
        'meshy', 'tripo', 'rodin', 'luma', 'csm', 'stable-diffusion',
        'text-to-3d', 'image-to-3d', 'generative', 'ai model',
        'makerlab', 'ai scanner', 'ai-created', 'generated with ai',
        'ai art', 'ai sculpture', 'neural network'
    ];

    const AI_TEXT_PATTERNS = [
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
        /\bmakerlab\b/i,
        /\bneural[\s-]?network\b/i
    ];

    // ==================== HEURISTIC AI DETECTION ====================
    
    // Patterns that suggest AI generation even without explicit tags
    const AI_HEURISTICS = {
        // Description patterns common in AI-generated uploads
        descriptionPatterns: [
            /generated\s*(this|the)?\s*model/i,
            /created\s*using\s*(an?\s*)?(online|web|free)\s*tool/i,
            /converted?\s*(from|an?)\s*image/i,
            /turned?\s*(my|this|an?)\s*(photo|picture|image)\s*into/i,
            /3d\s*scan(ned)?\s*from\s*(a\s*)?(photo|image)/i,
            /instant\s*3d/i,
            /one[\s-]?click\s*(3d|model)/i,
            /auto(matic(ally)?)?[\s-]?generat/i
        ],
        
        // Title patterns
        titlePatterns: [
            /^[A-Z][a-z]+\s+(Statue|Figure|Bust|Sculpture)$/,  // Generic AI naming
            /^(Cute|Cool|Amazing|Beautiful)\s+\w+$/i,  // Low-effort titles
            /^3D\s+(Model|Print)\s+of\s+/i,
            /\bv\d+(\.\d+)?\s*$/i  // Version numbers at end (batch uploads)
        ],
        
        // File/model characteristics (when available)
        modelIndicators: {
            noMakePhotos: true,
            onlyRenders: true,
            noPrintProfile: true,
            veryHighPolyCount: true,
            genericThumbnail: true
        }
    };

    // ==================== QUALITY SCORING ====================
    
    const QUALITY_FACTORS = {
        // Positive indicators (add to score)
        positive: {
            hasMakePhotos: 0.25,
            hasRealPrintPhoto: 0.20,
            hasPrintProfile: 0.15,
            hasDetailedDescription: 0.10,
            hasMultipleImages: 0.10,
            goodEngagement: 0.10,  // likes/downloads ratio
            establishedCreator: 0.10,
            hasComments: 0.05,
            hasRemixes: 0.05
        },
        // Negative indicators (subtract from score)
        negative: {
            onlyRenders: -0.20,
            genericDescription: -0.15,
            noDescription: -0.20,
            newAccountManyUploads: -0.25,
            batchUploadPattern: -0.20,
            suspiciouslyPerfectRender: -0.15,
            noEngagement: -0.10,
            duplicateStyle: -0.15
        }
    };

    // ==================== IMAGE ANALYSIS ====================
    
    class ImageAnalyzer {
        constructor() {
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        }

        async analyzeImage(imgElement) {
            return new Promise((resolve) => {
                try {
                    // Handle cross-origin images
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    
                    img.onload = () => {
                        const analysis = this.performAnalysis(img);
                        resolve(analysis);
                    };
                    
                    img.onerror = () => {
                        resolve({ aiScore: 0, qualityScore: 0.5, error: true });
                    };
                    
                    // Try to load the image
                    img.src = imgElement.src;
                    
                    // Timeout fallback
                    setTimeout(() => {
                        resolve({ aiScore: 0, qualityScore: 0.5, timeout: true });
                    }, 3000);
                    
                } catch (e) {
                    resolve({ aiScore: 0, qualityScore: 0.5, error: true });
                }
            });
        }

        performAnalysis(img) {
            const width = Math.min(img.width, 200);
            const height = Math.min(img.height, 200);
            
            this.canvas.width = width;
            this.canvas.height = height;
            this.ctx.drawImage(img, 0, 0, width, height);
            
            let imageData;
            try {
                imageData = this.ctx.getImageData(0, 0, width, height);
            } catch (e) {
                return { aiScore: 0, qualityScore: 0.5, corsError: true };
            }
            
            const features = this.extractFeatures(imageData);
            const aiScore = this.calculateAIScore(features);
            const qualityScore = this.calculateImageQualityScore(features);
            
            return { aiScore, qualityScore, features };
        }

        extractFeatures(imageData) {
            const data = imageData.data;
            const width = imageData.width;
            const height = imageData.height;
            
            let features = {
                // Color analysis
                colorVariance: 0,
                saturationMean: 0,
                brightnessMean: 0,
                
                // Texture analysis
                edgeDensity: 0,
                noiseLevel: 0,
                smoothness: 0,
                
                // Pattern analysis
                symmetry: 0,
                repetition: 0,
                
                // Render detection
                perfectGradients: 0,
                unnaturalColors: 0,
                plasticLook: 0
            };
            
            // Calculate color statistics
            let rSum = 0, gSum = 0, bSum = 0;
            let satSum = 0, brightSum = 0;
            const colors = [];
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                rSum += r; gSum += g; bSum += b;
                
                // HSL conversion for saturation/brightness
                const max = Math.max(r, g, b) / 255;
                const min = Math.min(r, g, b) / 255;
                const l = (max + min) / 2;
                const s = max === min ? 0 : l > 0.5 
                    ? (max - min) / (2 - max - min) 
                    : (max - min) / (max + min);
                
                satSum += s;
                brightSum += l;
                
                // Store unique colors for variance calculation
                if (i % 16 === 0) {
                    colors.push({ r, g, b });
                }
            }
            
            const pixelCount = data.length / 4;
            features.brightnessMean = brightSum / pixelCount;
            features.saturationMean = satSum / pixelCount;
            
            // Color variance
            const rMean = rSum / pixelCount;
            const gMean = gSum / pixelCount;
            const bMean = bSum / pixelCount;
            
            let variance = 0;
            for (const c of colors) {
                variance += Math.pow(c.r - rMean, 2) + Math.pow(c.g - gMean, 2) + Math.pow(c.b - bMean, 2);
            }
            features.colorVariance = Math.sqrt(variance / colors.length) / 255;
            
            // Edge detection (simple Sobel-like)
            let edgeSum = 0;
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = (y * width + x) * 4;
                    const left = data[idx - 4];
                    const right = data[idx + 4];
                    const up = data[idx - width * 4];
                    const down = data[idx + width * 4];
                    
                    const gx = Math.abs(right - left);
                    const gy = Math.abs(down - up);
                    edgeSum += Math.sqrt(gx * gx + gy * gy);
                }
            }
            features.edgeDensity = edgeSum / (width * height * 255);
            
            // Detect unnaturally smooth gradients (common in renders)
            let smoothCount = 0;
            for (let y = 0; y < height - 1; y++) {
                for (let x = 0; x < width - 1; x++) {
                    const idx = (y * width + x) * 4;
                    const diff = Math.abs(data[idx] - data[idx + 4]) +
                                Math.abs(data[idx + 1] - data[idx + 5]) +
                                Math.abs(data[idx + 2] - data[idx + 6]);
                    if (diff < 10) smoothCount++;
                }
            }
            features.smoothness = smoothCount / (width * height);
            
            // Detect "plastic" look (high saturation + smoothness)
            features.plasticLook = features.smoothness * features.saturationMean;
            
            // Perfect gradient detection
            features.perfectGradients = features.smoothness > 0.7 ? 1 : features.smoothness;
            
            return features;
        }

        calculateAIScore(features) {
            let score = 0;
            
            // AI-generated renders tend to have:
            // - Very smooth gradients
            // - High saturation
            // - Low noise/texture
            // - "Plastic" appearance
            
            // Smoothness is suspicious
            if (features.smoothness > 0.6) score += 0.2;
            if (features.smoothness > 0.8) score += 0.15;
            
            // Very saturated colors (common in AI renders)
            if (features.saturationMean > 0.5) score += 0.1;
            if (features.saturationMean > 0.7) score += 0.1;
            
            // Low edge density suggests render not photo
            if (features.edgeDensity < 0.05) score += 0.15;
            
            // Plastic look
            if (features.plasticLook > 0.4) score += 0.15;
            
            // Perfect gradients
            if (features.perfectGradients > 0.7) score += 0.15;
            
            return Math.min(1, score);
        }

        calculateImageQualityScore(features) {
            let score = 0.5; // Start neutral
            
            // Real photos tend to have:
            // - More texture/noise
            // - Natural color variance
            // - Visible edges (layer lines, etc.)
            
            // Good edge density (suggests real photo with detail)
            if (features.edgeDensity > 0.08) score += 0.2;
            
            // Natural color variance
            if (features.colorVariance > 0.2 && features.colorVariance < 0.6) score += 0.15;
            
            // Not too smooth (real photos have texture)
            if (features.smoothness < 0.5) score += 0.15;
            
            // Moderate saturation (not oversaturated)
            if (features.saturationMean > 0.2 && features.saturationMean < 0.6) score += 0.1;
            
            return Math.min(1, Math.max(0, score));
        }
    }

    // ==================== MODEL ANALYZER ====================
    
    class ModelAnalyzer {
        constructor() {
            this.imageAnalyzer = new ImageAnalyzer();
            this.cache = new Map();
        }

        async analyzeCard(card) {
            const cardId = this.getCardId(card);
            
            if (this.cache.has(cardId)) {
                return this.cache.get(cardId);
            }

            const result = {
                isTaggedAI: false,
                aiConfidence: 0,
                qualityScore: 0.5,
                reasons: []
            };

            // 1. Check explicit AI tags
            const tagResult = this.checkExplicitTags(card);
            if (tagResult.isAI) {
                result.isTaggedAI = true;
                result.aiConfidence = 1.0;
                result.reasons.push(...tagResult.reasons);
            }

            // 2. Heuristic analysis
            const heuristicResult = this.analyzeHeuristics(card);
            result.aiConfidence = Math.max(result.aiConfidence, heuristicResult.confidence);
            result.reasons.push(...heuristicResult.reasons);

            // 3. Image analysis
            if (CONFIG.analyzeImages) {
                const imageResult = await this.analyzeCardImage(card);
                if (imageResult.aiScore > 0.3) {
                    result.aiConfidence = Math.max(result.aiConfidence, imageResult.aiScore * 0.8);
                    if (imageResult.aiScore > 0.5) {
                        result.reasons.push('Render-like image detected');
                    }
                }
                result.qualityScore = imageResult.qualityScore;
            }

            // 4. Quality scoring
            const qualityResult = this.calculateQuality(card, result);
            result.qualityScore = (result.qualityScore + qualityResult.score) / 2;
            result.reasons.push(...qualityResult.reasons);

            this.cache.set(cardId, result);
            return result;
        }

        getCardId(card) {
            const link = card.querySelector('a[href*="/model"]')?.href || 
                        card.querySelector('a')?.href || 
                        card.href || '';
            return link || `card-${Math.random()}`;
        }

        checkExplicitTags(card) {
            const result = { isAI: false, reasons: [] };
            const text = (card.textContent || '').toLowerCase();
            const html = (card.innerHTML || '').toLowerCase();

            // Check for AIGC badges
            if (card.querySelector('[class*="aigc"], [class*="AIGC"], .ai-badge, .ai-label')) {
                result.isAI = true;
                result.reasons.push('AIGC badge detected');
            }

            // Check tags
            for (const tag of EXPLICIT_AI_TAGS) {
                if (text.includes(tag)) {
                    result.isAI = true;
                    result.reasons.push(`Tag: "${tag}"`);
                    break;
                }
            }

            // Check patterns
            for (const pattern of AI_TEXT_PATTERNS) {
                if (pattern.test(text)) {
                    result.isAI = true;
                    result.reasons.push('AI text pattern matched');
                    break;
                }
            }

            // Check MakerWorld AI categories
            const href = card.querySelector('a')?.href || card.href || '';
            if (href.includes('/3d-models/2000') || href.includes('/3d-models/2006')) {
                result.isAI = true;
                result.reasons.push('AI category URL');
            }

            // Check data attributes
            if (card.dataset.aiGenerated === 'true' || html.includes('data-ai="true"')) {
                result.isAI = true;
                result.reasons.push('AI data attribute');
            }

            return result;
        }

        analyzeHeuristics(card) {
            const result = { confidence: 0, reasons: [] };
            const text = card.textContent || '';
            const title = card.querySelector('h2, h3, .title, [class*="title"]')?.textContent || '';
            const description = card.querySelector('.description, [class*="desc"]')?.textContent || '';

            // Check description patterns
            for (const pattern of AI_HEURISTICS.descriptionPatterns) {
                if (pattern.test(text)) {
                    result.confidence += 0.2;
                    result.reasons.push('Suspicious description pattern');
                    break;
                }
            }

            // Check title patterns
            for (const pattern of AI_HEURISTICS.titlePatterns) {
                if (pattern.test(title)) {
                    result.confidence += 0.15;
                    result.reasons.push('Generic AI-style title');
                    break;
                }
            }

            // Check for missing quality indicators
            if (!card.querySelector('[class*="make"], [class*="print"], .makes-count')) {
                result.confidence += 0.1;
            }

            // Check for render-only thumbnails (no "makes" visible)
            const hasOnlyRender = !text.toLowerCase().includes('printed') && 
                                  !text.toLowerCase().includes('print photo');
            if (hasOnlyRender) {
                result.confidence += 0.1;
            }

            result.confidence = Math.min(1, result.confidence);
            return result;
        }

        async analyzeCardImage(card) {
            const img = card.querySelector('img[src*="thumb"], img[src*="cover"], img:first-of-type');
            
            if (!img || !img.src) {
                return { aiScore: 0, qualityScore: 0.5 };
            }

            try {
                return await this.imageAnalyzer.analyzeImage(img);
            } catch (e) {
                return { aiScore: 0, qualityScore: 0.5 };
            }
        }

        calculateQuality(card, currentResult) {
            const result = { score: 0.5, reasons: [] };
            const text = card.textContent || '';
            const textLower = text.toLowerCase();

            // Positive: Has makes/prints
            if (textLower.includes('make') || card.querySelector('[class*="make"]')) {
                result.score += 0.15;
            }

            // Positive: Has comments
            if (card.querySelector('[class*="comment"]') || /\d+\s*comment/i.test(text)) {
                result.score += 0.1;
            }

            // Positive: Has downloads/likes
            const numbers = text.match(/\d+/g) || [];
            const hasEngagement = numbers.some(n => parseInt(n) > 10);
            if (hasEngagement) {
                result.score += 0.1;
            }

            // Negative: Very short/generic description
            if (text.length < 100) {
                result.score -= 0.15;
                result.reasons.push('Very short content');
            }

            // Negative: No preview of actual print
            if (!textLower.includes('print') && !textLower.includes('make')) {
                result.score -= 0.1;
            }

            // Negative: Already flagged as AI
            if (currentResult.aiConfidence > 0.6) {
                result.score -= 0.2;
                result.reasons.push('High AI confidence');
            }

            result.score = Math.max(0, Math.min(1, result.score));
            return result;
        }
    }

    // ==================== UI ====================
    
    function createControlPanel() {
        const panel = document.createElement('div');
        panel.id = 'ai-filter-panel-advanced';
        panel.innerHTML = `
            <style>
                #ai-filter-panel-advanced {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    color: #fff;
                    padding: 15px;
                    border-radius: 14px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 13px;
                    z-index: 999999;
                    box-shadow: 0 4px 25px rgba(0,0,0,0.4);
                    min-width: 260px;
                    max-width: 320px;
                    transition: all 0.3s ease;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                #ai-filter-panel-advanced.minimized {
                    min-width: auto;
                    max-width: auto;
                    padding: 10px 14px;
                }
                #ai-filter-panel-advanced.minimized .panel-content,
                #ai-filter-panel-advanced.minimized .panel-stats {
                    display: none;
                }
                .panel-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 12px;
                    cursor: pointer;
                    user-select: none;
                }
                #ai-filter-panel-advanced.minimized .panel-header {
                    margin-bottom: 0;
                }
                .panel-title {
                    font-weight: 600;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .panel-title svg {
                    width: 18px;
                    height: 18px;
                }
                .minimize-btn {
                    background: none;
                    border: none;
                    color: #888;
                    cursor: pointer;
                    padding: 4px 8px;
                    font-size: 18px;
                    line-height: 1;
                    border-radius: 4px;
                    transition: all 0.2s;
                }
                .minimize-btn:hover {
                    color: #fff;
                    background: rgba(255,255,255,0.1);
                }
                .panel-content {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .filter-section {
                    background: rgba(255,255,255,0.03);
                    border-radius: 10px;
                    padding: 10px 12px;
                }
                .filter-section-title {
                    font-size: 11px;
                    color: #888;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 8px;
                }
                .filter-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 6px 0;
                }
                .filter-label {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    color: #ccc;
                }
                .filter-label .icon {
                    width: 14px;
                    height: 14px;
                    opacity: 0.7;
                }
                .toggle-switch {
                    position: relative;
                    width: 40px;
                    height: 22px;
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
                    background-color: #333;
                    transition: 0.25s;
                    border-radius: 22px;
                }
                .toggle-slider:before {
                    position: absolute;
                    content: "";
                    height: 16px;
                    width: 16px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: 0.25s;
                    border-radius: 50%;
                }
                input:checked + .toggle-slider {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }
                input:checked + .toggle-slider:before {
                    transform: translateX(18px);
                }
                .toggle-slider.orange:checked, input:checked + .toggle-slider.orange {
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                }
                .toggle-slider.yellow:checked, input:checked + .toggle-slider.yellow {
                    background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
                }
                .panel-stats {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    margin-top: 10px;
                }
                .stat-box {
                    background: rgba(255,255,255,0.05);
                    padding: 10px 8px;
                    border-radius: 8px;
                    text-align: center;
                }
                .stat-num {
                    font-size: 18px;
                    font-weight: 700;
                    line-height: 1.2;
                }
                .stat-num.purple { color: #667eea; }
                .stat-num.pink { color: #f5576c; }
                .stat-num.orange { color: #fcb69f; }
                .stat-label {
                    font-size: 9px;
                    color: #888;
                    text-transform: uppercase;
                    margin-top: 2px;
                }
                .threshold-slider {
                    width: 100%;
                    margin: 4px 0;
                    -webkit-appearance: none;
                    height: 4px;
                    border-radius: 2px;
                    background: #333;
                }
                .threshold-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 14px;
                    height: 14px;
                    border-radius: 50%;
                    background: #667eea;
                    cursor: pointer;
                }
                .threshold-value {
                    font-size: 11px;
                    color: #667eea;
                    text-align: right;
                }
                
                /* Card overlays */
                .ai-filter-hidden { display: none !important; }
                .ai-filter-highlight {
                    position: relative;
                    outline: 3px solid #667eea !important;
                    outline-offset: 2px;
                }
                .ai-filter-highlight-suspected {
                    outline-color: #f5576c !important;
                }
                .ai-filter-highlight-lowquality {
                    outline-color: #fcb69f !important;
                }
                .ai-filter-badge {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    padding: 3px 8px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 600;
                    color: white;
                    z-index: 100;
                    font-family: -apple-system, sans-serif;
                    pointer-events: none;
                }
                .ai-filter-badge.tagged { background: #667eea; }
                .ai-filter-badge.suspected { background: #f5576c; }
                .ai-filter-badge.lowquality { background: #fcb69f; color: #333; }
                .ai-filter-score {
                    position: absolute;
                    bottom: 8px;
                    left: 8px;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 9px;
                    background: rgba(0,0,0,0.7);
                    color: #fff;
                    font-family: monospace;
                    z-index: 100;
                    pointer-events: none;
                }
            </style>
            
            <div class="panel-header">
                <span class="panel-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 16v-4M12 8h.01"/>
                    </svg>
                    AI & Quality Filter
                </span>
                <button class="minimize-btn" id="minimize-btn">−</button>
            </div>
            
            <div class="panel-content">
                <div class="filter-section">
                    <div class="filter-section-title">Filter Modes</div>
                    
                    <div class="filter-row">
                        <span class="filter-label">
                            <span>🏷️</span> Tagged AI
                        </span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="toggle-tagged" ${CONFIG.filterTaggedAI ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    
                    <div class="filter-row">
                        <span class="filter-label">
                            <span>🔍</span> Suspected AI
                        </span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="toggle-suspected" ${CONFIG.filterSuspectedAI ? 'checked' : ''}>
                            <span class="toggle-slider orange"></span>
                        </label>
                    </div>
                    
                    <div class="filter-row">
                        <span class="filter-label">
                            <span>⚠️</span> Low Quality
                        </span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="toggle-quality" ${CONFIG.filterLowQuality ? 'checked' : ''}>
                            <span class="toggle-slider yellow"></span>
                        </label>
                    </div>
                </div>
                
                <div class="filter-section">
                    <div class="filter-section-title">Options</div>
                    
                    <div class="filter-row">
                        <span class="filter-label">Highlight Only</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="toggle-highlight" ${CONFIG.highlightInstead ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    
                    <div class="filter-row">
                        <span class="filter-label">Show Scores</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="toggle-scores" ${CONFIG.showScores ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    
                    <div class="filter-row">
                        <span class="filter-label">Analyze Images</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="toggle-images" ${CONFIG.analyzeImages ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
                
                <div class="filter-section">
                    <div class="filter-section-title">AI Detection Threshold</div>
                    <input type="range" class="threshold-slider" id="threshold-ai" 
                           min="0.3" max="0.9" step="0.05" value="${CONFIG.aiConfidenceThreshold}">
                    <div class="threshold-value" id="threshold-ai-val">${Math.round(CONFIG.aiConfidenceThreshold * 100)}%</div>
                </div>
            </div>
            
            <div class="panel-stats">
                <div class="stat-box">
                    <div class="stat-num purple" id="stat-tagged">0</div>
                    <div class="stat-label">Tagged</div>
                </div>
                <div class="stat-box">
                    <div class="stat-num pink" id="stat-suspected">0</div>
                    <div class="stat-label">Suspected</div>
                </div>
                <div class="stat-box">
                    <div class="stat-num orange" id="stat-quality">0</div>
                    <div class="stat-label">Low Qual</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Event listeners
        document.getElementById('minimize-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            panel.classList.toggle('minimized');
        });
        
        // Filter toggles
        const toggles = {
            'toggle-tagged': 'filterTaggedAI',
            'toggle-suspected': 'filterSuspectedAI',
            'toggle-quality': 'filterLowQuality',
            'toggle-highlight': 'highlightInstead',
            'toggle-scores': 'showScores',
            'toggle-images': 'analyzeImages'
        };
        
        for (const [id, key] of Object.entries(toggles)) {
            document.getElementById(id).addEventListener('change', (e) => {
                CONFIG[key] = e.target.checked;
                GM_setValue(key, e.target.checked);
                applyFiltering();
            });
        }
        
        // Threshold slider
        document.getElementById('threshold-ai').addEventListener('input', (e) => {
            CONFIG.aiConfidenceThreshold = parseFloat(e.target.value);
            document.getElementById('threshold-ai-val').textContent = Math.round(CONFIG.aiConfidenceThreshold * 100) + '%';
        });
        
        document.getElementById('threshold-ai').addEventListener('change', (e) => {
            GM_setValue('aiConfidenceThreshold', CONFIG.aiConfidenceThreshold);
            applyFiltering();
        });
        
        return panel;
    }

    function updateStats() {
        document.getElementById('stat-tagged').textContent = stats.taggedAI;
        document.getElementById('stat-suspected').textContent = stats.suspectedAI;
        document.getElementById('stat-quality').textContent = stats.lowQuality;
    }

    // ==================== MAIN FILTERING ====================
    
    const analyzer = new ModelAnalyzer();
    let isProcessing = false;

    async function applyFiltering() {
        if (isProcessing) return;
        isProcessing = true;

        // Reset stats
        stats.taggedAI = 0;
        stats.suspectedAI = 0;
        stats.lowQuality = 0;

        // Clear previous filtering
        document.querySelectorAll('.ai-filter-hidden, .ai-filter-highlight, .ai-filter-highlight-suspected, .ai-filter-highlight-lowquality').forEach(el => {
            el.classList.remove('ai-filter-hidden', 'ai-filter-highlight', 'ai-filter-highlight-suspected', 'ai-filter-highlight-lowquality');
        });
        document.querySelectorAll('.ai-filter-badge, .ai-filter-score').forEach(el => el.remove());

        // Find all model cards
        const cards = findModelCards();
        
        // Process cards
        for (const card of cards) {
            try {
                await processCard(card);
            } catch (e) {
                console.error('Error processing card:', e);
            }
        }

        updateStats();
        isProcessing = false;
    }

    function findModelCards() {
        const selectors = [
            // MakerWorld
            '[class*="model-card"]', '[class*="ModelCard"]', '.mw-model-card',
            // Printables
            '.print-card', 'article[class*="print"]', '[class*="PrintCard"]',
            // Thangs
            '[class*="ThingCard"]', '[class*="thing-card"]', '[class*="SearchResult"]',
            // Generic
            'a[href*="/models/"]', 'a[href*="/model/"]'
        ];

        const cards = new Set();
        for (const selector of selectors) {
            document.querySelectorAll(selector).forEach(el => {
                // Avoid tiny elements and already processed
                if (el.offsetHeight > 50) {
                    cards.add(el);
                }
            });
        }
        
        return Array.from(cards);
    }

    async function processCard(card) {
        const result = await analyzer.analyzeCard(card);
        
        let shouldFilter = false;
        let filterType = null;
        let badgeText = null;

        // Determine filter action
        if (CONFIG.filterTaggedAI && result.isTaggedAI) {
            shouldFilter = true;
            filterType = 'tagged';
            badgeText = '🏷️ AI';
            stats.taggedAI++;
        } else if (CONFIG.filterSuspectedAI && !result.isTaggedAI && result.aiConfidence >= CONFIG.aiConfidenceThreshold) {
            shouldFilter = true;
            filterType = 'suspected';
            badgeText = `🔍 ${Math.round(result.aiConfidence * 100)}%`;
            stats.suspectedAI++;
        } else if (CONFIG.filterLowQuality && result.qualityScore < CONFIG.qualityThreshold) {
            shouldFilter = true;
            filterType = 'lowquality';
            badgeText = '⚠️ Low';
            stats.lowQuality++;
        }

        if (!shouldFilter) {
            // Optionally show scores even on non-filtered cards
            if (CONFIG.showScores && (result.aiConfidence > 0.3 || result.qualityScore < 0.6)) {
                addScoreBadge(card, result);
            }
            return;
        }

        // Apply filter or highlight
        if (CONFIG.highlightInstead) {
            card.classList.add('ai-filter-highlight');
            if (filterType === 'suspected') card.classList.add('ai-filter-highlight-suspected');
            if (filterType === 'lowquality') card.classList.add('ai-filter-highlight-lowquality');
            
            // Add badge
            card.style.position = 'relative';
            const badge = document.createElement('div');
            badge.className = `ai-filter-badge ${filterType}`;
            badge.textContent = badgeText;
            card.appendChild(badge);
        } else {
            card.classList.add('ai-filter-hidden');
        }

        // Add score overlay if enabled
        if (CONFIG.showScores) {
            addScoreBadge(card, result);
        }
    }

    function addScoreBadge(card, result) {
        card.style.position = 'relative';
        const score = document.createElement('div');
        score.className = 'ai-filter-score';
        score.textContent = `AI:${Math.round(result.aiConfidence * 100)}% Q:${Math.round(result.qualityScore * 100)}%`;
        card.appendChild(score);
    }

    // ==================== OBSERVER ====================
    
    function setupObserver() {
        let timeout;
        const observer = new MutationObserver((mutations) => {
            let hasNewContent = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    hasNewContent = true;
                    break;
                }
            }
            
            if (hasNewContent) {
                clearTimeout(timeout);
                timeout = setTimeout(applyFiltering, 300);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        // Also watch for scroll
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(applyFiltering, 500);
        });
    }

    // ==================== INIT ====================
    
    function init() {
        console.log('[AI Filter Advanced] Initializing...');
        
        createControlPanel();
        setupObserver();
        
        // Initial scan
        setTimeout(applyFiltering, 500);
        
        // Register menu commands
        if (typeof GM_registerMenuCommand !== 'undefined') {
            GM_registerMenuCommand('Toggle Tagged AI Filter', () => {
                CONFIG.filterTaggedAI = !CONFIG.filterTaggedAI;
                GM_setValue('filterTaggedAI', CONFIG.filterTaggedAI);
                document.getElementById('toggle-tagged').checked = CONFIG.filterTaggedAI;
                applyFiltering();
            });
            
            GM_registerMenuCommand('Toggle Suspected AI Filter', () => {
                CONFIG.filterSuspectedAI = !CONFIG.filterSuspectedAI;
                GM_setValue('filterSuspectedAI', CONFIG.filterSuspectedAI);
                document.getElementById('toggle-suspected').checked = CONFIG.filterSuspectedAI;
                applyFiltering();
            });
            
            GM_registerMenuCommand('Toggle Low Quality Filter', () => {
                CONFIG.filterLowQuality = !CONFIG.filterLowQuality;
                GM_setValue('filterLowQuality', CONFIG.filterLowQuality);
                document.getElementById('toggle-quality').checked = CONFIG.filterLowQuality;
                applyFiltering();
            });
        }
        
        console.log('[AI Filter Advanced] Ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
