# Performance Fixes for ERR_INSUFFICIENT_RESOURCES

## Problem Description

The application was experiencing massive `net::ERR_INSUFFICIENT_RESOURCES` errors due to:

1. **Excessive API calls** - Multiple overlapping intervals making hundreds of requests per minute
2. **SignalR connection issues** - Multiple connections being created without proper cleanup
3. **Resource exhaustion** - Browser running out of network connections and memory

## Applied Fixes

### 1. SignalR Connection Optimization

**File: `src/App.js`**
- Added connection state checking to prevent multiple connections
- Improved reconnection strategy with more reasonable delays
- Added proper cleanup of global references
- Reduced logging level from `Information` to `Warning`

**Before:**
```javascript
.withAutomaticReconnect()
.configureLogging(LogLevel.Information)
```

**After:**
```javascript
.withAutomaticReconnect([0, 2000, 10000, 30000])
.configureLogging(LogLevel.Warning)
```

### 2. API Call Debouncing

**File: `src/utils/apiDebouncer.js`**
- Created global debouncing mechanism for API calls
- Prevents multiple identical requests within 1 second
- Automatically cleans up pending requests

**Usage:**
```javascript
import { debouncedApiCall } from './utils/apiDebouncer';

// Instead of direct API call
const result = await debouncedApiCall('unique-key', () => fetch('/api/endpoint'));
```

### 3. Interval Optimization

**File: `src/components/DirectChat.js`**
- Reduced refresh frequency from 1 second to 5 seconds
- Added proper cleanup with `isDestroyed` flag
- Implemented smarter refresh logic based on user activity
- Reduced performance monitoring frequency

**Before:**
```javascript
return 1000; // 1 saniye (kullanıcı aktifken çok hızlı!)
```

**After:**
```javascript
return 5000; // 5 saniye (daha makul)
```

### 4. Resource Monitoring

**File: `src/App.js`**
- Added resource usage monitoring
- Automatic rate limiting when too many requests detected
- Memory usage warnings
- Automatic cleanup of pending operations

### 5. Event Handler Optimization

**File: `src/YoneticiPaneli.js`**
- Reduced SignalR connection check frequency from 1s to 2s
- Increased periodic refresh from 5 minutes to 10 minutes
- Added debouncing to API calls in event handlers
- Removed unnecessary API calls in SignalR events

## Key Changes Summary

| Component | Before | After | Improvement |
|-----------|--------|-------|-------------|
| DirectChat refresh | 1 second | 5 seconds | 80% reduction |
| SignalR checks | 1 second | 2 seconds | 50% reduction |
| Periodic refresh | 5 minutes | 10 minutes | 50% reduction |
| API debouncing | None | 1 second | Prevents duplicates |
| Resource monitoring | None | 30 seconds | Prevents exhaustion |

## Prevention Guidelines

### 1. Always Clean Up Intervals and Timeouts

```javascript
useEffect(() => {
  const intervalId = setInterval(() => {}, 1000);
  
  return () => {
    clearInterval(intervalId); // Always cleanup!
  };
}, []);
```

### 2. Use Debouncing for API Calls

```javascript
// Instead of multiple rapid calls
const handleClick = () => {
  fetch('/api/endpoint'); // ❌ Can cause multiple calls
};

// Use debouncing
const handleClick = () => {
  debouncedApiCall('unique-key', () => fetch('/api/endpoint')); // ✅ Debounced
};
```

### 3. Check Connection State Before Creating New Ones

```javascript
// Before creating new connection
if (connectionRef.current && connectionRef.current.state === 'Connected') {
  return; // Don't create duplicate
}
```

### 4. Implement Rate Limiting

```javascript
const maxRequestsPerMinute = 30;
let requestCount = 0;

const makeRequest = () => {
  if (requestCount > maxRequestsPerMinute) {
    console.warn('Rate limit exceeded');
    return;
  }
  requestCount++;
  // Make request...
};
```

### 5. Monitor Resource Usage

```javascript
// Check active requests
const activeRequests = performance.getEntriesByType('resource').filter(
  entry => entry.initiatorType === 'fetch' && 
  Date.now() - entry.startTime < 60000
);

if (activeRequests.length > 50) {
  // Implement rate limiting
}
```

## Testing the Fixes

1. **Monitor Network Tab** - Should see significantly fewer failed requests
2. **Check Console** - Look for resource monitoring warnings
3. **Performance Tab** - Memory usage should be more stable
4. **SignalR** - Should see single connection with proper reconnection

## Expected Results

- ✅ No more `ERR_INSUFFICIENT_RESOURCES` errors
- ✅ Reduced API call frequency (80% reduction)
- ✅ Stable SignalR connection
- ✅ Better memory management
- ✅ Improved overall performance

## Monitoring

The application now includes automatic monitoring that will:
- Warn when too many API requests are made
- Alert on high memory usage
- Automatically clear pending operations when needed
- Log performance issues for debugging

## Future Improvements

1. **Implement proper caching** for frequently accessed data
2. **Add request queuing** for high-priority operations
3. **Implement exponential backoff** for failed requests
4. **Add user activity detection** to pause operations when inactive
5. **Implement service worker** for offline capabilities
