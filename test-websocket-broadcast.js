import WebSocket from 'ws';

console.log('🔌 Connecting to WebSocket server...');

const ws = new WebSocket('ws://localhost:3100');

ws.on('open', async () => {
  console.log('✅ WebSocket connected');
  console.log('📡 Listening for real-time updates...\n');

  // Trigger a test event via API after connection
  setTimeout(async () => {
    console.log('🧪 Triggering test API call to generate WebSocket event...');

    try {
      const response = await fetch('http://localhost:3100/api/companies');
      const companies = await response.json();

      if (companies && companies.length > 0) {
        const companyId = companies[0].id;
        console.log(`📤 Posting test comment to company ${companyId.slice(0, 8)}...`);

        // Post a nudge which should trigger a broadcast
        await fetch(`http://localhost:3100/api/companies/${companyId}/nudge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'WebSocket test nudge' })
        });

        console.log('✅ Test API call sent - waiting for WebSocket event...\n');
      }
    } catch (err) {
      console.error('❌ API call failed:', err.message);
    }
  }, 1000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('🎉 REAL-TIME EVENT RECEIVED:');
    console.log('   Event:', message.event);
    console.log('   Data:', JSON.stringify(message.data, null, 2));
    console.log('   Timestamp:', message.timestamp);
    console.log('');
  } catch (err) {
    console.error('❌ Failed to parse message:', err);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('🔌 Connection closed');
  process.exit(0);
});

// Keep connection open for 10 seconds
setTimeout(() => {
  console.log('⏱️  Test complete - closing connection');
  ws.close();
}, 10000);
