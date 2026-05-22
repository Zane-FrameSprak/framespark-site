import assert from 'assert/strict';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  appendSamples,
  createSampleRun,
  listSampleRuns,
  readSampleRun
} from '../src/services/sampleRunStore.js';
import { parseDevUploadedFile } from '../src/services/devFileParser.js';
import { evaluateTextQuality } from '../src/services/devFileParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const API_ROOT = path.join(__dirname, '..');
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'framespark-dev-samples-'));
const sampleRoot = path.join(tempRoot, 'test-runs', 'sample-diagnosis');

try {
  const serverSource = await fs.readFile(path.join(API_ROOT, 'src/server.js'), 'utf8');
  assert.match(serverSource, /config\.enableDevTools/, 'server should gate dev route behind ENABLE_DEV_TOOLS');
  assert.match(serverSource, /\/api\/dev\/sample-runs/, 'server should mount dev sample route only in gated block');

  const run = await createSampleRun({
    name: 'short concept test',
    sameStory: true,
    storyName: '测试故事',
    storyRelation: '概念 + 梗概',
    notes: '边界样本测试'
  }, {
    root: sampleRoot,
    now: new Date('2026-05-21T00:00:00.000Z')
  });
  assert.equal(run.runId, '2026-05-21-short-concept-test');
  assert.equal(run.sameStory, true);
  assert.equal(run.storyName, '测试故事');
  assert.equal(run.storyRelation, '概念 + 梗概');

  const duplicate = await createSampleRun({ name: 'short concept test' }, {
    root: sampleRoot,
    now: new Date('2026-05-21T01:00:00.000Z')
  });
  assert.equal(duplicate.runId, '2026-05-21-short-concept-test-002');

  await assert.rejects(
    () => readSampleRun('../logs', { root: sampleRoot }),
    /测试批次 ID 不合法/
  );

  const saved = await appendSamples(run.runId, [{
    sampleId: 'sample-001',
    name: '短片概念',
    sourceType: 'pasted-text',
    originalFileName: '',
    targetFormatExpected: 'short',
    materialFormExpected: 'concept',
    expectedDiagnosisDepth: 'basic',
    testFocus: 'concept 准入',
    text: '一个完整但较短的故事概念，用于测试样本保存。'
  }], { root: sampleRoot });
  assert.equal(saved.savedCount, 1);
  assert.equal(saved.samples[0].textPath, 'samples/sample-001-短片概念.txt');

  const sampleText = await fs.readFile(path.join(sampleRoot, run.runId, saved.samples[0].textPath), 'utf8');
  assert.equal(sampleText, '一个完整但较短的故事概念，用于测试样本保存。');

  const indexRaw = await fs.readFile(path.join(sampleRoot, run.runId, 'samples-index.json'), 'utf8');
  assert.doesNotMatch(indexRaw, /一个完整但较短的故事概念/, 'samples-index should not store full text');
  assert.match(await fs.readFile(path.join(sampleRoot, run.runId, 'samples.md'), 'utf8'), /sample-001/);
  assert.match(await fs.readFile(path.join(sampleRoot, run.runId, 'run-meta.json'), 'utf8'), /"sameStory": true/);

  const txtParsed = await parseDevUploadedFile({
    originalname: 'sample.txt',
    mimetype: 'text/plain',
    buffer: Buffer.from('TXT 原有行为测试。')
  });
  assert.equal(txtParsed.source.type, 'txt');
  assert.equal(txtParsed.text, 'TXT 原有行为测试。');

  const normalQuality = evaluateTextQuality('第一场 内景 夜晚。林夏走进空教室，看见桌上有一封信。她停下脚步，听见走廊尽头传来脚步声。第二场 外景 清晨。林夏带着信来到河边，和陈默确认昨晚发生的事，两人的对话推动了新的选择。');
  assert.equal(normalQuality.qualityStatus, 'ok');

  const badExtractText = ',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,\n))))))))))))))))))))))))))))\n、、、、、、、、、、、、、、、、\n.........................\n1\n2\n3\nWORLD CINEMA\n,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,\n))))))))))))))))))))))))))))';
  const lowQuality = evaluateTextQuality(badExtractText);
  assert.equal(lowQuality.qualityStatus, 'failed');
  assert.ok(lowQuality.qualityWarnings.length > 0);

  const pdfParsed = await parseDevUploadedFile({
    originalname: 'feature-script.pdf',
    mimetype: 'application/pdf',
    buffer: buildTextPdf('FrameSpark text PDF sample for internal diagnosis eval testing. This readable script text contains scene action, character movement, and enough normal language for quality checks.')
  });
  assert.equal(pdfParsed.source.type, 'pdf');
  assert.match(pdfParsed.text, /FrameSpark text PDF sample/);
  assert.equal(pdfParsed.source.textQuality.qualityStatus, 'ok');

  const pdfSaved = await appendSamples(run.runId, [{
    sampleId: 'pdf-001',
    name: 'PDF 样本',
    sourceType: 'uploaded-file',
    originalFileName: 'feature-script.pdf',
    fileType: pdfParsed.source.type,
    extractedTextLength: pdfParsed.source.extractedTextLength,
    textQualityStatus: pdfParsed.source.textQuality.qualityStatus,
    textQualityWarnings: pdfParsed.source.textQuality.qualityWarnings,
    textQualityMetrics: pdfParsed.source.textQuality.qualityMetrics,
    text: pdfParsed.text
  }], { root: sampleRoot });
  const pdfRecord = pdfSaved.samples.find(item => item.sampleId === 'pdf-001');
  assert.equal(pdfRecord.fileType, 'pdf');
  assert.equal(pdfRecord.originalFileName, 'feature-script.pdf');
  assert.equal(pdfRecord.extractedTextLength, pdfParsed.source.extractedTextLength);
  assert.equal(pdfRecord.textQualityStatus, 'ok');
  assert.deepEqual(pdfRecord.textQualityWarnings, []);
  assert.equal(typeof pdfRecord.textQualityMetrics.punctuationRatio, 'number');
  assert.equal(pdfRecord.samplePath, pdfRecord.textPath);

  const badPdfSaved = await appendSamples(run.runId, [{
    sampleId: 'pdf-bad',
    name: '低质量 PDF 样本',
    sourceType: 'uploaded-file',
    originalFileName: 'bad-extract.pdf',
    fileType: 'pdf',
    extractedTextLength: lowQuality.qualityMetrics.charCount,
    textQualityStatus: lowQuality.qualityStatus,
    textQualityWarnings: lowQuality.qualityWarnings,
    textQualityMetrics: lowQuality.qualityMetrics,
    text: badExtractText
  }], { root: sampleRoot });
  const badPdfRecord = badPdfSaved.samples.find(item => item.sampleId === 'pdf-bad');
  assert.equal(badPdfRecord.textQualityStatus, 'failed');
  assert.ok(badPdfRecord.textQualityWarnings.length > 0);
  assert.doesNotMatch(
    await fs.readFile(path.join(sampleRoot, run.runId, 'samples-index.json'), 'utf8'),
    /,,,,,,,,,,,,,,,,/,
    'samples-index should not store low-quality full text'
  );

  await assert.rejects(
    () => parseDevUploadedFile({
      originalname: 'scanned.pdf',
      mimetype: 'application/pdf',
      buffer: buildTextPdf('')
    }),
    /暂不支持 OCR/
  );

  const runs = await listSampleRuns({ root: sampleRoot });
  assert.equal(runs.length, 2);

  await assert.rejects(
    () => appendSamples(run.runId, Array.from({ length: 51 }, (_, index) => ({
      sampleId: `too-many-${index}`,
      text: '测试'
    })), { root: sampleRoot }),
    /单次最多保存/
  );

  await assert.rejects(
    () => appendSamples(run.runId, [{ sampleId: 'big', text: 'x'.repeat(1024 * 1024 + 1) }], { root: sampleRoot }),
    /不能超过 1MB/
  );

  await assert.rejects(
    () => fs.access(path.join(tempRoot, 'logs')),
    /ENOENT/,
    'dev sample store should not write logs'
  );

  console.log('dev sample run checks passed');
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}

function buildTextPdf(text) {
  const safeText = String(text || '').replace(/[()\\]/g, ' ');
  const stream = [
    'BT',
    '/F1 18 Tf',
    '72 720 Td',
    `(${safeText}) Tj`,
    'ET'
  ].join('\n');
  return Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${stream.length} >>
stream
${stream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000254 00000 n 
0000000388 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
458
%%EOF`);
}
