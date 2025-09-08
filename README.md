# ryxu-xo-autoplay

A powerful and flexible autoplay API for Lavalink client bots with advanced error handling, comprehensive event system, and support for multiple music platforms.

## Features

- 🎵 **Multi-Platform Support**: YouTube, Spotify, and SoundCloud
- 🔄 **Smart Autoplay**: Intelligent track selection based on current playing track
- 📡 **Event System**: Comprehensive event handling for better bot integration
- 🛡️ **Error Handling**: Robust error handling with retry mechanisms and rate limiting
- ⚡ **Performance**: Optimized HTTP requests with connection pooling
- 🔧 **TypeScript**: Full TypeScript support with comprehensive type definitions
- 🧪 **Tested**: Extensive test coverage for reliability

## Installation

```bash
npm install ryxu-xo-autoplay
```

## Quick Start

```typescript
import { LavalinkAutoplay } from 'ryxu-xo-autoplay';

// Create autoplay instance
const autoplay = new LavalinkAutoplay({
  enableEvents: true,
  timeout: 10000,
  maxRetries: 3
});

// Get next track for autoplay
const trackInfo = {
  identifier: 'dQw4w9WgXcQ',
  sourceName: 'youtube',
  isSeekable: true,
  author: 'Rick Astley',
  length: 212000,
  isStream: false,
  position: 0,
  title: 'Never Gonna Give You Up',
  uri: 'https://youtube.com/watch?v=dQw4w9WgXcQ'
};

const result = await autoplay.getNextTrack(trackInfo);

if (result.success) {
  console.log('Next track:', result.url);
  // Use result.url with your Lavalink client
} else {
  console.error('Autoplay failed:', result.error);
}
```

## Configuration

### Basic Configuration

```typescript
const autoplay = new LavalinkAutoplay({
  maxRetries: 3,           // Maximum retry attempts
  timeout: 10000,          // Request timeout in milliseconds
  enableEvents: true,      // Enable event system
  rateLimitDelay: 1000,    // Rate limiting delay
  userAgent: 'MyBot/1.0',  // Custom user agent
  customHeaders: {         // Additional headers
    'X-Custom': 'value'
  }
});
```

### Provider-Specific Configuration

```typescript
const autoplay = new LavalinkAutoplay({}, {
  spotify: {
    totpSecret: 'your-secret-key',
    maxRecommendations: 20
  },
  soundcloud: {
    maxTracks: 50,
    baseUrl: 'https://soundcloud.com'
  },
  youtube: {
    enableRadioMode: true
  }
});
```

## Event System

The autoplay system provides comprehensive events for better integration:

```typescript
const eventEmitter = autoplay.getEventEmitter();

// Listen to specific events
eventEmitter.onEvent('trackFound', (data) => {
  console.log('Found track:', data.result?.url);
});

eventEmitter.onEvent('error', (data) => {
  console.error('Autoplay error:', data.error?.message);
});

eventEmitter.onEvent('rateLimited', (data) => {
  console.warn('Rate limited for:', data.source);
});

// Listen to all events
eventEmitter.onAllEvents((data) => {
  console.log(`[${data.type}]`, data);
});
```

### Available Events

- `trackFound`: When a new track is found for autoplay
- `trackNotFound`: When no tracks are available
- `error`: General error occurred
- `providerError`: Provider-specific error
- `rateLimited`: Rate limiting triggered
- `timeout`: Request timeout occurred
- `success`: Successful autoplay operation

## API Reference

### LavalinkAutoplay

#### Constructor

```typescript
new LavalinkAutoplay(config?: AutoplayConfig, providerConfig?: ProviderConfig)
```

#### Methods

##### `getNextTrack(trackInfo: LavalinkTrackInfo): Promise<AutoplayResult>`

Get the next track for autoplay based on current track information.

**Parameters:**
- `trackInfo`: Current track information from Lavalink

**Returns:** Promise resolving to autoplay result

##### `getEventEmitter(): AutoplayEventEmitter`

Get the event emitter for listening to autoplay events.

##### `getAvailableProviders(): AutoplaySource[]`

Get list of available autoplay providers.

##### `hasProvider(source: AutoplaySource): boolean`

Check if a specific provider is available.

##### `getProviderInfo(source: AutoplaySource): ProviderInfo | null`

Get information about a specific provider.

##### `clearRateLimit(source?: AutoplaySource): void`

Clear rate limiting for a specific source or all sources.

##### `getRateLimitStatus(): Map<AutoplaySource, number>`

Get current rate limiting status.

