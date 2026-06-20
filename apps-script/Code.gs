const CONFIG = {
  ADMIN_EMAIL: 'tranbienweb@gmail.com',
  ADMIN_PASSWORD: 'Tranbien@1234',
  SESSION_DAYS: 30,
  SPREADSHEET_ID: '17e6sqDXmcNN4UUeUZrSLwnZbaCuI1DIMhMkHiGr47ig',
  DRIVE_FOLDER_NAME: 'TranBienWeb SEO Admin Images',
};

const POST_HEADERS = [
  'id',
  'title',
  'slug',
  'thumbnailUrl',
  'thumbnailAlt',
  'contentMarkdown',
  'contentHtml',
  'focusKeyword',
  'secondaryKeywords',
  'imagesJson',
  'seoScore',
  'seoChecksJson',
  'metaTitle',
  'metaDescription',
  'wordCount',
  'keywordDensity',
  'readabilityScore',
  'status',
  'createdAt',
  'updatedAt',
  'authorEmail',
];

const MEDIA_HEADERS = [
  'id',
  'postId',
  'fileName',
  'url',
  'driveFileId',
  'mimeType',
  'alt',
  'createdAt',
];

const SESSION_HEADERS = [
  'token',
  'email',
  'expiresAt',
  'createdAt',
];

function doGet(e) {
  try {
    const action = e.parameter.action || 'health';
    const callback = e.parameter.callback || '';

    if (action === 'listArticles') {
      return publicRespond_(callback, {
        ok: true,
        data: { articles: listPublishedArticles_() },
      });
    }

    if (action === 'getArticle') {
      return publicRespond_(callback, {
        ok: true,
        data: { article: getPublicArticle_(e.parameter.slug || '', e.parameter.id || '') },
      });
    }

    return publicRespond_(callback, {
      ok: true,
      data: { name: 'TranBienWeb SEO Admin API' },
    });
  } catch (err) {
    return publicRespond_(e.parameter.callback || '', {
      ok: false,
      error: err.message,
    });
  }
}

function doPost(e) {
  let requestId = '';
  let isIframeBridge = false;

  try {
    const request = parseRequest_(e);
    isIframeBridge = Boolean(request.__iframeBridge);
    requestId = request.requestId || '';
    const action = request.action;
    const payload = request.payload || {};

    if (action === 'login') {
      return respond_(isIframeBridge, requestId, { ok: true, data: login_(payload) });
    }

    if (action === 'saveArticle') {
      return respond_(isIframeBridge, requestId, { ok: true, data: { article: saveArticle_(payload, CONFIG.ADMIN_EMAIL) } });
    }

    if (action === 'uploadImage') {
      return respond_(isIframeBridge, requestId, { ok: true, data: uploadImage_(payload) });
    }

    throw new Error('UNKNOWN_ACTION');
  } catch (err) {
    return respond_(isIframeBridge, requestId, { ok: false, error: err.message });
  }
}

function parseRequest_(e) {
  const content = e && e.postData ? e.postData.contents || '' : '';
  const formRequest = e && e.parameter ? e.parameter.request : '';

  if (formRequest) {
    const request = JSON.parse(formRequest);
    request.__iframeBridge = true;
    return request;
  }

  if (content.indexOf('request=') === 0) {
    const encoded = content.replace(/^request=/, '').replace(/\+/g, ' ');
    const request = JSON.parse(decodeURIComponent(encoded));
    request.__iframeBridge = true;
    return request;
  }

  return JSON.parse(content || '{}');
}

function setupSeoAdmin() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  ensureSheet_(ss, 'Posts', POST_HEADERS);
  ensureSheet_(ss, 'Media', MEDIA_HEADERS);
  ensureSheet_(ss, 'Sessions', SESSION_HEADERS);
  ensureFolder_();

  return {
    spreadsheetUrl: ss.getUrl(),
    folderName: CONFIG.DRIVE_FOLDER_NAME,
  };
}

function login_(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');

  if (email !== CONFIG.ADMIN_EMAIL || password !== CONFIG.ADMIN_PASSWORD) {
    throw new Error('INVALID_LOGIN');
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + CONFIG.SESSION_DAYS * 24 * 60 * 60 * 1000);
  const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ensureSheet_(ss, 'Sessions', SESSION_HEADERS);

  sheet.appendRow([token, email, expiresAt.toISOString(), now.toISOString()]);

  return {
    token,
    email,
    expiresAt: expiresAt.getTime(),
  };
}

function requireSession_(token) {
  if (!token) throw new Error('UNAUTHORIZED');

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ensureSheet_(ss, 'Sessions', SESSION_HEADERS);
  const rows = readRows_(sheet);
  const now = Date.now();
  const session = rows.find((row) => row.token === token && new Date(row.expiresAt).getTime() > now);

  if (!session) throw new Error('UNAUTHORIZED');
  return session;
}

