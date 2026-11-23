/*
 * «Як вторсировина стає продуктом» — інтерактивна схема цеху.
 * Звичайний блок сторінки (нічого не «закріплює» прокрутку): кроки перемикаються самі, коли блок видно,
 * або кліком. Камера плавно переїжджає від приймання сировини до готового виробу.
 */
'use strict';
window.BH_STORY = (() => {
  // Стримана палітра: сталь, скло, графіт + один акцент.
  const MAT = ['#8C9A93', '#6F7C76', '#B9C4BE', '#A8C7C0', '#5D6963', '#C6F432', '#9AA7A0'];
  const CAM = [[250, 330, 1.9], [250, 520, 1.75], [800, 500, 1.45], [1210, 640, 1.5], [830, 480, .95]];
  const VIEW = [1600, 900];
  const DUR = 5200;

  function rnd(seed) { let h = seed * 9301 + 49297; return () => ((h = (h * 9301 + 49297) % 233280) / 233280); }

  // Шматок сировини: металевий брухт, пляшка або кришечка.
  function piece(kind, c) {
    if (kind === 0) return `<path d="M-14 -6 6 -12 15 2 4 12 -12 8Z" fill="${c}" stroke="rgba(0,0,0,.25)" stroke-width="2"/>`;
    if (kind === 1) return `<rect x="-7" y="-15" width="14" height="30" rx="5" fill="${c}" fill-opacity=".55" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/><rect x="-3.5" y="-19" width="7" height="5" rx="1.5" fill="${c}"/>`;
    return `<circle r="11" fill="${c}"/><circle r="6.5" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2.5"/>`;
  }

  function scene(L) {
    const r = rnd(7);
    let pile = '';
    for (let i = 0; i < 60; i++) {
      const x = 130 + r() * 200, y = 255 + r() * 70 - (x - 230) ** 2 / 650;
      pile += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${Math.floor(r() * 360)})">${piece(i % 3, MAT[i % MAT.length])}</g>`;
    }
    let fall = '';
    for (let i = 0; i < 12; i++) {
      const x = 150 + (i % 6) * 30;
      fall += `<g class="sf-fall" style="animation-delay:${(i * 0.34).toFixed(2)}s"><g transform="translate(${x} 60) rotate(${i * 37})">${piece(i % 3, MAT[(i * 3) % MAT.length])}</g></g>`;
    }
    let flakes = '';
    for (let i = 0; i < 22; i++) {
      flakes += `<rect class="sf-flake" x="${232 + (i % 4) * 8}" y="${640 + (i % 3) * 6}" width="${8 + (i % 3) * 2}" height="5" rx="1.5" fill="${MAT[i % MAT.length]}" style="animation-delay:${(i * 0.14).toFixed(2)}s;--dx:${300 + (i % 5) * 30}px;--dy:${-130 - (i % 4) * 10}px"/>`;
    }
    const terr = (w, h, n, seed) => { const q = rnd(seed); let s = ''; for (let i = 0; i < n; i++) s += `<circle cx="${(q() * w).toFixed(0)}" cy="${(q() * h).toFixed(0)}" r="${(1.5 + q() * 3.5).toFixed(1)}" fill="${MAT[i % MAT.length]}" fill-opacity=".8"/>`; return s; };
    let benchDots = '';
    const q = rnd(11);
    for (let i = 0; i < 70; i++) {
      const row = i % 3, x = 20 + q() * 440, y = [16, 72, 126][row] + q() * 22;
      benchDots += `<circle class="sb-cap" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(2 + q() * 4).toFixed(1)}" fill="${MAT[i % MAT.length]}" style="--sx:${((q() - .5) * 900).toFixed(0)}px;--sy:${(-200 - q() * 400).toFixed(0)}px;transition-delay:${(q() * .5).toFixed(2)}s"/>`;
    }
    const lab = (n, x, y) => `<text class="st-label" x="${x}" y="${y}">0${n} · ${L[n - 1]}</text>`;
    return `<svg class="story__svg" viewBox="0 0 ${VIEW[0]} ${VIEW[1]}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <pattern id="sgrid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0v40" fill="none" stroke="rgba(198,244,50,.06)"/></pattern>
        <linearGradient id="sheat" x1="0" x2="1"><stop offset="0" stop-color="#E9A46B"/><stop offset="1" stop-color="#D9674B"/></linearGradient>
        <radialGradient id="sglow"><stop offset="0" stop-color="#E9844B" stop-opacity=".35"/><stop offset="1" stop-color="#E9844B" stop-opacity="0"/></radialGradient>
        <clipPath id="sbeamclip"><rect x="0" y="0" width="360" height="48" rx="8"/></clipPath>
        <clipPath id="hopclip"><path d="M110 150h240v70l-60 130H170l-60-130z"/></clipPath>
      </defs>
      <g class="story__cam">
        <rect x="-800" y="-600" width="3200" height="2100" fill="url(#sgrid)"/>
        <path d="M-400 820H2000" stroke="rgba(238,243,239,.1)" stroke-width="2"/>

        <g class="st st-1">
          ${fall}
          <path d="M110 220h240l-60 130H170z" fill="#1A221F"/>
          <g clip-path="url(#hopclip)">${pile}</g>
          <path d="M110 220h240l-60 130H170z" fill="none" stroke="#C6F432" stroke-width="3"/>
          ${lab(1, 110, 200)}
        </g>

        <g class="st st-2">
          <rect x="140" y="350" width="180" height="170" rx="16" fill="#18211E" stroke="rgba(238,243,239,.25)" stroke-width="3"/>
          <g fill="none" stroke="#C6F432" stroke-width="5">
            <g class="sf-blade" style="transform-origin:198px 435px"><circle cx="198" cy="435" r="34"/><path d="M198 401v68M164 435h68M174 411l48 48M222 411l-48 48"/></g>
            <g class="sf-blade rev" style="transform-origin:262px 435px"><circle cx="262" cy="435" r="34"/><path d="M262 401v68M228 435h68M238 411l48 48M286 411l-48 48"/></g>
          </g>
          <rect x="168" y="520" width="26" height="80" fill="#18211E" stroke="rgba(238,243,239,.25)" stroke-width="3"/><rect x="266" y="520" width="26" height="80" fill="#18211E" stroke="rgba(238,243,239,.25)" stroke-width="3"/>
          <path d="M150 600h160v40H150z" fill="#222D29" stroke="rgba(238,243,239,.25)" stroke-width="3"/>
          ${lab(2, 150, 760)}
        </g>
        <g class="st-fl">${flakes}</g>

        <g class="st st-3">
          <ellipse cx="800" cy="520" rx="420" ry="90" fill="url(#sglow)" class="sf-heatglow"/>
          <path d="M540 380h90l-20 60h-50z" fill="#1A221F" stroke="#C6F432" stroke-width="3"/>
          <rect x="440" y="440" width="120" height="80" rx="12" fill="#222D29" stroke="rgba(238,243,239,.25)" stroke-width="3"/>
          <rect x="560" y="450" width="500" height="64" rx="12" fill="#18211E" stroke="rgba(238,243,239,.25)" stroke-width="3"/>
          <rect class="sf-heat" x="640" y="456" width="120" height="52" rx="8" fill="url(#sheat)"/>
          <rect class="sf-heat" x="780" y="456" width="120" height="52" rx="8" fill="url(#sheat)" style="animation-delay:.5s"/>
          <rect class="sf-heat" x="920" y="456" width="120" height="52" rx="8" fill="url(#sheat)" style="animation-delay:1s"/>
          <path class="sf-screw" d="M570 482h480" stroke="#EEF3EF" stroke-width="5" stroke-dasharray="14 9" opacity=".6"/>
          <rect x="1060" y="466" width="28" height="32" rx="5" fill="#C6F432"/>
          <path d="M560 520v300M1040 520v300" stroke="rgba(238,243,239,.2)" stroke-width="6"/>
          ${lab(3, 440, 420)}
        </g>

        <g class="st st-4">
          <path d="M1088 482c60 0 80 40 80 100" fill="none" stroke="#D9774B" stroke-width="10" stroke-linecap="round" opacity=".8"/>
          <g transform="translate(1030 610)"><g class="sf-beam"><g clip-path="url(#sbeamclip)"><rect width="360" height="48" fill="#2A3531"/>${terr(360, 48, 70, 3)}</g></g></g>
          <g transform="translate(1030 672)" opacity=".9"><g clip-path="url(#sbeamclip)"><rect width="360" height="48" fill="#2A3531"/>${terr(360, 48, 70, 5)}</g></g>
          ${lab(4, 1030, 595)}
        </g>

        <g class="st st-5" transform="translate(1120 470) scale(.9)">
          <path d="M40 150v190M440 150v190M70 46v54M410 46v54" stroke="#7F8C86" stroke-width="16" stroke-linecap="round"/>
          <rect x="0" y="0" width="480" height="46" rx="12" fill="#2A3531"/>
          <rect x="0" y="56" width="480" height="46" rx="12" fill="#2A3531"/>
          <rect x="0" y="110" width="480" height="46" rx="12" fill="#2A3531"/>
          <g>${benchDots}</g>
          <g class="sb-plaque"><rect x="190" y="194" width="100" height="40" rx="8" fill="#C6F432"/><text x="240" y="220" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="17" fill="#0B1200">BH</text></g>
          ${lab(5, 0, -18)}
        </g>
      </g>
    </svg>`;
  }

  function mount(root, { t, esc, icon, stat5 }) {
    const steps = [1, 2, 3, 4, 5];
    const L = steps.map((i) => esc(t(`story.s${i}t`)).toUpperCase());
    root.innerHTML = `<div class="wrap">
      <div class="sec__head reveal"><div><div class="eyebrow">${t('story.eyebrow')}</div><h2>${t('story.title')}</h2></div><p>${t('story.lead')}</p></div>
      <div class="story__box reveal">
        <div class="story__stage">${scene(L)}<div class="story__vignette"></div></div>
        <div class="story__panel">
          <ol class="story__steps">${steps.map((i) => `<li><button type="button" class="story__step" data-s="${i - 1}">
            <span class="story__n mono">0${i}</span>
            <span class="story__body"><b>${t(`story.s${i}t`)}</b><span class="story__text">${t(`story.s${i}p`)}</span>
              <span class="story__stat"><b class="mono">${esc(i === 5 && stat5 ? stat5 : t(`story.s${i}v`))}</b> ${t(`story.s${i}l`)}</span></span>
            <span class="story__bar"><i></i></span>
          </button></li>`).join('')}</ol>
          <div class="story__cta"><a class="btn btn--acc btn--sm" href="/equipment">${t('story.cta')} ${icon('arrow', 16)}</a><a class="btn btn--sm" href="/solutions">${t('story.cta2')}</a></div>
        </div>
      </div>
    </div>`;
    const box = root.querySelector('.story__box');
    const cam = root.querySelector('.story__cam');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cur = [...CAM[0]], target = [...CAM[0]], stage = 0, timer = 0, visible = false, paused = false;
    const apply = () => {
      const [x, y, s] = cur;
      cam.setAttribute('transform', `translate(${VIEW[0] / 2} ${VIEW[1] / 2}) scale(${s.toFixed(4)}) translate(${(-x).toFixed(2)} ${(-y).toFixed(2)})`);
    };
    let running = false;
    const loop = () => {
      cur = cur.map((v, j) => (reduce ? target[j] : v + (target[j] - v) * .08));
      apply();
      if (cur.every((v, j) => Math.abs(v - target[j]) < (j === 2 ? .0005 : .05))) { cur = [...target]; apply(); running = false; return; }
      requestAnimationFrame(loop);
    };
    const go = (i) => {
      stage = (i + steps.length) % steps.length;
      box.dataset.stage = stage;
      box.querySelectorAll('.story__step').forEach((b, j) => { b.classList.toggle('on', j === stage); b.classList.toggle('done', j < stage); b.setAttribute('aria-current', j === stage ? 'step' : 'false'); });
      target = [...CAM[stage]];
      if (!running) { running = true; requestAnimationFrame(loop); }
      schedule();
    };
    const schedule = () => {
      clearTimeout(timer);
      const play = visible && !paused && !reduce;
      box.classList.toggle('playing', play);
      if (play) timer = setTimeout(() => { if (root.isConnected) go(stage + 1); }, DUR);
    };
    box.querySelectorAll('.story__step').forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.s))));
    box.addEventListener('pointerenter', () => { paused = true; schedule(); });
    box.addEventListener('pointerleave', () => { paused = false; schedule(); });
    box.addEventListener('focusin', () => { paused = true; schedule(); });
    box.addEventListener('focusout', () => { paused = false; schedule(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; schedule(); }, { threshold: .45 }).observe(box);
    }
    apply();
    go(0);
  }

  return { mount };
})();
