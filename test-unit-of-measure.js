#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const { getDatabase } = require('./src/database/schema');

const API_KEY = process.env.FLEX_API_KEY;
const BASE_URL = process.env.FLEX_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'X-Auth-Token': API_KEY, 'Content-Type': 'application/json' },
  timeout: 30000
});

async function testUnitOfMeasure() {
  console.log('\n🔍 Testing Unit of Measure Endpoints\n');
  console.log('='.repeat(70) + '\n');

  const db = getDatabase();
  const uomIds = db.prepare(`
    SELECT DISTINCT unit_of_measure_id
    FROM pricing_models
    WHERE unit_of_measure_id IS NOT NULL
  `).all().map(r => r.unit_of_measure_id);

  console.log(`📋 Found ${uomIds.length} unique unit of measure ID(s)\n`);

  const tests = [
    { name: 'unit-of-measure', endpoint: `/unit-of-measure/${uomIds[0]}` },
    { name: 'uom', endpoint: `/uom/${uomIds[0]}` },
    { name: 'measure', endpoint: `/measure/${uomIds[0]}` }
  ];

  for (const test of tests) {
    try {
      const response = await api.get(test.endpoint);
      console.log(`✅ ${test.name}: FOUND (${Object.keys(response.data).length} fields)`);
      console.log(JSON.stringify(response.data, null, 2));
      console.log('---');
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.response?.status || error.message}`);
    }
    await new Promise(r => setTimeout(r, 120));
  }
}

testUnitOfMeasure().catch(console.error);
