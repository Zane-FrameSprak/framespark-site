(function () {
    'use strict';

    var API_URL = 'http://127.0.0.1:8787/api/diagnosis';

    var form = document.getElementById('diagnosisForm');
    var fileInput = document.getElementById('diagnosisFile');
    var fileName = document.getElementById('diagnosisFileName');
    var status = document.getElementById('diagnosisStatus');
    var result = document.getElementById('diagnosisResult');
    if (!form || !fileInput || !fileName || !status || !result) return;

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
            setStatus('诊断报告已生成，请查看右侧结果。', 'success');
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
        button.textContent = isLoading ? '诊断中...' : '开始诊断';
    }

    function setStatus(message, type) {
        status.textContent = message;
        status.dataset.state = type || '';
    }

    function renderReport(data) {
        var report = data.finalReport || {};
        var stats = data.stats || {};
        if (!data.finalReport) {
            renderError('未收到诊断报告，请稍后再试。');
            return;
        }

        result.innerHTML = [
            '<div class="diagnosis-result__head">',
            '<p class="subpage-kicker">DIAGNOSIS REPORT</p>',
            '<h2>帧火花剧本诊断报告</h2>',
            '<p>系统已根据材料完整度生成当前适合的诊断报告。</p>',
            '</div>',
            '<dl class="diagnosis-stats">',
            '<div><dt>诊断类型</dt><dd>' + escapeHtml(formatDiagnosisType(data.internalStage)) + '</dd></div>',
            '<div><dt>材料类型</dt><dd>' + escapeHtml(formatMaterialType(data.materialType)) + '</dd></div>',
            '<div><dt>字数</dt><dd>' + escapeHtml(String(stats.charCount || 0)) + '</dd></div>',
            '</dl>',
            renderSection('一句话结论', [report.summary]),
            renderSection('核心判断', [report.core]),
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

    function formatMaterialType(value) {
        var map = {
            short: '短片剧本',
            feature: '长片剧本',
            other: '创意材料'
        };
        return map[value] || value;
    }

    function formatDiagnosisType(value) {
        var map = {
            basic: '故事基础诊断',
            advanced: '剧本深化诊断'
        };
        return map[value] || '故事基础诊断';
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
