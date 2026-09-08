Beauty Advisor cache behavior

- Static greetings, identity/help prompts, obvious out-of-scope prompts: answered without Gemini.
- Dynamic conversations: cache key is a SHA-256 hash of normalized conversation.
- Cached dynamic responses store the exact tool filters and fingerprints of the product results used.
- On a cache hit, the API re-runs the saved product search against the live PostgreSQL data and compares fingerprints.
- Same fingerprints: cached answer/products are returned without Gemini.
- Different fingerprints: the cache is stale; Gemini is called, then the answer and fresh fingerprints replace the cache entry.
- The database schema creates beauty_advisor_cache automatically through server/migrate.js during deployment.
