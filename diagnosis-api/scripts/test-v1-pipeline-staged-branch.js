import assert from 'node:assert/strict';

function shouldUseV1StagedRunner(options = {}) {
  return options.enableDiagnosisV1 === true && options.enableV1StagedRunner === true;
}

const cases = [
  {
    name: 'ENABLE_DIAGNOSIS_V1=false => do not use staged runner',
    options: { enableDiagnosisV1: false, enableV1StagedRunner: true },
    expected: false
  },
  {
    name: 'ENABLE_DIAGNOSIS_V1=true + ENABLE_V1_STAGED_RUNNER=false => do not use staged runner',
    options: { enableDiagnosisV1: true, enableV1StagedRunner: false },
    expected: false
  },
  {
    name: 'ENABLE_DIAGNOSIS_V1=true + ENABLE_V1_STAGED_RUNNER=true => staged runner allowed',
    options: { enableDiagnosisV1: true, enableV1StagedRunner: true },
    expected: true
  }
];

let failed = 0;

for (const testCase of cases) {
  try {
    assert.equal(shouldUseV1StagedRunner(testCase.options), testCase.expected);
    console.log(`PASS ${testCase.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${testCase.name}`);
    console.error(error && error.stack ? error.stack : error);
  }
}

if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log(`\nV1 staged pipeline switch checks passed: ${cases.length}/${cases.length}\n`);
}

