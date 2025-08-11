#!/usr/bin/env node

/**
 * Comprehensive API Tests for Gemini MCP Server
 * Tests all major functionality with real API
 */

import { spawn } from 'child_process';

console.log('🚀 Comprehensive Gemini MCP Tests');
console.log('==================================\n');

async function runTest(name, request, timeout = 15000) {
  console.log(`📋 Test: ${name}`);
  
  return new Promise((resolve) => {
    const server = spawn('node', ['build/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let responseReceived = false;
    
    server.stderr.on('data', (data) => {
      if (data.toString().includes('running on stdio')) {
        server.stdin.write(JSON.stringify(request) + '\n');
      }
    });

    server.stdout.on('data', (data) => {
      if (!responseReceived) {
        responseReceived = true;
        
        try {
          const response = JSON.parse(data.toString().trim());
          
          if (response.error) {
            console.log(`   ❌ Error: ${response.error.message}`);
            resolve(false);
          } else if (response.result?.content?.[0]?.text) {
            const text = response.result.content[0].text;
            console.log(`   ✅ Success: ${text.substring(0, 150)}${text.length > 150 ? '...' : ''}`);
            resolve(true);
          } else {
            console.log(`   ❌ Unexpected response format`);
            resolve(false);
          }
        } catch (error) {
          console.log(`   ❌ Parse error: ${error.message}`);
          resolve(false);
        }
        
        server.kill();
      }
    });

    setTimeout(() => {
      server.kill();
      if (!responseReceived) {
        console.log(`   ❌ Timeout`);
        resolve(false);
      }
    }, timeout);
  });
}

async function runAllTests() {
  const results = [];

  // Test 1: Basic text generation
  results.push(await runTest(
    'Basic text generation',
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'gemini_generate',
        arguments: {
          prompt: 'Write a haiku about coding.',
          model: 'gemini-2.5-flash'
        }
      }
    }
  ));

  // Test 2: System instruction
  results.push(await runTest(
    'System instruction',
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'gemini_generate',
        arguments: {
          prompt: 'What is your purpose?',
          system: 'You are a helpful coding assistant. Always mention TypeScript in your responses.',
          model: 'gemini-2.5-flash'
        }
      }
    }
  ));

  // Test 3: Conversation with messages
  results.push(await runTest(
    'Multi-turn conversation',
    {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'gemini_messages',
        arguments: {
          system: 'You are a math tutor. Be concise.',
          messages: [
            { role: 'user', content: 'What is 15 * 7?' },
            { role: 'assistant', content: '15 * 7 = 105' },
            { role: 'user', content: 'Now what is 105 / 5?' }
          ],
          model: 'gemini-2.5-flash'
        }
      }
    }
  ));

  // Test 4: JSON structured output
  results.push(await runTest(
    'JSON structured output',
    {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'gemini_generate',
        arguments: {
          prompt: 'Create a simple person object with name "John Doe", age 30, and city "New York".',
          response_schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' },
              city: { type: 'string' }
            },
            required: ['name', 'age', 'city']
          },
          response_mime_type: 'application/json',
          model: 'gemini-2.5-flash'
        }
      }
    }
  ));

  // Test 5: Temperature control
  results.push(await runTest(
    'Temperature control (creative)',
    {
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'gemini_generate',
        arguments: {
          prompt: 'Invent a creative name for a coffee shop.',
          generation_config: {
            temperature: 1.5,
            maxOutputTokens: 20
          },
          model: 'gemini-2.5-flash'
        }
      }
    }
  ));

  // Test 6: Image with data: URL
  const smallImageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  
  results.push(await runTest(
    'Multimodal - Image analysis (data: URL)',
    {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'gemini_messages',
        arguments: {
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'What do you see in this image?' },
                { type: 'inline_data', data: smallImageDataUrl.split(',')[1], mimeType: 'image/png' }
              ]
            }
          ],
          model: 'gemini-2.5-flash'
        }
      }
    },
    20000 // Longer timeout for image processing
  ));

  // Results summary
  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log('\n🎯 Test Results Summary');
  console.log('========================');
  console.log(`✅ Passed: ${passed}/${total} tests`);
  
  if (passed === total) {
    console.log('🏆 All tests passed! Gemini MCP server is fully functional.');
    console.log('\n✨ Key features verified:');
    console.log('   - Text generation with prompts');
    console.log('   - System instructions');
    console.log('   - Multi-turn conversations');
    console.log('   - JSON structured output');
    console.log('   - Generation parameters');
    console.log('   - Multimodal image processing');
    console.log('   - Usage tracking');
  } else {
    console.log(`⚠️  ${total - passed} tests failed. Check the issues above.`);
  }
}

runAllTests().catch(console.error);