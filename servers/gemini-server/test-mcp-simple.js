#!/usr/bin/env node

/**
 * Simple MCP Server Test
 * Direct test of MCP server with working API key
 */

import { spawn } from 'child_process';
// Simple MCP test

console.log('🔌 Simple MCP Server Test');
console.log('==========================\n');

async function testMCP() {
  console.log('Starting MCP server...');
  
  const server = spawn('node', ['build/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env }
  });

  let ready = false;
  
  // Wait for server to be ready
  server.stderr.on('data', (data) => {
    const output = data.toString();
    console.log('Server:', output.trim());
    
    if (output.includes('running on stdio')) {
      ready = true;
      console.log('✅ Server is ready!\n');
      
      // Test 1: List tools
      console.log('Test 1: Listing tools...');
      const listRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      };
      
      server.stdin.write(JSON.stringify(listRequest) + '\n');
    }
  });

  // Handle responses
  server.stdout.on('data', (data) => {
    try {
      const response = JSON.parse(data.toString().trim());
      console.log('Response received:', JSON.stringify(response, null, 2));
      
      if (response.id === 1) {
        // Tools list response
        if (response.result && response.result.tools) {
          console.log(`✅ Found ${response.result.tools.length} tools`);
          response.result.tools.forEach(tool => {
            console.log(`  - ${tool.name}: ${tool.description}`);
          });
          
          // Test 2: Simple generation
          console.log('\nTest 2: Simple generation...');
          const genRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
              name: 'gemini_generate',
              arguments: {
                prompt: 'Say "MCP server working!" and nothing else.',
                model: 'gemini-2.5-flash'
              }
            }
          };
          
          server.stdin.write(JSON.stringify(genRequest) + '\n');
        }
      } else if (response.id === 2) {
        // Generation response
        if (response.result && response.result.content) {
          const text = response.result.content[0].text;
          console.log('✅ Generation successful!');
          console.log(`Response: ${text}`);
          
          // Clean exit
          setTimeout(() => {
            server.kill();
            console.log('\n🎉 MCP server test completed successfully!');
          }, 1000);
        } else if (response.error) {
          console.log(`❌ Generation failed: ${response.error.message}`);
          server.kill();
        }
      }
    } catch (error) {
      console.log('Parse error:', error.message);
      console.log('Raw data:', data.toString());
    }
  });

  server.on('error', (error) => {
    console.log('❌ Server error:', error.message);
  });

  // Timeout after 30 seconds
  setTimeout(() => {
    if (!ready) {
      console.log('❌ Server failed to start within timeout');
      server.kill();
    }
  }, 30000);
}

testMCP().catch(console.error);