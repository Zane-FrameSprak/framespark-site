import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDiagnosisDepth } from '../src/routes/diagnosis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..', '..');

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertIncludes(text, needle, label) {
  if (!text.includes(needle)) {
    throw new Error(`${label}: missing ${needle}`);
  }
}

assertEqual(getDiagnosisDepth({ internalStage: 'basic' }), 'basic', 'basic internalStage');
assertEqual(getDiagnosisDepth({ internalStage: 'advanced' }), 'advanced', 'advanced internalStage');
assertEqual(getDiagnosisDepth({ diagnosisDepth: 'basic', internalStage: 'advanced' }), 'advanced', 'advanced internalStage precedence');
assertEqual(getDiagnosisDepth({ diagnosisDepth: 'advanced', internalStage: 'basic' }), 'advanced', 'advanced diagnosisDepth');
assertEqual(getDiagnosisDepth({ internalStage: 'mock' }), 'basic', 'mock defaults to basic');
assertEqual(getDiagnosisDepth(null), 'basic', 'missing result defaults to basic');

const pipelineSource = fs.readFileSync(path.join(ROOT, 'diagnosis-api/src/services/diagnosisPipeline.js'), 'utf8');
assertIncludes(pipelineSource, "diagnosisDepth: 'basic'", 'pipeline basic depth');
assertIncludes(pipelineSource, "diagnosisDepth: 'advanced'", 'pipeline advanced depth');

const appSource = fs.readFileSync(path.join(ROOT, 'diagnosis/app.js'), 'utf8');
assertIncludes(appSource, "['诊断深度', materialInfo.diagnosisDepth]", 'understanding row');
assertIncludes(appSource, "return value === 'advanced' ? '深化评估' : '基础评估';", 'Chinese depth mapping');

console.log('diagnosis depth checks passed');
