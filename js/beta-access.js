(function (root) {
    'use strict';

    var PUBLIC_SESSION_PATH = '/api/beta-access/public-session';
    var BETA_PATH = '/diagnosis/beta/';
    var RATE_LIMIT_MESSAGE = '今日公测名额已满，请明天再试';
    var UNAVAILABLE_MESSAGE = '暂时无法验证，请稍后重试';

    function createController(options) {
        var form = options.form;
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
            button.setAttribute('aria-disabled', 'false');
            button.dataset.state = 'ready';
            return true;
        }

        function setSubmitting(active) {
            submitting = active;
            form.setAttribute('aria-busy', active ? 'true' : 'false');
            button.dataset.state = active ? 'submitting' : 'ready';
            button.textContent = active ? '进入中...' : '进入公测';
            if (!active) updateReadyState();
        }

        async function submit(event) {
            if (event && typeof event.preventDefault === 'function') event.preventDefault();
            if (submitting) return;

            setStatus('', '');
            setSubmitting(true);
            try {
                var response = await fetchImpl(PUBLIC_SESSION_PATH, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: '{}'
                });
                var payload = await response.json().catch(function () { return null; });
                var errorCode = payload && payload.error ? payload.error.code : '';
                var keys = payload && typeof payload === 'object' && !Array.isArray(payload)
                    ? Object.keys(payload).sort().join(',')
                    : '';

                if (response.status === 200 && keys === 'ok,redirectTo' && payload.ok === true && payload.redirectTo === BETA_PATH) {
                    navigating = true;
                    button.dataset.state = 'navigating';
                    navigate(BETA_PATH);
                    return;
                }

                if (response.status === 429 && errorCode === 'BETA_ACCESS_RATE_LIMITED') {
                    setStatus(RATE_LIMIT_MESSAGE, 'error');
                } else {
                    setStatus(UNAVAILABLE_MESSAGE, 'error');
                }
            } catch (error) {
                setStatus(UNAVAILABLE_MESSAGE, 'error');
            } finally {
                if (!navigating) setSubmitting(false);
            }
        }

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
        var button = form && form.querySelector('button[type="submit"]');
        var status = documentRef.getElementById('diagnosisBetaAccessStatus');
        if (!form || !button || !status || typeof windowRef.fetch !== 'function') return null;

        var controller = createController({
            form: form,
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
            publicSessionPath: PUBLIC_SESSION_PATH,
            betaPath: BETA_PATH
        }
    };

    if (root.document) init(root.document, root);
})(typeof window !== 'undefined' ? window : globalThis);
