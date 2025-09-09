import { 
  LavalinkTrackInfo, 
  AutoplayResult, 
  AutoplayConfig, 
  ProviderConfig,
  AutoplaySource,
  AutoplayError,
  RateLimitError,
  TimeoutError
} from './types';
import { AutoplayEventEmitter } from './events';
import { YouTubeProvider, SpotifyProvider, SoundCloudProvider } from './providers';
import { createHttpAgent } from './utils/http';

/**
 * Main Lavalink Autoplay API class
 */
export class LavalinkAutoplay {
  private readonly eventEmitter: AutoplayEventEmitter;
  private readonly providers: Map<AutoplaySource, any>;
  private readonly config: Required<AutoplayConfig>;
  private readonly httpAgent: any;
  private rateLimitMap: Map<string, number> = new Map();
  private trackHistory: Map<string, Set<string>> = new Map(); // Guild ID -> Set of track IDs

  constructor(config: AutoplayConfig = {}, providerConfig: ProviderConfig = {}) {
    this.eventEmitter = new AutoplayEventEmitter();
    this.config = this.mergeConfig(config);
    this.httpAgent = createHttpAgent();
    
    // Initialize providers
    this.providers = new Map();
    this.providers.set('youtube', new YouTubeProvider(this.eventEmitter));
    this.providers.set('spotify', new SpotifyProvider(this.eventEmitter, providerConfig.spotify));
    this.providers.set('soundcloud', new SoundCloudProvider(this.eventEmitter, providerConfig.soundcloud));

    // Set up event listeners if enabled
    if (this.config.enableEvents) {
      this.setupEventListeners();
    }
  }

  /**
   * Add track to history to prevent repeats
   */
  private addToHistory(guildId: string, trackId: string): void {
    if (!this.trackHistory.has(guildId)) {
      this.trackHistory.set(guildId, new Set());
    }
    this.trackHistory.get(guildId)!.add(trackId);
    
    // Keep only last 20 tracks to prevent memory issues
    const history = this.trackHistory.get(guildId)!;
    if (history.size > 20) {
      const firstTrack = history.values().next().value;
      if (firstTrack) {
        history.delete(firstTrack);
      }
    }
  }

  /**
   * Check if track is in history
   */
  private isInHistory(guildId: string, trackId: string): boolean {
    const history = this.trackHistory.get(guildId);
    return history ? history.has(trackId) : false;
  }

  /**
   * Clear track history for a guild
   */
  public clearHistory(guildId?: string): void {
    if (guildId) {
      this.trackHistory.delete(guildId);
    } else {
      this.trackHistory.clear();
    }
  }

