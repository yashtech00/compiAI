import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ResilientAiProvider, AiProviderError } from '../src/modules/ai/resilient-ai-provider.js';
import { config } from '../src/config/index.js';

describe('Muse AI Provider Integration & Resilience', () => {
  beforeEach(() => {
    ResilientAiProvider.resetState();
  });

  afterEach(() => {
    ResilientAiProvider.resetState();
    vi.restoreAllMocks();
  });

  it('1. Provider Discovery: Identifies muse provider when MUSE_MODEL_API is present', () => {
    expect(ResilientAiProvider.isProviderAvailable()).toBe(true);
    const snapshot = ResilientAiProvider.getObservabilitySnapshot();
    expect(snapshot.configuredProvider).toBe('muse');
    expect(snapshot.configuredModel).toBe('muse-spark-1.3');
  });

  it('2. Structured JSON Generation: Successfully parses JSON output from Muse AI response', async () => {
    const mockResponsePayload = {
      id: 'chatcmpl-test-123',
      object: 'chat.completion',
      model: 'muse-spark-1.3',
      choices: [
        {
          message: {
            role: 'assistant',
            content: '{\n  "recommendation": "ADVANCE",\n  "rationale": "Solid grasp of asynchronous event loops"\n}'
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 45,
        completion_tokens: 28,
        total_tokens: 73
      }
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponsePayload
    });

    const result = await ResilientAiProvider.generateJson({
      prompt: 'Analyze learner mastery on js-event-loop',
      requestType: 'path_synthesis',
      timeoutMs: 5000
    });

    expect(result.data).toBeDefined();
    expect(result.data.recommendation).toBe('ADVANCE');
    expect(result.model).toBe('muse-spark-1.3');
    expect(result.isAiGenerated).toBe(true);
    expect(result.tokens.input).toBe(45);
    expect(result.tokens.output).toBe(28);
  });

  it('3. Markdown Codefence Sanitization: Correctly strips ```json markdown fences from response', async () => {
    const fencedContent = '```json\n{\n  "status": "PASS",\n  "score": 95\n}\n```';
    const mockResponsePayload = {
      choices: [{ message: { content: fencedContent } }],
      usage: { prompt_tokens: 20, completion_tokens: 15 }
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponsePayload
    });

    const result = await ResilientAiProvider.generateJson({
      prompt: 'Evaluate explain back',
      requestType: 'explain_back'
    });

    expect(result.data.status).toBe('PASS');
    expect(result.data.score).toBe(95);
  });

  it('4. Safe Timeout Handling: Aborts within deadline and throws categorized timeout error', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce((url, options) => {
      return new Promise((_, reject) => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        setTimeout(() => reject(err), 50);
      });
    });

    await expect(
      ResilientAiProvider.generateJson({
        prompt: 'Generate complex path',
        timeoutMs: 30,
        maxRetries: 0
      })
    ).rejects.toThrow(/MUSE_TIMEOUT/);
  });

  it('5. HTTP 429 Rate Limit Handling: Flags error as RATE_LIMIT and avoids infinite retry storms', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'Rate limit reached for organization' } })
    });

    await expect(
      ResilientAiProvider.generateText({
        prompt: 'Quick hint',
        timeoutMs: 1000,
        maxRetries: 1
      })
    ).rejects.toThrow(/Muse API error HTTP 429/);

    const snapshot = ResilientAiProvider.getObservabilitySnapshot();
    expect(snapshot.metrics.quotaExhaustedCount).toBeGreaterThan(0);
  });

  it('6. Secret Confidentiality: Server-side API key is never serialized into error messages or payloads', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Unauthorized key' } })
    });

    try {
      await ResilientAiProvider.generateText({
        prompt: 'Check auth',
        maxRetries: 0
      });
    } catch (err) {
      expect(err.message).not.toContain(config.museApiKey);
      expect(JSON.stringify(err)).not.toContain(config.museApiKey);
    }
  });
});
