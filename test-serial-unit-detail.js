#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.FLEX_API_KEY;
const BASE_URL = process.env.FLEX_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'X-Auth-Token': API_KEY, 'Content-Type': 'application/json' },
  timeout: 30000
});

async function testSerialUnitDetail() {
  console.log('\n🔍 Testing Serial Unit Detail Endpoint\n');
  console.log('='.repeat(70) + '\n');

  // Known serial unit ID from previous test
  const serialUnitId = 'eb1fbe4a-f7b3-4b5b-b1d8-dc072914265b';

  console.log(`Testing with serial unit ID: ${serialUnitId}\n`);

  try {
    const response = await api.get(`/serial-unit/${serialUnitId}`);
    const data = response.data;

    console.log('✅ Detail endpoint successful!\n');
    console.log('Response structure:\n');
    console.log(JSON.stringify(data, null, 2));

    console.log('\n' + '='.repeat(70));
    console.log('\n📋 Available fields:\n');
    Object.keys(data).forEach(key => {
      const value = data[key];
      const type = Array.isArray(value) ? 'array' : typeof value;
      const sample = type === 'string' ? value.substring(0, 50) :
                     type === 'array' ? `[${value.length} items]` :
                     value;
      console.log(`   ${key}: ${type} = ${sample}`);
    });
    console.log('');

    // Save to file
    const fs = require('fs');
    fs.writeFileSync('./serial-unit-detail-sample.json', JSON.stringify(data, null, 2));
    console.log('💾 Saved to: serial-unit-detail-sample.json\n');

  } catch (error) {
    console.error(`❌ Error: ${error.response?.status || error.message}`);
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
  }

  console.log('='.repeat(70) + '\n');
}

testSerialUnitDetail().catch(console.error);
