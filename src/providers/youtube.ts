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
   * Get next YouTube track using Euralink search
   */
  public async getNextTrack(trackInfo: LavalinkTrackInfo, excludeIds: Set<string> = new Set()): Promise<AutoplayResult> {
    try {
      this.validateTrackInfo(trackInfo);

      if (!this.canHandle(trackInfo)) {
        return this.createErrorResult('Cannot handle this track type');
      }

      const videoId = trackInfo.identifier;
      
      // Use Euralink to search for similar content
      const searchQuery = this.createSearchQuery(trackInfo);
      const autoplayTracks = await this.getYouTubeAutoplayTracks(searchQuery, excludeIds);
      
      if (!autoplayTracks || autoplayTracks.length === 0) {
        this.eventEmitter.emitTrackNotFound({
          source: this.name,
          trackInfo,
          metadata: { videoId }
        });
        
        return this.createErrorResult('No YouTube autoplay tracks found');
      }

      const selectedTrack = autoplayTracks[0];
      const trackUrl = selectedTrack.info?.uri || selectedTrack.uri || `https://www.youtube.com/watch?v=${selectedTrack.identifier}`;

      this.eventEmitter.emitTrackFound({
        source: this.name,
        trackInfo,
        metadata: { 
          videoId, 
          selectedVideoId: selectedTrack.identifier,
          trackName: selectedTrack.info?.title || 'Unknown',
          author: selectedTrack.info?.author || 'Unknown'
        }
      });

      return this.createSuccessResult(trackUrl, selectedTrack.identifier, {
        originalVideoId: videoId,
        selectedVideoId: selectedTrack.identifier,
        trackName: selectedTrack.info?.title,
        author: selectedTrack.info?.author
      });

    } catch (error) {
      return this.handleError(
        error instanceof Error ? error : new Error('Unknown YouTube provider error'),
        trackInfo
      );
    }
  }

  /**
   * Create search query for YouTube autoplay
   */
  private createSearchQuery(trackInfo: LavalinkTrackInfo): string {
    // Use artist and title for better search results
    const artist = trackInfo.author || '';
    const title = trackInfo.title || '';
    
    if (artist && title) {
      return `${artist} ${title}`;
    } else if (title) {
      return title;
    } else {
      return `music`;
    }
  }

  /**
   * Get YouTube autoplay tracks using Euralink
   */
  private async getYouTubeAutoplayTracks(searchQuery: string, excludeIds: Set<string> = new Set()): Promise<any[]> {
    try {
      // Try to use the global Euralink instance if available
      if (typeof global !== 'undefined' && (global as any).eura) {
        const eura = (global as any).eura;
        const result = await eura.resolve({ 
          query: searchQuery, 
          source: 'ytsearch',
          requester: { id: 'autoplay', username: 'Autoplay' }
        });
        
        if (result && result.tracks && result.tracks.length > 0) {
          // Filter out tracks that are already in history
          const filteredTracks = result.tracks.filter((track: any) => {
            const trackId = track.identifier || track.info?.identifier;
            return trackId && !excludeIds.has(trackId);
          });
          
          // Return first 5 tracks for variety (increased from 3)
          return filteredTracks.slice(0, 5);
        }
      }
      
      return [];
    } catch (error) {
      console.error('YouTube autoplay error:', error);
      return [];
    }
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
