(function () {
  var DEV_API_BASE = window.__FRAMESPARK_DEV_API_BASE__ || 'http://127.0.0.1:8787';
  var API_BASE = DEV_API_BASE.replace(/\/$/, '') + '/api/dev/sample-runs';
  var DEV_API_ERROR = '无法连接内部接口。请确认后端已用 ENABLE_DEV_TOOLS=true 启动，并且 DEV_API_BASE 指向正确端口。';
  var currentRun = null;
  var pendingFiles = [];

  var runList = document.getElementById('runList');
  var createRunForm = document.getElementById('createRunForm');
  var refreshRunsButton = document.getElementById('refreshRuns');
  var currentRunTitle = document.getElementById('currentRunTitle');
  var apiState = document.getElementById('apiState');
  var quickSampleForm = document.getElementById('quickSampleForm');
  var sampleNameInput = document.getElementById('sampleName');
  var sampleTextInput = document.getElementById('sampleText');
  var dropZone = document.getElementById('dropZone');
  var fileInput = document.getElementById('fileInput');
  var pendingFilesBox = document.getElementById('pendingFiles');
  var saveSamplesButton = document.getElementById('saveSamplesButton');
  var saveState = document.getElementById('saveState');
  var sampleList = document.getElementById('sampleList');
  var sameStoryInline = document.getElementById('sameStoryInline');
  var sameStoryInlineExtra = document.getElementById('sameStoryInlineExtra');
  var quickStoryName = document.getElementById('quickStoryName');
  var quickStoryRelation = document.getElementById('quickStoryRelation');
  var batchTargetFormatExpected = document.getElementById('batchTargetFormatExpected');
  var batchMaterialFormExpected = document.getElementById('batchMaterialFormExpected');
  var batchExpectedDiagnosisDepth = document.getElementById('batchExpectedDiagnosisDepth');
  var batchTestFocus = document.getElementById('batchTestFocus');

  init();

  function init() {
    refreshRunsButton.addEventListener('click', function () {
      loadRuns();
    });
    createRunForm.addEventListener('submit', createRun);
    quickSampleForm.addEventListener('submit', saveQuickSamples);
    fileInput.addEventListener('change', function () {
      addFiles(Array.from(fileInput.files || []));
      fileInput.value = '';
    });
    dropZone.addEventListener('dragover', onDragOver);
    dropZone.addEventListener('dragleave', onDragLeave);
    dropZone.addEventListener('drop', onDrop);
    sameStoryInline.addEventListener('change', renderSameStoryInline);
    renderPendingFiles();
    loadRuns({ ensureQuickRun: true });
  }

  async function loadRuns(options) {
    var settings = options || {};
    setState('读取批次...');
    try {
      var data = await requestJson(API_BASE);
      var runs = data.runs || [];
      renderRuns(runs);
      if (settings.ensureQuickRun && !currentRun) {
        await ensureTodayQuickRun(runs);
        return;
      }
      setState('');
    } catch (err) {
      setState(DEV_API_ERROR);
      setSaveState(err.message || DEV_API_ERROR, 'error');
    }
  }

  function renderRuns(runs) {
    if (!runs.length) {
      runList.innerHTML = '<p class="meta">暂无测试批次。</p>';
      return;
    }
    runList.innerHTML = runs.map(function (run) {
      return [
        '<article class="run-card" data-run-id="' + escapeHtml(run.runId) + '" data-active="' + String(currentRun && currentRun.runId === run.runId) + '">',
        '<strong>' + escapeHtml(formatRunName(run)) + '</strong>',
        '<p class="meta">' + escapeHtml(run.runId) + ' · 样本 ' + String((run.samples || []).length) + '</p>',
        '</article>'
      ].join('');
    }).join('');

    runList.querySelectorAll('[data-run-id]').forEach(function (card) {
      card.addEventListener('click', function () {
        selectRun(card.dataset.runId);
      });
    });
  }

  async function createRun(event) {
    event.preventDefault();
    var form = new FormData(createRunForm);
    var payload = {
      name: form.get('name'),
      sameStory: form.get('sameStory') === 'true',
      storyName: form.get('storyName'),
      storyRelation: form.get('storyRelation'),
      notes: form.get('notes')
    };

    try {
      var data = await requestJson(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      createRunForm.reset();
      currentRun = data.run;
      renderCurrentRun();
      await loadRuns();
      setSaveState('批次已创建，可以开始保存样本。', 'success');
    } catch (err) {
      setSaveState(err.message, 'error');
    }
  }

  async function selectRun(runId) {
    try {
      var data = await requestJson(API_BASE + '/' + encodeURIComponent(runId));
      currentRun = data.run;
      renderCurrentRun();
      await loadRuns();
    } catch (err) {
      setSaveState(err.message, 'error');
    }
  }

  async function saveQuickSamples(event) {
    event.preventDefault();
    var text = sampleTextInput.value.trim();
    var hasText = Boolean(text);
    var hasFiles = pendingFiles.length > 0;

    if (!hasText && !hasFiles) {
      setSaveState('请先粘贴文本或拖入文件。', 'error');
      return;
    }

    setSaveState('保存中...', 'loading');
    saveSamplesButton.disabled = true;

    try {
      await ensureCurrentRun();
      if (!currentRun) return;
      await maybeUpdateSameStoryMeta();

      var textSaved = 0;
      var fileSaved = 0;
      var errors = [];
      var qualityItems = [];

      if (hasText) {
        await savePastedText(text);
        textSaved = 1;
      }

      if (hasFiles) {
        var uploadResult = await uploadPendingFiles();
        fileSaved = Number(uploadResult.savedCount || 0);
        errors = Array.isArray(uploadResult.errors) ? uploadResult.errors : [];
        qualityItems = readSavedQualityItems(uploadResult, fileSaved);
      }

      await selectRun(currentRun.runId);
      clearSavedInputs({ clearText: hasText, clearFiles: hasFiles });
      setSaveState(buildSaveMessage(textSaved, fileSaved, errors, qualityItems), errors.length || qualityItems.length ? 'warning' : 'success');
    } catch (err) {
      setSaveState('保存失败：' + (err.message || '请求失败。'), 'error');
    } finally {
      saveSamplesButton.disabled = false;
    }
  }

  async function savePastedText(text) {
    var batchDefaults = getBatchDefaults();
    var sample = {
      name: sampleNameInput.value.trim() || nextPastedName(),
      sourceType: 'pasted-text',
      targetFormatExpected: batchDefaults.targetFormatExpected,
      materialFormExpected: batchDefaults.materialFormExpected,
      expectedDiagnosisDepth: batchDefaults.expectedDiagnosisDepth,
      testFocus: batchDefaults.testFocus,
      text: text
    };
    await requestJson(API_BASE + '/' + encodeURIComponent(currentRun.runId) + '/samples', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ samples: [sample] })
    });
  }

  async function uploadPendingFiles() {
    var form = new FormData();
    var batchDefaults = getBatchDefaults();
    var metadata = pendingFiles.map(function (file) {
      return {
        name: file.name.replace(/\.[^.]+$/, ''),
        sourceType: 'uploaded-file',
        originalFileName: file.name,
        targetFormatExpected: batchDefaults.targetFormatExpected,
        materialFormExpected: batchDefaults.materialFormExpected,
        expectedDiagnosisDepth: batchDefaults.expectedDiagnosisDepth,
        testFocus: batchDefaults.testFocus
      };
    });
    form.append('metadata', JSON.stringify(metadata));
    pendingFiles.forEach(function (file) {
      form.append('files', file, file.name);
    });

    return requestJson(API_BASE + '/' + encodeURIComponent(currentRun.runId) + '/samples', {
      method: 'POST',
      body: form
    });
  }

  async function maybeUpdateSameStoryMeta() {
    if (pendingFiles.length <= 1 || !currentRun) return;
    var selected = getSameStoryValue();
    if (selected !== 'true' && currentRun.sameStory === false) return;
    await requestJson(API_BASE + '/' + encodeURIComponent(currentRun.runId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sameStory: selected === 'true',
        storyName: selected === 'true' ? quickStoryName.value : '',
        storyRelation: selected === 'true' ? quickStoryRelation.value : ''
      })
    });
  }

  function onDragOver(event) {
    event.preventDefault();
    dropZone.dataset.active = 'true';
  }

  function onDragLeave() {
    dropZone.dataset.active = 'false';
  }

  function onDrop(event) {
    event.preventDefault();
    dropZone.dataset.active = 'false';
    addFiles(Array.from(event.dataTransfer.files || []));
  }

  function addFiles(files) {
    var accepted = files.filter(function (file) {
      return /\.(txt|docx|pdf)$/i.test(file.name);
    });
    pendingFiles = pendingFiles.concat(accepted);
    renderPendingFiles();
    if (files.length !== accepted.length) {
      setSaveState('已忽略非 TXT / DOCX / PDF 文件。', 'warning');
    } else if (accepted.length) {
      setSaveState('已选择 ' + String(accepted.length) + ' 个文件，点击“保存为测试样本”即可保存。', 'info');
    }
  }

  function renderPendingFiles() {
    renderSameStoryInline();
    if (!pendingFiles.length) {
      pendingFilesBox.innerHTML = '<p class="meta">尚未选择文件。</p>';
      return;
    }
    pendingFilesBox.innerHTML = pendingFiles.map(function (file, index) {
      return [
        '<article class="file-card">',
        '<strong>' + escapeHtml(file.name) + '</strong>',
        '<p class="meta">#' + String(index + 1) + ' · ' + formatBytes(file.size) + '</p>',
        '</article>'
      ].join('');
    }).join('');
  }

  function renderSameStoryInline() {
    sameStoryInline.hidden = pendingFiles.length <= 1;
    sameStoryInlineExtra.hidden = getSameStoryValue() !== 'true';
  }

  function renderCurrentRun() {
    if (!currentRun) {
      currentRunTitle.textContent = '正在准备今日快速测试批次';
      sampleList.innerHTML = '';
      return;
    }
    currentRunTitle.textContent = formatRunTitle(currentRun);
    var samples = currentRun.samples || [];
    if (!samples.length) {
      sampleList.innerHTML = '<p class="meta">当前批次还没有样本。</p>';
      return;
    }
    sampleList.innerHTML = samples.map(function (sample) {
      return [
        '<article class="sample-card">',
        '<strong>' + escapeHtml(sample.name || sample.sampleId) + '</strong>',
        '<p class="meta">',
        escapeHtml(sample.sampleId || '-'),
        ' · 文件类型=' + escapeHtml(labelFileType(sample.fileType)),
        ' · 质量=' + escapeHtml(labelQuality(sample.textQualityStatus)),
        ' · 字数=' + escapeHtml(String(sample.charCount || sample.extractedTextLength || 0)),
        ' · 保存时间=' + escapeHtml(formatTime(sample.createdAt)),
        '</p>',
        '</article>'
      ].join('');
    }).join('');
  }

  async function ensureCurrentRun() {
    if (currentRun) return currentRun;
    setState('正在准备今日快速测试批次...');
    try {
      var data = await requestJson(API_BASE);
      await ensureTodayQuickRun(data.runs || []);
      return currentRun;
    } catch (err) {
      setState(DEV_API_ERROR);
      setSaveState(err.message || DEV_API_ERROR, 'error');
      return null;
    }
  }

  async function ensureTodayQuickRun(runs) {
    var quickRun = findTodayQuickRun(runs);
    if (quickRun) {
      await selectRun(quickRun.runId);
      setState('已进入今日快速测试批次。');
      return currentRun;
    }

    setState('正在创建今日快速测试批次...');
    var data = await requestJson(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'quick-001',
        sameStory: false,
        notes: '自动创建的今日快速测试批次。'
      })
    });
    currentRun = data.run;
    renderCurrentRun();
    await loadRuns();
    setState('今日快速测试批次已准备好。');
    return currentRun;
  }

  function findTodayQuickRun(runs) {
    var today = getTodayText();
    var pattern = new RegExp('^' + today + '-quick-\\d{3}(?:-\\d{3})?$');
    return (runs || []).find(function (run) {
      return pattern.test(run.runId);
    }) || null;
  }

  function formatRunTitle(run) {
    if (isTodayQuickRun(run && run.runId)) {
      return '当前批次：今日快速测试';
    }
    return '当前批次：' + run.runId;
  }

  function formatRunName(run) {
    return isTodayQuickRun(run && run.runId) ? '今日快速测试' : run.runId;
  }

  function isTodayQuickRun(runId) {
    return new RegExp('^' + getTodayText() + '-quick-\\d{3}(?:-\\d{3})?$').test(String(runId || ''));
  }

  function getTodayText() {
    var now = new Date();
    var year = now.getFullYear();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    var day = String(now.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function getBatchDefaults() {
    return {
      targetFormatExpected: batchTargetFormatExpected.value || 'unknown',
      materialFormExpected: batchMaterialFormExpected.value || 'unknown',
      expectedDiagnosisDepth: batchExpectedDiagnosisDepth.value || 'unknown',
      testFocus: batchTestFocus.value || ''
    };
  }

  function getSameStoryValue() {
    var selected = document.querySelector('input[name="sameStoryQuick"]:checked');
    return selected ? selected.value : 'false';
  }

  function clearSavedInputs(options) {
    var settings = options || {};
    if (settings.clearText) {
      sampleNameInput.value = '';
      sampleTextInput.value = '';
    }
    if (settings.clearFiles) {
      pendingFiles = [];
      fileInput.value = '';
      renderPendingFiles();
    }
  }

  function nextPastedName() {
    var count = (currentRun && Array.isArray(currentRun.samples) ? currentRun.samples.length : 0) + 1;
    return 'pasted-text-' + String(count).padStart(3, '0');
  }

  function readSavedQualityItems(uploadResult, fileSaved) {
    var samples = Array.isArray(uploadResult && uploadResult.samples) ? uploadResult.samples : [];
    var saved = fileSaved > 0 ? samples.slice(-fileSaved) : [];
    return saved.filter(function (item) {
      return item.textQualityStatus === 'warning' || item.textQualityStatus === 'failed';
    }).map(function (item) {
      return {
        originalFileName: item.originalFileName || item.name || item.sampleId,
        status: item.textQualityStatus,
        warnings: item.textQualityWarnings || []
      };
    });
  }

  function buildSaveMessage(textSaved, fileSaved, errors, qualityItems) {
    var totalSaved = textSaved + fileSaved;
    var reviewCount = qualityItems.length;
    var prefix = errors.length ? '部分失败：成功 ' + String(totalSaved) + ' 个，失败 ' + String(errors.length) + ' 个。' : '保存成功：已保存 ' + String(totalSaved) + ' 个样本。';
    if (reviewCount) {
      prefix += ' 其中 ' + String(reviewCount) + ' 个需复查。';
    }
    var qualityText = qualityItems.map(function (item) {
      return '\n- ' + (item.originalFileName || '未知文件') + '：' + labelQuality(item.status) + '，' + ((item.warnings || []).join('；') || '提取文本疑似质量较差，不建议直接用于诊断');
    }).join('');
    var errorText = errors.map(function (item) {
      return '\n- ' + (item.originalFileName || '未知文件') + '：' + (item.message || item.code || '失败');
    }).join('');
    return prefix + qualityText + errorText;
  }

  async function requestJson(url, options) {
    var response = await fetch(url, options);
    var data = await response.json().catch(function () { return null; });
    if (!response.ok || !data || !data.ok) {
      var error = data && data.error ? data.error : null;
      var message = error && error.message ? error.message : '请求失败。';
      if ((response.status === 403 || response.status === 404) && url.indexOf(API_BASE) === 0) {
        message = DEV_API_ERROR + ' 当前地址没有可用的 /api/dev/sample-runs。';
      }
      throw new Error(message);
    }
    if (!data) {
      throw new Error(DEV_API_ERROR);
    }
    return data;
  }

  function setState(message) {
    apiState.textContent = message || '';
  }

  function setSaveState(message, type) {
    saveState.textContent = message || '';
    saveState.dataset.type = type || '';
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function formatTime(value) {
    if (!value) return '-';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('zh-CN', { hour12: false });
  }

  function labelFileType(value) {
    return {
      txt: 'TXT',
      docx: 'DOCX',
      pdf: 'PDF',
      pasted_text: '粘贴文本'
    }[value] || (value || '-');
  }

  function labelQuality(value) {
    return {
      ok: '可用',
      warning: '需复查',
      failed: '不建议用于诊断'
    }[value] || '可用';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
