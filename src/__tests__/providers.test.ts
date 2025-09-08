import { YouTubeProvider, SpotifyProvider, SoundCloudProvider } from '../providers';
import { AutoplayEventEmitter } from '../events';
import { LavalinkTrackInfo } from '../types';

describe('Providers', () => {
  let eventEmitter: AutoplayEventEmitter;

  beforeEach(() => {
    eventEmitter = new AutoplayEventEmitter();
  });

  describe('YouTubeProvider', () => {
    let provider: YouTubeProvider;

    beforeEach(() => {
      provider = new YouTubeProvider(eventEmitter);
    });

    it('should have correct name', () => {
      expect(provider.name).toBe('youtube');
    });

    it('should handle YouTube tracks', () => {
      const trackInfo: LavalinkTrackInfo = {
        identifier: 'dQw4w9WgXcQ',
        sourceName: 'youtube',
        isSeekable: true,
        author: 'test',
        length: 1000,
        isStream: false,
        position: 0,
        title: 'test',
        uri: 'https://youtube.com/watch?v=dQw4w9WgXcQ'
      };

      expect(provider.canHandle(trackInfo)).toBe(true);
    });

    it('should not handle non-YouTube tracks', () => {
      const trackInfo: LavalinkTrackInfo = {
        identifier: 'test',
        sourceName: 'spotify',
        isSeekable: true,
        author: 'test',
        length: 1000,
        isStream: false,
        position: 0,
        title: 'test',
        uri: 'test'
      };

      expect(provider.canHandle(trackInfo)).toBe(false);
    });

    it('should extract video ID from URL', () => {
      expect(YouTubeProvider.extractVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(YouTubeProvider.extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(YouTubeProvider.extractVideoId('invalid')).toBeNull();
    });

    it('should validate video ID format', () => {
      expect(YouTubeProvider.isValidVideoId('dQw4w9WgXcQ')).toBe(true);
      expect(YouTubeProvider.isValidVideoId('invalid')).toBe(false);
      expect(YouTubeProvider.isValidVideoId('')).toBe(false);
    });
  });

  describe('SpotifyProvider', () => {
    let provider: SpotifyProvider;

    beforeEach(() => {
      provider = new SpotifyProvider(eventEmitter);
    });

    it('should have correct name', () => {
      expect(provider.name).toBe('spotify');
    });

    it('should handle Spotify tracks', () => {
      const trackInfo: LavalinkTrackInfo = {
        identifier: '4iV5W9VYca1Ur1UxP1C1Fd',
        sourceName: 'spotify',
        isSeekable: true,
        author: 'test',
        length: 1000,
        isStream: false,
        position: 0,
        title: 'test',
        uri: 'https://open.spotify.com/track/4iV5W9VYca1Ur1UxP1C1Fd'
      };

      expect(provider.canHandle(trackInfo)).toBe(true);
    });

    it('should not handle non-Spotify tracks', () => {
      const trackInfo: LavalinkTrackInfo = {
        identifier: 'test',
        sourceName: 'youtube',
        isSeekable: true,
        author: 'test',
        length: 1000,
        isStream: false,
        position: 0,
        title: 'test',
        uri: 'test'
      };

      expect(provider.canHandle(trackInfo)).toBe(false);
    });

    it('should extract track ID from URL', () => {
      expect(SpotifyProvider.extractTrackId('https://open.spotify.com/track/4iV5W9VYca1Ur1UxP1C1Fd')).toBe('4iV5W9VYca1Ur1UxP1C1Fd');
      expect(SpotifyProvider.extractTrackId('https://spotify.com/track/4iV5W9VYca1Ur1UxP1C1Fd')).toBe('4iV5W9VYca1Ur1UxP1C1Fd');
      expect(SpotifyProvider.extractTrackId('invalid')).toBeNull();
    });

    it('should validate track ID format', () => {
      expect(SpotifyProvider.isValidTrackId('4iV5W9VYca1Ur1UxP1C1Fd')).toBe(true);
      expect(SpotifyProvider.isValidTrackId('invalid')).toBe(false);
      expect(SpotifyProvider.isValidTrackId('')).toBe(false);
    });
  });

  describe('SoundCloudProvider', () => {
    let provider: SoundCloudProvider;

    beforeEach(() => {
      provider = new SoundCloudProvider(eventEmitter);
    });

    it('should have correct name', () => {
      expect(provider.name).toBe('soundcloud');
    });

    it('should handle SoundCloud tracks', () => {
      const trackInfo: LavalinkTrackInfo = {
        identifier: 'test',
        sourceName: 'soundcloud',
        isSeekable: true,
        author: 'test',
        length: 1000,
        isStream: false,
        position: 0,
        title: 'test',
        uri: 'https://soundcloud.com/user/track'
      };

      expect(provider.canHandle(trackInfo)).toBe(true);
    });

    it('should not handle non-SoundCloud tracks', () => {
      const trackInfo: LavalinkTrackInfo = {
        identifier: 'test',
        sourceName: 'youtube',
        isSeekable: true,
        author: 'test',
        length: 1000,
        isStream: false,
        position: 0,
        title: 'test',
        uri: 'test'
      };

      expect(provider.canHandle(trackInfo)).toBe(false);
    });

    it('should extract track path from URL', () => {
      expect(SoundCloudProvider.extractTrackPath('https://soundcloud.com/user/track')).toBe('/user/track');
      expect(SoundCloudProvider.extractTrackPath('https://soundcloud.com/user/track-123456789')).toBe('/user/track-123456789');
      expect(SoundCloudProvider.extractTrackPath('invalid')).toBeNull();
    });

    it('should validate URL', () => {
      expect(SoundCloudProvider.isValidUrl('https://soundcloud.com/user/track')).toBe(true);
      expect(SoundCloudProvider.isValidUrl('https://youtube.com/watch?v=test')).toBe(false);
      expect(SoundCloudProvider.isValidUrl('invalid')).toBe(false);
    });

    it('should extract track ID from URL', () => {
      expect(SoundCloudProvider.extractTrackId('https://soundcloud.com/user/track-123456789')).toBe('123456789');
      expect(SoundCloudProvider.extractTrackId('https://soundcloud.com/user/track')).toBeNull();
    });
  });
});
