(function () {
  'use strict';

  const config = window.TranBienSeoAdminConfig || {};
  const section = document.getElementById('articles');
  const grid = document.getElementById('articleGrid');

  if (!section || !grid || !config.apiUrl) return;

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

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const renderArticles = (articles) => {
    if (!articles.length) {
      section.hidden = true;
      return;
    }

    grid.innerHTML = articles.slice(0, 9).map((article) => {
      const score = Number(article.seoScore || 0);
      const ref = article.slug || article.id || '';
      const href = ref ? `bai-viet.html?${article.slug ? 'slug' : 'id'}=${encodeURIComponent(ref)}` : '#';
      return `
        <a class="article-card reveal" href="${escapeHtml(href)}">
          <div class="article-card__media">
            ${article.thumbnailUrl
              ? `<img src="${escapeHtml(normalizeDriveImageUrl(article.thumbnailUrl))}" alt="${escapeHtml(article.thumbnailAlt || article.title)}" loading="lazy">`
              : '<div class="article-card__placeholder"></div>'}
            <span class="article-card__score">${score || '--'} SEO</span>
          </div>
          <div class="article-card__body">
            <span class="article-card__meta">${escapeHtml(article.focusKeyword || 'Trấn Biên Web')} · ${formatDate(article.updatedAt)}</span>
            <h3>${escapeHtml(article.title || 'Bài viết SEO')}</h3>
            <p>${escapeHtml(article.metaDescription || 'Nội dung SEO mới từ Trấn Biên Web.')}</p>
          </div>
        </a>
      `;
    }).join('');

    section.hidden = false;
    section.querySelectorAll('.reveal').forEach((item) => item.classList.add('in'));
  };

  const loadLocalArticles = () => {
    const key = config.localArticlesKey || 'tranbienweb:seo-admin-local-articles';
    try {
      const articles = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(articles) && articles.length) renderArticles(articles);
    } catch (err) {
      // Local drafts are optional.
    }
  };

  const loadArticles = async () => {
    loadLocalArticles();

    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'listArticles');

    // fetch() cross-origin không gửi cookie nên tránh được lỗi chọn tài khoản Google khi đăng nhập nhiều account.
    try {
      const res = await fetch(url.toString(), { method: 'GET' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const response = await res.json();
      const articles = response && response.ok && response.data ? response.data.articles || [] : [];
      if (articles.length) renderArticles(articles);
      else if (!grid.children.length) section.hidden = true;
    } catch (err) {
      if (!grid.children.length) section.hidden = true;
    }
  };

  loadArticles();
})();
