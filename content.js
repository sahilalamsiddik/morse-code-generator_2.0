

const MORSE = {
  A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',
  I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',
  Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',
  Y:'-.--',Z:'--..',
  '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-',
  '5':'.....','6':'-....','7':'--...','8':'---..',  '9':'----.',
  '.':'.-.-.-',',':'--..--','?':'..--..','!':'-.-.--',
  "'":'.----.','/':'-..-.','(':'-.--.',')'  :'-.--.-',
  '&':'.-...',':':'---...',';':'-.-.-.','-':'-....-',
  '+':'.-.-.','=':'-...-','"':'.-..-.','@':'.--.-.'
};

function toMorse(text) {
  return text.toUpperCase().split('').map(c => {
    if (c === ' ') return '/';
    return MORSE[c] !== undefined ? MORSE[c] : c;
  }).join(' ');
}

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}

/* ---------- state ---------- */
let activeEl   = null;   // currently focused input
let btnEl      = null;   // the floating ·− button
let panelEl    = null;   // the panel
let hideTimer  = null;   // debounce for hiding btn

/* ---------- helpers --- */

function isTypable(el) {
  if (!el || el === document.body) return false;
  const tag = el.tagName;

  // Plain inputs / textareas
  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT') {
    const t = (el.type || 'text').toLowerCase();
    return !['password','hidden','submit','reset','button','file','checkbox','radio','range','color','date','time','number','search'].includes(t);
  }
  // contenteditable (WhatsApp, Telegram, Slack, Discord, Gmail compose, etc.)
  if (el.contentEditable === 'true' || el.getAttribute('contenteditable') === 'true') return true;
  // role=textbox
  if (el.getAttribute('role') === 'textbox') return true;

  return false;
}

function readText(el) {
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return el.value || '';
  // contenteditable — get visible text only (no HTML)
  return (el.innerText || el.textContent || '').replace(/\n/g, ' ').trim();
}

function writeText(el, text) {
  el.focus();

  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    // Use native setter so React / Vue state picks it up
    const proto = el.tagName === 'INPUT'
      ? window.HTMLInputElement.prototype
      : window.HTMLTextAreaElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value');
    if (setter && setter.set) setter.set.call(el, text);
    else el.value = text;
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    // contenteditable
    // Select all then insertText — triggers framework listeners
    document.execCommand('selectAll', false, null);
    const ok = document.execCommand('insertText', false, text);
    if (!ok) {
      // Fallback for browsers that block execCommand
      el.innerText = text;
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    }
  }
}

/* ---------- button ---------- */

function showButton(el) {
  if (btnEl && activeEl === el) return; // already shown for this element
  activeEl = el;
  removeButton();

  btnEl = document.createElement('div');
  btnEl.id = '__morse_btn__';
  btnEl.textContent = '·− Morse';
  btnEl.setAttribute('title', 'Convert to Morse Code');

  // Use FIXED so it never moves with page scroll
  // and stays glued to viewport coords
  positionButton(el);

  btnEl.addEventListener('mousedown', (e) => {
    e.preventDefault(); // don't steal focus from input
    e.stopPropagation();
    if (panelEl) closePanel();
    else openPanel(el);
  });

  document.body.appendChild(btnEl);
}

function positionButton(el) {
  if (!btnEl || !el) return;
  const r = el.getBoundingClientRect();
  // Place top-right corner of the input, slightly above it
  const top  = Math.max(4, r.top - 32);
  const left = Math.max(4, r.right - 90);
  btnEl.style.top  = top  + 'px';
  btnEl.style.left = left + 'px';
}

function removeButton() {
  if (btnEl) { btnEl.remove(); btnEl = null; }
  closePanel();
}

/* ---------- panel ---------- */

