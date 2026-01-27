// ==UserScript==
// @name         3D Model AI & Quality Filter (Advanced)
// @namespace    https://github.com/achyutsharma/3d-model-filter
// @version      2.5.0
// @description  Smart AI detection with image analysis, context-aware text parsing, and creator whitelist
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

    // ==================== CONFIGURATION ====================
    const CONFIG = {
        filterTaggedAI: GM_getValue('filterTaggedAI', true),
        filterSuspectedAI: GM_getValue('filterSuspectedAI', false),
        filterLowQuality: GM_getValue('filterLowQuality', false),
        
        // Higher = fewer false positives (0.0 to 1.0)
        aiConfidenceThreshold: GM_getValue('aiConfidenceThreshold', 0.70),
        qualityThreshold: GM_getValue('qualityThreshold', 0.35),
        
        highlightInstead: GM_getValue('highlightInstead', true),
        showScores: GM_getValue('showScores', false),
        
        creatorWhitelist: GM_getValue('creatorWhitelist', []),
        falsePositives: GM_getValue('falsePositives', []),
        
        // Image analysis
        analyzeImages: GM_getValue('analyzeImages', true),
        
        debug: false
    };

    const stats = { taggedAI: 0, suspectedAI: 0, lowQuality: 0, whitelisted: 0 };
    const analysisCache = new Map();

    // ==================== AI TOOL DETECTION ====================
    // Definite AI tools - if mentioned positively, it's AI
    const AI_TOOLS = [
        'meshy', 'tripo', 'tripo3d', 'rodin', 'luma', 'csm', 'kaedim',
        'alpha3d', 'masterpiece studio', 'spline ai', 'point-e', 'shap-e',
        'get3d', 'dreamfusion', 'magic3d', 'fantasia3d', 'sjc', 'stable-dreamfusion',
        'zero123', 'one-2-3-45', 'wonder3d', 'instant3d', 'threestudio',
        'text2mesh', 'dreamgaussian', 'gsgen', 'luciddreamer', 'gaussiandreamer',
        'makerlab', 'ai scanner'
    ];

    // AIGC markers - definite AI
    const AIGC_MARKERS = ['aigc', 'ai-generated', 'ai generated', 'ai-created'];

    // ==================== CONTEXT-AWARE TEXT ANALYSIS ====================
    
    function analyzeTextForAI(text) {
        if (!text) return { isAI: false, confidence: 0, reasons: [] };
        
        const textLower = text.toLowerCase();
        const reasons = [];
        let confidence = 0;

        // 1. Check for AIGC badges/markers (definite AI)
        for (const marker of AIGC_MARKERS) {
            if (textLower.includes(marker)) {
                return { isAI: true, confidence: 1.0, reasons: ['Has AIGC marker'] };
            }
        }

        // 2. Check for AI tool names WITH CONTEXT
        for (const tool of AI_TOOLS) {
            const toolRegex = new RegExp(`\\b${tool}\\b`, 'i');
            if (toolRegex.test(textLower)) {
                // Check context around the tool mention
                const context = getContextAroundWord(textLower, tool, 30);
                
                // Negative context - they're saying it's NOT from this tool
                if (/not\s+(made\s+)?(with|using|from|by)|without|no\s+\w*\s*(used|involved)|don't\s+use|didn't\s+use|hate|against|anti/i.test(context)) {
                    // Actually a negative mention - slight reduction
                    confidence -= 0.1;
                    continue;
                }
                
                // Positive context - made with, created using, etc.
                if (/made\s+(with|using|by|in)|created\s+(with|using|by|in)|generated\s+(with|using|by|in)|using|from|via|through/i.test(context)) {
                    confidence += 0.5;
                    reasons.push(`Made with ${tool}`);
                } else {
                    // Neutral mention - still suspicious but less confident
                    confidence += 0.25;
                    reasons.push(`Mentions ${tool}`);
                }
            }
        }

        // 3. Check for generation phrases WITH CONTEXT
        const generationPhrases = [
            { pattern: /generated?\s+(this|the|my)?\s*(model|mesh|3d|object)/i, weight: 0.35 },
            { pattern: /convert(ed)?\s+(from|my|a|the)?\s*(photo|image|picture|scan)/i, weight: 0.35 },
            { pattern: /turn(ed)?\s+(my|a|the)?\s*(photo|image|picture)\s*(into|to)/i, weight: 0.35 },
            { pattern: /(photo|image|picture)\s*to\s*3d/i, weight: 0.4 },
            { pattern: /text\s*to\s*3d/i, weight: 0.45 },
            { pattern: /auto(matic(ally)?)?\s*(generat|creat|model)/i, weight: 0.3 },
            { pattern: /one[\s-]?click\s*(3d|model|generat)/i, weight: 0.35 },
            { pattern: /instant(ly)?\s*(generat|creat|convert)/i, weight: 0.3 }
        ];

        for (const { pattern, weight } of generationPhrases) {
            if (pattern.test(textLower)) {
                // Check it's not negated
                const match = textLower.match(pattern);
                if (match) {
                    const context = getContextAroundMatch(textLower, match.index, 20);
                    if (!/not|no|don't|didn't|without|never/i.test(context.before)) {
                        confidence += weight;
                        reasons.push('AI generation phrase detected');
                        break; // Only count once
                    }
                }
            }
        }

        // 4. Check for "AI" with context
        const aiMentions = textLower.match(/\bai\b/gi);
        if (aiMentions) {
            for (const match of textLower.matchAll(/\bai\b/gi)) {
                const context = getContextAroundMatch(textLower, match.index, 25);
                
                // Skip if it's a negative/against AI context
                if (/not\s+ai|no\s+ai|anti[\s-]?ai|against\s+ai|hate\s+ai|ban\s+ai|without\s+ai|non[\s-]?ai|human[\s-]?(made|created|designed)|hand[\s-]?(made|crafted)|manually/i.test(context.full)) {
                    confidence -= 0.15; // Actually anti-AI, reduce score
                    continue;
                }
                
                // Positive AI context
                if (/made\s+(with|by|using)\s+ai|ai[\s-]?(made|created|generated|assisted)|using\s+ai|with\s+ai|by\s+ai|from\s+ai/i.test(context.full)) {
                    confidence += 0.35;
                    reasons.push('Mentions using AI');
                    break;
                }
            }
        }

        // 5. Check for suspicious title patterns (low-effort generic titles)
        const titlePatterns = [
            { pattern: /^(cute|cool|amazing|beautiful|awesome|epic|stunning|adorable)\s+(little\s+)?\w{3,15}$/i, weight: 0.15 },
            { pattern: /^3d\s*(model|print|printable)\s*(of\s*)?\w+$/i, weight: 0.1 },
            { pattern: /^\w+\s*(figure|figurine|statue|bust|sculpture)$/i, weight: 0.1 }
        ];

        // Only check first line (likely the title)
        const firstLine = text.split('\n')[0].trim();
        for (const { pattern, weight } of titlePatterns) {
            if (pattern.test(firstLine) && firstLine.length < 40) {
                confidence += weight;
                reasons.push('Generic AI-style title');
                break;
            }
        }

        // 6. Negative indicators (reduce confidence)
        const humanIndicators = [
            /designed\s+(by\s+)?(me|myself|hand)/i,
            /hand[\s-]?(made|crafted|modeled|designed)/i,
            /modeled\s+(in|with|using)\s*(blender|fusion|solidworks|freecad|tinkercad|onshape|zbrush|maya)/i,
            /sculpted|carved|drafted/i,
            /original\s+design/i,
            /my\s+(own\s+)?design/i,
            /\d+\s*hours?\s*(of\s*)?(work|modeling|designing)/i,
            /work\s*in\s*progress|wip/i,
            /iteration|prototype|v\d+.*improvement/i
        ];

        for (const pattern of humanIndicators) {
            if (pattern.test(textLower)) {
                confidence -= 0.2;
                reasons.push('Has human-made indicators');
            }
        }

        // Cap confidence
        confidence = Math.max(0, Math.min(1, confidence));

        return {
            isAI: confidence >= 0.9,
            confidence,
            reasons: [...new Set(reasons)]
        };
    }

    function getContextAroundWord(text, word, chars) {
        const index = text.toLowerCase().indexOf(word.toLowerCase());
        if (index === -1) return '';
        const start = Math.max(0, index - chars);
        const end = Math.min(text.length, index + word.length + chars);
        return text.substring(start, end);
    }

    function getContextAroundMatch(text, index, chars) {
        const before = text.substring(Math.max(0, index - chars), index);
        const after = text.substring(index, Math.min(text.length, index + chars));
        return { before, after, full: before + after };
    }

    // ==================== IMAGE ANALYSIS ====================
    
    async function analyzeImage(imgElement) {
        return new Promise((resolve) => {
            if (!imgElement || !imgElement.src) {
                resolve({ isAIRender: false, confidence: 0, features: {} });
                return;
            }

            // Check cache
            if (analysisCache.has(imgElement.src)) {
                resolve(analysisCache.get(imgElement.src));
                return;
            }

            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
                    const result = analyzeImageData(img);
                    analysisCache.set(imgElement.src, result);
                    resolve(result);
                } catch (e) {
                    resolve({ isAIRender: false, confidence: 0, features: {} });
                }
            };
            
            img.onerror = () => {
                resolve({ isAIRender: false, confidence: 0, features: {} });
            };

            // Timeout after 3 seconds
            setTimeout(() => {
                resolve({ isAIRender: false, confidence: 0, features: {} });
            }, 3000);

            img.src = imgElement.src;
        });
    }

    function analyzeImageData(img) {
        const canvas = document.createElement('canvas');
        const size = 100; // Analyze at 100x100 for speed
        canvas.width = size;
        canvas.height = size;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        
        let imageData;
        try {
            imageData = ctx.getImageData(0, 0, size, size);
        } catch (e) {
            return { isAIRender: false, confidence: 0, features: {} };
        }
        
        const data = imageData.data;
        const features = {};
        
        // 1. Smoothness detection (AI renders are often too smooth)
        features.smoothness = calculateSmoothness(data, size);
        
        // 2. Color banding (common in AI-generated images)
        features.colorBanding = detectColorBanding(data, size);
        
        // 3. Gradient uniformity (AI often has unnaturally uniform gradients)
        features.gradientUniformity = calculateGradientUniformity(data, size);
        
        // 4. Saturation analysis (AI renders often oversaturated)
        features.saturation = calculateAverageSaturation(data);
        
        // 5. Edge sharpness (AI can have weird edge artifacts)
        features.edgeDensity = calculateEdgeDensity(data, size);
        
        // 6. Texture complexity (real photos have more texture variation)
        features.textureComplexity = calculateTextureComplexity(data, size);
        
        // Calculate AI render probability
        let aiScore = 0;
        
        // High smoothness suggests render
        if (features.smoothness > 0.7) aiScore += 0.2;
        else if (features.smoothness > 0.55) aiScore += 0.1;
        
        // Color banding is a strong AI indicator
        if (features.colorBanding > 0.35) aiScore += 0.25;
        else if (features.colorBanding > 0.2) aiScore += 0.1;
        
        // Unnatural gradient uniformity
        if (features.gradientUniformity > 0.75) aiScore += 0.15;
        
        // Oversaturation
        if (features.saturation > 0.55) aiScore += 0.1;
        
        // Low edge density (too smooth)
        if (features.edgeDensity < 0.06) aiScore += 0.15;
        
        // Low texture complexity
        if (features.textureComplexity < 0.12) aiScore += 0.15;
        
        // Real photo indicators (reduce score)
        if (features.textureComplexity > 0.25) aiScore -= 0.15;
        if (features.smoothness < 0.4) aiScore -= 0.1;
        if (features.edgeDensity > 0.12) aiScore -= 0.1;
        
        aiScore = Math.max(0, Math.min(1, aiScore));

        return {
            isAIRender: aiScore > 0.5,
            confidence: aiScore,
            features
        };
    }

    function calculateSmoothness(data, size) {
        let totalDiff = 0;
        let count = 0;
        
        for (let y = 0; y < size - 1; y++) {
            for (let x = 0; x < size - 1; x++) {
                const i = (y * size + x) * 4;
                const iRight = (y * size + x + 1) * 4;
                const iDown = ((y + 1) * size + x) * 4;
                
                // Calculate difference with neighbors
                const diffRight = Math.abs(data[i] - data[iRight]) + 
                                  Math.abs(data[i+1] - data[iRight+1]) + 
                                  Math.abs(data[i+2] - data[iRight+2]);
                const diffDown = Math.abs(data[i] - data[iDown]) + 
                                 Math.abs(data[i+1] - data[iDown+1]) + 
                                 Math.abs(data[i+2] - data[iDown+2]);
                
                totalDiff += (diffRight + diffDown) / 2;
                count++;
            }
        }
        
        const avgDiff = totalDiff / count;
        // Normalize: lower diff = smoother = higher smoothness score
        return 1 - Math.min(1, avgDiff / 100);
    }

    function detectColorBanding(data, size) {
        const colorCounts = {};
        
        for (let i = 0; i < data.length; i += 4) {
            // Quantize colors to detect banding
            const r = Math.floor(data[i] / 16) * 16;
            const g = Math.floor(data[i+1] / 16) * 16;
            const b = Math.floor(data[i+2] / 16) * 16;
            const key = `${r},${g},${b}`;
            colorCounts[key] = (colorCounts[key] || 0) + 1;
        }
        
        const totalPixels = size * size;
        const uniqueColors = Object.keys(colorCounts).length;
        const maxCount = Math.max(...Object.values(colorCounts));
        
        // If few unique colors and some dominate, likely banding
        const colorDiversity = uniqueColors / (totalPixels / 4);
        const dominance = maxCount / totalPixels;
        
        return Math.min(1, dominance * 2 + (1 - Math.min(1, colorDiversity)));
    }

    function calculateGradientUniformity(data, size) {
        let uniformRegions = 0;
        let totalRegions = 0;
        const regionSize = 10;
        
        for (let ry = 0; ry < size - regionSize; ry += regionSize) {
            for (let rx = 0; rx < size - regionSize; rx += regionSize) {
                let regionDiffs = [];
                
                for (let y = ry; y < ry + regionSize - 1; y++) {
                    for (let x = rx; x < rx + regionSize - 1; x++) {
                        const i = (y * size + x) * 4;
                        const iRight = (y * size + x + 1) * 4;
                        const diff = Math.abs(data[i] - data[iRight]) + 
                                     Math.abs(data[i+1] - data[iRight+1]) + 
                                     Math.abs(data[i+2] - data[iRight+2]);
                        regionDiffs.push(diff);
                    }
                }
                
                // Check if differences are very uniform (all similar)
                const avg = regionDiffs.reduce((a, b) => a + b, 0) / regionDiffs.length;
                const variance = regionDiffs.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / regionDiffs.length;
                
                if (variance < 50) uniformRegions++;
                totalRegions++;
            }
        }
        
        return uniformRegions / totalRegions;
    }

    function calculateAverageSaturation(data) {
        let totalSat = 0;
        let count = 0;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i] / 255;
            const g = data[i+1] / 255;
            const b = data[i+2] / 255;
            
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const l = (max + min) / 2;
            
            let s = 0;
            if (max !== min) {
                s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
            }
            
            totalSat += s;
            count++;
        }
        
        return totalSat / count;
    }

    function calculateEdgeDensity(data, size) {
        let edges = 0;
        const threshold = 30;
        
        for (let y = 1; y < size - 1; y++) {
            for (let x = 1; x < size - 1; x++) {
                const i = (y * size + x) * 4;
                const iLeft = (y * size + x - 1) * 4;
                const iRight = (y * size + x + 1) * 4;
                const iUp = ((y - 1) * size + x) * 4;
                const iDown = ((y + 1) * size + x) * 4;
                
                // Sobel-like edge detection
                const gx = Math.abs(data[iRight] - data[iLeft]) + 
                           Math.abs(data[iRight+1] - data[iLeft+1]) + 
                           Math.abs(data[iRight+2] - data[iLeft+2]);
                const gy = Math.abs(data[iDown] - data[iUp]) + 
                           Math.abs(data[iDown+1] - data[iUp+1]) + 
                           Math.abs(data[iDown+2] - data[iUp+2]);
                
                if (gx + gy > threshold * 3) edges++;
            }
        }
        
        return edges / (size * size);
    }

    function calculateTextureComplexity(data, size) {
        let complexity = 0;
        const blockSize = 8;
        
        for (let by = 0; by < size - blockSize; by += blockSize) {
            for (let bx = 0; bx < size - blockSize; bx += blockSize) {
                let blockValues = [];
                
                for (let y = by; y < by + blockSize; y++) {
                    for (let x = bx; x < bx + blockSize; x++) {
                        const i = (y * size + x) * 4;
                        const gray = (data[i] + data[i+1] + data[i+2]) / 3;
                        blockValues.push(gray);
                    }
                }
                
                // Calculate standard deviation of block
                const avg = blockValues.reduce((a, b) => a + b, 0) / blockValues.length;
                const std = Math.sqrt(blockValues.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / blockValues.length);
                complexity += std;
            }
        }
        
        const numBlocks = Math.floor(size / blockSize) * Math.floor(size / blockSize);
        return Math.min(1, (complexity / numBlocks) / 60);
    }

    // ==================== QUALITY ANALYSIS ====================
    
    function analyzeQuality(card, text) {
        let score = 0.5;
        const reasons = [];
        const textLower = text.toLowerCase();

        // Positive indicators
        if (/printed|test\s*print|print\s*photo|actual\s*print|successfully\s*printed/i.test(text)) {
            score += 0.2;
            reasons.push('Has print evidence');
        }

        if (/layer\s*height|infill|nozzle|filament|pla\b|petg|abs\b|supports?\s*(needed|required|recommended)/i.test(text)) {
            score += 0.15;
            reasons.push('Has print settings');
        }

        if (text.length > 400) {
            score += 0.1;
        } else if (text.length > 200) {
            score += 0.05;
        }

        if (/tested|verified|works\s*(great|well|perfectly)|functional/i.test(text)) {
            score += 0.1;
        }

        // Check for multiple images
        const images = card.querySelectorAll('img');
        if (images.length >= 4) score += 0.1;
        else if (images.length >= 2) score += 0.05;

        // Negative indicators
        if (text.length < 80) {
            score -= 0.2;
            reasons.push('Very short description');
        }

        if (/render|cgi|blender\s*render/i.test(text) && !/printed|print\s*photo/i.test(text)) {
            score -= 0.15;
            reasons.push('Render only');
        }

        // Very generic descriptions
        if (/^(a\s+)?3d\s*(model|print)\s*(of\s+)?[\w\s]{1,20}\.?$/i.test(text.trim())) {
            score -= 0.15;
            reasons.push('Generic description');
        }

        return {
            score: Math.max(0, Math.min(1, score)),
            reasons
        };
    }

    // ==================== CARD ANALYSIS ====================
    
    function extractCreatorName(card) {
        const selectors = [
            '[class*="author"] a', '[class*="Author"] a',
            '[class*="creator"] a', '[class*="Creator"] a',
            '[class*="user"] a', '[class*="User"] a',
            'a[href*="/u/"]', 'a[href*="/@"]',
            'a[href*="/user/"]', 'a[href*="/profile/"]',
            '.user-link', '.author-link', '[class*="designer"] a',
            '[class*="username"]', '[class*="Username"]'
        ];
        
        for (const selector of selectors) {
            const el = card.querySelector(selector);
            if (el) {
                let name = el.textContent?.trim();
                if (!name || name.length < 2) {
                    const href = el.href || '';
                    const match = href.match(/\/(?:u|user|profile|@)\/([^\/\?]+)/i);
                    if (match) name = match[1];
                }
                if (name && name.length >= 2 && name.length < 50) {
                    return name.toLowerCase();
                }
            }
        }
        return null;
    }

    function extractModelUrl(card) {
        const link = card.querySelector('a[href*="/model"]') || 
                     card.querySelector('a[href*="/print"]') ||
                     card.querySelector('a');
        return link?.href || card.href || null;
    }

    function checkExplicitAIMarkers(card) {
        // Check for visual AIGC badges
        const aigcBadge = card.querySelector('[class*="aigc" i], [class*="ai-badge" i], [class*="ai-label" i], [data-ai="true"], [class*="AIGenerated" i]');
        if (aigcBadge) {
            return { isAI: true, confidence: 1.0, reason: 'AIGC badge detected' };
        }

        // Check URL for AI categories (MakerWorld)
        const href = extractModelUrl(card) || '';
        if (/\/3d-models\/(2000|2006)/.test(href) || /category=(2000|2006)/.test(href)) {
            return { isAI: true, confidence: 1.0, reason: 'AI category URL' };
        }

        return { isAI: false, confidence: 0, reason: null };
    }

    async function analyzeCard(card) {
        const result = {
            isTaggedAI: false,
            isSuspectedAI: false,
            isLowQuality: false,
            aiConfidence: 0,
            qualityScore: 0.5,
            creator: null,
            modelUrl: null,
            isWhitelisted: false,
            isFalsePositive: false,
            reasons: [],
            imageAnalysis: null
        };

        // Extract metadata
        result.creator = extractCreatorName(card);
        result.modelUrl = extractModelUrl(card);

        // Check whitelist first
        if (result.creator && CONFIG.creatorWhitelist.includes(result.creator.toLowerCase())) {
            result.isWhitelisted = true;
            result.reasons.push(`Creator "${result.creator}" is whitelisted`);
            return result;
        }

        // Check false positive list
        if (result.modelUrl && CONFIG.falsePositives.includes(result.modelUrl)) {
            result.isFalsePositive = true;
            result.reasons.push('Marked as not AI');
            return result;
        }

        // 1. Check explicit AI markers
        const explicitCheck = checkExplicitAIMarkers(card);
        if (explicitCheck.isAI) {
            result.isTaggedAI = true;
            result.aiConfidence = 1.0;
            result.reasons.push(explicitCheck.reason);
            return result;
        }

        // 2. Analyze text content
        const text = card.textContent || '';
        const textAnalysis = analyzeTextForAI(text);
        result.aiConfidence = textAnalysis.confidence;
        result.reasons.push(...textAnalysis.reasons);

        if (textAnalysis.isAI) {
            result.isTaggedAI = true;
            return result;
        }

        // 3. Analyze thumbnail image (if enabled)
        if (CONFIG.analyzeImages && result.aiConfidence < 0.8) {
            const img = card.querySelector('img[src*="thumb"], img[src*="cover"], img[src*="preview"], img');
            if (img && img.src && !img.src.includes('avatar') && !img.src.includes('profile')) {
                const imageAnalysis = await analyzeImage(img);
                result.imageAnalysis = imageAnalysis;
                
                if (imageAnalysis.confidence > 0) {
                    // Combine text and image analysis
                    // Image analysis is supplementary, not primary
                    const imageWeight = 0.3;
                    const combinedConfidence = result.aiConfidence * (1 - imageWeight) + imageAnalysis.confidence * imageWeight;
                    
                    if (imageAnalysis.confidence > 0.5) {
                        result.aiConfidence = Math.max(result.aiConfidence, combinedConfidence);
                        result.reasons.push('Image shows render characteristics');
                    }
                }
            }
        }

        // 4. Determine if suspected AI
        if (result.aiConfidence >= CONFIG.aiConfidenceThreshold) {
            result.isSuspectedAI = true;
        }

        // 5. Quality analysis
        const qualityAnalysis = analyzeQuality(card, text);
        result.qualityScore = qualityAnalysis.score;
        if (qualityAnalysis.score < CONFIG.qualityThreshold) {
            result.isLowQuality = true;
            result.reasons.push(...qualityAnalysis.reasons);
        }

        return result;
    }

    // ==================== WHITELIST MANAGEMENT ====================
    
    function addToWhitelist(creator) {
        if (!creator) return false;
        creator = creator.toLowerCase().trim();
        if (!CONFIG.creatorWhitelist.includes(creator)) {
            CONFIG.creatorWhitelist.push(creator);
            GM_setValue('creatorWhitelist', CONFIG.creatorWhitelist);
            return true;
        }
        return false;
    }

    function removeFromWhitelist(creator) {
        if (!creator) return false;
        creator = creator.toLowerCase().trim();
        const index = CONFIG.creatorWhitelist.indexOf(creator);
        if (index > -1) {
            CONFIG.creatorWhitelist.splice(index, 1);
            GM_setValue('creatorWhitelist', CONFIG.creatorWhitelist);
            return true;
        }
        return false;
    }

    function addFalsePositive(url) {
        if (!url) return false;
        if (!CONFIG.falsePositives.includes(url)) {
            CONFIG.falsePositives.push(url);
            GM_setValue('falsePositives', CONFIG.falsePositives);
            return true;
        }
        return false;
    }

    function exportData() {
        const data = {
            creatorWhitelist: CONFIG.creatorWhitelist,
            falsePositives: CONFIG.falsePositives,
            exportDate: new Date().toISOString(),
            version: '2.5.0'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '3d-filter-data.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.creatorWhitelist) {
                        CONFIG.creatorWhitelist = [...new Set([...CONFIG.creatorWhitelist, ...data.creatorWhitelist])];
                        GM_setValue('creatorWhitelist', CONFIG.creatorWhitelist);
                    }
                    if (data.falsePositives) {
                        CONFIG.falsePositives = [...new Set([...CONFIG.falsePositives, ...data.falsePositives])];
                        GM_setValue('falsePositives', CONFIG.falsePositives);
                    }
                    alert(`Imported ${CONFIG.creatorWhitelist.length} creators and ${CONFIG.falsePositives.length} marked models`);
                    applyFiltering();
                } catch (err) {
                    alert('Import error: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    // ==================== UI ====================
    
    function createUI() {
        const style = document.createElement('style');
        style.textContent = `
            #aif-panel {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: linear-gradient(145deg, #1a1a2e 0%, #252540 100%);
                color: #e0e0e0;
                padding: 16px;
                border-radius: 14px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                z-index: 999999;
                box-shadow: 0 8px 32px rgba(0,0,0,0.5);
                min-width: 260px;
                max-width: 300px;
                border: 1px solid rgba(255,255,255,0.06);
            }
            #aif-panel.minimized { min-width: auto; padding: 10px 14px; }
            #aif-panel.minimized .aif-content { display: none; }
            #aif-panel.minimized .aif-header { margin-bottom: 0; }
            
            .aif-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
                cursor: pointer;
            }
            .aif-title { font-weight: 600; font-size: 14px; }
            .aif-minimize {
                background: none; border: none; color: #666;
                font-size: 18px; cursor: pointer; padding: 0 4px;
            }
            .aif-minimize:hover { color: #fff; }
            
            .aif-section {
                background: rgba(255,255,255,0.03);
                border-radius: 8px;
                padding: 10px;
                margin-bottom: 8px;
            }
            .aif-section-title {
                font-size: 9px; color: #666; text-transform: uppercase;
                letter-spacing: 0.5px; margin-bottom: 8px;
            }
            
            .aif-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 5px 0;
            }
            .aif-label { font-size: 12px; color: #bbb; }
            
            .aif-toggle { position: relative; width: 36px; height: 20px; }
            .aif-toggle input { opacity: 0; width: 0; height: 0; }
            .aif-toggle-slider {
                position: absolute; cursor: pointer;
                top: 0; left: 0; right: 0; bottom: 0;
                background-color: #3a3a4a;
                transition: 0.2s; border-radius: 20px;
            }
            .aif-toggle-slider:before {
                position: absolute; content: "";
                height: 14px; width: 14px; left: 3px; bottom: 3px;
                background-color: white; transition: 0.2s; border-radius: 50%;
            }
            input:checked + .aif-toggle-slider { background: #6366f1; }
            input:checked + .aif-toggle-slider:before { transform: translateX(16px); }
            
            .aif-stats {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 4px;
                margin-top: 8px;
            }
            .aif-stat {
                background: rgba(255,255,255,0.04);
                padding: 6px 2px;
                border-radius: 6px;
                text-align: center;
            }
            .aif-stat-num { font-size: 15px; font-weight: 700; }
            .aif-stat-num.purple { color: #818cf8; }
            .aif-stat-num.pink { color: #f472b6; }
            .aif-stat-num.orange { color: #fb923c; }
            .aif-stat-num.green { color: #4ade80; }
            .aif-stat-label { font-size: 8px; color: #666; text-transform: uppercase; }
            
            .aif-btn {
                background: rgba(255,255,255,0.06);
                border: none; color: #aaa; padding: 6px 10px;
                border-radius: 5px; cursor: pointer; font-size: 10px;
                transition: all 0.2s; flex: 1;
            }
            .aif-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
            .aif-btn-row { display: flex; gap: 6px; margin-top: 8px; }
            
            .aif-hidden { display: none !important; }
            .aif-highlight { outline: 3px solid #818cf8 !important; outline-offset: 2px; position: relative; }
            .aif-highlight-suspected { outline-color: #f472b6 !important; }
            .aif-highlight-lowquality { outline-color: #fb923c !important; }
            
            .aif-badge {
                position: absolute; top: 5px; right: 5px;
                padding: 3px 7px; border-radius: 5px;
                font-size: 9px; font-weight: 600; color: white;
                z-index: 100; font-family: -apple-system, sans-serif;
            }
            .aif-badge.tagged { background: #6366f1; }
            .aif-badge.suspected { background: #ec4899; }
            .aif-badge.lowquality { background: #f97316; }
            .aif-badge.whitelisted { background: #22c55e; }
            
            .aif-card-actions {
                position: absolute; top: 5px; left: 5px;
                display: flex; gap: 3px; z-index: 101;
            }
            .aif-card-btn {
                background: rgba(0,0,0,0.75); border: none; color: #fff;
                width: 22px; height: 22px; border-radius: 4px;
                cursor: pointer; font-size: 11px;
                display: flex; align-items: center; justify-content: center;
                opacity: 0; transition: opacity 0.15s;
            }
            .aif-highlight:hover .aif-card-btn,
            .aif-processed:hover .aif-card-btn { opacity: 1; }
            .aif-card-btn:hover { background: rgba(0,0,0,0.9); }
            .aif-card-btn.done { background: #22c55e; opacity: 1; }
            
            .aif-score {
                position: absolute; bottom: 5px; left: 5px;
                padding: 2px 5px; border-radius: 3px; font-size: 8px;
                background: rgba(0,0,0,0.8); color: #fff;
                font-family: monospace; z-index: 100;
            }
        `;
        document.head.appendChild(style);

        const panel = document.createElement('div');
        panel.id = 'aif-panel';
        panel.innerHTML = `
            <div class="aif-header">
                <span class="aif-title">🛡️ AI Filter v2.5</span>
                <button class="aif-minimize">−</button>
            </div>
            <div class="aif-content">
                <div class="aif-section">
                    <div class="aif-section-title">Filters</div>
                    <div class="aif-row">
                        <span class="aif-label">🏷️ Tagged AI</span>
                        <label class="aif-toggle">
                            <input type="checkbox" id="aif-tagged" ${CONFIG.filterTaggedAI ? 'checked' : ''}>
                            <span class="aif-toggle-slider"></span>
                        </label>
                    </div>
                    <div class="aif-row">
                        <span class="aif-label">🔍 Suspected AI</span>
                        <label class="aif-toggle">
                            <input type="checkbox" id="aif-suspected" ${CONFIG.filterSuspectedAI ? 'checked' : ''}>
                            <span class="aif-toggle-slider"></span>
                        </label>
                    </div>
                    <div class="aif-row">
                        <span class="aif-label">⚠️ Low Quality</span>
                        <label class="aif-toggle">
                            <input type="checkbox" id="aif-quality" ${CONFIG.filterLowQuality ? 'checked' : ''}>
                            <span class="aif-toggle-slider"></span>
                        </label>
                    </div>
                </div>
                
                <div class="aif-section">
                    <div class="aif-section-title">Options</div>
                    <div class="aif-row">
                        <span class="aif-label">Highlight only</span>
                        <label class="aif-toggle">
                            <input type="checkbox" id="aif-highlight" ${CONFIG.highlightInstead ? 'checked' : ''}>
                            <span class="aif-toggle-slider"></span>
                        </label>
                    </div>
                    <div class="aif-row">
                        <span class="aif-label">Analyze images</span>
                        <label class="aif-toggle">
                            <input type="checkbox" id="aif-images" ${CONFIG.analyzeImages ? 'checked' : ''}>
                            <span class="aif-toggle-slider"></span>
                        </label>
                    </div>
                    <div class="aif-row">
                        <span class="aif-label">Show scores</span>
                        <label class="aif-toggle">
                            <input type="checkbox" id="aif-scores" ${CONFIG.showScores ? 'checked' : ''}>
                            <span class="aif-toggle-slider"></span>
                        </label>
                    </div>
                </div>
                
                <div class="aif-section">
                    <div class="aif-section-title">Whitelist (${CONFIG.creatorWhitelist.length})</div>
                    <div class="aif-btn-row">
                        <button class="aif-btn" id="aif-manage">Manage</button>
                        <button class="aif-btn" id="aif-import">Import</button>
                        <button class="aif-btn" id="aif-export">Export</button>
                    </div>
                </div>
                
                <div class="aif-stats">
                    <div class="aif-stat">
                        <div class="aif-stat-num purple" id="aif-stat-tagged">0</div>
                        <div class="aif-stat-label">Tagged</div>
                    </div>
                    <div class="aif-stat">
                        <div class="aif-stat-num pink" id="aif-stat-suspected">0</div>
                        <div class="aif-stat-label">Suspect</div>
                    </div>
                    <div class="aif-stat">
                        <div class="aif-stat-num orange" id="aif-stat-quality">0</div>
                        <div class="aif-stat-label">Low Q</div>
                    </div>
                    <div class="aif-stat">
                        <div class="aif-stat-num green" id="aif-stat-whitelist">0</div>
                        <div class="aif-stat-label">OK</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        // Events
        panel.querySelector('.aif-header').addEventListener('click', (e) => {
            if (!e.target.classList.contains('aif-minimize')) panel.classList.toggle('minimized');
        });
        panel.querySelector('.aif-minimize').addEventListener('click', () => panel.classList.toggle('minimized'));

        const toggles = {
            'aif-tagged': 'filterTaggedAI',
            'aif-suspected': 'filterSuspectedAI',
            'aif-quality': 'filterLowQuality',
            'aif-highlight': 'highlightInstead',
            'aif-images': 'analyzeImages',
            'aif-scores': 'showScores'
        };
        
        for (const [id, key] of Object.entries(toggles)) {
            document.getElementById(id).addEventListener('change', (e) => {
                CONFIG[key] = e.target.checked;
                GM_setValue(key, e.target.checked);
                applyFiltering();
            });
        }

        document.getElementById('aif-manage').addEventListener('click', showWhitelistManager);
        document.getElementById('aif-import').addEventListener('click', importData);
        document.getElementById('aif-export').addEventListener('click', exportData);
    }

    function showWhitelistManager() {
        const existing = document.getElementById('aif-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'aif-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.85); z-index: 9999999;
            display: flex; align-items: center; justify-content: center;
        `;
        
        modal.innerHTML = `
            <div style="background: #1a1a2e; border-radius: 12px; padding: 20px;
                max-width: 380px; width: 90%; max-height: 75vh; overflow-y: auto;
                color: #e0e0e0; font-family: -apple-system, sans-serif;">
                <h3 style="margin: 0 0 12px; font-size: 16px;">Whitelisted Creators</h3>
                <p style="font-size: 11px; color: #777; margin-bottom: 12px;">
                    These creators' models will never be filtered.
                </p>
                <input type="text" id="aif-add-input" placeholder="Add username..."
                    style="width: 100%; padding: 8px 10px; border-radius: 6px; border: 1px solid #333;
                    background: #252540; color: #fff; font-size: 13px; box-sizing: border-box; margin-bottom: 12px;">
                <div id="aif-list" style="max-height: 250px; overflow-y: auto;">
                    ${CONFIG.creatorWhitelist.length === 0 ? 
                        '<p style="color: #555; text-align: center; padding: 16px;">No creators yet</p>' :
                        CONFIG.creatorWhitelist.map(c => `
                            <div style="display: flex; justify-content: space-between; align-items: center;
                                padding: 7px 10px; background: rgba(255,255,255,0.04); border-radius: 5px; margin-bottom: 5px;">
                                <span style="font-size: 12px;">${c}</span>
                                <button data-c="${c}" class="aif-rm" style="background: #dc2626; border: none; color: white;
                                    padding: 3px 7px; border-radius: 3px; cursor: pointer; font-size: 10px;">✕</button>
                            </div>
                        `).join('')
                    }
                </div>
                <button id="aif-close" style="width: 100%; margin-top: 14px; padding: 10px;
                    border-radius: 6px; border: none; background: #6366f1; color: white;
                    cursor: pointer; font-size: 13px;">Done</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('aif-add-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.target.value.trim()) {
                addToWhitelist(e.target.value.trim());
                modal.remove();
                showWhitelistManager();
                applyFiltering();
            }
        });
        
        modal.querySelectorAll('.aif-rm').forEach(btn => {
            btn.addEventListener('click', () => {
                removeFromWhitelist(btn.dataset.c);
                modal.remove();
                showWhitelistManager();
                applyFiltering();
            });
        });
        
        document.getElementById('aif-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }

    function updateStats() {
        document.getElementById('aif-stat-tagged').textContent = stats.taggedAI;
        document.getElementById('aif-stat-suspected').textContent = stats.suspectedAI;
        document.getElementById('aif-stat-quality').textContent = stats.lowQuality;
        document.getElementById('aif-stat-whitelist').textContent = stats.whitelisted;
    }

    // ==================== MAIN FILTERING ====================
    
    let processing = false;

    async function applyFiltering() {
        if (processing) return;
        processing = true;

        stats.taggedAI = 0;
        stats.suspectedAI = 0;
        stats.lowQuality = 0;
        stats.whitelisted = 0;

        // Clear old markers
        document.querySelectorAll('.aif-hidden, .aif-highlight, .aif-highlight-suspected, .aif-highlight-lowquality, .aif-processed').forEach(el => {
            el.classList.remove('aif-hidden', 'aif-highlight', 'aif-highlight-suspected', 'aif-highlight-lowquality', 'aif-processed');
        });
        document.querySelectorAll('.aif-badge, .aif-score, .aif-card-actions').forEach(el => el.remove());

        const cards = findCards();

        for (const card of cards) {
            await processCard(card);
        }

        updateStats();
        processing = false;
    }

    function findCards() {
        const selectors = [
            '[class*="model-card" i]', '[class*="modelcard" i]',
            '[class*="ModelCard" i]', '.print-card',
            'article[class*="print" i]', '[class*="thingcard" i]',
            '[class*="searchresult" i]', '[class*="SearchResult" i]'
        ];
        
        const cards = new Set();
        selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                if (el.offsetHeight > 50 && el.offsetWidth > 50) cards.add(el);
            });
        });
        return Array.from(cards);
    }

    async function processCard(card) {
        const result = await analyzeCard(card);
        
        card.classList.add('aif-processed');
        card.style.position = 'relative';

        if (result.isWhitelisted || result.isFalsePositive) {
            stats.whitelisted++;
            return;
        }

        let shouldFilter = false;
        let filterType = null;
        let badgeText = '';

        if (CONFIG.filterTaggedAI && result.isTaggedAI) {
            shouldFilter = true;
            filterType = 'tagged';
            badgeText = '🏷️ AI';
            stats.taggedAI++;
        } else if (CONFIG.filterSuspectedAI && result.isSuspectedAI) {
            shouldFilter = true;
            filterType = 'suspected';
            badgeText = `🔍 ${Math.round(result.aiConfidence * 100)}%`;
            stats.suspectedAI++;
        } else if (CONFIG.filterLowQuality && result.isLowQuality && !result.isTaggedAI && !result.isSuspectedAI) {
            shouldFilter = true;
            filterType = 'lowquality';
            badgeText = '⚠️ Low';
            stats.lowQuality++;
        }

        if (!shouldFilter) {
            if (CONFIG.highlightInstead && result.aiConfidence > 0.4) {
                addCardActions(card, result);
            }
            return;
        }

        if (CONFIG.highlightInstead) {
            card.classList.add('aif-highlight');
            if (filterType === 'suspected') card.classList.add('aif-highlight-suspected');
            if (filterType === 'lowquality') card.classList.add('aif-highlight-lowquality');
            
            const badge = document.createElement('div');
            badge.className = `aif-badge ${filterType}`;
            badge.textContent = badgeText;
            card.appendChild(badge);
            
            addCardActions(card, result);
        } else {
            card.classList.add('aif-hidden');
        }

        if (CONFIG.showScores) {
            const score = document.createElement('div');
            score.className = 'aif-score';
            score.textContent = `AI:${Math.round(result.aiConfidence * 100)}%`;
            if (result.imageAnalysis) {
                score.textContent += ` Img:${Math.round(result.imageAnalysis.confidence * 100)}%`;
            }
            card.appendChild(score);
        }
    }

    function addCardActions(card, result) {
        const actions = document.createElement('div');
        actions.className = 'aif-card-actions';
        
        const okBtn = document.createElement('button');
        okBtn.className = 'aif-card-btn';
        okBtn.innerHTML = '✓';
        okBtn.title = 'Not AI';
        okBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (result.modelUrl && addFalsePositive(result.modelUrl)) {
                okBtn.classList.add('done');
                card.classList.remove('aif-highlight', 'aif-highlight-suspected', 'aif-highlight-lowquality');
                card.querySelector('.aif-badge')?.remove();
            }
        });
        actions.appendChild(okBtn);
        
        if (result.creator) {
            const wlBtn = document.createElement('button');
            wlBtn.className = 'aif-card-btn';
            wlBtn.innerHTML = '👤';
            wlBtn.title = `Whitelist ${result.creator}`;
            wlBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (addToWhitelist(result.creator)) {
                    alert(`Whitelisted: ${result.creator}`);
                    applyFiltering();
                }
            });
            actions.appendChild(wlBtn);
        }
        
        card.appendChild(actions);
    }

    // ==================== OBSERVER ====================
    
    function setupObserver() {
        let timeout;
        const observer = new MutationObserver(() => {
            clearTimeout(timeout);
            timeout = setTimeout(applyFiltering, 350);
        });
        observer.observe(document.body, { childList: true, subtree: true });

        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(applyFiltering, 450);
        }, { passive: true });
    }

    // ==================== INIT ====================
    
    function init() {
        console.log('[AI Filter] v2.5.0 starting...');
        createUI();
        setupObserver();
        setTimeout(applyFiltering, 600);
        
        if (typeof GM_registerMenuCommand !== 'undefined') {
            GM_registerMenuCommand('Refresh', applyFiltering);
            GM_registerMenuCommand('Whitelist', showWhitelistManager);
            GM_registerMenuCommand('Export', exportData);
        }
        
        console.log('[AI Filter] Ready. Whitelist:', CONFIG.creatorWhitelist.length);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
