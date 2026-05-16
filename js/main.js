(function () {
    'use strict';

    var siteData = window.FrameSparkData || {};
    var projects = siteData.projects || [];
    var platforms = siteData.platforms || [];
    var ecosystem = siteData.ecosystem || [];

    function padNumber(number) {
        return String(number).padStart(2, '0');
    }

    function createProjectCard(project, index, isClone) {
        var article = document.createElement(project.href ? 'a' : 'article');
        article.className = 'project-card';
        if (project.href) {
            article.href = project.href;
        }
        if (isClone) {
            article.setAttribute('aria-hidden', 'true');
        }

        var poster = document.createElement('div');
        poster.className = 'project-card__poster';

        if (project.cover) {
            var image = document.createElement('img');
            image.src = project.cover;
            image.alt = project.title + '项目封面';
            poster.appendChild(image);
        } else {
            var number = document.createElement('span');
            number.textContent = padNumber(index + 1);
            poster.appendChild(number);
        }

        var body = document.createElement('div');
        body.className = 'project-card__body';

        var type = document.createElement('p');
        type.className = 'project-card__status';
        type.textContent = project.type;

        var title = document.createElement('h3');
        title.textContent = project.title;

        var duration = document.createElement('p');
        duration.textContent = project.duration;

        body.appendChild(type);
        body.appendChild(title);
        body.appendChild(duration);
        article.appendChild(poster);
        article.appendChild(body);

        return article;
    }

    function renderProjectCards() {
        var reel = document.getElementById('projectReel');
        if (!reel) return;
        if (!projects.length) return;

        var fragment = document.createDocumentFragment();
        projects.concat(projects).forEach(function (project, index) {
            var realIndex = index % projects.length;
            fragment.appendChild(createProjectCard(project, realIndex, index >= projects.length));
        });

        reel.innerHTML = '';
        reel.appendChild(fragment);
    }

    renderProjectCards();

    function createPlatformCard(platform, index) {
        var article = document.createElement(platform.href ? 'a' : 'article');
        article.className = 'platform-card';
        if (platform.href) {
            article.href = platform.href;
        }

        var meta = document.createElement('div');
        meta.className = 'platform-card__meta';
        var status = document.createElement('span');
        status.textContent = platform.status || '开发中';
        meta.appendChild(status);

        var number = document.createElement('p');
        number.className = 'platform-card__num';
        number.textContent = platform.number || padNumber(index + 1);

        var title = document.createElement('h2');
        title.textContent = platform.title || '';

        var freeRow = document.createElement('div');
        freeRow.className = 'platform-card__free-row';
        if (platform.freeLabel) {
            var freeLabel = document.createElement('span');
            freeLabel.textContent = platform.freeLabel;
            freeRow.appendChild(freeLabel);
        } else {
            freeRow.classList.add('platform-card__free-row--empty');
            freeRow.setAttribute('aria-hidden', 'true');
        }

        var english = document.createElement('p');
        english.className = 'platform-card__en';
        english.textContent = platform.english || '';

        var description = document.createElement('p');
        description.className = 'platform-card__text';
        description.textContent = platform.description || '';

        article.appendChild(meta);
        article.appendChild(number);
        article.appendChild(title);
        article.appendChild(freeRow);
        article.appendChild(english);
        article.appendChild(description);

        return article;
    }

    function renderPlatformCards() {
        var list = document.getElementById('platformList');
        if (!list) return;

        var fragment = document.createDocumentFragment();
        platforms.forEach(function (platform, index) {
            fragment.appendChild(createPlatformCard(platform, index));
        });

        list.innerHTML = '';
        list.appendChild(fragment);
    }

    function createEcosystemItem(item, index) {
        var article = document.createElement('article');

        var number = document.createElement('span');
        number.textContent = item.number || padNumber(index + 1);

        var title = document.createElement('h3');
        title.textContent = item.title || '';

        var description = document.createElement('p');
        description.textContent = item.description || '';

        article.appendChild(number);
        article.appendChild(title);
        article.appendChild(description);

        return article;
    }

    function renderEcosystemItems() {
        var grid = document.getElementById('ecosystemGrid');
        if (!grid) return;

        var fragment = document.createDocumentFragment();
        ecosystem.forEach(function (item, index) {
            fragment.appendChild(createEcosystemItem(item, index));
        });

        grid.innerHTML = '';
        grid.appendChild(fragment);
    }

    renderPlatformCards();
    renderEcosystemItems();

    var nav = document.getElementById('nav');
    var ticking = false;

    function onScroll() {
        if (!nav || ticking) return;

        window.requestAnimationFrame(function () {
            nav.classList.toggle('is-scrolled', window.scrollY > 24);
            ticking = false;
        });
        ticking = true;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    var observeTargets = document.querySelectorAll(
        '.intro__inner, .section-head, .platform-card, .ecosystem-grid article, .principle__inner'
    );

    observeTargets.forEach(function (el) {
        el.classList.add('fade-in');
    });

    if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry, index) {
                if (!entry.isIntersecting) return;

                window.setTimeout(function () {
                    entry.target.classList.add('is-visible');
                }, index * 70);
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.16, rootMargin: '0px 0px -72px 0px' });

        observeTargets.forEach(function (el) {
            observer.observe(el);
        });
    } else {
        observeTargets.forEach(function (el) {
            el.classList.add('is-visible');
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
        link.addEventListener('click', function (event) {
            var targetId = link.getAttribute('href');

            if (targetId === '#' || targetId === '#top') {
                event.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            var target = document.querySelector(targetId);
            if (!target) return;

            event.preventDefault();
            var offset = nav ? nav.getBoundingClientRect().height + 16 : 80;
            var top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top: top, behavior: 'smooth' });
        });
    });

    var marquee = document.querySelector('.project-marquee');
    var stage = marquee ? marquee.querySelector('.project-marquee__stage') : null;
    var reel = marquee ? marquee.querySelector('.project-reel') : null;
    var prevButton = marquee ? marquee.querySelector('.project-marquee__control--prev') : null;
    var nextButton = marquee ? marquee.querySelector('.project-marquee__control--next') : null;
    var offset = 0;
    var lastFrameTime = null;
    var isPointerPaused = false;
    var isStepping = false;
    var resumeTimer = null;
    var autoPausedUntil = 0;
    var autoSpeed = 28;
    var rampStartTime = null;
    var rampDuration = 500;

    function getProjectStep() {
        if (!reel) return 0;

        var firstCard = reel.querySelector('.project-card');
        if (!firstCard) return 0;

        var styles = window.getComputedStyle(reel);
        var gap = parseFloat(styles.columnGap || styles.gap || '0') || 0;
        return firstCard.getBoundingClientRect().width + gap;
    }

    function getLoopWidth() {
        if (!reel) return 0;

        var cards = reel.querySelectorAll('.project-card');
        if (cards.length <= projects.length) return 0;

        return cards[projects.length].offsetLeft - cards[0].offsetLeft;
    }

    function normalizeOffset(value) {
        var loopWidth = getLoopWidth();
        if (!loopWidth) return value;

        while (value <= -loopWidth) {
            value += loopWidth;
        }
        while (value > 0) {
            value -= loopWidth;
        }
        return value;
    }

    function renderProjects() {
        if (!reel) return;
        reel.style.transform = 'translateX(' + normalizeOffset(offset) + 'px)';
    }

    function resumeAutoScrollLater() {
        if (resumeTimer) {
            window.clearTimeout(resumeTimer);
        }

        resumeTimer = window.setTimeout(function () {
            autoPausedUntil = 0;
            rampStartTime = window.performance.now();
        }, 2000);
    }

    function moveProjects(direction) {
        if (!marquee || !reel) return;
        if (isStepping) return;

        var step = getProjectStep();
        var loopWidth = getLoopWidth();
        if (!step || !loopWidth) return;

        var start = normalizeOffset(offset);
        if (direction > 0 && start > -step * 0.5) {
            start -= loopWidth;
        }

        var target = start + direction * step;
        var startTime = window.performance.now();
        var duration = 560;

        offset = start;
        isStepping = true;
        autoPausedUntil = Infinity;

        function animateStep(now) {
            var progress = Math.min((now - startTime) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            offset = start + (target - start) * eased;
            renderProjects();

            if (progress < 1) {
                window.requestAnimationFrame(animateStep);
                return;
            }

            offset = normalizeOffset(target);
            isStepping = false;
            renderProjects();
            resumeAutoScrollLater();
        }

        window.requestAnimationFrame(animateStep);
    }

    function tickProjects(now) {
        if (!reel) return;

        if (lastFrameTime === null) {
            lastFrameTime = now;
        }

        var delta = Math.min(now - lastFrameTime, 80) / 1000;
        lastFrameTime = now;

        if (!isPointerPaused && !isStepping && now > autoPausedUntil) {
            var speedFactor = 1;
            if (rampStartTime !== null) {
                speedFactor = Math.min((now - rampStartTime) / rampDuration, 1);
                if (speedFactor >= 1) {
                    rampStartTime = null;
                }
            }

            offset -= autoSpeed * speedFactor * delta;
            offset = normalizeOffset(offset);
            renderProjects();
        }

        window.requestAnimationFrame(tickProjects);
    }

    if (stage && reel) {
        reel.querySelectorAll('.project-card').forEach(function (card) {
            card.addEventListener('mouseenter', function () {
                isPointerPaused = true;
            });

            card.addEventListener('mouseleave', function () {
                isPointerPaused = false;
            });
        });

        renderProjects();
        window.requestAnimationFrame(tickProjects);
    }

    window.addEventListener('resize', function () {
        offset = normalizeOffset(offset);
        renderProjects();
    });

    if (prevButton && nextButton) {
        prevButton.addEventListener('click', function () {
            moveProjects(-1);
        });

        nextButton.addEventListener('click', function () {
            moveProjects(1);
        });
    }
})();
