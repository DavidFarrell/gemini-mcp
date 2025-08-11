#!/usr/bin/env node

/**
 * MCP Protocol Test for Gemini Server
 * Tests the MCP JSON-RPC protocol without making actual API calls
 */

import { spawn } from 'child_process';

console.log('🔌 Gemini MCP Server - Protocol Tests');
console.log('======================================\n');

function testMCPCall(description, input, expectedInResponse = null, expectError = false) {
  return new Promise((resolve) => {
    console.log(`Testing: ${description}`);
    
    const server = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { 
        ...process.env, 
        GEMINI_API_KEY: 'test-key-for-protocol-testing'
      }
    });

    let output = '';
    let errorOutput = '';
    
    server.stdout.on('data', (data) => {
      output += data.toString();
    });

    server.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Send the MCP request
    server.stdin.write(JSON.stringify(input) + '\n');

    setTimeout(() => {
      server.kill();
      
      try {
        if (output.trim()) {
          const response = JSON.parse(output.trim());
          
          if (expectError && response.error) {
            console.log(`✅ Expected error received: ${response.error.message || 'Unknown error'}`);
            resolve(true);
          } else if (!expectError && expectedInResponse) {
            if (JSON.stringify(response).includes(expectedInResponse)) {
              console.log(`✅ Expected content found in response`);
              resolve(true);
            } else {
              console.log(`❌ Expected '${expectedInResponse}' not found in response`);
              console.log(`Response: ${JSON.stringify(response, null, 2)}`);
              resolve(false);
            }
          } else if (!expectError && !response.error) {
            console.log(`✅ Successful response received`);
            resolve(true);
          } else {
            console.log(`❌ Unexpected response: ${JSON.stringify(response, null, 2)}`);
            resolve(false);
          }
        } else {
          console.log(`❌ No output received`);
          if (errorOutput) {
            console.log(`Error output: ${errorOutput}`);
          }
          resolve(false);
        }
      } catch (parseError) {
        console.log(`❌ Failed to parse JSON response: ${parseError.message}`);
        console.log(`Raw output: ${output}`);
        resolve(false);
      }
    }, 3000);
  });
}

async function runTests() {
  // Test 1: List tools
  await testMCPCall(
    'List available tools',
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    },
    'gemini_generate'
  );

  // Test 2: Call gemini_generate with invalid args (should fail validation)
  await testMCPCall(
    'Call gemini_generate with missing prompt',
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'gemini_generate',
        arguments: {
          model: 'gemini-2.5-flash'
          // Missing required 'prompt' field
        }
      }
    },
    null,
    true // Expect error
  );

  // Test 3: Call gemini_generate with valid args (will fail at API call but should pass validation)
  await testMCPCall(
    'Call gemini_generate with valid args',
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'gemini_generate',
        arguments: {
          prompt: 'Hello, world!',
          model: 'gemini-2.5-flash'
        }
      }
    },
    'Gemini API error', // Will fail at API call, but that's expected
    true
  );

  // Test 4: Call gemini_messages with system message
  await testMCPCall(
    'Call gemini_messages with system message',
    {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'gemini_messages',
        arguments: {
          system: 'You are a helpful assistant.',
          messages: [
            {
              role: 'user',
              content: 'What is 2+2?'
            }
          ],
          model: 'gemini-2.5-flash'
        }
      }
    },
    'Gemini API error', // Will fail at API call
    true
  );

  // Test 5: Call unknown tool
  await testMCPCall(
    'Call unknown tool',
    {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'unknown_tool',
        arguments: {}
      }
    },
    null,
    true // Expect error
  );

  console.log('\n📋 MCP Protocol Tests Complete');
  console.log('======================================');
}

runTests().catch(console.error);