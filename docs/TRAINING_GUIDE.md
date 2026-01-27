# 🧠 Complete Guide: Training Your Own AI Detection Model

This guide walks you through training a custom machine learning model to detect AI-generated 3D model thumbnails. I've tried to make this as beginner-friendly as possible - no prior ML experience needed!

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Set Up Your Environment](#step-1-set-up-your-environment)
4. [Step 2: Collect Training Data](#step-2-collect-training-data)
5. [Step 3: Organize Your Dataset](#step-3-organize-your-dataset)
6. [Step 4: Train the Model](#step-4-train-the-model)
7. [Step 5: Convert to TensorFlow.js](#step-5-convert-to-tensorflowjs)
8. [Step 6: Host Your Model](#step-6-host-your-model)
9. [Step 7: Use Your Model](#step-7-use-your-model)
10. [Troubleshooting](#troubleshooting)
11. [Tips for Better Results](#tips-for-better-results)

---

## Overview

### What We're Building

We're training a neural network that looks at thumbnail images and predicts:
- **AI Probability**: How likely the model is AI-generated (0-100%)
- **Quality Score**: Overall quality of the listing (0-100%)

### How It Works

1. **Collect images**: Download thumbnails of AI and human-made models
2. **Label them**: Put them in separate folders
3. **Train**: The neural network learns the differences
4. **Export**: Convert to a format that runs in browsers
5. **Use**: Load your model in the userscript

### Time Required

| Step | Time |
|------|------|
| Setup | 30 minutes |
| Data collection | 2-4 hours |
| Training | 30-60 minutes |
| Deployment | 15 minutes |

---

## Prerequisites

### Required Software

1. **Python 3.8 or higher**
   - Download from [python.org](https://www.python.org/downloads/)
   - During installation, ✅ check "Add Python to PATH"

2. **A code editor** (optional but helpful)
   - [VS Code](https://code.visualstudio.com/) is what I use
   - Or just use Notepad/TextEdit

3. **A GitHub account** (for hosting the model)
   - Sign up at [github.com](https://github.com)

### Check Your Setup

Open a terminal (Command Prompt on Windows, Terminal on Mac):

```bash
python --version
```

You should see something like `Python 3.10.0`. If you get an error, Python isn't installed correctly.

---

## Step 1: Set Up Your Environment

### 1.1 Navigate to the Training Folder

After downloading/cloning this repo, open a terminal and navigate to the training folder:

```bash
cd  (where your file is located)/3d-model-filter/training
```

### 1.2 Create a Virtual Environment

This keeps the project's packages separate from your system Python. Trust me, this saves headaches later:

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

You should see `(venv)` at the start of your command prompt now.

### 1.3 Install Required Packages

Navigate to the training folder and install the dependencies:

```bash
cd training
pip install -r requirements.txt
```
If you have not added Python to your PATH, run:
```bash
cd training
py -m pip install -r requirements.txt

This takes a few minutes. Lots of text will scroll by - totally normal!

---

## Step 2: Collect Training Data

This is the most time-consuming part, but also the most important. The quality of your training data directly affects how well the model works.

### What You Need

| Category | Folder Name | What to Collect | Target |
|----------|-------------|-----------------|--------|
| AI Models | `ai_generated/` | Models labeled as AI, AIGC, Meshy, etc. | 500+ images |
| Human Models | `human_created/` | Models with real print photos, established creators | 500+ images |

### Method A: Manual Collection (Simple but Slow)

1. **Create your folders** (from inside the `training/` folder):
   ```bash
   mkdir -p dataset/ai_generated
   mkdir -p dataset/human_created
   ```

2. **Collect AI model thumbnails:**
   - Go to [MakerWorld AI Category](https://makerworld.com/en/3d-models/2000-generative-3d-model)
   - Right-click on thumbnails → "Save image as..."
   - Save to `dataset/ai_generated/`
   - Do this for 500+ images (yes, it takes a while)

3. **Collect human model thumbnails:**
   - Go to [Printables](https://printables.com) with AI filter OFF
   - Look for models with actual print photos (not just renders)
   - Focus on established creators with many models
   - Save thumbnails to `dataset/human_created/`

### Method B: Use the Collection Script (Faster)

I wrote a helper script that makes this way easier. It opens a browser and lets you save all thumbnails from a page with one command.

Run it from the `training/` folder:

```bash
python collect_data.py
```

**How to use it:**
1. A Chrome window opens at MakerWorld's AI category
2. Browse around, scroll to load more models
3. Come back to the terminal and type `a` + Enter to save those thumbnails as AI
4. Navigate to Printables or other pages with human-made models
5. Type `h` + Enter to save those as human-created
6. Type `s` to see your progress
7. Type `q` when you have enough (aim for 500+ each)

### What Makes Good Training Data

✅ **DO include:**
- Various model types (figures, functional parts, artistic pieces)
- Different lighting and backgrounds
- Multiple different creators
- Both renders AND real print photos for the human category

❌ **DON'T include:**
- Super blurry or tiny images
- Logos and icons
- The same model saved multiple times
- Models you're unsure about (if in doubt, leave it out)

---

## Step 3: Organize Your Dataset

Your folder structure should look like this:

```
3d-model-filter/
└── training/
    ├── dataset/
    │   ├── ai_generated/
    │   │   ├── ai_0001.jpg
    │   │   ├── ai_0002.jpg
    │   │   └── ... (500+ images)
    │   └── human_created/
    │       ├── human_0001.jpg
    │       ├── human_0002.jpg
    │       └── ... (500+ images)
    ├── requirements.txt
    ├── train_model.py
    └── collect_data.py
```

### Quick Check

Count your images to make sure you have enough (run from the `training/` folder):

```bash
# Windows:
dir /b dataset\ai_generated | find /c /v ""
dir /b dataset\human_created | find /c /v ""

# Mac/Linux:
ls dataset/ai_generated | wc -l
ls dataset/human_created | wc -l
```

You want at least 500 in each folder. More is better - I've gotten best results with 1000+.

---

## Step 4: Train the Model

### 4.1 The Training Script

The training script `train_model.py` is already in the `training/` folder - no need to download anything extra.

### 4.2 Run Training

Make sure you're in the `training/` folder with the virtual environment activated:

```bash
python train_model.py
```

You'll see output like this:

```
╔════════════════════════════════════════════════════════════╗
║     AI Model Thumbnail Classifier - Training Script        ║
╚════════════════════════════════════════════════════════════╝

✗ No GPU detected. Training will use CPU (slower).

============================================================
Setting Up Data Generators
============================================================

Loading images from: dataset
Image size: 224x224
Batch size: 32

Found 800 images belonging to 2 classes.
Found 200 images belonging to 2 classes.

Classes found:
  0: ai_generated
  1: human_created

Training samples: 800
Validation samples: 200
```

Then it starts training:

```
Epoch 1/20
25/25 [==============================] - 45s 2s/step - loss: 0.6821 - accuracy: 0.5750 - val_loss: 0.5234 - val_accuracy: 0.7350
Epoch 2/20
...
```

**How long does it take?**
- CPU only: 30-60 minutes
- With GPU: 5-15 minutes

Just let it run. Go grab a coffee or something.

### 4.3 Check the Results

When it's done, you'll have:

- `training_history.png` - Graph showing how accuracy improved over time
- `tfjs_model/` - Your model files (this is what we need!)
- `saved_model/` - Backup in TensorFlow format

Open `training_history.png` to see how training went:

- **Good results**: Validation accuracy > 80%, lines level off together
- **Overfitting**: Training accuracy way higher than validation (model memorized instead of learned)
- **Underfitting**: Both accuracies are low (need more/better data)

---

## Step 5: Convert to TensorFlow.js

Good news - the training script already does this! Your browser-ready model is in the `tfjs_model/` folder.

If you ever need to convert manually:

```bash
tensorflowjs_converter \
    --input_format=tf_saved_model \
    --output_format=tfjs_graph_model \
    saved_model \
    tfjs_model
```

The `tfjs_model/` folder should contain:
- `model.json` - The model architecture
- `group1-shard1of1.bin` (or multiple shards) - The trained weights

---

## Step 6: Host Your Model

The model needs to be accessible via URL so the browser script can load it. Here are free options:

### Option A: GitHub Pages (What I Use)

1. **Create a new GitHub repository**
   - Go to [github.com/new](https://github.com/new)
   - Name it something like `ai-detector-model`
   - Make it **Public**
   - Create it

2. **Upload your model files**
   - Click "uploading an existing file"
   - Drag in everything from your `tfjs_model/` folder
   - Commit

3. **Enable GitHub Pages**
   - Go to Settings → Pages
   - Source: "Deploy from a branch"
   - Branch: `main`, folder: `/ (root)`
   - Save

4. **Get your URL**
   - Wait a minute or two
   - Your model URL will be: `https://YOUR-USERNAME.github.io/ai-detector-model/model.json`

### Option B: Cloudflare Pages

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. Connect GitHub
3. Select your repo
4. Deploy
5. URL: `https://your-project.pages.dev/model.json`

### Option C: Any Static Host

Netlify, Vercel, your own server - anything works as long as it serves static files with proper CORS headers (GitHub Pages handles this automatically).

---

## Step 7: Use Your Model

### Update the Userscript

Open `ai-model-filter-ml.user.js` and find this line near the top:

```javascript
mlModelUrl: GM_getValue('mlModelUrl', ''),
```

Change it to your model URL:

```javascript
mlModelUrl: GM_getValue('mlModelUrl', 'https://YOUR-USERNAME.github.io/ai-detector-model/model.json'),
```

### Or Set It at Runtime

1. Open Tampermonkey dashboard
2. Find the ML Filter script
3. Go to Storage tab
4. Add: `mlModelUrl` = `https://YOUR-USERNAME.github.io/ai-detector-model/model.json`

### Test It

1. Go to MakerWorld or Printables
2. Open browser DevTools (F12)
3. Check Console for:
   ```
   [ML Detector] Loading custom model from: https://...
   [ML Detector] Custom model loaded successfully
   ```

---

## Troubleshooting

### "No module named 'tensorflow'"

Virtual environment probably isn't activated:
```bash
# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

Then `pip install tensorflow` again.

### "CUDA out of memory" (GPU users)

Your GPU doesn't have enough memory. Edit `train_model.py` and reduce batch size:
```python
"batch_size": 16,  # Was 32
```

### Model accuracy is low (<70%)

- Need more training data (1000+ per class is better)
- Check that images are correctly sorted into folders
- Look for duplicate images
- Try training for more epochs

### "Failed to fetch" in browser

- Double-check the model URL is correct (try opening it directly in browser)
- Make sure GitHub Pages is enabled and deployed
- Wait a few minutes after deploying

### Model loads but predictions are wrong

- Your training data might not match what you're filtering
- Try adjusting the confidence threshold
- Check `class_info.json` to verify classes match expectations

---

## Tips for Better Results

### Data Quality Matters Most

1. **Balance your dataset**: Equal numbers of AI and human images
2. **Diversity**: Include many model types, creators, and lighting conditions
3. **Clean labels**: Double-check your sorting
4. **No duplicates**: Same image multiple times hurts training

### Training Tips

1. **More data beats more training**: 1000 images trained once > 500 images trained twice
2. **Watch for overfitting**: If validation accuracy drops while training accuracy rises, stop
3. **Data augmentation helps**: The script already does this (rotation, flipping, etc.)

### Deployment Tips

1. **Test locally first** before uploading
2. **Keep backups** of your `saved_model/` folder
3. **Version your models**: `tfjs_model_v1`, `tfjs_model_v2`, etc.

---

## Need Help?

Open an issue on GitHub with:
- What you're trying to do
- Error messages (full text)
- Your Python version (`python --version`)
- Your TensorFlow version (`pip show tensorflow`)

I'll try to help when I can!

---

Happy training! 🎉

*- Achyut*
