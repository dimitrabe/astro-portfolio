# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # dev server at localhost:4321
npm run build             # production build to ./dist/
npm run preview           # preview the production build
npm run astro check       # type-check .astro files (no separate lint/test suite exists)
npm run process -- <category>   # process new artwork images into a post (see below)
```

There is no test suite and no linter configured — `astro check` is the only correctness gate.

## Architecture

This is an Astro content-collection portfolio site (paintings / graphic design / animation), not a typical blog — routing, layout selection, and the image pipeline are all driven off a single `category` field.

### Content model

- One collection, `blog`, defined in `src/content.config.ts`, loading all `.md`/`.mdx` files in `src/content/blog/`.
- Schema: `title`, `description`, `pubDate` (coerced to `Date`), `updatedDate?`, `heroImage?` (via Astro's `image()` helper — resolves to an `ImageMetadata` object with `.src/.width/.height`), `heroVideo?` (URL, used instead of an image for the animation category), `category` (free-text string — the value is what drives routing, not an enum).
- Categories currently in use: `paintings`, `graphic-design`, `animation`. Web design is deliberately not a category here — those projects live on the separate `bedesignlab.com` site, so the homepage's web-design tile is a plain external link, not a collection-backed route.

### Routing

- `src/pages/[category]/index.astro` — grid page per category. Builds its own static paths by deriving unique categories from `getCollection('blog')`, filters+sorts posts by `pubDate` descending (this filter+sort snippet is the canonical "latest post in category" pattern, reused elsewhere rather than reinvented).
- `src/pages/[category]/[...slug].astro` — individual post page, always rendered through `src/layouts/BlogPost.astro` regardless of category.
- **Layout gotcha**: the category grid page maps every category to `PaintingLayout.astro` (`src/pages/[category]/index.astro`'s `layoutMap`). `GraphicDesignLayout.astro` exists in `src/layouts/` but is currently unused/dead — don't assume adding a `graphic-design`-specific layout requires editing that file; it isn't wired up anywhere.
- Images are consumed as plain `<img src={heroImage.src} width={heroImage.width} height={heroImage.height}>`, not Astro's `<Image />`/`getImage()` — follow that pattern for consistency rather than switching APIs.

### Homepage (`src/pages/index.astro`)

A single CSS grid (`repeat(12, 1fr)` columns/rows) positions five hand-placed tiles (girl-with-cat, graphic design, web design, painting, eye-follower) by `grid-column`/`grid-row`. Each tile's wrapper needs `width: 100%; height: 100%` (or an intrinsic `aspect-ratio`) to fill its cell — a component with a fixed pixel size instead of filling its cell will force that grid track to grow and visibly squeeze the other tiles. Breakpoints at 1024px (repositions tiles) and 768px (collapses to a flex column, hides several tiles, shows `.mobile-categories` instead).

### Notable component techniques

- `src/components/PaintingComp.astro` — loads the latest `paintings`-category post's `heroImage` and reveals it via an SVG luminance `<mask>`: a white rect starts opaque (hiding the image) and black brush-stroke paths are appended into the mask as the cursor drags, punching the overlay away. Elements created at runtime via `document.createElementNS` do **not** receive Astro's scoped-style `data-astro-cid-*` attribute, so a scoped `<style>` class won't match them — presentation attributes (`fill`, `stroke`, etc.) for anything built in the `<script>` block must be set directly via `setAttribute`, not through a CSS class.
- `src/components/EyeFollower.astro` — a 5×3 hand-drawn sprite sheet (`src/assets/eye/sprite.png`) swapped via `background-position` percentages (`col/(COLS-1)*100%`), not a smoothed/tweened follow — frame changes are instant, quantized from cursor position. The center frame is reserved for the hover state.
- `src/components/Header.astro` — mobile nav panel must stay `position: fixed` (not `absolute` against `header`) with a self-relative `translateX(100%)`/`translateX(0)` toggle; anchoring it to the header with `left`/`right`/`width` all set together silently drops one of the offsets (CSS ignores `right` when `left`+`width` are both set) and can leave the panel partly on-screen at some viewport widths.

### Image ingestion pipeline

`process-posts.js` (`npm run process -- <category>`) is the current tool for turning raw art photos into posts: reads `src/assets/to-be-uploaded/`, resizes to 500px height, converts to WebP, watermarks, saves to `src/assets/<category>/`, and generates the matching markdown post in `src/content/blog/`. Originals are left in place for manual verification/deletion. Filenames must follow `title-words__description-parts.ext` (double underscore separates title from description; see `PROCESS_POSTS_README.md` for the full token/troubleshooting reference). Valid categories: `paintings`, `graphic-design`, `photography`, `animation`.

The `generate:paintings` and `watermark` npm scripts point at `generate-painting-posts.js`/`add-watermarks.js`, which have been superseded by `process-posts.js` and moved to `archive/` — those two scripts are stale and will fail if run.