function openPanel(el) {
  if (panelEl) closePanel();

  const text  = readText(el);
  const morse = text ? toMorse(text) : '';

  panelEl = document.createElement('div');
  panelEl.id = '__morse_panel__';

  const r = el.getBoundingClientRect();
  const panelH = 230;
  const margin = 8;
  let top = r.top - panelH - margin;
  if (top < margin) top = r.bottom + margin;
  let left = r.left;
  // keep inside viewport
  const vpW = window.innerWidth;
  if (left + 320 > vpW - margin) left = vpW - 320 - margin;
  if (left < margin) left = margin;

  panelEl.style.top  = top  + 'px';
  panelEl.style.left = left + 'px';

  panelEl.innerHTML = `
    <div class="mp-head">
      <span class="mp-title">·− MORSE CONVERTER</span>
      <button class="mp-close" title="Close">✕</button>
    </div>
    <div class="mp-body">
      <div class="mp-row">
        <div class="mp-lbl">YOUR TEXT</div>
        <div class="mp-src">${esc(text) || '<i>Start typing in the chat box…</i>'}</div>
      </div>
      <div class="mp-row">
        <div class="mp-lbl">MORSE CODE</div>
        <div class="mp-out">${esc(morse) || '<i>—</i>'}</div>
      </div>
      <div class="mp-btns">
        <button class="mp-btn mp-copy" ${morse?'':'disabled'}>📋 Copy</button>
        <button class="mp-btn mp-replace" ${morse?'':'disabled'}>⚡ Replace & Send</button>
      </div>
      <div class="mp-status"></div>
    </div>
  `;

  document.body.appendChild(panelEl);

  // wire close
  panelEl.querySelector('.mp-close').addEventListener('mousedown', e => {
    e.preventDefault(); e.stopPropagation(); closePanel();
  });

  // wire copy
  panelEl.querySelector('.mp-copy').addEventListener('mousedown', async e => {
    e.preventDefault(); e.stopPropagation();
    const m = panelEl.querySelector('.mp-out').textContent;
    try {
      await navigator.clipboard.writeText(m);
      flash('✅ Copied to clipboard!');
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = m; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
      flash('✅ Copied!');
    }
  });

  // wire replace+send
  panelEl.querySelector('.mp-replace').addEventListener('mousedown', e => {
    e.preventDefault(); e.stopPropagation();
    const m = panelEl.querySelector('.mp-out').textContent;
    if (!m || m === '—') return;
    writeText(el, m);
    flash('⚡ Replaced! Press Enter to send.', true);
    setTimeout(() => {
      closePanel();
      el.focus();
    }, 800);
  });
}

function updatePanel(el) {
  if (!panelEl) return;
  const text  = readText(el);
  const morse = text ? toMorse(text) : '';
  const src  = panelEl.querySelector('.mp-src');
  const out  = panelEl.querySelector('.mp-out');
  const copy = panelEl.querySelector('.mp-copy');
  const rep  = panelEl.querySelector('.mp-replace');
  if (src) src.innerHTML = esc(text)  || '<i>Start typing in the chat box…</i>';
  if (out) out.innerHTML = esc(morse) || '<i>—</i>';
  if (copy) copy.disabled = !morse;
  if (rep)  rep.disabled  = !morse;
}

function flash(msg, keep) {
  if (!panelEl) return;
  const s = panelEl.querySelector('.mp-status');
  if (!s) return;
  s.textContent = msg;
  s.style.opacity = '1';
  if (!keep) setTimeout(() => { if (s) s.style.opacity = '0'; }, 2000);
}

function closePanel() {
  if (panelEl) { panelEl.remove(); panelEl = null; }
}

/* ---------- events ---------- */

document.addEventListener('focusin', e => {
  clearTimeout(hideTimer);
  if (isTypable(e.target)) {
    showButton(e.target);
  } else if (!panelEl) {
    // clicked something unrelated — hide button
    hideTimer = setTimeout(removeButton, 200);
  }
}, true);

document.addEventListener('focusout', e => {
  // Delay so mousedown on btn/panel fires first
  hideTimer = setTimeout(() => {
    const f = document.activeElement;
    const inPanel = panelEl && panelEl.contains(f);
    const isBtn   = f === btnEl;
    if (!inPanel && !isBtn && !isTypable(f)) {
      removeButton();
    }
  }, 200);
}, true);

document.addEventListener('input', e => {
  if (e.target === activeEl) updatePanel(e.target);
}, true);

// Reposition button when page scrolls or resizes
window.addEventListener('scroll', () => { if (btnEl && activeEl) positionButton(activeEl); }, true);
window.addEventListener('resize', ()  => { if (btnEl && activeEl) positionButton(activeEl); });

// Clicking outside panel closes it (but don't close if clicking the input)
document.addEventListener('mousedown', e => {
  if (!panelEl) return;
  if (panelEl.contains(e.target)) return;
  if (e.target === btnEl || (btnEl && btnEl.contains(e.target))) return;
  closePanel();
}, true);

/* ---------- SPA / dynamic DOM: watch for new inputs ---------- */
const mo = new MutationObserver(() => {
  // nothing needed — focusin covers new inputs automatically
  // but we re-check activeEl still exists in DOM
  if (activeEl && !document.contains(activeEl)) {
    removeButton();
    activeEl = null;
  }
});
mo.observe(document.body, { childList: true, subtree: true });
