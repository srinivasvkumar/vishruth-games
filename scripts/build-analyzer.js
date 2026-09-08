#!/usr/bin/env node

/**
 * Build analyzer script
 * Analyzes the build output and provides optimization suggestions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function analyzeBuild() {
  console.log('🔍 Analyzing build...\n');
  
  const distDir = path.join(__dirname, '..', 'dist');
  
  if (!fs.existsSync(distDir)) {
    console.error('❌ Build directory not found. Run "npm run build" first.');
    process.exit(1);
  }
  
  try {
    // Analyze file sizes
    const files = walkDirectory(distDir);
    const totalSize = calculateTotalSize(files);
    
    console.log('📊 Build Analysis:');
    console.log(`Total files: ${files.length}`);
    console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB\n`);
    
    // Show largest files
    console.log('📈 Largest files:');
    const largestFiles = files
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .forEach(file => {
        console.log(`  ${file.relativePath}: ${(file.size / 1024).toFixed(2)} KB`);
      });
    
    console.log('');
    
    // Check for common issues
    checkCommonIssues(files);
    
    // Provide optimization suggestions
    provideOptimizationSuggestions(files);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

function walkDirectory(dir, baseDir = dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      files.push(...walkDirectory(fullPath, baseDir));
    } else {
      const stats = fs.statSync(fullPath);
      files.push({
        path: fullPath,
        relativePath,
        size: stats.size,
        extension: path.extname(entry.name)
      });
    }
  }
  
  return files;
}

function calculateTotalSize(files) {
  return files.reduce((sum, file) => sum + file.size, 0);
}

function checkCommonIssues(files) {
  console.log('🔧 Common Issues Check:');
  
  // Check for large image files
  const images = files.filter(f => ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(f.extension));
  const largeImages = images.filter(img => img.size > 1024 * 1024); // > 1MB
  
  if (largeImages.length > 0) {
    console.log('  ⚠️  Large image files detected:');
    largeImages.forEach(img => {
      console.log(`    ${img.relativePath}: ${(img.size / 1024 / 1024).toFixed(2)} MB`);
    });
    console.log('  💡 Consider compressing these images.');
  }
  
  // Check for source maps
  const sourcemaps = files.filter(f => f.extension === '.map');
  if (sourcemaps.length > 0) {
    console.log(`  ⚠️  ${sourcemaps.length} source map files found`);
    console.log('  💡 Remove source maps from production builds if not needed.');
  }
  
  // Check for duplicate files
  const filenameCounts = {};
  files.forEach(file => {
    const name = path.basename(file.relativePath);
    filenameCounts[name] = (filenameCounts[name] || 0) + 1;
  });
  
  const duplicates = Object.entries(filenameCounts).filter(([_, count]) => count > 1);
  if (duplicates.length > 0) {
    console.log(`  ⚠️  ${duplicates.length} duplicate filenames found`);
    console.log('  💡 Consider renaming files to avoid conflicts.');
  }
  
  console.log('');
}

function provideOptimizationSuggestions(files) {
  console.log('💡 Optimization Suggestions:');
  
  // Check for compression opportunities
  const uncompressedTypes = ['.js', '.css', '.html', '.json'];
  const uncompressedFiles = files.filter(f => uncompressedTypes.includes(f.extension));
  
  if (uncompressedFiles.length > 0) {
    console.log(`  🔥 ${uncompressedFiles.length} files could be compressed with gzip/brotli`);
    console.log('  💡 Use a compression middleware in production.');
  }
  
  // Check for unused imports
  console.log('  📦 Consider tree-shaking unused dependencies');
  console.log('  💡 Run "npm run analyze" to see bundle breakdown.');
  
  // Check for lazy loading opportunities
  console.log('  🎯 Consider lazy loading chunks for better initial load');
  console.log('  💡 Use dynamic imports for routes/features.');
  
  console.log('');
  console.log('✅ Analysis complete!');
}

// Run the analyzer
analyzeBuild().catch(console.error);
