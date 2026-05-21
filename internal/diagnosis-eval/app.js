(function () {
  var API_BASE = '/api/dev/sample-runs';
  var currentRun = null;
  var pendingFiles = [];

  var runList = document.getElementById('runList');
  var createRunForm = document.getElementById('createRunForm');
  var refreshRunsButton = document.getElementById('refreshRuns');
  var currentRunTitle = document.getElementById('currentRunTitle');
  var apiState = document.getElementById('apiState');
  var pasteSampleForm = document.getElementById('pasteSampleForm');
  var dropZone = document.getElementById('dropZone');
  var fileInput = document.getElementById('fileInput');
  var pendingFilesBox = document.getElementById('pendingFiles');
  var saveFilesButton = document.getElementById('saveFiles');
  var sampleList = document.getElementById('sampleList');
  var sameStoryDialog = document.getElementById('sameStoryDialog');
  var sameStoryForm = document.getElementById('sameStoryForm');
  var sameStoryCancel = document.getElementById('sameStoryCancel');

  init();

  function init() {
    refreshRunsButton.addEventListener('click', loadRuns);
    createRunForm.addEventListener('submit', createRun);
    pasteSampleForm.addEventListener('submit', savePastedSample);
    fileInput.addEventListener('change', function () {
      addFiles(Array.from(fileInput.files || []));
      fileInput.value = '';
    });
    dropZone.addEventListener('dragover', onDragOver);
    dropZone.addEventListener('dragleave', onDragLeave);
    dropZone.addEventListener('drop', onDrop);
    saveFilesButton.addEventListener('click', savePendingFiles);
    sameStoryCancel.addEventListener('click', function () {
      sameStoryDialog.close('cancel');
    });
    sameStoryForm.addEventListener('submit', confirmSameStory);
    loadRuns();
  }

  async function loadRuns() {
    setState('读取批次...');
    try {
      var data = await requestJson(API_BASE);
      renderRuns(data.runs || []);
      setState('');
    } catch (err) {
      setState('dev API 不可用，请确认 ENABLE_DEV_TOOLS=true');
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
        '<strong>' + escapeHtml(run.runId) + '</strong>',
        '<p class="meta">样本 ' + String((run.samples || []).length) + ' · sameStory=' + String(Boolean(run.sameStory)) + '</p>',
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
      setState('批次已创建。');
    } catch (err) {
      setState(err.message);
    }
  }

  async function selectRun(runId) {
    try {
      var data = await requestJson(API_BASE + '/' + encodeURIComponent(runId));
      currentRun = data.run;
      renderCurrentRun();
      await loadRuns();
    } catch (err) {
      setState(err.message);
    }
  }

  async function savePastedSample(event) {
    event.preventDefault();
    if (!currentRun) {
      setState('请先选择或创建测试批次。');
      return;
    }

    var form = new FormData(pasteSampleForm);
    var sample = {
      name: form.get('name'),
      sourceType: 'pasted-text',
      targetFormatExpected: form.get('targetFormatExpected'),
      materialFormExpected: form.get('materialFormExpected'),
      expectedDiagnosisDepth: form.get('expectedDiagnosisDepth'),
      testFocus: form.get('testFocus'),
      text: form.get('text')
    };

    try {
      await saveSamples([sample]);
      pasteSampleForm.reset();
      setState('样本已保存。');
    } catch (err) {
      setState(err.message);
    }
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
      setState('已忽略非 TXT / DOCX / PDF 文件。');
    }
  }

  function renderPendingFiles() {
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

  async function savePendingFiles() {
    if (!currentRun) {
      setState('请先选择或创建测试批次。');
      return;
    }
    if (!pendingFiles.length) {
      setState('请先选择 TXT / DOCX / PDF 文件。');
      return;
    }
    if (pendingFiles.length > 1 && currentRun.sameStory === false && !currentRun.storyName && !currentRun.storyRelation) {
      sameStoryDialog.showModal();
      return;
    }
    await uploadPendingFiles();
  }

  async function confirmSameStory(event) {
    event.preventDefault();
    var form = new FormData(sameStoryForm);
    try {
      await requestJson(API_BASE + '/' + encodeURIComponent(currentRun.runId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sameStory: form.get('sameStory') === 'true',
          storyName: form.get('storyName'),
          storyRelation: form.get('storyRelation')
        })
      });
      sameStoryDialog.close();
      await selectRun(currentRun.runId);
      await uploadPendingFiles();
    } catch (err) {
      setState(err.message);
    }
  }

  async function uploadPendingFiles() {
    var form = new FormData();
    var metadata = pendingFiles.map(function (file) {
      return {
        name: file.name.replace(/\.[^.]+$/, ''),
        sourceType: 'uploaded-file',
        originalFileName: file.name,
        targetFormatExpected: 'unknown',
        materialFormExpected: 'unknown',
        expectedDiagnosisDepth: 'unknown',
        testFocus: ''
      };
    });
    form.append('metadata', JSON.stringify(metadata));
    pendingFiles.forEach(function (file) {
      form.append('files', file, file.name);
    });

    try {
      var data = await requestJson(API_BASE + '/' + encodeURIComponent(currentRun.runId) + '/samples', {
        method: 'POST',
        body: form
      });
      pendingFiles = [];
      renderPendingFiles();
      await selectRun(currentRun.runId);
      setState(buildUploadStateMessage(data));
    } catch (err) {
      setState(err.message);
    }
  }

  function buildUploadStateMessage(data) {
    var errors = Array.isArray(data && data.errors) ? data.errors : [];
    if (!errors.length) return '上传文件已保存为样本。';
    return '部分文件已保存，失败 ' + String(errors.length) + ' 个：' + errors.map(function (item) {
      return (item.originalFileName || '未知文件') + '（' + (item.message || item.code || '失败') + '）';
    }).join('；');
  }

  async function saveSamples(samples) {
    await requestJson(API_BASE + '/' + encodeURIComponent(currentRun.runId) + '/samples', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ samples: samples })
    });
    await selectRun(currentRun.runId);
  }

  function renderCurrentRun() {
    if (!currentRun) {
      currentRunTitle.textContent = '请选择或创建测试批次';
      sampleList.innerHTML = '';
      return;
    }
    currentRunTitle.textContent = currentRun.runId;
    var samples = currentRun.samples || [];
    if (!samples.length) {
      sampleList.innerHTML = '<p class="meta">当前批次还没有样本。</p>';
      return;
    }
    sampleList.innerHTML = samples.map(function (sample) {
      return [
        '<article class="sample-card">',
        '<strong>' + escapeHtml(sample.sampleId + ' · ' + sample.name) + '</strong>',
        '<p class="meta">',
        '目标=' + escapeHtml(sample.targetFormatExpected || 'unknown'),
        ' · 形态=' + escapeHtml(sample.materialFormExpected || 'unknown'),
        ' · 深度=' + escapeHtml(sample.expectedDiagnosisDepth || 'unknown'),
        ' · 来源=' + escapeHtml(sample.sourceType || '-'),
        ' · 文本=' + escapeHtml(sample.textPath || '-'),
        '</p>',
        '</article>'
      ].join('');
    }).join('');
  }

  async function requestJson(url, options) {
    var response = await fetch(url, options);
    var data = await response.json().catch(function () { return null; });
    if (!response.ok || !data || !data.ok) {
      var message = data && data.error && data.error.message ? data.error.message : '请求失败。';
      throw new Error(message);
    }
    return data;
  }

  function setState(message) {
    apiState.textContent = message || '';
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
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
