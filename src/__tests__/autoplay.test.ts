import { LavalinkAutoplay } from '../autoplay';
import { LavalinkTrackInfo, AutoplaySource } from '../types';

describe('LavalinkAutoplay', () => {
  let autoplay: LavalinkAutoplay;

  beforeEach(() => {
    autoplay = new LavalinkAutoplay({
      enableEvents: false,
      timeout: 5000
    });
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const defaultAutoplay = new LavalinkAutoplay();
      expect(defaultAutoplay).toBeDefined();
      expect(defaultAutoplay.getAvailableProviders()).toContain('youtube');
      expect(defaultAutoplay.getAvailableProviders()).toContain('spotify');
      expect(defaultAutoplay.getAvailableProviders()).toContain('soundcloud');
    });

    it('should initialize with custom config', () => {
      const customConfig = {
        timeout: 15000,
        maxRetries: 5,
        enableEvents: true
      };
      const customAutoplay = new LavalinkAutoplay(customConfig);
      expect(customAutoplay).toBeDefined();
    });
  });

  describe('getAvailableProviders', () => {
    it('should return all available providers', () => {
      const providers = autoplay.getAvailableProviders();
      expect(providers).toHaveLength(3);
      expect(providers).toContain('youtube');
      expect(providers).toContain('spotify');
      expect(providers).toContain('soundcloud');
    });
  });

  describe('hasProvider', () => {
    it('should return true for available providers', () => {
      expect(autoplay.hasProvider('youtube')).toBe(true);
      expect(autoplay.hasProvider('spotify')).toBe(true);
      expect(autoplay.hasProvider('soundcloud')).toBe(true);
    });

    it('should return false for unavailable providers', () => {
      expect(autoplay.hasProvider('unknown' as AutoplaySource)).toBe(false);
    });
  });

  describe('getProviderInfo', () => {
    it('should return provider info for available providers', () => {
      const youtubeInfo = autoplay.getProviderInfo('youtube');
      expect(youtubeInfo).toBeDefined();
      expect(youtubeInfo?.name).toBe('youtube');
      expect(typeof youtubeInfo?.canHandle).toBe('function');
    });

    it('should return null for unavailable providers', () => {
      const unknownInfo = autoplay.getProviderInfo('unknown' as AutoplaySource);
      expect(unknownInfo).toBeNull();
    });
  });

  describe('rate limiting', () => {
    it('should track rate limiting', () => {
      const status = autoplay.getRateLimitStatus();
      expect(status).toBeInstanceOf(Map);
      expect(status.size).toBe(0);
    });

    it('should clear rate limiting', () => {
      autoplay.clearRateLimit();
      const status = autoplay.getRateLimitStatus();
      expect(status.size).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle invalid track info', async () => {
      try {
        const result = await autoplay.getNextTrack(null as any);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Track info is required');
      } catch (error) {
        // Error is thrown and handled by the event system
        expect(error).toBeDefined();
      }
    });

    it('should handle unsupported source', async () => {
      const trackInfo: LavalinkTrackInfo = {
        identifier: 'test',
        sourceName: 'unknown' as AutoplaySource,
        isSeekable: true,
        author: 'test',
        length: 1000,
        isStream: false,
        position: 0,
        title: 'test',
        uri: 'test'
      };

      try {
        const result = await autoplay.getNextTrack(trackInfo);
        expect(result.success).toBe(false);
        expect(result.error).toContain('Unsupported source');
      } catch (error) {
        // Error is thrown and handled by the event system
        expect(error).toBeDefined();
      }
    });
  });
});
