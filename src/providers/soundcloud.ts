import { BaseProvider } from './base';
import { LavalinkTrackInfo, AutoplayResult, AutoplaySource, ProviderConfig } from '../types';
import { AutoplayEventEmitter } from '../events';
import { fetchPage } from '../utils/http';

/**
 * SoundCloud autoplay provider
 */
export class SoundCloudProvider extends BaseProvider {
  public readonly name: AutoplaySource = 'soundcloud';
  private readonly maxTracks: number;
  private readonly baseUrl: string;
  private readonly scLinkPattern = /<a\s+itemprop="url"\s+href="(\/[^"]+)"/g;

  constructor(eventEmitter: AutoplayEventEmitter, config: ProviderConfig['soundcloud'] = {}) {
    super(eventEmitter);
    this.maxTracks = config.maxTracks || 40;
    this.baseUrl = config.baseUrl || 'https://soundcloud.com';
  }

  /**
   * Check if this provider can handle SoundCloud tracks
   */
  public canHandle(trackInfo: LavalinkTrackInfo): boolean {
    return trackInfo.sourceName === 'soundcloud' && !!trackInfo.uri;
  }

  /**
   * Get next SoundCloud track using recommended tracks
   */
  public async getNextTrack(trackInfo: LavalinkTrackInfo): Promise<AutoplayResult> {
    try {
      this.validateTrackInfo(trackInfo);

      if (!this.canHandle(trackInfo)) {
        return this.createErrorResult('Cannot handle this track type');
      }

      const trackUrl = trackInfo.uri;
      const recommendedUrl = this.createRecommendedUrl(trackUrl);
      
      // Fetch recommended tracks
      const recommendedTracks = await this.fetchRecommendedTracks(recommendedUrl);
      
      if (!recommendedTracks.length) {
        this.eventEmitter.emitTrackNotFound({
          source: this.name,
          trackInfo,
          metadata: { originalUrl: trackUrl }
        });
        
        return this.createErrorResult('No recommended tracks found');
      }

      const selectedTrack = this.selectRandomTrack(recommendedTracks);

      this.eventEmitter.emitTrackFound({
        source: this.name,
        trackInfo,
        metadata: {
          originalUrl: trackUrl,
          selectedUrl: selectedTrack,
          totalFound: recommendedTracks.length
        }
      });

      return this.createSuccessResult(selectedTrack, undefined, {
        originalUrl: trackUrl,
        selectedUrl: selectedTrack,
        totalFound: recommendedTracks.length
      });

    } catch (error) {
      return this.handleError(
        error instanceof Error ? error : new Error('Unknown SoundCloud provider error'),
        trackInfo
      );
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
   * Fetch recommended tracks from SoundCloud
   */
  private async fetchRecommendedTracks(recommendedUrl: string): Promise<string[]> {
    const html = await fetchPage(recommendedUrl);
    const found: string[] = [];
    let match;

    while ((match = this.scLinkPattern.exec(html)) !== null) {
      const trackPath = match[1];
      const fullUrl = `${this.baseUrl}${trackPath}`;
      found.push(fullUrl);
      
      if (found.length >= this.maxTracks) {
        break;
      }
    }

    return found;
  }

  /**
   * Select a random track from the list
   */
  private selectRandomTrack(tracks: string[]): string {
    const track = tracks[Math.floor(Math.random() * tracks.length)];
    if (!track) {
      throw new Error('No tracks available for selection');
    }
    return track;
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
