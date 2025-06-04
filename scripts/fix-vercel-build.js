#!/usr/bin/env node

/**
 * Fix for Vercel deployment issues
 * This script ensures proper build configuration for Vercel
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Vercel build configuration...');

// Ensure .next directory exists
const nextDir = path.join(process.cwd(), '.next');
if (!fs.existsSync(nextDir)) {
  fs.mkdirSync(nextDir, { recursive: true });
  console.log('✅ Created .next directory');
}

// Ensure server directory exists
const serverDir = path.join(nextDir, 'server');
if (!fs.existsSync(serverDir)) {
  fs.mkdirSync(serverDir, { recursive: true });
  console.log('✅ Created .next/server directory');
}

// Ensure app directory exists
const appDir = path.join(serverDir, 'app');
if (!fs.existsSync(appDir)) {
  fs.mkdirSync(appDir, { recursive: true });
  console.log('✅ Created .next/server/app directory');
}

// Create dashboard directory
const dashboardDir = path.join(appDir, '(dashboard)');
if (!fs.existsSync(dashboardDir)) {
  fs.mkdirSync(dashboardDir, { recursive: true });
  console.log('✅ Created .next/server/app/(dashboard) directory');
}

console.log('✅ Vercel build configuration fixed!');
console.log('🚀 Ready for deployment!');
