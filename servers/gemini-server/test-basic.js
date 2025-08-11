#!/usr/bin/env node

/**
 * Basic test script for Gemini MCP Server
 * Tests the MCP server functionality without requiring a real API key
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🧪 Gemini MCP Server - Basic Tests');
console.log('=====================================\n');

// Test 1: Check if server can start without API key (should fail gracefully)
console.log('Test 1: Server startup validation');
try {
  const server = spawn('node', ['build/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, GEMINI_API_KEY: '' }
  });

  server.stderr.on('data', (data) => {
    const output = data.toString();
    if (output.includes('GEMINI_API_KEY environment variable is not set')) {
      console.log('✅ Server correctly validates API key requirement');
      server.kill();
    }
  });

  setTimeout(() => {
    server.kill();
    console.log('❌ Server should have failed without API key');
  }, 2000);

} catch (error) {
  console.log(`❌ Error starting server: ${error.message}`);
}

// Test 2: Check if build artifacts exist
console.log('\nTest 2: Build artifacts check');
const buildFiles = [
  'build/index.js',
  'build/schemas.js',
  'build/providers/gemini.js',
  'build/utils/media.js'
];

let allFilesExist = true;
for (const file of buildFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
    allFilesExist = false;
  }
}

if (allFilesExist) {
  console.log('✅ All build artifacts present');
} else {
  console.log('❌ Some build artifacts missing');
}

// Test 3: Check package.json scripts
console.log('\nTest 3: Package.json validation');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const requiredScripts = ['build', 'start', 'dev'];
  const requiredDeps = [
    '@modelcontextprotocol/sdk',
    'dotenv',
    'node-fetch', 
    'zod',
    'zod-to-json-schema',
    'file-type'
  ];

  let scriptsOk = true;
  for (const script of requiredScripts) {
    if (packageJson.scripts[script]) {
      console.log(`✅ Script '${script}' defined`);
    } else {
      console.log(`❌ Script '${script}' missing`);
      scriptsOk = false;
    }
  }

  let depsOk = true;
  for (const dep of requiredDeps) {
    if (packageJson.dependencies[dep]) {
      console.log(`✅ Dependency '${dep}' present`);
    } else {
      console.log(`❌ Dependency '${dep}' missing`);
      depsOk = false;
    }
  }

  if (scriptsOk && depsOk) {
    console.log('✅ Package.json configuration correct');
  }

} catch (error) {
  console.log(`❌ Error reading package.json: ${error.message}`);
}

// Test 4: Basic module imports
console.log('\nTest 4: Module import validation');
try {
  // Try to import the built modules to check for syntax errors
  await import('./build/schemas.js');
  console.log('✅ schemas.js imports successfully');
  
  await import('./build/providers/gemini.js');
  console.log('✅ providers/gemini.js imports successfully');
  
  await import('./build/utils/media.js');
  console.log('✅ utils/media.js imports successfully');
  
  console.log('✅ All modules import without errors');
} catch (error) {
  console.log(`❌ Module import failed: ${error.message}`);
}

console.log('\n📋 Basic Tests Complete');
console.log('=====================================');
console.log('To run with a real API key:');
console.log('1. Copy .env.example to .env');
console.log('2. Add your GEMINI_API_KEY');
console.log('3. Test with: echo \'{"method":"tools/list","params":{}}\' | node build/index.js');