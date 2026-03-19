# WebSocket Infinite Retry + Exponential Backoff - Test Plan

## Implementation Summary

✅ **Infinite Retry**: No `maxRetries` limit - WebSocket will retry forever
✅ **Exponential Backoff**: Starts at 1s, grows by 2x each attempt, capped at 30s
✅ **Visual Indicators**: Connection status shown in header with attempt count
✅ **Toast Notifications**: User sees success/warning toasts on connection events
✅ **ConnectionBanner**: Detailed status after 10s of disconnection

## Testing Instructions

### 1. Start the application

```bash
# Terminal 1: Start the backend server
cd /Users/michaelguo/hivemind-engine
npm start

# Terminal 2: Start the UI dev server
cd /Users/michaelguo/hivemind-engine/ui
npm run dev
```

### 2. Test: Initial Connection

**Expected:**
- Status indicator shows "● Live" (green) with latency (e.g., "24ms")
- No toast notifications on first connect

**Verify:**
- Open http://localhost:5173
- Check top-right header for connection status
- Should show green indicator with latency

### 3. Test: Connection Loss & Recovery

**Steps:**
1. Stop the backend server (Ctrl+C in terminal 1)
2. Watch the UI behavior

**Expected:**
- **Attempt 1**: Toast shows "⚠ Connection lost - Attempting to reconnect..."
- Status indicator shows "◌ Connecting (1)" with amber color
- ConnectionBanner appears after 10s showing:
  - "Reconnecting... (attempt 1)"
  - "Reconnecting in Xs" countdown
  - "Reconnect Now" button

**Then:**
- **Attempt 3**: Toast shows "⚠ Connection unstable - Retrying in background..."
- Status indicator shows "⚠ Unstable (3)" with pulsing warning icon
- ConnectionBanner shows attempt count increasing

### 4. Test: Exponential Backoff Verification

**Watch the reconnection intervals:**
- Attempt 1: ~1 second delay
- Attempt 2: ~2 seconds delay
- Attempt 3: ~4 seconds delay
- Attempt 4: ~8 seconds delay
- Attempt 5: ~16 seconds delay
- Attempt 6+: ~30 seconds (max ceiling)

**Verify:**
- ConnectionBanner countdown timer matches these intervals
- No attempt happens sooner than expected

### 5. Test: Infinite Retry (No Give Up)

**Steps:**
1. Leave server stopped for 5+ minutes
2. Watch attempt counter increase indefinitely

**Expected:**
- Counter keeps incrementing: (7), (8), (9), (10), (11)...
- No "permanently disconnected" state
- Backoff stays at 30s maximum
- ConnectionBanner remains visible with countdown

### 6. Test: Successful Reconnection

**Steps:**
1. While disconnected (after multiple attempts), restart the backend server
2. Watch the UI reconnect

**Expected:**
- Toast shows "✓ Reconnected successfully! - Real-time updates are now active"
- Status indicator changes to "● Live" (green) with latency
- ConnectionBanner disappears
- Attempt counter resets to 0

### 7. Test: Manual Reconnect Button

**Steps:**
1. While disconnected, click "Reconnect Now" button in ConnectionBanner
2. Watch behavior

**Expected:**
- Immediate reconnection attempt (bypasses countdown)
- Status changes to "Connecting..."
- If server is up, connects immediately
- If server is down, resumes exponential backoff

### 8. Test: Pending Mutations Queue

**Steps:**
1. While connected, make a change (e.g., update a task)
2. Immediately stop the backend server
3. Make another change while disconnected

**Expected:**
- ConnectionBanner shows "2 pending changes" indicator
- Changes are queued
- When server restarts, queued changes are sent immediately
- No data loss

### 9. Test: Mobile View

**Steps:**
1. Open DevTools, toggle mobile view (iPhone 14 Pro)
2. Repeat tests 3-6

**Expected:**
- Connection status visible in mobile header (top-right)
- ConnectionBanner is mobile-responsive
- Toast notifications appear correctly on mobile
- Touch targets are adequate (44px minimum)

### 10. Test: Extended Outage (5-minute stress test)

**Steps:**
1. Stop backend server
2. Wait 5 full minutes
3. Watch behavior throughout

**Expected:**
- No errors or crashes
- Attempt counter reaches ~10-15 attempts
- All attempts use 30s backoff (after attempt 5)
- ConnectionBanner stays visible
- No memory leaks (check DevTools Performance/Memory)
- When server restarts, reconnects within 1-30s

## Acceptance Criteria Checklist

- [ ] ✅ No maxRetries limit (infinite attempts)
- [ ] ✅ Backoff capped at 30 seconds
- [ ] ✅ User sees connection status in header
- [ ] ✅ Toast notification on connection loss
- [ ] ✅ Toast notification on reconnect success
- [ ] ✅ Toast notification for unstable connection (3+ attempts)
- [ ] ✅ Attempt counter displayed
- [ ] ✅ Countdown timer shows time until next attempt
- [ ] ✅ ConnectionBanner shows after 10s of disconnection
- [ ] ✅ Manual "Reconnect Now" button works
- [ ] ✅ Test: survives 5-minute server outage
- [ ] ✅ Mutation queue preserves pending changes
- [ ] ✅ Mobile responsive

## Implementation Details

### Files Modified

1. **ui/src/websocket.ts**
   - Added `import { toast } from 'sonner'`
   - Added `wasConnected` flag to track reconnection state
   - Added toast notifications in 'open' and 'close' event handlers
   - Toast on reconnect success (only if previously connected)
   - Toast on first disconnect
   - Toast on attempt #3 for unstable connection

2. **ui/src/App.tsx**
   - Added `import { Toaster } from 'sonner'`
   - Added `<Toaster>` component with dark theme styling
   - Positioned at top-right

3. **ui/src/components/WebSocketStatus.tsx**
   - Added `AlertTriangle` icon import
   - Enhanced connecting state to show "Unstable" after 3+ attempts
   - Added pulsing warning icon for unstable connections
   - Enhanced disconnected state with warning icon

4. **ui/package.json**
   - Added `sonner: ^1.x` dependency

### Existing Features (Already Implemented)

- **Infinite retry**: `maxRetries: Infinity` (websocket.ts:64)
- **Exponential backoff**: `reconnectionDelayGrowFactor: 2` (websocket.ts:65)
- **Max backoff ceiling**: `maxReconnectionDelay: 30000` (websocket.ts:66)
- **Min backoff**: `minReconnectionDelay: 1000` (websocket.ts:67)
- **Connection state tracking**: Full `ConnectionState` type with attempt counter
- **Ping/latency monitoring**: Shows real-time latency in header
- **Mutation queue**: Preserves pending changes during disconnection
- **ConnectionBanner**: Shows detailed reconnection info after 10s
- **Manual reconnect**: "Reconnect Now" button in banner

## Known Issues / Notes

1. **Build warning**: Recharts missing `react-is` dependency (pre-existing issue, not introduced by this task)
2. **Toast library**: Using `sonner` (modern, lightweight, zero-config)
3. **Toast theme**: Customized to match Hivemind dark zinc theme
4. **Toast duration**: 3-5s (warning toasts slightly longer for visibility)

## Future Enhancements (Optional)

- [ ] Add "Connection restored" sound effect (opt-in via settings)
- [ ] Show network speed indicator (Fast/Slow/Very Slow)
- [ ] Add offline mode with local data persistence
- [ ] Show "Last successful sync" timestamp during extended outages
- [ ] Add retry backoff curve visualization in ConnectionBanner
