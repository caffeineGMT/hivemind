#!/usr/bin/env node

/**
 * XSS Injection Test Script
 * Tests that the Hivemind dashboard properly sanitizes user inputs
 */

import { sanitizeInput, sanitizeStrict } from '../src/utils/sanitize.js';

console.log('🧪 Testing XSS Sanitization\n');

const xssTests = [
  {
    name: 'Script tag injection',
    input: '<script>alert("xss")</script>Hello',
    shouldContain: 'Hello',
    shouldNotContain: '<script>',
  },
  {
    name: 'Img tag with onerror',
    input: '<img src=x onerror="alert(\'xss\')">',
    shouldContain: '',
    shouldNotContain: 'onerror',
  },
  {
    name: 'Event handler attribute',
    input: '<div onclick="alert(\'xss\')">Click me</div>',
    shouldContain: 'Click me',
    shouldNotContain: 'onclick',
  },
  {
    name: 'JavaScript protocol in link',
    input: '<a href="javascript:alert(\'xss\')">Click</a>',
    shouldContain: 'Click',
    shouldNotContain: 'javascript:',
  },
  {
    name: 'Safe HTML - bold',
    input: '<b>Bold text</b>',
    shouldContain: '<b>Bold text</b>',
    shouldNotContain: null,
  },
  {
    name: 'Safe HTML - link',
    input: '<a href="https://example.com">Link</a>',
    shouldContain: 'https://example.com',
    shouldNotContain: null,
  },
  {
    name: 'SVG with script',
    input: '<svg><script>alert("xss")</script></svg>',
    shouldContain: '',
    shouldNotContain: '<script>',
  },
  {
    name: 'Iframe injection',
    input: '<iframe src="https://evil.com"></iframe>',
    shouldContain: '',
    shouldNotContain: '<iframe>',
  },
  {
    name: 'Data URL in img',
    input: '<img src="data:text/html,<script>alert(\'xss\')</script>">',
    shouldContain: '',
    shouldNotContain: '<script>',
  },
];

const strictTests = [
  {
    name: 'All HTML removed',
    input: '<b>Bold</b> text',
    expected: 'Bold text',
  },
  {
    name: 'Script tag removed',
    input: '<script>alert("xss")</script>Clean',
    expected: 'Clean',
  },
];

let passed = 0;
let failed = 0;

console.log('📋 Testing sanitizeInput (allows safe HTML):\n');

for (const test of xssTests) {
  const result = sanitizeInput(test.input);
  let testPassed = true;
  const errors = [];

  if (test.shouldContain && !result.includes(test.shouldContain)) {
    testPassed = false;
    errors.push(`Missing expected content: "${test.shouldContain}"`);
  }

  if (test.shouldNotContain && result.includes(test.shouldNotContain)) {
    testPassed = false;
    errors.push(`Dangerous content not removed: "${test.shouldNotContain}"`);
  }

  if (testPassed) {
    console.log(`✅ ${test.name}`);
    passed++;
  } else {
    console.log(`❌ ${test.name}`);
    console.log(`   Input:  "${test.input}"`);
    console.log(`   Output: "${result}"`);
    errors.forEach(err => console.log(`   Error:  ${err}`));
    failed++;
  }
}

console.log('\n📋 Testing sanitizeStrict (removes all HTML):\n');

for (const test of strictTests) {
  const result = sanitizeStrict(test.input);
  const testPassed = result === test.expected;

  if (testPassed) {
    console.log(`✅ ${test.name}`);
    passed++;
  } else {
    console.log(`❌ ${test.name}`);
    console.log(`   Input:    "${test.input}"`);
    console.log(`   Expected: "${test.expected}"`);
    console.log(`   Got:      "${result}"`);
    failed++;
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`${'='.repeat(50)}\n`);

if (failed > 0) {
  console.log('❌ XSS protection tests FAILED');
  process.exit(1);
} else {
  console.log('✅ All XSS protection tests PASSED');
  process.exit(0);
}
