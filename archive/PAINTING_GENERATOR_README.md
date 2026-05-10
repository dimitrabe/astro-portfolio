# Painting Post Generator Script

## Installation

1. Copy `generate-painting-posts.js` to the root of your Astro project

2. Add the script to your `package.json`:

```json
{
  "scripts": {
    "generate:paintings": "node generate-painting-posts.js"
  }
}
```

## Usage

### Step 1: Name your image files with the delimiter

Place your painting images in `src/assets/paintings/` with this naming format:

```
title__description.extension
```

**Examples:**
- `sunset-beach__acrylic-cartoline-24x30-v2.png`
- `mountain-view__oil-canvas-50x70.jpg`
- `abstract-waves__watercolor-paper-30x40.webp`

### Step 2: Run the script

```bash
npm run generate:paintings
```

### Step 3: Review the output

The script will:
- ✅ Create a `.md` file for each new image in `src/content/blog/`
- ⏭️ Skip images that already have posts
- ⚠️ Warn about incorrectly formatted filenames
- 📊 Show a summary of created/skipped/errors

## Generated Post Example

**Filename:** `sunset-beach__acrylic-cartoline-24x30-v2.png`

**Generated post:** `src/content/blog/sunset-beach__acrylic-cartoline-24x30-v2.md`

```markdown
---
title: 'Sunset Beach'
description: 'Acrylic, Cartoline, 24x30cm, Version 2'
pubDate: '2026-03-08'
heroImage: '../../assets/paintings/sunset-beach__acrylic-cartoline-24x30-v2.png'
category: 'painting'
---

Acrylic, Cartoline, 24x30cm, Version 2
```

## File Naming Rules

1. **Use double underscore (`__`)** to separate title from description
2. **Use hyphens (`-`)** to separate words within title or description
3. **Title part:** Will be capitalized (e.g., `sunset-beach` → "Sunset Beach")
4. **Description part:** Will be formatted with commas and special handling for:
   - Dimensions: `24x30` → "24x30cm"
   - Versions: `v2` → "Version 2"
   - Regular words: `acrylic` → "Acrylic"

## Troubleshooting

### "⚠️ Skipping - must have format: title__description.ext"
- Your filename is missing the `__` delimiter
- Example of correct format: `my-painting__oil-canvas.jpg`

### "⏭️ Skipped - post already exists"
- A post with this slug already exists in `src/content/blog/`
- Delete the existing `.md` file if you want to regenerate it

### "❌ Error: Paintings directory not found"
- Create the directory: `mkdir -p src/assets/paintings`

## Customization

You can modify the script to:
- Change the delimiter (currently `__`)
- Adjust formatting rules
- Add more frontmatter fields
- Change the category name
- Use different date formats

Edit `generate-painting-posts.js` to customize the behavior.
