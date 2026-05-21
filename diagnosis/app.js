(function () {
    'use strict';

    var API_URL = '/api/diagnosis';
    var FEEDBACK_URL = '/api/diagnosis-feedback';

    var form = document.getElementById('diagnosisForm');
    var fileInput = document.getElementById('diagnosisFile');
    var fileName = document.getElementById('diagnosisFileName');
    var textInput = document.getElementById('diagnosisText');
    var materialTypeDialog = document.getElementById('materialTypeDialog');
    var materialTypeConfirmButton = document.getElementById('materialTypeConfirmButton');
    var materialTypeCancelButton = document.getElementById('materialTypeCancelButton');
    var feedbackDialog = document.getElementById('feedbackDialog');
    var feedbackSubmitButton = document.getElementById('feedbackSubmitButton');
    var feedbackCancelButton = document.getElementById('feedbackCancelButton');
    var feedbackCommentInput = document.getElementById('feedbackComment');
    var feedbackAreasContainer = document.getElementById('feedbackAreas');
    var feedbackError = document.getElementById('feedbackError');
    var progressBox = document.getElementById('diagnosisProgress');
    var progressCurrent = document.getElementById('diagnosisProgressCurrent');
    var progressDetail = document.getElementById('diagnosisProgressDetail');
    var status = document.getElementById('diagnosisStatus');
    var result = document.getElementById('diagnosisResult');
    var currentReportMarkdown = '';
    var currentDiagnosisData = null;
    var progressTimers = [];
    var progressMessages = [
        '正在接收材料……',
        '正在解析文本内容……',
        '正在识别材料阶段……',
        '正在生成故事开发诊断……',
        '正在整理诊断报告……'
    ];

    if (!form || !fileInput || !fileName || !textInput || !materialTypeDialog || !materialTypeConfirmButton || !materialTypeCancelButton || !status || !result) return;

    fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0];
        fileName.textContent = file ? file.name : '未选择文件';
        if (file) {
            setStatus('已选择文件，将优先使用上传文件。', '');
        }
    });

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        submitDiagnosis();
    });

    materialTypeConfirmButton.addEventListener('click', function () {
        var selected = getDialogMaterialType();
        if (!selected) {
            setStatus('请先选择目标方向。', 'error');
            return;
        }
        form.elements.materialType.value = selected;
        hideMaterialTypeDialog();
        submitDiagnosis();
    });

    materialTypeCancelButton.addEventListener('click', function () {
        hideMaterialTypeDialog();
    });

    materialTypeDialog.addEventListener('click', function (event) {
        if (event.target === materialTypeDialog) {
            hideMaterialTypeDialog();
        }
    });

    if (feedbackDialog) {
        feedbackDialog.addEventListener('click', function (event) {
            if (event.target === feedbackDialog) {
                hideFeedbackDialog();
            }
        });
    }
    if (feedbackCancelButton) {
        feedbackCancelButton.addEventListener('click', hideFeedbackDialog);
    }
    if (feedbackSubmitButton) {
        feedbackSubmitButton.addEventListener('click', submitFeedback);
    }

    form.elements.materialType.value = '';

    async function submitDiagnosis() {
        var materialType = form.elements.materialType.value;
        var file = fileInput.files && fileInput.files[0];
        var pastedText = textInput.value.trim();
        var inputMode = file ? 'file_upload' : 'pasted_text';

        if (!file && !pastedText) {
            setStatus('请粘贴文本或上传 TXT / DOCX 文件。', 'error');
            return;
        }
        if (!materialType) {
            showMaterialTypeDialog();
            return;
        }

        var formData = new FormData();
        formData.append('materialType', materialType);
        formData.append('inputMode', inputMode);
        if (inputMode === 'file_upload') {
            formData.append('file', file);
        } else {
            formData.append('text', pastedText);
        }
        setLoading(true);
        startProgress(inputMode);
        setStatus('', 'loading');

        try {
            var response = await fetch(API_URL, {
                method: 'POST',
                body: formData
            });

            var data = await response.json();
            if (!response.ok || !data.ok) {
                throw new Error(data && data.error && data.error.message ? data.error.message : '诊断失败，请稍后再试。');
            }

            completeProgress();
            currentDiagnosisData = data;
            renderReport(data);
            setStatus('诊断完成，请查看右侧结果。', 'success');
        } catch (err) {
            failProgress();
            currentDiagnosisData = null;
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

    function clearProgressTimers() {
        progressTimers.forEach(function (id) { window.clearTimeout(id); });
        progressTimers = [];
    }

    function setProgressMessage(index) {
        if (!progressCurrent) return;
        progressCurrent.textContent = progressMessages[index] || progressMessages[0];
    }

    function startProgress(inputMode) {
        if (!progressBox) return;
        clearProgressTimers();
        progressBox.hidden = false;
        progressBox.dataset.state = 'running';
        if (progressCurrent) {
            progressCurrent.textContent = inputMode === 'file_upload' ? '正在上传并处理文件……' : '正在提交并处理文本……';
        }
        if (progressDetail) {
            progressDetail.textContent = '系统正在识别材料阶段并生成适合当前材料的诊断报告，请稍候。';
        }
        progressTimers.push(window.setTimeout(function () { setProgressMessage(inputMode === 'file_upload' ? 0 : 1); }, 700));
        progressTimers.push(window.setTimeout(function () { setProgressMessage(2); }, 1800));
        progressTimers.push(window.setTimeout(function () { setProgressMessage(3); }, 4200));
        progressTimers.push(window.setTimeout(function () { setProgressMessage(4); }, 7600));
    }

    function completeProgress() {
        if (!progressBox) return;
        clearProgressTimers();
        setProgressMessage(4);
        if (progressDetail) {
            progressDetail.textContent = '诊断完成，请查看报告。';
        }
        progressBox.dataset.state = 'success';
        progressTimers.push(window.setTimeout(function () {
            progressBox.hidden = true;
            progressBox.dataset.state = '';
        }, 900));
    }

    function failProgress() {
        if (!progressBox) return;
        clearProgressTimers();
        progressBox.dataset.state = 'error';
        if (progressCurrent) progressCurrent.textContent = '诊断未完成';
        if (progressDetail) progressDetail.textContent = '请根据页面提示检查材料后重试。';
    }

    function setStatus(message, type) {
        status.textContent = message;
        status.dataset.state = type || '';
    }

    function showMaterialTypeDialog() {
        var current = form.elements.materialType.value;
        var dialogOption = materialTypeDialog.querySelector('input[name="materialTypeConfirm"][value="' + current + '"]');
        if (dialogOption) dialogOption.checked = true;
        materialTypeDialog.hidden = false;
        setStatus('请先选择目标方向。', 'error');
    }

    function hideMaterialTypeDialog() {
        materialTypeDialog.hidden = true;
    }

    function getDialogMaterialType() {
        var checked = materialTypeDialog.querySelector('input[name="materialTypeConfirm"]:checked');
        return checked ? checked.value : '';
    }

    function showFeedbackDialog() {
        if (!feedbackDialog) return;
        resetFeedbackForm();
        feedbackDialog.hidden = false;
        setFeedbackError('', '');
    }

    function hideFeedbackDialog() {
        if (!feedbackDialog) return;
        feedbackDialog.hidden = true;
    }

    function resetFeedbackForm() {
        if (feedbackAreasContainer) {
            feedbackAreasContainer.querySelectorAll('input[type="checkbox"]').forEach(function (input) {
                input.checked = false;
            });
        }
        if (feedbackCommentInput) feedbackCommentInput.value = '';
        if (feedbackSubmitButton) {
            feedbackSubmitButton.disabled = false;
            feedbackSubmitButton.textContent = '提交反馈';
        }
    }

    function setFeedbackError(message, type) {
        if (!feedbackError) return;
        feedbackError.textContent = message || '';
        feedbackError.dataset.state = type || '';
    }

    function getSelectedFeedbackAreas() {
        if (!feedbackAreasContainer) return [];
        var nodes = feedbackAreasContainer.querySelectorAll('input[type="checkbox"]:checked');
        return Array.prototype.map.call(nodes, function (n) { return n.value; });
    }

    async function submitFeedback() {
        if (!currentDiagnosisData) {
            setFeedbackError('当前没有可反馈的诊断结果。', 'error');
            return;
        }
        var areas = getSelectedFeedbackAreas();
        var comment = feedbackCommentInput ? feedbackCommentInput.value.trim() : '';
        if (areas.length === 0 && !comment) {
            setFeedbackError('请至少勾选一项或填写补充说明。', 'error');
            return;
        }

        var routing = currentDiagnosisData.materialRouting || null;
        var finalReport = currentDiagnosisData.finalReport || {};
        var payload = {
            diagnosisId: currentDiagnosisData.diagnosisId || '',
            feedbackType: 'understanding_wrong',
            areas: areas,
            comment: comment,
            materialRouting: routing ? {
                userSelectedType: routing.userSelectedType,
                targetFormat: routing.targetFormat,
                materialForm: routing.materialForm,
                effectiveDiagnosisType: routing.effectiveDiagnosisType,
                classificationSource: routing.classificationSource,
                notice: routing.notice
            } : null,
            reportSummary: String(finalReport.summary || '').slice(0, 600),
            reportNextStep: String(finalReport.nextStep || '').slice(0, 400)
        };

        if (feedbackSubmitButton) {
            feedbackSubmitButton.disabled = true;
            feedbackSubmitButton.textContent = '提交中...';
        }
        setFeedbackError('', '');

        try {
            var response = await fetch(FEEDBACK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            var data = await response.json().catch(function () { return null; });
            if (!response.ok || !data || !data.ok) {
                var msg = data && data.error && data.error.message ? data.error.message : '反馈提交失败，请稍后再试。';
                throw new Error(msg);
            }
            showReportFeedback('已收到反馈，谢谢。', 'success');
            hideFeedbackDialog();
        } catch (err) {
            setFeedbackError(err.message || '反馈提交失败，请稍后再试。', 'error');
            if (feedbackSubmitButton) {
                feedbackSubmitButton.disabled = false;
                feedbackSubmitButton.textContent = '提交反馈';
            }
        }
    }

    function renderReport(data) {
        var report = data.finalReport || {};
        var stats = data.stats || {};
        if (!data.finalReport) {
            renderError('未收到诊断报告，请稍后再试。');
            return;
        }
        var materialInfo = buildMaterialInfo(data);
        currentReportMarkdown = buildReportMarkdown(report, materialInfo, stats);

        result.innerHTML = [
            '<div class="diagnosis-result__head">',
            '<p class="subpage-kicker">DIAGNOSIS REPORT</p>',
            '<h2>帧火花故事开发诊断报告</h2>',
            '<p>系统已根据材料形态生成当前适合的诊断报告。</p>',
            '</div>',
            renderUnderstandingZone(materialInfo, stats),
            '<div class="diagnosis-report-actions">',
            '<button type="button" data-report-action="copy">复制报告</button>',
            '<button type="button" data-report-action="download">导出 Markdown</button>',
            '<span class="diagnosis-report-feedback" id="diagnosisReportFeedback" aria-live="polite"></span>',
            '</div>',
            renderSection('一句话结论', [report.summary]),
            renderSection('核心判断', [report.core]),
            renderSection('主要亮点', report.strengths),
            renderSection('主要问题', report.problems),
            renderSection('修改建议', report.suggestions),
            renderSection('下一步判断', [report.nextStep])
        ].join('');
    }

    function renderUnderstandingZone(materialInfo, stats) {
        var rows = [
            ['目标方向', materialInfo.targetFormat],
            ['材料形态', materialInfo.materialForm],
            ['诊断方式', materialInfo.diagnosisMethod],
            ['字数', String(stats.charCount || 0)]
        ];
        var notice = materialInfo.notice || '系统已根据材料形态选择当前适合的诊断方式。';

        var rowsHtml = rows.map(function (row) {
            return '<div><span>' + escapeHtml(row[0]) + '</span><strong>' + escapeHtml(String(row[1] || '—')) + '</strong></div>';
        }).join('');

        return [
            '<section class="diagnosis-understanding" aria-label="系统理解">',
            '<header class="diagnosis-understanding__head">',
            '<p class="subpage-kicker">SYSTEM UNDERSTANDING</p>',
            '<h3>系统理解</h3>',
            '</header>',
            '<p class="diagnosis-understanding__intro">以下是系统对你本次提交材料的理解。若有误，可反馈用于改进。</p>',
            '<div class="diagnosis-understanding__grid">',
            rowsHtml,
            '</div>',
            '<p class="diagnosis-understanding__notice"><span>材料识别说明</span>' + escapeHtml(notice) + '</p>',
            '<div class="diagnosis-understanding__feedback">',
            '<p>系统理解是否准确？</p>',
            '<div class="diagnosis-understanding__feedback-actions">',
            '<button type="button" data-action="confirm-understanding">准确</button>',
            '<button type="button" data-action="open-feedback">有误</button>',
            '</div>',
            '<span id="diagnosisUnderstandingFeedback" aria-live="polite"></span>',
            '</div>',
            '</section>'
        ].join('');
    }

    function setUnderstandingFeedback(message) {
        var node = document.getElementById('diagnosisUnderstandingFeedback');
        if (!node) return;
        node.textContent = message || '';
        window.clearTimeout(setUnderstandingFeedback.timer);
        setUnderstandingFeedback.timer = window.setTimeout(function () {
            node.textContent = '';
        }, 2200);
    }

    function renderError(message) {
        currentReportMarkdown = '';
        currentDiagnosisData = null;
        result.innerHTML = [
            '<div class="diagnosis-result__empty diagnosis-result__empty--error">',
            '<p class="subpage-kicker">ERROR</p>',
            '<h2>无法生成报告</h2>',
            '<p>' + escapeHtml(message || '诊断失败，请稍后再试。') + '</p>',
            '</div>'
        ].join('');
    }

    result.addEventListener('click', function (event) {
        var openFeedbackButton = event.target.closest('[data-action="open-feedback"]');
        if (openFeedbackButton) {
            showFeedbackDialog();
            return;
        }
        var confirmButton = event.target.closest('[data-action="confirm-understanding"]');
        if (confirmButton) {
            setUnderstandingFeedback('感谢确认。');
            return;
        }
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
            showReportFeedback('报告已复制。', 'success');
        } catch (err) {
            setStatus('复制失败，请手动选择报告内容。', 'error');
            showReportFeedback('复制失败，请手动选择报告内容。', 'error');
        }
    }

    function showReportFeedback(message, type) {
        var feedback = document.getElementById('diagnosisReportFeedback');
        if (!feedback) return;

        feedback.textContent = message;
        feedback.dataset.state = type || '';
        window.clearTimeout(showReportFeedback.timer);
        showReportFeedback.timer = window.setTimeout(function () {
            feedback.textContent = '';
            feedback.dataset.state = '';
        }, 2800);
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

    function buildReportMarkdown(report, materialInfo, stats) {
        var lines = [
            '# 帧火花故事开发诊断报告',
            '',
            '## 系统理解',
            '',
            '- 目标方向：' + materialInfo.targetFormat,
            '- 材料形态：' + materialInfo.materialForm,
            '- 诊断方式：' + materialInfo.diagnosisMethod,
            '- 材料识别说明：' + (materialInfo.notice || '系统已根据材料形态选择当前适合的诊断方式。'),
            '- 字数：' + String(stats.charCount || 0),
            ''
        ];

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

    function buildMaterialInfo(data) {
        var routing = data.materialRouting;
        if (!routing) {
            return {
                targetFormat: formatTargetFormat((data.userSelectedType === 'short' || data.userSelectedType === 'feature') ? data.userSelectedType : 'unknown'),
                materialForm: formatMaterialForm('unknown'),
                diagnosisMethod: formatDiagnosisMethod(data.materialType),
                notice: ''
            };
        }

        var targetFormat = routing.targetFormat;
        if (targetFormat === 'unknown' && routing.userSelectedType === 'other') {
            targetFormat = 'other';
        }

        return {
            targetFormat: formatTargetFormat(targetFormat),
            materialForm: formatMaterialForm(routing.materialForm),
            diagnosisMethod: formatDiagnosisMethod(routing.effectiveDiagnosisType || data.materialType),
            notice: formatUserVisibleEnums(formatRoutingNotice(routing))
        };
    }

    function formatTargetFormat(value) {
        var map = {
            short: '短片',
            feature: '长片',
            other: '其他 / 不确定',
            unknown: '未明确'
        };
        return map[value] || '未明确';
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
            unknown: '未明确形态的创意材料'
        };
        return map[value] || '未明确形态的创意材料';
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
        if (!routing) return '';
        if (routing.notice) return routing.notice;
        return '系统已根据材料形态选择当前适合的诊断方式。';
    }

    function formatUserVisibleEnums(value) {
        var text = String(value || '');
        var enumMap = {
            character_bio: '人物小传',
            worldbuilding: '世界观设定',
            full_script: '完整剧本',
            synopsis: '梗概',
            concept: '故事概念',
            outline: '大纲',
            fragment: '片段文本',
            feature: '长片',
            short: '短片',
            other: '其他 / 不确定',
            unknown: '未明确形态的创意材料'
        };
        Object.keys(enumMap).forEach(function (key) {
            text = text.replace(new RegExp('\\b' + key + '\\b', 'g'), enumMap[key]);
        });
        return text;
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
