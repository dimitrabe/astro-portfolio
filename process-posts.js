import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_DIR = path.join(__dirname, 'src/assets/to-be-uploaded');
const BLOG_DIR = path.join(__dirname, 'src/content/blog');
const TARGET_HEIGHT = 500;
const WEBP_QUALITY = 100;
const WATERMARK_TEXT = '© Dimitra Be';
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

const VALID_CATEGORIES = ['paintings', 'graphic-design', 'photography', 'animation'];

function getCategory() {
  const args = process.argv.slice(2);
  const categoryArg = args[0];

  if (!categoryArg) {
    console.error('❌ Error: category argument is required.');
    console.error(`   Usage: node process-posts.js <category>`);
    console.error(`   Valid categories: ${VALID_CATEGORIES.join(', ')}`);
    process.exit(1);
  }

  if (!VALID_CATEGORIES.includes(categoryArg)) {
    console.error(`❌ Error: unknown category "${categoryArg}".`);
    console.error(`   Valid categories: ${VALID_CATEGORIES.join(', ')}`);
    process.exit(1);
  }

  return categoryArg;
}

function buildWatermarkSvg() {
  return Buffer.from(`
    <svg width="120" height="45">
      <style>
        .watermark {
          fill: #9271B2;
          font-size: 12px;
          font-family: Sansation;
          opacity: 0.7;
        }
      </style>
      <text x="10" y="35" class="watermark">${WATERMARK_TEXT}</text>
    </svg>
  `);
}

async function processImage(inputPath, outputPath) {
  const isAnimated = path.extname(inputPath).toLowerCase() === '.gif';
  const sharpOpts = { animated: isAnimated, limitInputPixels: false };
  const metadata = await sharp(inputPath, sharpOpts).metadata();
  const frameHeight = metadata.pageHeight ?? metadata.height;
  const aspectRatio = metadata.width / frameHeight;
  const targetWidth = Math.round(TARGET_HEIGHT * aspectRatio);

  console.log(`   📐 Original: ${metadata.width}x${frameHeight}px${isAnimated ? ` (${metadata.pages} frames)` : ''}`);
  console.log(`   📐 Resized:  ${targetWidth}x${TARGET_HEIGHT}px`);

  await sharp(inputPath, sharpOpts)
    .resize({ width: targetWidth, height: TARGET_HEIGHT, fit: 'cover' })
    .webp({ quality: WEBP_QUALITY })
    .composite(isAnimated ? [] : [{ input: buildWatermarkSvg(), gravity: 'southeast' }])
    .toFile(outputPath);

  const originalSize = fs.statSync(inputPath).size;
  const newSize = fs.statSync(outputPath).size;
  const savedPercent = Math.round((1 - newSize / originalSize) * 100);
  console.log(`   💾 Size: ${formatBytes(originalSize)} → ${formatBytes(newSize)} (saved ${savedPercent}%)`);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatTitle(str) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDescription(str) {
  return str
    .split('-')
    .map(part => {
      if (part.match(/^v\d+$/i)) return 'Version ' + part.slice(1);
      if (part.match(/^\d+x\d+$/)) return part + 'cm';
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(', ');
}

function parseFilename(filename, category) {
  const ext = path.extname(filename);
  const nameWithoutExt = filename.slice(0, -ext.length);
  const parts = nameWithoutExt.split('__');

  if (parts.length !== 2) {
    console.warn(`⚠️  Skipping "${filename}" - must have format: title__description${ext}`);
    return null;
  }

  const [titlePart, descPart] = parts;
  const slug = nameWithoutExt.toLowerCase().replace(/__/g, '-');
  const outputFilename = `${nameWithoutExt}.webp`;

  return {
    title: formatTitle(titlePart),
    description: formatDescription(descPart),
    slug,
    imagePath: `../../assets/${category}/${outputFilename}`,
    outputFilename,
  };
}

function generateMarkdown(metadata, category) {
  const today = new Date().toISOString().split('T')[0];
  return `---
title: '${metadata.title}'
description: '${metadata.description}'
pubDate: '${today}'
heroImage: '${metadata.imagePath}'
category: '${category}'
---

${metadata.description}
`;
}

async function main() {
  const category = getCategory();
  const outputDir = path.join(__dirname, 'src/assets', category);

  console.log(`\n🎨 Processing posts for category: ${category}\n`);

  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`❌ Input directory not found: ${INPUT_DIR}`);
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) {
    console.error(`❌ Output directory not found: ${outputDir}`);
    console.error(`   Create it first: src/assets/${category}/`);
    process.exit(1);
  }

  if (!fs.existsSync(BLOG_DIR)) {
    console.error(`❌ Blog directory not found: ${BLOG_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(INPUT_DIR).filter(f =>
    IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase())
  );

  if (files.length === 0) {
    console.log('📁 No image files found in src/assets/to-be-uploaded/');
    return;
  }

  console.log(`Found ${files.length} image(s) in to-be-uploaded\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    console.log(`\n📸 Processing: ${file}`);

    const metadata = parseFilename(file, category);
    if (!metadata) { errors++; continue; }

    const postPath = path.join(BLOG_DIR, `${metadata.slug}.md`);
    if (fs.existsSync(postPath)) {
      console.log(`⏭️  Skipped - post already exists`);
      skipped++;
      continue;
    }

    try {
      const inputPath = path.join(INPUT_DIR, file);
      const outputPath = path.join(outputDir, metadata.outputFilename);

      await processImage(inputPath, outputPath);
      console.log(`   ✅ Image saved: ${category}/${metadata.outputFilename}`);

      fs.writeFileSync(postPath, generateMarkdown(metadata, category), 'utf8');
      console.log(`   ✅ Post created: ${metadata.slug}.md`);
      console.log(`   📝 Title: ${metadata.title}`);
      console.log(`   📝 Description: ${metadata.description}`);
      created++;
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`   ✅ Posts created: ${created}`);
  console.log(`   ⏭️  Skipped:       ${skipped}`);
  console.log(`   ❌ Errors:        ${errors}`);
  console.log(`\n💡 Originals in to-be-uploaded/ were NOT deleted.`);
  console.log(`   Verify the watermarks, then delete them manually when ready.`);
  console.log('='.repeat(50) + '\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
