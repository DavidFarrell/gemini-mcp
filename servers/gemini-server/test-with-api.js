#!/usr/bin/env node

/**
 * Live API Tests for Gemini MCP Server
 * Tests with real Gemini API key
 */

import { spawn } from 'child_process';
import fs from 'fs';

console.log('🔑 Gemini MCP Server - Live API Tests');
console.log('=====================================\n');

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('❌ .env file not found. Please create one with GEMINI_API_KEY');
  process.exit(1);
}

const envContent = fs.readFileSync('.env', 'utf8');
if (!envContent.includes('GEMINI_API_KEY=') || envContent.includes('your_gemini_api_key_here')) {
  console.log('❌ GEMINI_API_KEY not set in .env file');
  process.exit(1);
}

console.log('✅ Environment file configured');

async function testMCPRequest(description, request, timeout = 10000) {
  console.log(`\nTesting: ${description}`);
  
  return new Promise((resolve) => {
    const server = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    let output = '';
    let errorOutput = '';
    let timeoutId;

    server.stdout.on('data', (data) => {
      output += data.toString();
    });

    server.stderr.on('data', (data) => {
      errorOutput += data.toString();
      // Look for server ready indicators
      if (data.toString().includes('running on stdio')) {
        console.log('✅ Server started successfully');
        // Send the request
        server.stdin.write(JSON.stringify(request) + '\n');
        
        // Set timeout for response
        timeoutId = setTimeout(() => {
          server.kill();
          console.log('❌ Test timed out');
          resolve(false);
        }, timeout);
      }
    });

    server.stdout.on('data', (data) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        server.kill();
        
        try {
          const response = JSON.parse(data.toString().trim());
          
          if (response.error) {
            console.log(`❌ API Error: ${response.error.message || JSON.stringify(response.error)}`);
            resolve(false);
          } else if (response.result && response.result.content) {
            const content = response.result.content[0];
            if (content.type === 'text') {
              console.log(`✅ Success! Response: ${content.text.substring(0, 200)}${content.text.length > 200 ? '...' : ''}`);
              resolve(true);
            } else {
              console.log(`❌ Unexpected content type: ${content.type}`);
              resolve(false);
            }
          } else {
            console.log(`❌ Unexpected response format: ${JSON.stringify(response)}`);
            resolve(false);
          }
        } catch (parseError) {
          console.log(`❌ Failed to parse response: ${parseError.message}`);
          console.log(`Raw output: ${data.toString()}`);
          resolve(false);
        }
      }
    });

    server.on('error', (error) => {
      console.log(`❌ Server error: ${error.message}`);
      resolve(false);
    });

    // Fallback timeout
    setTimeout(() => {
      server.kill();
      console.log('❌ Overall test timeout');
      resolve(false);
    }, timeout + 5000);
  });
}

async function runLiveTests() {
  console.log('Starting live API tests...\n');

  // Test 1: Simple text generation
  const success1 = await testMCPRequest(
    'Simple text generation with gemini_generate',
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'gemini_generate',
        arguments: {
          prompt: 'Say "Hello from Gemini!" and nothing else.',
          model: 'gemini-2.5-flash'
        }
      }
    }
  );

  // Test 2: Conversation with system message  
  const success2 = await testMCPRequest(
    'Conversation with system message',
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'gemini_messages',
        arguments: {
          system: 'You are a helpful assistant. Keep responses very brief.',
          messages: [
            {
              role: 'user',
              content: 'What is 2+2? Answer with just the number.'
            }
          ],
          model: 'gemini-2.5-flash'
        }
      }
    }
  );

  // Test 3: JSON structured output
  const success3 = await testMCPRequest(
    'JSON structured output',
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'gemini_generate',
        arguments: {
          prompt: 'Return a JSON object with "message": "test successful" and "number": 42',
          model: 'gemini-2.5-flash',
          response_schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              number: { type: 'number' }
            }
          },
          response_mime_type: 'application/json'
        }
      }
    }
  );

  // Results
  console.log('\n📋 Live API Test Results');
  console.log('===============================');
  console.log(`Simple generation: ${success1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`System messages: ${success2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`JSON output: ${success3 ? '✅ PASS' : '❌ FAIL'}`);
  
  const totalPassed = [success1, success2, success3].filter(Boolean).length;
  console.log(`\nOverall: ${totalPassed}/3 tests passed`);
  
  if (totalPassed === 3) {
    console.log('🎉 All tests passed! Gemini MCP server is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the API key and network connectivity.');
  }
}

runLiveTests().catch(console.error);