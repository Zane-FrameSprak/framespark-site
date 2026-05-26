(function () {
  'use strict';

  var state = {
    config: null,
    summary: null,
    visibleSeries: {},
    chartMeta: null,
    resizeTimer: null,
    chartHeightMode: 'standard',
    trafficPeriod: 'today',
    trafficReports: null,
    trafficStatus: 'loading',
    trafficError: '',
    analyticsReports: null,
    analyticsStatus: 'loading',
    analyticsError: ''
  };

  var seriesLabels = {
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

  var seriesConfig = [
    { key: 'allRequests', label: '全部请求', color: '#2563eb', defaultVisible: true },
    { key: 'validPageViews', label: '有效页面访问', color: '#16a34a', defaultVisible: true },
    { key: 'homeViews', label: '首页', color: '#f59e0b', defaultVisible: false },
    { key: 'diagnosisViews', label: '诊断页', color: '#dc2626', defaultVisible: true },
    { key: 'talentViews', label: '人才页', color: '#7c3aed', defaultVisible: false },
    { key: 'projectViews', label: '项目页', color: '#0f766e', defaultVisible: false },
    { key: 'notFound', label: '404', color: '#64748b', defaultVisible: false },
    { key: 'serverErrors', label: '5xx', color: '#111827', defaultVisible: false },
    { key: 'suspiciousRequests', label: '疑似扫描', color: '#ea580c', defaultVisible: false }
  ];

  // Mock traffic is only for local UI development. Default dashboard must show
  // real data or an empty state, never simulated operations numbers.
  var ENABLE_TRAFFIC_MOCK = false;

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
    seriesConfig.forEach(function (item) {
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
    setText('lastRefresh', formatDateTime(state.summary.refreshedAt));
    renderDeadlines();
    renderShortcuts();
    renderReminders();
    renderStats();
    renderLegend();
    renderAnalytics();
    drawChart();
    renderTrafficSummary();
    setText('trafficControlStatus', getTrafficPeriodStatusText(state.trafficPeriod));
    renderTrafficSource();
  }

  function renderDeadlines() {
    var grid = document.getElementById('deadlineGrid');
    var groups = [
      { key: '到期类', label: '到期提醒', note: '续费、证书和服务器期限。' },
      { key: '状态类', label: '当前状态', note: '当前阶段状态，不代表立即故障。' },
      { key: '操作风险类', label: '操作风险类', note: '容易造成正式站不同步或误部署的事项。' }
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
    var groups = groupBy(state.config.openTargets || [], 'group');
    root.innerHTML = Object.keys(groups).map(function (groupName) {
      var buttons = groups[groupName].map(function (target) {
        var disabled = target.available ? '' : ' disabled';
        var suffix = target.missingLabel ? '<small>' + escapeHtml(target.missingLabel) + '</small>' : '';
        var label = target.id === 'evalConsole' ? '诊断系统测试区' : target.label;
        var description = target.id === 'evalConsole'
          ? '<small class="shortcut-note">导入 TXT / DOCX / PDF 测试样本，保存测试批次，复查文本质量状态。</small>'
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
    root.innerHTML = (state.summary.reminders || []).map(function (item) {
      return '<article data-level="' + escapeHtml(item.level || 'normal') + '">' + escapeHtml(item.text) + '</article>';
    }).join('');
  }

  function renderStats() {
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

  function renderLegend() {
    var root = document.getElementById('chartLegend');
    var series = seriesConfig;
    var unavailable = !canUseTrafficData();
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
    var hours = getTrafficRowsForCurrentPeriod();
    var series = seriesConfig.filter(function (item) {
      return state.visibleSeries[item.key];
    });

    ctx.setTransform(dimensions.dpr, 0, 0, dimensions.dpr, 0, 0);
    ctx.clearRect(0, 0, dimensions.cssWidth, dimensions.cssHeight);

    var padding = { top: 28, right: 28, bottom: 44, left: 54 };
    var width = dimensions.cssWidth - padding.left - padding.right;
    var height = dimensions.cssHeight - padding.top - padding.bottom;
    var maxValue = Math.max(10, maxSeriesValue(hours, series));
    state.chartMeta = { padding: padding, width: width, height: height, maxValue: maxValue, rows: hours };

    drawAxes(ctx, padding, width, height, maxValue, hours);

    if (!hours.some(rowHasAnyMetric)) {
      drawEmptyChartState(ctx, padding, width, height);
      return;
    }

    series.forEach(function (item) {
      ctx.beginPath();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 3;
      var hasPoint = false;
      hours.forEach(function (row, index) {
        var value = getMetricValue(row, item.key);
        if (value == null) {
          hasPoint = false;
          return;
        }
        var x = getPointXForRow(row, index, padding, width, hours.length);
        var y = padding.top + height - (value / maxValue) * height;
        if (!hasPoint) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        hasPoint = true;
      });
      ctx.stroke();

      hours.forEach(function (row, index) {
        var value = getMetricValue(row, item.key);
        if (value == null) return;
        var x = getPointXForRow(row, index, padding, width, hours.length);
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
    var refreshButton = document.getElementById('refreshTrafficButton');
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
          setText('trafficControlStatus', getTrafficPeriodStatusText(state.trafficPeriod));
          drawChart();
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
        renderTrafficSummary();
        setText('trafficControlStatus', getTrafficPeriodStatusText(state.trafficPeriod));
        renderTrafficSource();
        refreshButton.disabled = false;
      });
    }
  }

  function setupAnalyticsControls() {
    var refreshButton = document.getElementById('refreshAnalyticsButton');
    if (!refreshButton) return;
    refreshButton.addEventListener('click', async function () {
      refreshButton.disabled = true;
      await loadAnalyticsSummary();
      renderAnalytics();
      refreshButton.disabled = false;
    });
  }

  function renderChartTooltip(event, canvas, tooltip) {
    if (!state.summary || !state.chartMeta) return;
    var hours = getTrafficRowsForCurrentPeriod();
    var visible = seriesConfig.filter(function (item) {
      return state.visibleSeries[item.key];
    });
    if (!hours.length || !visible.length) {
      tooltip.hidden = true;
      return;
    }

    var rect = canvas.getBoundingClientRect();
    var mouseX = event.clientX - rect.left;
    var mouseY = event.clientY - rect.top;
    var meta = state.chartMeta;
    var hit = findNearestVisiblePoint(mouseX, mouseY, hours, visible, meta);
    if (!hit) {
      tooltip.hidden = true;
      return;
    }
    var index = hit.index;
    var row = hours[index] || {};

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

  function findNearestVisiblePoint(mouseX, mouseY, hours, visible, meta) {
    var radius = 11;
    var best = null;
    visible.forEach(function (item) {
      hours.forEach(function (row, index) {
        var value = getMetricValue(row, item.key);
        if (value == null) return;
        var x = getPointXForRow(row, index, meta.padding, meta.width, hours.length);
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
      badge.dataset.state = state.analyticsStatus;
    }
    setText('analyticsControlStatus', getAnalyticsStatusText());
  }

  function getAnalyticsBadgeText() {
    if (state.analyticsStatus === 'loading') return '正在读取匿名访客统计...';
    if (state.analyticsStatus === 'error') return '读取失败，请检查 SSH 免密、summary 文件或 cron。';
    return '已读取服务器匿名访客统计摘要。';
  }

  function getAnalyticsStatusText() {
    if (state.analyticsStatus === 'loading') return '正在读取服务器匿名访客统计摘要...';
    if (state.analyticsStatus === 'error') return '读取失败：' + (state.analyticsError || '请检查 SSH 免密、summary 文件或 cron。');
    return '已读取真实匿名访客统计。匿名独立访客不等于真实自然人。';
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
      '<h3>匿名访客数据汇总</h3>',
      '<p>基于浏览器匿名 visitorId 聚合，不输出 visitorId、sessionId 或 ipHash 明细。</p>',
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
      '<p class="panel-hint">匿名独立访客只是同一浏览器的随机标识去重；同一人多设备、清缓存或无痕模式会造成误差。</p>'
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
    return { label: label, status: '真实匿名访客统计', state: 'ready', summary: report.summary, available: true };
  }

  function renderAnalyticsSource() {
    var text = [
      state.analyticsStatus === 'ready' ? '数据来源：服务器匿名访客 summary JSON' : '数据来源：' + getAnalyticsStatusText(),
      '读取方式：本机控制台通过 SSH 只读读取 /home/ubuntu/framespark-analytics-summaries/*.json',
      '用户行为统计与服务器 Nginx 请求统计分开展示'
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
      badge.textContent = getTrafficBadgeText();
      badge.dataset.state = state.trafficStatus;
    }
    var text = [
      state.trafficStatus === 'ready' ? '数据来源：服务器真实 Nginx 日志摘要 JSON' : '数据来源：' + getTrafficPeriodStatusText(state.trafficPeriod),
      '读取方式：本机控制台通过 SSH 只读读取 /home/ubuntu/framespark-reports/*.json'
    ].filter(Boolean).join('。');
    setText('trafficSource', text);
  }

  function getTrafficBadgeText() {
    if (state.trafficStatus === 'loading') return '正在读取服务器真实访问摘要...';
    if (state.trafficStatus === 'error') return '读取失败，请检查 SSH 免密、服务器摘要文件或 cron。';
    return '已读取服务器真实访问摘要，数据来自 Nginx 日志摘要 JSON。';
  }

  function renderTrafficSummary() {
    var root = document.getElementById('trafficSummary');
    if (!root || !state.summary) return;
    var metricKeys = Object.keys(seriesLabels);
    var periods = [
      buildSummaryPeriod('当日', 'today'),
      buildSummaryPeriod('昨日', 'yesterday'),
      buildSummaryPeriod('近 7 日', '7d'),
      buildSummaryPeriod('近 30 日', '30d')
    ];
    root.innerHTML = [
      '<div class="traffic-summary__head">',
      '<h3>数据汇总</h3>',
      '<p>汇总表来自服务器真实 Nginx 摘要 JSON，不受图例开关影响。读取失败或数据缺失时显示 “—”。</p>',
      '</div>',
      '<div class="traffic-summary__table" role="table" aria-label="访问数据汇总">',
      '<div class="traffic-summary__row traffic-summary__row--head" role="row">',
      '<span>周期</span>',
      metricKeys.map(function (key) { return '<span>' + escapeHtml(seriesLabels[key]) + '</span>'; }).join(''),
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
      '<p class="panel-hint">全部请求包含静态资源、扫描与异常请求；有效页面访问是按已知站内页面保守过滤后的请求，不等于独立用户。真实用户 / 访客数量需后续通过匿名访客统计获得。</p>'
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

  function getTrafficRowsForCurrentPeriod() {
    return getTrafficRowsForPeriod(state.trafficPeriod);
  }

  function getTrafficRowsForPeriod(period) {
    if (!canUseTrafficData(period)) return [];
    var report = getReportForPeriod(period);
    if (!report) return [];
    if (isDailyPeriod(period)) {
      return normalizeDailyRows(report.daily || []);
    }
    return normalizeHourlyRows(report.hourly || []);
  }

  function normalizeHourlyRows(rows) {
    return Array.from({ length: 24 }, function (_, hour) {
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

  function getReportForPeriod(period) {
    var reports = state.trafficReports && state.trafficReports.reports ? state.trafficReports.reports : {};
    if (period === 'yesterday') return reports.yesterday;
    if (period === '7d') return reports.last7;
    if (period === '30d') return reports.last30;
    return reports.today;
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
    return Object.keys(seriesLabels).some(function (key) {
      return getMetricValue(row, key) != null;
    });
  }

  function canUseTrafficData() {
    var period = arguments.length > 0 && arguments[0] ? arguments[0] : state.trafficPeriod;
    if (state.trafficStatus !== 'ready') return false;
    var report = getReportForPeriod(period);
    if (!report || !report.meta || report.meta.usesMockData) return false;
    if (isDailyPeriod(period)) return Array.isArray(report.daily) && report.daily.length > 0;
    return Array.isArray(report.hourly) && report.hourly.length > 0;
  }

  function getTrafficPeriodStatusText(period) {
    if (state.trafficStatus === 'loading') return '正在读取服务器真实访问摘要...';
    if (state.trafficStatus === 'error') return '读取失败，请检查 SSH 免密、服务器摘要文件或 cron。' + (state.trafficError ? ' ' + state.trafficError : '');
    if (canUseTrafficData(period)) return '已读取服务器真实访问摘要，数据来自 Nginx 日志摘要 JSON。';
    return '暂无真实' + getTrafficPeriodLabel(period) + '访问数据。';
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
    ctx.fillText(state.trafficStatus === 'error' ? '读取服务器真实访问摘要失败' : '暂无真实访问数据', padding.left + width / 2, padding.top + height / 2 - 8);
    ctx.fillStyle = '#65748b';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(state.trafficStatus === 'error' ? '请检查 SSH 免密、服务器摘要文件或 cron' : '无真实数据时不显示 mock 曲线或假数字', padding.left + width / 2, padding.top + height / 2 + 18);
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
    var response = await fetch(url, options || {});
    var data = await response.json().catch(function () { return null; });
    if (!response.ok || !data || data.ok === false) {
      var message = data && data.message ? data.message : '请求失败。';
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

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