  /**
   * Get the next track for autoplay based on current track info
   * This method automatically detects the source and uses the appropriate provider
   */
  public async getNextTrack(trackInfo: LavalinkTrackInfo, guildId?: string): Promise<AutoplayResult> {
    try {
      // Validate input
      this.validateTrackInfo(trackInfo);

      // Map source names to our providers (handle different naming conventions)
      const mappedSource = this.mapSourceName(trackInfo.sourceName, trackInfo);
      
      // Check rate limiting
      if (this.isRateLimited(mappedSource)) {
        const error = new RateLimitError('Rate limited for this source');
        this.eventEmitter.emitRateLimited({
          source: mappedSource,
          trackInfo,
          error
        });
        return this.createErrorResult(error.message, mappedSource);
      }

      // Find appropriate provider
      const provider = this.providers.get(mappedSource);
      if (!provider) {
        const error = new AutoplayError(`No provider available for source: ${mappedSource} (original: ${trackInfo.sourceName})`);
        this.eventEmitter.emitError({
          source: mappedSource,
          trackInfo,
          error
        });
        return this.createErrorResult(error.message, mappedSource);
      }

      // Check if provider can handle this track
      if (!provider.canHandle(trackInfo)) {
        const error = new AutoplayError(`Provider cannot handle this track`);
        this.eventEmitter.emitError({
          source: mappedSource,
          trackInfo,
          error
        });
        return this.createErrorResult(error.message, mappedSource);
      }

      // Get track history for this guild
      const excludeIds = guildId ? this.trackHistory.get(guildId) || new Set() : new Set();

      // Get next track with timeout
      const result = await this.withTimeout(
        provider.getNextTrack(trackInfo, excludeIds),
        this.config.timeout
      ) as AutoplayResult;

      // Update rate limiting
      this.updateRateLimit(mappedSource);

      // Emit success event
      if (result.success) {
        // Add track to history to prevent repeats
        if (guildId && result.trackId) {
          this.addToHistory(guildId, result.trackId);
        }
        
        this.eventEmitter.emitSuccess({
          source: mappedSource,
          trackInfo,
          result
        });
      }

      return result;

    } catch (error) {
      const autoplayError = error instanceof AutoplayError 
        ? error 
        : new AutoplayError(`Autoplay failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      this.eventEmitter.emitError({
        source: trackInfo?.sourceName,
        trackInfo,
        error: autoplayError
      });

      return this.createErrorResult(autoplayError.message, trackInfo?.sourceName);
    }
  }

  /**
   * Get autoplay suggestions for a specific source
   * This is useful when you want to force a particular source for autoplay
   */
  public async getNextTrackForSource(trackInfo: LavalinkTrackInfo, source: AutoplaySource, guildId?: string): Promise<AutoplayResult> {
    try {
      // Validate input
      this.validateTrackInfo(trackInfo);

      // Check rate limiting
      if (this.isRateLimited(source)) {
        const error = new RateLimitError('Rate limited for this source');
        this.eventEmitter.emitRateLimited({
          source,
          trackInfo,
          error
        });
        return this.createErrorResult(error.message, source);
      }

      // Find the specified provider
      const provider = this.providers.get(source);
      if (!provider) {
        const error = new AutoplayError(`No provider available for source: ${source}`);
        this.eventEmitter.emitError({
          source,
          trackInfo,
          error
        });
        return this.createErrorResult(error.message, source);
      }

      // Check if provider can handle this track
      if (!provider.canHandle(trackInfo)) {
        const error = new AutoplayError(`Provider cannot handle this track`);
        this.eventEmitter.emitError({
          source,
          trackInfo,
          error
        });
        return this.createErrorResult(error.message, source);
      }

      // Get track history for this guild
      const excludeIds = guildId ? this.trackHistory.get(guildId) || new Set() : new Set();

      // Get next track with timeout
      const result = await this.withTimeout(
        provider.getNextTrack(trackInfo, excludeIds),
        this.config.timeout
      ) as AutoplayResult;

      // Update rate limiting
      this.updateRateLimit(source);

      // Emit success event
      if (result.success) {
        // Add track to history to prevent repeats
        if (guildId && result.trackId) {
          this.addToHistory(guildId, result.trackId);
        }
        
        this.eventEmitter.emitSuccess({
          source,
          trackInfo,
          result
        });
      }

      return result;

    } catch (error) {
      const autoplayError = error instanceof AutoplayError 
        ? error 
        : new AutoplayError(`Autoplay failed for ${source}: ${error instanceof Error ? error.message : 'Unknown error'}`);

      this.eventEmitter.emitError({
        source,
        trackInfo,
        error: autoplayError
      });

      return this.createErrorResult(autoplayError.message, source);
    }
  }

  /**
   * Get the event emitter for listening to autoplay events
   */
  public getEventEmitter(): AutoplayEventEmitter {
    return this.eventEmitter;
  }

  /**
   * Get available providers
   */
  public getAvailableProviders(): AutoplaySource[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is available
   */
  public hasProvider(source: AutoplaySource): boolean {
    return this.providers.has(source);
  }

  /**
   * Get provider-specific information
   */
  public getProviderInfo(source: AutoplaySource): { name: string; canHandle: (trackInfo: LavalinkTrackInfo) => boolean } | null {
    const provider = this.providers.get(source);
    if (!provider) return null;
    
    return {
      name: provider.name,
      canHandle: provider.canHandle.bind(provider)
    };
  }

  /**
   * Clear rate limiting for a specific source
   */
  public clearRateLimit(source?: AutoplaySource): void {
    if (source) {
      this.rateLimitMap.delete(source);
    } else {
      this.rateLimitMap.clear();
    }
  }

  /**
   * Get current rate limit status
   */
  public getRateLimitStatus(): Map<AutoplaySource, number> {
    return new Map(this.rateLimitMap as Map<AutoplaySource, number>);
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AutoplayConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Merge default configuration with user config
   */
  private mergeConfig(config: AutoplayConfig): Required<AutoplayConfig> {
    return {
      maxRetries: config.maxRetries ?? 1, // Reduced for faster performance
      timeout: config.timeout ?? 5000, // Reduced from 10s to 5s
      enableEvents: config.enableEvents ?? true,
      rateLimitDelay: config.rateLimitDelay ?? 500, // Reduced from 1s to 500ms
      userAgent: config.userAgent ?? 'LavalinkAutoplay/1.0.0',
      customHeaders: config.customHeaders ?? {}
    };
  }

  /**
   * Map source names to our provider names (handle different naming conventions)
   * This ensures source-to-source autoplay (Spotify → Spotify, YouTube → YouTube, etc.)
   */
  private mapSourceName(sourceName: string, trackInfo?: LavalinkTrackInfo): AutoplaySource {
    const sourceMap: Record<string, AutoplaySource> = {
      'youtube': 'youtube',
      'yt': 'youtube',
      'ytm': 'youtube',
      'ytmsearch': 'youtube',
      'youtube_music': 'youtube',
      'spotify': 'spotify',
      'sp': 'spotify',
      'spsearch': 'spotify',
      'soundcloud': 'soundcloud',
      'sc': 'soundcloud',
      'scsearch': 'soundcloud'
    };

    const mapped = sourceMap[sourceName.toLowerCase()];
    if (mapped) {
      return mapped;
    }

    // If no mapping found, try to detect from URL
    if (trackInfo?.uri) {
      if (trackInfo.uri.includes('youtube.com') || trackInfo.uri.includes('youtu.be')) {
        return 'youtube';
      }
      if (trackInfo.uri.includes('spotify.com')) {
        return 'spotify';
      }
      if (trackInfo.uri.includes('soundcloud.com')) {
        return 'soundcloud';
      }
    }

    // Default to youtube if no mapping found
    return 'youtube';
  }

  /**
   * Validate track info
   */
  private validateTrackInfo(trackInfo: LavalinkTrackInfo): void {
    if (!trackInfo) {
      throw new AutoplayError('Track info is required');
    }
    if (!trackInfo.sourceName) {
      throw new AutoplayError('Track source name is required');
    }
    
    // Check if we have any provider that can handle this
    const mappedSource = this.mapSourceName(trackInfo.sourceName, trackInfo);
    if (!this.providers.has(mappedSource)) {
      throw new AutoplayError(`Unsupported source: ${trackInfo.sourceName} (mapped to: ${mappedSource})`);
    }
  }

  /**
   * Check if source is rate limited
   */
  private isRateLimited(source: AutoplaySource): boolean {
    const lastRequest = this.rateLimitMap.get(source);
    if (!lastRequest) return false;
    
    const now = Date.now();
    return (now - lastRequest) < this.config.rateLimitDelay;
  }

  /**
   * Update rate limit timestamp
   */
  private updateRateLimit(source: AutoplaySource): void {
    this.rateLimitMap.set(source, Date.now());
  }

  /**
   * Execute function with timeout
   */
  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`, timeoutMs));
        }, timeoutMs);
      })
    ]);
  }

  /**
   * Create error result
   */
  private createErrorResult(error: string, source?: AutoplaySource): AutoplayResult {
    const result: AutoplayResult = {
      success: false,
      error
    };
    if (source) {
      result.source = source;
    }
    return result;
  }

  /**
   * Set up default event listeners
   */
  private setupEventListeners(): void {
    // Log all events in development
    if (process.env.NODE_ENV === 'development') {
      this.eventEmitter.onAllEvents((data) => {
        console.log(`[Autoplay Event] ${data.type}:`, data);
      });
    }
  }
}
