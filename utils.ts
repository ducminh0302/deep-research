/**
 * Aggressive helper to clean Google/Vertex wrapper URLs to get the original source
 */
export const cleanSourceUrl = (uri: string): string => {
    if (!uri) return '';

    try {
        // 0. Initial cleanup
        let cleanUri = uri.trim();

        // 1. Fast path: if it's not a google wrapper, return it
        try {
            const urlObj = new URL(cleanUri);
            const host = urlObj.hostname;
            if (!host.includes('google') && !host.includes('vertex') && !host.includes('gstatic')) {
                return cleanUri;
            }
        } catch (e) {
            // If it's not a valid URL, just return it or try to find one inside
        }

        // 2. Recursive Decoding
        // Sometimes URLs are double or triple encoded
        let decoded = cleanUri;
        let maxDecodes = 3;
        while (maxDecodes > 0) {
            try {
                const next = decodeURIComponent(decoded);
                if (next === decoded) break;
                decoded = next;
            } catch {
                break;
            }
            maxDecodes--;
        }

        // 3. Priority: Check standard redirect parameters
        try {
            const urlObj = new URL(cleanUri);
            const params = urlObj.searchParams;
            const candidates = ['url', 'original_url', 'q', 'href', 'dest', 'u', 'adurl', 'r', 'uddg'];

            for (const key of candidates) {
                const val = params.get(key);
                if (val && val.startsWith('http')) {
                    return cleanSourceUrl(val);
                }
            }
        } catch { }

        // 4. Deep Regex Scan (The "Nuclear Option")
        // Find anything that looks like a URL starting with http/https
        const matches = decoded.matchAll(/https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s"<>]*)?/g);
        const urls = Array.from(matches).map(m => m[0]);

        // Filter out the wrapper domains themselves
        const validUrls = urls.filter(u => {
            try {
                const h = new URL(u).hostname;
                return !h.includes('vertexaisearch') &&
                    !h.includes('google.com') &&
                    !h.includes('googleusercontent') &&
                    !h.includes('gstatic') &&
                    !h.includes('googleapis');
            } catch { return false; }
        });

        if (validUrls.length > 0) {
            // Return the LAST valid URL found, as redirects often put the destination last
            // But we should also check if the last one is just a tracking pixel or something.
            // Usually the real content is the last substantial URL.
            return validUrls[validUrls.length - 1];
        }

        // 5. If all else fails, and we still have a vertex/google URL, 
        // try to strip the prefix if it looks like a proxy path (e.g. google.com/url?q=...)
        // (Already covered by params check, but sometimes it's path based)

        return cleanUri;

    } catch (error) {
        return uri;
    }
};

/**
 * Extract a displayable domain from a URL
 */
export const getDisplayDomain = (url: string): string => {
    try {
        const urlObj = new URL(url);
        let hostname = urlObj.hostname;
        hostname = hostname.replace(/^www\./, '');

        // If logic failed and we still have a wrapper domain, try one last visual desperation move
        if (hostname.includes('vertexaisearch') || hostname.includes('google.com') || hostname.includes('googleusercontent')) {
            // Scan the URL string for anything that looks like a domain that ISN'T google
            const domainMatch = url.match(/([a-zA-Z0-9-]+\.)+(com|org|net|vn|edu|gov|io|info|biz|co|uk|jp|de)[^\w]/g);
            if (domainMatch) {
                // Filter generic google domains
                const candidates = domainMatch
                    .map(d => d.replace(/[^a-zA-Z0-9.-]/g, '')) // clean trailing chars
                    .filter(d => !d.includes('google') && !d.includes('vertex'));

                if (candidates.length > 0) {
                    return candidates[candidates.length - 1];
                }
            }
            return hostname;
        }
        return hostname;
    } catch {
        return 'Nguồn tham khảo';
    }
};