##### `updateConfig(newConfig: Partial<AutoplayConfig>): void`

Update autoplay configuration.

### Types

#### LavalinkTrackInfo

```typescript
interface LavalinkTrackInfo {
  identifier: string;
  isSeekable: boolean;
  author: string;
  length: number;
  isStream: boolean;
  position: number;
  title: string;
  uri: string;
  sourceName: AutoplaySource;
  artworkUrl?: string;
  isrc?: string;
}
```

#### AutoplayResult

```typescript
interface AutoplayResult {
  success: boolean;
  url?: string;
  trackId?: string;
  source?: AutoplaySource;
  error?: string;
  metadata?: Record<string, any>;
}
```

#### AutoplayConfig

```typescript
interface AutoplayConfig {
  maxRetries?: number;
  timeout?: number;
  enableEvents?: boolean;
  rateLimitDelay?: number;
  userAgent?: string;
  customHeaders?: Record<string, string>;
}
```

## Providers

### YouTube Provider

Automatically creates radio mode URLs for continuous playback:

```typescript
// Input: https://youtube.com/watch?v=dQw4w9WgXcQ
// Output: https://youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ
```

### Spotify Provider

Uses Spotify's recommendations API to find similar tracks:

```typescript
// Requires valid Spotify track ID
// Uses TOTP authentication for API access
// Returns Spotify track URLs
```

### SoundCloud Provider

Fetches recommended tracks from SoundCloud:

```typescript
// Scrapes SoundCloud's recommended page
// Returns random track from recommendations
// Supports custom base URL configuration
```

## Error Handling

The library provides comprehensive error handling with specific error types:

```typescript
import { AutoplayError, ProviderError, RateLimitError, TimeoutError } from 'ryxu-xo-autoplay';

try {
  const result = await autoplay.getNextTrack(trackInfo);
} catch (error) {
  if (error instanceof RateLimitError) {
    // Handle rate limiting
    console.log('Retry after:', error.retryAfter);
  } else if (error instanceof TimeoutError) {
    // Handle timeout
    console.log('Timeout after:', error.timeout);
  } else if (error instanceof ProviderError) {
    // Handle provider-specific error
    console.log('Provider error:', error.provider);
  }
}
```

## Advanced Usage

### Custom Provider

```typescript
import { BaseProvider, AutoplaySource, LavalinkTrackInfo, AutoplayResult } from 'ryxu-xo-autoplay';

class CustomProvider extends BaseProvider {
  public readonly name: AutoplaySource = 'custom';

  canHandle(trackInfo: LavalinkTrackInfo): boolean {
    return trackInfo.sourceName === 'custom';
  }

  async getNextTrack(trackInfo: LavalinkTrackInfo): Promise<AutoplayResult> {
    // Your custom autoplay logic
    return this.createSuccessResult('https://example.com/track');
  }
}
```

### Event-Driven Integration

```typescript
// Discord.js integration example
const autoplay = new LavalinkAutoplay({ enableEvents: true });

autoplay.getEventEmitter().onEvent('trackFound', (data) => {
  // Add track to queue
  player.queue.add(data.result?.url);
  
  // Notify user
  interaction.followUp(`🎵 Autoplay: Found next track!`);
});

autoplay.getEventEmitter().onEvent('error', (data) => {
  // Log error
  console.error('Autoplay error:', data.error);
  
  // Notify user
  interaction.followUp(`❌ Autoplay failed: ${data.error?.message}`);
});
```

## Performance Tips

1. **Reuse Instances**: Create one autoplay instance and reuse it
2. **Event Filtering**: Only listen to events you need
3. **Rate Limiting**: Respect rate limits to avoid blocking
4. **Timeout Configuration**: Adjust timeouts based on your needs
5. **Provider Selection**: Use the most appropriate provider for each source

## Troubleshooting

### Common Issues

**Rate Limiting**
```typescript
// Check rate limit status
const status = autoplay.getRateLimitStatus();
console.log('Rate limits:', status);

// Clear rate limits if needed
autoplay.clearRateLimit('youtube');
```

**Provider Errors**
```typescript
// Check if provider is available
if (!autoplay.hasProvider('spotify')) {
  console.log('Spotify provider not available');
}

// Get provider info
const info = autoplay.getProviderInfo('youtube');
console.log('Provider info:', info);
```

**Timeout Issues**
```typescript
// Increase timeout for slow connections
const autoplay = new LavalinkAutoplay({
  timeout: 30000 // 30 seconds
});
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Open an issue on GitHub
- Check the documentation
- Review the test files for examples
