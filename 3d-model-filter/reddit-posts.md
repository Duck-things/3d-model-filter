# Reddit Posts for Launching

Copy paste these to the relevant subs. Put the GitHub link in a comment right after posting (automod removes links in posts).

---

## r/3Dprinting

**Title:** got mass downvoted for complaining about AI models so i built a filter instead

tired of scrolling through endless AI slop on makerworld? same.

i complained about it a few weeks ago and got downvoted into oblivion by people saying "just scroll past it" or "AI models are fine actually"

so instead of arguing i just built a browser extension that filters them out.

it catches:
- explicitly tagged AIGC models (the easy ones)
- suspected AI based on description text ("generated with meshy" etc)
- optionally: low quality models regardless of AI (no print photos, no settings, generic descriptions)
- optionally: models below X likes/downloads

you can also whitelist creators you trust and blacklist spammers.

works on makerworld, printables, and thangs (thangs is janky tho)

github link in comments

free, open source, no tracking, runs locally.

theres 3 versions:
- basic (just catches tagged AI)
- advanced (heuristics + image analysis)
- ML (train your own detection model)

---

## r/BambuLab

**Title:** made a filter for AI models on MakerWorld

if youre tired of the AI model flood on makerworld, i made a tampermonkey script that filters them out.

catches both the tagged AIGC ones and tries to detect the untagged ones based on description text and image analysis.

also has options to filter low quality posts (no print photos, minimal description) and engagement minimums.

three versions available depending on how aggressive you want the filtering.

link in comments

---

## r/prusa3d

**Title:** browser script to filter AI models from Printables

printables has been getting more AI generated models lately. made a script that filters them.

works on printables, makerworld, and thangs.

detects explicit AI tags plus heuristics for the sneaky ones. can also filter low quality posts regardless of AI.

link in comments

---

## r/functionalprint

**Title:** filter for AI slop on model sites

functional prints getting buried under AI generated dragons and figurines? made a script for that.

filters AI models from makerworld/printables/thangs. also has a quality filter so you can hide low effort posts even if theyre not AI.

link in comments

---

## Posting Tips

1. dont put the github link in the main post, automod removes it. put it in a comment right after posting.

2. if someone asks "how does it detect untagged AI" explain:
   - looks for AI tool mentions (meshy, tripo, etc) in context
   - checks for phrases like "generated this model"
   - image analysis for render characteristics
   - emphasize users can tune the threshold

3. if someone complains about false positives, explain the whitelist/mark-as-ok features

4. dont argue about whether AI models are good or bad. just say "some people want to filter them, this helps"

5. mention its open source and runs locally (no data collection)

6. if anyone asks about the ML version, explain theres a training guide included
