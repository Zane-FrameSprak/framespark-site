(function () {
    'use strict';

    if (window.FRAMESPARK_ANALYTICS_DISABLED === true) {
        return;
    }

    var VISITOR_KEY = 'fs_visitor_id';
    var SESSION_KEY = 'fs_session_id';
    var DEFAULT_ENDPOINT = '/api/analytics/event';
    var endpoint = window.FRAMESPARK_ANALYTICS_ENDPOINT || DEFAULT_ENDPOINT;
    var pageViewSent = false;

    function safeRun(fn) {
        try {
            return fn();
        } catch (error) {
            return null;
        }
    }

    function getStorageValue(storage, key) {
        return safeRun(function () {
            return storage.getItem(key);
        }) || '';
    }

    function setStorageValue(storage, key, value) {
        safeRun(function () {
            storage.setItem(key, value);
        });
    }

    function randomId(prefix) {
        var random = '';
        if (window.crypto && window.crypto.getRandomValues) {
            var bytes = new Uint8Array(16);
            window.crypto.getRandomValues(bytes);
            for (var i = 0; i < bytes.length; i += 1) {
                random += bytes[i].toString(16).padStart(2, '0');
            }
        } else {
            random = String(Date.now()) + Math.random().toString(16).slice(2);
        }
        return prefix + '_' + random;
    }

    function getVisitorId() {
        var existing = getStorageValue(window.localStorage, VISITOR_KEY);
        if (existing) return existing;
        var value = randomId('fs_visitor');
        setStorageValue(window.localStorage, VISITOR_KEY, value);
        return value;
    }

    function getSessionId() {
        var existing = getStorageValue(window.sessionStorage, SESSION_KEY);
        if (existing) return existing;
        var value = randomId('fs_session');
        setStorageValue(window.sessionStorage, SESSION_KEY, value);
        return value;
    }

    function getPageType(pathname) {
        var path = pathname || '/';
        if (path === '/' || path === '/index.html') return 'home';
        if (path.indexOf('/diagnosis/') === 0 || path === '/diagnosis') return 'diagnosis';
        if (path.indexOf('/talent/') === 0 || path === '/talent') return 'talent';
        if (path.indexOf('/projects/') === 0) return 'project';
        if (path.indexOf('/legal/') === 0) return 'legal';
        if (path === '/404.html') return 'error';
        return 'other';
    }

    function createEventId() {
        return randomId('fs_event');
    }

    function hashUserAgent() {
        var userAgent = window.navigator && window.navigator.userAgent ? window.navigator.userAgent : '';
        if (!userAgent) return Promise.resolve('');
        if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) {
            return Promise.resolve('');
        }
        return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(userAgent))
            .then(function (buffer) {
                var bytes = Array.prototype.slice.call(new Uint8Array(buffer));
                return bytes.map(function (byte) {
                    return byte.toString(16).padStart(2, '0');
                }).join('').slice(0, 32);
            })
            .catch(function () {
                return '';
            });
    }

    function buildPayload(eventType, targetId) {
        return hashUserAgent().then(function (userAgentHash) {
            return {
                eventId: createEventId(),
                visitorId: getVisitorId(),
                sessionId: getSessionId(),
                eventType: eventType,
                path: window.location.pathname || '/',
                pageType: getPageType(window.location.pathname || '/'),
                targetId: targetId || '',
                timestamp: new Date().toISOString(),
                referrer: document.referrer || '',
                userAgentHash: userAgentHash,
                screen: getScreenSize(),
                language: (window.navigator && window.navigator.language) || ''
            };
        });
    }

    function getScreenSize() {
        if (!window.screen) return '';
        return String(window.screen.width || '') + 'x' + String(window.screen.height || '');
    }

    function sendPayload(payload) {
        var body = JSON.stringify(payload);

        if (window.navigator && typeof window.navigator.sendBeacon === 'function') {
            var blob = new Blob([body], { type: 'application/json' });
            if (window.navigator.sendBeacon(endpoint, blob)) {
                return;
            }
        }

        if (typeof window.fetch === 'function') {
            window.fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: body,
                keepalive: true,
                credentials: 'omit'
            }).catch(function () {});
        }
    }

    function track(eventType, targetId) {
        buildPayload(eventType, targetId).then(sendPayload).catch(function () {});
    }

    function trackPageView() {
        if (pageViewSent) return;
        pageViewSent = true;
        track('page_view', '');
    }

    function setupClickTracking() {
        document.addEventListener('click', function (event) {
            var target = event.target && event.target.closest
                ? event.target.closest('[data-analytics-target]')
                : null;
            if (!target) return;
            var targetId = target.getAttribute('data-analytics-target') || '';
            if (!targetId) return;
            track('click', targetId);
        }, true);
    }

    window.FrameSparkAnalytics = {
        track: track,
        getPageType: getPageType
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            trackPageView();
            setupClickTracking();
        });
    } else {
        trackPageView();
        setupClickTracking();
    }
})();
