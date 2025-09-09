import * as https from 'https';
import { BaseProvider } from './base';
import { LavalinkTrackInfo, AutoplayResult, AutoplaySource, SpotifyTrack, ProviderConfig } from '../types';
import { AutoplayEventEmitter } from '../events';

/**
 * Spotify autoplay provider using improved API
 */
export class SpotifyProvider extends BaseProvider {
  public readonly name: AutoplaySource = 'spotify';
  private readonly maxResults: number;
  private readonly agent: https.Agent;

  constructor(eventEmitter: AutoplayEventEmitter, config: ProviderConfig['spotify'] = {}) {
    super(eventEmitter);
    this.maxResults = config.maxRecommendations || 10;
    
    // Create optimized HTTP agent
    this.agent = new https.Agent({
      keepAlive: true,
      maxSockets: 5,
      maxFreeSockets: 2,
      timeout: 8000
    });
  }

  /**
   * Check if this provider can handle Spotify tracks
   */
  public canHandle(trackInfo: LavalinkTrackInfo): boolean {
    return trackInfo.sourceName === 'spotify' && !!trackInfo.identifier;
  }

  /**
   * Get next Spotify track using improved API
   */
  public async getNextTrack(trackInfo: LavalinkTrackInfo, excludeIds: Set<string> = new Set()): Promise<AutoplayResult> {
    try {
      this.validateTrackInfo(trackInfo);

      if (!this.canHandle(trackInfo)) {
        return this.createErrorResult('Cannot handle this track type');
      }

      const originalTrackId = trackInfo.identifier;
      
      // Use the improved Spotify autoplay logic
      const autoplayTracks = await this.getSpotifyAutoplayTracks(trackInfo, excludeIds);
      
      if (!autoplayTracks || autoplayTracks.length === 0) {
        this.eventEmitter.emitTrackNotFound({
          source: this.name,
          trackInfo,
          metadata: { trackId: originalTrackId }
        });
        
        return this.createErrorResult('No Spotify autoplay tracks found');
      }

      const selectedTrack = autoplayTracks[0]; // First track from shuffled results
      
      // Handle different track structures from Euralink
      const trackId = selectedTrack.identifier || selectedTrack.info?.identifier || selectedTrack.trackId;
      const trackTitle = selectedTrack.info?.title || selectedTrack.title || 'Unknown Track';
      const trackAuthor = selectedTrack.info?.author || selectedTrack.author || 'Unknown Artist';
      const trackUri = selectedTrack.info?.uri || selectedTrack.uri || `https://open.spotify.com/track/${trackId}`;
      
      // Use the URI directly if available, otherwise construct it
      const trackUrl = trackUri.startsWith('http') ? trackUri : `https://open.spotify.com/track/${trackId}`;

      this.eventEmitter.emitTrackFound({
        source: this.name,
        trackInfo,
        metadata: {
          originalTrackId: originalTrackId,
          selectedTrackId: trackId,
          trackName: trackTitle,
          artists: trackAuthor,
          totalFound: autoplayTracks.length
        }
      });

      return this.createSuccessResult(trackUrl, trackId, {
        originalTrackId: originalTrackId,
        trackName: trackTitle,
        author: trackAuthor,
        duration: selectedTrack.info?.length || selectedTrack.duration,
        totalFound: autoplayTracks.length
      });

    } catch (error) {
      return this.handleError(
        error instanceof Error ? error : new Error('Unknown Spotify provider error'),
        trackInfo
      );
    }
  }

  /**
   * Get Spotify autoplay tracks using improved API
   */
  private async getSpotifyAutoplayTracks(trackInfo: LavalinkTrackInfo, excludeIds: Set<string> = new Set()): Promise<any[]> {
    try {
      const trackId = trackInfo.identifier;
      const seen = new Set();
      const allCandidates: any[] = [];
      const queries = [];

      // Build queries for Spotify autoplay
      queries.push(`mix:track:${trackId}`);
      
      // If we have artist info, also try artist-based autoplay
      if (trackInfo.author) {
        // For now, we'll use track-based autoplay
        // In a real implementation, you'd need to resolve artist IDs
      }

      for (const query of queries) {
        try {
          // Use Lavalink to resolve Spotify autoplay queries
          const response = await this.resolveWithLavalink(query);
          const candidates = response?.tracks || [];

          for (const track of candidates) {
            const trackIdentifier = track.identifier || track.info?.identifier;
            if (!seen.has(trackIdentifier) && !excludeIds.has(trackIdentifier)) {
              seen.add(trackIdentifier);
              track.pluginInfo = { ...(track.pluginInfo || {}), clientData: { fromAutoplay: true } };
              allCandidates.push(track);
            }
          }
        } catch (queryErr) {
          console.error(`Spotify query ${query} failed:`, queryErr instanceof Error ? queryErr.message : queryErr);
        }
      }

      if (!allCandidates.length) return [];

      // Shuffle and return limited results
      const shuffled = this.shuffleInPlace([...allCandidates]);
      return shuffled.slice(0, this.maxResults);

    } catch (error) {
      console.error('Spotify autoplay error:', error);
      return [];
    }
  }

  /**
   * Resolve query using Lavalink
   */
  private async resolveWithLavalink(query: string): Promise<any> {
    try {
      // Try to use the global Euralink instance if available
      if (typeof global !== 'undefined' && (global as any).eura) {
        const eura = (global as any).eura;
        const result = await eura.resolve({ 
          query, 
          source: 'sprec',
          requester: { id: 'autoplay', username: 'Autoplay' }
        });
        
        if (result && result.tracks) {
          return { tracks: result.tracks };
        }
      }
      
      // Fallback: try to construct a Spotify autoplay URL
      // For Spotify, we can try to get recommendations using the track ID
      const trackId = this.extractTrackIdFromQuery(query);
      if (trackId) {
        // Try to get a Spotify radio/mix URL
        const radioUrl = `https://open.spotify.com/track/${trackId}`;
        return { tracks: [{ 
          identifier: trackId,
          info: {
            title: 'Spotify Autoplay Track',
            author: 'Unknown Artist',
            length: 0,
            identifier: trackId,
            uri: radioUrl,
            sourceName: 'spotify'
          }
        }] };
      }
      
      return { tracks: [] };
    } catch (error) {
      console.error('Lavalink resolve error:', error);
      return { tracks: [] };
    }
  }

  /**
   * Extract track ID from query
   */
  private extractTrackIdFromQuery(query: string): string | null {
    const match = query.match(/mix:track:([a-zA-Z0-9]+)/);
    return match ? (match[1] || null) : null;
  }

  /**
   * Shuffle array in place
   */
  private shuffleInPlace<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.random() * (i + 1) | 0;
      const tmp = arr[i];
      if (arr[i] !== undefined && arr[j] !== undefined && tmp !== undefined) {
        arr[i] = arr[j];
        arr[j] = tmp;
      }
    }
    return arr;
  }

  /**
   * Extract track ID from Spotify URL
   */
  public static extractTrackId(url: string): string | null {
    const patterns = [
      /spotify\.com\/track\/([a-zA-Z0-9]+)/,
      /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/
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
   * Validate Spotify track ID format
   */
  public static isValidTrackId(trackId: string): boolean {
    return /^[a-zA-Z0-9]{22}$/.test(trackId);
  }
}
