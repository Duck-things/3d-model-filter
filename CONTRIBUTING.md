# Contributing to 3D Model AI Filter

Hey, thanks for considering contributing! This project started as a personal tool to clean up my 3D model browsing experience, and contributions from the community help make it better for everyone.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Improving Detection](#improving-detection)
- [Submitting Changes](#submitting-changes)
- [Style Guide](#style-guide)

## Code of Conduct

This project follows a simple code of conduct: be respectful, be helpful, and focus on making the project better for everyone.

## How Can I Contribute?

### 🐛 Reporting Bugs

Found a bug? Please open an issue with:

1. **Title**: Brief description of the problem
2. **Description**: What happened vs. what you expected
3. **Steps to Reproduce**: How can we see this bug?
4. **Environment**: Browser, userscript manager version, which script version
5. **Screenshots**: If applicable

Example:
```
Title: Models not being filtered on MakerWorld search results

Description: When searching on MakerWorld, AI models with AIGC badges 
are not being hidden even though "Tagged AI" filter is enabled.

Steps:
1. Go to makerworld.com
2. Search for "dragon"
3. Notice AI models with AIGC badges are still visible

Environment: Chrome 120, Tampermonkey 5.0, ML version 3.0.0
```

### 💡 Suggesting Features

Have an idea? Open an issue with:

1. **Title**: Brief description of the feature
2. **Problem**: What problem does this solve?
3. **Solution**: How should it work?
4. **Alternatives**: Any other approaches considered?

### 🎯 Improving Detection

This is where we need the most help! You can:

#### Add Detection Patterns

Found a pattern that identifies AI models? Add it to the script:

```javascript
// In EXPLICIT_AI_TAGS array
'new-ai-tool-name',

// In AI_TEXT_PATTERNS array
/\bnew-pattern\b/i,
```

#### Report False Positives/Negatives

If the filter is:
- **Hiding good models** (false positive): Tell us the model URL
- **Missing AI models** (false negative): Tell us the model URL and why you think it's AI

#### Share Training Data

If you've collected training data for the ML model:
- Ensure images are properly categorized
- Remove any duplicate or low-quality images
- Consider sharing on a platform like Kaggle or HuggingFace

#### Share Trained Models

If you've trained a model with good accuracy (>85%):
- Host it on GitHub Pages or similar
- Open a PR to add it to the README as a community model
- Include your training data statistics

### 🌐 Adding New Sites

Want to add support for another 3D model site? Here's how:

1. **Research the site**:
   - How do they mark AI content?
   - What CSS classes/attributes do model cards have?
   - Do they have AI categories or tags?

2. **Add to the @match rules**:
   ```javascript
   // @match        https://newsite.com/*
   ```

3. **Create a processor function**:
   ```javascript
   function processNewSite() {
       const modelCards = document.querySelectorAll('.their-card-class');
       modelCards.forEach(card => {
           // Detection logic
       });
   }
   ```

4. **Add to the main filtering function**:
   ```javascript
   if (hostname.includes('newsite')) {
       processNewSite();
   }
   ```

5. **Test thoroughly** and submit a PR

## Submitting Changes

### Pull Request Process

1. **Fork the repository**
2. **Create a branch**: `git checkout -b feature/my-improvement`
3. **Make your changes**
4. **Test your changes** on all three supported sites
5. **Commit**: `git commit -m "Add: brief description of change"`
6. **Push**: `git push origin feature/my-improvement`
7. **Open a Pull Request**

### Commit Message Format

Use clear, descriptive commit messages:

```
Add: new detection pattern for Meshy AI models
Fix: MakerWorld cards not being detected on search pages  
Update: improve image analysis threshold defaults
Docs: clarify training data requirements
```

Prefixes:
- `Add:` New feature or pattern
- `Fix:` Bug fix
- `Update:` Improvement to existing functionality
- `Docs:` Documentation only
- `Refactor:` Code restructure without behavior change

## Style Guide

### JavaScript

- Use `const` and `let`, not `var`
- Use arrow functions where appropriate
- Use template literals for string interpolation
- Add comments for complex logic
- Use meaningful variable names

```javascript
// Good
const isAIGenerated = checkExplicitTags(card);
const modelCards = document.querySelectorAll('.model-card');

// Avoid
var x = check(c);
var a = document.querySelectorAll('div');
```

### CSS (in scripts)

- Use specific class names prefixed with `ai-filter-` or `mlf-`
- Avoid `!important` unless necessary for overriding site styles
- Use CSS variables for colors when possible

```css
/* Good */
.ai-filter-badge { ... }
.mlf-highlight { ... }

/* Avoid */
.badge { ... }  /* Too generic, may conflict */
```

### Python (training scripts)

- Follow PEP 8 style guide
- Use type hints where helpful
- Add docstrings to functions
- Keep functions focused and small

```python
def download_images(urls: list[str], folder: str) -> tuple[int, int]:
    """
    Download images from URLs to a folder.
    
    Args:
        urls: List of image URLs to download
        folder: Destination folder path
        
    Returns:
        Tuple of (downloaded_count, failed_count)
    """
    ...
```

## Testing

Before submitting a PR:

1. **Test on all three sites**:
   - MakerWorld
   - Printables
   - Thangs

2. **Test different scenarios**:
   - Search results page
   - Category/browse page
   - Individual model page
   - Infinite scroll loading

3. **Test filter modes**:
   - Hide mode
   - Highlight mode
   - Each filter type independently

4. **Check for console errors**:
   - Open browser DevTools (F12)
   - Look for any JavaScript errors

## Questions?

Feel free to:
- Open an issue with the "question" label
- Start a discussion in the Discussions tab

Thank you for contributing! 🎉
