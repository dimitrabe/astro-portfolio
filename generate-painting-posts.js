import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PAINTINGS_DIR = path.join(__dirname, 'src/assets/paintings');
const BLOG_DIR = path.join(__dirname, 'src/content/blog');
const CATEGORY = 'paintings';

// Supported image extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

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
function main() {
  console.log('🎨 Painting Post Generator\n');
  
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
  
  imageFiles.forEach(file => {
    const metadata = parseFilename(file);
    
    if (!metadata) {
      errors++;
      return;
    }
    
    // Check if post already exists
    if (postExists(metadata.slug)) {
      console.log(`⏭️  Skipped "${file}" - post already exists`);
      skipped++;
      return;
    }
    
    // Generate markdown content
    const markdown = generateMarkdown(metadata);
    const postPath = path.join(BLOG_DIR, `${metadata.slug}.md`);
    
    // Write the file
    try {
      fs.writeFileSync(postPath, markdown, 'utf8');
      console.log(`✅ Created post: ${metadata.slug}.md`);
      console.log(`   Title: ${metadata.title}`);
      console.log(`   Description: ${metadata.description}\n`);
      created++;
    } catch (err) {
      console.error(`❌ Error creating post for "${file}":`, err.message);
      errors++;
    }
  });
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`   ✅ Created: ${created}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('='.repeat(50));
}

// Run the script
main();
