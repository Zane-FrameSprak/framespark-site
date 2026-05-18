(function () {
    'use strict';

    var API_URL = 'http://127.0.0.1:8787/api/diagnosis';

    var form = document.getElementById('diagnosisForm');
    var fileInput = document.getElementById('diagnosisFile');
    var fileName = document.getElementById('diagnosisFileName');
    var status = document.getElementById('diagnosisStatus');
    var result = document.getElementById('diagnosisResult');
    var currentReportMarkdown = '';
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
        var diagnosisType = formatDiagnosisType(data.internalStage);
        var materialInfo = buildMaterialInfo(data);
        currentReportMarkdown = buildReportMarkdown(report, diagnosisType, materialInfo);

        result.innerHTML = [
            '<div class="diagnosis-result__head">',
            '<p class="subpage-kicker">DIAGNOSIS REPORT</p>',
            '<h2>帧火花剧本诊断报告</h2>',
            '<p>系统已根据材料完整度生成当前适合的诊断报告。</p>',
            materialInfo.notice ? '<p>' + escapeHtml(materialInfo.notice) + '</p>' : '',
            '</div>',
            '<div class="diagnosis-report-actions">',
            '<button type="button" data-report-action="copy">复制报告</button>',
            '<button type="button" data-report-action="download">导出 Markdown</button>',
            '</div>',
            '<dl class="diagnosis-stats">',
            '<div><dt>诊断类型</dt><dd>' + escapeHtml(diagnosisType) + '</dd></div>',
            renderMaterialStats(materialInfo),
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
        currentReportMarkdown = '';
        result.innerHTML = [
            '<div class="diagnosis-result__empty diagnosis-result__empty--error">',
            '<p class="subpage-kicker">ERROR</p>',
            '<h2>无法生成报告</h2>',
            '<p>' + escapeHtml(message || '诊断失败，请稍后再试。') + '</p>',
            '</div>'
        ].join('');
    }

    result.addEventListener('click', function (event) {
        var button = event.target.closest('[data-report-action]');
        if (!button || !currentReportMarkdown) return;

        if (button.dataset.reportAction === 'copy') {
            copyReport();
        } else if (button.dataset.reportAction === 'download') {
            downloadMarkdown();
        }
    });

    async function copyReport() {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(currentReportMarkdown);
            } else {
                fallbackCopyText(currentReportMarkdown);
            }
            setStatus('报告已复制。', 'success');
        } catch (err) {
            setStatus('复制失败，请手动选择报告内容。', 'error');
        }
    }

    function fallbackCopyText(text) {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.inset = '-9999px auto auto -9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
    }

    function downloadMarkdown() {
        var blob = new Blob([currentReportMarkdown], { type: 'text/markdown;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'framespark-diagnosis-report.md';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function buildReportMarkdown(report, diagnosisType, materialInfo) {
        var lines = [
            '# 帧火花剧本诊断报告',
            '',
            '诊断类型：' + diagnosisType,
            materialInfo.hasRouting ? '目标方向：' + materialInfo.targetFormat : '材料类型：' + materialInfo.legacyMaterialType,
            materialInfo.hasRouting ? '材料形态：' + materialInfo.materialForm : '',
            materialInfo.hasRouting ? '诊断方式：' + materialInfo.diagnosisMethod : '',
            materialInfo.notice ? '材料识别：' + materialInfo.notice : '',
            ''
        ].filter(function (line) {
            return line !== '';
        });
        lines.push('');

        addTextSection(lines, '一句话结论', report.summary);
        addTextSection(lines, '核心判断', report.core);
        addListSection(lines, '主要亮点', report.strengths);
        addListSection(lines, '主要问题', report.problems);
        addListSection(lines, '修改建议', report.suggestions);
        addTextSection(lines, '下一步判断', report.nextStep);

        return lines.join('\n').trim() + '\n';
    }

    function addTextSection(lines, title, value) {
        var text = String(value || '').trim();
        if (!text) return;
        lines.push('## ' + title, text, '');
    }

    function addListSection(lines, title, items) {
        var safeItems = (items || []).map(function (item) {
            return String(item || '').trim();
        }).filter(Boolean);
        if (!safeItems.length) return;
        lines.push('## ' + title);
        safeItems.forEach(function (item) {
            lines.push('- ' + item);
        });
        lines.push('');
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

    function renderMaterialStats(materialInfo) {
        if (!materialInfo.hasRouting) {
            return '<div><dt>材料类型</dt><dd>' + escapeHtml(materialInfo.legacyMaterialType) + '</dd></div>';
        }

        return [
            '<div><dt>目标方向</dt><dd>' + escapeHtml(materialInfo.targetFormat) + '</dd></div>',
            '<div><dt>材料形态</dt><dd>' + escapeHtml(materialInfo.materialForm) + '</dd></div>',
            '<div><dt>诊断方式</dt><dd>' + escapeHtml(materialInfo.diagnosisMethod) + '</dd></div>'
        ].join('');
    }

    function buildMaterialInfo(data) {
        var routing = data.materialRouting;
        if (!routing) {
            return {
                hasRouting: false,
                legacyMaterialType: formatMaterialType(data.materialType),
                notice: ''
            };
        }

        return {
            hasRouting: true,
            targetFormat: formatTargetFormat(routing.targetFormat),
            materialForm: formatMaterialForm(routing.materialForm),
            diagnosisMethod: formatDiagnosisMethod(routing.effectiveDiagnosisType || data.materialType),
            notice: formatRoutingNotice(routing)
        };
    }

    function formatMaterialType(value) {
        var map = {
            short: '短片剧本',
            feature: '长片剧本',
            other: '创意材料'
        };
        return map[value] || value;
    }

    function formatTargetFormat(value) {
        var map = {
            short: '短片',
            feature: '长片',
            unknown: '未确定'
        };
        return map[value] || '未确定';
    }

    function formatMaterialForm(value) {
        var map = {
            full_script: '完整剧本',
            outline: '大纲',
            synopsis: '梗概',
            concept: '故事概念',
            character_bio: '人物小传',
            worldbuilding: '世界观设定',
            fragment: '片段文本',
            unknown: '未确定'
        };
        return map[value] || '未确定';
    }

    function formatDiagnosisMethod(value) {
        var map = {
            short: '短片剧本诊断',
            feature: '长片剧本诊断',
            other: '创意材料诊断'
        };
        return map[value] || '创意材料诊断';
    }

    function formatRoutingNotice(routing) {
        if (!routing.notice) return '';

        var target = formatTargetFormat(routing.targetFormat);
        var form = formatMaterialForm(routing.materialForm);
        var method = formatDiagnosisMethod(routing.effectiveDiagnosisType);

        if (routing.effectiveDiagnosisType === 'other' && routing.materialForm !== 'unknown') {
            return '你上传的内容更接近' + target + '方向的' + form + '，本次将按' + method.replace('诊断', '') + '进行诊断。';
        }

        return '系统已根据材料形态选择当前适合的诊断方式。';
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
