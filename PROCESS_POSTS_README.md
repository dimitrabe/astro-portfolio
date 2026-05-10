# process-posts.js

A script that processes images from the `to-be-uploaded` folder and generates blog post markdown files. It watermarks, resizes, and converts images to WebP in a single pass, then creates the corresponding post in `src/content/blog/`.

---

## What it does

1. Reads images from `src/assets/to-be-uploaded/`
2. Resizes each image to 500px height (preserving aspect ratio)
3. Converts to WebP format
4. Adds a `© Dimitra Be` watermark in the bottom-right corner
5. Saves the processed image to `src/assets/<category>/`
6. Creates a markdown post in `src/content/blog/`
7. **Does not delete the originals** — verify the watermarks look correct first, then delete manually

---

## Usage

```bash
npm run process -- <category>
```

Or directly:

```bash
node process-posts.js <category>
```

### Valid categories

| Category | Output folder |
|---|---|
| `paintings` | `src/assets/paintings/` |
| `graphic-design` | `src/assets/graphic-design/` |
| `photography` | `src/assets/photography/` |
| `animation` | `src/assets/animation/` |

### Examples

```bash
npm run process -- paintings
npm run process -- graphic-design
```

---

## Image filename format

Images must follow this naming convention for the script to parse the title and description:

```
title-words__description-parts.ext
```

- Use a **double underscore** `__` to separate the title from the description
- Use **hyphens** `-` as word separators within each part
- Supported extensions: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`

### Special description tokens

| Pattern | Output |
|---|---|
| `24x30` | `24x30cm` |
| `v2` | `Version 2` |

### Examples

| Filename | Title | Description |
|---|---|---|
| `sunset-beach__acrylic-30x40.jpg` | Sunset Beach | Acrylic, 30x40cm |
| `forest-path__oil-canvas-v2.jpg` | Forest Path | Oil, Canvas, Version 2 |
| `city-lights__digital-illustration.png` | City Lights | Digital, Illustration |

---

## Output

### Processed image

Saved to `src/assets/<category>/<original-name>.webp`.

### Blog post

Saved to `src/content/blog/<title-part>-<description-part>.md` with the following frontmatter:

```yaml
---
title: 'Sunset Beach'
description: 'Acrylic, 30x40cm'
pubDate: '2026-05-10'
heroImage: '../../assets/paintings/sunset-beach__acrylic-30x40.webp'
category: 'paintings'
---
```

---

## Workflow

```
src/assets/to-be-uploaded/
        │
        │  node process-posts.js paintings
        ▼
src/assets/paintings/          ← processed WebP with watermark
src/content/blog/              ← generated markdown post
src/assets/to-be-uploaded/     ← originals untouched (delete manually after verification)
```

1. Drop images into `src/assets/to-be-uploaded/`
2. Run the script with the target category
3. Check the processed images in `src/assets/<category>/` — verify the watermarks look correct
4. Delete the originals from `to-be-uploaded/` manually
5. Run `npm run dev` to preview the new posts

---

## Troubleshooting

### "⚠️ Skipping - must have format: title__description.ext"
The filename is missing the `__` delimiter or has more than one `__`.
Correct format: `my-painting__oil-canvas.jpg`

### "⏭️ Skipped - post already exists"
A post with this slug already exists in `src/content/blog/`.
Delete the existing `.md` file if you want to regenerate it.

### "❌ Output directory not found"
The category folder doesn't exist yet. Create it:
```bash
mkdir src/assets/<category>
```
