const VALID_ACTIONS = Object.freeze([
  'stop_d0',
  'stop_basic',
  'continue_advanced',
  'continue_final',
  'complete_final'
]);

export function decideV1Stage(input = {}) {
  const stage = normalizeStage(input.stage);
  const score = Number.isFinite(input.score) ? input.score : null;
  const passed = typeof input.passed === 'boolean' ? input.passed : null;
  const flags = input.flags && typeof input.flags === 'object' ? input.flags : {};

  if (stage === 'D0' || flags.d0 === true) {
    return buildDecision('stop_d0', stage, null, 'D0 materials stop before basic diagnosis.');
  }

  if (stage === 'basic') {
    if (passed === true || scoreAtLeast(score, 0.6) || flags.storyLikely === true) {
      return buildDecision('continue_advanced', stage, 'advanced', 'Basic diagnosis passed.');
    }

    return buildDecision('stop_basic', stage, null, 'Basic diagnosis did not pass.');
  }

  if (stage === 'advanced') {
    if (passed === true || scoreAtLeast(score, 0.7) || flags.storyStands === true) {
      return buildDecision('continue_final', stage, 'final', 'Advanced diagnosis passed.');
    }

    return buildDecision('stop_basic', stage, null, 'Advanced diagnosis did not pass; return current-stage report.');
  }

  if (stage === 'final') {
    return buildDecision('complete_final', stage, null, 'Final diagnosis complete.');
  }

  return buildDecision('stop_basic', stage, null, 'Unknown stage; stop safely.');
}

export function isV1StageAction(value) {
  return VALID_ACTIONS.includes(value);
}

function buildDecision(action, currentStage, nextStage, reason) {
  return {
    action,
    currentStage,
    nextStage,
    shouldContinue: action === 'continue_advanced' || action === 'continue_final',
    reason,
    diagnostics: {
      source: 'v1-stage-decision',
      usesAi: false
    }
  };
}

function normalizeStage(value) {
  if (typeof value !== 'string') {
    return 'basic';
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'd0') return 'D0';
  if (normalized === 'basic') return 'basic';
  if (normalized === 'advanced') return 'advanced';
  if (normalized === 'final' || normalized === 'ultimate') return 'final';
  return normalized || 'basic';
}

function scoreAtLeast(score, threshold) {
  return score !== null && score >= threshold;
}

