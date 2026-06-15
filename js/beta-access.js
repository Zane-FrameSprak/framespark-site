(function (root) {
    'use strict';

    var VERIFY_PATH = '/api/beta-access/verify';
    var BETA_PATH = '/diagnosis/beta/';
    var EMPTY_MESSAGE = '请输入你的邀请码/内测码';
    var INVALID_MESSAGE = '内测码无效或已失效';
    var UNAVAILABLE_MESSAGE = '暂时无法验证，请稍后重试';

    function createController(options) {
        var form = options.form;
        var input = options.input;
        var button = options.button;
        var status = options.status;
        var fetchImpl = options.fetchImpl;
        var navigate = options.navigate;
        var submitting = false;
        var navigating = false;

        function setStatus(message, state) {
            status.textContent = message || '';
            status.dataset.state = state || '';
        }

        function updateReadyState() {
            var ready = input.value.trim().length > 0;
            button.setAttribute('aria-disabled', ready ? 'false' : 'true');
            button.dataset.state = ready ? 'ready' : 'empty';
            return ready;
        }

        function setSubmitting(active) {
            submitting = active;
            form.setAttribute('aria-busy', active ? 'true' : 'false');
            input.readOnly = active;
            button.dataset.state = active ? 'submitting' : (input.value.trim() ? 'ready' : 'empty');
            button.textContent = active ? '验证中...' : '进入内测';
            if (!active) updateReadyState();
        }

        async function submit(event) {
            if (event && typeof event.preventDefault === 'function') event.preventDefault();
            if (submitting) return;

            var code = input.value.trim();
            if (!code) {
                updateReadyState();
                setStatus(EMPTY_MESSAGE, 'error');
                return;
            }

            setStatus('', '');
            setSubmitting(true);
            try {
                var response = await fetchImpl(VERIFY_PATH, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ code: code })
                });
                code = '';
                var payload = await response.json().catch(function () { return null; });
                var errorCode = payload && payload.error ? payload.error.code : '';
                var keys = payload && typeof payload === 'object' && !Array.isArray(payload)
                    ? Object.keys(payload).sort().join(',')
                    : '';

                if (response.status === 200 && keys === 'ok,redirectTo' && payload.ok === true && payload.redirectTo === BETA_PATH) {
                    input.value = '';
                    navigating = true;
                    button.dataset.state = 'navigating';
                    navigate(BETA_PATH);
                    return;
                }

                if ((response.status === 401 && errorCode === 'BETA_ACCESS_INVALID') ||
                    (response.status === 429 && errorCode === 'BETA_ACCESS_RATE_LIMITED')) {
                    setStatus(INVALID_MESSAGE, 'error');
                } else {
                    setStatus(UNAVAILABLE_MESSAGE, 'error');
                }
            } catch (error) {
                code = '';
                setStatus(UNAVAILABLE_MESSAGE, 'error');
            } finally {
                if (!navigating) setSubmitting(false);
            }
        }

        input.addEventListener('input', function () {
            if (submitting) return;
            updateReadyState();
            if (status.textContent) setStatus('', '');
        });
        form.addEventListener('submit', submit);
        updateReadyState();

        return {
            submit: submit,
            isSubmitting: function () { return submitting; },
            updateReadyState: updateReadyState
        };
    }

    function init(documentRef, windowRef) {
        var form = documentRef.getElementById('diagnosisBetaAccessForm');
        var input = documentRef.getElementById('diagnosisBetaCode');
        var button = form && form.querySelector('button[type="submit"]');
        var status = documentRef.getElementById('diagnosisBetaAccessStatus');
        if (!form || !input || !button || !status || typeof windowRef.fetch !== 'function') return null;

        var controller = createController({
            form: form,
            input: input,
            button: button,
            status: status,
            fetchImpl: windowRef.fetch.bind(windowRef),
            navigate: function (path) { windowRef.location.assign(path); }
        });

        function revealEntry() {
            windowRef.requestAnimationFrame(function () {
                var entry = documentRef.getElementById('diagnosis-beta-entry');
                if (entry && typeof entry.scrollIntoView === 'function') {
                    entry.scrollIntoView({ block: 'center' });
                }
            });
        }
        if (windowRef.location.hash === '#diagnosis-beta-entry' && typeof windowRef.requestAnimationFrame === 'function') {
            if (documentRef.readyState === 'complete') {
                revealEntry();
            } else {
                windowRef.addEventListener('load', function () {
                    windowRef.setTimeout(revealEntry, 0);
                }, { once: true });
            }
        }
        return controller;
    }

    root.FrameSparkBetaAccess = {
        createController: createController,
        init: init,
        constants: {
            verifyPath: VERIFY_PATH,
            betaPath: BETA_PATH
        }
    };

    if (root.document) init(root.document, root);
})(typeof window !== 'undefined' ? window : globalThis);
