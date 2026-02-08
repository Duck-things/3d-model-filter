# 3D Print AI Filter v4.5.0

Filter AI-generated models from 3D printing and model marketplace sites. Comprehensive detection with three modes.

![Version](https://img.shields.io/badge/version-4.5.0-blue)
![Chrome](https://img.shields.io/badge/chrome-extension-green)
![Sites](https://img.shields.io/badge/sites-9-orange)

## What's New in v4.5.0

- **4-Tier AI Tool Database** - 150+ AI tools categorized by confidence
- **Creator Reputation Tracking** - Tracks uploaders and flags repeat AI uploaders
- **9 Supported Sites** - Added CGTrader, TurboSquid, Sketchfab
- **Multi-language Support** - Chinese AI tags (ai生成, ai创作)
- **Suspicious Username Detection** - Catches bot-like usernames
- **Improved Scoring** - More granular scoring with better calibration
- **Better MakerWorld Detection** - Fixed card detection and AI badge recognition

## Supported Sites

| Site | Status | Notes |
|------|--------|-------|
| MakerWorld | ✅ Full | Best detection - has AI tags |
| Printables | ✅ Full | Good detection |
| Thangs | ✅ Full | Good detection |
| Thingiverse | ✅ Full | Classic site |
| Cults3D | ✅ Full | Marketplace |
| MyMiniFactory | ✅ Full | Marketplace |
| CGTrader | ✅ NEW | 3D marketplace |
| TurboSquid | ✅ NEW | 3D marketplace |
| Sketchfab | ✅ NEW | 3D viewer/marketplace |

## Detection Modes

### Basic Mode ⚡
Fast and accurate for tagged AI models.

**Detects:**
- AI badges on cards (100% confidence)
- Tier 0 AI tools: Meshy, Tripo, Rodin, Luma, CSM, Hunyuan, Trellis (+100)
- Tier 1 AI tools: Kaedim, Alpha3D, 3DFY, Sloyd, Leonardo (+85)
- Definitive phrases: "ai generated", "text to 3d", "image to 3d" (+95)
- AI tags in model tags (+95)

**Human Signals (reduce score):**
- "Designed by me", "handmade" (-50)
- CAD software: Blender, Fusion 360, ZBrush (-40)
- Process terms: "parametric", "test prints" (-30)

### Advanced Mode 🔍
Everything in Basic plus behavioral analysis.

**Additional Detection:**
- Suspicious title patterns: "3D model of a...", "cute stylized character"
- Suspicious descriptions: Very short or generic
- Suspicious usernames: bot-like patterns
- No engagement flag: 0 likes + few downloads + 0 makes
- Multiple AI signals stacking bonus

**Quality Signals (reduce score):**
- Makes: 3+ (-12), 10+ (-20), 30+ (-30), 100+ (-40)
- Likes: 50+ (-10), 200+ (-15), 1000+ (-25)
- Downloads: 1000+ (-12), 5000+ (-20)
- Comments: 10+ (-10), 30+ (-18)
- Print terms: layer height, infill, supports, etc. (-8 to -35)
- Functional terms: assembly, gears, snap fit, etc. (-8 to -30)
- Detailed description: 300+ chars (-6), 600+ (-12), 1200+ (-20)

### ML Mode 🤖
Everything in Advanced plus machine learning.

**Features:**
- TensorFlow.js neural network
- 12-feature classification
- Configurable ML weight
- Custom model support

## Scoring System

| Score | Status | Display |
|-------|--------|---------|
| 65+ | AI Detected | 🤖 Red border + "AI" badge |
| 33-64 | Suspicious | ⚠️ Yellow border + "SUS" badge |
| 0-32 | Likely Clean | ✅ Green border (if enabled) |

## AI Tools Database (150+)

### Tier 0 - Absolute Certainty
Meshy, Tripo, Rodin, Luma AI, CSM, Hunyuan, Trellis, InstantMesh

### Tier 1 - Very High Confidence
Kaedim, Alpha3D, 3DFY, Sloyd, SudoAI, Masterpiece, Spline AI, Leonardo AI, Anything World, Scenario, Blockade Labs, Stability AI, Genmo, Genie, Clay AI

### Tier 2 - High Confidence
Point-E, Shap-E, Get3D, DreamFusion, Magic3D, Fantasia3D, Zero123, Wonder3D, ThreeStudio, Text2Mesh, DreamGaussian, GSGen, LucidDreamer, DreamCraft3D, SyncDreamer, Neuralangelo, NeRF Studio, and 30+ more

### Tier 3 - Emerging Tools (2024-2025)
Stable Point, Splat3R, LGM, GRM, Craftsman, MicroDreamer, MVDream, ImageDream, SweetDreamer, RichDreamer, HiFi-123, Magic123, RealFusion, and more

## Installation

### Chrome / Edge / Brave / Opera

1. Download the latest release `.zip`
2. Unzip to a folder
3. Go to `chrome://extensions`
4. Enable **Developer mode** (top right toggle)
5. Click **Load unpacked**
6. Select the unzipped folder
7. Pin the extension to your toolbar

## Usage

### Floating Panel
A small panel appears on supported sites showing:
- AI / SUS / OK counts
- Current mode
- Quick rescan button
- Hide/Show toggle

### Popup (Click Extension Icon)
- Switch between Basic/Advanced/ML modes
- Toggle filter on/off
- Toggle highlight vs hide mode
- Toggle score display
- Rescan current page

### Options Page (Right-click → Options)

**Detection:**
- Filter tagged AI models
- Filter suspected AI
- Detection threshold (default 65)

**Display:**
- Highlight only mode
- Show scores
- Show detection reasons

**Lists:**
- Whitelist (always show)
- Blacklist (always hide)
- Import/Export settings

**ML Settings:**
- Custom model URL
- ML weight (default 35)

## Human Indicators Database

### CAD Software (40+ programs)
Blender, Fusion 360, SolidWorks, Maya, 3DS Max, ZBrush, Rhino, Cinema 4D, Houdini, FreeCAD, OpenSCAD, TinkerCAD, Onshape, SketchUp, and many more

### 3D Printing Terms (100+ terms)
Tolerance, layer height, infill, supports, bridging, nozzle, bed temp, PLA, PETG, Ender, Prusa, Bambu Lab, Cura, PrusaSlicer, and more

### Functional/Mechanical Terms (80+ terms)
Assembly, snap fit, thread, hinge, gear, bearing, spring, LED, PCB, enclosure, mount, bracket, and more

## Privacy

- Runs entirely locally
- No data collection
- No external requests (except TensorFlow CDN in ML mode)
- Settings in Chrome local storage

## Files

```
3d-ai-filter-ext/
├── manifest.json          # Extension config (v4.5.0)
├── background.js          # Service worker
├── popup.html/js          # Quick settings
├── options.html/js        # Full settings
├── content/
│   ├── loader.js          # Detection engine (~1400 lines)
│   └── styles.css         # Highlighting styles
├── lib/
│   └── tf.min.js          # TensorFlow loader
├── training/              # ML training resources
│   ├── TRAINING_GUIDE.md
│   ├── train.py
│   ├── convert.py
│   └── sample_data.csv
└── icons/                 # Extension icons
```

## Changelog

### v4.5.0 (Current)
- Complete detection engine rewrite
- 4-tier AI tool database (150+ tools)
- Creator reputation tracking
- Added CGTrader, TurboSquid, Sketchfab support
- Multi-language AI tag detection
- Suspicious username detection
- Improved scoring calibration
- Better engagement analysis
- More human indicator categories
- Fixed MakerWorld AI badge detection

### v3.x
- Three detection modes
- ML support with TensorFlow.js
- Whitelist/blacklist
- 6 supported sites

### v2.x
- Heuristic detection
- Basic tag matching

### v1.x
- Initial release

## License

MIT License

---

Made for the 3D printing community by someone tired of AI spam 🖨️
