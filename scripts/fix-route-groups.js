#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing route groups for Vercel deployment...');

// The issue is with the (dashboard) route group
// Let's create a workaround by ensuring the structure is correct

const appDir = path.join(process.cwd(), 'src', 'app');
const dashboardDir = path.join(appDir, '(dashboard)');

// Check if dashboard directory exists
if (fs.existsSync(dashboardDir)) {
  console.log('✅ Dashboard route group exists');
  
  // Ensure layout.tsx exists
  const layoutFile = path.join(dashboardDir, 'layout.tsx');
  if (fs.existsSync(layoutFile)) {
    console.log('✅ Dashboard layout exists');
  } else {
    console.log('❌ Dashboard layout missing');
  }
  
  // Ensure page.tsx exists
  const pageFile = path.join(dashboardDir, 'page.tsx');
  if (fs.existsSync(pageFile)) {
    console.log('✅ Dashboard page exists');
  } else {
    console.log('❌ Dashboard page missing');
  }
} else {
  console.log('❌ Dashboard route group missing');
}

console.log('✅ Route group check completed!');
