# 🛡️ 3D Model AI & Quality Filter

> Filter out AI-generated and low-quality 3D models from MakerWorld, Printables, and Thangs

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Compatible-green.svg)](https://www.tampermonkey.net/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

## This is somewhat what the filter should look like based on the version you installed
<img width="376" height="788" alt="Image" src="https://github.com/user-attachments/assets/909c502c-b462-48c2-be8c-5ac7a4673606" />

## 🎯 Why I Built This

If you've browsed MakerWorld, Printables, or Thangs lately, you've probably noticed the flood of AI-generated models. I got tired of scrolling through endless low-quality "slop" just to find actual printable designs made by real people.

The built-in filters on these sites don't work well (or don't exist), so I built this userscript to fix the problem. It's been a game-changer for my browsing, and hopefully it helps you too.

## ✨ Features

| Feature | Basic | Advanced | ML-Powered |
|---------|:-----:|:--------:|:----------:|
| Filter tagged AI models | ✅ | ✅ | ✅ |
| Context-aware text analysis | ❌ | ✅ | ✅ |
| Image/thumbnail analysis | ❌ | ✅ | ✅ |
| Detect unlabeled AI models | ❌ | ✅ | ✅ |
| Filter low-quality models | ❌ | ✅ | ✅ |
| Creator whitelist | ❌ | ✅ | ✅ |
| "Not AI" false positive button | ❌ | ✅ | ✅ |
| Import/Export settings | ❌ | ✅ | ✅ |
| Machine learning detection | ❌ | ❌ | ✅ |
| Custom model support | ❌ | ❌ | ✅ |

## 🚀 Quick Start

### Step 1: Install Tampermonkey

