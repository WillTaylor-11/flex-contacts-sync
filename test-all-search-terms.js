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

async function testAllSearchTerms() {
  console.log('\n🔍 Testing All 2-Letter Search Terms for Maximum Coverage\n');
  console.log('='.repeat(70) + '\n');

  // Test all 2-letter combinations + numbers
  const letters = 'abcdefghijklmnopqrstuvwxyz0123456789 -'.split('');
  const testTerms = [];

  // Create pairs
  for (let i = 0; i < letters.length; i++) {
    for (let j = 0; j < letters.length; j++) {
      testTerms.push(letters[i] + letters[j]);
      if (testTerms.length >= 50) break; // Limit to 50 tests for speed
    }
    if (testTerms.length >= 50) break;
  }

  const results = [];
  let maxFound = 0;
  let bestTerm = '';

  console.log(`Testing ${testTerms.length} search terms...\n`);

  for (let i = 0; i < testTerms.length; i++) {
    const term = testTerms[i];
    try {
      const response = await api.get('/inventory-model/search', {
        params: { searchText: term, page: 0, size: 1 }
      });

      const total = response.data.totalElements || 0;
      results.push({ term, total });

      if (total > maxFound) {
        maxFound = total;
        bestTerm = term;
      }

      if (i % 10 === 0 || i === testTerms.length - 1) {
        process.stdout.write(`\r   Progress: ${i + 1}/${testTerms.length} | Best: "${bestTerm}" = ${maxFound} items`);
      }

    } catch (error) {
      // Skip errors
    }
    await new Promise(r => setTimeout(r, 50));
  }

  console.log('\n\n' + '='.repeat(70));

  // Sort by count
  results.sort((a, b) => b.total - a.total);

  console.log('\n📊 Top 20 Search Terms:\n');
  results.slice(0, 20).forEach((r, i) => {
    console.log(`   ${(i + 1).toString().padStart(2)}. "${r.term}" = ${r.total} items`);
  });

  console.log('\n' + '='.repeat(70));
  console.log(`\n✅ Best search term: "${bestTerm}" returns ${maxFound} inventory models`);

  // Test if we can use an empty space or special character
  console.log('\n🔍 Testing Special Characters...\n');

  const specialTests = [
    '  ', '- ', '/ ', '. ', ', ', ': ', '( ', '[ ', '{ ',
    '0 ', '1 ', '2 ', 'a ', 'b ', 'c ', 'd ', 'e '
  ];

  let specialMax = 0;
  let specialBest = '';

  for (const term of specialTests) {
    try {
      const response = await api.get('/inventory-model/search', {
        params: { searchText: term, page: 0, size: 1 }
      });

      const total = response.data.totalElements || 0;
      if (total > 0) {
        console.log(`   "${term}" = ${total} items`);
        if (total > specialMax) {
          specialMax = total;
          specialBest = term;
        }
      }

    } catch (error) {
      // Skip
    }
    await new Promise(r => setTimeout(r, 50));
  }

  if (specialMax > maxFound) {
    console.log(`\n✅ Even better! "${specialBest}" returns ${specialMax} items\n`);
  } else {
    console.log(`\n⚠️  No better term found. Stick with "${bestTerm}" (${maxFound} items)\n`);
  }

  const fs = require('fs');
  fs.writeFileSync('./search-term-analysis.json', JSON.stringify({
    bestTerm: specialMax > maxFound ? specialBest : bestTerm,
    maxItems: Math.max(specialMax, maxFound),
    top20: results.slice(0, 20)
  }, null, 2));
  console.log('💾 Analysis saved to: search-term-analysis.json\n');
}

testAllSearchTerms().catch(console.error);
