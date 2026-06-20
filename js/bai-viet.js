(function () {
  'use strict';

  const config = window.TranBienSeoAdminConfig || {};
  const elState = document.getElementById('postState');
  const elArticle = document.getElementById('postArticle');
  const elCrumb = document.getElementById('postCrumb');
  const elTitle = document.getElementById('postTitle');
  const elMetaKeyword = document.getElementById('postMetaKeyword');
  const elMetaDate = document.getElementById('postMetaDate');
  const elMetaRead = document.getElementById('postMetaRead');
  const elCover = document.getElementById('postCover');
  const elCoverImg = document.getElementById('postCoverImg');
  const elBody = document.getElementById('postBody');

  const escapeHtml = (value) =>
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const normalizeDriveImageUrl = (url) => {
    const str = String(url || '');
    if (!/drive\.google\.com/.test(str)) return str;
    const idMatch = str.match(/id=([\w-]+)/) || str.match(/\/file\/d\/([\w-]+)/) || str.match(/\/d\/([\w-]+)/);
    if (!idMatch) return str;
    return 'https://drive.google.com/thumbnail?id=' + idMatch[1] + '&sz=w1600';
  };

  // Rewrite every Google Drive <img src> inside stored HTML to the embeddable thumbnail link.
  const normalizeHtmlImages = (html) =>
    String(html || '').replace(/(<img\b[^>]*\bsrc=")([^"]+)(")/gi, (match, pre, src, post) =>
      pre + normalizeDriveImageUrl(src) + post
    );

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getParam = (name) => new URLSearchParams(window.location.search).get(name) || '';

  const showState = (message) => {
    if (elArticle) elArticle.hidden = true;
    if (elState) {
      elState.hidden = false;
      elState.textContent = message;
    }
  };

  const setMeta = (article) => {
    const title = article.metaTitle || article.title || 'Bài viết';
    document.title = title + ' — Trấn Biên Web';
    const desc = article.metaDescription || '';
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', desc);
  };

  const render = (article) => {
    setMeta(article);

    if (elCrumb) elCrumb.textContent = article.focusKeyword || 'Góc kiến thức';
    if (elTitle) elTitle.textContent = article.title || 'Bài viết';

    if (elMetaKeyword) elMetaKeyword.textContent = article.focusKeyword || 'Trấn Biên Web';
    const dateText = formatDate(article.updatedAt || article.createdAt);
    if (elMetaDate) elMetaDate.textContent = dateText || '';
    const words = Number(article.wordCount || 0);
    if (elMetaRead) {
      if (words > 0) elMetaRead.textContent = Math.max(1, Math.round(words / 200)) + ' phút đọc';
      else elMetaRead.hidden = true;
    }

    const coverUrl = normalizeDriveImageUrl(article.thumbnailUrl);
    if (coverUrl && elCover && elCoverImg) {
      elCoverImg.src = coverUrl;
      elCoverImg.alt = article.thumbnailAlt || article.title || 'Ảnh bài viết';
      elCover.hidden = false;
    }

    if (elBody) {
      elBody.innerHTML = normalizeHtmlImages(article.contentHtml || '');
    }

    if (elState) elState.hidden = true;
    if (elArticle) elArticle.hidden = false;
  };

  const load = async () => {
    const slug = getParam('slug');
    const id = getParam('id');

    if (!slug && !id) {
      showState('Không tìm thấy bài viết.');
      return;
    }
    if (!config.apiUrl) {
      showState('Chưa cấu hình kết nối dữ liệu.');
      return;
    }

    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'getArticle');
    if (slug) url.searchParams.set('slug', slug);
    if (id) url.searchParams.set('id', id);

    // fetch() cross-origin không gửi cookie nên tránh được lỗi chọn tài khoản Google khi đăng nhập nhiều account.
    try {
      const res = await fetch(url.toString(), { method: 'GET' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const article = data && data.ok && data.data ? data.data.article : null;
      if (article) render(article);
      else showState('Bài viết không tồn tại hoặc đã bị gỡ.');
    } catch (err) {
      showState('Không tải được bài viết. Vui lòng thử lại.');
    }
  };

  load();
})();
