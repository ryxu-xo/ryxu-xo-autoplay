import * as crypto from 'crypto';
import { BaseProvider } from './base';
import { LavalinkTrackInfo, AutoplayResult, AutoplaySource, SpotifyTrack, ProviderConfig } from '../types';
import { AutoplayEventEmitter } from '../events';
import { fetchPage, parseJsonResponse } from '../utils/http';

/**
 * Spotify autoplay provider
 */
export class SpotifyProvider extends BaseProvider {
  public readonly name: AutoplaySource = 'spotify';
  private readonly totpSecret: Buffer;
  private readonly maxRecommendations: number;

  constructor(eventEmitter: AutoplayEventEmitter, config: ProviderConfig['spotify'] = {}) {
    super(eventEmitter);
    this.totpSecret = Buffer.from(config.totpSecret || '5507145853487499592248630329347', 'utf8');
    this.maxRecommendations = config.maxRecommendations || 10;
  }

  /**
   * Check if this provider can handle Spotify tracks
   */
  public canHandle(trackInfo: LavalinkTrackInfo): boolean {
    return trackInfo.sourceName === 'spotify' && !!trackInfo.identifier;
  }

  /**
   * Get next Spotify track using recommendations API
   */
  public async getNextTrack(trackInfo: LavalinkTrackInfo): Promise<AutoplayResult> {
    try {
      this.validateTrackInfo(trackInfo);

      if (!this.canHandle(trackInfo)) {
        return this.createErrorResult('Cannot handle this track type');
      }

      const trackId = trackInfo.identifier;
      const [totp, timestamp] = this.createTotp();

      // Get access token
      const token = await this.getAccessToken(totp, timestamp);
      
      // Get recommendations
      const recommendations = await this.getRecommendations(trackId, token);
      
      if (!recommendations.length) {
        this.eventEmitter.emitTrackNotFound({
          source: this.name,
          trackInfo,
          metadata: { trackId }
        });
        
        return this.createErrorResult('No recommendations found');
      }

      const selectedTrack = this.selectRandomTrack(recommendations);
      const trackUrl = `https://open.spotify.com/track/${selectedTrack.id}`;

      this.eventEmitter.emitTrackFound({
        source: this.name,
        trackInfo,
        metadata: {
          originalTrackId: trackId,
          selectedTrackId: selectedTrack.id,
          trackName: selectedTrack.name,
          artists: selectedTrack.artists.map(a => a.name)
        }
      });

      return this.createSuccessResult(trackUrl, selectedTrack.id, {
        originalTrackId: trackId,
        trackName: selectedTrack.name,
        artists: selectedTrack.artists,
        album: selectedTrack.album,
        duration: selectedTrack.duration_ms
      });

    } catch (error) {
      return this.handleError(
        error instanceof Error ? error : new Error('Unknown Spotify provider error'),
        trackInfo
      );
    }
  }

  /**
   * Generate TOTP for Spotify authentication
   */
  private createTotp(): [string, number] {
    const time = Math.floor(Date.now() / 30000);
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(time), 0);

    const hash = crypto.createHmac('sha1', this.totpSecret).update(buffer).digest();
    const offset = (hash[hash.length - 1] || 0) & 0xf;

    const code = (
      (((hash[offset] || 0) & 0x7f) << 24) |
      (((hash[offset + 1] || 0) & 0xff) << 16) |
      (((hash[offset + 2] || 0) & 0xff) << 8) |
      ((hash[offset + 3] || 0) & 0xff)
    );

    return [(code % 1_000_000).toString().padStart(6, '0'), time * 30000];
  }

  /**
   * Get Spotify access token
   */
  private async getAccessToken(totp: string, timestamp: number): Promise<string> {
    const tokenEndpoint = `https://open.spotify.com/api/token?reason=init&productType=embed&totp=${totp}&totpVer=5&ts=${timestamp}`;
    
    const response = await fetchPage(tokenEndpoint, {
      headers: {
        'Referer': 'https://open.spotify.com/',
        'Origin': 'https://open.spotify.com'
      }
    });

    const tokenData = parseJsonResponse<{ accessToken?: string }>(response);
    
    if (!tokenData.accessToken) {
      throw new Error('Failed to get Spotify access token');
    }

    return tokenData.accessToken;
  }

  /**
   * Get track recommendations from Spotify
   */
  private async getRecommendations(trackId: string, token: string): Promise<SpotifyTrack[]> {
    const recUrl = `https://api.spotify.com/v1/recommendations?limit=${this.maxRecommendations}&seed_tracks=${trackId}`;
    
    const response = await fetchPage(recUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const data = parseJsonResponse<{ tracks?: SpotifyTrack[] }>(response);
    
    if (!data.tracks || !Array.isArray(data.tracks)) {
      throw new Error('Invalid recommendations response from Spotify');
    }

    return data.tracks;
  }

  /**
   * Select a random track from recommendations
   */
  private selectRandomTrack(tracks: SpotifyTrack[]): SpotifyTrack {
    const track = tracks[Math.floor(Math.random() * tracks.length)];
    if (!track) {
      throw new Error('No tracks available for selection');
    }
    return track;
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
