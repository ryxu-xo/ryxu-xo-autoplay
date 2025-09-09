import { AutoplayProvider, LavalinkTrackInfo, AutoplayResult, AutoplaySource } from '../types';
import { AutoplayEventEmitter } from '../events';

/**
 * Base class for autoplay providers
 */
export abstract class BaseProvider implements AutoplayProvider {
  public abstract readonly name: AutoplaySource;
  protected eventEmitter: AutoplayEventEmitter;

  constructor(eventEmitter: AutoplayEventEmitter) {
    this.eventEmitter = eventEmitter;
  }

  /**
   * Check if this provider can handle the given track info
   */
  public abstract canHandle(trackInfo: LavalinkTrackInfo): boolean;

  /**
   * Get the next track for autoplay
   */
  public abstract getNextTrack(trackInfo: LavalinkTrackInfo, excludeIds?: Set<string>): Promise<AutoplayResult>;

  /**
   * Validate track info before processing
   */
  protected validateTrackInfo(trackInfo: LavalinkTrackInfo): void {
    if (!trackInfo) {
      throw new Error('Track info is required');
    }
    if (!trackInfo.sourceName) {
      throw new Error('Track source name is required');
    }
    if (!trackInfo.identifier && !trackInfo.uri) {
      throw new Error('Track identifier or URI is required');
    }
  }

  /**
   * Create a successful result
   */
  protected createSuccessResult(url: string, trackId?: string, metadata?: Record<string, any>): AutoplayResult {
    const result: AutoplayResult = {
      success: true,
      url,
      source: this.name
    };
    if (trackId) {
      result.trackId = trackId;
    }
    if (metadata) {
      result.metadata = metadata;
    }
    return result;
  }

  /**
   * Create an error result
   */
  protected createErrorResult(error: string, metadata?: Record<string, any>): AutoplayResult {
    return {
      success: false,
      error,
      source: this.name,
      metadata: metadata || undefined
    };
  }

  /**
   * Handle provider errors with event emission
   */
  protected handleError(error: Error, trackInfo: LavalinkTrackInfo, metadata?: Record<string, any>): AutoplayResult {
    this.eventEmitter.emitProviderError({
      source: this.name,
      trackInfo,
      error,
      metadata: metadata || undefined
    });

    return this.createErrorResult(error.message, metadata);
  }
}
