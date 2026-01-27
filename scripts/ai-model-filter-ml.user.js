// ==UserScript==
// @name         3D Model AI Filter with ML Detection
// @namespace    https://github.com/ai-model-filter
// @version      3.0.0
// @description  Filter AI-generated and low-quality 3D models with TensorFlow.js ML detection
// @author       Achyut Sharma
// @match        https://makerworld.com/*
// @match        https://www.makerworld.com/*
// @match        https://printables.com/*
// @match        https://www.printables.com/*
// @match        https://thangs.com/*
// @match        https://www.thangs.com/*
// @require      https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js
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
        filterSuspectedAI: GM_getValue('filterSuspectedAI', true),
        filterLowQuality: GM_getValue('filterLowQuality', false),
        
        // ML settings
        useMLDetection: GM_getValue('useMLDetection', true),
        mlModelUrl: GM_getValue('mlModelUrl', ''), // Custom model URL
        
        // Thresholds
        aiConfidenceThreshold: GM_getValue('aiConfidenceThreshold', 0.65),
        qualityThreshold: GM_getValue('qualityThreshold', 0.35),
        
        // Display
        highlightInstead: GM_getValue('highlightInstead', true),
        showScores: GM_getValue('showScores', true),
        
        debug: false
    };

    const stats = { taggedAI: 0, suspectedAI: 0, lowQuality: 0 };

    // ==================== ML MODEL ====================
    
    class MLDetector {
        constructor() {
            this.model = null;
            this.isLoading = false;
            this.isReady = false;
            this.useBuiltIn = true; // Use built-in heuristic model if no custom model
        }

        async initialize() {
            if (this.isLoading || this.isReady) return;
            this.isLoading = true;

            try {
                if (CONFIG.mlModelUrl) {
                    // Load custom TensorFlow.js model
                    console.log('[ML Detector] Loading custom model from:', CONFIG.mlModelUrl);
                    this.model = await tf.loadLayersModel(CONFIG.mlModelUrl);
                    this.useBuiltIn = false;
                    console.log('[ML Detector] Custom model loaded successfully');
                } else {
                    // Use built-in feature-based detection
                    console.log('[ML Detector] Using built-in feature detection');
                    this.useBuiltIn = true;
                }
                this.isReady = true;
            } catch (error) {
                console.error('[ML Detector] Failed to load model:', error);
                this.useBuiltIn = true;
                this.isReady = true;
            }

            this.isLoading = false;
        }

        async predict(imageElement) {
            if (!this.isReady) await this.initialize();

            try {
                if (this.useBuiltIn) {
                    return await this.builtInPredict(imageElement);
                } else {
                    return await this.modelPredict(imageElement);
                }
            } catch (error) {
                console.error('[ML Detector] Prediction error:', error);
                return { aiProbability: 0, qualityScore: 0.5, renderProbability: 0 };
            }
        }

        async modelPredict(imageElement) {
            // Preprocess image for the model
            const tensor = tf.browser.fromPixels(imageElement)
                .resizeNearestNeighbor([224, 224])
                .toFloat()
                .div(255.0)
                .expandDims();

            // Run prediction
            const prediction = this.model.predict(tensor);
            const values = await prediction.data();

            // Clean up tensors
            tensor.dispose();
            prediction.dispose();

            // Assuming model outputs [aiProbability, qualityScore, renderProbability]
            return {
                aiProbability: values[0] || 0,
                qualityScore: values[1] || 0.5,
                renderProbability: values[2] || 0
            };
        }

        async builtInPredict(imageElement) {
            // Feature extraction using canvas
            const features = await this.extractFeatures(imageElement);
            
            // Calculate scores based on features
            const aiProbability = this.calculateAIProbability(features);
            const qualityScore = this.calculateQualityScore(features);
            const renderProbability = this.calculateRenderProbability(features);

            return { aiProbability, qualityScore, renderProbability, features };
        }

        async extractFeatures(imgElement) {
            return new Promise((resolve) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                img.onload = () => {
                    const size = 128;
                    canvas.width = size;
                    canvas.height = size;
                    ctx.drawImage(img, 0, 0, size, size);
                    
                    let imageData;
                    try {
                        imageData = ctx.getImageData(0, 0, size, size);
                    } catch (e) {
                        resolve(this.getDefaultFeatures());
                        return;
                    }
                    
                    resolve(this.computeFeatures(imageData));
                };
                
                img.onerror = () => resolve(this.getDefaultFeatures());
                
                setTimeout(() => resolve(this.getDefaultFeatures()), 5000);
                
                img.src = imgElement.src;
            });
        }

        getDefaultFeatures() {
            return {
                colorEntropy: 0.5,
                edgeDensity: 0.5,
                smoothness: 0.5,
                saturation: 0.5,
                brightness: 0.5,
                colorVariance: 0.5,
                gradientUniformity: 0.5,
                textureComplexity: 0.5,
                noiseLevel: 0.5,
                contrastRatio: 0.5,
                colorBanding: 0.5,
                sharpness: 0.5
            };
        }

        computeFeatures(imageData) {
            const data = imageData.data;
            const width = imageData.width;
            const height = imageData.height;
            const pixelCount = width * height;
            
            // Initialize accumulators
            let rSum = 0, gSum = 0, bSum = 0;
            let satSum = 0, brightSum = 0;
            const histogram = new Array(256).fill(0);
            const colorBuckets = {};
            
            // First pass: basic statistics
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2];
                rSum += r; gSum += g; bSum += b;
                
                const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
                histogram[gray]++;
                
                // HSL for saturation/brightness
                const max = Math.max(r, g, b) / 255;
                const min = Math.min(r, g, b) / 255;
                const l = (max + min) / 2;
                const s = max === min ? 0 : (l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min));
                satSum += s;
                brightSum += l;
                
                // Color bucketing (reduced precision for clustering)
                const colorKey = `${Math.floor(r/32)}-${Math.floor(g/32)}-${Math.floor(b/32)}`;
                colorBuckets[colorKey] = (colorBuckets[colorKey] || 0) + 1;
            }
            
            const rMean = rSum / pixelCount;
            const gMean = gSum / pixelCount;
            const bMean = bSum / pixelCount;
            
            // Color variance
            let colorVar = 0;
            for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
                colorVar += Math.pow(data[i] - rMean, 2) + 
                           Math.pow(data[i + 1] - gMean, 2) + 
                           Math.pow(data[i + 2] - bMean, 2);
            }
            colorVar = Math.sqrt(colorVar / (pixelCount / 4)) / 255;
            
            // Color entropy (diversity)
            const uniqueColors = Object.keys(colorBuckets).length;
            const maxBuckets = 8 * 8 * 8; // 512 possible buckets
            const colorEntropy = uniqueColors / maxBuckets;
            
            // Histogram entropy
            let histogramEntropy = 0;
            for (let i = 0; i < 256; i++) {
                if (histogram[i] > 0) {
                    const p = histogram[i] / pixelCount;
                    histogramEntropy -= p * Math.log2(p);
                }
            }
            histogramEntropy /= 8; // Normalize
            
            // Edge detection (Sobel-like)
            let edgeSum = 0;
            let smoothSum = 0;
            let gradientChanges = 0;
            let lastGradient = 0;
            
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = (y * width + x) * 4;
                    
                    // Grayscale values
                    const center = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                    const left = 0.299 * data[idx - 4] + 0.587 * data[idx - 3] + 0.114 * data[idx - 2];
                    const right = 0.299 * data[idx + 4] + 0.587 * data[idx + 5] + 0.114 * data[idx + 6];
                    const up = 0.299 * data[idx - width * 4] + 0.587 * data[idx - width * 4 + 1] + 0.114 * data[idx - width * 4 + 2];
                    const down = 0.299 * data[idx + width * 4] + 0.587 * data[idx + width * 4 + 1] + 0.114 * data[idx + width * 4 + 2];
                    
                    const gx = right - left;
                    const gy = down - up;
                    const gradient = Math.sqrt(gx * gx + gy * gy);
                    
                    edgeSum += gradient;
                    
                    // Smoothness (small differences)
                    const diff = Math.abs(center - left) + Math.abs(center - right) + 
                                Math.abs(center - up) + Math.abs(center - down);
                    if (diff < 20) smoothSum++;
                    
                    // Gradient uniformity
                    if (Math.abs(gradient - lastGradient) > 30) gradientChanges++;
                    lastGradient = gradient;
                }
            }
            
            const edgeDensity = edgeSum / (width * height * 255);
            const smoothness = smoothSum / ((width - 2) * (height - 2));
            const gradientUniformity = 1 - (gradientChanges / ((width - 2) * (height - 2)));
            
            // Texture complexity (variance of local regions)
            let textureComplexity = 0;
            const blockSize = 8;
            for (let by = 0; by < height - blockSize; by += blockSize) {
                for (let bx = 0; bx < width - blockSize; bx += blockSize) {
                    let blockSum = 0, blockSq = 0, blockCount = 0;
                    for (let y = by; y < by + blockSize; y++) {
                        for (let x = bx; x < bx + blockSize; x++) {
                            const idx = (y * width + x) * 4;
                            const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                            blockSum += gray;
                            blockSq += gray * gray;
                            blockCount++;
                        }
                    }
                    const blockMean = blockSum / blockCount;
                    const blockVar = (blockSq / blockCount) - (blockMean * blockMean);
                    textureComplexity += Math.sqrt(blockVar);
                }
            }
            textureComplexity /= ((height / blockSize) * (width / blockSize) * 255);
            
            // Color banding detection (common in renders)
            let bandingScore = 0;
            const bandingThreshold = 3;
            for (let y = 0; y < height; y++) {
                let runLength = 0;
                let lastColor = null;
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    const colorKey = `${Math.floor(data[idx]/8)}-${Math.floor(data[idx+1]/8)}-${Math.floor(data[idx+2]/8)}`;
                    if (colorKey === lastColor) {
                        runLength++;
                        if (runLength > 10) bandingScore++;
                    } else {
                        runLength = 0;
                        lastColor = colorKey;
                    }
                }
            }
            bandingScore = Math.min(1, bandingScore / (width * height * 0.1));
            
            // Contrast ratio
            let minBright = 255, maxBright = 0;
            for (let i = 0; i < data.length; i += 4) {
                const bright = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                minBright = Math.min(minBright, bright);
                maxBright = Math.max(maxBright, bright);
            }
            const contrastRatio = (maxBright - minBright) / 255;
            
            return {
                colorEntropy,
                edgeDensity,
                smoothness,
                saturation: satSum / pixelCount,
                brightness: brightSum / pixelCount,
                colorVariance: colorVar,
                gradientUniformity,
                textureComplexity,
                noiseLevel: histogramEntropy,
                contrastRatio,
                colorBanding: bandingScore,
                sharpness: edgeDensity * (1 - smoothness)
            };
        }

        calculateAIProbability(features) {
            let score = 0;
            
            // AI renders tend to have:
            // - High smoothness
            // - Perfect gradients (high uniformity)
            // - Color banding
            // - Lower texture complexity
            // - Higher saturation
            
            if (features.smoothness > 0.6) score += 0.15;
            if (features.smoothness > 0.75) score += 0.1;
            
            if (features.gradientUniformity > 0.8) score += 0.1;
            
            if (features.colorBanding > 0.3) score += 0.15;
            if (features.colorBanding > 0.5) score += 0.1;
            
            if (features.textureComplexity < 0.1) score += 0.1;
            
            if (features.saturation > 0.5) score += 0.1;
            if (features.saturation > 0.7) score += 0.05;
            
            // Low edge density (too smooth)
            if (features.edgeDensity < 0.05) score += 0.1;
            
            // Very low noise (too clean)
            if (features.noiseLevel < 0.3) score += 0.05;
            
            return Math.min(1, score);
        }

        calculateQualityScore(features) {
            let score = 0.5;
            
            // Good quality photos tend to have:
            // - Moderate texture complexity
            // - Natural color variance
            // - Visible edges (layer lines, etc.)
            // - Some noise (natural)
            
            if (features.textureComplexity > 0.05 && features.textureComplexity < 0.3) score += 0.15;
            if (features.colorVariance > 0.15 && features.colorVariance < 0.5) score += 0.1;
            if (features.edgeDensity > 0.05) score += 0.1;
            if (features.noiseLevel > 0.4 && features.noiseLevel < 0.8) score += 0.1;
            
            // Penalize render indicators
            if (features.smoothness > 0.7) score -= 0.15;
            if (features.colorBanding > 0.4) score -= 0.1;
            
            return Math.max(0, Math.min(1, score));
        }

        calculateRenderProbability(features) {
            let score = 0;
            
            // Render indicators
            if (features.smoothness > 0.7) score += 0.25;
            if (features.gradientUniformity > 0.85) score += 0.2;
            if (features.colorBanding > 0.3) score += 0.2;
            if (features.saturation > 0.6) score += 0.15;
            if (features.textureComplexity < 0.08) score += 0.2;
            
            return Math.min(1, score);
        }
    }

    // ==================== EXPLICIT TAG DETECTION ====================
    
    const EXPLICIT_AI_TAGS = [
        'ai', 'ai-generated', 'aigc', 'ai-assisted', 'meshy', 'tripo', 'rodin',
        'luma', 'csm', 'text-to-3d', 'image-to-3d', 'generative', 'makerlab',
        'ai scanner', 'ai-created', 'neural network', 'stable-diffusion'
    ];

    const AI_PATTERNS = [
        /\bai[\s-]?generated\b/i, /\baigc\b/i, /\bmeshy\b/i, /\btripo/i,
        /\btext[\s-]?to[\s-]?3d\b/i, /\bimage[\s-]?to[\s-]?3d\b/i,
        /\bmakerlab\b/i, /\brodin\s*ai\b/i, /\bgenerat(ed|ive)\s*(by|with)?\s*ai\b/i
    ];

    function checkExplicitAI(card) {
        const text = (card.textContent || '').toLowerCase();
        const html = (card.innerHTML || '').toLowerCase();
        
        // Check badges
        if (card.querySelector('[class*="aigc"], [class*="AIGC"], .ai-badge, .ai-label')) {
            return { isAI: true, reason: 'AIGC badge' };
        }
        
        // Check tags
        for (const tag of EXPLICIT_AI_TAGS) {
            if (text.includes(tag)) {
                return { isAI: true, reason: `Tag: ${tag}` };
            }
        }
        
        // Check patterns
        for (const pattern of AI_PATTERNS) {
            if (pattern.test(text)) {
                return { isAI: true, reason: 'AI pattern matched' };
            }
        }
        
        // Check URLs
        const href = card.querySelector('a')?.href || card.href || '';
        if (href.includes('/3d-models/2000') || href.includes('/3d-models/2006')) {
            return { isAI: true, reason: 'AI category URL' };
        }
        
        return { isAI: false, reason: null };
    }

    // ==================== MAIN FILTER ====================
    
    const mlDetector = new MLDetector();
    let isProcessing = false;

    async function applyFiltering() {
        if (isProcessing) return;
        isProcessing = true;

        stats.taggedAI = 0;
        stats.suspectedAI = 0;
        stats.lowQuality = 0;

        // Clear previous
        document.querySelectorAll('.mlf-hidden, .mlf-highlight').forEach(el => {
            el.classList.remove('mlf-hidden', 'mlf-highlight', 'mlf-tagged', 'mlf-suspected', 'mlf-lowquality');
        });
        document.querySelectorAll('.mlf-badge, .mlf-score').forEach(el => el.remove());

        // Initialize ML
        if (CONFIG.useMLDetection) {
            await mlDetector.initialize();
        }

        // Find cards
        const cards = findCards();

        // Process
        for (const card of cards) {
            await processCard(card);
        }

        updateUI();
        isProcessing = false;
    }

    function findCards() {
        const selectors = [
            '[class*="model-card"]', '[class*="ModelCard"]',
            '.print-card', 'article[class*="print"]',
            '[class*="ThingCard"]', '[class*="SearchResult"]',
            'a[href*="/models/"]', 'a[href*="/model/"]'
        ];
        
        const cards = new Set();
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                if (el.offsetHeight > 50) cards.add(el);
            });
        });
        
        return Array.from(cards);
    }

    async function processCard(card) {
        // 1. Check explicit tags first
        const explicitCheck = checkExplicitAI(card);
        
        let aiConfidence = explicitCheck.isAI ? 1.0 : 0;
        let qualityScore = 0.5;
        let isTagged = explicitCheck.isAI;
        let reasons = explicitCheck.reason ? [explicitCheck.reason] : [];

        // 2. ML detection on thumbnail
        if (CONFIG.useMLDetection && !isTagged) {
            const img = card.querySelector('img');
            if (img && img.src) {
                const mlResult = await mlDetector.predict(img);
                aiConfidence = Math.max(aiConfidence, mlResult.aiProbability);
                qualityScore = mlResult.qualityScore;
                
                if (mlResult.aiProbability > 0.5) {
                    reasons.push(`ML: ${Math.round(mlResult.aiProbability * 100)}% AI`);
                }
                if (mlResult.renderProbability > 0.6) {
                    reasons.push('Render detected');
                }
            }
        }

        // 3. Determine action
        let shouldFilter = false;
        let filterType = null;

        if (CONFIG.filterTaggedAI && isTagged) {
            shouldFilter = true;
            filterType = 'tagged';
            stats.taggedAI++;
        } else if (CONFIG.filterSuspectedAI && !isTagged && aiConfidence >= CONFIG.aiConfidenceThreshold) {
            shouldFilter = true;
            filterType = 'suspected';
            stats.suspectedAI++;
        } else if (CONFIG.filterLowQuality && qualityScore < CONFIG.qualityThreshold) {
            shouldFilter = true;
            filterType = 'lowquality';
            stats.lowQuality++;
        }

        if (!shouldFilter) return;

        // 4. Apply filter
        card.style.position = 'relative';
        
        if (CONFIG.highlightInstead) {
            card.classList.add('mlf-highlight', `mlf-${filterType}`);
            
            const badge = document.createElement('div');
            badge.className = `mlf-badge mlf-badge-${filterType}`;
            badge.textContent = filterType === 'tagged' ? '🏷️ AI' :
                               filterType === 'suspected' ? `🔍 ${Math.round(aiConfidence * 100)}%` :
                               '⚠️ Low Q';
            card.appendChild(badge);
        } else {
            card.classList.add('mlf-hidden');
        }

        if (CONFIG.showScores) {
            const score = document.createElement('div');
            score.className = 'mlf-score';
            score.textContent = `AI:${Math.round(aiConfidence * 100)}% Q:${Math.round(qualityScore * 100)}%`;
            score.title = reasons.join('\n');
            card.appendChild(score);
        }
    }

    // ==================== UI ====================
    
    function createUI() {
        const style = document.createElement('style');
        style.textContent = `
            .mlf-hidden { display: none !important; }
            .mlf-highlight { outline: 3px solid #667eea !important; outline-offset: 2px; }
            .mlf-suspected { outline-color: #f5576c !important; }
            .mlf-lowquality { outline-color: #fcb69f !important; }
            .mlf-badge {
                position: absolute; top: 8px; right: 8px;
                padding: 4px 8px; border-radius: 4px;
                font-size: 11px; font-weight: 600; color: white;
                z-index: 1000; font-family: -apple-system, sans-serif;
            }
            .mlf-badge-tagged { background: #667eea; }
            .mlf-badge-suspected { background: #f5576c; }
            .mlf-badge-lowquality { background: #fcb69f; color: #333; }
            .mlf-score {
                position: absolute; bottom: 8px; left: 8px;
                padding: 2px 6px; border-radius: 3px;
                font-size: 9px; background: rgba(0,0,0,0.8);
                color: #fff; font-family: monospace; z-index: 1000;
            }
            #mlf-panel {
                position: fixed; bottom: 20px; right: 20px;
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                color: #fff; padding: 15px; border-radius: 14px;
                font-family: -apple-system, sans-serif; font-size: 13px;
                z-index: 999999; box-shadow: 0 4px 25px rgba(0,0,0,0.4);
                min-width: 240px; border: 1px solid rgba(255,255,255,0.1);
            }
            #mlf-panel.min { min-width: auto; padding: 10px 14px; }
            #mlf-panel.min .mlf-content { display: none; }
            #mlf-panel h3 { margin: 0 0 12px; font-size: 14px; display: flex; align-items: center; gap: 8px; cursor: pointer; }
            #mlf-panel.min h3 { margin: 0; }
            .mlf-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
            .mlf-toggle { width: 40px; height: 22px; position: relative; }
            .mlf-toggle input { opacity: 0; width: 0; height: 0; }
            .mlf-toggle span {
                position: absolute; cursor: pointer; inset: 0;
                background: #333; border-radius: 22px; transition: 0.2s;
            }
            .mlf-toggle span:before {
                content: ""; position: absolute; width: 16px; height: 16px;
                left: 3px; bottom: 3px; background: white;
                border-radius: 50%; transition: 0.2s;
            }
            .mlf-toggle input:checked + span { background: #667eea; }
            .mlf-toggle input:checked + span:before { transform: translateX(18px); }
            .mlf-stats { display: flex; gap: 10px; margin-top: 12px; text-align: center; }
            .mlf-stat { flex: 1; background: rgba(255,255,255,0.05); padding: 8px; border-radius: 8px; }
            .mlf-stat-num { font-size: 20px; font-weight: 700; }
            .mlf-stat-num.purple { color: #667eea; }
            .mlf-stat-num.pink { color: #f5576c; }
            .mlf-stat-num.orange { color: #fcb69f; }
            .mlf-stat-label { font-size: 9px; color: #888; text-transform: uppercase; }
        `;
        document.head.appendChild(style);

        const panel = document.createElement('div');
        panel.id = 'mlf-panel';
        panel.innerHTML = `
            <h3 onclick="this.parentElement.classList.toggle('min')">
                🧠 ML AI Filter
                <span style="margin-left:auto;font-size:11px;color:#888">click to collapse</span>
            </h3>
            <div class="mlf-content">
                <div class="mlf-row">
                    <span>🏷️ Tagged AI</span>
                    <label class="mlf-toggle">
                        <input type="checkbox" id="mlf-tagged" ${CONFIG.filterTaggedAI ? 'checked' : ''}>
                        <span></span>
                    </label>
                </div>
                <div class="mlf-row">
                    <span>🔍 Suspected AI (ML)</span>
                    <label class="mlf-toggle">
                        <input type="checkbox" id="mlf-suspected" ${CONFIG.filterSuspectedAI ? 'checked' : ''}>
                        <span></span>
                    </label>
                </div>
                <div class="mlf-row">
                    <span>⚠️ Low Quality</span>
                    <label class="mlf-toggle">
                        <input type="checkbox" id="mlf-quality" ${CONFIG.filterLowQuality ? 'checked' : ''}>
                        <span></span>
                    </label>
                </div>
                <div class="mlf-row">
                    <span>Highlight Only</span>
                    <label class="mlf-toggle">
                        <input type="checkbox" id="mlf-highlight" ${CONFIG.highlightInstead ? 'checked' : ''}>
                        <span></span>
                    </label>
                </div>
                <div class="mlf-row">
                    <span>Show Scores</span>
                    <label class="mlf-toggle">
                        <input type="checkbox" id="mlf-scores" ${CONFIG.showScores ? 'checked' : ''}>
                        <span></span>
                    </label>
                </div>
                <div class="mlf-stats">
                    <div class="mlf-stat">
                        <div class="mlf-stat-num purple" id="mlf-stat-tagged">0</div>
                        <div class="mlf-stat-label">Tagged</div>
                    </div>
                    <div class="mlf-stat">
                        <div class="mlf-stat-num pink" id="mlf-stat-suspected">0</div>
                        <div class="mlf-stat-label">Suspected</div>
                    </div>
                    <div class="mlf-stat">
                        <div class="mlf-stat-num orange" id="mlf-stat-quality">0</div>
                        <div class="mlf-stat-label">Low Q</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        // Events
        const toggles = {
            'mlf-tagged': 'filterTaggedAI',
            'mlf-suspected': 'filterSuspectedAI',
            'mlf-quality': 'filterLowQuality',
            'mlf-highlight': 'highlightInstead',
            'mlf-scores': 'showScores'
        };

        for (const [id, key] of Object.entries(toggles)) {
            document.getElementById(id).addEventListener('change', (e) => {
                CONFIG[key] = e.target.checked;
                GM_setValue(key, e.target.checked);
                applyFiltering();
            });
        }
    }

    function updateUI() {
        document.getElementById('mlf-stat-tagged').textContent = stats.taggedAI;
        document.getElementById('mlf-stat-suspected').textContent = stats.suspectedAI;
        document.getElementById('mlf-stat-quality').textContent = stats.lowQuality;
    }

    // ==================== INIT ====================
    
    function init() {
        console.log('[ML AI Filter] Starting...');
        createUI();
        
        setTimeout(applyFiltering, 500);
        
        // Observer
        const observer = new MutationObserver(() => {
            clearTimeout(window.mlfDebounce);
            window.mlfDebounce = setTimeout(applyFiltering, 300);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Scroll
        window.addEventListener('scroll', () => {
            clearTimeout(window.mlfScroll);
            window.mlfScroll = setTimeout(applyFiltering, 500);
        });
        
        console.log('[ML AI Filter] Ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
