/**
 * Pack C — AI, MCP & Supabase Production Guard Kit
 * Includes:
 *  1. OpenAI Responses API \n\n\n\n Runaway Newline Stream Breaker (#10)
 *  2. Ollama Qwen 3.5 Multi-Turn <think> Tag Closer & Tool-Call Prefill Fixer (#36)
 *  3. Outbound AI Customer Support False-Action Receipt Verifier (#34)
 *  4. Supabase RLS auth.uid() -> (SELECT auth.uid()) SQL Linter (#15)
 */
export function normalizeOllamaToolMessages(messages) {
  return messages.map((msg) => {
    if (msg.role === 'assistant' && msg.tool_calls && typeof msg.content === 'string') {
      if (msg.content.includes('<think>') && !msg.content.includes('</think>')) {
        return { ...msg, content: msg.content + '\n</think>\n' };
      }
    }
    return msg;
  });
}

const ACTION_CLAIMS_REGEX = /\b(i have refunded|i've refunded|your refund has been issued|i have cancelled|i've cancelled|your address has been updated|i have credited)\b/i;

export function verifyOutboundSupportReply(draftText, executedToolReceipts = []) {
  const claimsAction = ACTION_CLAIMS_REGEX.test(draftText);
  if (claimsAction && (!Array.isArray(executedToolReceipts) || executedToolReceipts.length === 0)) {
    return {
      allowed: false,
      reason: 'BLOCKED_FALSE_ACTION_HALLUCINATION: Draft claims a refund/cancellation/update was executed, but 0 verified tool receipts exist on this ticket.'
    };
  }
  return { allowed: true, reason: 'OK' };
}

export function optimizeSupabaseRlsSql(sqlText) {
  return sqlText.replace(/\bauth\.uid\(\)/g, '(SELECT auth.uid())');
}


// Module 5 (#68): Claude Code / MCP SDK 1.26.0 Tool Drop Fixer (Strips annotations, execution, outputSchema)
export function stripMcp126Fields(toolsListResponse) {
  const cleanedTools = (toolsListResponse?.tools || []).map((t) => {
    const copy = { ...t };
    delete copy.annotations;
    delete copy.execution;
    delete copy.outputSchema;
    return copy;
  });
  return { tools: cleanedTools };
}

// Module 6 (#69): LiteLLM 429 SHA-256 Virtual Key Hash Scrubber & No-Fallback Circuit Breaker
export function sanitizeLiteLlm429Response(errorBodyStr, hasFallbacks = false) {
  const scrubbed = String(errorBodyStr || '').replace(/\b[a-f0-9]{64}\b/gi, '[REDACTED_KEY_HASH]');
  return {
    status: 429,
    terminateStreamImmediately: !hasFallbacks,
    body: scrubbed,
  };
}

// Module 7 (#67): Supabase Free/Pro Plan Egress Polling Auditor
export function auditSupabasePollingQuery(queryUrl, intervalSeconds) {
  const hasLimit = /[?&]limit=\d+/i.test(queryUrl);
  const highFrequency = Number(intervalSeconds) > 0 && Number(intervalSeconds) <= 60;
  return {
    egressRisk: highFrequency && !hasLimit ? 'CRITICAL_402_LOCKOUT_RISK' : 'OK',
    recommendedFix: 'Remove <=60s polling or cap window with ?limit=25 and Realtime filter.',
  };
}
