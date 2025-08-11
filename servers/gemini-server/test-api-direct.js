#!/usr/bin/env node

/**
 * Direct API Test - Test the Gemini API key directly
 */

import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔍 Direct Gemini API Test');
console.log('==========================\n');

const API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

if (!API_KEY) {
  console.log('❌ GEMINI_API_KEY not found in environment');
  process.exit(1);
}

console.log(`✅ API Key loaded: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}`);

async function testAPIKey() {
  console.log('Testing API key validity...\n');

  try {
    // Test 1: List models (simple API test)
    console.log('Test 1: List available models');
    const modelsUrl = `${BASE_URL}/models?key=${API_KEY}`;
    
    const modelsResponse = await fetch(modelsUrl);
    console.log(`Status: ${modelsResponse.status} ${modelsResponse.statusText}`);
    
    if (modelsResponse.ok) {
      const models = await modelsResponse.json();
      console.log(`✅ Found ${models.models?.length || 0} models`);
      
      // Show first few models
      if (models.models && models.models.length > 0) {
        console.log('Available models:');
        models.models.slice(0, 5).forEach(model => {
          console.log(`  - ${model.name}`);
        });
      }
    } else {
      const errorText = await modelsResponse.text();
      console.log(`❌ Models API failed: ${errorText}`);
      return false;
    }

    console.log('\nTest 2: Simple generation request');
    
    // Test 2: Simple generation
    const genUrl = `${BASE_URL}/models/gemini-2.5-flash:generateContent`;
    
    const requestBody = {
      contents: [{
        parts: [{ text: 'Say "API test successful" and nothing else.' }]
      }]
    };

    console.log('Making generation request...');
    const genResponse = await fetch(genUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY
      },
      body: JSON.stringify(requestBody)
    });

    console.log(`Status: ${genResponse.status} ${genResponse.statusText}`);

    if (genResponse.ok) {
      const result = await genResponse.json();
      console.log('✅ Generation successful!');
      
      if (result.candidates && result.candidates[0]) {
        const text = result.candidates[0].content?.parts?.[0]?.text || 'No text returned';
        console.log(`Response: ${text}`);
        
        if (result.usageMetadata) {
          console.log(`Tokens used: ${result.usageMetadata.totalTokenCount}`);
        }
      }
      
      return true;
    } else {
      const errorText = await genResponse.text();
      console.log(`❌ Generation failed: ${errorText}`);
      return false;
    }

  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
    return false;
  }
}

// Test the API key
testAPIKey().then(success => {
  console.log('\n📋 API Test Results');
  console.log('===================');
  if (success) {
    console.log('🎉 API key is valid and working!');
    console.log('✅ Ready to test MCP server');
  } else {
    console.log('❌ API key test failed');
    console.log('⚠️  Check your API key and network connectivity');
  }
}).catch(console.error);