function saveArticle_(payload, email) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ensureSheet_(ss, 'Posts', POST_HEADERS);
  const rows = readRows_(sheet);
  const now = new Date().toISOString();
  const id = payload.id || Utilities.getUuid();
  const rowIndex = rows.findIndex((row) => row.id === id);
  const existing = rowIndex >= 0 ? rows[rowIndex] : {};

  const article = {
    id,
    title: payload.title || '',
    slug: payload.slug || '',
    thumbnailUrl: payload.thumbnailUrl || '',
    thumbnailAlt: payload.thumbnailAlt || '',
    contentMarkdown: payload.contentMarkdown || '',
    contentHtml: payload.contentHtml || '',
    focusKeyword: payload.focusKeyword || '',
    secondaryKeywords: payload.secondaryKeywords || '',
    imagesJson: payload.imagesJson || '[]',
    seoScore: payload.seoScore || 0,
    seoChecksJson: payload.seoChecksJson || '{}',
    metaTitle: payload.metaTitle || '',
    metaDescription: payload.metaDescription || '',
    wordCount: payload.wordCount || 0,
    keywordDensity: payload.keywordDensity || 0,
    readabilityScore: payload.readabilityScore || 0,
    status: payload.status || 'draft',
    createdAt: existing.createdAt || now,
    updatedAt: now,
    authorEmail: email || CONFIG.ADMIN_EMAIL,
  };

  const values = POST_HEADERS.map((key) => article[key]);
  if (rowIndex >= 0) {
    sheet.getRange(rowIndex + 2, 1, 1, POST_HEADERS.length).setValues([values]);
  } else {
    sheet.appendRow(values);
  }

  return article;
}

function uploadImage_(payload) {
  if (!payload.base64 || !payload.fileName || !payload.mimeType) {
    throw new Error('INVALID_FILE');
  }

  const folder = ensureFolder_();
  const bytes = Utilities.base64Decode(payload.base64);
  const blob = Utilities.newBlob(bytes, payload.mimeType, payload.fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const id = Utilities.getUuid();
  // Endpoint thumbnail cho phép nhúng trực tiếp vào <img>; link uc?export=view đã bị Google chặn hotlink.
  const url = 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1600';
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ensureSheet_(ss, 'Media', MEDIA_HEADERS);
  const now = new Date().toISOString();

  sheet.appendRow([
    id,
    payload.articleId || '',
    payload.fileName,
    url,
    file.getId(),
    payload.mimeType,
    payload.alt || '',
    now,
  ]);

  return {
    id,
    name: payload.fileName,
    url,
    driveFileId: file.getId(),
    role: payload.role || 'content',
  };
}

function listPublishedArticles_() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ensureSheet_(ss, 'Posts', POST_HEADERS);
  const rows = readRows_(sheet);

  return rows
    .filter((row) => row.status === 'published')
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 9)
    .map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      thumbnailUrl: row.thumbnailUrl,
      thumbnailAlt: row.thumbnailAlt,
      metaDescription: row.metaDescription,
      focusKeyword: row.focusKeyword,
      seoScore: row.seoScore,
      updatedAt: row.updatedAt,
    }));
}

function getPublicArticle_(slug, id) {
  const wantedSlug = String(slug || '').trim();
  const wantedId = String(id || '').trim();
  if (!wantedSlug && !wantedId) return null;

  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ensureSheet_(ss, 'Posts', POST_HEADERS);
  const rows = readRows_(sheet);
  const match = rows.find((row) =>
    row.status === 'published' &&
    ((wantedSlug && row.slug === wantedSlug) || (wantedId && row.id === wantedId))
  );

  if (!match) return null;

  return {
    id: match.id,
    title: match.title,
    slug: match.slug,
    thumbnailUrl: match.thumbnailUrl,
    thumbnailAlt: match.thumbnailAlt,
    contentHtml: match.contentHtml,
    contentMarkdown: match.contentMarkdown,
    focusKeyword: match.focusKeyword,
    metaTitle: match.metaTitle,
    metaDescription: match.metaDescription,
    seoScore: match.seoScore,
    wordCount: match.wordCount,
    readabilityScore: match.readabilityScore,
    updatedAt: match.updatedAt,
    createdAt: match.createdAt,
    authorEmail: match.authorEmail,
  };
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (firstRow[0] !== headers[0]) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readRows_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).filter((row) => row.some((cell) => cell !== '')).map((row) => {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = row[index] instanceof Date ? row[index].toISOString() : row[index];
    });
    return item;
  });
}

function ensureFolder_() {
  const props = PropertiesService.getScriptProperties();
  const existingId = props.getProperty('SEO_ADMIN_FOLDER_ID');
  if (existingId) return DriveApp.getFolderById(existingId);

  const folders = DriveApp.getFoldersByName(CONFIG.DRIVE_FOLDER_NAME);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.DRIVE_FOLDER_NAME);
  props.setProperty('SEO_ADMIN_FOLDER_ID', folder.getId());
  return folder;
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function publicRespond_(callback, payload) {
  if (callback) {
    const safeCallback = String(callback).replace(/[^\w.$]/g, '');
    return ContentService
      .createTextOutput(safeCallback + '(' + JSON.stringify(payload) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return json_(payload);
}

function respond_(iframeBridge, requestId, payload) {
  if (!iframeBridge) return json_(payload);

  const safePayload = JSON.stringify(Object.assign({}, payload, {
    __tranBienSeoAdmin: true,
    requestId: requestId || '',
  })).replace(/</g, '\\u003c');

  return HtmlService
    .createHtmlOutput(
      '<!doctype html><html><body><script>' +
      'window.top.postMessage(' + safePayload + ', "*");' +
      '</script></body></html>'
    )
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
