# 3D Print AI Filter

> Filter out AI-generated models from MakerWorld, Printables, and Thangs

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Compatible-green.svg)](https://www.tampermonkey.net/)
[![Version](https://img.shields.io/badge/Version-3.0.0-blue.svg)](#)

## The Problem

3D model sites are getting flooded with AI-generated content. Low-effort models made with Meshy, Tripo, and similar tools are drowning out quality human-made designs. These AI models often have:

- No print photos (just renders)
- Generic copy-paste descriptions
- Untested, unprintable geometry
- Stolen or AI-generated preview images

## The Solution

Browser userscripts that detect and filter AI-generated 3D models so you can find the good stuff.

## Three Versions Available

Choose the version that fits your needs:

| Version | File | Detection Method | Best For |
|---------|------|------------------|----------|
| **Basic** | `3d-print-ai-filter-basic.user.js` | Explicit tags only | Users who only want to filter labeled AI models |
| **Advanced** | `3d-print-ai-filter-advanced.user.js` | Tags + Heuristics + Image Analysis | Most users - good balance of detection |
| **ML** | `3d-print-ai-filter-ml.user.js` | Tags + Heuristics + TensorFlow.js | Power users who want to train custom models |

## Features Comparison

| Feature | Basic | Advanced | ML |
|---------|:-----:|:--------:|:--:|
| Explicit AIGC tag detection | ✓ | ✓ | ✓ |
| Heuristic text analysis | | ✓ | ✓ |
| 50+ AI tools database | | ✓ | ✓ |
| Context-aware detection | | ✓ | ✓ |
| Image analysis | | ✓ | ✓ |
| Low quality filter | | ✓ | ✓ |
| Engagement filter | | ✓ | ✓ |
| Creator whitelist/blacklist | | ✓ | ✓ |
| Mark as OK | | ✓ | ✓ |
| Import/Export lists | | ✓ | ✓ |
| Custom ML model support | | | ✓ |

## Supported Sites

| Site | Status |
|------|--------|
| [MakerWorld](https://makerworld.com) | Full support |
| [Printables](https://printables.com) | Full support |
| [Thangs](https://thangs.com) | Partial support* |

*Thangs has inconsistent HTML structure, detection may miss some cards.

## Quick Start

### Step 1: Install Tampermonkey

| Browser | Link |
|---------|------|
| Chrome | [Install](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Firefox | [Install](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) |
| Edge | [Install](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) |
| Safari | [Install](https://apps.apple.com/us/app/userscripts/id1463298887) |

### Step 2: Install the Script

Choose your version:

- **Basic**: [Click to Install](../../raw/main/scripts/3d-print-ai-filter-basic.user.js)
- **Advanced** (Recommended): [Click to Install](../../raw/main/scripts/3d-print-ai-filter-advanced.user.js)
- **ML**: [Click to Install](../../raw/main/scripts/3d-print-ai-filter-ml.user.js)

### Step 3: Browse

1. Go to MakerWorld, Printables, or Thangs
2. Panel appears in bottom-right corner
3. AI models get flagged with colored borders
4. Hover over flagged cards to see why

## How Detection Works

### Explicit Detection (All Versions)

Catches models that are explicitly tagged as AI:
- AIGC badges on MakerWorld
- AI category URLs (MakerWorld 2000, 2006)
- AI tags on Printables
- Explicit "AI-generated" labels

### Heuristic Detection (Advanced & ML)

Analyzes text for AI signals:

| Signal | Weight | Example |
|--------|--------|---------|
| AI tool mention (confirmed) | +35 | "Made with Meshy" |
| AI tool mention (ambiguous) | +12 | "Meshy" in description |
| Generation phrases | +30 | "Generated this model" |
| Image-to-3D phrases | +30 | "Converted from photo" |
| Generic AI title | +10 | "Cute Dragon Figurine" |
| Human claim | -25 | "Designed by me" |
| CAD software mention | -30 | "Modeled in Blender" |

### AI Tools Database (50+)

The script recognizes mentions of:

Meshy, Tripo, Tripo3D, Rodin, Luma, CSM, Kaedim, Alpha3D, Masterpiece Studio, Spline AI, Point-E, Shap-E, GET3D, DreamFusion, Magic3D, Fantasia3D, Zero123, One-2-3-45, Wonder3D, Instant3D, ThreeStudio, Text2Mesh, DreamGaussian, GSGen, LucidDreamer, 3DFy, Anything World, Leonardo AI, Sloyd, and more...

### Image Analysis (Advanced & ML)

Analyzes thumbnail images for AI render characteristics:

| Metric | AI Renders | Real Photos |
|--------|------------|-------------|
| Smoothness | Very high | Lower (visible texture) |
| Color banding | Present | Absent |
| Edge density | Low | Higher (layer lines) |
| Background | Uniform/gradient | Varied |
| Noise | None | Sensor noise present |
| Saturation | Often high | Natural range |

### Machine Learning (ML Version)

Load a custom TensorFlow.js model trained to detect AI thumbnails. See the [Training Guide](docs/TRAINING_GUIDE.md) for how to train your own model.

## Filter Types

The Advanced and ML versions support multiple filter types:

| Filter | What it catches | Default |
|--------|-----------------|---------|
| **Tagged AI** | Explicitly labeled AIGC models | ON |
| **Suspected AI** | Heuristically detected AI models | OFF |
| **Low Quality** | Low-effort posts (short desc, no settings) | OFF |
| **Engagement** | Models below min likes/downloads/makes | OFF |

You can enable any combination:

- **Tagged only**: Just catch the obvious ones
- **Tagged + Suspected**: Catch most AI models
- **Low Quality only**: Filter slop regardless of AI status
- **All filters**: Maximum filtering

## Panel Stats

| Stat | Color | Meaning |
|------|-------|---------|
| TAG | Red | Explicitly tagged AI |
| SUS | Orange | Suspected AI (heuristics) |
| LOW | Purple | Low quality |
| ENG | Blue | Fails engagement filter |
| OK | Green | Clean/whitelisted |

## Card Actions

When you hover over a flagged card, buttons appear:

| Button | Action |
|--------|--------|
| `ok` | Mark this specific model as not AI |
| `+` | Whitelist this creator (never flag their models) |
| `x` | Blacklist this creator (always flag their models) |

## Settings

### Threshold (Advanced & ML)

Confidence required to flag a model as suspected AI (0-100). Default: 65

- Lower = more sensitive, more false positives
- Higher = less sensitive, may miss some AI

### Engagement Minimums

When engagement filter is enabled:

| Setting | Default | Description |
|---------|---------|-------------|
| Min Likes | 0 | Hide models below this |
| Min Downloads | 0 | Hide models below this |
| Min Makes | 0 | Hide models below this |

### ML Settings (ML Version)

| Setting | Description |
|---------|-------------|
| Model URL | URL to your hosted model.json |
| Use ML Model | Enable/disable ML predictions |
| ML Threshold | Confidence for ML (0-100%, default 60%) |

## Managing Lists

Click "lists" to open the list manager:

- **Trusted (whitelist)**: Creators whose models are never flagged
- **Blocked (blacklist)**: Creators whose models are always hidden

### Import/Export

Share your lists with others:

- **Export**: Downloads your lists as JSON
- **Import**: Loads lists from a JSON file (merges with existing)

## Training Your Own Model

See the detailed [Training Guide](docs/TRAINING_GUIDE.md) for step-by-step instructions on:

1. Setting up Python and TensorFlow
2. Collecting training images
3. Training the model
4. Converting for browser use
5. Hosting your model
6. Using it with the ML script

The `training/` folder contains ready-to-use Python scripts.

## FAQ

**Q: A real model got flagged. What do I do?**

Hover over it and click "ok" to mark that specific model as not AI. Or click "+" to whitelist the creator.

**Q: Some AI models aren't being caught.**

1. Enable "Suspected AI" filter
2. Lower the threshold (try 50)
3. For the ML version, try training a custom model

**Q: Does this send my data anywhere?**

No. Everything runs 100% locally in your browser.

**Q: Why highlight instead of hide?**

So you can see what's being caught and correct mistakes. You can switch to hide mode in settings.

**Q: The script isn't working on a site.**

Check that the site URL matches the @match patterns. Open browser DevTools (F12) and check for errors in the Console.

**Q: How do I update the script?**

Tampermonkey will auto-update from the install URL. Or manually reinstall from this repo.

## Changelog

### v3.0.0

- Three separate versions (Basic, Advanced, ML)
- Context-aware text analysis
- Image analysis for AI render detection
- Quality scoring system
- Engagement filters
- Creator whitelist/blacklist
- Mark individual models as OK
- Import/export functionality
- TensorFlow.js support for custom models

### v2.0.0

- Heuristic detection
- 50+ AI tools database
- Configurable threshold

### v1.0.0

- Basic AIGC tag detection
- MakerWorld support

## Contributing

Found a bug? Know an AI tool that should be added? Open an issue.

Pull requests welcome for:
- New AI tool names
- Improved heuristics
- Site selector fixes
- Bug fixes

## License

MIT License - see [LICENSE](LICENSE)

## Disclaimer

This tool is provided as-is. Detection accuracy varies. False positives and negatives will occur. The author is not responsible for any models incorrectly flagged or missed.
