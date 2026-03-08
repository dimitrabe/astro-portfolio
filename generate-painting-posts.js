import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PAINTINGS_DIR = path.join(__dirname, 'src/assets/paintings');
const BLOG_DIR = path.join(__dirname, 'src/content/blog');
const CATEGORY = 'paintings';
const TARGET_HEIGHT = 500; // Target height in pixels
const WEBP_QUALITY = 100; // WebP quality (0-100)

// Supported image extensions (we'll convert all to webp)
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * Process image: resize to target height and convert to WebP
 * Returns the new filename
 */
async function processImage(filename) {
  const inputPath = path.join(PAINTINGS_DIR, filename);
  const ext = path.extname(filename);
  const nameWithoutExt = filename.replace(ext, '');
  const outputFilename = `${nameWithoutExt}.webp`;
  const outputPath = path.join(PAINTINGS_DIR, outputFilename);
  
  try {
    // Get original image metadata
    const metadata = await sharp(inputPath).metadata();
    
    // Calculate width maintaining aspect ratio
    const aspectRatio = metadata.width / metadata.height;
    const targetWidth = Math.round(TARGET_HEIGHT * aspectRatio);
    
    console.log(`   📐 Original: ${metadata.width}x${metadata.height}px`);
    console.log(`   📐 Resized: ${targetWidth}x${TARGET_HEIGHT}px`);
    
    // Process image: resize and convert to WebP
    await sharp(inputPath)
      .resize({
        width: targetWidth,
        height: TARGET_HEIGHT,
        fit: 'cover'
      })
      .webp({ quality: WEBP_QUALITY })
      .toFile(outputPath);
    
    // Get file sizes for comparison
    const originalSize = fs.statSync(inputPath).size;
    const newSize = fs.statSync(outputPath).size;
    const savedPercent = Math.round((1 - newSize / originalSize) * 100);
    
    console.log(`   💾 Size: ${formatBytes(originalSize)} → ${formatBytes(newSize)} (saved ${savedPercent}%)`);
    
    // Delete original file only if it's not already a webp
    if (ext.toLowerCase() !== '.webp') {
      fs.unlinkSync(inputPath);
      console.log(`   🗑️  Deleted original ${ext} file`);
    }
    
    return outputFilename;
  } catch (err) {
    throw new Error(`Failed to process image: ${err.message}`);
  }
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Convert filename to title format
 * Example: "sunset-beach" -> "Sunset Beach"
 */
function formatTitle(str) {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format description from filename parts
 * Example: "acrylic-cartoline-24x30-v2" -> "Acrylic, Cartoline, 24x30cm, Version 2"
 */
function formatDescription(str) {
  return str
    .split('-')
    .map(part => {
      // Handle version numbers (v1, v2, etc.)
      if (part.match(/^v\d+$/i)) {
        return 'Version ' + part.slice(1);
      }
      // Handle dimensions (24x30)
      if (part.match(/^\d+x\d+$/)) {
        return part + 'cm';
      }
      // Capitalize first letter
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(', ');
}

/**
 * Parse filename and extract metadata
 */
function parseFilename(filename) {
  const ext = path.extname(filename);
  const nameWithoutExt = filename.replace(ext, '');
  
  // Split by double underscore
  const parts = nameWithoutExt.split('__');
  
  if (parts.length !== 2) {
    console.warn(`⚠️  Skipping "${filename}" - must have format: title__description${ext}`);
    return null;
  }
  
  const [titlePart, descPart] = parts;
  
  return {
    title: formatTitle(titlePart),
    description: formatDescription(descPart),
    slug: nameWithoutExt.toLowerCase().replace(/__/g, '-'),
    imagePath: `../../assets/paintings/${filename}`
  };
}

/**
 * Generate markdown frontmatter and content
 */
function generateMarkdown(metadata) {
  const today = new Date().toISOString().split('T')[0];
  
  return `---
title: '${metadata.title}'
description: '${metadata.description}'
pubDate: '${today}'
heroImage: '${metadata.imagePath}'
category: '${CATEGORY}'
---

${metadata.description}
`;
}

/**
 * Check if a post already exists for this image
 */
function postExists(slug) {
  const postPath = path.join(BLOG_DIR, `${slug}.md`);
  return fs.existsSync(postPath);
}

/**
 * Main script execution
 */
async function main() {
  console.log('🎨 Painting Post Generator with Image Processing\n');
  
  // Check if directories exist
  if (!fs.existsSync(PAINTINGS_DIR)) {
    console.error(`❌ Error: Paintings directory not found at ${PAINTINGS_DIR}`);
    console.log('Please create the directory: src/assets/paintings/');
    process.exit(1);
  }
  
  if (!fs.existsSync(BLOG_DIR)) {
    console.error(`❌ Error: Blog directory not found at ${BLOG_DIR}`);
    console.log('Please create the directory: src/content/blog/');
    process.exit(1);
  }
  
  // Read all files from paintings directory
  const files = fs.readdirSync(PAINTINGS_DIR);
  const imageFiles = files.filter(file => 
    IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase())
  );
  
  if (imageFiles.length === 0) {
    console.log('📁 No image files found in src/assets/paintings/');
    return;
  }
  
  console.log(`Found ${imageFiles.length} image(s)\n`);
  
  let created = 0;
  let skipped = 0;
  let errors = 0;
  let processed = 0;
  
  for (const file of imageFiles) {
    console.log(`\n📸 Processing: ${file}`);
    
    const metadata = parseFilename(file);
    
    if (!metadata) {
      errors++;
      continue;
    }
    
    // Check if post already exists
    if (postExists(metadata.slug)) {
      console.log(`⏭️  Skipped - post already exists`);
      skipped++;
      continue;
    }
    
    try {
      // Process image (resize and convert to WebP)
      const processedFilename = await processImage(file);
      processed++;
      
      // Update metadata with new image path
      metadata.imagePath = `../../assets/paintings/${processedFilename}`;
      
      // Generate markdown content
      const markdown = generateMarkdown(metadata);
      const postPath = path.join(BLOG_DIR, `${metadata.slug}.md`);
      
      // Write the file
      fs.writeFileSync(postPath, markdown, 'utf8');
      console.log(`✅ Created post: ${metadata.slug}.md`);
      console.log(`   Title: ${metadata.title}`);
      console.log(`   Description: ${metadata.description}`);
      created++;
    } catch (err) {
      console.error(`❌ Error processing "${file}":`, err.message);
      errors++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`   🖼️  Images processed: ${processed}`);
  console.log(`   ✅ Posts created: ${created}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('='.repeat(50));
}

// Run the script
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
