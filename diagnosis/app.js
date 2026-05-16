(function () {
    'use strict';

    var API_URL = 'http://127.0.0.1:8787/api/diagnosis';

    var form = document.getElementById('diagnosisForm');
    var fileInput = document.getElementById('diagnosisFile');
    var fileName = document.getElementById('diagnosisFileName');
    var status = document.getElementById('diagnosisStatus');
    var result = document.getElementById('diagnosisResult');
    var materialTypeSelect = document.getElementById('materialType');
    var durationField = document.getElementById('durationField');

    if (!form || !fileInput || !fileName || !status || !result) return;

    // 选完整剧本时显示时长选项，选简单材料时隐藏
    if (materialTypeSelect && durationField) {
        materialTypeSelect.addEventListener('change', function () {
            durationField.style.display = materialTypeSelect.value === 'full' ? '' : 'none';
        });
    }

    fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0];
        fileName.textContent = file ? file.name : '未选择文件';
    });

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        submitDiagnosis();
    });

    async function submitDiagnosis() {
        var file = fileInput.files && fileInput.files[0];
        if (!file) {
            setStatus('请先选择一个 .txt 或 .docx 文件。', 'error');
            return;
        }

        var formData = new FormData(form);
        setLoading(true);
        setStatus('正在上传并解析材料...', 'loading');

        try {
            var response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });

            var data = await response.json();
            if (!response.ok || !data.ok) {
                throw new Error(data && data.error && data.error.message ? data.error.message : '诊断失败，请稍后再试。');
            }

            renderReport(data);
            setStatus('mock 诊断报告已生成。', 'success');
        } catch (err) {
            renderError(err.message);
            setStatus(err.message, 'error');
        } finally {
            setLoading(false);
        }
    }

    function setLoading(isLoading) {
        var button = form.querySelector('button[type="submit"]');
        if (!button) return;

        button.disabled = isLoading;
        button.textContent = isLoading ? '诊断中...' : '开始测试诊断';
    }

    function setStatus(message, type) {
        status.textContent = message;
        status.dataset.state = type || '';
    }

    function renderReport(data) {
        var report = data.report || {};
        var stats = data.stats || {};
        result.innerHTML = [
            '<div class="diagnosis-result__head">',
            '<p class="subpage-kicker">' + escapeHtml(data.mode === 'ai' ? 'AI REPORT' : 'MOCK REPORT') + '</p>',
            '<h2>基础诊断报告</h2>',
            '<p>' + escapeHtml(report.summary || '已生成报告。') + '</p>',
            '</div>',
            '<dl class="diagnosis-stats">',
            '<div><dt>材料类型</dt><dd>' + escapeHtml(data.materialType === 'full' ? '完整剧本' : '简单材料') + '</dd></div>',
            data.scriptDuration ? '<div><dt>预计时长</dt><dd>' + escapeHtml(formatDuration(data.scriptDuration)) + '</dd></div>' : '',
            '<div><dt>字数</dt><dd>' + escapeHtml(String(stats.charCount || 0)) + '</dd></div>',
            '<div><dt>行数</dt><dd>' + escapeHtml(String(stats.lineCount || 0)) + '</dd></div>',
            '</dl>',
            renderSection('故事核心', [report.core]),
            renderSection('主要亮点', report.strengths),
            renderSection('主要问题', report.problems),
            renderSection('修改建议', report.suggestions),
            renderSection('下一步判断', [report.nextStep])
        ].join('');
    }

    function renderError(message) {
        result.innerHTML = [
            '<div class="diagnosis-result__empty diagnosis-result__empty--error">',
            '<p class="subpage-kicker">ERROR</p>',
            '<h2>无法生成报告</h2>',
            '<p>' + escapeHtml(message || '诊断失败，请稍后再试。') + '</p>',
            '</div>'
        ].join('');
    }

    function renderSection(title, items) {
        var safeItems = (items || []).filter(Boolean);
        if (!safeItems.length) return '';

        return [
            '<section class="diagnosis-report-section">',
            '<h3>' + escapeHtml(title) + '</h3>',
            '<ul>',
            safeItems.map(function (item) {
                return '<li>' + escapeHtml(item) + '</li>';
            }).join(''),
            '</ul>',
            '</section>'
        ].join('');
    }

    function formatDuration(value) {
        var map = {
            short: '短片（30分钟以内）',
            mid: '网络电影（60–90分钟）',
            feature: '长片（90分钟以上）',
            episode: '剧集单集'
        };
        return map[value] || value;
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
})();
