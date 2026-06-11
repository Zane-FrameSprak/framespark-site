import { ApiError } from '../utils/errors.js';

export function createProviderCallBudget(options = {}) {
  const maxCalls = positiveInteger(options.maxCalls, 5);
  const maxGeneralRepairs = positiveInteger(options.maxGeneralRepairs, 1);
  let calls = 0;
  let generalRepairs = 0;

  return {
    consumeCall() {
      if (calls >= maxCalls) {
        throw new ApiError(503, 'AI_CALL_BUDGET_EXCEEDED', 'Provider call budget exceeded.');
      }
      calls += 1;
      return calls;
    },
    consumeGeneralRepair() {
      if (generalRepairs >= maxGeneralRepairs) return false;
      generalRepairs += 1;
      return true;
    },
    snapshot() {
      return { calls, maxCalls, generalRepairs, maxGeneralRepairs };
    }
  };
}

function positiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
