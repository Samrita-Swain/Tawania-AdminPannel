#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Running prebuild script...');

// Create .next directory structure
const dirs = [
  '.next',
  '.next/server',
  '.next/server/app',
  '.next/server/app/(dashboard)',
  '.next/static',
  '.next/static/chunks',
  '.next/static/chunks/app',
  '.next/static/chunks/app/(dashboard)'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created: ${dir}`);
  }
});

// Create required manifest files
const manifestFiles = [
  '.next/server/app/(dashboard)/page_client-reference-manifest.js',
  '.next/server/app/(dashboard)/layout_client-reference-manifest.js',
  '.next/server/app/page_client-reference-manifest.js',
  '.next/server/app/layout_client-reference-manifest.js'
];

const manifestContent = `// Auto-generated manifest file
module.exports = {
  clientModules: {},
  ssrModuleMapping: {},
  edgeSSRModuleMapping: {},
  entryCSSFiles: {}
};`;

manifestFiles.forEach(file => {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(file, manifestContent);
  console.log(`✅ Created manifest: ${file}`);
});

console.log('✅ Prebuild completed successfully!');
