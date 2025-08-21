// js/meaning-box.js — Meaning Box popup (minor hardening)
class MeaningBox {
  constructor() {
    this.visible = false;
    this.overlay = null;
    this.box = null;
    this.init();
  }

  init() { this.createElements(); this.setupEventListeners(); }

  createElements() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'meaning-overlay';
    this.overlay.style.display = 'none';

    this.box = document.createElement('div');
    this.box.className = 'meaning-box';
    // Static skeleton is safe as HTML
    this.box.innerHTML = `
      <div class="meaning-header">
        <h3 class="gurmukhi-line"></h3>
        <button class="close-btn" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true" focusable="false">
            <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="meaning-content">
        <div class="translation-section" style="display: none;">
          <h4>Translation</h4>
          <p class="translation-text"></p>
        </div>
        <div class="transliteration-section" style="display: none;">
          <h4>Transliteration</h4>
          <p class="transliteration-text"></p>
        </div>
        <div class="etymology-section" style="display: none;">
          <h4>Word Meanings</h4>
          <div class="etymology-text"></div>
        </div>
      </div>
    `;

    this.overlay.appendChild(this.box);
    document.body.appendChild(this.overlay);
  }

  setupEventListeners() {
    // Close on overlay click
    this.overlay.addEventListener('click', (e) => { if (e.target === this.overlay) this.hide(); });

    // Close button
    const closeBtn = this.box.querySelector('.close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.hide());

    // Escape key
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.visible) this.hide(); });
  }

  show(data) {
    const setText = (sel, txt) => {
      const el = this.box.querySelector(sel);
      if (!el) return;
      // textContent to avoid injection
      el.textContent = (txt || '').toString();
    };

    setText('.gurmukhi-line', data.gurmukhiText || '');

    // Translation
    const translationSection = this.box.querySelector('.translation-section');
    const translationText = (data.customTranslation || data.translation || '').toString();
    if (translationText) {
      setText('.translation-text', translationText);
      translationSection.style.display = 'block';
    } else translationSection.style.display = 'none';

    // Transliteration
    const transliterationSection = this.box.querySelector('.transliteration-section');
    if (data.transliteration) {
      setText('.transliteration-text', data.transliteration);
      transliterationSection.style.display = 'block';
    } else transliterationSection.style.display = 'none';

    // Etymology
    const etymologySection = this.box.querySelector('.etymology-section');
    if (data.etymology) {
      setText('.etymology-text', data.etymology);
      etymologySection.style.display = 'block';
    } else etymologySection.style.display = 'none';

    // Show the overlay
    this.overlay.style.display = 'flex';
    this.visible = true;
    document.body.style.overflow = 'hidden';
  }

  hide() {
    this.overlay.style.display = 'none';
    this.visible = false;
    document.body.style.overflow = '';
  }
}
window.MeaningBox = MeaningBox;