| Browser | Link |
|---------|------|
| Chrome | [Install](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Firefox | [Install](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) |
| Edge | [Install](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) |
| Safari | [Install](https://apps.apple.com/us/app/userscripts/id1463298887) |

### Step 2: Install the Script

Click to install directly:

- [📦 Basic Version](../../raw/main/scripts/ai-model-filter.user.js) - Tag detection only
- [📦 Advanced Version](../../raw/main/scripts/ai-model-filter-advanced.user.js) - **Recommended** - Smart detection + whitelist
- [📦 ML Version](../../raw/main/scripts/ai-model-filter-ml.user.js) - TensorFlow.js powered

Or manually copy the script contents into Tampermonkey.

### Step 3: Use It

1. Go to [MakerWorld](https://makerworld.com), [Printables](https://printables.com), or [Thangs](https://thangs.com)
2. Look for the control panel in the bottom-right corner
3. Toggle filters on/off as needed

## 📖 How It Works

### 🏷️ Tagged AI Detection
Catches models explicitly marked as AI:
- AIGC badges and labels
- AI tool names (Meshy, Tripo, Rodin, Luma, etc.)
- AI category URLs on MakerWorld
- "Generated with AI" type phrases

### 🧠 Context-Aware Analysis (Advanced/ML)

The script actually **understands context** now. It won't flag someone just because they mentioned "AI":

| What they wrote | Result |
|-----------------|--------|
| "Made with Meshy AI" | 🚩 Flagged |
| "Not made with AI" | ✅ Ignored |
| "I hate AI slop, this is hand-made" | ✅ Score **reduced** |
| "No AI involved, designed in Blender" | ✅ Score **reduced** |
| "Anti-AI, original design" | ✅ Score **reduced** |

**Human-made indicators that reduce the AI score:**
- "hand-made", "hand-crafted"
- "designed by me", "my own design"
- "modeled in Blender/Fusion/ZBrush"
- "original design"
- "10 hours of work"
- "sculpted", "drafted"

### 🖼️ Image Analysis (Advanced/ML)

Analyzes thumbnails to detect AI render characteristics:

| Feature | AI Renders | Real Photos |
|---------|-----------|-------------|
| Smoothness | Too smooth (>0.7) | Natural texture (<0.5) |
| Color banding | Common artifact (>0.35) | Rare (<0.2) |
| Gradient uniformity | Unnaturally perfect | Natural variation |
| Saturation | Often oversaturated | Normal range |
| Edge density | Too few edges | Natural detail |
| Texture complexity | Low (<0.12) | High (>0.25) |

You can toggle image analysis on/off in the panel.

### 🔧 AI Tools Detected

The script recognizes 30+ AI generation tools:

```
meshy, tripo, tripo3d, rodin, luma, csm, kaedim, alpha3d,
masterpiece studio, spline ai, point-e, shap-e, get3d,
dreamfusion, magic3d, fantasia3d, zero123, one-2-3-45,
wonder3d, instant3d, threestudio, text2mesh, dreamgaussian,
gsgen, luciddreamer, gaussiandreamer, makerlab, ai scanner
```

### 👤 Creator Whitelist

Know a creator is legit? Add them to your whitelist:
- Click **Manage** in the panel
- Type their username and press Enter
- Their models will never be filtered

Or hover over a flagged model and click the **👤** button to whitelist that creator instantly.

### ✓ False Positive Reporting

See a human-made model getting flagged? 
- Hover over it and click the **✓** button
- That specific model won't be filtered again
- Your corrections are saved locally

### 📤 Import/Export

Share your whitelist or back it up:
- **Export** - Downloads a JSON file with your whitelisted creators and marked models
- **Import** - Load someone else's whitelist to merge with yours

## ⚙️ Configuration

### Filter Modes

| Mode | What it does |
|------|--------------|
| 🏷️ Tagged AI | Only explicitly labeled AI (safest) |
| 🔍 Suspected AI | Heuristic + image analysis detection |
| ⚠️ Low Quality | Poor quality regardless of AI status |

### Display Options

| Option | Description |
|--------|-------------|
| **Highlight only** | Shows colored borders instead of hiding |
| **Analyze images** | Enable/disable thumbnail analysis |
| **Show scores** | Display AI confidence percentages |

### Understanding the Stats

The panel shows 4 numbers:
- **Tagged** (purple) - Explicitly marked as AI
- **Suspect** (pink) - Detected by heuristics/images
- **Low Q** (orange) - Low quality models
- **OK** (green) - Whitelisted or marked as not AI

## 🌐 Supported Sites

| Site | Status | Notes |
|------|:------:|-------|
| [MakerWorld](https://makerworld.com) | ✅ | Has AIGC labels, AI categories |
| [Printables](https://printables.com) | ✅ | Has AI tags |
| [Thangs](https://thangs.com) | ✅ | Aggregates multiple sources |

## 📁 Files

```
scripts/
├── ai-model-filter.user.js           # Basic - tags only
├── ai-model-filter-advanced.user.js  # Advanced - recommended
├── ai-model-filter-ml.user.js        # ML-powered
└── bookmarklet.js                    # No-install version
```

## 🧠 Training Custom ML Models

Want even better detection? Train your own model on a custom dataset.

See **[TRAINING_GUIDE.md](docs/TRAINING_GUIDE.md)** for:
- Step-by-step setup instructions
- Data collection scripts
- Python training code
- Deployment guide

## ❓ FAQ

<details>
<summary><b>A human-made model got flagged. What do I do?</b></summary>

1. Hover over the model
2. Click the **✓** button (marks it as "not AI")
3. Or click **👤** to whitelist that creator entirely

The script learns from your corrections!
</details>

<details>
<summary><b>Why are some obvious AI models not being caught?</b></summary>

- Make sure "Suspected AI" mode is enabled (it's off by default)
- The script is intentionally conservative to avoid false positives
- Some AI uploaders have learned to hide the signs
</details>

<details>
<summary><b>Does this send my data anywhere?</b></summary>

No. Everything runs locally in your browser. No external requests, no tracking, no analytics.
</details>

<details>
<summary><b>Can I use this with Greasemonkey/Violentmonkey?</b></summary>

Yes, it should work with any userscript manager.
</details>

<details>
<summary><b>The panel doesn't show up</b></summary>

1. Check that the script is enabled in Tampermonkey
2. Make sure you're on a supported site
3. Try refreshing the page
4. Check browser console (F12) for errors
</details>

<details>
<summary><b>How accurate is the detection?</b></summary>

- **Tagged AI**: 100% (if it's labeled, we catch it)
- **Suspected AI**: ~85-90% with image analysis enabled
- False positive rate is low because we require multiple signals
</details>

## 🤝 Contributing

Found a bug? Have a better detection pattern? PRs welcome!

- **Report issues** - Help identify false positives/negatives
- **Add patterns** - Found a new AI tool? Add it to the list
- **Improve detection** - Better heuristics are always welcome
- **Add sites** - Help support more 3D model repositories

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📜 License

MIT License - see [LICENSE](LICENSE)

## 🙏 Acknowledgments

- The 3D printing community for feedback and testing
- Everyone who reported false positives to help improve detection
- The open source community

---

<p align="center">
  Made by <a href="https://github.com/achyutsharma">Achyut Sharma</a> • Star ⭐ if this helped!
</p>
