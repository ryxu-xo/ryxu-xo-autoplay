# ryxu-xo-autoplay

A high-performance autoplay API for Lavalink client bots with source-to-source continuity, optimized for low CPU/RAM usage and fast response times.

## Features

- 🎵 **Multi-Platform Support**: YouTube, Spotify, and SoundCloud
- 🔄 **Source-to-Source Autoplay**: Spotify → Spotify, YouTube → YouTube, SoundCloud → SoundCloud
- ⚡ **High Performance**: Optimized for speed with reduced timeouts and memory usage
- 📡 **Event System**: Comprehensive event handling for better bot integration
- 🛡️ **Error Handling**: Robust error handling with retry mechanisms and rate limiting
- 🔧 **TypeScript**: Full TypeScript support with comprehensive type definitions
- 🧪 **Tested**: Extensive test coverage for reliability
- 🚀 **Euralink Integration**: Seamless integration with Euralink Lavalink client

## Installation

### Production Installation

```bash
npm install ryxu-xo-autoplay
```

### Development Installation

```bash
# Clone the repository
git clone https://github.com/ryxu-xo/ryxu-xo-autoplay.git
cd ryxu-xo-autoplay

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Watch mode for development
npm run dev
```

### Development Scripts

- `npm run build` - Build TypeScript to JavaScript
- `npm run dev` - Build in watch mode
- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode

## Quick Start

```typescript
import { LavalinkAutoplay } from 'ryxu-xo-autoplay';

// Create autoplay instance with optimized settings
const autoplay = new LavalinkAutoplay({
  enableEvents: true,
  timeout: 5000,      // Reduced for faster performance
  maxRetries: 1,      // Reduced for faster performance
  rateLimitDelay: 500 // Reduced for faster performance
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
  maxRetries: 1,           // Maximum retry attempts (optimized)
  timeout: 5000,           // Request timeout in milliseconds (optimized)
  enableEvents: true,      // Enable event system
  rateLimitDelay: 500,     // Rate limiting delay (optimized)
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
    maxRecommendations: 5  // Optimized for faster processing
  },
  soundcloud: {
    maxTracks: 20,         // Optimized for faster processing
    baseUrl: 'https://soundcloud.com'
  },
  youtube: {
    enableRadioMode: false // Uses Euralink search for better results
  }
});
```

## Source-to-Source Autoplay

The package automatically maintains source continuity for seamless music experience:

- **Spotify → Spotify**: When a Spotify track ends, finds another Spotify track
- **YouTube → YouTube**: When a YouTube track ends, finds another YouTube track  
- **SoundCloud → SoundCloud**: When a SoundCloud track ends, finds another SoundCloud track

### How It Works

1. **Source Detection**: Analyzes current track's source and URL
2. **Smart Mapping**: Maps different naming conventions (spsearch → spotify, ytmsearch → youtube)
3. **Provider Selection**: Uses appropriate provider for the detected source
4. **Fallback System**: Falls back to YouTube if original source fails
5. **Seamless Playback**: Maintains music flow without interruption

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

## Euralink Integration

This package is designed to work seamlessly with Euralink. Here's a complete integration example:

```javascript
const { Euralink } = require('ryxu-xo-euralink');
const { LavalinkAutoplay } = require('ryxu-xo-autoplay');

// Initialize Euralink
const eura = new Euralink(client, [/* nodes */], { /* options */ });

// Make Euralink globally available for autoplay providers
global.eura = eura;

// Initialize autoplay with optimized settings
const autoplay = new LavalinkAutoplay({
  timeout: 5000,
  maxRetries: 1,
  rateLimitDelay: 500
});

// Handle track end events
eura.on('trackEnd', async (player, track, reason) => {
  if (player.autoplayEnabled) {
    const autoplayResult = await autoplay.getNextTrack(track.info);
    
    if (autoplayResult.success) {
      const result = await eura.resolve({ 
        query: autoplayResult.url, 
        requester: { id: 'autoplay', username: 'Autoplay' }
      });
      
      if (result.tracks.length > 0) {
        player.queue.add(result.tracks[0]);
        await player.play();
      }
    }
  }
});
```

## Providers

### YouTube Provider

Uses Euralink search for intelligent track selection:

```typescript
// Searches for similar content using artist + title
// Returns actual YouTube tracks instead of radio URLs
// Much more reliable than radio mode
```

### Spotify Provider

Uses Euralink with Spotify recommendations for source-to-source autoplay:

```typescript
// Integrates with Euralink for Spotify track resolution
// Uses mix:track: queries for better recommendations
// Returns actual Spotify tracks with full metadata
// Maintains source continuity (Spotify → Spotify)
```

### SoundCloud Provider

Uses optimized scraping for SoundCloud recommendations:

```typescript
// Fast HTTP requests with connection pooling
// Reduced memory usage with smaller response limits
// Shuffled results for variety
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

## Performance Optimizations

This package is optimized for high performance and low resource usage:

### Built-in Optimizations

- **Reduced Timeouts**: 5s default timeout (vs 10s standard)
- **Minimal Retries**: 1 retry attempt (vs 3 standard)
- **Fast Rate Limiting**: 500ms delay (vs 1s standard)
- **Connection Pooling**: Reuses HTTP connections for faster requests
- **Memory Efficient**: Reduced buffer sizes and response limits
- **Smart Caching**: Efficient provider selection and source mapping

### Performance Tips

1. **Reuse Instances**: Create one autoplay instance and reuse it
2. **Event Filtering**: Only listen to events you need (debug logs removed)
3. **Rate Limiting**: Respect rate limits to avoid blocking
4. **Provider Selection**: Use the most appropriate provider for each source
5. **Euralink Integration**: Use global Euralink instance for better performance
6. **Source-to-Source**: Maintains continuity for better user experience

### Resource Usage

- **CPU**: Optimized algorithms and reduced processing
- **RAM**: Lower memory footprint with smaller buffers
- **Network**: Connection pooling and reduced timeouts
- **Disk**: No persistent storage, all in-memory operations

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
