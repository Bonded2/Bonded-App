#!/usr/bin/env node
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
// Check if dfx is running
const dfxStatus = spawnSync('dfx', ['ping'], { stdio: 'pipe' });
if (dfxStatus.status !== 0) {
  // Start dfx in the background
  spawnSync('dfx', ['start', '--clean', '--background'], { 
    stdio: 'inherit',
    cwd: rootDir
  });
}
// Start the Vite dev server
spawnSync('vite', ['--port', '3000'], { 
  stdio: 'inherit',
  env: {
    ...process.env,
    DFX_NETWORK: process.env.DFX_NETWORK || 'local'
  },
  cwd: path.resolve(__dirname, '..')
}); 