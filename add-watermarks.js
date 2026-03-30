// scripts/add-watermarks.js
import sharp from 'sharp';
import { readdir } from 'fs/promises';
import path from 'path';

const inputDir = './src/assets/paintings';
const outputDir = './src/assets/paintings/watermarked';
const watermarkText = '© Dimitra Be';

async function addWatermark(inputPath, outputPath) {
  const svg = `
    <svg width="80" height="45">
      <style>
        .watermark { 
          fill: #9271B2; 
          font-size: 12px; 
          font-family: Sansation; 
          opacity: 0.7;
        }
      </style>
      <text x="10" y="35" class="watermark">${watermarkText}</text>
    </svg>
  `;

  await sharp(inputPath)
    .composite([{
      input: Buffer.from(svg),
      gravity: 'southeast'
    }])
    .toFile(outputPath);
}

async function processAllImages() {
  const files = await readdir(inputDir);
  
  for (const file of files) {
    if (file.match(/\.(webp|jpg|jpeg|png)$/i)) {
      const inputPath = path.join(inputDir, file);
      const outputPath = path.join(outputDir, file);
      
      await addWatermark(inputPath, outputPath);
      console.log(`✓ Watermarked: ${file}`);
    }
  }
}

processAllImages();