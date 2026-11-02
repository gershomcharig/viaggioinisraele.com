/* Optional interactions. All page content and contact links are in index.html. */
(() => {
  'use strict';
  const q = selector => document.querySelector(selector);
  const qa = selector => Array.from(document.querySelectorAll(selector));
  const waOf = text => `https://wa.me/972546267521?text=${encodeURIComponent(text)}`;

  // Keep details open during collapse so its content can shrink smoothly.
  const faqItems = qa('.faq-item');
  const faqStates = new WeakMap();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function setFaqOpen(item, expanded) {
    const state = faqStates.get(item);
    if (state.expanded === expanded) return;
    state.expanded = expanded;
    const startHeight = item.getBoundingClientRect().height;
    state.animation?.cancel();
    item.open = true;
    const summary = item.querySelector('summary');
    summary.setAttribute('aria-expanded', String(expanded));
    const borders = parseFloat(getComputedStyle(item).borderTopWidth) +
      parseFloat(getComputedStyle(item).borderBottomWidth);
    const endHeight = expanded ? item.getBoundingClientRect().height : summary.offsetHeight + borders;
    const finish = () => {
      item.open = state.expanded;
      item.style.overflow = '';
      state.animation = null;
    };
    if (reducedMotion.matches) { finish(); return; }
    item.style.overflow = 'hidden';
    const animation = item.animate([
      { height: `${startHeight}px` },
      { height: `${endHeight}px` }
    ], { duration: 380, easing: 'cubic-bezier(.25,.1,.25,1)' });
    state.animation = animation;
    animation.onfinish = finish;
  }
  faqItems.forEach(item => {
    faqStates.set(item, { expanded: item.open, animation: null });
    // Manage exclusivity ourselves so the previous answer can animate closed.
    item.removeAttribute('name');
    const summary = item.querySelector('summary');
    summary.setAttribute('aria-expanded', String(item.open));
    summary.addEventListener('click', event => {
      event.preventDefault();
      const expanded = !faqStates.get(item).expanded;
      if (expanded) faqItems.forEach(other => { if (other !== item) setFaqOpen(other, false); });
      setFaqOpen(item, expanded);
    });
  });

  q('.scroll-cue').addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    event.preventDefault();
    const start = window.scrollY;
    const target = q('#cap-2');
    const end = Math.min(start + target.getBoundingClientRect().top,
      document.documentElement.scrollHeight - window.innerHeight);
    const startedAt = performance.now();
    const duration = 3000;
    function step(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      window.scrollTo({ top: start + (end - start) * eased, behavior: 'instant' });
      if (progress < 1) requestAnimationFrame(step);
      else {
        history.pushState(null, '', '#cap-2');
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    }
    requestAnimationFrame(step);
  });

  function updateLetter() {
    const name = q('#traveller-name').value.trim();
    const period = q('#travel-period').value.trim();
    const dreams = qa('[data-dream][aria-pressed="true"]').map(el => el.dataset.dream).join(', ').replace(/, ([^,]*)$/, ' e $1');
    const letter = `Shalom Isacco! Mi chiamo ${name || '…'} e vorrei venire in Israele ${q('#travel-size').value}${period ? ', nel periodo: ' + period : ''}.${dreams ? ' Sogno soprattutto ' + dreams + '.' : ''} Potresti inviarmi una proposta con costi e disponibilità? Grazie!`;
    q('[data-signature]').textContent = name || '…';
    q('[data-letter]').href = waOf(letter);
  }
  qa('#traveller-name,#travel-period,#travel-size').forEach(el => {
    el.addEventListener('input', updateLetter);
    el.addEventListener('change', updateLetter);
    el.disabled = false;
  });
  qa('[data-dream]').forEach(button => {
    button.addEventListener('click', () => {
      const selected = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(selected));
      updateLetter();
    });
    button.disabled = false;
  });
  updateLetter();
  q('[data-letter-label]').textContent = 'Invia la lettera su WhatsApp';

  let animation;
  qa('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      qa('[data-theme]').forEach(article => { article.hidden = button.dataset.filter !== 'all' && article.dataset.theme !== button.dataset.filter; });
      qa('[data-theme]:not([hidden]) [data-stop]').forEach((el,i) => el.style.setProperty('--image-order',i%2?2:0));
      qa('[data-filter]').forEach(el => {
        const selected = el === button;
        el.setAttribute('aria-pressed', String(selected));
      });
      animation?.layoutRoute();
      animation?.update();
    });
    button.hidden = false;
  });

  // Build decorative elements only. No content depends on this code.
  function element(tag, props, children = []) {
    const el = document.createElement(tag);
    if (props.className) el.className = props.className;
    for (const [key,value] of Object.entries(props.style || {})) {
      const cssKey = key.startsWith('--') ? key : key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
      el.style.setProperty(cssKey, typeof value === 'number' && !['opacity','zIndex'].includes(key) ? value+'px' : String(value));
    }
    el.append(...children);
    return el;
  }
  class Animation {
    q(selector) { return q(selector); }
    qa(selector) { return qa(selector); }
    motionOn() { return !this.media.matches; }
    constructor() {
      this.media = matchMedia('(prefers-reduced-motion: reduce)');
      const decorations = {starsHero:this.makeStars(150,7,true,.72),starsDawn:this.makeStars(70,21,false,1),starsDusk:this.makeStars(60,33,false,1),starsNight:this.makeStars(220,51,true,1),dust:this.makeDust(26,91)};
      for (const [name,el] of Object.entries(decorations)) q(`[data-decoration="${name}"]`).append(el);
      this.resize = () => { this.layoutRoute(); this.update(); };
      this.setMotion = () => {
        q('[data-hero]').style.height = this.motionOn() ? '260vh' : '100vh';
        if (!this.motionOn()) {
          this.qa('[data-rv]').forEach(el => { el.style.opacity='1';el.style.transform='none';el.style.filter='none';el.removeAttribute('data-rv-hidden'); });
          this.qa('[data-par]').forEach(el => el.style.transform='none');
        }
        this.resize();
      };
      this.media.addEventListener('change',this.setMotion);
      this.setMotion();
      this.initReveal();
      window.addEventListener('scroll',()=>{
        if (this.raf) return;
        this.raf=requestAnimationFrame(()=>{this.raf=0;this.update();});
      },{passive:true});
      window.addEventListener('resize',this.resize);
      window.addEventListener('load',this.resize);
      document.fonts?.ready.then(this.resize);
      this.update();
    }
  rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  makeStars(n, seed, shooting, spread) {
    const r = this.rng(seed), h = element, kids = [];
    for (let i = 0; i < n; i++) {
      const s = r() < 0.08 ? 2.4 + r() * 1.4 : 0.8 + r() * 1.4;
      kids.push(h('span', { className: 'star', style: { left: (r() * 100) + '%', top: (Math.pow(r(), 1.3) * 100 * spread) + '%', width: s, height: s, boxShadow: s > 2.2 ? '0 0 8px 2px rgba(255,236,200,.6)' : 'none', animation: `tw ${2.5 + r() * 4}s ease-in-out ${r() * 6}s infinite` } }));
    }
    if (shooting) kids.push(h('span', { className: 'shooting-star' }));
    return h('div', { className: 'particle-layer' }, kids);
  }

  makeDust(n, seed) {
    const r = this.rng(seed), h = element, kids = [];
    for (let i = 0; i < n; i++) {
      const s = 1.5 + r() * 2.5;
      kids.push(h('span', { className: 'dust-particle', style: { left: (30 + r() * 40) + '%', bottom: (r() * 20) + '%', width: s, height: s, '--dx': ((r() - 0.5) * 120) + 'px', animation: `drift ${9 + r() * 9}s linear ${-r() * 18}s infinite` } }));
    }
    return h('div', { className: 'particle-layer' }, kids);
  }

  initReveal() {
    const vh = innerHeight, on = this.motionOn();
    this.qa('[data-rv]').forEach(el => {
      if (el.dataset.rvInit) return;
      el.dataset.rvInit = '1';
      if (!on) return;
      const d = parseInt(el.getAttribute('data-rv') || '0', 10);
      el.style.transition = `opacity 1.2s ease ${d}ms, transform 1.4s cubic-bezier(.16,.8,.24,1) ${d}ms, filter 1.2s ease ${d}ms`;
      if (el.getBoundingClientRect().top > vh * 0.92) {
        el.style.opacity = '0'; el.style.transform = 'translateY(44px)'; el.style.filter = 'blur(6px)';
        el.setAttribute('data-rv-hidden', '1');
      }
    });
  }

  layoutRoute() {
    const map = this.q('[data-map]'), svg = this.q('[data-route-svg]'), path = this.q('[data-route]'), faint = this.q('[data-route-faint]');
    if (!map || !svg || !path) { this.routeLen = 0; return; }
    const mr = map.getBoundingClientRect(), W = mr.width, H = mr.height;
    const pts = this.qa('[data-stop]').filter(el => !el.closest('article').hidden).map(el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2 - mr.left, r.top + r.height / 2 - mr.top]; });
    const all = [[W / 2, 0], ...pts, [W / 2, H]];
    let d = `M${all[0][0]},${all[0][1]}`;
    for (let i = 1; i < all.length; i++) {
      const [x1, y1] = all[i - 1], [x2, y2] = all[i], dy = (y2 - y1) * 0.55;
      d += ` C${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}`;
    }
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    path.setAttribute('d', d); faint.setAttribute('d', d);
    this.routeLen = path.getTotalLength();
    path.style.strokeDasharray = this.routeLen;
  }

  update() {
    const vh = innerHeight, vw = document.documentElement.clientWidth, on = this.motionOn();
    const cl = v => Math.max(0, Math.min(1, v)), ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const hero = this.q('[data-hero]');
    if (hero) {
      const r = hero.getBoundingClientRect(), total = Math.max(1, hero.offsetHeight - vh);
      const p = on ? cl(-r.top / total) : 0, e = ease(cl(p / 0.78));
      const h0 = vh * 0.54, w0 = Math.min(vw * 0.8, h0 * 0.64);
      const w = w0 + (vw - w0) * e, h = h0 + (vh - h0) * e, L = (vw - w) / 2, T = vh - h;
      const rad = (w0 / 2) * Math.pow(1 - e, 1.4);
      const clip = this.q('[data-arch-clip]'), frame = this.q('[data-arch-frame]'), img = this.q('[data-hero-img]');
      if (clip) clip.style.clipPath = `inset(${T}px ${L}px 0px ${L}px round ${rad}px ${rad}px 0px 0px)`;
      if (frame) Object.assign(frame.style, { left: L + 'px', top: T + 'px', width: w + 'px', height: h + 'px', borderRadius: `${rad}px ${rad}px 0 0`, opacity: String(1 - e) });
      if (img) img.style.transform = `scale(${1.18 - 0.18 * e})`;
      const fade = 1 - cl(p * 3);
      this.qa('[data-hero-title],[data-hero-flank]').forEach(el => { el.style.opacity = String(fade); el.style.transform = `translateY(${-p * 160}px)`; });
      const cap = cl((p - 0.72) / 0.2), capEl = this.q('[data-hero-cap]'), shade = this.q('[data-hero-shade]');
      if (capEl) { capEl.style.opacity = String(cap); capEl.style.transform = `translateY(${(1 - cap) * 40}px)`; }
      if (shade) shade.style.opacity = String(cap);
    }
    if (on) this.qa('[data-par]').forEach(el => {
      const f = parseFloat(el.dataset.par), r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -vh || r.top > vh * 2) return;
      el.style.transform = `translate3d(0,${(r.top + r.height / 2 - vh / 2) * f}px,0)`;
    });
    this.qa('[data-rv-hidden]').forEach(el => {
      if (el.getBoundingClientRect().top < vh * 0.9) { el.style.opacity = '1'; el.style.transform = 'none'; el.style.filter = 'none'; el.removeAttribute('data-rv-hidden'); }
    });
    const map = this.q('[data-map]'), path = this.q('[data-route]'), lantern = this.q('[data-lantern]');
    if (map && path && this.routeLen) {
      const r = map.getBoundingClientRect(), p = on ? cl((vh * 0.6 - r.top) / r.height) : 1;
      path.style.strokeDashoffset = String(this.routeLen * (1 - p));
      if (lantern) { const pt = path.getPointAtLength(this.routeLen * p); lantern.style.transform = `translate(${pt.x}px,${pt.y}px)`; }
    }
    let ch = 1;
    this.qa('[data-ch]').forEach(el => { if (el.getBoundingClientRect().top < vh * 0.5) ch = +el.dataset.ch; });
    document.querySelector('.chapter-nav').hidden = ch === 1;
    this.qa('.chapter-nav a').forEach((a,i)=>{if(i+1===ch)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
    const activeChapter = this.q('.chapter-link[aria-current="location"]');
    if (ch !== 1 && activeChapter) this.q('.chapter-links').style.setProperty('--chapter-y', `${activeChapter.offsetTop}px`);
  }

  }
  animation = new Animation();
})();
