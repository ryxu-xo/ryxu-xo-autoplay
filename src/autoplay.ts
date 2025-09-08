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
   * Get the next track for autoplay based on current track info
   */
  public async getNextTrack(trackInfo: LavalinkTrackInfo): Promise<AutoplayResult> {
    try {
      // Validate input
      this.validateTrackInfo(trackInfo);

      // Check rate limiting
      if (this.isRateLimited(trackInfo.sourceName)) {
        const error = new RateLimitError('Rate limited for this source');
        this.eventEmitter.emitRateLimited({
          source: trackInfo.sourceName,
          trackInfo,
          error
        });
        return this.createErrorResult(error.message, trackInfo.sourceName);
      }

      // Find appropriate provider
      const provider = this.providers.get(trackInfo.sourceName);
      if (!provider) {
        const error = new AutoplayError(`No provider available for source: ${trackInfo.sourceName}`);
        this.eventEmitter.emitError({
          source: trackInfo.sourceName,
          trackInfo,
          error
        });
        return this.createErrorResult(error.message, trackInfo.sourceName);
      }

      // Check if provider can handle this track
      if (!provider.canHandle(trackInfo)) {
        const error = new AutoplayError(`Provider cannot handle this track`);
        this.eventEmitter.emitError({
          source: trackInfo.sourceName,
          trackInfo,
          error
        });
        return this.createErrorResult(error.message, trackInfo.sourceName);
      }

      // Get next track with timeout
      const result = await this.withTimeout(
        provider.getNextTrack(trackInfo),
        this.config.timeout
      ) as AutoplayResult;

      // Update rate limiting
      this.updateRateLimit(trackInfo.sourceName);

      // Emit success event
      if (result.success) {
        this.eventEmitter.emitSuccess({
          source: trackInfo.sourceName,
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
      maxRetries: config.maxRetries ?? 3,
      timeout: config.timeout ?? 10000,
      enableEvents: config.enableEvents ?? true,
      rateLimitDelay: config.rateLimitDelay ?? 1000,
      userAgent: config.userAgent ?? 'LavalinkAutoplay/1.0.0',
      customHeaders: config.customHeaders ?? {}
    };
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
    if (!this.providers.has(trackInfo.sourceName)) {
      throw new AutoplayError(`Unsupported source: ${trackInfo.sourceName}`);
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
