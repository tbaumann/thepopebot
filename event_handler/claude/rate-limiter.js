/**
 * Rate limit handler for Anthropic API
 * - Parses rate limit headers from responses
 * - Implements exponential backoff with jitter
 * - Handles 429 errors gracefully
 * - Logs rate limit events for monitoring
 */

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_INITIAL_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 60000; // 1 minute
const DEFAULT_JITTER_FACTOR = 0.1;

/**
 * Get configuration from environment
 * @returns {Object} Configuration object
 */
function getConfig() {
  return {
    maxRetries: parseInt(process.env.ANTHROPIC_MAX_RETRIES || DEFAULT_MAX_RETRIES, 10),
    initialDelay: parseInt(
      process.env.ANTHROPIC_INITIAL_DELAY_MS || DEFAULT_INITIAL_DELAY_MS,
      10
    ),
    maxDelay: parseInt(process.env.ANTHROPIC_MAX_DELAY_MS || DEFAULT_MAX_DELAY_MS, 10),
    jitterFactor: parseFloat(process.env.ANTHROPIC_JITTER_FACTOR || DEFAULT_JITTER_FACTOR),
    logRateLimits: process.env.ANTHROPIC_LOG_RATE_LIMITS !== 'false', // enabled by default
  };
}

/**
 * Parse rate limit info from response headers
 * @param {Response} response - Fetch response object
 * @returns {Object} Rate limit info
 */
function parseRateLimitHeaders(response) {
  const headers = response.headers || {};
  return {
    limitRequests: headers.get?.('anthropic-ratelimit-requests-limit') || null,
    limitTokens: headers.get?.('anthropic-ratelimit-tokens-limit') || null,
    remainingRequests: headers.get?.('anthropic-ratelimit-requests-remaining') || null,
    remainingTokens: headers.get?.('anthropic-ratelimit-tokens-remaining') || null,
    requestsReset: headers.get?.('anthropic-ratelimit-requests-reset') || null,
    tokensReset: headers.get?.('anthropic-ratelimit-tokens-reset') || null,
    retryAfter:
      headers.get?.('retry-after') || headers.get?.('anthropic-ratelimit-reset-tokens') || null,
  };
}

/**
 * Calculate delay with exponential backoff and jitter
 * @param {number} attempt - Attempt number (0-indexed)
 * @param {string|null} retryAfter - Retry-After header value in seconds
 * @param {Object} config - Configuration object
 * @returns {number} Delay in milliseconds
 */
function calculateDelay(attempt, retryAfter, config) {
  let delay;

  // If server provided retry-after header, use it
  if (retryAfter) {
    // Retry-After can be in seconds or HTTP-date format
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      delay = seconds * 1000;
    } else {
      // Assume it's an HTTP-date format, parse it
      const retryDate = new Date(retryAfter);
      if (retryDate instanceof Date && !isNaN(retryDate)) {
        delay = Math.max(0, retryDate.getTime() - Date.now());
      } else {
        delay = config.initialDelay * Math.pow(2, attempt);
      }
    }
  } else {
    // Exponential backoff: initial * 2^attempt
    delay = config.initialDelay * Math.pow(2, attempt);
  }

  // Cap at max delay
  delay = Math.min(delay, config.maxDelay);

  // Add jitter (±10% by default)
  const jitterAmount = delay * config.jitterFactor;
  const jitter = (Math.random() - 0.5) * 2 * jitterAmount;
  delay = Math.max(0, delay + jitter);

  return Math.round(delay);
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Log rate limit event
 * @param {Object} event - Event details
 */
function logRateLimitEvent(event) {
  const timestamp = new Date().toISOString();
  const status = event.status || 'N/A';
  const attempt = event.attempt || 'N/A';
  const delay = event.delay || 'N/A';
  const reason = event.reason || '';

  console.log(
    `[RATE_LIMIT] ${timestamp} | Status: ${status} | Attempt: ${attempt} | Delay: ${delay}ms | ${reason}`
  );

  // Log detailed rate limit info if available
  if (event.rateLimitInfo) {
    const info = event.rateLimitInfo;
    if (info.remainingRequests !== null) {
      console.log(
        `[RATE_LIMIT_INFO] Requests: ${info.remainingRequests}/${info.limitRequests} remaining`
      );
    }
    if (info.remainingTokens !== null) {
      console.log(
        `[RATE_LIMIT_INFO] Tokens: ${info.remainingTokens}/${info.limitTokens} remaining`
      );
    }
    if (info.requestsReset) {
      console.log(`[RATE_LIMIT_INFO] Requests reset at: ${info.requestsReset}`);
    }
    if (info.tokensReset) {
      console.log(`[RATE_LIMIT_INFO] Tokens reset at: ${info.tokensReset}`);
    }
  }
}

/**
 * Call API with automatic retry on rate limit
 * @param {Function} apiCall - Async function that makes the API call
 * @param {string} description - Description of the call (for logging)
 * @returns {Promise<Response>} API response
 * @throws {Error} After all retries exhausted
 */
async function withRateLimit(apiCall, description = 'API call') {
  const config = getConfig();
  let lastError = null;
  let lastResponse = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await apiCall();
      lastResponse = response;

      // Check for rate limit error
      if (response.status === 429) {
        const rateLimitInfo = parseRateLimitHeaders(response);
        const retryAfter = rateLimitInfo.retryAfter;

        if (attempt < config.maxRetries) {
          const delay = calculateDelay(attempt, retryAfter, config);

          if (config.logRateLimits) {
            logRateLimitEvent({
              status: 429,
              attempt: `${attempt + 1}/${config.maxRetries + 1}`,
              delay,
              reason: `Rate limited. Retrying in ${delay}ms...`,
              rateLimitInfo,
            });
          }

          await sleep(delay);
          continue;
        } else {
          if (config.logRateLimits) {
            logRateLimitEvent({
              status: 429,
              attempt: `${attempt + 1}/${config.maxRetries + 1}`,
              reason: 'Max retries exhausted. Throwing error.',
              rateLimitInfo,
            });
          }

          const errorText = await response.text();
          throw new Error(
            `Claude API rate limited after ${config.maxRetries} retries: ${response.status} ${errorText}`
          );
        }
      }

      // Non-429 error
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error: ${response.status} ${errorText}`);
      }

      // Success
      if (config.logRateLimits && attempt > 0) {
        logRateLimitEvent({
          status: response.status,
          attempt: `${attempt + 1}/${config.maxRetries + 1}`,
          reason: 'Request succeeded after retry',
        });
      }

      return response;
    } catch (error) {
      lastError = error;

      // Only retry on 429 or network errors
      if (attempt < config.maxRetries) {
        if (error.message.includes('429')) {
          continue;
        }
        // For other errors, fail immediately
        throw error;
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error(`${description} failed after ${config.maxRetries} retries`);
}

module.exports = {
  withRateLimit,
  parseRateLimitHeaders,
  calculateDelay,
  getConfig,
  logRateLimitEvent,
};
