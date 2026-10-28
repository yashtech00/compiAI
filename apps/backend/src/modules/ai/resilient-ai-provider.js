import { GoogleGenAI } from '@google/genai';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';

/**
 * Resilient Error Types
 */
export class AiProviderError extends Error {
  constructor(message, { category = 'PERMANENT', status = 500, retryable = false, originalError = null } = {}) {
    super(message);
    this.name = 'AiProviderError';
    this.category = category; // 'RATE_LIMIT' | 'TRANSIENT' | 'TIMEOUT' | 'INVALID_OUTPUT' | 'PERMANENT'
    this.status = status;
    this.retryable = retryable;
    this.originalError = originalError;
  }
}

export class CircuitBreakerOpenError extends AiProviderError {
  constructor(message = 'AI Provider Circuit Breaker is OPEN. Provider temporarily unavailable.') {
    super(message, { category: 'TRANSIENT', status: 503, retryable: false });
    this.name = 'CircuitBreakerOpenError';
  }
}

export class UserBudgetExceededError extends AiProviderError {
  constructor(message = 'Learner AI generation budget exceeded for the current time window.') {
    super(message, { category: 'RATE_LIMIT', status: 429, retryable: false });
    this.name = 'UserBudgetExceededError';
  }
}

/**
 * Centralized, production-resilient AI Provider Layer
 * Handles circuit breaking, exponential backoff with jitter, quota awareness,
 * concurrency bounding, user generation budgets, and telemetry.
 */
export class ResilientAiProvider {
  static _client = null;
  static _mockClient = null;

  // Circuit Breaker State
  static _circuitState = 'CLOSED'; // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  static _consecutiveFailures = 0;
  static _failureThreshold = 4;
  static _cooldownPeriodMs = 30000; // 30 seconds
  static _nextAttemptAt = 0;

  // Concurrency Bounding
  static _activeConcurrentCalls = 0;
  static _maxConcurrentCalls = 4;
  static _queueWaitTimeoutMs = 1500;

  // Per-User Generation Budget: max 15 calls per 15 minutes (900,000ms)
  static _userBudgets = new Map(); // userId -> { count: number, windowStart: number }
  static _maxGenerationsPerWindow = 15;
  static _budgetWindowMs = 15 * 60 * 1000;

  // Observability Metrics
  static _metrics = {
    requestsTotal: 0,
    requestsSuccess: 0,
    requestsFailed: 0,
    requestsRetried: 0,
    quotaExhaustedCount: 0,
    circuitBreakerTrips: 0,
    fallbackUsage: 0,
    budgetRejections: 0,
    concurrencyWaitCount: 0,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
    lastLatencyMs: 0
  };

  /**
   * Lazily initializes GoogleGenAI client or uses injected test client
   */
  static getClient() {
    if (this._mockClient) {
      return this._mockClient;
    }
    if (!this._client && config.geminiApiKey) {
      this._client = new GoogleGenAI({ apiKey: config.geminiApiKey });
    }
    return this._client;
  }

  /**
   * Allows unit tests to inject a mock AI client without requiring API keys
   */
  static setMockClient(client) {
    this._mockClient = client;
  }

  static resetMockClient() {
    this._mockClient = null;
  }

  /**
   * Checks if a real API provider is available or mock is configured
   */
  static isProviderAvailable() {
    if (this._mockClient) return true;
    if (config.aiProvider === 'muse' || (config.museApiKey && config.aiProvider !== 'gemini')) {
      return Boolean(config.museApiKey && config.museApiKey !== 'your-muse-key-here');
    }
    return Boolean(config.geminiApiKey && config.geminiApiKey !== 'your-gemini-api-key-here');
  }

