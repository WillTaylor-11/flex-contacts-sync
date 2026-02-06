#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.FLEX_API_KEY;
const BASE_URL = process.env.FLEX_BASE_URL;

console.log('\n🔍 Testing Flex API Connection\n');
console.log('Base URL:', BASE_URL);
console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 10)}...` : 'NOT SET');
console.log('\n' + '='.repeat(60) + '\n');

async function testApi() {
  try {
    // Test 1: Simple GET request to /contact
    console.log('Test 1: GET /contact');
    const response1 = await axios.get(`${BASE_URL}/contact`, {
      headers: { 'X-Auth-Token': API_KEY }
    });

    console.log('Status:', response1.status);
    console.log('Response type:', typeof response1.data);
    console.log('Is array?:', Array.isArray(response1.data));

    if (Array.isArray(response1.data)) {
      console.log('Number of contacts:', response1.data.length);
      if (response1.data.length > 0) {
        console.log('\nFirst contact structure:');
        console.log(JSON.stringify(response1.data[0], null, 2));
      }
    } else {
      console.log('Response data:');
      console.log(JSON.stringify(response1.data, null, 2));
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 2: Try with identity endpoint
    console.log('Test 2: GET /contact/identity');
    try {
      const response2 = await axios.get(`${BASE_URL}/contact/identity`, {
        headers: { 'X-Auth-Token': API_KEY }
      });
      console.log('Status:', response2.status);
      console.log('Response type:', typeof response2.data);
      console.log('Is array?:', Array.isArray(response2.data));
      if (Array.isArray(response2.data)) {
        console.log('Number of contacts:', response2.data.length);
      }
    } catch (err) {
      console.log('Error:', err.response?.status, err.response?.statusText);
    }

    console.log('\n' + '='.repeat(60) + '\n');

    // Test 3: Try listing with the correct endpoint structure
    console.log('Test 3: GET /contact (with Accept header)');
    const response3 = await axios.get(`${BASE_URL}/contact`, {
      headers: {
        'X-Auth-Token': API_KEY,
        'Accept': 'application/json'
      }
    });
    console.log('Status:', response3.status);
    console.log('Response headers:', response3.headers);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Response:', error.response.data);
    }
  }
}

testApi();
