import WebSocket from 'ws';

console.log('🔌 Connecting to WebSocket server at ws://localhost:3100...');

const ws = new WebSocket('ws://localhost:3100');

ws.on('open', () => {
  console.log('✅ WebSocket connected successfully');
  console.log('📡 Waiting for messages...');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('📨 Received message:', {
      event: message.event,
      timestamp: message.timestamp,
      data: message.data
    });
  } catch (err) {
    console.error('❌ Failed to parse message:', err);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', () => {
  console.log('🔌 WebSocket connection closed');
  process.exit(0);
});

// Keep connection open for 5 seconds to receive messages
setTimeout(() => {
  console.log('⏱️  Test timeout - closing connection');
  ws.close();
}, 5000);
