import assert from 'node:assert/strict';
import { parseUploadedFile } from '../src/services/fileParser.js';
import { config } from '../src/config.js';
import { validateInputTokenLimit } from '../src/services/tokenCounter.js';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const cases = [
  ['valid DOCX passes extension, MIME and ZIP checks', async () => {
    const parsed = await parseUploadedFile(makeFile(makeDocx('一个虚构故事。'.repeat(20))));
    assert.equal(parsed.source.type, 'docx');
    assert.match(parsed.text, /虚构故事/);
  }],
  ['DOCX extension with wrong MIME is rejected', async () => {
    await assert.rejects(() => parseUploadedFile(makeFile(makeDocx('故事。'.repeat(40)), 'application/pdf')), hasCode('FILE_TYPE_MISMATCH'));
  }],
  ['fake ZIP signature without DOCX directory is rejected', async () => {
    await assert.rejects(() => parseUploadedFile(makeFile(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]))), hasCode('FILE_CONTENT_INVALID'));
  }],
  ['encrypted DOCX entry is rejected', async () => {
    await assert.rejects(() => parseUploadedFile(makeFile(makeDocx('故事。'.repeat(40), { flags: 1 }))), hasCode('FILE_CONTENT_INVALID'));
  }],
  ['abnormal expanded size is rejected before extraction', async () => {
    const reportedSize = config.maxDocxExpandedBytes + 1;
    await assert.rejects(() => parseUploadedFile(makeFile(makeDocx('故事。'.repeat(40), { reportedSize }))), hasCode('DOCX_EXPANSION_LIMIT'));
  }],
  ['DOCX extracted text token length is capped after extraction', async () => {
    const parsed = await parseUploadedFile(makeFile(makeDocx('token '.repeat(40))));
    assert.throws(() => validateInputTokenLimit(parsed.text, { maxInputTokens: 10 }), hasCode('TEXT_TOO_LONG'));
    assert.equal(config.maxInputTokens, 15000);
  }]
];

let failed = 0;
for (const [name, run] of cases) {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error?.stack || error);
  }
}

if (failed) process.exitCode = 1;
else console.log(`\nMVP DOCX safety tests passed: ${cases.length}/${cases.length}\n`);

function makeFile(buffer, mimetype = DOCX_MIME) {
  return { originalname: 'story.docx', mimetype, buffer };
}

function hasCode(code) {
  return error => error?.code === code;
}

function makeDocx(text, options = {}) {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p></w:body></w:document>`;
  return buildZip([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/document.xml', documentXml]
  ], options);
}

function buildZip(entries, options) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const nameBuffer = Buffer.from(name);
    const data = Buffer.from(content);
    const crc = crc32(data);
    const flags = options.flags || 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    locals.push(local, nameBuffer, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(options.reportedSize || data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuffer);
    offset += local.length + nameBuffer.length + data.length;
  }
  const centralBuffer = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuffer, end]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function escapeXml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
