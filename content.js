// Morse Code Dictionary
const MORSE_CODE = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
  'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
  'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
  'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
  'Y': '-.--', 'Z': '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
  '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
  '"': '.-..-.', '$': '...-..-', '@': '.--.-.'
};

function textToMorse(text) {
  return text.toUpperCase().split('').map(char => {
    if (char === ' ') return '/';
    return MORSE_CODE[char] || char;
  }).join(' ');
}

// Track focused input elements
let activeInput = null;
let morseButton = null;
let morsePanel = null;

function isMessagingInput(el) {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag !== 'input' && tag !== 'textarea' && el.contentEditable !== 'true') return false;

  // Exclude password/hidden/search inputs
  if (el.type === 'password' || el.type === 'hidden' || el.type === 'search') return false;

  const role = (el.getAttribute('role') || '').toLowerCase();
  const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
  const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
  const className = (el.className || '').toLowerCase();

  const messagingKeywords = ['message', 'chat', 'reply', 'type', 'compose', 'input', 'text', 'send', 'write', 'comment'];
  const combined = placeholder + role + ariaLabel + className;

  const isTextbox = role === 'textbox' || tag === 'textarea';
  const hasKeyword = messagingKeywords.some(k => combined.includes(k));
  const isContentEditable = el.contentEditable === 'true';

  return isTextbox || hasKeyword || isContentEditable;
}

function getInputValue(el) {
  if (el.contentEditable === 'true') return el.innerText || el.textContent || '';
  return el.value || '';
}

function setInputValue(el, value) {
  if (el.contentEditable === 'true') {
    el.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, value);
  } else {
    el.focus();
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') ||
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
    if (nativeInputValueSetter) {
      nativeInputValueSetter.set.call(el, value);
    } else {
      el.value = value;
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function removeButton() {
  if (morseButton) { morseButton.remove(); morseButton = null; }
  if (morsePanel) { morsePanel.remove(); morsePanel = null; }
}

function createMorseButton(input) {
  removeButton();
  activeInput = input;

  const rect = input.getBoundingClientRect();
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  // Create floating button
  morseButton = document.createElement('div');
  morseButton.className = 'morse-btn';
  morseButton.innerHTML = `<span class="morse-btn-icon">·−</span><span class="morse-btn-label">Morse</span>`;
  morseButton.title = 'Convert to Morse Code';

  morseButton.style.position = 'absolute';
  morseButton.style.left = (rect.right + scrollX - 72) + 'px';
  morseButton.style.top = (rect.top + scrollY - 34) + 'px';
  morseButton.style.zIndex = '2147483647';

  morseButton.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePanel(input, rect, scrollX, scrollY);
  });

  document.body.appendChild(morseButton);
}

function togglePanel(input, rect, scrollX, scrollY) {
  if (morsePanel) {
    morsePanel.remove();
    morsePanel = null;
    return;
  }

  const text = getInputValue(input);
  const morse = text ? textToMorse(text) : '';

  morsePanel = document.createElement('div');
  morsePanel.className = 'morse-panel';
  morsePanel.style.position = 'absolute';

  // Position panel above or below input
  const panelHeight = 220;
  let top = rect.top + scrollY - panelHeight - 10;
  if (top < scrollY + 10) top = rect.bottom + scrollY + 10;

  morsePanel.style.left = Math.max(10, rect.left + scrollX - 10) + 'px';
  morsePanel.style.top = top + 'px';
  morsePanel.style.zIndex = '2147483646';

  morsePanel.innerHTML = `
    <div class="morse-panel-header">
      <span class="morse-panel-title">⠿ MORSE CONVERTER</span>
      <button class="morse-close-btn">✕</button>
    </div>
    <div class="morse-panel-body">
      <div class="morse-section">
        <label class="morse-label">ORIGINAL TEXT</label>
        <div class="morse-text-preview">${escapeHtml(text) || '<span class="morse-empty">Type something in the field below...</span>'}</div>
      </div>
      <div class="morse-section">
        <label class="morse-label">MORSE CODE</label>
        <div class="morse-output">${escapeHtml(morse) || '<span class="morse-empty">—</span>'}</div>
      </div>
      <div class="morse-actions">
        <button class="morse-action-btn morse-copy-btn" ${!morse ? 'disabled' : ''}>📋 Copy Morse</button>
        <button class="morse-action-btn morse-send-btn" ${!morse ? 'disabled' : ''}>⚡ Replace & Send</button>
      </div>
    </div>
  `;

  document.body.appendChild(morsePanel);

  morsePanel.querySelector('.morse-close-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    morsePanel.remove();
    morsePanel = null;
  });

  morsePanel.querySelector('.morse-copy-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!morse) return;
    navigator.clipboard.writeText(morse).then(() => {
      const btn = morsePanel.querySelector('.morse-copy-btn');
      btn.textContent = '✅ Copied!';
      setTimeout(() => { if (btn) btn.textContent = '📋 Copy Morse'; }, 2000);
    });
  });

  morsePanel.querySelector('.morse-send-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!morse) return;
    setInputValue(input, morse);
    morsePanel.remove();
    morsePanel = null;
    // Flash success
    if (morseButton) {
      morseButton.classList.add('morse-btn-success');
      setTimeout(() => morseButton && morseButton.classList.remove('morse-btn-success'), 1500);
    }
    // Try to find and click Send button
    setTimeout(() => trySubmit(input), 100);
  });
}

function trySubmit(input) {
  // Try pressing Enter
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', keyCode: 13, bubbles: true }));
}

function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// Event listeners
document.addEventListener('focusin', (e) => {
  if (isMessagingInput(e.target)) {
    createMorseButton(e.target);
  } else {
    if (!morsePanel) removeButton();
  }
});

document.addEventListener('focusout', (e) => {
  setTimeout(() => {
    const focused = document.activeElement;
    if (!morsePanel && focused !== morseButton && !morseButton?.contains(focused)) {
      removeButton();
    }
  }, 200);
});

document.addEventListener('click', (e) => {
  if (morsePanel && !morsePanel.contains(e.target) && e.target !== morseButton && !morseButton?.contains(e.target)) {
    morsePanel.remove();
    morsePanel = null;
  }
});

// Update panel when input changes
document.addEventListener('input', (e) => {
  if (e.target === activeInput && morsePanel) {
    const text = getInputValue(e.target);
    const morse = text ? textToMorse(text) : '';

    const preview = morsePanel.querySelector('.morse-text-preview');
    const output = morsePanel.querySelector('.morse-output');
    const copyBtn = morsePanel.querySelector('.morse-copy-btn');
    const sendBtn = morsePanel.querySelector('.morse-send-btn');

    if (preview) preview.innerHTML = escapeHtml(text) || '<span class="morse-empty">Type something in the field below...</span>';
    if (output) output.innerHTML = escapeHtml(morse) || '<span class="morse-empty">—</span>';
    if (copyBtn) copyBtn.disabled = !morse;
    if (sendBtn) sendBtn.disabled = !morse;
  }
});

window.addEventListener('scroll', () => {
  if (activeInput) createMorseButton(activeInput);
}, true);

window.addEventListener('resize', () => {
  if (activeInput) createMorseButton(activeInput);
});
