# reddit posts

## main post - r/3Dprinting

title: got mass downvoted for complaining about AI models so i built a filter instead

---

few weeks ago i made a comment about how makerworld is getting flooded with AI generated slop. got downvoted and told to just scroll past it.

so i built a filter.

its a tampermonkey script that detects AI generated models and either hides them or highlights them. works on makerworld, printables, and thangs.

what it catches:
- explicit AIGC tags/badges
- mentions of meshy, tripo, rodin, etc (60+ AI tools)
- "generated model", "converted from photo", stuff like that
- generic titles like "Cute Dragon" or "3D Model of Cat"
- image analysis that detects AI render characteristics
- duplicate descriptions (same text copy pasted)
- creator behavior (lots of uploads, low engagement)

also has context awareness so it wont flag someone saying "no AI was used" or "i hate AI slop"

you can whitelist creators you trust and blacklist ones you dont. if something gets wrongly flagged theres a button to mark it ok. hover over any flagged model to see WHY it was flagged.

github: [link]

been using it for a couple weeks. makerworld went from like 60% garbage to actually usable.

not perfect - some stuff slips through, some real stuff gets caught. but you can correct it and it learns.

let me know if you find bugs

---

## r/BambuLab

title: made a browser script to filter AI models from makerworld

---

if youre tired of scrolling through endless meshy/tripo garbage on makerworld i made a thing

its a tampermonkey script that detects AI generated models. catches the obvious stuff (AIGC badges) plus heuristics (mentions of AI tools, generic titles, image analysis for AI render characteristics).

v3 just dropped with:
- "why flagged" tooltips
- engagement filters
- creator behavior analysis
- duplicate description detection

you can whitelist/blacklist creators and mark false positives.

works on printables and thangs too.

link: [github]

---

## r/prusa3d

title: filter for AI models on printables

---

made a browser extension that filters AI generated models. works on printables, makerworld, thangs.

detects AIGC tags, AI tool mentions (meshy tripo etc), generic AI-style titles, plus does image analysis to spot AI renders.

new in v3:
- shows WHY each model was flagged
- engagement filters (min likes/downloads)
- creator behavior scoring
- duplicate description detection

free, open source, doesnt send any data anywhere.

github link: [link]

lmk if theres issues

---

## r/functionalprint

title: browser script to hide AI generated models

---

short version: i got annoyed at AI spam on model sites so i made a filter

its a tampermonkey userscript. detects AI models using tags, tool mentions, title patterns, image analysis. highlights or hides them.

works on makerworld, printables, thangs

link: [github]

---

## tips

- post to r/3Dprinting first since its biggest
- reply to comments especially first hour
- dont post to all subs at once, spread it out
- take a screenshot before posting showing the filter in action
- be honest that its not perfect
