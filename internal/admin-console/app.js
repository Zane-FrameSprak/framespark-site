(function () {
  'use strict';

  var state = {
    config: null,
    summary: null,
    visibleSeries: {},
    chartMeta: null,
    resizeTimer: null,
    chartHeightMode: 'standard',
    trafficPeriod: 'today'
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
      setupChartTooltip();
      setupChartResize();
      setupChartControls();
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
    var series = state.summary.traffic.series || [];
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
    var traffic = state.summary.traffic;
    var hours = getTrafficRowsForCurrentPeriod();
    var series = (traffic.series || []).filter(function (item) {
      return state.visibleSeries[item.key];
    });

    ctx.setTransform(dimensions.dpr, 0, 0, dimensions.dpr, 0, 0);
    ctx.clearRect(0, 0, dimensions.cssWidth, dimensions.cssHeight);

    var padding = { top: 28, right: 28, bottom: 44, left: 54 };
    var width = dimensions.cssWidth - padding.left - padding.right;
    var height = dimensions.cssHeight - padding.top - padding.bottom;
    var maxValue = Math.max(10, maxSeriesValue(hours, series));
    state.chartMeta = { padding: padding, width: width, height: height, maxValue: maxValue };

    drawAxes(ctx, padding, width, height, maxValue);

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
        var x = getPointX(index, padding, width);
        var y = padding.top + height - (value / maxValue) * height;
        if (!hasPoint) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        hasPoint = true;
      });
      ctx.stroke();

      hours.forEach(function (row, index) {
        var value = getMetricValue(row, item.key);
        if (value == null) return;
        var x = getPointX(index, padding, width);
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
        });
      });
    }
  }

  function renderChartTooltip(event, canvas, tooltip) {
    if (!state.summary || !state.chartMeta) return;
    var traffic = state.summary.traffic || {};
    var hours = getTrafficRowsForCurrentPeriod();
    var visible = (traffic.series || []).filter(function (item) {
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
      '<strong>' + escapeHtml(String(index).padStart(2, '0') + ':00') + '</strong>',
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
        var x = getPointX(index, meta.padding, meta.width);
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
    if (badge) badge.hidden = canUseTrafficData();
    var text = [
      canUseTrafficData() ? '数据来源：' + (traffic.source || 'Nginx 日志摘要') : '数据来源：暂无真实 Nginx 日志摘要',
      '真实服务器日志路径：' + (traffic.nginxLogPaths || []).join(' / ')
    ].filter(Boolean).join('。');
    setText('trafficSource', text);
  }

  function renderTrafficSummary() {
    var root = document.getElementById('trafficSummary');
    if (!root || !state.summary) return;
    var metricKeys = Object.keys(seriesLabels);
    var hasData = canUseTrafficData();
    var todayRows = hasData
      ? getTrafficRowsForPeriod('today').filter(function (row) { return row && row.pv != null; })
      : [];
    var periods = [
      { label: '当日', status: hasData ? '真实日志' : '待接入真实日志', rows: todayRows, available: hasData },
      { label: '昨日', status: '待接入真实日志', rows: [], available: false },
      { label: '近 7 日', status: '待接入真实日志', rows: [], available: false },
      { label: '近 30 日', status: '待接入真实日志', rows: [], available: false }
    ];
    root.innerHTML = [
      '<div class="traffic-summary__head">',
      '<h3>数据汇总</h3>',
      '<p>当前未接入真实 Nginx 日志时，所有周期显示 “— / 待接入真实日志”。汇总表不受图例开关影响。</p>',
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
            return '<span>' + escapeHtml(period.available ? String(sumMetric(period.rows, key)) : '—') + '</span>';
          }).join(''),
          '<em data-state="' + (period.available ? 'ready' : 'pending') + '">' + escapeHtml(period.status) + '</em>',
          '</div>'
        ].join('');
      }).join(''),
      '</div>',
      '<p class="panel-hint">当前未接入真实服务器 Nginx 日志，访问趋势与汇总暂不可用于运营判断。真实日志接入后，需要区分全部访问、外部访客和内部测试。独立 IP 不等于真实人数。</p>'
    ].join('');
  }

  function sumMetric(rows, key) {
    return rows.reduce(function (sum, row) {
      var value = getMetricValue(row, key);
      return sum + (value == null ? 0 : value);
    }, 0);
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
    var traffic = state.summary && state.summary.traffic ? state.summary.traffic : {};
    var rows = traffic.hours || [];
    if (!canUseTrafficData()) return [];
    if (period !== 'today') return [];
    var currentHour = new Date().getHours();
    return rows.map(function (row, index) {
      if (index <= currentHour) return row;
      return createBlankTrafficRow(index);
    });
  }

  function createBlankTrafficRow(hour) {
    var row = { hour: hour };
    Object.keys(seriesLabels).forEach(function (key) {
      row[key] = null;
    });
    return row;
  }

  function getMetricValue(row, key) {
    if (!row || row[key] == null || row[key] === '') return null;
    var value = Number(row[key]);
    return Number.isFinite(value) ? value : null;
  }

  function rowHasAnyMetric(row) {
    return Object.keys(seriesLabels).some(function (key) {
      return getMetricValue(row, key) != null;
    });
  }

  function canUseTrafficData() {
    var traffic = state.summary && state.summary.traffic ? state.summary.traffic : {};
    if (!traffic.hours || !traffic.hours.length) return false;
    return traffic.isMock ? ENABLE_TRAFFIC_MOCK : true;
  }

  function getTrafficPeriodStatusText(period) {
    if (canUseTrafficData() && period === 'today') return '';
    return '尚未接入真实服务器 Nginx 日志，暂无可用于判断的' + getTrafficPeriodLabel(period) + '访问数据。';
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
    ctx.fillText('尚未接入真实服务器 Nginx 日志', padding.left + width / 2, padding.top + height / 2 - 8);
    ctx.fillStyle = '#65748b';
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText('暂无可用于运营判断的访问趋势数据', padding.left + width / 2, padding.top + height / 2 + 18);
    ctx.restore();
  }

  function getPointX(index, padding, width) {
    return padding.left + (index / 24) * width;
  }

  function resizeChartCanvas(canvas) {
    if (!canvas) return { cssWidth: 780, cssHeight: 340, dpr: 1 };
    var wrap = canvas.parentElement;
    var rect = wrap.getBoundingClientRect();
    var width = Math.max(780, Math.round(rect.width));
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
