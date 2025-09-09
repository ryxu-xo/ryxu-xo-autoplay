import * as https from 'https';

/**
 * Optimized HTTP agent configuration
 */
const AGENT_CONFIG = {
  keepAlive: true,
  maxSockets: 5,
  maxFreeSockets: 2,
  timeout: 8000,
  freeSocketTimeout: 4000
};

const agent = new https.Agent(AGENT_CONFIG);

/**
 * SoundCloud link pattern
 */
const SC_LINK_RE = /<a\s+itemprop="url"\s+href="(\/[^"]+)"/g;

/**
 * Constants for autoplay APIs
 */
const MAX_REDIRECTS = 2; // Reduced for faster performance
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // Reduced for lower memory usage
const MAX_SC_LINKS = 20; // Reduced for faster processing
const MAX_SP_RESULTS = 5; // Reduced for faster processing
const DEFAULT_TIMEOUT_MS = 5000; // Reduced for faster performance

/**
 * Fast fetch with redirect support and optimized settings
 */
export async function fastFetch(url: string, depth = 0): Promise<string> {
  if (depth > MAX_REDIRECTS) {
    throw new Error('Too many redirects');
  }

  return new Promise((resolve, reject) => {
    const req = https.get(url, { agent, timeout: DEFAULT_TIMEOUT_MS }, res => {
      const { statusCode, headers } = res;

      if (statusCode && statusCode >= 300 && statusCode < 400 && headers.location) {
        res.resume();
        return fastFetch(new URL(headers.location, url).href, depth + 1)
          .then(resolve, reject);
      }

      if (statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${statusCode}`));
      }

      const chunks: Buffer[] = [];
      let received = 0;

      res.on('data', chunk => {
        received += chunk.length;
        if (received > MAX_RESPONSE_BYTES) {
          req.destroy(new Error('Response too large'));
          return;
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        try {
          const buf = Buffer.concat(chunks);
          resolve(buf.toString());
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(DEFAULT_TIMEOUT_MS, () => req.destroy(new Error('Timeout')));
  });
}

/**
 * Shuffle array in place
 */
export function shuffleInPlace<T>(arr: T[]): T[] {
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
 * SoundCloud autoplay using improved API
 */
export async function scAutoPlay(baseUrl: string): Promise<string[]> {
  try {
    const html = await fastFetch(`${baseUrl}/recommended`);
    const links: string[] = [];
    
    for (const match of html.matchAll(SC_LINK_RE)) {
      if (!match[1]) continue;
      links.push(`https://soundcloud.com${match[1]}`);
      if (links.length >= MAX_SC_LINKS) break;
    }
    
    return links.length ? shuffleInPlace(links) : [];
  } catch (err) {
    console.error('scAutoPlay error:', err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Spotify autoplay using improved API
 * This is a placeholder - you'll need to implement the actual Lavalink integration
 */
export async function spAutoPlay(
  seed: { trackId?: string; artistIds?: string }, 
  player: any, 
  requester: any, 
  excludedIds: string[] = []
): Promise<any[]> {
  try {
    if (!seed?.trackId && !seed?.artistIds) return [];

    const seen = new Set(excludedIds);
    const prevId = player?.current?.identifier;
    if (prevId) seen.add(prevId);

    const allCandidates: any[] = [];
    const queries = [];

    if (seed.trackId) {
      queries.push(`mix:track:${seed.trackId}`);
    }

    if (seed.artistIds) {
      const artistId = seed.artistIds?.split(',')[0]?.trim() || '';
      queries.push(`mix:artist:${artistId}`);
    }

    for (const query of queries) {
      try {
        let res;
        try {
          // Try Aqua resolve first
          res = await player.aqua.resolve({ query, source: 'sprec', requester });
        } catch (aquaErr) {
          console.log('Aqua resolve failed, trying Lavalink fallback:', aquaErr instanceof Error ? aquaErr.message : aquaErr);

          if (player.nodes?.rest) {
            const lavalinkRes = await player.nodes.rest.get(`/v4/loadtracks?identifier=${encodeURIComponent(query)}`);
            res = { tracks: lavalinkRes.tracks || [] };
          } else {
            throw aquaErr;
          }
        }

        const candidates = res?.tracks || [];

        let prioritizedCandidates = candidates;
        if (seed.artistIds && candidates.length > 0) {
          const seedArtists = seed.artistIds.split(',').map(a => a.trim().toLowerCase());
          const artistTracks = candidates.filter((t: any) =>
            t.info?.author && seedArtists.some((seedArtist: string) =>
              t.info.author.toLowerCase().includes(seedArtist) ||
              seedArtist.includes(t.info.author.toLowerCase())
            )
          );
          const otherTracks = candidates.filter((t: any) => !artistTracks.includes(t));
          prioritizedCandidates = [...artistTracks, ...otherTracks];
        }

        for (const t of prioritizedCandidates) {
          if (!seen.has(t.identifier)) {
            seen.add(t.identifier);
            t.pluginInfo = { ...(t.pluginInfo || {}), clientData: { fromAutoplay: true } };
            allCandidates.push(t);
          }
        }
      } catch (queryErr) {
        console.error(`Query ${query} failed:`, queryErr instanceof Error ? queryErr.message : queryErr);
      }
    }

    if (!allCandidates.length) return [];

    const shuffled = shuffleInPlace([...allCandidates]);
    const out = shuffled.slice(0, MAX_SP_RESULTS);

    console.log(`Returning ${out.length} autoplay tracks`);
    return out;
  } catch (err) {
    console.error('spAutoPlay error:', err);
    return [];
  }
}
