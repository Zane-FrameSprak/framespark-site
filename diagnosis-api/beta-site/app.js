(function () {
    'use strict';

    var form = document.getElementById('diagnosisBetaForm');
    var fileInput = document.getElementById('diagnosisBetaFile');
    var fileName = document.getElementById('diagnosisBetaFileName');
    var textInput = document.getElementById('diagnosisBetaText');
    var consent = document.getElementById('diagnosisBetaConsent');
    var progress = document.getElementById('diagnosisBetaProgress');
    var status = document.getElementById('diagnosisBetaStatus');
    var result = document.getElementById('diagnosisBetaResult');

    if (!form || !fileInput || !textInput || !consent || !status || !result) return;

    fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0];
        fileName.textContent = file ? file.name : '未选择文件';
    });

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        var file = fileInput.files && fileInput.files[0];
        var text = textInput.value.trim();
        if (!file && !text) {
            setStatus('请粘贴文本或选择 TXT / DOCX 文件。', 'error');
            return;
        }
        if (!consent.checked) {
            setStatus('请先确认提交授权与 AI 处理说明。', 'error');
            return;
        }

        var data = new FormData();
        data.append('materialType', form.elements.materialType.value);
        data.append('inputMode', file ? 'file_upload' : 'pasted_text');
        data.append('reviewConsent', 'false');
        if (file) data.append('file', file);
        else data.append('text', text);

        setLoading(true);
        try {
            var response = await fetch('/api/diagnosis/', {
                method: 'POST',
                credentials: 'same-origin',
                body: data
            });
            var payload = await response.json().catch(function () { return null; });
            if (!response.ok || !payload || !payload.ok) {
                throw new Error(payload && payload.error && payload.error.message
                    ? payload.error.message
                    : '诊断未完成，请稍后再试。');
            }
            renderResult(payload);
            setStatus('诊断完成。AI 结果仅供创作参考。', 'success');
        } catch (error) {
            var failureMessage = error.message || '诊断未完成。';
            renderError(failureMessage);
            setStatus(failureMessage + ' 请勿立即重复提交，请记录发生时间并联系内测人员。', 'error');
        } finally {
            setLoading(false);
        }
    });

    function renderResult(payload) {
        var report = payload.result || {};
        var stage = report.currentStage || {};
        var diagnosisId = payload.diagnosisId
            ? '<p class="diagnosis-beta-id">诊断编号：' + escapeHtml(payload.diagnosisId) + '</p>'
            : '';
        result.innerHTML = [
            '<div class="diagnosis-result__head">',
            '<p class="subpage-kicker">BETA REPORT</p>',
            '<h2>' + escapeHtml(stage.label || '当前诊断') + '</h2>',
            '<p>' + escapeHtml(stage.summary || '') + '</p>',
            diagnosisId,
            '</div>',
            renderIssues(report.coreIssues),
            renderList('修改方向', report.revisionDirections),
            renderList('需要补充的材料', report.missingMaterials),
            renderList('材料已有基础', report.strengths),
            renderNextStep(report.nextStep)
        ].join('');
    }

    function renderIssues(items) {
        var safe = Array.isArray(items) ? items : [];
        if (!safe.length) return '';
        return '<section class="diagnosis-report-section"><h3>核心问题</h3>' + safe.map(function (item) {
            var evidence = Array.isArray(item.evidence) && item.evidence.length
                ? '<p><strong>材料依据：</strong>' + escapeHtml(item.evidence.join(' / ')) + '</p>'
                : '';
            var impact = item.impact ? '<p><strong>影响：</strong>' + escapeHtml(item.impact) + '</p>' : '';
            return '<article class="diagnosis-beta-issue"><h4>' + escapeHtml(item.title || '') + '</h4>' + evidence + impact + '</article>';
        }).join('') + '</section>';
    }

    function renderList(title, items) {
        var safe = (Array.isArray(items) ? items : []).filter(Boolean);
        if (!safe.length) return '';
        return '<section class="diagnosis-report-section"><h3>' + escapeHtml(title) + '</h3><ul>' + safe.map(function (item) {
            return '<li>' + escapeHtml(item) + '</li>';
        }).join('') + '</ul></section>';
    }

    function renderNextStep(nextStep) {
        if (!nextStep || !nextStep.detail) return '';
        return '<section class="diagnosis-report-section"><h3>' + escapeHtml(nextStep.label || '下一步') + '</h3><p>' + escapeHtml(nextStep.detail) + '</p></section>';
    }

    function renderError(message) {
        result.innerHTML = '<div class="diagnosis-result__empty diagnosis-result__empty--error"><p class="subpage-kicker">NOT COMPLETED</p><h2>本次未生成报告</h2><p>' + escapeHtml(message || '诊断未完成。') + '</p><p>请勿立即重复提交，请记录发生时间和页面提示并联系内测人员。</p></div>';
    }

    function setLoading(loading) {
        var button = form.querySelector('button[type="submit"]');
        button.disabled = loading;
        button.textContent = loading ? '诊断处理中...' : '开始内测诊断';
        progress.hidden = !loading;
        if (loading) {
            status.textContent = '';
            status.dataset.state = 'loading';
        }
    }

    function setStatus(message, state) {
        status.textContent = message || '';
        status.dataset.state = state || '';
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
})();
