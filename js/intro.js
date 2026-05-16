(function () {
    'use strict';

    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:8888;pointer-events:none;display:block';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var W, H, CX, CY;

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
        CX = W / 2; CY = H / 2;
    }
    resize();
    window.addEventListener('resize', resize);

    var CN = '帧火花';
    var EN = 'FRAMESPARK';
    var cnSize = Math.min(W * 0.1, 88);
    var enSize = cnSize * 0.21;
    var cnFont = 'bold ' + cnSize + 'px "Noto Serif SC","Songti SC",serif';
    var enFont = '300 ' + enSize + 'px "Cormorant Garamond",Georgia,serif';

    function makeTextCanvas() {
        var tc = document.createElement('canvas');
        tc.width = W; tc.height = H;
        var tx = tc.getContext('2d');
        tx.font = cnFont;
        var cnW = tx.measureText(CN).width;
        tx.font = enFont;
        var enW = tx.measureText(EN).width;
        var gap = cnSize * 0.42;
        var totalH = cnSize + gap + enSize;
        var cnY = CY - totalH / 2 + cnSize;
        var enY = cnY + gap + enSize;
        var cnX = CX - cnW / 2;
        var enX = CX - enW / 2;
        tx.fillStyle = '#fff';
        tx.font = cnFont;
        tx.fillText(CN, cnX, cnY);
        tx.font = enFont;
        tx.fillText(EN, enX, enY);
        return { canvas: tc, cnX: cnX, cnY: cnY, enX: enX, enY: enY, cnW: cnW, enW: enW };
    }

    function drawGoldText(shimmerX, revealX, alpha) {
        if (!textData || alpha <= 0) return;
        var d = textData;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(d.canvas, 0, 0);
        ctx.globalCompositeOperation = 'source-atop';
        var left  = Math.min(d.cnX, d.enX);
        var right = Math.max(d.cnX + d.cnW, d.enX + d.enW);
        var top   = d.cnY - cnSize;
        var bot   = d.enY;
        var base = ctx.createLinearGradient(left, top, left, bot);
        base.addColorStop(0,    '#ffe9a0');
        base.addColorStop(0.25, '#e8c96a');
        base.addColorStop(0.55, '#c9a040');
        base.addColorStop(0.8,  '#a07828');
        base.addColorStop(1,    '#7a5a18');
        ctx.fillStyle = base;
        ctx.fillRect(left-10, top-10, right-left+20, bot-top+20);
        var sw = (right-left)*0.16;
        var shim = ctx.createLinearGradient(shimmerX-sw, top, shimmerX+sw, top);
        shim.addColorStop(0,   'rgba(255,255,220,0)');
        shim.addColorStop(0.4, 'rgba(255,255,200,0.5)');
        shim.addColorStop(0.5, 'rgba(255,255,255,0.82)');
        shim.addColorStop(0.6, 'rgba(255,255,200,0.5)');
        shim.addColorStop(1,   'rgba(255,255,220,0)');
        ctx.fillStyle = shim;
        ctx.fillRect(shimmerX-sw*2, top-10, sw*4, bot-top+20);
        if (revealX < right+20) {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0,0,0,1)';
            ctx.fillRect(revealX, top-10, right-revealX+20, bot-top+20);
        }
        ctx.restore();
    }

    var embers = [];

    function spawnEmbers() {
        var d = textData;
        if (!d) return;
        var left  = Math.min(d.cnX, d.enX);
        var right = Math.max(d.cnX + d.cnW, d.enX + d.enW);
        var top   = d.cnY - cnSize;
        var bot   = d.enY;
        var textCX = (left + right) / 2;
        var textCY = (top + bot) / 2;

        // 分两批：
        // 第一批：从文字区域出发，慢慢扩散到全屏（量少，负责弥漫感）
        // 第二批：直接分布在全屏，延迟出现（量多，负责覆盖整个画面）
        var total = 320;
        for (var i = 0; i < total; i++) {
            var isNear = i < total * 0.35; // 35% 从文字出发

            var px, py;
            if (isNear) {
                // 从文字区域出发
                px = left  + Math.random() * (right - left);
                py = top   + Math.random() * (bot - top);
            } else {
                // 全屏随机分布
                px = Math.random() * W;
                py = Math.random() * H;
            }

            // 速度：从文字出发的稍快（有扩散感），全屏的极慢（飘浮感）
            var angle = Math.random() * Math.PI * 2;
            var spd   = isNear
                ? 0.15 + Math.random() * 0.5
                : 0.04 + Math.random() * 0.18;

            // 延迟：
            // 文字区域的先出现（0-300ms）
            // 全屏的根据距离文字中心的距离延迟，越远出现越晚（弥漫扩散感）
            var dist = Math.sqrt(Math.pow(px - textCX, 2) + Math.pow(py - textCY, 2));
            var maxDist = Math.sqrt(Math.pow(W, 2) + Math.pow(H, 2)) / 2;
            var delay = isNear
                ? Math.random() * 300
                : 200 + (dist / maxDist) * 1800 + Math.random() * 400;

            embers.push({
                x: px, y: py,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd - (Math.random() * 0.08), // 微微偏上
                size: 0.25 + Math.random() * 0.65,
                life: 0,
                maxLife: 0.5 + Math.random() * 0.5,
                decay: 0.003 + Math.random() * 0.005,
                hue: Math.random() * 28,
                sat: 65 + Math.random() * 25,
                delay: delay,
                born: false,
                wander: Math.random() * Math.PI * 2,
                wanderSpd: 0.015 + Math.random() * 0.025,
            });
        }
    }

    var emberStartTime = 0;

    function drawEmbers() {
        var now = Date.now() - emberStartTime;
        var alive = 0;
        embers.forEach(function(e) {
            if (now < e.delay) { alive++; return; }
            if (!e.born) { e.born = true; e.life = e.maxLife; }

            e.wander += e.wanderSpd;
            e.vx += Math.cos(e.wander) * 0.005;
            e.vy += Math.sin(e.wander * 0.8) * 0.004;
            e.vx *= 0.988;
            e.vy *= 0.988;
            e.x  += e.vx;
            e.y  += e.vy;
            e.life -= e.decay;
            if (e.life <= 0) return;
            alive++;

            var a = Math.max(0, e.life / e.maxLife);
            var sat = e.sat * a;
            var lum = 35 + 55 * a;

            ctx.save();
            ctx.globalAlpha = a * 0.8;
            var g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 3);
            g.addColorStop(0,   'hsl(' + e.hue + ',' + sat + '%,' + (lum+40) + '%)');
            g.addColorStop(0.4, 'hsl(' + e.hue + ',' + sat + '%,' + lum + '%)');
            g.addColorStop(1,   'hsla(' + e.hue + ',' + sat + '%,' + lum + '%,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size * 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        embers = embers.filter(function(e){ return e.life > 0 || !e.born; });
        return alive;
    }

    function drawVignette(alpha) {
        if (alpha <= 0) return;
        var g = ctx.createRadialGradient(CX, CY, Math.min(W,H)*0.2, CX, CY, Math.max(W,H)*0.75);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,' + (0.75*alpha) + ')');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    }

    function easeInOut(t){ return t<0.5?2*t*t:-1+(4-2*t)*t; }

    var phase = 0, t0 = Date.now();
    // 消散阶段拉长到 3.5 秒，配合全屏弥漫
    var DUR = [1000, 500, 3500];
    var textData = null;
    var textAlpha = 1, vigAlpha = 1;

    function loop() {
        ctx.clearRect(0, 0, W, H);
        var elapsed = Date.now() - t0;
        var dur = DUR[phase] || 1;
        var t = Math.min(elapsed / dur, 1);

        if (!textData) textData = makeTextCanvas();
        var d = textData;
        var left  = Math.min(d.cnX, d.enX);
        var right = Math.max(d.cnX + d.cnW, d.enX + d.enW);
        var shimW = (right - left) * 0.16;

        if (phase === 0) {
            var p = easeInOut(t);
            var shimmerX = left - shimW + (right-left+shimW*2) * p;
            var revealX  = shimmerX - shimW * 0.4;
            drawVignette(1);
            drawGoldText(shimmerX, revealX, 1);
            if (t >= 1) { phase = 1; t0 = Date.now(); }

        } else if (phase === 1) {
            drawVignette(1);
            drawGoldText(right+999, left-10, 1);
            if (t >= 1) {
                spawnEmbers();
                emberStartTime = Date.now();
                phase = 2;
                t0 = Date.now();
            }

        } else if (phase === 2) {
            // 字体在前 40% 时间内缓慢淡出，和火星出现完全重叠
            textAlpha = Math.max(0, 1 - (t / 0.4) * 1.1);
            // 晕影在整个消散过程中缓慢消退
            vigAlpha  = Math.max(0, 1 - t * 0.85);
            drawVignette(vigAlpha);
            if (textAlpha > 0) drawGoldText(right+999, left-10, textAlpha);
            var alive = drawEmbers();
            if (t >= 1 && alive === 0) {
                canvas.remove();
                return;
            }
        }

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(function(){ requestAnimationFrame(loop); });
})();
