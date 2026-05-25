(function () {
  'use strict';

  var state = {
    config: null,
    summary: null,
    visibleSeries: {}
  };

  var seriesLabels = {
    pv: '全站 PV',
    uniqueIp: '独立 IP',
    home: '首页访问',
    diagnosis: '诊断页访问',
    talent: '人才页访问',
    notFound: '404',
    serverError: '5xx'
  };

  init();

  async function init() {
    try {
      var configResponse = await fetchJson('/api/console/config');
      var summaryResponse = await fetchJson('/api/console/summary');
      state.config = configResponse.config;
      state.summary = summaryResponse.summary;

      initVisibleSeries();
      renderAll();
    } catch (err) {
      document.body.innerHTML = '<main class="shell"><section class="panel"><h1>内部控制台启动失败</h1><p>' + escapeHtml(err.message) + '</p></section></main>';
    }
  }

  function initVisibleSeries() {
    var series = state.summary.traffic.series || [];
    series.forEach(function (item) {
      state.visibleSeries[item.key] = Boolean(item.defaultVisible);
    });
  }

  function renderAll() {
    setText('lastRefresh', formatDateTime(state.summary.refreshedAt));
    renderDeadlines();
    renderShortcuts();
    renderReminders();
    renderStats();
    renderLegend();
    drawChart();
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
    var days = typeof item.daysLeft === 'number'
      ? '<span class="deadline-days">剩余 ' + item.daysLeft + ' 天</span>'
      : '<span class="deadline-days deadline-days--unknown">待填写</span>';
    var statusText = getSeverityText(item.severity);
    return [
      '<article class="deadline-card" data-severity="' + escapeHtml(item.severity || 'normal') + '">',
      '<span>' + escapeHtml(item.label) + '</span>',
      '<strong>' + escapeHtml(item.value) + '</strong>',
      '<div class="deadline-card__foot">',
      days,
      '<em>' + escapeHtml(statusText) + '</em>',
      '</div>',
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
        openTarget(button.getAttribute('data-target-id'));
      });
    });
  }

  async function openTarget(targetId) {
    var status = document.getElementById('openTargetStatus');
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
      { label: '用户反馈', value: stats.reviewQueue && stats.reviewQueue.userFeedbackToday, priority: true },
      { label: 'review queue 待复查', value: stats.reviewQueue && stats.reviewQueue.today, priority: true },
      { label: 'PDF 需复查样本', value: stats.pdfQuality && stats.pdfQuality.warning, priority: true },
      { label: 'PDF 不建议诊断样本', value: stats.pdfQuality && stats.pdfQuality.failed, priority: true },
      { label: '今日新增测试批次', value: stats.sampleRuns && stats.sampleRuns.today, priority: true },
      { label: '本周新增测试批次', value: stats.sampleRuns && stats.sampleRuns.week },
      { label: '今日新增日志', value: stats.diagnosisLogs && stats.diagnosisLogs.today },
      { label: '本周新增日志', value: stats.diagnosisLogs && stats.diagnosisLogs.week },
      { label: '本周新增 review queue', value: stats.reviewQueue && stats.reviewQueue.week }
    ];

    document.getElementById('recordStats').innerHTML = rows.map(function (row) {
      var value = Number(row.value || 0);
      var classes = ['stats-card'];
      if (row.priority) classes.push('stats-card--priority');
      if (!value) classes.push('is-zero');
      return [
        '<article class="' + classes.join(' ') + '">',
        '<span>' + escapeHtml(row.label) + '</span>',
        '<strong>' + escapeHtml(value ? String(value) : '0') + '</strong>',
        '<small>' + escapeHtml(value ? '需要查看' : '尚无记录') + '</small>',
        '</article>'
      ].join('');
    }).join('');
  }

  function renderLegend() {
    var root = document.getElementById('chartLegend');
    var series = state.summary.traffic.series || [];
    root.innerHTML = series.map(function (item) {
      var active = state.visibleSeries[item.key] ? ' is-active' : '';
      return [
        '<button type="button" class="legend-item' + active + '" data-series="' + escapeHtml(item.key) + '" aria-pressed="' + String(Boolean(state.visibleSeries[item.key])) + '" style="--legend-color:' + escapeHtml(item.color) + '">',
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
    var ctx = canvas.getContext('2d');
    var traffic = state.summary.traffic;
    var hours = traffic.hours || [];
    var series = (traffic.series || []).filter(function (item) {
      return state.visibleSeries[item.key];
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var padding = { top: 28, right: 28, bottom: 44, left: 54 };
    var width = canvas.width - padding.left - padding.right;
    var height = canvas.height - padding.top - padding.bottom;
    var maxValue = Math.max(10, maxSeriesValue(hours, series));

    drawAxes(ctx, padding, width, height, maxValue);

    series.forEach(function (item) {
      ctx.beginPath();
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 3;
      hours.forEach(function (row, index) {
        var x = padding.left + (index / 24) * width;
        var y = padding.top + height - (Number(row[item.key] || 0) / maxValue) * height;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
  }

  function drawAxes(ctx, padding, width, height, maxValue) {
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
    [0, 6, 12, 18, 24].forEach(function (hour) {
      var x = padding.left + (hour / 24) * width;
      ctx.fillText(String(hour), x, padding.top + height + 28);
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

  function renderTrafficSource() {
    var traffic = state.summary.traffic || {};
    var badge = document.getElementById('trafficMockBadge');
    if (badge) badge.hidden = !traffic.isMock;
    var text = [
      '数据来源：' + (traffic.source || 'local-mock-summary'),
      traffic.note || '',
      '真实服务器日志路径：' + (traffic.nginxLogPaths || []).join(' / ')
    ].filter(Boolean).join('。');
    setText('trafficSource', text);
  }

  function maxSeriesValue(hours, series) {
    var max = 0;
    hours.forEach(function (row) {
      series.forEach(function (item) {
        max = Math.max(max, Number(row[item.key] || 0));
      });
    });
    return max;
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
