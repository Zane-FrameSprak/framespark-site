import { spawnSync } from 'node:child_process';

const scripts = [
  ['test-basic-diagnosis.js', '--no-ai'],
  ['test-advanced-short-diagnosis.js', '--no-ai'],
  ['test-advanced-feature-diagnosis.js', '--no-ai'],
  ['test-advanced-other-diagnosis.js', '--no-ai'],
  ['test-e2e-pipeline.js', '--dry-run'],
  ['test-material-router.js'],
  ['test-diagnosis-inputs.js'],
  ['test-rate-limit.js'],
  ['test-advanced-context.js'],
  ['test-nextstep-normalization.js'],
  ['test-diagnosis-log-version.js'],
  ['test-diagnosis-depth.js'],
  ['test-list-review-queue.js'],
  ['test-dev-sample-runs.js'],
  ['test-dev-sample-run-v1-summary.js'],
  ['test-report-v1-compat.js'],
  ['test-report-v1-pipeline.js'],
  ['test-v1-gatekeeper-decision.js'],
  ['test-v1-staged-runner.js'],
  ['test-v1-pipeline-staged-branch.js'],
  ['test-v1-pipeline-staged-integration.js'],
  ['test-v1-stage-prompts.js'],
  ['test-v1-stage-ai-client.js'],
  ['test-v1-final-structure.js'],
  ['test-v1-final-patch3.js'],
  ['test-v1-final-patch4.js'],
  ['test-v1-staged-runner-real-prompts-gate.js'],
  ['test-unified-v1-prompt.js'],
  ['test-mvp-production-safety.js'],
  ['test-mvp-docx-safety.js'],
  ['test-mvp-retention.js'],
  ['test-mvp-http-integration.js'],
  ['test-beta-access-store.js'],
  ['test-beta-access-http.js'],
  ['test-beta-access-cli.js']
];

for (const [script, ...args] of scripts) {
  const result = spawnSync(process.execPath, [`scripts/${script}`, ...args], {
    cwd: new URL('..', import.meta.url),
    env: {
      ...process.env,
      DEEPSEEK_API_KEY: '',
      DEEPSEEK_BASE_URL: 'http://127.0.0.1:1'
    },
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    console.error(`No-AI regression failed: ${script}`);
    process.exit(result.status || 1);
  }
}

console.log(`No-AI regression passed: ${scripts.length} scripts`);
