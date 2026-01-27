# 🛡️ 3D Model AI & Quality Filter

> Filter out AI-generated and low-quality 3D models from MakerWorld, Printables, and Thangs

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Compatible-green.svg)](https://www.tampermonkey.net/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

![Demo Screenshot](<img width="188" height="394" alt="image" src="https://github.com/user-attachments/assets/ac2058d8-7ba7-4beb-bad0-7f61cf290bee" />)

## 🎯 Why I Built This

If you've browsed MakerWorld, Printables, or Thangs lately, you've probably noticed the flood of AI-generated models. I got tired of scrolling through endless low-quality "slop" when I just wanted to find good, printable designs made by actual humans.

The built-in filters on these sites don't work well (or don't exist), so I built this browser extension to solve the problem myself. It's been a game-changer for my browsing experience, and I hope it helps you too.

## ✨ Features

| Feature | Basic | Advanced | ML-Powered |
|---------|:-----:|:--------:|:----------:|
| Filter tagged AI models | ✅ | ✅ | ✅ |
| Detect unlabeled AI models | ❌ | ✅ | ✅ |
| Filter low-quality models | ❌ | ✅ | ✅ |
| Image analysis | ❌ | ✅ | ✅ |
| Machine learning detection | ❌ | ❌ | ✅ |
| Custom model support | ❌ | ❌ | ✅ |
| Hide or highlight modes | ✅ | ✅ | ✅ |
| Show confidence scores | ❌ | ✅ | ✅ |

## 🚀 Quick Start

### Step 1: Install Tampermonkey

Install the Tampermonkey extension for your browser:

| Browser | Link |
|---------|------|
| Chrome | [Install](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Firefox | [Install](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) |
| Edge | [Install](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) |
| Safari | [Install](https://apps.apple.com/us/app/userscripts/id1463298887) |

### Step 2: Install the Script

**Option A: One-Click Install (Recommended)**

Click one of these links to install directly:

- [📦 Basic Version](../../raw/main/scripts/ai-model-filter.user.js) - Tag detection only
- [📦 Advanced Version](../../raw/main/scripts/ai-model-filter-advanced.user.js) - Heuristics + image analysis
- [📦 ML Version](../../raw/main/scripts/ai-model-filter-ml.user.js) - TensorFlow.js powered

**Option B: Manual Install**

1. Click the Tampermonkey icon → "Create a new script"
2. Delete the template code
3. Copy and paste the contents of your chosen script from the `scripts/` folder
4. Press `Ctrl+S` (or `Cmd+S` on Mac) to save

### Step 3: Use It!

1. Go to [MakerWorld](https://makerworld.com), [Printables](https://printables.com), or [Thangs](https://thangs.com)
2. You'll see a control panel in the bottom-right corner
3. Toggle filters on/off as needed

## 📖 How It Works

### 🏷️ Tagged AI Detection
Finds models explicitly marked as AI-generated:
- AIGC badges and labels
- AI-related tags (`ai`, `meshy`, `tripo`, `makerlab`, etc.)
- AI category URLs (MakerWorld categories 2000, 2006)
- Text patterns ("generated with AI", "text-to-3d", etc.)

### 🔍 Suspected AI Detection (Advanced/ML)
Finds unlabeled AI models using:

**Heuristic Analysis:**
- Description patterns ("converted from image", "auto-generated")
- Generic AI-style titles
- Missing print photos
- Render-only thumbnails

**Image Analysis:**
- Smoothness detection (AI renders are too smooth)
- Color banding (common artifact in AI images)
- Gradient uniformity
- Texture complexity
- Edge density

### ⚠️ Low Quality Detection (Advanced/ML)
Filters poor quality regardless of AI status:
- No actual print photos
- Missing descriptions
- Low engagement metrics
- Render-only images
- Batch upload patterns

## ⚙️ Configuration

### Filter Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| 🏷️ Tagged AI | Only explicitly labeled AI | Conservative filtering |
| 🔍 Suspected AI | Heuristic + ML detection | Catch unlabeled AI |
| ⚠️ Low Quality | Quality-based filtering | Filter all "slop" |

### Display Modes

| Mode | Description |
|------|-------------|
| **Hide** | Completely removes filtered models from view |
| **Highlight** | Shows models with colored borders (purple=tagged, pink=suspected, orange=low quality) |

### Threshold Adjustment (Advanced/ML)

Adjust the AI confidence threshold:
- **Lower (50-60%)**: More aggressive, may have false positives
- **Higher (70-80%)**: Conservative, may miss some AI models

## 🧠 Training Your Own Model

Want better detection? Train a custom model on your own dataset!

See the **[Complete Training Guide](docs/TRAINING_GUIDE.md)** for:
- Step-by-step instructions
- Data collection tips
- Python training scripts
- Model deployment

## 🌐 Supported Sites

| Site | Tagged AI | Suspected AI | Notes |
|------|:---------:|:------------:|-------|
| [MakerWorld](https://makerworld.com) | ✅ | ✅ | Has AIGC labels, AI categories |
| [Printables](https://printables.com) | ✅ | ✅ | Has AI tags, built-in filter |
| [Thangs](https://thangs.com) | ✅ | ✅ | Aggregates from multiple sources |

## 📁 Repository Structure

```
3d-model-filter/
├── README.md                 # This file
├── LICENSE                   # MIT License
├── scripts/
│   ├── ai-model-filter.user.js           # Basic version
│   ├── ai-model-filter-advanced.user.js  # Advanced version
│   ├── ai-model-filter-ml.user.js        # ML version
│   └── bookmarklet.js                    # Bookmarklet version
├── training/
│   ├── train_model.py        # Training script
│   ├── collect_data.py       # Data collection helper
│   └── requirements.txt      # Python dependencies
├── docs/
│   └── TRAINING_GUIDE.md     # Detailed training guide
└── images/
    └── demo-screenshot.png   # Screenshots for README
```

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Report Issues**: Found a bug or false positive? [Open an issue](../../issues)
2. **Improve Detection**: Submit PRs with better patterns or heuristics
3. **Train Models**: Share trained models with the community
4. **Add Sites**: Help add support for more 3D model repositories

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## ❓ FAQ

<details>
<summary><b>Why are some AI models not being filtered?</b></summary>

The model may not be tagged as AI-generated. Try enabling "Suspected AI" mode in the Advanced or ML versions for heuristic detection.
</details>

<details>
<summary><b>Why are some human-made models being filtered?</b></summary>

This can happen if:
- The model mentions "AI" in an unrelated context
- The thumbnail looks render-like

Try lowering the AI threshold or switching to "Highlight" mode to review what's being caught.
</details>

<details>
<summary><b>Does this collect any data?</b></summary>

No. The script runs entirely in your browser and makes no external requests. Settings are stored locally using Tampermonkey's storage.
</details>

<details>
<summary><b>Can I use this with other userscript managers?</b></summary>

Yes! It should work with Greasemonkey, Violentmonkey, and other compatible managers.
</details>

<details>
<summary><b>The panel doesn't appear</b></summary>

1. Make sure the script is enabled in Tampermonkey
2. Check that you're on a supported site
3. Try refreshing the page
4. Check browser console for errors
</details>

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- The 3D printing community on Reddit and various forums for feedback and suggestions
- Everyone who reported bugs and helped test early versions
- The open source community for inspiration

---

<p align="center">
  Made by <a href="https://github.com/achyutsharma">Achyut Sharma</a> • Star ⭐ if this helped you!
</p>
