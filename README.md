# 3D Print AI Filter

> Filter out AI-generated models from MakerWorld, Printables, and Thangs

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Compatible-green.svg)](https://www.tampermonkey.net/)
[![Version](https://img.shields.io/badge/Version-3.0.0-blue.svg)](https://github.com/achyutsharma/3d-print-ai-filter)

## The Problem

3D model sites are getting flooded with AI-generated content. Low-effort models made with Meshy, Tripo, and similar tools are drowning out quality human-made designs. These AI models often have:

- No print photos (just renders)
- Generic copy-paste descriptions
- Untested, unprintable geometry
- Stolen or AI-generated preview images

## The Solution

A browser userscript that detects and filters AI-generated 3D models so you can find the good stuff.

## Features

| Feature | Description |
|---------|-------------|
| **Explicit Detection** | Catches AIGC badges, AI category URLs, explicit tags |
| **Heuristic Detection** | Analyzes text for AI tool mentions, generation phrases |
| **Context Awareness** | Won't flag "no AI used" or "I hate AI slop" |
| **Image Analysis** | Detects AI render characteristics vs real photos |
| **Quality Filter** | Optional filter for low-effort posts |
| **Engagement Filter** | Optional min likes/downloads/makes thresholds |
| **Creator Whitelist** | Trust specific uploaders |
| **Creator Blacklist** | Block specific uploaders |
| **Mark as OK** | Correct false positives on individual models |
| **Import/Export** | Share your lists with others |

## Supported Sites

| Site | Status |
|------|--------|
| MakerWorld | Full support |
| Printables | Full support |
| Thangs | Partial support |

## Quick Start

### Step 1: Install Tampermonkey

| Browser | Link |
|---------|------|
| Chrome | [Install](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Firefox | [Install](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) |
| Edge | [Install](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) |
| Safari | [Install](https://apps.apple.com/us/app/userscripts/id1463298887) |

### Step 2: Install the Script

**[Click Here to Install](../../raw/main/scripts/3d-print-ai-filter.user.js)**

### Step 3: Browse

1. Go to MakerWorld, Printables, or Thangs
2. Panel appears in bottom-right corner
3. AI models get flagged with colored borders
4. Hover to see why each was flagged

## How Detection Works

### Explicit Detection (100% Accurate)

- AIGC badges/tags on the model
- MakerWorld AI category URLs (2000, 2006)
- Models explicitly marked as AI-generated

### Heuristic Detection

| Signal | Weight | Example |
|--------|--------|---------|
| AI tool mention (positive context) | High | "Made with Meshy" |
| AI tool mention (ambiguous) | Medium | "Meshy" in description |
| Generation phrases | High | "Generated this model" |
| Image-to-3D phrases | High | "Converted from photo" |
| Text-to-3D phrases | High | "Text to 3D" |
| Generic AI titles | Low | "Cute Dragon", "3D Model of Cat" |
| AI render characteristics | Medium | Smooth gradients, uniform backgrounds |

### Negative Signals (Reduce Score)

| Signal | Effect |
|--------|--------|
| "Designed by me/hand" | -25% |
| "Hand-made/crafted" | -25% |
| "Modeled in Blender/Fusion" | -30% |
| "X hours of work" | -25% |
| "No AI used" | -35% |

### AI Tools Database (50+)

Meshy, Tripo, Tripo3D, Rodin, Luma, CSM, Kaedim, Alpha3D, Masterpiece Studio, Spline AI, Point-E, Shap-E, GET3D, DreamFusion, Magic3D, Fantasia3D, Zero123, One-2-3-45, Wonder3D, Instant3D, ThreeStudio, Text2Mesh, DreamGaussian, GSGen, LucidDreamer, 3DFy, Anything World, Leonardo AI, Sloyd, and more...

### Image Analysis

The script analyzes thumbnail images for AI render characteristics:

| Metric | AI Renders | Real Photos |
|--------|------------|-------------|
| Smoothness | Very high | Lower (texture) |
| Color banding | Present | Absent |
| Edge density | Low | Higher |
| Background | Uniform/gradient | Varied |
| Noise | None | Sensor noise |

## Settings

### Filter Toggles

| Setting | Default | Description |
|---------|---------|-------------|
| Tagged AI | ON | Filter explicitly tagged AI models |
| Suspected AI | OFF | Filter heuristically detected AI |
| Low Quality | OFF | Filter low-effort posts |
| Engagement | OFF | Filter by likes/downloads/makes |

### Options

| Setting | Default | Description |
|---------|---------|-------------|
| Highlight Only | ON | Show borders instead of hiding |
| Show Reasons | ON | Show why each model was flagged |
| Analyze Images | ON | Enable image analysis |
| Threshold | 65 | Confidence needed to flag (0-100) |

### Engagement Minimums

When engagement filter is enabled:

| Setting | Default | Description |
|---------|---------|-------------|
| Min Likes | 0 | Hide models below this |
| Min Downloads | 0 | Hide models below this |
| Min Makes | 0 | Hide models below this |

## Panel Stats

| Stat | Meaning |
|------|---------|
| TAG | Explicitly tagged AI |
| SUS | Suspected AI (heuristics) |
| LOW | Low quality |
| ENG | Fails engagement filter |
| OK | Clean/whitelisted |

## Card Actions

When you hover over a flagged card:

| Button | Action |
|--------|--------|
| ok | Mark this specific model as not AI |
| + | Whitelist this creator |
| x | Blacklist this creator |

## Managing Lists

Click "manage" to open the list manager:

- **Trusted**: Creators whose models are never flagged
- **Blocked**: Creators whose models are always hidden

Add creators manually or use the card buttons.

### Import/Export

- **Export**: Download your lists as JSON
- **Import**: Load lists from a JSON file

Share your blacklists with the community!

## FAQ

**Q: A real model got flagged. What do I do?**

Hover over it, click "ok" to mark that model as not AI. Or click "+" to whitelist the creator.

**Q: Some AI models aren't being caught.**

Turn on "Suspected AI" filter and/or lower the threshold. The default is conservative.

**Q: Does this send my data anywhere?**

No. Everything runs 100% locally in your browser.

**Q: Why highlight instead of hide?**

So you can see what's being caught and correct mistakes. You can switch to hide mode in settings.

**Q: Why is Thangs only partial support?**

Their HTML structure is inconsistent. Detection works but may miss some cards.

## Changelog

### v3.0.0

- Context-aware text analysis
- Image analysis for AI render detection
- Quality scoring system
- Engagement filters
- Creator whitelist/blacklist
- Mark individual models as OK
- Import/export functionality
- "Why flagged" tooltips

### v2.0.0

- Heuristic detection
- 50+ AI tools database
- Configurable threshold

### v1.0.0

- Basic AIGC tag detection
- MakerWorld support

## Contributing

Found a bug? Know an AI tool that should be added? Open an issue.

## HackClub!
I’m 13 years old and I just joined this thing called Hack Club Flavortown, and it’s honestly really cool so I wanted to share.

Flavortown is a Hack Club event where teens (13–18) work on CAD, hardware, and personal projects, and you earn shards for building stuff. You can then spend those shards in the Hack Club shop on real hardware 👀 like Raspberry Pi 5s, parts, tools, etc.

I’m currently working on robotics projects (I built a robot that detects falls for seniors), and I REALLY want to get a Raspberry Pi 5 so I can keep building and improving my projects. The only way I can do that is by earning shards through Flavortown.

If you sign up using my referral link, it helps me get closer to that goal 🙏
👉 https://flavortown.hack.club/?ref=BZJXIBQ9

What I like about the event:

It’s actually made for teens, not adults

You work on real projects, not boring tutorials

You get rewarded for building, not just watching videos

Hack Club is a real nonprofit (not a scam lol)

If you’re into:

CAD

Robotics

Coding

Hardware

Or just making cool stuff

You should totally check it out. Even if you don’t use my link, still join — but using it would seriously help me out 🫶

Thanks for reading, and happy hacking 🚀
