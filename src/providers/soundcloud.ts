import { BaseProvider } from './base';
import { LavalinkTrackInfo, AutoplayResult, AutoplaySource, ProviderConfig } from '../types';
import { AutoplayEventEmitter } from '../events';
import { scAutoPlay } from '../utils/autoplay-apis';

/**
 * SoundCloud autoplay provider using improved API
 */
export class SoundCloudProvider extends BaseProvider {
  public readonly name: AutoplaySource = 'soundcloud';
  private readonly maxTracks: number;
  private readonly baseUrl: string;

  constructor(eventEmitter: AutoplayEventEmitter, config: ProviderConfig['soundcloud'] = {}) {
    super(eventEmitter);
    this.maxTracks = config.maxTracks || 50;
    this.baseUrl = config.baseUrl || 'https://soundcloud.com';
  }

  /**
   * Check if this provider can handle SoundCloud tracks
   */
  public canHandle(trackInfo: LavalinkTrackInfo): boolean {
    return trackInfo.sourceName === 'soundcloud' && !!trackInfo.uri;
  }

  /**
   * Get next SoundCloud track using improved API
   */
  public async getNextTrack(trackInfo: LavalinkTrackInfo, excludeIds: Set<string> = new Set()): Promise<AutoplayResult> {
    try {
      this.validateTrackInfo(trackInfo);

      if (!this.canHandle(trackInfo)) {
        return this.createErrorResult('Cannot handle this track type');
      }

      const trackUrl = trackInfo.uri;
      
      // Use the improved SoundCloud autoplay logic
      const autoplayTracks = await this.getSoundCloudAutoplayTracks(trackUrl, excludeIds);
      
      if (!autoplayTracks || autoplayTracks.length === 0) {
        this.eventEmitter.emitTrackNotFound({
          source: this.name,
          trackInfo,
          metadata: { originalUrl: trackUrl }
        });
        
        return this.createErrorResult('No SoundCloud autoplay tracks found');
      }

      const selectedTrack = autoplayTracks[0] || ''; // First track from shuffled results

      this.eventEmitter.emitTrackFound({
        source: this.name,
        trackInfo,
        metadata: {
          originalUrl: trackUrl,
          selectedUrl: selectedTrack,
          totalFound: autoplayTracks.length
        }
      });

      return this.createSuccessResult(selectedTrack, selectedTrack, {
        originalUrl: trackUrl,
        selectedUrl: selectedTrack,
        totalFound: autoplayTracks.length
      });

    } catch (error) {
      return this.handleError(
        error instanceof Error ? error : new Error('Unknown SoundCloud provider error'),
        trackInfo
      );
    }
  }

  /**
   * Get SoundCloud autoplay tracks using improved API
   */
  private async getSoundCloudAutoplayTracks(baseUrl: string, excludeIds: Set<string> = new Set()): Promise<string[]> {
    try {
      const tracks = await scAutoPlay(baseUrl);
      
      // Filter out tracks that are already in history
      const filteredTracks = tracks.filter(trackUrl => {
        const trackId = this.extractTrackId(trackUrl);
        return trackId && !excludeIds.has(trackId);
      });
      
      return filteredTracks;
    } catch (err) {
      console.error('SoundCloud autoplay error:', err instanceof Error ? err.message : err);
      return [];
    }
  }

  /**
   * Create recommended tracks URL
   */
  private createRecommendedUrl(trackUrl: string): string {
    // Extract track path from URL
    const url = new URL(trackUrl);
    const path = url.pathname;
    
    // Remove trailing slash and add /recommended
    const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path;
    return `${this.baseUrl}${cleanPath}/recommended`;
  }


  /**
   * Extract track ID from SoundCloud URL
   */
  private extractTrackId(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      return pathParts[pathParts.length - 1] || null;
    } catch {
      return null;
    }
  }

  /**
   * Extract track path from SoundCloud URL
   */
  public static extractTrackPath(url: string): string | null {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('soundcloud.com')) {
        return urlObj.pathname;
      }
    } catch {
      // Invalid URL
    }
    return null;
  }

  /**
   * Validate SoundCloud URL
   */
  public static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('soundcloud.com') && urlObj.pathname.length > 1;
    } catch {
      return false;
    }
  }

  /**
   * Get track ID from SoundCloud URL
   */
  public static extractTrackId(url: string): string | null {
    const path = this.extractTrackPath(url);
    if (!path) return null;
    
    // Extract numeric ID from path (e.g., /username/track-name-123456789)
    const match = path.match(/-(\d+)$/);
    return match ? (match[1] || null) : null;
  }
}
