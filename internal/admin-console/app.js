(function () {
  'use strict';

  var state = {
    config: null,
    summary: null,
    visibleSeries: {},
    chartMeta: null,
    resizeTimer: null,
    chartHeightMode: 'standard',
    trendMode: 'analytics',
    trafficPeriod: 'today',
    trafficReports: null,
    trafficStatus: 'loading',
    trafficError: '',
    analyticsReports: null,
    analyticsStatus: 'loading',
    analyticsError: '',
    v1EvalSummary: null,
    v1EvalStatus: 'loading',
    v1EvalError: ''
  };

  var DEV_SAMPLE_RUNS_API = '/api/console/dev-sample-runs';

  var trafficSeriesLabels = {
    allRequests: '全部请求',
    validPageViews: '有效页面访问',
    homeViews: '首页',
    diagnosisViews: '诊断页',
    talentViews: '人才页',
    projectViews: '项目页',
    notFound: '404',
    serverErrors: '5xx',
    suspiciousRequests: '疑似扫描'
  };

  var trafficSeriesConfig = [
    { key: 'allRequests', label: '全部请求', color: '#2563eb', defaultVisible: false },
    { key: 'validPageViews', label: '有效页面访问', color: '#16a34a', defaultVisible: true },
    { key: 'homeViews', label: '首页', color: '#f59e0b', defaultVisible: false },
    { key: 'diagnosisViews', label: '诊断页', color: '#dc2626', defaultVisible: false },
    { key: 'talentViews', label: '人才页', color: '#7c3aed', defaultVisible: false },
    { key: 'projectViews', label: '项目页', color: '#0f766e', defaultVisible: false },
    { key: 'notFound', label: '404', color: '#64748b', defaultVisible: true },
    { key: 'serverErrors', label: '5xx', color: '#111827', defaultVisible: true },
    { key: 'suspiciousRequests', label: '疑似扫描', color: '#ea580c', defaultVisible: true }
  ];

  var analyticsTrendLabels = {
    anonymousVisitors: '匿名独立访客',
    pageViews: '页面浏览',
    clicks: '点击',
    diagnosisVisitors: '诊断页访客',
    talentVisitors: '人才页访客',
    projectVisitors: '项目页访客',
    diagnosisEntryClicks: '诊断入口点击',
    homeToDiagnosisVisitors: '首页→诊断页'
  };

  var analyticsTrendConfig = [
    { key: 'anonymousVisitors', label: '匿名独立访客', color: '#2563eb', defaultVisible: true },
    { key: 'pageViews', label: '页面浏览', color: '#16a34a', defaultVisible: true },
    { key: 'clicks', label: '点击', color: '#f59e0b', defaultVisible: false },
    { key: 'diagnosisVisitors', label: '诊断页访客', color: '#dc2626', defaultVisible: false },
    { key: 'talentVisitors', label: '人才页访客', color: '#7c3aed', defaultVisible: false },
    { key: 'projectVisitors', label: '项目页访客', color: '#0f766e', defaultVisible: false },
    { key: 'diagnosisEntryClicks', label: '诊断入口点击', color: '#ea580c', defaultVisible: true },
    { key: 'homeToDiagnosisVisitors', label: '首页→诊断页', color: '#0891b2', defaultVisible: true }
  ];

  // Mock traffic is only for local UI development. Default dashboard must show
  // real data or an empty state, never simulated operations numbers.
  var ENABLE_TRAFFIC_MOCK = false;
  var SUMMARY_STALE_AFTER_MS = 2 * 60 * 60 * 1000;

  init();

  async function init() {
    try {
      var configResponse = await fetchJson('/api/console/config');
      var summaryResponse = await fetchJson('/api/console/summary');
      state.config = configResponse.config;
      state.summary = summaryResponse.summary;

      initVisibleSeries();
      await loadTrafficSummary();
      await loadAnalyticsSummary();
      await loadV1EvalSummary();
      setupChartTooltip();
      setupChartResize();
      setupChartControls();
      setupAnalyticsControls();
      renderAll();
    } catch (err) {
      document.body.innerHTML = '<main class="shell"><section class="panel"><h1>内部控制台启动失败</h1><p>' + escapeHtml(err.message) + '</p></section></main>';
    }
  }

  function initVisibleSeries() {
    analyticsTrendConfig.concat(trafficSeriesConfig).forEach(function (item) {
      state.visibleSeries[item.key] = Boolean(item.defaultVisible);
    });
  }

  async function loadTrafficSummary() {
    state.trafficStatus = 'loading';
    state.trafficError = '';
    renderTrafficLoadingState();
    try {
      var response = await fetchJson('/api/console/traffic-summary');
      state.trafficReports = response;
      state.trafficStatus = 'ready';
      state.trafficError = '';
    } catch (err) {
      state.trafficReports = null;
      state.trafficStatus = 'error';
      state.trafficError = err.message || '读取服务器真实访问摘要失败。';
    }
  }

  function renderTrafficLoadingState() {
    var badge = document.getElementById('trafficMockBadge');
    if (badge) {
      badge.hidden = false;
      badge.textContent = '正在读取服务器真实访问摘要...';
    }
    setText('trafficControlStatus', '正在读取服务器真实访问摘要...');
  }

  async function loadAnalyticsSummary() {
    state.analyticsStatus = 'loading';
    state.analyticsError = '';
    renderAnalyticsLoadingState();
    try {
      var response = await fetchJson('/api/console/analytics-summary');
      state.analyticsReports = response;
      state.analyticsStatus = 'ready';
      state.analyticsError = '';
    } catch (err) {
      state.analyticsReports = null;
      state.analyticsStatus = 'error';
      state.analyticsError = err.message || '读取匿名访客统计摘要失败。';
    }
  }

  function renderAnalyticsLoadingState() {
    var badge = document.getElementById('analyticsStatusBadge');
    if (badge) {
      badge.textContent = '正在读取匿名访客统计...';
      badge.dataset.state = 'loading';
    }
    setText('analyticsControlStatus', '正在读取匿名访客统计...');
  }

  function renderAll() {
    setText('lastRefresh', formatDateTime(state.summary && state.summary.refreshedAt ? state.summary.refreshedAt : null));
    safeRender(renderDeadlines);
    safeRender(renderShortcuts);
    safeRender(renderReminders);
    safeRender(renderStats);
    safeRender(renderOperations);
    safeRender(renderV1EvalSummary);
    safeRender(renderLegend);
    safeRender(renderAnalytics);
    safeRender(drawChart);
    safeRender(renderTrendQuality);
    safeRender(renderTrafficSummary);
    safeRender(renderTrendModeText);
    safeRender(renderTrafficSource);
  }

  function safeRender(fn) {
    try {
      fn();
    } catch (err) {
      if (window.console && typeof window.console.warn === 'function') {
        window.console.warn('Admin console panel render failed:', err);
      }
    }
  }

  function renderDeadlines() {
    var grid = document.getElementById('deadlineGrid');
    if (!state.config || !Array.isArray(state.config.deadlines)) {
      if (grid) grid.innerHTML = '';
      return;
    }
    var groups = [
      { key: '到期类', label: '到期提醒', note: '续费与证书。' },
      { key: '状态类', label: '当前状态', note: '阶段状态。' },
      { key: '操作风险类', label: '操作风险类', note: '误部署风险。' }
    ];
    var deadlines = appendStaticOperationRisks(state.config.deadlines || []);
    grid.innerHTML = groups.map(function (group) {
      var items = deadlines.filter(function (item) { return (item.category || '状态类') === group.key; });
      if (!items.length) return '';
      return [
        '<section class="deadline-group" data-category="' + escapeHtml(group.key) + '">',
        '<div class="deadline-group__head">',
        '<h3>' + escapeHtml(group.label) + '</h3>',
        '<p>' + escapeHtml(group.note) + '</p>',
        '</div>',
        '<div class="deadline-group__items">',
        items.map(renderDeadlineCard).join(''),
        '</div>',
        '</section>'
      ].join('');
    }).join('');
  }

  function renderDeadlineCard(item) {
    var hasDays = typeof item.daysLeft === 'number';
    var coreValue = hasDays ? '剩余 ' + item.daysLeft + ' 天' : item.value;
    var detail = hasDays ? item.value : '';
    if (item.severity === 'unknown') {
      coreValue = '待填写';
      detail = '';
    }
    var statusText = getSeverityText(item.severity);
    return [
      '<article class="deadline-card" data-severity="' + escapeHtml(item.severity || 'normal') + '">',
      '<span>' + escapeHtml(item.label) + '</span>',
      '<strong>' + escapeHtml(coreValue) + (detail ? '<small>' + escapeHtml(detail) + '</small>' : '') + '</strong>',
      '<em>' + escapeHtml(statusText) + '</em>',
      '</article>'
    ].join('');
  }

  function renderShortcuts() {
    var root = document.getElementById('shortcutGroups');
    if (!state.config || !Array.isArray(state.config.openTargets)) {
      if (root) root.innerHTML = '';
      return;
    }
    var groups = groupBy(state.config.openTargets, 'group');
    root.innerHTML = Object.keys(groups).map(function (groupName) {
      var buttons = groups[groupName].map(function (target) {
        var disabled = target.available ? '' : ' disabled';
        var suffix = target.missingLabel ? '<small>' + escapeHtml(target.missingLabel) + '</small>' : '';
        var label = target.id === 'evalConsole' ? '诊断系统测试区' : target.label;
        var description = target.id === 'evalConsole'
          ? '<small class="shortcut-note">导入样本，运行测试。</small>'
          : '';
        return '<button type="button" data-target-id="' + escapeHtml(target.id) + '"' + disabled + '>' + escapeHtml(label) + description + suffix + '</button>';
      }).join('');
      return '<div class="shortcut-group"><h3>' + escapeHtml(groupName) + '</h3><div>' + buttons + '</div></div>';
    }).join('');

    root.querySelectorAll('button[data-target-id]').forEach(function (button) {
      button.addEventListener('click', function () {
        openTarget(button.getAttribute('data-target-id'), 'openTargetStatus');
      });
    });
  }

  async function openTarget(targetId, statusId) {
    var status = document.getElementById(statusId || 'openTargetStatus');
    status.textContent = '正在打开...';
    status.dataset.state = '';
    try {
      var response = await fetchJson('/api/console/open-target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: targetId })
      });
      status.textContent = response.message || '已发送打开请求。';
      status.dataset.state = 'success';
    } catch (err) {
      status.textContent = err.message;
      status.dataset.state = 'error';
    }
  }

  function renderReminders() {
    var root = document.getElementById('reminders');
    if (!state.summary || !Array.isArray(state.summary.reminders)) {
      if (root) root.innerHTML = '';
      return;
    }
    root.innerHTML = state.summary.reminders.map(function (item) {
      return '<article data-level="' + escapeHtml(item.level || 'normal') + '">' + escapeHtml(item.text) + '</article>';
    }).join('');
  }

  function renderStats() {
    if (!state.summary) {
      var statsRoot = document.getElementById('recordStats');
      if (statsRoot) statsRoot.innerHTML = '';
      setText('recordStatsStatus', '暂无本地记录。');
      return;
    }
    var stats = state.summary.counts || {};
    var rows = [
      { label: '用户反馈', value: stats.reviewQueue && stats.reviewQueue.userFeedbackToday, priority: true, targetId: 'reviewQueue' },
      { label: 'review queue 待复查', value: stats.reviewQueue && stats.reviewQueue.today, priority: true, targetId: 'reviewQueue' },
      { label: 'PDF 需复查样本', value: stats.pdfQuality && stats.pdfQuality.warning, priority: true, targetId: 'sampleRuns' },
      { label: 'PDF 不建议诊断样本', value: stats.pdfQuality && stats.pdfQuality.failed, priority: true, targetId: 'sampleRuns' },
      { label: '今日新增测试批次', value: stats.sampleRuns && stats.sampleRuns.today, priority: true, targetId: 'sampleRuns' },
      { label: '本周新增测试批次', value: stats.sampleRuns && stats.sampleRuns.week, targetId: 'sampleRuns' },
      { label: '今日新增日志', value: stats.diagnosisLogs && stats.diagnosisLogs.today, targetId: 'diagnosisLogs' },
      { label: '本周新增日志', value: stats.diagnosisLogs && stats.diagnosisLogs.week, targetId: 'diagnosisLogs' },
      { label: '本周新增 review queue', value: stats.reviewQueue && stats.reviewQueue.week, targetId: 'reviewQueue' }
    ];

    document.getElementById('recordStats').innerHTML = rows.map(function (row) {
      var value = Number(row.value || 0);
      var classes = ['stats-card'];
      if (row.priority) classes.push('stats-card--priority');
      if (!value) classes.push('is-zero');
      if (value && row.targetId) classes.push('is-clickable');
      var attrs = value && row.targetId
        ? ' data-target-id="' + escapeHtml(row.targetId) + '" role="button" tabindex="0"'
        : '';
      return [
        '<article class="' + classes.join(' ') + '"' + attrs + '>',
        '<span>' + escapeHtml(row.label) + '</span>',
        '<strong>' + escapeHtml(value ? String(value) : '0') + '</strong>',
        '<small>' + escapeHtml(value ? '点击查看' : '尚无记录') + '</small>',
        '</article>'
      ].join('');
    }).join('');

    document.querySelectorAll('#recordStats [data-target-id]').forEach(function (card) {
      card.addEventListener('click', function () {
        openTarget(card.getAttribute('data-target-id'), 'recordStatsStatus');
      });
      card.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openTarget(card.getAttribute('data-target-id'), 'recordStatsStatus');
        }
      });
    });
  }

  function renderOperations() {
    var config = state.config && state.config.publicBetaOps ? state.config.publicBetaOps : {};
    var summaryRoot = document.getElementById('opsSummary');
    var flowRoot = document.getElementById('opsFlow');
    if (!summaryRoot || !flowRoot) return;

    var cards = Array.isArray(config.summaryCards) ? config.summaryCards : [];
    var steps = Array.isArray(config.flowSteps) ? config.flowSteps : [];
    setText('opsUpdatedAt', config.updatedAt
      ? '状态同步：' + config.updatedAt + '。只读状态卡，不触发生产请求。'
      : '只读状态卡，不触发生产请求。');

    summaryRoot.innerHTML = cards.length ? cards.map(function (card) {
      return [
        '<article class="ops-card" data-state="' + escapeHtml(card.state || 'ready') + '">',
        '<span>' + escapeHtml(card.label) + '</span>',
        '<strong>' + escapeHtml(card.value) + '</strong>',
        '<small>' + escapeHtml(card.note || '') + '</small>',
        '</article>'
      ].join('');
    }).join('') : '<p class="panel-hint">暂无公测运营状态。</p>';

    flowRoot.innerHTML = steps.length ? steps.map(function (step, index) {
      return [
        '<article class="ops-step" data-state="' + escapeHtml(step.state || 'pending') + '">',
        '<span>' + String(index + 1).padStart(2, '0') + '</span>',
        '<div>',
        '<strong>' + escapeHtml(step.label) + '</strong>',
        '<small>' + escapeHtml(step.detail || '') + '</small>',
        '</div>',
        '</article>'
      ].join('');
    }).join('') : '<p class="panel-hint">暂无流程信息。</p>';
  }

  async function loadV1EvalSummary() {
    state.v1EvalStatus = 'loading';
    state.v1EvalError = '';
    renderV1EvalLoadingState();
    try {
      var listResponse = await fetchJson(DEV_SAMPLE_RUNS_API);
      var runs = Array.isArray(listResponse.runs) ? listResponse.runs : [];
      var detailedRuns = await Promise.all(runs.slice(0, 25).map(fetchSampleRunDetail));
      state.v1EvalSummary = buildV1EvalSummary(detailedRuns.filter(Boolean));
      state.v1EvalStatus = 'ready';
      state.v1EvalError = '';
    } catch (err) {
      state.v1EvalSummary = null;
      state.v1EvalStatus = 'error';
      state.v1EvalError = err.message || '读取 V1 评测摘要失败。';
    }
  }

  async function fetchSampleRunDetail(run) {
    if (!run || !run.runId) return null;
    try {
      var response = await fetchJson(DEV_SAMPLE_RUNS_API + '/' + encodeURIComponent(run.runId));
      return response.run || run;
    } catch (err) {
      return run;
    }
  }

  function renderV1EvalLoadingState() {
    var badge = document.getElementById('v1EvalStatusBadge');
    if (badge) {
      badge.textContent = '正在读取 V1 评测摘要...';
      badge.dataset.state = 'loading';
    }
    setText('v1EvalSource', '正在读取 dev sample runs...');
  }

  function buildV1EvalSummary(runs) {
    var results = [];
    (runs || []).forEach(function (run) {
      (Array.isArray(run.results) ? run.results : []).forEach(function (result) {
        results.push({
          runId: run.runId,
          createdAt: result.createdAt || run.createdAt || '',
          hasReportV1: result.hasReportV1 === true,
          v1StageReached: cleanText(result.v1StageReached),
          v1Decision: cleanText(result.v1Decision),
          v1PromptVersion: cleanText(result.v1PromptVersion),
          v1Model: cleanText(result.v1Model),
          v1Fallback: result.v1Fallback === true,
          v1LatencyMs: typeof result.v1LatencyMs === 'number' ? result.v1LatencyMs : null,
          v1MaturityLevel: cleanText(result.v1MaturityLevel),
          v1Stage: cleanText(result.v1Stage),
          v1NextStep: cleanText(result.v1NextStep),
          v1StopReason: cleanText(result.v1StopReason)
        });
      });
    });

    var v1Results = results.filter(function (item) { return item.hasReportV1; });
    var stageCounts = {};
    v1Results.forEach(function (item) {
      var key = item.v1StageReached || item.v1Stage || '未记录';
      stageCounts[key] = (stageCounts[key] || 0) + 1;
    });
    var latest = v1Results.slice().sort(function (a, b) {
      var dateA = Date.parse(a.createdAt || '');
      var dateB = Date.parse(b.createdAt || '');
      if (Number.isNaN(dateA) && Number.isNaN(dateB)) return 0;
      if (Number.isNaN(dateA)) return 1;
      if (Number.isNaN(dateB)) return -1;
      return dateB - dateA;
    })[0] || null;

    return {
      sampleRunCount: (runs || []).length,
      v1SampleRunCount: countRunsWithV1(runs),
      resultCount: results.length,
      hasReportV1Count: v1Results.length,
      stageCounts: stageCounts,
      fallbackCount: v1Results.filter(function (item) { return item.v1Fallback; }).length,
      latest: latest
    };
  }

  function countRunsWithV1(runs) {
    return (runs || []).filter(function (run) {
      return (Array.isArray(run.results) ? run.results : []).some(function (result) {
        return result.hasReportV1 === true;
      });
    }).length;
  }

  function renderV1EvalSummary() {
    renderV1EvalBadge();
    renderV1EvalCards();
    renderV1StageDistribution();
    renderV1LatestRun();
    renderV1EvalSource();
  }

  function renderV1EvalBadge() {
    var badge = document.getElementById('v1EvalStatusBadge');
    if (!badge) return;
    badge.textContent = getV1EvalBadgeText();
    badge.dataset.state = state.v1EvalStatus;
  }

  function getV1EvalBadgeText() {
    if (state.v1EvalStatus === 'loading') return '读取 V1 评测摘要...';
    if (state.v1EvalStatus === 'error') return '暂无 V1 评测数据。';
    if (!state.v1EvalSummary || !state.v1EvalSummary.hasReportV1Count) return '暂无 V1 评测数据。';
    return '已读取 V1 摘要。';
  }

  function renderV1EvalCards() {
    var root = document.getElementById('v1EvalCards');
    if (!root) return;
    var summary = state.v1EvalSummary || {};
    var ready = state.v1EvalStatus === 'ready' && summary.hasReportV1Count;
    var total = Number(summary.resultCount || 0);
    var v1Count = Number(summary.hasReportV1Count || 0);
    var ratio = total ? Math.round((v1Count / total) * 100) + '%' : '未记录';
    var cards = [
      { label: 'sample runs', value: summary.sampleRunCount },
      { label: 'V1 sample runs', value: summary.v1SampleRunCount },
      { label: 'hasReportV1', value: v1Count, note: ratio },
      { label: 'fallback', value: summary.fallbackCount, warning: Number(summary.fallbackCount || 0) > 0 }
    ];
    root.innerHTML = cards.map(function (card) {
      var value = card.value == null || card.value === '' ? '未记录' : String(card.value);
      return [
        '<article class="v1-eval-card' + (ready ? '' : ' is-empty') + (card.warning ? ' is-warning' : '') + '">',
        '<span>' + escapeHtml(card.label) + '</span>',
        '<strong>' + escapeHtml(value) + '</strong>',
        '<small>' + escapeHtml(card.note || (ready ? '已记录' : '暂无 V1 评测数据')) + '</small>',
        '</article>'
      ].join('');
    }).join('');
  }

  function renderV1StageDistribution() {
    var root = document.getElementById('v1StageDistribution');
    if (!root) return;
    var summary = state.v1EvalSummary || {};
    var counts = summary.stageCounts || {};
    var keys = Object.keys(counts);
    if (state.v1EvalStatus !== 'ready' || !keys.length) {
      root.innerHTML = '<p class="panel-hint">stageReached 分布：暂无 V1 评测数据。</p>';
      return;
    }
    root.innerHTML = [
      '<div class="v1-stage-distribution__head">',
      '<strong>stageReached 分布</strong>',
      '<span>final / advanced / basic / D0</span>',
      '</div>',
      '<div class="v1-stage-tags">',
      keys.sort().map(function (key) {
        return '<span>' + escapeHtml(key) + '：' + escapeHtml(String(counts[key])) + '</span>';
      }).join(''),
      '</div>'
    ].join('');
  }

  function renderV1LatestRun() {
    var root = document.getElementById('v1LatestRun');
    if (!root) return;
    var latest = state.v1EvalSummary && state.v1EvalSummary.latest;
    if (state.v1EvalStatus !== 'ready' || !latest) {
      root.innerHTML = '<p class="panel-hint">最近一次 V1 run：未记录。</p>';
      return;
    }
    var fallback = latest.v1Fallback === true;
    root.innerHTML = [
      '<article class="v1-latest-run__card' + (fallback ? ' is-warning' : '') + '">',
      '<div>',
      '<span>最近一次 V1 run</span>',
      '<strong>V1: ' + escapeHtml([
        latest.v1StageReached || latest.v1Stage || '未记录',
        latest.v1Decision || '未记录',
        fallback ? 'fallback' : 'no fallback',
        latest.v1Model || '未记录'
      ].join(' / ')) + '</strong>',
      '</div>',
      '<dl>',
      renderV1LatestField('runId', latest.runId),
      renderV1LatestField('stage', latest.v1StageReached || latest.v1Stage),
      renderV1LatestField('decision', latest.v1Decision),
      renderV1LatestField('promptVersion', latest.v1PromptVersion),
      renderV1LatestField('model', latest.v1Model),
      renderV1LatestField('fallback', fallback ? '是' : '否'),
      renderV1LatestField('latencyMs', latest.v1LatencyMs == null ? '' : String(latest.v1LatencyMs) + ' ms'),
      renderV1LatestField('maturity', latest.v1MaturityLevel),
      renderV1LatestField('nextStep', latest.v1NextStep),
      renderV1LatestField('stopReason', latest.v1StopReason),
      '</dl>',
      '</article>'
    ].join('');
  }

  function renderV1LatestField(label, value) {
    return [
      '<div>',
      '<dt>' + escapeHtml(label) + '</dt>',
      '<dd>' + escapeHtml(value == null || value === '' ? '未记录' : value) + '</dd>',
      '</div>'
    ].join('');
  }

  function renderV1EvalSource() {
    if (state.v1EvalStatus === 'error') {
      setText('v1EvalSource', '来源：dev sample runs 未连接或暂无可读接口。' + (state.v1EvalError ? ' ' + state.v1EvalError : ''));
      return;
    }
    if (state.v1EvalStatus === 'loading') {
      setText('v1EvalSource', '正在读取 dev sample runs...');
      return;
    }
    setText('v1EvalSource', '来源：127.0.0.1:8787 dev sample runs，只读摘要字段。');
  }

  function renderLegend() {
    var root = document.getElementById('chartLegend');
    var series = getCurrentSeriesConfig();
    var unavailable = !canUseCurrentTrendData();
    root.innerHTML = series.map(function (item) {
      var active = state.visibleSeries[item.key] ? ' is-active' : '';
      var disabled = unavailable ? ' is-unavailable' : '';
      return [
        '<button type="button" class="legend-item' + active + disabled + '" data-series="' + escapeHtml(item.key) + '" aria-pressed="' + String(Boolean(state.visibleSeries[item.key])) + '" style="--legend-color:' + escapeHtml(item.color) + '">',
        '<span style="background:' + escapeHtml(item.color) + '"></span>',
        escapeHtml(item.label),
        '</button>'
      ].join('');
    }).join('');

    root.querySelectorAll('button[data-series]').forEach(function (button) {
      button.addEventListener('click', function () {
        var key = button.getAttribute('data-series');
        state.visibleSeries[key] = !state.visibleSeries[key];
        renderLegend();
        drawChart();
      });
    });
  }

  function drawChart() {
    var canvas = document.getElementById('trafficChart');
    var dimensions = resizeChartCanvas(canvas);
    var ctx = canvas.getContext('2d');
    var rows = getRowsForCurrentTrend();
    var series = getCurrentSeriesConfig().filter(function (item) {
      return state.visibleSeries[item.key];
    });

    ctx.setTransform(dimensions.dpr, 0, 0, dimensions.dpr, 0, 0);
    ctx.clearRect(0, 0, dimensions.cssWidth, dimensions.cssHeight);

    var padding = { top: 28, right: 28, bottom: 44, left: 54 };
    var width = dimensions.cssWidth - padding.left - padding.right;
    var height = dimensions.cssHeight - padding.top - padding.bottom;
    var maxValue = Math.max(10, maxSeriesValue(rows, series));
    state.chartMeta = { padding: padding, width: width, height: height, maxValue: maxValue, rows: rows };

    drawAxes(ctx, padding, width, height, maxValue, rows);

    if (!rows.some(rowHasAnyMetric)) {
      drawEmptyChartState(ctx, padding, width, height);
      return;
    }

    series.forEach(function (item) {
      ctx.beginPath();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 3;
      var hasPoint = false;
      rows.forEach(function (row, index) {
        var value = getMetricValue(row, item.key);
        if (value == null) {
          hasPoint = false;
          return;
        }
        var x = getPointXForRow(row, index, padding, width, rows.length);
        var y = padding.top + height - (value / maxValue) * height;
        if (!hasPoint) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        hasPoint = true;
      });
      ctx.stroke();

      rows.forEach(function (row, index) {
        var value = getMetricValue(row, item.key);
        if (value == null) return;
        var x = getPointXForRow(row, index, padding, width, rows.length);
        var y = padding.top + height - (value / maxValue) * height;
        ctx.beginPath();
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2;
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    });
  }

  function setupChartTooltip() {
    var canvas = document.getElementById('trafficChart');
    var tooltip = document.getElementById('chartTooltip');
    if (!canvas || !tooltip) return;

    canvas.addEventListener('mousemove', function (event) {
      renderChartTooltip(event, canvas, tooltip);
    });
    canvas.addEventListener('mouseleave', function () {
      tooltip.hidden = true;
    });
  }

  function setupChartResize() {
    window.addEventListener('resize', function () {
      window.clearTimeout(state.resizeTimer);
      state.resizeTimer = window.setTimeout(function () {
        if (state.summary) drawChart();
      }, 120);
    });
  }

  function setupChartControls() {
    var heightControl = document.getElementById('chartHeightControl');
    var periodControl = document.getElementById('trafficPeriodControl');
    var trendModeControl = document.getElementById('trendModeControl');
    var refreshButton = document.getElementById('refreshTrafficButton');
    var refreshAnalyticsButton = document.getElementById('refreshAnalyticsButton');
    if (trendModeControl) {
      trendModeControl.querySelectorAll('[data-trend-mode]').forEach(function (button) {
        button.addEventListener('click', function () {
          state.trendMode = button.getAttribute('data-trend-mode') || 'analytics';
          updateSegmentedControl(trendModeControl, 'data-trend-mode', state.trendMode);
          renderLegend();
          renderTrendModeText();
          drawChart();
          renderTrendQuality();
          renderTrafficSource();
        });
      });
    }
    if (heightControl) {
      heightControl.querySelectorAll('[data-height]').forEach(function (button) {
        button.addEventListener('click', function () {
          state.chartHeightMode = button.getAttribute('data-height') || 'standard';
          updateSegmentedControl(heightControl, 'data-height', state.chartHeightMode);
          drawChart();
        });
      });
    }
    if (periodControl) {
      periodControl.querySelectorAll('[data-period]').forEach(function (button) {
        button.addEventListener('click', function () {
          var period = button.getAttribute('data-period');
          state.trafficPeriod = period || 'today';
          updateSegmentedControl(periodControl, 'data-period', state.trafficPeriod);
          renderTrendModeText();
          drawChart();
          renderTrendQuality();
          renderTrafficSummary();
          renderTrafficSource();
        });
      });
    }
    if (refreshButton) {
      refreshButton.addEventListener('click', async function () {
        refreshButton.disabled = true;
        await loadTrafficSummary();
        renderLegend();
        drawChart();
        renderTrendQuality();
        renderTrafficSummary();
        renderTrendModeText();
        renderTrafficSource();
        refreshButton.disabled = false;
      });
    }
    if (refreshAnalyticsButton) {
      refreshAnalyticsButton.addEventListener('click', async function () {
        refreshAnalyticsButton.disabled = true;
        await loadAnalyticsSummary();
        renderAnalytics();
        renderLegend();
        drawChart();
        renderTrendQuality();
        renderTrendModeText();
        renderTrafficSource();
        refreshAnalyticsButton.disabled = false;
      });
    }
  }

  function setupAnalyticsControls() {
    // Kept for init ordering compatibility; refresh is wired in setupChartControls
    // because the same data source also drives the default trend chart.
  }

  function renderChartTooltip(event, canvas, tooltip) {
    if (!state.summary || !state.chartMeta) return;
    var rows = getRowsForCurrentTrend();
    var visible = getCurrentSeriesConfig().filter(function (item) {
      return state.visibleSeries[item.key];
    });
    if (!rows.length || !visible.length) {
      tooltip.hidden = true;
      return;
    }

    var rect = canvas.getBoundingClientRect();
    var mouseX = event.clientX - rect.left;
    var mouseY = event.clientY - rect.top;
    var meta = state.chartMeta;
    var hit = findNearestVisiblePoint(mouseX, mouseY, rows, visible, meta);
    if (!hit) {
      tooltip.hidden = true;
      return;
    }
    var index = hit.index;
    var row = rows[index] || {};

    tooltip.innerHTML = [
      '<strong>' + escapeHtml(getTooltipLabel(row, index)) + '</strong>',
      visible.map(function (item) {
        var value = getMetricValue(row, item.key);
        return '<span><i style="background:' + escapeHtml(item.color) + '"></i>' + escapeHtml(item.label) + '：' + escapeHtml(String(value == null ? 0 : value)) + '</span>';
      }).join('')
    ].join('');
    tooltip.hidden = false;
    positionTooltip(tooltip, hit.x, hit.y, rect);
  }

  function findNearestVisiblePoint(mouseX, mouseY, rows, visible, meta) {
    var radius = 11;
    var best = null;
    visible.forEach(function (item) {
      rows.forEach(function (row, index) {
        var value = getMetricValue(row, item.key);
        if (value == null) return;
        var x = getPointXForRow(row, index, meta.padding, meta.width, rows.length);
        var y = meta.padding.top + meta.height - (value / meta.maxValue) * meta.height;
        var distance = Math.sqrt(Math.pow(mouseX - x, 2) + Math.pow(mouseY - y, 2));
        if (distance <= radius && (!best || distance < best.distance)) {
          best = { index: index, x: x, y: y, distance: distance };
        }
      });
    });
    return best;
  }

  function positionTooltip(tooltip, pointX, pointY, rect) {
    var margin = 10;
    var gap = 14;
    var width = tooltip.offsetWidth || 220;
    var height = tooltip.offsetHeight || 120;
    var left = pointX + gap;
    var top = pointY + gap;

    if (left + width + margin > rect.width) left = pointX - width - gap;
    if (left < margin) left = margin;
    if (top + height + margin > rect.height) top = pointY - height - gap;
    if (top < margin) top = margin;

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }

  function drawAxes(ctx, padding, width, height, maxValue, rows) {
    ctx.strokeStyle = '#d9dee8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + height);
    ctx.lineTo(padding.left + width, padding.top + height);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    getAxisLabels(rows).forEach(function (item) {
      var x = getPointXForRow(item.row, item.index, padding, width, rows.length);
      ctx.fillText(item.label, x, padding.top + height + 28);
    });

    ctx.textAlign = 'right';
    [0, 0.5, 1].forEach(function (ratio) {
      var value = Math.round(maxValue * ratio);
      var y = padding.top + height - ratio * height;
      ctx.fillText(String(value), padding.left - 12, y + 4);
      ctx.strokeStyle = '#eef2f7';
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + width, y);
      ctx.stroke();
    });
  }

  function renderAnalytics() {
    renderAnalyticsBadge();
    renderAnalyticsCards();
    renderAnalyticsSummary();
    renderAnalyticsSource();
  }

  function renderAnalyticsBadge() {
    var badge = document.getElementById('analyticsStatusBadge');
    if (badge) {
      badge.textContent = getAnalyticsBadgeText();
      badge.dataset.state = getAnalyticsBadgeState();
    }
    setText('analyticsControlStatus', getAnalyticsStatusText());
  }

  function getAnalyticsBadgeState() {
    if (state.analyticsStatus === 'ready' && hasStaleAnalyticsReports()) return 'stale';
    return state.analyticsStatus;
  }

  function getAnalyticsBadgeText() {
    if (state.analyticsStatus === 'loading') return '读取匿名访客统计...';
    if (state.analyticsStatus === 'error') return '读取失败。';
    if (hasStaleAnalyticsReports()) return '数据过期。';
    return '已读取匿名访客统计。';
  }

  function getAnalyticsStatusText() {
    if (state.analyticsStatus === 'loading') return '读取匿名访客统计...';
    if (state.analyticsStatus === 'error') return '读取失败：' + (state.analyticsError || '检查 SSH、summary 或 cron。');
    if (hasStaleAnalyticsReports()) return '数据过期：summary 文件长时间未刷新，请检查 cron。';
    return '已读取匿名访客统计。';
  }

  function renderAnalyticsCards() {
    var root = document.getElementById('analyticsCards');
    if (!root) return;
    var today = getAnalyticsReport('today');
    var summary = today && today.summary ? today.summary : {};
    var ready = state.analyticsStatus === 'ready' && today && today.summary;
    var cards = [
      { label: '匿名独立访客', key: 'anonymousVisitors' },
      { label: '新访客', key: 'newVisitors' },
      { label: '回访访客', key: 'returningVisitors' },
      { label: '会话', key: 'sessions' },
      { label: '首页访客', key: 'homeVisitors' },
      { label: '诊断页访客', key: 'diagnosisVisitors' },
      { label: '人才页访客', key: 'talentVisitors' },
      { label: '项目页访客', key: 'projectVisitors' },
      { label: '诊断入口点击', key: 'diagnosisEntryClicks' },
      { label: '首页 → 诊断页', key: 'homeToDiagnosisVisitors' }
    ];

    root.innerHTML = cards.map(function (card) {
      return [
        '<article class="analytics-card' + (ready ? '' : ' is-empty') + '">',
        '<span>' + escapeHtml(card.label) + '</span>',
        '<strong>' + escapeHtml(ready ? String(getAnalyticsMetric(summary, card.key)) : '—') + '</strong>',
        '<small>' + escapeHtml(ready ? '当日' : getAnalyticsEmptyLabel()) + '</small>',
        '</article>'
      ].join('');
    }).join('');
  }

  function renderAnalyticsSummary() {
    var root = document.getElementById('analyticsSummary');
    if (!root) return;
    var rows = [
      buildAnalyticsPeriod('当日', 'today'),
      buildAnalyticsPeriod('昨日', 'yesterday'),
      buildAnalyticsPeriod('近 7 日', 'last7'),
      buildAnalyticsPeriod('近 30 日', 'last30')
    ];
    var columns = [
      { label: '匿名访客', key: 'anonymousVisitors' },
      { label: '新访客', key: 'newVisitors' },
      { label: '回访访客', key: 'returningVisitors' },
      { label: '会话', key: 'sessions' },
      { label: '首页访客', key: 'homeVisitors' },
      { label: '诊断页访客', key: 'diagnosisVisitors' },
      { label: '人才页访客', key: 'talentVisitors' },
      { label: '项目页访客', key: 'projectVisitors' },
      { label: '诊断入口点击', key: 'diagnosisEntryClicks' },
      { label: '首页→诊断页', key: 'homeToDiagnosisVisitors' }
    ];

    root.innerHTML = [
      '<div class="analytics-summary__head">',
      '<h3>汇总</h3>',
      '<p>匿名 visitorId 聚合。</p>',
      '</div>',
      '<div class="analytics-summary__table" role="table" aria-label="匿名访客统计汇总">',
      '<div class="analytics-summary__row analytics-summary__row--head" role="row">',
      '<span>周期</span>',
      columns.map(function (column) { return '<span>' + escapeHtml(column.label) + '</span>'; }).join(''),
      '<span>状态</span>',
      '</div>',
      rows.map(function (row) {
        return [
          '<div class="analytics-summary__row" role="row">',
          '<strong>' + escapeHtml(row.label) + '</strong>',
          columns.map(function (column) {
            return '<span>' + escapeHtml(row.available ? String(getAnalyticsMetric(row.summary, column.key)) : '—') + '</span>';
          }).join(''),
          '<em data-state="' + escapeHtml(row.state) + '">' + escapeHtml(row.status) + '</em>',
          '</div>'
        ].join('');
      }).join(''),
      '</div>',
      '<p class="panel-hint">匿名访客不等于自然人。</p>'
    ].join('');
  }

  function buildAnalyticsPeriod(label, key) {
    if (state.analyticsStatus === 'error') {
      return { label: label, status: '读取失败', state: 'error', summary: null, available: false };
    }
    if (state.analyticsStatus === 'loading') {
      return { label: label, status: '正在读取', state: 'pending', summary: null, available: false };
    }
    var report = getAnalyticsReport(key);
    if (!report || !report.summary) {
      return { label: label, status: '暂无数据', state: 'pending', summary: null, available: false };
    }
    if (isReportStale(report)) {
      return { label: label, status: '数据过期', state: 'stale', summary: report.summary, available: true };
    }
    return { label: label, status: '真实数据', state: 'ready', summary: report.summary, available: true };
  }

  function renderAnalyticsSource() {
    var source = '来源：' + getAnalyticsStatusText();
    if (state.analyticsStatus === 'ready') {
      source = hasStaleAnalyticsReports()
        ? '来源：analytics summary JSON（数据过期）'
        : '来源：analytics summary JSON';
    }
    var text = [
      source,
      'SSH 只读读取'
    ].filter(Boolean).join('。');
    setText('analyticsSource', text);
  }

  function getAnalyticsReport(key) {
    var reports = state.analyticsReports && state.analyticsReports.reports ? state.analyticsReports.reports : {};
    return reports[key] || null;
  }

  function getAnalyticsMetric(summary, key) {
    if (!summary || summary[key] == null || summary[key] === '') return '—';
    var value = Number(summary[key]);
    return Number.isFinite(value) ? value : '—';
  }

  function getAnalyticsEmptyLabel() {
    if (state.analyticsStatus === 'error') return '读取失败';
    if (state.analyticsStatus === 'loading') return '读取中';
    return '暂无数据';
  }

  function renderTrafficSource() {
    var badge = document.getElementById('trafficMockBadge');
    if (badge) {
      badge.hidden = false;
      badge.textContent = getTrendBadgeText();
      badge.dataset.state = state.trendMode === 'analytics' ? getAnalyticsBadgeState() : getTrafficBadgeState();
    }
    var analyticsSource = state.analyticsStatus === 'ready'
      ? (hasStaleAnalyticsReports() ? '来源：analytics summary JSON（数据过期）' : '来源：analytics summary JSON')
      : '来源：' + getAnalyticsTrendStatusText(state.trafficPeriod);
    var trafficSource = state.trafficStatus === 'ready'
      ? (hasStaleTrafficReports() ? '来源：Nginx 摘要 JSON（数据过期）' : '来源：Nginx 摘要 JSON')
      : '来源：' + getTrafficPeriodStatusText(state.trafficPeriod);
    var text = state.trendMode === 'analytics'
      ? [
        analyticsSource,
        'SSH 只读读取'
      ].filter(Boolean).join('。')
      : [
        trafficSource,
        'SSH 只读读取'
    ].filter(Boolean).join('。');
    setText('trafficSource', text);
  }

  function renderTrendQuality() {
    var root = document.getElementById('trendQuality');
    if (!root) return;
    var isAnalytics = state.trendMode === 'analytics';
    var report = isAnalytics ? getAnalyticsReportForPeriod(state.trafficPeriod) : getReportForPeriod(state.trafficPeriod);
    var status = isAnalytics ? getAnalyticsTrendStatusText(state.trafficPeriod) : getTrafficPeriodStatusText(state.trafficPeriod);
    var stale = isReportStale(report);
    var cards = [
      {
        label: '当前口径',
        value: isAnalytics ? '匿名用户行为' : '服务器访问日志',
        note: isAnalytics ? '来自浏览器事件和匿名 visitorId。' : '来自 Nginx 请求摘要。'
      },
      {
        label: '最后生成',
        value: report && report.generatedAt ? formatDateTime(report.generatedAt) : '—',
        note: stale ? '数据过期，请检查 cron。' : '用于判断这张图是否新鲜。'
      },
      {
        label: '怎么解读',
        value: isAnalytics ? '不是自然人数' : '不是用户人数',
        note: isAnalytics ? '可看点击和访问趋势，不能当精确人数。' : '可看请求、错误和扫描，不能当精确访客。'
      },
      {
        label: '当前状态',
        value: stale ? '数据过期' : status.replace(/。$/, ''),
        note: '绿色或蓝色代表可看趋势；黄色代表只作历史参考。'
      }
    ];

    root.innerHTML = cards.map(function (card) {
      return [
        '<article class="data-quality-card' + (stale && card.label === '当前状态' ? ' is-stale' : '') + '">',
        '<span>' + escapeHtml(card.label) + '</span>',
        '<strong>' + escapeHtml(card.value) + '</strong>',
        '<small>' + escapeHtml(card.note) + '</small>',
        '</article>'
      ].join('');
    }).join('');
  }

  function getTrafficBadgeState() {
    if (state.trafficStatus === 'ready' && hasStaleTrafficReports()) return 'stale';
    return state.trafficStatus;
  }

  function getTrafficBadgeText() {
    if (state.trafficStatus === 'loading') return '读取服务器摘要...';
    if (state.trafficStatus === 'error') return '读取失败。';
    if (hasStaleTrafficReports()) return '数据过期。';
    return '已读取 Nginx 摘要。';
  }

  function getTrendBadgeText() {
    if (state.trendMode === 'analytics') {
      if (state.analyticsStatus === 'loading') return '读取匿名访客统计...';
      if (state.analyticsStatus === 'error') return '读取失败。';
      if (hasStaleAnalyticsReports()) return '用户行为数据过期。';
      return '用户行为趋势。';
    }
    return getTrafficBadgeText();
  }

  function renderTrafficSummary() {
    var root = document.getElementById('trafficSummary');
    if (!root || !state.summary) return;
    var metricKeys = Object.keys(trafficSeriesLabels);
    var periods = [
      buildSummaryPeriod('当日', 'today'),
      buildSummaryPeriod('昨日', 'yesterday'),
      buildSummaryPeriod('近 7 日', '7d'),
      buildSummaryPeriod('近 30 日', '30d')
    ];
    root.innerHTML = [
      '<div class="traffic-summary__head">',
      '<h3>数据汇总</h3>',
      '<p>Nginx 摘要，不受图例开关影响。</p>',
      '</div>',
      '<div class="traffic-summary__table" role="table" aria-label="访问数据汇总">',
      '<div class="traffic-summary__row traffic-summary__row--head" role="row">',
      '<span>周期</span>',
      metricKeys.map(function (key) { return '<span>' + escapeHtml(trafficSeriesLabels[key]) + '</span>'; }).join(''),
      '<span>状态</span>',
      '</div>',
      periods.map(function (period) {
        return [
          '<div class="traffic-summary__row" role="row">',
          '<strong>' + escapeHtml(period.label) + '</strong>',
          metricKeys.map(function (key) {
            return '<span>' + escapeHtml(period.available ? String(getSummaryMetric(period.report, key)) : '—') + '</span>';
          }).join(''),
          '<em data-state="' + escapeHtml(period.state) + '">' + escapeHtml(period.status) + '</em>',
          '</div>'
        ].join('');
      }).join(''),
      '</div>',
      '<p class="panel-hint">全部请求含静态资源、扫描与异常。有效页面访问不等于用户数。</p>'
    ].join('');
  }

  function buildSummaryPeriod(label, period) {
    if (state.trafficStatus === 'error') {
      return { label: label, status: '读取失败', state: 'error', report: null, available: false };
    }
    if (state.trafficStatus === 'loading') {
      return { label: label, status: '正在读取', state: 'pending', report: null, available: false };
    }
    var report = getReportForPeriod(period);
    if (!report || !report.summary) {
      return { label: label, status: '暂无数据', state: 'pending', report: null, available: false };
    }
    if (isReportStale(report)) {
      return { label: label, status: '数据过期', state: 'stale', report: report, available: true };
    }
    return { label: label, status: '真实数据', state: 'ready', report: report, available: true };
  }

  function getSummaryMetric(report, key) {
    if (!report || !report.summary) return '—';
    var value = report.summary[key];
    return value == null || value === '' ? '—' : value;
  }

  function maxSeriesValue(hours, series) {
    var max = 0;
    hours.forEach(function (row) {
      series.forEach(function (item) {
        var value = getMetricValue(row, item.key);
        max = Math.max(max, value == null ? 0 : value);
      });
    });
    return max;
  }

  function renderTrendModeText() {
    var isAnalytics = state.trendMode === 'analytics';
    var status = isAnalytics
      ? getAnalyticsTrendStatusText(state.trafficPeriod)
      : getTrafficPeriodStatusText(state.trafficPeriod);
    setText('trafficControlStatus', status);
    setText('trendModeDescription', isAnalytics
      ? '匿名访客行为。非自然人数。'
      : 'Nginx 请求、错误与扫描。');
  }

  function getCurrentSeriesConfig() {
    return state.trendMode === 'analytics' ? analyticsTrendConfig : trafficSeriesConfig;
  }

  function getRowsForCurrentTrend() {
    return state.trendMode === 'analytics'
      ? getAnalyticsRowsForPeriod(state.trafficPeriod)
      : getTrafficRowsForPeriod(state.trafficPeriod);
  }

  function getTrafficRowsForPeriod(period) {
    if (!canUseTrafficData(period)) return [];
    var report = getReportForPeriod(period);
    if (!report) return [];
    if (isDailyPeriod(period)) {
      return normalizeDailyRows(report.daily || []);
    }
    return normalizeHourlyRows(report.hourly || [], report, period);
  }

  function normalizeHourlyRows(rows, report, period) {
    var cutoffHour = getHourlyCutoffHour(report, period);
    return Array.from({ length: cutoffHour + 1 }, function (_, hour) {
      var found = rows.find(function (item) { return Number(item.hour) === hour; }) || {};
      return normalizeTrafficRow({ ...found, hour: hour });
    });
  }

  function normalizeDailyRows(rows) {
    return rows.map(function (row) {
      return normalizeTrafficRow(row);
    });
  }

  function normalizeTrafficRow(row) {
    return {
      hour: row.hour,
      date: row.date,
      allRequests: toNullableNumber(row.allRequests),
      validPageViews: toNullableNumber(row.validPageViews),
      homeViews: toNullableNumber(row.homeViews),
      diagnosisViews: toNullableNumber(row.diagnosisViews),
      talentViews: toNullableNumber(row.talentViews),
      projectViews: toNullableNumber(row.projectViews),
      notFound: toNullableNumber(row.notFound),
      serverErrors: toNullableNumber(row.serverErrors),
      suspiciousRequests: toNullableNumber(row.suspiciousRequests)
    };
  }

  function getAnalyticsRowsForPeriod(period) {
    if (!canUseAnalyticsTrendData(period)) return [];
    var report = getAnalyticsReportForPeriod(period);
    if (!report) return [];
    if (isDailyPeriod(period)) {
      return normalizeAnalyticsDailyRows(report.daily || []);
    }
    return normalizeAnalyticsHourlyRows(report.hourly || [], report, period);
  }

  function normalizeAnalyticsHourlyRows(rows, report, period) {
    var cutoffHour = getHourlyCutoffHour(report, period);
    return Array.from({ length: cutoffHour + 1 }, function (_, hour) {
      var found = rows.find(function (item) { return Number(item.hour) === hour; }) || {};
      return normalizeAnalyticsRow({ ...found, hour: hour });
    });
  }

  function normalizeAnalyticsDailyRows(rows) {
    return rows.map(function (row) {
      return normalizeAnalyticsRow(row);
    });
  }

  function normalizeAnalyticsRow(row) {
    return {
      hour: row.hour,
      date: row.date,
      anonymousVisitors: toNullableNumber(row.anonymousVisitors),
      pageViews: toNullableNumber(row.pageViews),
      clicks: toNullableNumber(row.clicks),
      diagnosisVisitors: toNullableNumber(row.diagnosisVisitors),
      talentVisitors: toNullableNumber(row.talentVisitors),
      projectVisitors: toNullableNumber(row.projectVisitors),
      diagnosisEntryClicks: toNullableNumber(row.diagnosisEntryClicks),
      homeToDiagnosisVisitors: toNullableNumber(row.homeToDiagnosisVisitors)
    };
  }

  function getReportForPeriod(period) {
    var reports = state.trafficReports && state.trafficReports.reports ? state.trafficReports.reports : {};
    if (period === 'yesterday') return reports.yesterday;
    if (period === '7d') return reports.last7;
    if (period === '30d') return reports.last30;
    return reports.today;
  }

  function getAnalyticsReportForPeriod(period) {
    if (period === 'yesterday') return getAnalyticsReport('yesterday');
    if (period === '7d') return getAnalyticsReport('last7');
    if (period === '30d') return getAnalyticsReport('last30');
    return getAnalyticsReport('today');
  }

  function hasStaleTrafficReports() {
    return hasStaleReports(state.trafficReports);
  }

  function hasStaleAnalyticsReports() {
    return hasStaleReports(state.analyticsReports);
  }

  function hasStaleReports(payload) {
    var reports = payload && payload.reports ? payload.reports : {};
    return Object.keys(reports).some(function (key) {
      return isReportStale(reports[key]);
    });
  }

  function isReportStale(report) {
    if (!report || !report.generatedAt) return false;
    var generatedAt = new Date(report.generatedAt).getTime();
    if (!Number.isFinite(generatedAt)) return true;
    return Date.now() - generatedAt > SUMMARY_STALE_AFTER_MS;
  }

  function getMetricValue(row, key) {
    if (!row || row[key] == null || row[key] === '') return null;
    var value = Number(row[key]);
    return Number.isFinite(value) ? value : null;
  }

  function toNullableNumber(value) {
    if (value == null || value === '') return null;
    var number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function rowHasAnyMetric(row) {
    var labels = state.trendMode === 'analytics' ? analyticsTrendLabels : trafficSeriesLabels;
    return Object.keys(labels).some(function (key) {
      return getMetricValue(row, key) != null;
    });
  }

  function canUseCurrentTrendData() {
    var period = arguments.length > 0 && arguments[0] ? arguments[0] : state.trafficPeriod;
    return state.trendMode === 'analytics'
      ? canUseAnalyticsTrendData(period)
      : canUseTrafficData(period);
  }

  function canUseTrafficData(period) {
    period = period || state.trafficPeriod;
    if (state.trafficStatus !== 'ready') return false;
    var report = getReportForPeriod(period);
    if (!report || !report.meta || report.meta.usesMockData) return false;
    if (isReportStale(report)) return false;
    if (isDailyPeriod(period)) return Array.isArray(report.daily) && report.daily.length > 0;
    return Array.isArray(report.hourly) && report.hourly.length > 0;
  }

  function getTrafficPeriodStatusText(period) {
    if (state.trafficStatus === 'loading') return '读取服务器摘要...';
    if (state.trafficStatus === 'error') return '读取失败。' + (state.trafficError ? ' ' + state.trafficError : '');
    if (isReportStale(getReportForPeriod(period))) return 'Nginx 摘要已过期，请检查定时任务。';
    if (canUseTrafficData(period)) return '已读取 Nginx 摘要。';
    return '暂无' + getTrafficPeriodLabel(period) + '数据。';
  }

  function canUseAnalyticsTrendData(period) {
    period = period || state.trafficPeriod;
    if (state.analyticsStatus !== 'ready') return false;
    var report = getAnalyticsReportForPeriod(period);
    if (!report || !report.meta || report.meta.usesMockData) return false;
    if (isReportStale(report)) return false;
    if (isDailyPeriod(period)) return Array.isArray(report.daily) && report.daily.length > 0;
    return Array.isArray(report.hourly) && report.hourly.length > 0;
  }

  function getAnalyticsTrendStatusText(period) {
    if (state.analyticsStatus === 'loading') return '读取匿名访客统计...';
    if (state.analyticsStatus === 'error') return '读取失败。' + (state.analyticsError ? ' ' + state.analyticsError : '');
    if (isReportStale(getAnalyticsReportForPeriod(period))) return '匿名访客统计已过期，请检查定时任务。';
    if (canUseAnalyticsTrendData(period)) return '已读取匿名访客统计。';
    return '暂无' + getTrafficPeriodLabel(period) + '数据。';
  }

  function getTrafficPeriodLabel(period) {
    if (period === 'yesterday') return '昨日';
    if (period === '7d') return '近 7 日';
    if (period === '30d') return '近 30 日';
    return '当日';
  }

  function drawEmptyChartState(ctx, padding, width, height) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#172033';
    ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    var isAnalytics = state.trendMode === 'analytics';
    var isError = isAnalytics ? state.analyticsStatus === 'error' : state.trafficStatus === 'error';
    ctx.fillText(isError ? '读取失败' : '暂无数据', padding.left + width / 2, padding.top + height / 2 - 8);
    ctx.fillStyle = '#65748b';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(isError ? '检查 SSH、summary 或 cron' : '无真实数据不显示曲线', padding.left + width / 2, padding.top + height / 2 + 18);
    ctx.restore();
  }

  function getAxisLabels(rows) {
    if (isDailyPeriod(state.trafficPeriod)) {
      if (!rows.length) return [];
      var indexes = [0, Math.floor((rows.length - 1) / 2), rows.length - 1]
        .filter(function (value, index, all) { return all.indexOf(value) === index; });
      return indexes.map(function (index) {
        return {
          index: index,
          row: rows[index],
          label: formatAxisDate(rows[index] && rows[index].date)
        };
      });
    }
    return [0, 6, 12, 18, 24].map(function (hour) {
      return {
        index: hour,
        row: { hour: hour },
        label: String(hour)
      };
    });
  }

  function getPointXForRow(row, index, padding, width, totalRows) {
    if (isDailyPeriod(state.trafficPeriod)) {
      var denominator = Math.max(1, totalRows - 1);
      return padding.left + (index / denominator) * width;
    }
    return padding.left + (Number(row && row.hour != null ? row.hour : index) / 24) * width;
  }

  function formatAxisDate(value) {
    if (!value || typeof value !== 'string') return '--';
    return value.slice(5);
  }

  function getTooltipLabel(row, index) {
    if (isDailyPeriod(state.trafficPeriod)) {
      return row && row.date ? row.date : '第 ' + (index + 1) + ' 天';
    }
    var hour = row && row.hour != null ? row.hour : index;
    return String(hour).padStart(2, '0') + ':00';
  }

  function getHourlyCutoffHour(report, period) {
    if (period && period !== 'today') return 23;
    var generatedAt = report && report.generatedAt ? new Date(report.generatedAt) : null;
    if (!generatedAt || Number.isNaN(generatedAt.getTime())) {
      return new Date().getHours();
    }

    var reportDate = report && report.range && report.range.startDate;
    var generatedDate = formatLocalDate(generatedAt);
    if (reportDate && generatedDate < reportDate) return 0;
    if (reportDate && generatedDate > reportDate) return 23;
    return clampHour(generatedAt.getHours());
  }

  function clampHour(value) {
    var hour = Number(value);
    if (!Number.isFinite(hour)) return 0;
    return Math.max(0, Math.min(23, Math.floor(hour)));
  }

  function formatLocalDate(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function isDailyPeriod(period) {
    return period === '7d' || period === '30d';
  }

  function resizeChartCanvas(canvas) {
    if (!canvas) return { cssWidth: 620, cssHeight: 340, dpr: 1 };
    var wrap = canvas.parentElement;
    var rect = wrap.getBoundingClientRect();
    var width = Math.max(620, Math.round(rect.width));
    var height = getChartHeight();
    var dpr = Math.max(1, window.devicePixelRatio || 1);
    var pixelWidth = Math.round(width * dpr);
    var pixelHeight = Math.round(height * dpr);

    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    wrap.style.minHeight = height + 'px';
    return { cssWidth: width, cssHeight: height, dpr: dpr };
  }

  function getChartHeight() {
    if (state.chartHeightMode === 'compact') return 280;
    if (state.chartHeightMode === 'expanded') return 440;
    return 340;
  }

  function updateSegmentedControl(root, attr, value) {
    root.querySelectorAll('button[' + attr + ']').forEach(function (button) {
      var active = button.getAttribute(attr) === value;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  async function fetchJson(url, options) {
    var response;
    try {
      response = await fetch(url, options || {});
    } catch (err) {
      throw new Error('网络请求失败：无法连接 ' + url);
    }
    var data = await response.json().catch(function () { return null; });
    if (!response.ok || !data || data.ok === false) {
      var message = data && data.message ? data.message : 'HTTP ' + response.status + ' 请求失败。';
      throw new Error(message);
    }
    return data;
  }

  function groupBy(items, key) {
    return items.reduce(function (acc, item) {
      var group = item[key] || '其他';
      if (!acc[group]) acc[group] = [];
      acc[group].push(item);
      return acc;
    }, {});
  }

  function formatDateTime(value) {
    if (!value) return '--';
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleString('zh-CN', { hour12: false });
  }

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function getSeverityText(severity) {
    if (severity === 'urgent') return '紧急';
    if (severity === 'attention' || severity === 'warning') return '需关注';
    if (severity === 'unknown') return '待补充';
    return '正常';
  }

  function appendStaticOperationRisks(items) {
    var exists = items.some(function (item) { return item.id === 'deployExclude'; });
    if (exists) return items;
    return items.concat([{
      id: 'deployExclude',
      category: '操作风险类',
      label: '正式站部署排除项',
      value: '必须继续排除 internal/、diagnosis-api/、docs/、logs/、node_modules/',
      severity: 'warning',
      daysLeft: null
    }]);
  }

  function cleanText(value) {
    return typeof value === 'string' ? value.trim() : '';
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
