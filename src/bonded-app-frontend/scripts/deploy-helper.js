#!/usr/bin/env node

/**
 * DEPLOYMENT HELPER SCRIPT
 * 
 * Optimized deployment script for Bonded PWA that handles the build process
 * and deployment to ICP playground without CPU overload.
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const network = args.find(arg => arg.includes('--network')) ? args.find(arg => arg.includes('--network')).split('=')[1] : 'playground';
const isPlayground = args.includes('--playground') || network === 'playground';

console.log('🚀 Bonded PWA Deployment Helper');
console.log('===============================');
console.log(`Target network: ${isPlayground ? 'IC Playground' : network}`);
console.log('');

// Check if build exists
function checkBuildExists() {
  const distPath = path.join(process.cwd(), 'dist');
  return existsSync(distPath);
}

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Running: ${command} ${args.join(' ')}`);
    
    const process = spawn(command, args, {
      stdio: 'inherit',
      ...options
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    process.on('error', (err) => {
      reject(err);
    });
  });
}

async function deploySequence() {
  try {
    // Step 1: Check if we need to build
    if (!checkBuildExists()) {
      console.log('📦 Build not found, running optimized build first...');
      console.log('   This may take a few minutes due to AI model processing.');
      console.log('');
      
      // Use laptop-friendly build for deployment to avoid CPU overload
      await runCommand('npm', ['run', 'build:laptop'], {
        env: {
          ...process.env,
          NODE_OPTIONS: '--max-old-space-size=2048'
        }
      });
      
      console.log('✅ Build completed successfully!');
      console.log('');
    } else {
      console.log('✅ Build directory found, using existing build.');
      console.log('');
    }
    
    // Step 2: Navigate to project root for dfx commands
    process.chdir('..');
    console.log('📂 Changed to project root directory');
    
    // Step 3: Deploy with optimized settings
    console.log('🚀 Starting deployment...');
    
    let deployArgs = ['deploy'];
    
    if (isPlayground) {
      deployArgs.push('--playground');
    } else if (network && network !== 'local') {
      deployArgs.push('--network', network);
    }
    
    // Add any additional args passed to the script
    const additionalArgs = args.filter(arg => 
      !arg.includes('--network') && 
      arg !== '--playground'
    );
    deployArgs.push(...additionalArgs);
    
    await runCommand('dfx', deployArgs, {
      env: {
        ...process.env,
        // Limit memory usage during deployment
        NODE_OPTIONS: '--max-old-space-size=4096'
      }
    });
    
    console.log('');
    console.log('🎉 Deployment completed successfully!');
    
    if (isPlayground) {
      console.log('');
      console.log('📱 Your app is now deployed to IC Playground');
      console.log('   Check the dfx output above for the deployment URLs');
      console.log('   Frontend URL typically starts with: https://');
      console.log('   Backend canister ID will be shown in the deployment log');
    }
    
  } catch (error) {
    console.error('');
    console.error('❌ Deployment failed:', error.message);
    console.error('');
    console.error('💡 Troubleshooting tips:');
    console.error('   1. Try running just the build first: npm run build:fast');
    console.error('   2. Check your internet connection for IC playground');
    console.error('   3. Ensure dfx is installed and up to date');
    console.error('   4. Try clearing build cache: rm -rf dist/ && npm run build:fast');
    
    process.exit(1);
  }
}

// Help message
if (args.includes('--help') || args.includes('-h')) {
  console.log('Bonded PWA Deployment Helper');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/deploy-helper.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --playground          Deploy to IC playground');
  console.log('  --network=<name>      Deploy to specific network');
  console.log('  --help, -h           Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/deploy-helper.js --playground');
  console.log('  node scripts/deploy-helper.js --network=ic');
  console.log('  npm run deploy:playground   # Shortcut for playground');
  
  process.exit(0);
}

// Start deployment
deploySequence(); 