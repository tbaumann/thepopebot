Implement Proper Anthropic Rate Limit Handling

The job should:

1. **Audit current code** - Find all Anthropic API calls across the codebase (event handler Claude integration, Docker agent Pi usage, etc.)

2. **Implement retry wrapper** - Create a robust retry utility that:
   - Catches 429 errors specifically 
   - Reads and honors the `retry-after` header when provided
   - Falls back to exponential backoff (1s, 2s, 4s, 8s, up to 60s max)
   - Logs rate limit events for monitoring
   - Has configurable max retry attempts (default: 5)
   - Includes jitter to prevent thundering herd

3. **Update all API calls** - Wrap existing Anthropic calls with the new retry logic

4. **Add rate limit monitoring** - Capture and log the rate limit headers (`anthropic-ratelimit-*`) for usage monitoring

5. **Error handling** - Ensure graceful degradation when rate limits persist after max retries

6. **Documentation** - Update relevant docs with the new retry behavior