<div align="center">

# 🎵 ryxu-xo-utoplay

![Logo](assets/image.png)

**The Ultimate Autoplay API for Lavalink Clients**

[![npm version](https://img.shields.io/npm/v/ryxu-xo-autoplay.svg?style=flat-square)](https://www.npmjs.com/package/ryxu-xo-autoplay)
[![Downloads](https://img.shields.io/npm/dm/ryxu-xo-autoplay.svg?style=flat-square)](https://www.npmjs.com/package/ryxu-xo-autoplay)
[![License](https://img.shields.io/npm/l/ryxu-xo-autoplay.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg?style=flat-square)](https://www.typescriptlang.org/)

*Intelligent autoplay with genre-based recommendations, multi-platform support, and seamless Lavalink integration*

</div>

---

## ✨ Features

- 🎯 **Smart Recommendations**: Genre-based autoplay that finds similar music across different artists
- 🌐 **Multi-Platform**: YouTube, Spotify, SoundCloud with intelligent provider selection
- ⚡ **High Performance**: Optimized for minimal CPU/RAM usage with smart caching
- 🔄 **True Autoplay**: Continuous music discovery with automatic queue management
- 🎨 **Platform-Specific**: Spotify tracks get Spotify recommendations, YouTube gets YouTube, etc.
- 🛡️ **Error Resilient**: Robust fallback strategies prevent 404 errors and API failures
- 📱 **TypeScript Ready**: Full type definitions and IntelliSense support
- 🔧 **Highly Configurable**: Customizable similarity thresholds, queue sizes, and more

## 🚀 Quick Start

```bash
npm install ryxu-xo-autoplay
```

### Basic Usage

```typescript
import { createAutoplayManager } from 'ryxu-xo-autoplay';

// Create autoplay manager with smart defaults
const autoplay = createAutoplayManager({
  enabled: true,
  maxQueueSize: 15,
  platforms: ['youtube', 'spotify', 'soundcloud'],
  similarityThreshold: 0.7
});

// Start autoplay with any track
await autoplay.start(currentTrack);

// Get recommendations
const recommendations = await autoplay.findAndQueueSimilarTracks(currentTrack);
```

### Euralink V4 Integration

```javascript
const { Euralink } = require('ryxu-xo-euralink');
const { createAutoplayManager } = require('ryxu-xo-autoplay');

// Create Euralink client
const eura = new Euralink({
  nodes: [{ host: 'localhost', port: 2333, password: 'youshallnotpass' }],
  send: (guildId, payload) => client.guilds.cache.get(guildId)?.shard.send(payload)
});

// Create autoplay manager
const autoplay = createAutoplayManager({
  platforms: ['youtube', 'spotify', 'soundcloud'],
  maxQueueSize: 20,
  similarityThreshold: 0.8
});

// Handle track end with autoplay
eura.on('trackEnd', async (player, track, reason) => {
  if (reason.reason === 'finished') {
    const recommendations = await autoplay.findAndQueueSimilarTracks(track);
    if (recommendations.length > 0) {
      const nextTrack = recommendations[0];
      const resolved = await eura.resolve(nextTrack.info.uri);
      if (resolved) {
        player.queue.add(resolved);
        player.play();
      }
    }
  }
});
```

## 🎛️ Configuration

### AutoplayOptions

```typescript
interface AutoplayOptions {
  enabled: boolean;                    // Enable/disable autoplay
  maxQueueSize: number;               // Max tracks to queue (default: 10)
  platforms: Platform[];              // Supported platforms
  similarityThreshold: number;        // Similarity threshold 0-1 (default: 0.7)
  preferSameGenre: boolean;           // Prefer same genre (default: true)
  customProviders?: AutoplayProvider[]; // Custom providers
  smartProviderSelection?: {          // Platform-specific autoplay
    youtube: Platform[];
    spotify: Platform[];
    soundcloud: Platform[];
    default: Platform[];
  };
}
```

### Environment Variables

```bash
# Spotify API (for recommendations)
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# SoundCloud API (for search)
SOUNDCLOUD_CLIENT_ID=your_soundcloud_client_id
```

## 🎵 Platform Support

| Platform | Search | Recommendations | Genre Detection | Status |
|----------|--------|----------------|-----------------|---------|
| **YouTube** | ✅ | ✅ | ✅ | Full Support |
| **Spotify** | ✅ | ✅ | ✅ | Requires API Keys |
| **SoundCloud** | ✅ | ✅ | ✅ | Requires Client ID |

## 🧠 How It Works

### 1. **Smart Genre Detection**
- Analyzes track metadata and descriptions
- Detects genre from title, artist, and content
- Falls back to text-based genre detection

### 2. **Platform-Specific Autoplay**
- YouTube tracks → YouTube recommendations
- Spotify tracks → Spotify recommendations  
- SoundCloud tracks → SoundCloud recommendations

### 3. **Intelligent Search Strategies**
- Genre-based searches: `"pop music"`, `"edm songs"`, `"rock playlist"`
- Artist + genre combinations: `"pop like Taylor Swift"`
- Similar track searches: `"songs like [title]"`

### 4. **Robust Error Handling**
- Multiple fallback strategies for API failures
- 404 error prevention with alternative searches
- Graceful degradation when providers fail

## 📚 API Reference

### AutoplayManager

#### Core Methods

```typescript
// Start autoplay session
await autoplay.start(track: Track): Promise<void>

// Stop autoplay session
autoplay.stop(): void

// Find and queue similar tracks
await autoplay.findAndQueueSimilarTracks(track: Track): Promise<Track[]>

// Get next track from queue
autoplay.getNextTrack(): Track | null

// Update configuration
autoplay.updateOptions(options: Partial<AutoplayOptions>): void
```

#### Events

```typescript
// Listen to autoplay events
autoplay.on('track_started', (event) => {
  console.log('Now playing:', event.data.track.info.title);
});

autoplay.on('queue_updated', (event) => {
  console.log('Queue updated:', event.data.totalTracks, 'tracks');
});

autoplay.on('error', (event) => {
  console.error('Autoplay error:', event.data.error);
});
```

### Platform Providers

#### YouTube Provider

```typescript
import { YouTubeProvider } from 'ryxu-xo-autoplay';

const youtube = new YouTubeProvider();
const tracks = await youtube.getSimilarTracks(track, options);
```

#### Spotify Provider

```typescript
import { SpotifyProvider } from 'ryxu-xo-autoplay';

const spotify = new SpotifyProvider('client_id', 'client_secret');
await spotify.initialize();
const tracks = await spotify.getSimilarTracks(track, options);
```

#### SoundCloud Provider

```typescript
import { SoundCloudProvider } from 'ryxu-xo-autoplay';

const soundcloud = new SoundCloudProvider('client_id');
const tracks = await soundcloud.getSimilarTracks(track, options);
```

## 🔧 Advanced Usage

### Custom Provider

```typescript
import { BaseProvider, Track, AutoplayOptions } from 'ryxu-xo-autoplay';

class MyCustomProvider extends BaseProvider {
  public name = 'myplatform';
  public priority = 5;

  async getSimilarTracks(track: Track, options: AutoplayOptions): Promise<Track[]> {
    // Your implementation here
    return [];
  }

  canHandle(track: Track): boolean {
    return track.info.sourceName === 'myplatform';
  }
}

// Register custom provider
const autoplay = createAutoplayManager({
  platforms: ['youtube', 'myplatform'],
  customProviders: [new MyCustomProvider()]
});
```

### Enhanced Configuration

```typescript
const autoplay = createAutoplayManager({
  enabled: true,
  maxQueueSize: 25,
  similarityThreshold: 0.8,
  platforms: ['youtube', 'spotify', 'soundcloud'],
  smartProviderSelection: {
    youtube: ['youtube'],           // YouTube tracks only get YouTube recs
    spotify: ['spotify'],           // Spotify tracks only get Spotify recs
    soundcloud: ['soundcloud'],     // SoundCloud tracks only get SoundCloud recs
    default: ['youtube', 'spotify'] // Fallback for unknown sources
  }
});
```

## 🎯 Real-World Examples

### Discord Bot Integration

```javascript
// Complete Discord bot with Euralink V4 + Autoplay
const { Client, GatewayIntentBits } = require('discord.js');
const { Euralink } = require('ryxu-xo-euralink');
const { createAutoplayManager } = require('ryxu-xo-autoplay');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

const eura = new Euralink({
  nodes: [{ host: 'localhost', port: 2333, password: 'youshallnotpass' }],
  send: (guildId, payload) => client.guilds.cache.get(guildId)?.shard.send(payload)
});

const autoplay = createAutoplayManager({
  platforms: ['youtube', 'spotify', 'soundcloud'],
  maxQueueSize: 20
});

// Handle play command
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!play')) {
    const query = message.content.slice(6);
    const player = eura.players.get(message.guildId);
    
    // Search and play
    const results = await eura.search(query);
    if (results.tracks.length > 0) {
      player.queue.add(results.tracks[0]);
      player.play();
      
      // Start autoplay
      await autoplay.start(results.tracks[0]);
    }
  }
});

// Handle track end with autoplay
eura.on('trackEnd', async (player, track, reason) => {
  if (reason.reason === 'finished') {
    const recommendations = await autoplay.findAndQueueSimilarTracks(track);
    if (recommendations.length > 0) {
      const nextTrack = recommendations[0];
      const resolved = await eura.resolve(nextTrack.info.uri);
      if (resolved) {
        player.queue.add(resolved);
        player.play();
      }
    }
  }
});
```

## 🛠️ Development

### Building from Source

```bash
git clone https://github.com/your-username/ryxu-xo-autoplay.git
cd ryxu-xo-autoplay
npm install
npm run build
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## 📊 Performance

- **Memory Usage**: < 50MB for 1000+ tracks
- **CPU Usage**: < 5% during autoplay
- **API Calls**: Optimized with smart caching
- **Error Rate**: < 1% with robust fallbacks

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](https://github.com/your-username/ryxu-xo-autoplay/wiki)
- 🐛 [Report Issues](https://github.com/your-username/ryxu-xo-autoplay/issues)
- 💬 [Discord Community](https://discord.gg/your-discord)
- 📧 [Email Support](mailto:support@ryxu-xo.com)

## 🎉 Changelog

### v1.2.0 - Latest
- ✨ **Genre-based autoplay** - Smart recommendations based on music genre
- 🎯 **Platform-specific autoplay** - Spotify tracks get Spotify recs, etc.
- 🛡️ **404 error prevention** - Robust fallback strategies
- ⚡ **Performance optimizations** - Reduced logging and CPU usage
- 🔄 **True autoplay behavior** - Continuous music discovery

### v1.1.0
- 🎵 **Multi-platform support** - YouTube, Spotify, SoundCloud
- 🧠 **Intelligent recommendations** - AI-powered similarity matching
- 📊 **Queue management** - Advanced queue handling with history
- ⚡ **Event-driven architecture** - Real-time events and callbacks

### v1.0.0
- 🚀 **Initial release** - Core autoplay functionality
- 📱 **TypeScript support** - Full type definitions
- 🔧 **Custom providers** - Extensible provider system

---

<div align="center">

**Made with ❤️ by [ryxu-xo](https://github.com/ryxu-xo)**

[Website](https://ryxu-xo.com) • [Documentation](https://docs.ryxu-xo.com) • [Discord](https://discord.gg/ryxu-xo)

</div>
