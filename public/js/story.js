/*
 * «Від кришечки до лавки» — історія, що програється прокруткою.
 * Секція закріплюється на екрані; камера рухається від бункера до лавки, текст змінюється по кроках.
 * Без бібліотек: одна SVG-сцена, CSS-анімації механізмів і rAF для камери.
 */
'use strict';
window.BH_STORY = (() => {
  const CAPS = ['#FF5A4E', '#FFC531', '#3FA9F5', '#2FD18B', '#EDEFEA', '#9B7BFF', '#FF8A3D'];
  // Кадри камери: [x, y, масштаб] — центр кадру в координатах сцени 1600×900.
  const CAM = [[230, 300, 2.0], [240, 500, 1.8], [800, 500, 1.5], [1210, 640, 1.55], [840, 540, .86]];
  const VIEW = [1600, 900];

  function rnd(seed) { let h = seed * 9301 + 49297; return () => ((h = (h * 9301 + 49297) % 233280) / 233280); }

  function scene() {
    const r = rnd(7);
    // купа кришечок у бункері + падаючі
    let pile = '';
    for (let i = 0; i < 70; i++) {
      const x = 130 + r() * 200, y = 250 + r() * 70 - (x - 230) ** 2 / 600, c = CAPS[i % 7];
      pile += `<g transform="translate(${x.toFixed(0)} ${y.toFixed(0)})"><circle r="13" fill="${c}"/><circle r="8" fill="none" stroke="rgba(0,0,0,.22)" stroke-width="2.5"/></g>`;
    }
    let fall = '';
    for (let i = 0; i < 14; i++) {
      const x = 150 + (i % 7) * 26, c = CAPS[(i * 3) % 7];
      fall += `<g class="sf-fall" style="animation-delay:${(i * 0.29).toFixed(2)}s"><g transform="translate(${x} 60)"><circle r="12" fill="${c}"/><circle r="7" fill="none" stroke="rgba(0,0,0,.22)" stroke-width="2.5"/></g></g>`;
    }
    // флекс, що летить з дробарки до екструдера
    let flakes = '';
    for (let i = 0; i < 26; i++) {
      flakes += `<rect class="sf-flake" x="${232 + (i % 4) * 8}" y="${640 + (i % 3) * 6}" width="${8 + (i % 3) * 2}" height="5" rx="1.5" fill="${CAPS[i % 7]}" style="animation-delay:${(i * 0.13).toFixed(2)}s;--dx:${300 + (i % 5) * 30}px;--dy:${-130 - (i % 4) * 10}px"/>`;
    }
    // «терраццо» для брусу й лавки
    const terr = (w, h, n, seed) => { const q = rnd(seed); let s = ''; for (let i = 0; i < n; i++) s += `<circle cx="${(q() * w).toFixed(0)}" cy="${(q() * h).toFixed(0)}" r="${(2 + q() * 5).toFixed(1)}" fill="${CAPS[i % 7]}"/>`; return s; };
    // лавка: кришечки злітаються на місця (клас .on на останньому кроці)
    let benchCaps = '';
    const q = rnd(11);
    for (let i = 0; i < 90; i++) {
      const row = i % 3, x = 20 + q() * 440, y = [18, 74, 128][row] + q() * 22;
      const sx = (q() - .5) * 900, sy = -200 - q() * 400;
      benchCaps += `<circle class="sb-cap" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(3 + q() * 6).toFixed(1)}" fill="${CAPS[i % 7]}" style="--sx:${sx.toFixed(0)}px;--sy:${sy.toFixed(0)}px;transition-delay:${(q() * .5).toFixed(2)}s"/>`;
    }
    return `<svg class="story__svg" viewBox="0 0 ${VIEW[0]} ${VIEW[1]}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <pattern id="sgrid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0v40" fill="none" stroke="rgba(198,244,50,.07)"/></pattern>
        <linearGradient id="sheat" x1="0" x2="1"><stop offset="0" stop-color="#FFB36B"/><stop offset="1" stop-color="#FF5A4E"/></linearGradient>
        <radialGradient id="sglow"><stop offset="0" stop-color="#FF7A3D" stop-opacity=".55"/><stop offset="1" stop-color="#FF7A3D" stop-opacity="0"/></radialGradient>
        <clipPath id="sbeamclip"><rect x="0" y="0" width="360" height="48" rx="8"/></clipPath>
      </defs>
      <g class="story__cam">
        <rect x="-800" y="-600" width="3200" height="2100" fill="url(#sgrid)"/>
        <!-- підлога цеху -->
        <path d="M-400 820H2000" stroke="rgba(238,243,239,.12)" stroke-width="2"/>
        <g opacity=".35" font-family="JetBrains Mono, monospace" font-size="14" fill="#7F8C86">
          <text x="60" y="860">BH · LINE-01</text><text x="1400" y="860">DNIPRO · UA</text>
        </g>

        <!-- 1. бункер і кришечки -->
        <g class="st st-1">
          ${fall}
          <path d="M110 220h240l-60 130H170z" fill="#1C2522" stroke="#C6F432" stroke-width="3"/>
          <g clip-path="url(#hopclip)">${pile}</g>
          <clipPath id="hopclip"><path d="M110 150h240v70l-60 130H170l-60-130z"/></clipPath>
          <path d="M110 220h240l-60 130H170z" fill="none" stroke="#C6F432" stroke-width="3"/>
          <text class="st-label" x="110" y="200">01 · CAPS · HDPE / PP</text>
        </g>

        <!-- 2. дробарка -->
        <g class="st st-2">
          <rect x="140" y="350" width="180" height="170" rx="16" fill="#18211E" stroke="rgba(238,243,239,.3)" stroke-width="3"/>
          <g fill="none" stroke="#C6F432" stroke-width="5">
            <g class="sf-blade" style="transform-origin:198px 435px"><circle cx="198" cy="435" r="34"/><path d="M198 401v68M164 435h68M174 411l48 48M222 411l-48 48"/></g>
            <g class="sf-blade rev" style="transform-origin:262px 435px"><circle cx="262" cy="435" r="34"/><path d="M262 401v68M228 435h68M238 411l48 48M286 411l-48 48"/></g>
          </g>
          <rect x="168" y="520" width="26" height="80" fill="#18211E" stroke="rgba(238,243,239,.3)" stroke-width="3"/><rect x="266" y="520" width="26" height="80" fill="#18211E" stroke="rgba(238,243,239,.3)" stroke-width="3"/>
          <path d="M150 600h160v40H150z" fill="#222D29" stroke="rgba(238,243,239,.3)" stroke-width="3"/>
          <rect x="150" y="760" width="160" height="60" rx="6" fill="#1C2522" stroke="rgba(238,243,239,.2)" stroke-width="2"/>
          <text x="166" y="796" font-family="JetBrains Mono, monospace" font-size="16" fill="#C6F432">1.5 kW · 220 V</text>
          <text class="st-label" x="150" y="745">02 · SHREDDER</text>
        </g>
        <g class="st-fl">${flakes}</g>

        <!-- 3. екструдер -->
        <g class="st st-3">
          <ellipse cx="800" cy="520" rx="420" ry="90" fill="url(#sglow)" class="sf-heatglow"/>
          <path d="M540 380h90l-20 60h-50z" fill="#1C2522" stroke="#C6F432" stroke-width="3"/>
          <rect x="440" y="440" width="120" height="80" rx="12" fill="#222D29" stroke="rgba(238,243,239,.3)" stroke-width="3"/>
          <rect x="560" y="450" width="500" height="64" rx="12" fill="#18211E" stroke="rgba(238,243,239,.3)" stroke-width="3"/>
          <rect class="sf-heat" x="640" y="456" width="120" height="52" rx="8" fill="url(#sheat)"/>
          <rect class="sf-heat" x="780" y="456" width="120" height="52" rx="8" fill="url(#sheat)" style="animation-delay:.5s"/>
          <rect class="sf-heat" x="920" y="456" width="120" height="52" rx="8" fill="url(#sheat)" style="animation-delay:1s"/>
          <path class="sf-screw" d="M570 482h480" stroke="#EEF3EF" stroke-width="5" stroke-dasharray="14 9" opacity=".7"/>
          <rect x="1060" y="466" width="28" height="32" rx="5" fill="#C6F432"/>
          <g font-family="JetBrains Mono, monospace" font-size="15" fill="#FFD1A8"><text x="660" y="545">PID 1</text><text x="800" y="545">PID 2</text><text x="940" y="545">ZONE 3</text></g>
          <path d="M560 520v300M1040 520v300" stroke="rgba(238,243,239,.25)" stroke-width="6"/>
          <text class="st-label" x="440" y="420">03 · EXTRUDER</text>
        </g>

        <!-- 4. брус -->
        <g class="st st-4">
          <path d="M1088 482c60 0 80 40 80 100" fill="none" stroke="#FF8A3D" stroke-width="10" stroke-linecap="round" opacity=".85"/>
          <g transform="translate(1030 610)">
            <g class="sf-beam"><g clip-path="url(#sbeamclip)"><rect width="360" height="48" fill="#26332E"/>${terr(360, 48, 90, 3)}</g></g>
          </g>
          <g transform="translate(1030 672)" opacity=".9"><g clip-path="url(#sbeamclip)"><rect width="360" height="48" fill="#26332E"/>${terr(360, 48, 90, 5)}</g></g>
          <text class="st-label" x="1030" y="595">04 · BEAM</text>
        </g>

        <!-- 5. лавка -->
        <g class="st st-5" transform="translate(1120 470) scale(.9)">
          <path d="M40 150v190M440 150v190M70 46v54M410 46v54" stroke="#8A968F" stroke-width="16" stroke-linecap="round"/>
          <rect x="0" y="0" width="480" height="46" rx="12" fill="#26332E"/>
          <rect x="0" y="56" width="480" height="46" rx="12" fill="#26332E"/>
          <rect x="0" y="110" width="480" height="46" rx="12" fill="#26332E"/>
          <g>${benchCaps}</g>
          <g class="sb-plaque"><rect x="160" y="190" width="160" height="56" rx="10" fill="#C6F432"/><text x="240" y="216" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="18" fill="#0B1200">12 000</text><text x="240" y="236" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="#0B1200">CAPS · BH</text></g>
          <text class="st-label" x="0" y="-18">05 · BENCH</text>
        </g>
      </g>
    </svg>`;
  }

  function mount(root, { t, esc, icon }) {
    const steps = [1, 2, 3, 4, 5];
    root.innerHTML = `
      <div class="story__pin">
        <div class="story__stage">${scene()}<div class="story__vignette"></div></div>
        <div class="story__panel">
          <div class="eyebrow">${t('story.eyebrow')}</div>
          <div class="story__count mono"><b id="stN">01</b> / 05</div>
          <div class="story__slides">${steps.map((i) => `<div class="story__slide" data-s="${i - 1}">
            <h2>${t(`story.s${i}t`)}</h2><p>${t(`story.s${i}p`)}</p>
            <div class="story__stat"><b class="mono">${esc(t(`story.s${i}v`))}</b><span>${t(`story.s${i}l`)}</span></div>
          </div>`).join('')}</div>
          <div class="story__dots">${steps.map((i) => `<i data-d="${i - 1}"></i>`).join('')}</div>
          <div class="story__cta"><a class="btn btn--acc" href="/products/lavka-z-pereroblenoho-plastyku">${t('story.cta')} ${icon('arrow', 18)}</a><a class="btn" href="/solutions#caps-workshop">${t('story.cta2')}</a></div>
          <p class="story__hint mono">${icon('arrow', 14)} ${t('story.hint')}</p>
        </div>
      </div>`;
    const cam = root.querySelector('.story__cam');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cur = [...CAM[0]];
    let target = [...CAM[0]];
    let stage = -1;
    const ease = (x) => (x < .5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
    const lerp = (a, b, k) => a + (b - a) * k;
    const apply = () => {
      const [x, y, s] = cur;
      cam.setAttribute('transform', `translate(${VIEW[0] / 2} ${VIEW[1] / 2}) scale(${s.toFixed(4)}) translate(${(-x).toFixed(2)} ${(-y).toFixed(2)})`);
    };
    const onScroll = () => {
      const r = root.getBoundingClientRect();
      const total = root.offsetHeight - innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      const f = p * (CAM.length - 1);
      const i = Math.min(CAM.length - 2, Math.floor(f));
      // утримуємо кадр на кроці й плавно переходимо між ними
      const local = f - i;
      const k = ease(Math.min(1, Math.max(0, (local - .45) / .55)));
      target = [0, 1, 2].map((j) => lerp(CAM[i][j], CAM[i + 1][j], k));
      const st = Math.min(CAM.length - 1, Math.floor(f + .3));
      if (st !== stage) {
        stage = st;
        root.dataset.stage = st;
        root.querySelectorAll('.story__slide').forEach((el) => el.classList.toggle('on', Number(el.dataset.s) === st));
        root.querySelectorAll('[data-d]').forEach((el) => el.classList.toggle('on', Number(el.dataset.d) <= st));
        root.querySelector('#stN').textContent = String(st + 1).padStart(2, '0');
      }
      root.style.setProperty('--sp', p.toFixed(4));
      kick();
    };
    // Камера доганяє ціль плавно; цикл зупиняється, щойно камера на місці.
    let running = false;
    const loop = () => {
      cur = cur.map((v, j) => (reduce ? target[j] : v + (target[j] - v) * .11));
      apply();
      const done = cur.every((v, j) => Math.abs(v - target[j]) < (j === 2 ? .0005 : .05));
      if (done) { cur = [...target]; apply(); running = false; return; }
      requestAnimationFrame(loop);
    };
    const kick = () => { if (!running) { running = true; requestAnimationFrame(loop); } };
    const off = () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); };
    const watch = setInterval(() => { if (!root.isConnected) { off(); clearInterval(watch); } }, 2000);
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll, { passive: true });
    onScroll();
    cur = [...target];
    apply();
  }

  return { mount };
})();