  /**
   * Sanitizes raw model output to cleanly extract JSON from potential markdown tags
   */
  static cleanJsonText(rawText) {
    if (!rawText) return '{}';
    let cleaned = rawText.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }
    return cleaned;
  }

  /**
   * Safe server-side HTTPS invocation of Meta Muse AI API with bounded timeouts and zero client key exposure
   */
  static async _callMuseAi({ prompt, configOptions = {}, responseFormat = 'json', timeoutMs = 10000 }) {
    if (!config.museApiKey) {
      throw new AiProviderError('Muse AI API key not configured.', {
        category: 'PERMANENT',
        status: 500,
        retryable: false
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const messages = [];
      const systemInstruction =
        configOptions?.systemInstruction ||
        'You are an expert Socratic AI software engineering mentor. Adhere strictly to the requested schema and answer concisely with zero fluff.';
      messages.push({ role: 'developer', content: systemInstruction });
      messages.push({ role: 'user', content: prompt });

      const requestBody = {
        model: config.museModel || 'muse-spark-1.3',
        messages,
        temperature: configOptions?.temperature ?? 0.2
      };

      if (responseFormat === 'json') {
        requestBody.response_format = { type: 'json_object' };
      }

      const res = await fetch(`${config.museBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.museApiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      if (!res.ok) {
        let errSnippet = '';
        try {
          const errJson = await res.json();
          errSnippet = errJson?.error?.message || JSON.stringify(errJson);
        } catch (_) {
          try {
            errSnippet = (await res.text()).slice(0, 150);
          } catch (_) {}
        }

        const isRateLimit = res.status === 429;
        const isServerErr = res.status >= 500;
        throw new AiProviderError(`Muse API error HTTP ${res.status}: ${errSnippet}`, {
          category: isRateLimit ? 'RATE_LIMIT' : isServerErr ? 'TRANSIENT' : 'PERMANENT',
          status: res.status,
          retryable: isRateLimit || isServerErr
        });
      }

      const resData = await res.json();
      const rawText = resData?.choices?.[0]?.message?.content || '';
      const inTokens = resData?.usage?.prompt_tokens || 0;
      const outTokens = resData?.usage?.completion_tokens || 0;
      const model = resData?.model || config.museModel || 'muse-spark-1.3';

      return {
        rawText,
        inTokens,
        outTokens,
        model
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new AiProviderError(`MUSE_TIMEOUT: Request exceeded timeout of ${timeoutMs}ms`, {
          category: 'TIMEOUT',
          status: 504,
          retryable: true,
          originalError: err
        });
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Categorizes errors to prevent unlimited retries on permanent or quota failures
   */
  static classifyError(err) {
    const msg = String(err?.message || '').toLowerCase();
    const status = err?.status || err?.code || 500;

    // 1. Quota / Rate limit (HTTP 429 / RESOURCE_EXHAUSTED)
    if (status === 429 || msg.includes('429') || msg.includes('resource_exhausted') || msg.includes('quota exceeded')) {
      return {
        category: 'RATE_LIMIT',
        status: 429,
        retryable: false, // Quota exhausted free-tier is NOT immediately retryable!
        reason: 'QUOTA_EXHAUSTED'
      };
    }

    // 2. Timeout
    if (msg.includes('timeout') || msg.includes('gemini_timeout') || err?.name === 'AbortError') {
      return {
        category: 'TIMEOUT',
        status: 504,
        retryable: true,
        reason: 'REQUEST_TIMEOUT'
      };
    }

    // 3. Transient Network / Infrastructure Outage
    if (
      msg.includes('econnreset') ||
      msg.includes('etimedout') ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('fetch failed') ||
      status === 502 ||
      status === 503 ||
      status === 504
    ) {
      return {
        category: 'TRANSIENT',
        status: typeof status === 'number' ? status : 503,
        retryable: true,
        reason: 'TRANSIENT_NETWORK_ERROR'
      };
    }

    // 4. Invalid Output (JSON parse or schema validation failed)
    if (msg.includes('json') || msg.includes('unexpected token') || msg.includes('schema')) {
      return {
        category: 'INVALID_OUTPUT',
        status: 502,
        retryable: true,
        reason: 'INVALID_MODEL_OUTPUT'
      };
    }

    // 5. Permanent Configuration or Bad Request (400, 401, 403, 404, safety)
    if (status === 400 || status === 401 || status === 403 || status === 404 || msg.includes('api_key') || msg.includes('safety')) {
      return {
        category: 'PERMANENT',
        status: typeof status === 'number' ? status : 400,
        retryable: false,
        reason: 'PERMANENT_CLIENT_OR_AUTH_ERROR'
      };
    }

    return {
      category: 'TRANSIENT',
      status: 500,
      retryable: true,
      reason: 'UNKNOWN_PROVIDER_ERROR'
    };
  }

  /**
   * Checks and enforces per-user generation budgets over sliding window
   */
  static checkUserBudget(userId) {
    if (!userId) return;

    const now = Date.now();
    const record = this._userBudgets.get(userId) || { count: 0, windowStart: now };

    if (now - record.windowStart > this._budgetWindowMs) {
      // Window expired; reset
      this._userBudgets.set(userId, { count: 1, windowStart: now });
      return;
    }

    if (record.count >= this._maxGenerationsPerWindow) {
      this._metrics.budgetRejections++;
      logger.warn(`User ${userId} exceeded AI generation budget (${record.count}/${this._maxGenerationsPerWindow}).`);
      throw new UserBudgetExceededError(
        `AI generation budget reached for this session window (${this._maxGenerationsPerWindow} requests/15m). Please wait or study existing lessons.`
      );
    }

    record.count++;
    this._userBudgets.set(userId, record);
  }

  /**
   * Checks circuit breaker state before invoking external provider
   */
  static checkCircuitBreaker() {
    const now = Date.now();

    if (this._circuitState === 'OPEN') {
      if (now >= this._nextAttemptAt) {
        this._circuitState = 'HALF_OPEN';
        logger.info('AI Provider Circuit Breaker transitioned to HALF_OPEN probe state.');
      } else {
        throw new CircuitBreakerOpenError(
          `AI Provider is currently degraded (circuit OPEN). Automatic cooldown active for ${Math.round((this._nextAttemptAt - now) / 1000)}s.`
        );
      }
    }
  }

  /**
   * Records success in circuit breaker
   */
  static recordCircuitSuccess() {
    if (this._circuitState === 'HALF_OPEN') {
      logger.info('AI Provider probe succeeded. Circuit Breaker CLOSED.');
    }
    this._circuitState = 'CLOSED';
    this._consecutiveFailures = 0;
  }

  /**
   * Records failure in circuit breaker
   */
  static recordCircuitFailure(classified) {
    // Only transient and quota failures trip the circuit breaker
    if (classified.category === 'TRANSIENT' || classified.category === 'RATE_LIMIT' || classified.category === 'TIMEOUT') {
      this._consecutiveFailures++;
      if (this._consecutiveFailures >= this._failureThreshold) {
        this._circuitState = 'OPEN';
        this._nextAttemptAt = Date.now() + this._cooldownPeriodMs;
        this._metrics.circuitBreakerTrips++;
        logger.warn(
          `AI Provider Circuit Breaker TRIPPED to OPEN after ${this._consecutiveFailures} consecutive failures. Cooldown: ${this._cooldownPeriodMs}ms.`
        );
      }
    }
  }

  /**
   * Acquires a slot in the concurrency limiter
   */
  static async acquireConcurrencySlot() {
    if (this._activeConcurrentCalls < this._maxConcurrentCalls) {
      this._activeConcurrentCalls++;
      return;
    }

    this._metrics.concurrencyWaitCount++;
    const startTime = Date.now();

    while (this._activeConcurrentCalls >= this._maxConcurrentCalls) {
      if (Date.now() - startTime > this._queueWaitTimeoutMs) {
        logger.warn('AI Concurrency limiter saturated. Request queued out.');
        throw new AiProviderError('AI provider concurrency limit reached. Please try again shortly.', {
          category: 'TRANSIENT',
          status: 503,
          retryable: true
        });
      }
      await new Promise(r => setTimeout(r, 50));
    }

    this._activeConcurrentCalls++;
  }

  /**
   * Releases a slot in the concurrency limiter
   */
  static releaseConcurrencySlot() {
    this._activeConcurrentCalls = Math.max(0, this._activeConcurrentCalls - 1);
  }

  /**
   * Executes an AI model invocation with full resilience policies:
   * - Circuit breaker
   * - Bounded concurrency
   * - User budget check
   * - Configurable timeouts
   * - Bounded exponential backoff + jitter
   * - Structured telemetry
   */
  static async generateStructuredContent({
    requestType = 'general', // 'path_synthesis' | 'session_generation' | 'tutor' | 'explain_back'
    userId = null,
    prompt,
    configOptions = {},
    responseFormat = 'json', // 'json' | 'text'
    timeoutMs = config.geminiTimeoutMs || 3000,
    maxRetries = 2,
    overallDeadlineMs = 10000
  }) {
    this._metrics.requestsTotal++;
    const overallStart = Date.now();

    // 1. Budget enforcement
    if (userId) {
      this.checkUserBudget(userId);
    }

    // 2. Circuit breaker check
    this.checkCircuitBreaker();

    // 3. Acquire concurrency slot
    await this.acquireConcurrencySlot();

    try {
      let attempt = 0;
      let lastError = null;

      while (attempt <= maxRetries) {
        // Enforce overall request deadline
        if (Date.now() - overallStart > overallDeadlineMs) {
          throw new AiProviderError(`Overall AI generation deadline exceeded (${overallDeadlineMs}ms).`, {
            category: 'TIMEOUT',
            status: 504,
            retryable: false
          });
        }

        attempt++;
        const attemptStart = Date.now();

        try {
          let rawText = '';
          let inTokens = 0;
          let outTokens = 0;
          let modelName = '';

          // 1. Injected test/mock client
          if (this._mockClient) {
            modelName = 'mock-test-model';
            const response = await Promise.race([
              this._mockClient.models.generateContent({
                model: modelName,
                contents: prompt,
                config: configOptions
              }),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error(`TIMEOUT: Request exceeded timeout of ${timeoutMs}ms`)),
                  timeoutMs
                )
              )
            ]);
            rawText = response?.text || '';
            inTokens = response?.usageMetadata?.promptTokenCount || 50;
            outTokens = response?.usageMetadata?.candidatesTokenCount || 50;
          }
          // 2. Muse AI Provider (Meta AI)
          else if (config.aiProvider === 'muse' || (config.museApiKey && config.aiProvider !== 'gemini')) {
            const museRes = await this._callMuseAi({
              prompt,
              configOptions,
              responseFormat,
              timeoutMs
            });
            rawText = museRes.rawText;
            inTokens = museRes.inTokens;
            outTokens = museRes.outTokens;
            modelName = museRes.model;
          }
          // 3. Google Gemini Provider
          else if (this.getClient()) {
            const client = this.getClient();
            modelName = config.geminiModel || 'gemini-2.5-flash';
            const response = await Promise.race([
              client.models.generateContent({
                model: modelName,
                contents: prompt,
                config: configOptions
              }),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error(`GEMINI_TIMEOUT: Request exceeded timeout of ${timeoutMs}ms`)),
                  timeoutMs
                )
              )
            ]);
            rawText = response?.text || '';
            inTokens = response?.usageMetadata?.promptTokenCount || 0;
            outTokens = response?.usageMetadata?.candidatesTokenCount || 0;
          } else {
            throw new AiProviderError('No AI provider client available. API key not configured.', {
              category: 'PERMANENT',
              status: 500,
              retryable: false
            });
          }

          const latencyMs = Date.now() - attemptStart;
          this._metrics.lastLatencyMs = latencyMs;
          this._metrics.requestsSuccess++;
          this._metrics.estimatedInputTokens += inTokens;
          this._metrics.estimatedOutputTokens += outTokens;
          this.recordCircuitSuccess();

          let data = rawText;
          if (responseFormat === 'json') {
            const cleaned = this.cleanJsonText(rawText);
            try {
              data = JSON.parse(cleaned || '{}');
            } catch (jsonErr) {
              throw new AiProviderError(`Model output was not valid JSON: ${cleaned.slice(0, 100)}...`, {
                category: 'INVALID_OUTPUT',
                status: 502,
                retryable: true,
                originalError: jsonErr
              });
            }
          }

          logger.info(`AI request [${requestType}] succeeded (${latencyMs}ms, attempt ${attempt})`, {
            model: modelName,
            requestType,
            inputTokens: inTokens,
            outputTokens: outTokens
          });

          return {
            data,
            text: rawText,
            model: modelName,
            isAiGenerated: true,
            generationSource: 'AI_SYNTHESIZED',
            latencyMs,
            tokens: {
              input: inTokens,
              output: outTokens
            }
          };
        } catch (err) {
          lastError = err;
          const classified = this.classifyError(err);

          if (classified.category === 'RATE_LIMIT') {
            this._metrics.quotaExhaustedCount++;
          }

          this.recordCircuitFailure(classified);

          // If not retryable or max retries reached, break immediately
          if (!classified.retryable || attempt > maxRetries) {
            break;
          }

          // Exponential backoff with jitter
          this._metrics.requestsRetried++;
          const baseBackoff = 300 * Math.pow(2, attempt - 1);
          const jitter = Math.floor(Math.random() * 200);
          const sleepMs = Math.min(2000, baseBackoff + jitter);

          logger.warn(
            `AI request [${requestType}] failed (${classified.reason}). Retrying attempt ${attempt}/${maxRetries} after ${sleepMs}ms...`
          );
          await new Promise(r => setTimeout(r, sleepMs));
        }
      }

      this._metrics.requestsFailed++;
      const finalClassified = this.classifyError(lastError);
      throw new AiProviderError(`AI Provider generation failed: ${lastError.message}`, {
        category: finalClassified.category,
        status: finalClassified.status,
        retryable: finalClassified.retryable,
        originalError: lastError
      });
    } finally {
      this.releaseConcurrencySlot();
    }
  }

  static async generateJson(options) {
    return this.generateStructuredContent({
      ...options,
      responseFormat: 'json'
    });
  }

  static async generateText(options) {
    return this.generateStructuredContent({
      ...options,
      responseFormat: 'text'
    });
  }

  /**
   * Returns complete observability telemetry snapshot
   */
  static getObservabilitySnapshot() {
    return {
      status: this._circuitState === 'OPEN' ? 'degraded' : 'operational',
      circuitBreaker: {
        state: this._circuitState,
        consecutiveFailures: this._consecutiveFailures,
        threshold: this._failureThreshold,
        cooldownRemainingMs: Math.max(0, this._nextAttemptAt - Date.now())
      },
      concurrency: {
        active: this._activeConcurrentCalls,
        limit: this._maxConcurrentCalls
      },
      metrics: {
        ...this._metrics
      },
      configuredProvider: config.aiProvider,
      configuredModel: config.aiProvider === 'muse' ? config.museModel : config.geminiModel,
      isConfigured: this.isProviderAvailable()
    };
  }

  /**
   * Resets all internal state (for test isolation)
   */
  static resetState() {
    this._circuitState = 'CLOSED';
    this._consecutiveFailures = 0;
    this._nextAttemptAt = 0;
    this._activeConcurrentCalls = 0;
    this._userBudgets.clear();
    this._mockClient = null;
    this._metrics = {
      requestsTotal: 0,
      requestsSuccess: 0,
      requestsFailed: 0,
      requestsRetried: 0,
      quotaExhaustedCount: 0,
      circuitBreakerTrips: 0,
      fallbackUsage: 0,
      budgetRejections: 0,
      concurrencyWaitCount: 0,
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      lastLatencyMs: 0
    };
  }
}
