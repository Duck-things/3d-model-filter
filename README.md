# 3D Print AI Filter

Filter out AI generated models from MakerWorld, Printables, and Thangs.

by Achyut Sharma

---

## why i made this

if youve been on makerworld lately you know what im talking about. endless AI generated garbage flooding the search results. low effort slop with stolen render images, zero print photos, copy pasted descriptions.

i complained about it in a thread and got told "just scroll past it". cool thanks.

so i made this instead.

## what it does

its a tampermonkey script that detects AI generated 3d models and filters them out. works on:

- makerworld
- printables  
- thangs

### detection methods

explicit stuff (100% accurate):
- AIGC badges/tags
- makerworld AI category urls
- models explicitly tagged as AI

heuristic detection (pretty good but not perfect):
- mentions of meshy, tripo, rodin, luma, and like 40 other AI tools
- "generated", "converted from photo", "text to 3d" etc
- generic AI-style titles like "Cute Dragon" or "3D Model of Cat"
- image analysis (detects smooth AI renders vs real photos)

also checks context so it wont flag someone who says "i didnt use AI" or "no AI was used here".

### other features

- creator whitelist - trust certain uploaders
- creator blacklist - block certain uploaders  
- mark individual models as "ok" if they get wrongly flagged
- quality filter (optional) - hides models with no print photos, short descriptions
- engagement filter (optional) - hide models below certain like/download counts
- import/export your lists

## install

1. get tampermonkey for your browser
   - chrome: https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo
   - firefox: https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/
   - edge: search for it

2. click the script file and hit install

3. go to makerworld or printables, youll see a panel in the bottom right

## usage

the panel shows counts of what its found:
- tag = explicitly tagged AI
- sus = suspected AI (heuristics)
- low = low quality
- eng = fails engagement filter
- ok = whitelisted/marked ok

toggles:
- "tagged AI" - filter explicit AI (recommended to keep on)
- "suspected AI" - filter heuristic detections (off by default, turn on if you want)
- "low quality" - filter based on quality score
- "engagement" - filter by likes/downloads/makes

by default it highlights instead of hiding. you can change this in options.

hover over a flagged model to see why it was flagged.

buttons on each card:
- ok = mark this model as not AI
- + = whitelist this creator
- x = blacklist this creator

## settings

threshold - how confident it needs to be to flag something (default 65%). lower = more aggressive, higher = more conservative.

highlight only - shows colored borders instead of hiding. recommended so you can see whats being caught.

show reasons - shows why each model was flagged when you hover

analyze images - does image analysis to detect AI renders. uses a bit more cpu but catches more stuff.

## the lists

manage button opens the list manager.

whitelist = creators you trust. their stuff never gets flagged.

blacklist = creators you dont want to see. their stuff always gets hidden.

you can export your lists to share with others or backup. import to load someone elses list.

## false positives

if a real model gets flagged:
1. hover to see why
2. click "ok" to mark that specific model as not AI
3. or click "+" to whitelist the creator

it learns from your corrections.

## not perfect

this isnt 100% accurate. some AI stuff will slip through. some real stuff might get flagged. thats why theres the correction buttons.

the image analysis especially is just pattern matching - it looks for things AI renders tend to have (too smooth, weird gradients, uniform backgrounds) but real renders can have those too.

## known issues

- thangs has weird html, detection is less reliable there
- some sites lazy load and you might need to scroll for it to catch everything
- image analysis fails on some cors blocked images

## todo

- thingiverse support maybe
- better thangs detection
- more AI tools as they come out

## license

MIT

---

made by achyut sharma

if this helped clean up your feed feel free to star the repo
