(function () {
  'use strict';

  const config = window.TranBienSeoAdminConfig || {};
  const configuredApiUrl = () => localStorage.getItem(config.apiUrlKey || 'tranbienweb:seo-admin-api-url') || config.apiUrl || '';
  const apiReady = () => {
    const url = configuredApiUrl();
    return Boolean(url && !url.includes('PASTE_'));
  };
  const sessionKey = config.sessionKey || 'tranbienweb:seo-admin-session';

  const $ = (selector) => document.querySelector(selector);

  const state = {
    session: readSession(),
    lastAnalysis: null,
    uploadedImages: [],
    editorMode: 'text',
  };

  const els = {
    loginPanel: $('#loginPanel'),
    editorPage: $('#editorPage'),
    loginForm: $('#loginForm'),
    loginBtn: $('#loginBtn'),
    loginAlert: $('#loginAlert'),
    loginSetupNote: $('#loginSetupNote'),
    editorSetupNote: $('#editorSetupNote'),
    logoutBtn: $('#logoutBtn'),
    sheetLink: $('#sheetLink'),
    articleForm: $('#articleForm'),
    articleId: $('#articleId'),
    title: $('#titleInput'),
    slug: $('#slugInput'),
    focusKeyword: $('#focusKeywordInput'),
    secondaryKeywords: $('#secondaryKeywordsInput'),
    metaTitle: $('#metaTitleInput'),
    metaTitleCount: $('#metaTitleCount'),
    metaDescription: $('#metaDescriptionInput'),
    metaDescriptionCount: $('#metaDescriptionCount'),
    thumbnailFile: $('#thumbnailFileInput'),
    thumbnailUrl: $('#thumbnailUrlInput'),
    thumbnailAlt: $('#thumbnailAltInput'),
    contentImage: $('#contentImageInput'),
    content: $('#contentInput'),
    contentLabel: $('#contentLabel'),
    editorModeHint: $('#editorModeHint'),
    preview: $('#preview'),
    imageBtn: $('#imageBtn'),
    linkBtn: $('#linkBtn'),
    saveBtn: $('#saveBtn'),
    saveStatus: $('#saveStatus'),
    scoreRing: $('#scoreRing'),
    scoreSummary: $('#scoreSummary'),
    wordCount: $('#wordCount'),
    keywordDensity: $('#keywordDensity'),
    readabilityScore: $('#readabilityScore'),
    basicChecks: $('#basicChecks'),
    contentChecks: $('#contentChecks'),
    mediaChecks: $('#mediaChecks'),
    modal: $('#adminModal'),
    modalTitle: $('#modalTitle'),
    modalMessage: $('#modalMessage'),
    modalField: $('#modalField'),
    modalInputLabel: $('#modalInputLabel'),
    modalInput: $('#modalInput'),
    modalCancel: $('#modalCancel'),
    modalConfirm: $('#modalConfirm'),
  };

  if (config.spreadsheetId) {
    els.sheetLink.href = `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`;
  }

  if (!apiReady()) {
    els.loginSetupNote.classList.remove('is-visible');
    els.editorSetupNote.classList.remove('is-visible');
  }

  function readSession() {
    try {
      const raw = localStorage.getItem(sessionKey);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session.token || Date.now() > Number(session.expiresAt)) {
        localStorage.removeItem(sessionKey);
        return null;
      }
      return session;
    } catch (err) {
      localStorage.removeItem(sessionKey);
      return null;
    }
  }

  function writeSession(session) {
    localStorage.setItem(sessionKey, JSON.stringify(session));
    state.session = session;
  }

  function clearSession() {
    localStorage.removeItem(sessionKey);
    state.session = null;
  }

  async function api(action, payload) {
    if (!apiReady()) throw new Error('API_NOT_CONFIGURED');

    const requestId = `tbw_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const request = {
      requestId,
      action,
      payload: payload || {},
      token: state.session ? state.session.token : '',
    };

    return new Promise((resolve, reject) => {
      const iframeName = `tbw_api_${requestId}`;
      const iframe = document.createElement('iframe');
      const form = document.createElement('form');
      const input = document.createElement('input');
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error('API_TIMEOUT'));
      }, 45000);

      function cleanup() {
        window.clearTimeout(timer);
        window.removeEventListener('message', onMessage);
        iframe.remove();
        form.remove();
      }

      function onMessage(event) {
        const data = event.data || {};
        if (!data.__tranBienSeoAdmin || data.requestId !== requestId) return;
        cleanup();
        if (!data.ok) {
          reject(new Error(data.error || 'API_ERROR'));
          return;
        }
        resolve(data.data);
      }

      window.addEventListener('message', onMessage);

      iframe.name = iframeName;
      iframe.hidden = true;
      form.hidden = true;
      form.method = 'POST';
      form.action = configuredApiUrl();
      form.target = iframeName;
      input.type = 'hidden';
      input.name = 'request';
      input.value = JSON.stringify(request);
      form.appendChild(input);
      document.body.appendChild(iframe);
      document.body.appendChild(form);
      form.submit();
    });
  }

  function showLogin() {
    document.body.classList.add('admin-locked');
    els.loginPanel.hidden = false;
    els.editorPage.hidden = false;
  }

  function showEditor() {
    document.body.classList.remove('admin-locked');
    els.loginPanel.hidden = true;
    els.editorPage.hidden = false;
    updateAll();
  }

  function showInline(el, message, good) {
    el.textContent = message;
    el.style.color = good ? '#067647' : '#8A3A00';
    el.style.background = good ? 'rgba(6, 118, 71, 0.1)' : 'rgba(245, 161, 30, 0.14)';
    el.classList.add('is-visible');
  }

  function hideInline(el) {
    el.textContent = '';
    el.classList.remove('is-visible');
  }

  function openModal(options) {
    return new Promise((resolve) => {
      const {
        title = 'Thông báo',
        message = '',
        inputLabel = '',
        inputValue = '',
        confirmText = 'Đồng ý',
        cancelText = 'Hủy',
        showCancel = true,
      } = options || {};

      els.modalTitle.textContent = title;
      els.modalMessage.textContent = message;
      els.modalConfirm.textContent = confirmText;
      els.modalCancel.textContent = cancelText;
      els.modalCancel.hidden = !showCancel;
      els.modalField.hidden = !inputLabel;
      els.modalInputLabel.textContent = inputLabel;
      els.modalInput.value = inputValue || '';
      els.modal.hidden = false;

      const cleanup = (value) => {
        els.modal.hidden = true;
        els.modalConfirm.removeEventListener('click', onConfirm);
        els.modalCancel.removeEventListener('click', onCancel);
        els.modal.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKeydown);
        resolve(value);
      };

      const onConfirm = () => cleanup(inputLabel ? els.modalInput.value.trim() : true);
      const onCancel = () => cleanup(null);
      const onBackdrop = (event) => {
        if (event.target.matches('[data-modal-cancel]')) cleanup(null);
      };
      const onKeydown = (event) => {
        if (event.key === 'Escape') cleanup(null);
        if (event.key === 'Enter' && inputLabel && document.activeElement === els.modalInput) {
          event.preventDefault();
          onConfirm();
        }
      };

      els.modalConfirm.addEventListener('click', onConfirm);
      els.modalCancel.addEventListener('click', onCancel);
      els.modal.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKeydown);

      if (inputLabel) {
        window.setTimeout(() => {
          els.modalInput.focus();
          els.modalInput.select();
        }, 40);
      } else {
        window.setTimeout(() => els.modalConfirm.focus(), 40);
      }
    });
  }

  function notify(title, message, good) {
    return openModal({
      title,
      message,
      confirmText: good ? 'Tuyệt' : 'Đã hiểu',
      showCancel: false,
    });
  }

  function handleLogin() {
    hideInline(els.loginAlert);
    const button = els.loginBtn;
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Đang đăng nhập...';

    try {
      const formData = Object.fromEntries(new FormData(els.loginForm));
      const email = String(formData.email || '').trim().toLowerCase();
      const password = String(formData.password || '');
      const validEmail = String(config.adminEmail || '').trim().toLowerCase();
      const validPassword = String(config.adminPassword || '');

      if (email !== validEmail || password !== validPassword) {
        throw new Error('INVALID_LOGIN');
      }

      const sessionDays = Number(config.sessionDays || 90);
      writeSession({
        token: `local_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        email,
        expiresAt: Date.now() + sessionDays * 24 * 60 * 60 * 1000,
      });
      showEditor();
    } catch (err) {
      showInline(els.loginAlert, 'Email hoặc mật khẩu chưa đúng.');
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  els.loginBtn.addEventListener('click', handleLogin);
  els.loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    handleLogin();
  });

  els.logoutBtn.addEventListener('click', () => {
    clearSession();
    showLogin();
  });

  function slugify(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeDriveImageUrl(url) {
    const str = String(url || '');
    if (!/drive\.google\.com/.test(str)) return str;
    const idMatch = str.match(/id=([\w-]+)/) || str.match(/\/file\/d\/([\w-]+)/) || str.match(/\/d\/([\w-]+)/);
    if (!idMatch) return str;
    return 'https://drive.google.com/thumbnail?id=' + idMatch[1] + '&sz=w1600';
  }

  function inlineMarkdown(value) {
    return escapeHtml(value)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => `<img src="${normalizeDriveImageUrl(src)}" alt="${alt}" loading="lazy">`)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function markdownToHtml(markdown) {
    const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
    const html = [];
    let listOpen = false;
    const closeList = () => {
      if (listOpen) {
        html.push('</ul>');
        listOpen = false;
      }
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        closeList();
        return;
      }
      if (/^###\s+/.test(trimmed)) {
        closeList();
        html.push(`<h3>${inlineMarkdown(trimmed.replace(/^###\s+/, ''))}</h3>`);
        return;
      }
      if (/^##\s+/.test(trimmed)) {
        closeList();
        html.push(`<h2>${inlineMarkdown(trimmed.replace(/^##\s+/, ''))}</h2>`);
        return;
      }
      if (/^#\s+/.test(trimmed)) {
        closeList();
        html.push(`<h1>${inlineMarkdown(trimmed.replace(/^#\s+/, ''))}</h1>`);
        return;
      }
      if (/^[-*]\s+/.test(trimmed)) {
        if (!listOpen) {
          html.push('<ul>');
          listOpen = true;
        }
        html.push(`<li>${inlineMarkdown(trimmed.replace(/^[-*]\s+/, ''))}</li>`);
        return;
      }
      if (/^>\s+/.test(trimmed)) {
        closeList();
        html.push(`<blockquote>${inlineMarkdown(trimmed.replace(/^>\s+/, ''))}</blockquote>`);
        return;
      }
      closeList();
      html.push(`<p>${inlineMarkdown(trimmed)}</p>`);
    });

    closeList();
    return html.join('\n');
  }

  function htmlToMarkdown(html) {
    const template = document.createElement('template');
    template.innerHTML = String(html || '').trim();
    const lines = [];

    function textOf(node) {
      return String(node.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function walk(node) {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent.replace(/\s+/g, ' ').trim();
          if (text) lines.push(text);
          return;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) return;

        const tag = child.tagName.toLowerCase();
        const text = textOf(child);
        if (!text && tag !== 'img' && tag !== 'br') return;

        if (tag === 'h1') lines.push(`# ${text}`);
        else if (tag === 'h2') lines.push(`## ${text}`);
        else if (tag === 'h3') lines.push(`### ${text}`);
        else if (tag === 'li') lines.push(`- ${text}`);
        else if (tag === 'blockquote') lines.push(`> ${text}`);
        else if (tag === 'a') lines.push(`[${text}](${child.getAttribute('href') || '#'})`);
        else if (tag === 'img') {
          const src = child.getAttribute('src') || '';
          const alt = child.getAttribute('alt') || 'Ảnh bài viết';
          if (src) lines.push(`![${alt}](${src})`);
        } else if (tag === 'br') {
          lines.push('');
        } else if (['p', 'div', 'section', 'article'].includes(tag)) {
          lines.push(text);
        } else {
          walk(child);
        }
      });
    }

    walk(template.content);
    return lines
      .map((line) => line.trim())
      .filter((line, index, arr) => line || arr[index - 1])
      .join('\n\n')
      .trim();
  }

  function currentMarkdownContent() {
    return state.editorMode === 'html' ? htmlToMarkdown(els.content.value) : els.content.value;
  }

  function currentPreviewHtml() {
    return state.editorMode === 'html' ? els.content.value : markdownToHtml(els.content.value);
  }

  function setEditorMode(mode) {
    const nextMode = mode === 'html' ? 'html' : 'text';
    if (state.editorMode === nextMode) return;

    if (state.editorMode === 'text' && nextMode === 'html') {
      els.content.value = markdownToHtml(els.content.value);
    } else if (state.editorMode === 'html' && nextMode === 'text') {
      els.content.value = htmlToMarkdown(els.content.value);
    }

    state.editorMode = nextMode;
    document.querySelectorAll('[data-editor-mode]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.editorMode === nextMode);
    });
    els.contentLabel.textContent = nextMode === 'html' ? 'Nội dung HTML' : 'Nội dung SEO';
    els.editorModeHint.textContent = nextMode === 'html'
      ? 'Dán HTML vào đây, hệ thống sẽ tự chuyển về văn bản để dễ tối ưu SEO.'
      : 'Soạn nội dung dạng văn bản có định dạng bằng thanh công cụ.';
    updateAll();
  }

  function ensureTextMode() {
    if (state.editorMode === 'html') setEditorMode('text');
  }

  function countWords(text) {
    const words = String(text || '').trim().match(/\S+/g);
    return words ? words.length : 0;
  }

  function keywordRegex(keyword) {
    return new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  }

  function analyze() {
    const title = els.title.value.trim();
    const slug = els.slug.value.trim();
    const focus = els.focusKeyword.value.trim();
    const keyword = focus.toLowerCase();
    const metaTitle = els.metaTitle.value.trim();
    const metaDescription = els.metaDescription.value.trim();
    const thumbnailUrl = els.thumbnailUrl.value.trim();
    const thumbnailAlt = els.thumbnailAlt.value.trim();
    const content = currentMarkdownContent();
    const contentLower = content.toLowerCase();
    const titleLower = title.toLowerCase();
    const slugLower = slug.toLowerCase();
    const first100 = content.split(/\s+/).slice(0, 100).join(' ').toLowerCase();
    const wordCount = countWords(content);
    const keywordCount = keyword ? (content.match(keywordRegex(keyword)) || []).length : 0;
    const density = keyword && wordCount ? (keywordCount / wordCount) * 100 : 0;
    const headings = content.split('\n').filter((line) => /^#{2,3}\s+/.test(line));
    const h2HasKeyword = keyword && headings.some((line) => /^##\s+/.test(line) && line.toLowerCase().includes(keyword));
    const images = content.match(/!\[[^\]]*\]\([^)]+\)/g) || [];
    const internalLinks = content.match(/\]\((\/|https?:\/\/(www\.)?tranbienweb\.vn)/g) || [];
    const externalLinks = content.match(/https?:\/\/(?!([^/]+\.)?tranbienweb\.vn)/g) || [];
    const sentences = content.split(/[.!?]+/).map((item) => item.trim()).filter(Boolean);
    const avgSentence = sentences.length ? Math.round(wordCount / sentences.length) : 0;
    const readability = Math.max(0, Math.min(100, 100 - Math.max(0, avgSentence - 18) * 4));

    const groups = {
      basic: [
        ['Có từ khóa chính', Boolean(keyword), 8],
        ['Từ khóa chính nằm trong tiêu đề', keyword && titleLower.includes(keyword), 12],
        ['Slug chứa từ khóa chính', keyword && slugLower.includes(slugify(keyword)), 8],
        ['Meta title 45-65 ký tự', metaTitle.length >= 45 && metaTitle.length <= 65, 8],
        ['Meta description 120-165 ký tự', metaDescription.length >= 120 && metaDescription.length <= 165, 10],
      ],
      content: [
        ['Từ khóa xuất hiện trong 100 từ đầu', keyword && first100.includes(keyword), 10],
        ['Có H2 chứa từ khóa chính', h2HasKeyword, 8],
        ['Nội dung tối thiểu 800 từ', wordCount >= 800, 12],
        ['Mật độ từ khóa 0.5%-2.5%', density >= 0.5 && density <= 2.5, 8],
        ['Câu văn dễ đọc, trung bình dưới 22 từ/câu', avgSentence > 0 && avgSentence <= 22, 6],
      ],
      media: [
        ['Có thumbnail bài viết', Boolean(thumbnailUrl), 7],
        ['Alt thumbnail có mô tả rõ ràng', thumbnailAlt.length >= 12, 5],
        ['Có ảnh chèn trong nội dung', images.length > 0, 6],
        ['Có internal link về Trấn Biên Web', internalLinks.length > 0, 5],
        ['Có external link tham khảo', externalLinks.length > 0, 5],
      ],
    };

    const all = Object.values(groups).flat();
    const total = all.reduce((sum, item) => sum + item[2], 0);
    const passed = all.reduce((sum, item) => sum + (item[1] ? item[2] : 0), 0);
    const score = Math.round((passed / total) * 100);

    return {
      score,
      groups,
      wordCount,
      keywordCount,
      density: Number(density.toFixed(2)),
      readability,
      contentHtml: state.editorMode === 'html' ? els.content.value : markdownToHtml(content),
    };
  }

  function renderChecks(container, checks) {
    container.innerHTML = checks
      .map(([label, pass]) => `<div class="seo-check ${pass ? 'is-pass' : ''}">${escapeHtml(label)}</div>`)
      .join('');
  }

  function updateAll() {
    els.preview.innerHTML = currentPreviewHtml() || '<p>Preview bài viết sẽ hiện ở đây.</p>';
    els.metaTitleCount.textContent = `${els.metaTitle.value.length} ký tự`;
    els.metaDescriptionCount.textContent = `${els.metaDescription.value.length} ký tự`;

    const result = analyze();
    state.lastAnalysis = result;
    els.scoreRing.textContent = result.score;
    els.scoreRing.style.setProperty('--score', `${result.score}%`);
    els.scoreRing.classList.toggle('is-good', result.score >= 80);
    els.scoreRing.classList.toggle('is-bad', result.score < 50);
    els.scoreSummary.textContent = result.score >= 80
      ? 'Bài viết đã khá tốt để dùng cho SEO.'
      : result.score >= 60
        ? 'Bài viết ổn, vẫn nên tối ưu thêm vài mục.'
        : 'Bài viết cần bổ sung thêm tín hiệu SEO.';
    els.wordCount.textContent = result.wordCount.toLocaleString('vi-VN');
    els.keywordDensity.textContent = `${result.density}%`;
    els.readabilityScore.textContent = result.readability;
    renderChecks(els.basicChecks, result.groups.basic);
    renderChecks(els.contentChecks, result.groups.content);
    renderChecks(els.mediaChecks, result.groups.media);
  }

  function insertAtCursor(before, after) {
    ensureTextMode();
    const input = els.content;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = input.value.slice(start, end);
    input.value = `${input.value.slice(0, start)}${before}${selected}${after || ''}${input.value.slice(end)}`;
    input.focus();
    input.setSelectionRange(start + before.length, start + before.length + selected.length);
    updateAll();
  }

  document.querySelectorAll('[data-prefix]').forEach((button) => {
    button.addEventListener('click', () => insertAtCursor(button.dataset.prefix, ''));
  });

  document.querySelectorAll('[data-wrap]').forEach((button) => {
    button.addEventListener('click', () => insertAtCursor(button.dataset.wrap, button.dataset.wrap));
  });

  document.querySelectorAll('[data-editor-mode]').forEach((button) => {
    button.addEventListener('click', () => setEditorMode(button.dataset.editorMode));
  });

  els.content.addEventListener('paste', (event) => {
    if (state.editorMode !== 'html') return;
    const clipboard = event.clipboardData;
    if (!clipboard) return;
    const raw = clipboard.getData('text/html') || clipboard.getData('text/plain');
    if (!raw) return;
    event.preventDefault();

    const existing = htmlToMarkdown(els.content.value);
    const converted = htmlToMarkdown(raw);
    state.editorMode = 'text';
    document.querySelectorAll('[data-editor-mode]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.editorMode === 'text');
    });
    els.contentLabel.textContent = 'Nội dung SEO';
    els.editorModeHint.textContent = 'HTML vừa dán đã được chuyển thành văn bản để dễ tối ưu SEO.';

    els.content.value = existing;
    const start = els.content.value.length ? els.content.value.length + 2 : 0;
    els.content.value = `${els.content.value}${els.content.value ? '\n\n' : ''}${converted}`;
    els.content.focus();
    els.content.setSelectionRange(start + converted.length, start + converted.length);
    updateAll();
  });

  els.linkBtn.addEventListener('click', async () => {
    const url = await openModal({
      title: 'Chèn liên kết',
      message: 'Dán URL bạn muốn gắn vào đoạn văn bản đang chọn.',
      inputLabel: 'URL liên kết',
      inputValue: 'https://',
      confirmText: 'Chèn link',
    });
    if (url) insertAtCursor('[', `](${url})`);
  });

  els.imageBtn.addEventListener('click', () => els.contentImage.click());

  function convertImageToWebp(file, quality) {
    return new Promise((resolve) => {
      // Không phải ảnh hoặc đã là webp thì giữ nguyên.
      if (!file || !/^image\//.test(file.type) || file.type === 'image/webp') {
        resolve(file);
        return;
      }

      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              const webpName = file.name.replace(/\.[^.]+$/, '') + '.webp';
              resolve(new File([blob], webpName, { type: 'image/webp', lastModified: Date.now() }));
            },
            'image/webp',
            typeof quality === 'number' ? quality : 0.9
          );
        } catch (err) {
          resolve(file);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };

      img.src = url;
    });
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function saveLocalArticle(article) {
    const key = config.localArticlesKey || 'tranbienweb:seo-admin-local-articles';
    let articles = [];
    try {
      articles = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(articles)) articles = [];
    } catch (err) {
      articles = [];
    }

    const id = article.id || `local_${Date.now()}`;
    const safeThumbnail = String(article.thumbnailUrl || '').length < 600000 ? article.thumbnailUrl : '';
    const next = {
      id,
      title: article.title || '',
      slug: article.slug || '',
      thumbnailUrl: safeThumbnail,
      thumbnailAlt: article.thumbnailAlt || '',
      metaDescription: article.metaDescription || '',
      focusKeyword: article.focusKeyword || '',
      seoScore: article.seoScore || 0,
      status: 'published',
      updatedAt: new Date().toISOString(),
      authorEmail: config.adminEmail || 'tranbienweb@gmail.com',
    };
    const index = articles.findIndex((item) => item.id === id);
    if (index >= 0) articles[index] = next;
    else articles.unshift(next);
    localStorage.setItem(key, JSON.stringify(articles.slice(0, 12)));
    return next;
  }

  async function uploadFile(file, role) {
    if (!file) return null;
    if (!apiReady()) throw new Error('API_NOT_CONFIGURED');
    const base64 = await fileToBase64(file);
    return api('uploadImage', {
      fileName: file.name,
      mimeType: file.type,
      base64,
      role,
      articleId: els.articleId.value,
    });
  }

  els.thumbnailFile.addEventListener('change', async () => {
    const rawFile = els.thumbnailFile.files[0];
    if (!rawFile) return;
    showInline(els.saveStatus, 'Đang xử lý thumbnail...');
    try {
      const file = await convertImageToWebp(rawFile);
      const dataUrl = await fileToDataUrl(file);
      els.thumbnailUrl.value = dataUrl;
      if (!els.thumbnailAlt.value) els.thumbnailAlt.value = file.name.replace(/\.[^.]+$/, '');
      showInline(els.saveStatus, 'Đã xử lý thumbnail.', true);
      updateAll();

      if (apiReady()) {
        uploadFile(file, 'thumbnail')
          .then((media) => {
            if (els.thumbnailUrl.value === dataUrl) {
              els.thumbnailUrl.value = media.url;
              updateAll();
            }
          })
          .catch((err) => {
            console.warn('Background thumbnail upload failed:', err);
          });
      }
    } catch (err) {
      showInline(els.saveStatus, 'Không thể đọc thumbnail, hãy thử ảnh khác.', false);
    }
  });

  els.contentImage.addEventListener('change', async () => {
    const rawFile = els.contentImage.files[0];
    if (!rawFile) return;
    showInline(els.saveStatus, 'Đang xử lý ảnh nội dung...');
    try {
      const file = await convertImageToWebp(rawFile);
      const dataUrl = await fileToDataUrl(file);
      const localId = `local_${Date.now()}`;
      const media = {
        id: localId,
        name: file.name,
        url: dataUrl,
        role: 'content',
      };
      state.uploadedImages.push(media);
      const alt = await openModal({
        title: 'Alt text cho ảnh',
        message: 'Viết mô tả ngắn, rõ nghĩa để ảnh hỗ trợ SEO tốt hơn.',
        inputLabel: 'Alt text',
        inputValue: file.name.replace(/\.[^.]+$/, ''),
        confirmText: 'Chèn ảnh',
      }) || file.name.replace(/\.[^.]+$/, '');
      insertAtCursor(`\n![${alt}](${dataUrl})\n`, '');
      showInline(els.saveStatus, 'Đã chèn ảnh vào bài viết.', true);

      if (apiReady()) {
        uploadFile(file, 'content')
          .then((uploaded) => {
            const imageIndex = state.uploadedImages.findIndex((item) => item.id === localId);
            if (imageIndex >= 0) state.uploadedImages[imageIndex] = uploaded;
            els.content.value = els.content.value.split(dataUrl).join(uploaded.url);
            updateAll();
          })
          .catch((err) => {
            console.warn('Background content image upload failed:', err);
          });
      }
    } catch (err) {
      showInline(els.saveStatus, 'Không thể đọc ảnh, hãy thử ảnh khác.', false);
    } finally {
      els.contentImage.value = '';
    }
  });

  let slugTouched = false;
  els.title.addEventListener('input', () => {
    if (!slugTouched) els.slug.value = slugify(els.title.value);
    if (!els.metaTitle.value) els.metaTitle.value = els.title.value;
    updateAll();
  });
  els.slug.addEventListener('input', () => {
    slugTouched = true;
    els.slug.value = slugify(els.slug.value);
    updateAll();
  });

  [
    els.focusKeyword,
    els.secondaryKeywords,
    els.metaTitle,
    els.metaDescription,
    els.thumbnailUrl,
    els.thumbnailAlt,
    els.content,
  ].forEach((el) => el.addEventListener('input', updateAll));

  els.articleForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!els.articleForm.checkValidity()) {
      els.articleForm.reportValidity();
      return;
    }

    const original = els.saveBtn.textContent;
    els.saveBtn.disabled = true;
    els.saveBtn.textContent = 'Đang lưu...';
    hideInline(els.saveStatus);

    try {
      const analysis = analyze();
      const contentMarkdown = currentMarkdownContent();
      const payload = {
        id: els.articleId.value,
        title: els.title.value.trim(),
        slug: els.slug.value.trim(),
        thumbnailUrl: els.thumbnailUrl.value.trim(),
        thumbnailAlt: els.thumbnailAlt.value.trim(),
        contentMarkdown,
        contentHtml: analysis.contentHtml,
        focusKeyword: els.focusKeyword.value.trim(),
        secondaryKeywords: els.secondaryKeywords.value.trim(),
        imagesJson: JSON.stringify(state.uploadedImages),
        seoScore: analysis.score,
        seoChecksJson: JSON.stringify(analysis.groups),
        metaTitle: els.metaTitle.value.trim(),
        metaDescription: els.metaDescription.value.trim(),
        wordCount: analysis.wordCount,
        keywordDensity: analysis.density,
        readabilityScore: analysis.readability,
        status: 'published',
      };

      const localArticle = saveLocalArticle(payload);
      els.articleId.value = localArticle.id;
      showInline(els.saveStatus, 'Đã lưu và hiển thị bài viết.', true);

      if (apiReady()) {
        api('saveArticle', Object.assign({}, payload, { id: localArticle.id }))
          .then((data) => {
            els.articleId.value = data.article.id;
            showInline(els.saveStatus, 'Đã lưu và hiển thị bài viết.', true);
          })
          .catch((err) => {
            console.warn('Background article sync failed:', err);
          });
      }
    } catch (err) {
      showInline(els.saveStatus, 'Không thể lưu bài. Ảnh hoặc nội dung có thể quá nặng, hãy thử dùng ảnh nhỏ hơn.', false);
      await notify('Không thể lưu bài', 'Trình duyệt không lưu được bản tạm. Hãy thử dùng ảnh nhỏ hơn hoặc tải lại trang rồi lưu lại.', false);
    } finally {
      els.saveBtn.disabled = false;
      els.saveBtn.textContent = original;
    }
  });

  els.content.value = '## Mở đầu\n\nViết đoạn mở đầu có chứa từ khóa chính trong 100 từ đầu.\n\n## Nội dung chính\n\n- Ý chính đầu tiên\n- Ý chính thứ hai\n\n> Thêm nhận định hoặc lời khuyên nổi bật cho khách hàng.\n';

  if (state.session) showEditor();
  else showLogin();
})();
