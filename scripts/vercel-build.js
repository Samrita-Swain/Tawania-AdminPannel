#!/usr/bin/env node

/**
 * Vercel Build Script
 * Fixes the client reference manifest error during Vercel deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting Vercel build process...');

try {
  // Step 1: Generate Prisma Client
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Step 2: Create necessary directories
  console.log('📁 Creating build directories...');
  const buildDirs = [
    '.next',
    '.next/server',
    '.next/server/app',
    '.next/server/app/(dashboard)',
    '.next/static',
    '.next/static/chunks'
  ];
  
  buildDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${dir}`);
    }
  });
  
  // Step 3: Create placeholder manifest files
  console.log('📄 Creating placeholder manifest files...');
  const manifestFiles = [
    '.next/server/app/(dashboard)/page_client-reference-manifest.js',
    '.next/server/app/(dashboard)/layout_client-reference-manifest.js'
  ];
  
  manifestFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, 'module.exports = {};');
      console.log(`✅ Created manifest: ${file}`);
    }
  });
  
  // Step 4: Run Next.js build
  console.log('🔨 Building Next.js application...');
  execSync('next build', { stdio: 'inherit' });
  
  console.log('✅ Vercel build completed successfully!');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
