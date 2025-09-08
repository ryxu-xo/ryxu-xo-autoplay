import { BaseProvider } from './base';
import { LavalinkTrackInfo, AutoplayResult, AutoplaySource } from '../types';
import { AutoplayEventEmitter } from '../events';

/**
 * YouTube autoplay provider
 */
export class YouTubeProvider extends BaseProvider {
  public readonly name: AutoplaySource = 'youtube';

  constructor(eventEmitter: AutoplayEventEmitter) {
    super(eventEmitter);
  }

  /**
   * Check if this provider can handle YouTube tracks
   */
  public canHandle(trackInfo: LavalinkTrackInfo): boolean {
    return trackInfo.sourceName === 'youtube' && !!trackInfo.identifier;
  }

  /**
   * Get next YouTube track using radio mode
   */
  public async getNextTrack(trackInfo: LavalinkTrackInfo): Promise<AutoplayResult> {
    try {
      this.validateTrackInfo(trackInfo);

      if (!this.canHandle(trackInfo)) {
        return this.createErrorResult('Cannot handle this track type');
      }

      const videoId = trackInfo.identifier;
      const radioUrl = this.createRadioUrl(videoId);

      this.eventEmitter.emitTrackFound({
        source: this.name,
        trackInfo,
        metadata: { videoId, radioUrl }
      });

      return this.createSuccessResult(radioUrl, videoId, {
        originalVideoId: videoId,
        radioMode: true
      });

    } catch (error) {
      return this.handleError(
        error instanceof Error ? error : new Error('Unknown YouTube provider error'),
        trackInfo
      );
    }
  }

  /**
   * Create YouTube radio URL for autoplay
   */
  private createRadioUrl(videoId: string): string {
    return `https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`;
  }

  /**
   * Extract video ID from YouTube URL
   */
  public static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Validate YouTube video ID format
   */
  public static isValidVideoId(videoId: string): boolean {
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
  }
}
