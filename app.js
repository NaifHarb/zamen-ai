'use strict';

const $ = id => document.getElementById(id);
const root = document.documentElement;
const params = new URLSearchParams(location.search);
const articleId = params.get('article');
const categories = [
  ['الرئيسية', 'home'], ['السياسة', 'globe'], ['الذكاء الاصطناعي', 'spark'],
  ['التقنية', 'cpu'], ['أبل', 'device'], ['الأمن السيبراني', 'shield'],
  ['تحديثات ChatGPT', 'chat'], ['الاشتراكات الرقمية', 'layers'], ['المحفوظات', 'bookmark']
];
const home = categories[0][0];
const todayLabel = 'اليوم';
const saved = categories.at(-1)[0];
const icons = {
  home: '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21v-7h6v7"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/>',
  cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9zM9 2v3m6-3v3m-6 14v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3"/>',
  device: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
  shield: '<path d="M12 22s7-3 7-10V5l-7-3-7 3v7c0 7 7 10 7 10z"/><path d="m9 12 2 2 4-4"/>',
  chat: '<path d="M20 3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3l5 4v-4h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM7 8h10M7 12h7"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7zM2 12l10 5 10-5M2 17l10 5 10-5"/>',
  bookmark: '<path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17l-6-4-6 4z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  moon: '<path d="M20.9 13.3A9 9 0 0 1 10.7 3.1 9 9 0 1 0 20.9 13.3z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  share: '<path d="M12 16V3m-4 4 4-4 4 4M5 12v8h14v-8"/>',
  external: '<path d="M13 5h6v6m0-6-9 9m7 0v5H5V7h5"/>'
};

function element(tag, text = '', className = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
}

function icon(name) {
  const template = document.createElement('template');
  template.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${icons[name]}</svg>`;
  return template.content.firstElementChild;
}

function link(label, href, className = '', glyph) {
  const a = element('a', label, className);
  a.href = href;
  if (glyph) a.prepend(icon(glyph));
  return a;
}

function button(label, glyph, className = '') {
  const b = element('button', glyph ? '' : label, className);
  b.type = 'button';
  if (glyph) {
    b.setAttribute('aria-label', label);
    b.append(icon(glyph));
  }
  return b;
}

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch {}
}

function safe(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

// Editorial gate: keep rejected records accessible via saved items and direct links.
function wordCount(value) {
  return (String(value || '').match(/[\p{L}\p{N}]+/gu) || []).length;
}
function rssUrgent(story) {
  const title = String(story.original_title || '');
  const age = Date.now() - Date.parse(story.published_at);
  return story.rss_category === 'السياسة' && /^(?:breaking(?: news)?\b|عاجل(?:\s|:|：|\|))/iu.test(title.trim()) &&
    age >= 0 && age <= 6 * 3600000 && wordCount(story.excerpt) >= 35 && wordCount(story.summary_ar) >= 35;
}
function isDiscoverable(story) {
  if (!Object.hasOwn(story, 'rss_category')) return wordCount(story.summary_ar || story.detailed_ar) >= 80;
  if (story.rss_category !== 'السياسة') return false;
  return rssUrgent(story) || (wordCount(story.excerpt) >= 120 &&
    wordCount(story.detailed_ar || story.summary_ar) >= 150);
}

function group(story) {
  if (Object.hasOwn(story, 'rss_category')) return story.rss_category || 'من الأرشيف';
  const name = story.category || 'أخرى';
  if (/سياس/.test(name)) return 'السياسة';
  if (/اشتراك|عروض/.test(name)) return 'الاشتراكات الرقمية';
  if (/ChatGPT/i.test(name)) return 'تحديثات ChatGPT';
  if (/أبل|آبل|Apple/i.test(name)) return 'أبل';
  if (/سيبران/.test(name)) return 'الأمن السيبراني';
  if (/ذكاء/.test(name)) return 'الذكاء الاصطناعي';
  if (/تقني/.test(name)) return 'التقنية';
  return name;
}

function categoryAlias(name) {
  if (!name || name === 'الكل') return home;
  if (name === 'المفضلة') return saved;
  if (name === 'الذكاء الاصطناعي والتقنية') return 'الذكاء الاصطناعي';
  return group({category: name});
}

const number = new Intl.NumberFormat('ar-SA');
const dateOptions = {calendar: 'gregory', numberingSystem: 'latn', timeZone: 'Asia/Riyadh'};
const shortDate = new Intl.DateTimeFormat('ar-SA', {...dateOptions, day: 'numeric', month: 'short', year: 'numeric'});
const longDate = new Intl.DateTimeFormat('ar-SA', {...dateOptions, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
const clock = new Intl.DateTimeFormat('ar-SA', {...dateOptions, hour: 'numeric', minute: '2-digit'});

function time(value, format = shortDate) {
  const date = new Date(value || NaN);
  if (!Number.isFinite(+date)) return null;
  const node = element('time', format.format(date));
  node.dateTime = date.toISOString();
  return node;
}

const currentDay = time(Date.now(), longDate);
$('today').replaceWith(currentDay);
const favorites = read('zamen-fav', []);
const fav = new Set(Array.isArray(favorites) ? favorites.map(String) : []);
const sizes = [17, 19, 23];
let readingSize = read('zamen-size', 19);
if (!sizes.includes(readingSize)) readingSize = 19;
let items = [];
let images = {};
let imageMapReady = false;
let licensed = {};
let category = categoryAlias(params.get('category'));
let query = params.get('q') || '';
let loaded = false;
let editionStamp = "";
let sidebarOpen;
const compact = matchMedia('(max-width: 649px)');
let sidebarClosed = read('zamen-sidebar-closed', false) === true;
let sectionOpener;

function route({section = home, q = '', article = ''} = {}) {
  const next = new URLSearchParams();
  if (article) next.set('article', article);
  if (section !== home) next.set('category', section);
  if (q) next.set('q', q);
  const search = next.toString();
  return search ? '?' + search : './';
}

function wideNavigation() {
  return !articleId && getComputedStyle($('sidebar')).getPropertyValue('--wide-navigation').trim() === '1';
}

function syncNavigation() {
  const wide = wideNavigation();
  sidebarOpen = wide && !sidebarClosed;
  $('sidebar').classList.toggle('is-collapsed', sidebarClosed);
  const toggle = $('sidebarToggle');
  toggle.setAttribute('aria-controls', wide ? 'sidebar' : 'sections');
  toggle.setAttribute('aria-label', wide && sidebarOpen ? 'طي قائمة الأقسام' : 'كل الأقسام');
  toggle.setAttribute('aria-expanded', String(wide ? sidebarOpen : $('sections').open));
  if (wide) toggle.removeAttribute('aria-haspopup');
  else toggle.setAttribute('aria-haspopup', 'dialog');
}

function openSections(opener) {
  sectionOpener = opener;
  $('sections').showModal();
  opener.setAttribute('aria-expanded', 'true');
}

$('sections').addEventListener('close', () => {
  sectionOpener?.setAttribute('aria-expanded', 'false');
  if (sectionOpener?.getClientRects().length) sectionOpener.focus();
  else ($('sidebarToggle').getClientRects().length ? $('sidebarToggle') : $('main')).focus();
});

function syncTheme() {
  const dark = root.classList.contains('dark');
  $('theme').replaceChildren(icon(dark ? 'sun' : 'moon'));
  $('theme').setAttribute('aria-pressed', String(dark));
  document.querySelector('meta[name="theme-color"]').content = dark ? '#100e0e' : '#221e1c';
}

function toggleTheme() {
  save('zamen-dark', root.classList.toggle('dark'));
  syncTheme();
}

function announce(text) {
  $('status').textContent = text;
}

function openSearch(open, focus = true) {
  $('searchPanel').hidden = !open;
  $('searchToggle').setAttribute('aria-expanded', String(open));
  $('bottom').querySelector('[aria-controls=searchPanel]')?.setAttribute('aria-expanded', String(open));
  if (open && focus) $('search').focus();
}

function searchToggle() {
  if (articleId) {
    location.href = route({section: category, q: query}) + '#searchPanel';
    return;
  }
  openSearch($('searchPanel').hidden);
}

$('theme').onclick = toggleTheme;
$('searchToggle').append(icon('search'));
$('searchToggle').onclick = searchToggle;
$('sidebarToggle').append(icon('menu'));
$('sidebarToggle').onclick = () => {
  if (!wideNavigation()) {
    openSections($('sidebarToggle'));
    return;
  }
  sidebarClosed = !sidebarClosed;
  save('zamen-sidebar-closed', sidebarClosed);
  syncNavigation();
};
new ResizeObserver(syncNavigation).observe(document.querySelector('.layout'));
syncNavigation();
syncTheme();
root.style.setProperty('--reading-size', readingSize / 16 + 'rem');

function navLink(name, glyph, className) {
  const a = link(name === home ? todayLabel : name, route({section: name}), className, glyph);
  if (category === name) a.setAttribute('aria-current', articleId ? 'location' : 'page');
  return a;
}

function sectionsButton(className, label) {
  const control = element('button', '', className);
  control.type = 'button';
  control.append(icon('menu'), document.createTextNode(label));
  control.setAttribute('aria-haspopup', 'dialog');
  control.setAttribute('aria-controls', 'sections');
  control.setAttribute('aria-expanded', 'false');
  control.onclick = () => openSections(control);
  return control;
}

let navigationSignature;

function renderNav() {
  const known = new Set(categories.map(([name]) => name));
  const extra = [...new Set(items.filter(isDiscoverable).map(group))].filter(name => !known.has(name));
  const signature = JSON.stringify(extra);
  if (signature === navigationSignature) return;
  navigationSignature = signature;
  const sections = [...categories.slice(0, -1), ...extra.map(name => [name, 'layers']), categories.at(-1)];
  $('nav').replaceChildren(...[sections[0], sections.at(-1), ...sections.slice(1, -1)].map(([name, glyph]) => navLink(name, glyph, 'nav-link')));
  $('sectionsNav').replaceChildren(...sections.map(([name, glyph]) => navLink(name, glyph, 'nav-link')));
  const shortcuts = [sections[0], sections[1], sections[2], sections[3], sections.at(-1)];
  $('quickNav').replaceChildren(...shortcuts.map(([name, glyph]) => navLink(name, glyph, 'nav-link')),
    sectionsButton('nav-link', 'كل الأقسام'));
  const search = element('button', '', 'tab');
  search.type = 'button';
  search.append(icon('search'), document.createTextNode('البحث'));
  search.setAttribute('aria-controls', 'searchPanel');
  search.setAttribute('aria-expanded', String(!$('searchPanel').hidden));
  search.onclick = searchToggle;
  $('bottom').replaceChildren(navLink(home, 'home', 'tab'), sectionsButton('tab', 'الأقسام'), search, navLink(saved, 'bookmark', 'tab'));
}

$('search').value = query;
if (!articleId && (params.has('search') || query || location.hash === '#searchPanel')) {
  openSearch(true, params.has('search') || location.hash === '#searchPanel');
}
renderNav();

function updateSearch() {
  query = $('search').value.trim();
  history.replaceState(history.state, '', route({section: category, q: query}));
  if (loaded) renderFeed();
}

let searchTimer;
$('search').oninput = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(updateSearch, 130);
};
$('searchPanel').onsubmit = event => {
  event.preventDefault();
  clearTimeout(searchTimer);
  updateSearch();
};
$('search').onkeydown = event => {
  if (event.key !== 'Escape') return;
  openSearch(false);
  const mobileSearch = $('bottom').querySelector('[aria-controls="searchPanel"]');
  (compact.matches && mobileSearch?.getClientRects().length ? mobileSearch : $('searchToggle')).focus();
};

const title = story => story.title_ar || story.original_title || 'خبر';
const articleURL = story => route({article: String(story.id), section: category, q: query});
const normalize = value => value.toLowerCase().normalize('NFKC').replace(/[\u064B-\u065F\u0640]/g, '').replace(/[أإآ]/g, 'ا');

function filtered() {
  const needle = normalize(query);
  return items.filter(story => {
    const inSection = category === saved ? fav.has(String(story.id)) :
      isDiscoverable(story) && (category === home || group(story) === category);
    return inSection && (!needle || normalize([story.title_ar, story.original_title, story.summary_ar, story.excerpt, story.source].join(' ')).includes(needle));
  });
}

function imageCandidates(story, thumbnail) {
  const mapped = images[story.id];
  const choices = thumbnail ? [story.thumbnail_url, mapped?.thumbnail_url] : [];
  choices.push(story.image_url, story.image, mapped?.url || mapped);
  return [...new Set(choices.map(safe).filter(Boolean))];
}

function responsiveImage(source) {
  const url = new URL(source);
  if (url.hostname !== 'ichef.bbci.co.uk') return null;

  // These BBC paths refer to the same media ID in the source's resized endpoint.
  const match = url.pathname.match(/^\/(?:news\/\d+\/branded_arabic|ace\/branded_news\/\d+\/cpsprodpb)\/([a-z0-9]+\/live\/[a-z0-9.-]+)$/i);
  if (!match) return null;
  return [240, 320, 480, 640, 800, 1024].map(width =>
    url.origin + '/news/' + width + '/cpsprodpb/' + match[1] + ' ' + width + 'w'
  ).join(', ');
}

const mediaUpdates = new Set();

function media(story, {priority = false, reader = false} = {}) {
  const frame = element('div', '', 'media');
  const mark = element('div', '', 'mark');
  mark.setAttribute('aria-hidden', 'true');
  const photo = element('img', '', 'photo');
  const alt = story.image_alt;
  photo.alt = typeof alt === 'string' ? alt.trim() : '';
  photo.loading = priority ? 'eager' : 'lazy';
  photo.fetchPriority = priority ? 'high' : 'auto';
  photo.decoding = 'async';
  photo.referrerPolicy = 'no-referrer';
  photo.classList.add('is-pending');
  frame.append(mark, photo);
  if (priority) frame.classList.add('priority-media');
  const position = story.image_focal_point;
  if (Number.isFinite(position?.x) && Number.isFinite(position?.y) &&
      [position.x, position.y].every(value => value >= 0 && value <= 100)) {
    photo.style.objectPosition = position.x + '% ' + position.y + '%';
  }
  photo.sizes = reader ? '(min-width: 850px) 768px, 92vw' : priority ?
    '(min-width: 1180px) 48vw, (min-width: 760px) 56vw, 92vw' :
    '(min-width: 1250px) 310px, (min-width: 650px) 37vw, 110px';
  const attempted = new Set();
  let source;
  function tryImage() {
    const next = imageCandidates(story, !priority && !reader).find(candidate => !attempted.has(candidate));
    if (!next) {
      source = '';
      photo.classList.add('is-pending');
      frame.classList.toggle('is-unavailable', imageMapReady);
      mark.textContent = imageMapReady ? 'الصورة غير متاحة' : '';
      mark.hidden = false;
      return;
    }
    frame.classList.remove('is-unavailable');
    attempted.add(next);
    source = next;
    mark.hidden = true;
    const variants = responsiveImage(source);
    if (variants) photo.srcset = variants;
    else photo.removeAttribute('srcset');
    photo.src = source;
  }
  photo.addEventListener('load', () => {
    if (source && photo.naturalWidth) {
      mark.hidden = true;
      photo.classList.remove('is-pending');
    }
  });
  photo.addEventListener('error', () => {
    if (photo.hasAttribute('srcset')) photo.removeAttribute('srcset');
    else tryImage();
  });
  tryImage();
  // Only known image candidates reserve a full reader image before auxiliary
  // data arrives. The feed always reserves its frame to avoid layout shifts.
  if (reader && !source) return null;
  mediaUpdates.add(() => {
    if (frame.isConnected && !source) tryImage();
  });
  return frame;
}

function syncBookmark(b, id) {
  b.setAttribute('aria-pressed', String(fav.has(id)));
  b.title = fav.has(id) ? 'إلغاء الحفظ' : 'حفظ الخبر';
}

function bookmark(story) {
  const id = String(story.id);
  const b = button('حفظ الخبر', 'bookmark', 'icon-button bookmark');
  b.dataset.bookmark = id;
  syncBookmark(b, id);
  b.onclick = () => {
    if (fav.has(id)) fav.delete(id);
    else fav.add(id);
    save('zamen-fav', [...fav]);
    document.querySelectorAll('[data-bookmark]').forEach(control => {
      if (control.dataset.bookmark === id) syncBookmark(control, id);
    });
    if (category === saved && !articleId) {
      const controls = [...$('news').querySelectorAll('[data-bookmark]')];
      const index = controls.indexOf(b);
      renderFeed(false);
      const remaining = $('news').querySelectorAll('[data-bookmark]');
      (remaining[Math.min(index, remaining.length - 1)] || $('heading')).focus();
    }
    announce(fav.has(id) ? 'حُفظ الخبر' : 'أُلغي حفظ الخبر');
  };
  return b;
}

function metadata(story, canSave = true) {
  const row = element('div', '', 'meta');
  if (story.source) row.append(element('bdi', story.source));
  const date = time(story.published_at);
  if (date) row.append(date);
  if (canSave) row.append(bookmark(story));
  return row;
}

function card(story, variant, level = 2) {
  const article = element('article', '', 'story ' + variant);
  article.dataset.storyId = String(story.id);
  const copy = element('div', '', 'copy');
  const heading = element('h' + level);
  heading.className = 'story-title';
  const headline = link(title(story), articleURL(story), 'story-link');
  headline.dataset.openStory = String(story.id);
  heading.append(headline);
  if (variant !== 'brief') {
    if (variant === 'featured') copy.append(element('p', 'أبرز الأخبار · ' + group(story), 'tag'));
    const picture = link('', articleURL(story), 'picture-link');
    picture.dataset.openStory = String(story.id);
    picture.setAttribute('aria-label', 'اقرأ: ' + title(story));
    picture.tabIndex = -1;
    picture.append(media(story, {priority: variant === 'featured'}));
    if (variant === 'featured') copy.append(heading, picture);
    else article.append(picture);
  }
  if (variant !== 'featured') copy.append(heading);
  if (variant === 'featured' && (story.summary_ar || story.excerpt)) {
    const deck = element('p', story.summary_ar || story.excerpt, 'deck');
    deck.dir = 'auto';
    copy.append(deck);
  }
  copy.append(metadata(story, variant !== 'brief'));
  article.append(copy);
  return article;
}

const prominentTopic = /انتخاب|مفاوضات|مباحثات|وقف.{0,16}النار|عقوبات|ميزاني|اتفاق|حرب|دفاع|tariffs|election|sanctions|ceasefire|summit|budget|treaty/i;
const topicWeights = new Map([['السياسة', 3], ['الذكاء الاصطناعي', 2], ['الأمن السيبراني', 2], ['تحديثات ChatGPT', 1]]);
function leadStory(list) {
  const date = story => Date.parse(story.published_at) || 0;
  const newest = date(list[0]);
  const windowMs = 48 * 60 * 60 * 1000;
  let lead = list[0];
  let highest = -Infinity;
  for (const story of list) {
    const age = Math.max(0, newest - date(story));
    if (age > windowMs) break;
    let score = 6 * (1 - age / windowMs) + (topicWeights.get(group(story)) || 0);
    if (prominentTopic.test(normalize(title(story)))) score += 4;
    if (story.summary_ar || story.excerpt) score += 1;
    if (safe(story.image_url) || safe(story.image)) score += 1;
    if (score > highest) {
      highest = score;
      lead = story;
    }
  }
  return lead;
}

function sameStoryKey(story) {
  const url = safe(story.article_url);
  if (!url) return normalize(title(story)).trim();
  const canonical = new URL(url);
  canonical.hash = '';
  for (const key of [...canonical.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$)/i.test(key)) canonical.searchParams.delete(key);
  }
  canonical.searchParams.sort();
  return canonical.hostname.replace(/^www\./, '') + canonical.pathname.replace(/\/$/, '') + canonical.search;
}

function empty(message, retry = false) {
  const node = element('div', '', 'empty');
  node.append(element('p', message));
  if (retry) {
    const reload = button('إعادة المحاولة');
    reload.onclick = () => location.reload();
    node.append(reload);
  }
  return node;
}

function renderFeed(announceCount = true) {
  const list = filtered();
  const count = number.format(list.length) + ' خبر';
  $('heading').textContent = query ? 'نتائج البحث' : category === home ? todayLabel : category;
  $('heading').tabIndex = -1;
  $('count').textContent = count;
  $('feed').setAttribute('aria-busy', 'false');
  if (announceCount) announce(count);
  const target = $('news');
  mediaUpdates.clear();
  target.replaceChildren();
  if (!list.length) {
    target.append(empty(query ? 'لا توجد نتائج مطابقة. جرّب كلمات أخرى.' :
      category === saved ? 'لم تحفظ أي أخبار بعد.' : 'لا توجد أخبار متاحة في هذا القسم.'));
    return;
  }
  if (category !== home || query) {
    const grid = element('div', '', 'news-grid');
    grid.append(...list.map(story => card(story, 'tile')));
    target.append(grid);
    return;
  }
  const front = element('div', '', 'front');
  const unique = [];
  const seen = new Set();
  const headlines = new Set();
  for (const story of list) {
    const key = sameStoryKey(story);
    const headline = normalize(title(story)).replace(/[^\p{L}\p{N}]+/gu, '');
    if (seen.has(key) || headlines.has(headline)) continue;
    seen.add(key);
    headlines.add(headline);
    unique.push(story);
  }
  const lead = leadStory(unique);
  front.append(card(lead, 'featured'));
  const remaining = unique.filter(story => story !== lead);
  if (remaining.length) {
    const latest = element('section', '', 'latest');
    latest.append(element('h2', 'آخر الأخبار'), ...remaining.slice(0, 3).map(story => card(story, 'brief', 3)));
    front.append(latest);
  }
  const leadTag = front.querySelector('.featured .tag');
  leadTag.append(element('span', ' · اختيار آلي', 'selection-note'));
  target.append(front);
  const grouped = new Map();
  remaining.slice(3).forEach(story => {
    const name = group(story);
    if (!grouped.has(name)) grouped.set(name, []);
    grouped.get(name).push(story);
  });
  for (const name of [...new Set([...categories.map(([label]) => label), ...grouped.keys()])]) {
    if (!grouped.has(name)) continue;
    const section = element('section', '', 'category-section');
    const head = element('div', '', 'section-head');
    const more = link('عرض الكل', route({section: name}));
    more.setAttribute('aria-label', 'عرض كل أخبار ' + name);
    head.append(element('h2', name), more);
    const grid = element('div', '', 'news-grid');
    grid.append(...grouped.get(name).slice(0, 3).map(story => card(story, 'tile', 3)));
    section.append(head, grid);
    target.append(section);
  }
}

function readingModes(story) {
  const entry = licensed[story.id];
  const licenseURL = safe(entry?.license_url);
  const modes = [];
  if (licenseURL && entry.attribution && entry.text) {
    modes.push({id: 'full', label: 'النص الكامل المرخّص', text: entry.text, note: entry.attribution, licenseURL});
    if (entry.translation_ar) {
      modes.push({id: 'translation', label: 'الترجمة العربية المرخّصة', text: entry.translation_ar, note: entry.attribution, licenseURL});
    }
  }
  if (story.detailed_ar && !rssUrgent(story)) {
    const basis = story.content_basis === 'rss_excerpt' ? 'مبنية على مقتطف موجز RSS' : 'مبنية على البيانات المتاحة';
    const label = /gemini/i.test(story.model || '') ? 'تغطية Gemini الموسّعة' : 'التغطية الموسّعة';
    modes.push({id: 'coverage', label, text: story.detailed_ar, note: basis + '. النص المنشور متاح لدى المصدر.'});
  }
  if (story.summary_ar) modes.push({id: 'summary', label: rssUrgent(story) ? 'تحديث عاجل مختصر' : 'ملخص الخبر', text: story.summary_ar, note: 'ملخص للمادة المنشورة لدى المصدر.'});
  if (story.excerpt) modes.push({id: 'rss', label: 'مقتطف RSS', text: story.excerpt, note: 'مقتطف من موجز الناشر.'});
  return modes;
}

function paragraphs(text) {
  return String(text).trim().split(/\n+/).flatMap(paragraph => {
    if (paragraph.length < 460) return [paragraph];
    // Break long blocks at sentence boundaries without dropping the punctuation.
    const sentences = paragraph.match(/[^.!؟?]+(?:[.!؟?]+(?=\s|$)|$)|\S+/g);
    if (!sentences || sentences.join('').trim() !== paragraph.trim()) return [paragraph];
    const parts = [];
    let block = '';
    for (const sentence of sentences) {
      block += sentence;
      if (block.length >= 280) {
        parts.push(block.trim());
        block = '';
      }
    }
    if (block.trim()) parts.push(block.trim());
    return parts;
  }).filter(Boolean).map(text => {
    const p = element('p', text);
    p.dir = 'auto';
    return p;
  });
}

function readerNeighbors(story) {
  const list = filtered();
  const sequence = list.includes(story) ? list : items.filter(isDiscoverable);
  const index = sequence.indexOf(story);
  return [sequence[index - 1], sequence[index + 1]];
}

let shareNotice;

async function share(story) {
  const url = new URL(route({article: String(story.id)}), location.href).href;
  if (navigator.share) {
    try {
      await navigator.share({title: title(story), url});
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    announce('نُسخ رابط المقال');
    $('shareFeedback').textContent = 'نُسخ الرابط';
    clearTimeout(shareNotice);
    shareNotice = setTimeout(() => $('shareFeedback').replaceChildren(), 1800);
  } catch {
    clearTimeout(shareNotice);
    const label = element('label', 'رابط المقال ');
    const field = element('input');
    field.value = url;
    field.readOnly = true;
    label.append(field);
    $('shareFeedback').replaceChildren(label);
    field.select();
  }
}

const restoreKey = 'zamen-reader-navigation';
history.scrollRestoration = 'manual';
let readerOrigin = history.state?.zamenReaderOrigin;
let refreshReadingModes;
let attachDeferredReaderImage;

function stashReaderNavigation(href, origin) {
  try {
    sessionStorage.setItem(restoreKey, JSON.stringify({from: location.href, to: new URL(href, location.href).href, origin}));
  } catch {}
}

if (articleId) {
  let pending;
  try {
    pending = JSON.parse(sessionStorage.getItem(restoreKey));
    sessionStorage.removeItem(restoreKey);
  } catch {}
  if (pending?.from.split('#')[0] === document.referrer && pending.to === location.href) {
    readerOrigin = pending.origin;
    history.replaceState({...history.state, zamenReaderOrigin: readerOrigin}, '');
  }
}

function restoreFeedPosition() {
  const state = history.state?.zamenFeedPosition;
  if (articleId || !state || state.href !== location.href) return;
  document.fonts.ready.then(() => requestAnimationFrame(() => {
    const headline = [...$('news').querySelectorAll('.story-link')].find(link => link.dataset.openStory === state.id);
    const sameView = state.width === innerWidth && state.height === innerHeight && state.edition === editionStamp;
    const y = sameView || !headline ? state.y : scrollY + headline.getBoundingClientRect().top - state.offset;
    headline?.focus({preventScroll: true});
    scrollTo(0, y);
  }));
}

function regularClick(event) {
  return !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

$('news').addEventListener('click', event => {
  const anchor = event.target.closest('a[data-open-story]');
  if (!anchor || !regularClick(event)) return;
  const headline = anchor.closest('.story').querySelector('.story-link');
  const state = {
    href: location.href, y: scrollY, id: anchor.dataset.openStory, offset: headline.getBoundingClientRect().top,
    width: innerWidth, height: innerHeight, edition: editionStamp
  };
  history.replaceState({...history.state, zamenFeedPosition: state}, '');
  stashReaderNavigation(anchor.href, {steps: 1});
});

addEventListener('pageshow', event => {
  if (!event.persisted) return;
  const stored = read('zamen-fav', []);
  const current = new Set(Array.isArray(stored) ? stored.map(String) : []);
  const changed = current.size !== fav.size || [...current].some(id => !fav.has(id));
  if (changed) {
    fav.clear();
    current.forEach(id => fav.add(id));
    if (!articleId && category === saved) renderFeed(false);
    else document.querySelectorAll('[data-bookmark]').forEach(control => syncBookmark(control, control.dataset.bookmark));
  }
  const preferred = read('zamen-dark', matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', preferred === true);
  syncTheme();
  restoreFeedPosition();
});

function carryReaderNavigation(href) {
  if (readerOrigin?.steps) stashReaderNavigation(href, {steps: readerOrigin.steps + 1});
}

function renderReader() {
  $('feed').hidden = true;
  const reader = $('reader');
  reader.hidden = false;
  document.documentElement.classList.add('is-reading');
  const back = link('رجوع', route({section: category, q: query}), 'back', 'right');
  back.setAttribute('aria-label', 'العودة إلى الأخبار');
  back.onclick = event => {
    if (!regularClick(event) || !readerOrigin?.steps) return;
    event.preventDefault();
    history.go(-readerOrigin.steps);
  };
  const story = items.find(item => String(item.id) === articleId);
  if (!story) {
    reader.append(back, empty('هذا الخبر غير متاح في النسخة الحالية.'));
    return;
  }
  document.title = title(story) + ' | زامن';
  const bar = element('div', '', 'progress');
  bar.setAttribute('aria-hidden', 'true');
  const fill = element('span');
  bar.append(fill);

  const toolbar = element('div', '', 'reader-toolbar');
  const actions = element('div', '', 'reader-actions');
  const sizeMenu = element('details', '', 'size-menu');
  const sizeLabel = element('summary', 'حجم النص');
  const sizeOptions = element('div', '', 'size-options');
  const controls = sizes.map((size, index) => {
    const b = button(['صغير', 'متوسط', 'كبير'][index]);
    b.setAttribute('aria-pressed', String(readingSize === size));
    b.onclick = () => {
      readingSize = size;
      save('zamen-size', size);
      root.style.setProperty('--reading-size', size / 16 + 'rem');
      controls.forEach((control, i) => control.setAttribute('aria-pressed', String(sizes[i] === size)));
      sizeMenu.open = false;
      sizeLabel.focus();
      scheduleProgress();
    };
    return b;
  });
  sizeOptions.append(...controls);
  sizeMenu.append(sizeLabel, sizeOptions);
  document.addEventListener('click', event => {
    if (sizeMenu.open && !sizeMenu.contains(event.target)) sizeMenu.open = false;
  });
  sizeMenu.addEventListener('keydown', event => {
    if (event.key === 'Escape' && sizeMenu.open) {
      sizeMenu.open = false;
      sizeLabel.focus();
    }
  });
  const shareButton = button('مشاركة المقال', 'share', 'icon-button');
  shareButton.onclick = () => share(story);
  actions.append(sizeMenu, bookmark(story), shareButton);
  toolbar.append(back, actions, bar);
  const feedback = element('span', '', 'note share-feedback');
  feedback.id = 'shareFeedback';
  toolbar.append(feedback);
  reader.append(toolbar, element('p', group(story), 'tag'), element('h1', title(story)), metadata(story, false));

  const source = safe(story.article_url);
  const description = element('div', '', 'reader-description');
  const contentHeader = element('div', '', 'reader-source');
  const contentType = element('strong');
  const attribution = element('p', '', 'note');
  const chooser = element('label', 'نسخة القراءة', 'reading-choices');
  const choice = element('select');
  chooser.append(choice);
  contentHeader.append(contentType);
  if (source) contentHeader.append(link('النص لدى المصدر', source, 'original', 'external'));
  description.append(contentHeader, attribution, chooser);
  const image = media(story, {priority: true, reader: true});
  if (image) reader.append(image);
  const copy = element('div', '', 'reading-copy');
  reader.append(description, copy);
  const [previous, next] = readerNeighbors(story);
  const links = element('nav', '', 'reader-links');
  links.setAttribute('aria-label', 'التنقل بين الأخبار');
  links.append(
    previous ? link('الخبر السابق', articleURL(previous), '', 'right') : disabledLink('الخبر السابق'),
    next ? link('الخبر التالي', articleURL(next), '', 'left') : disabledLink('الخبر التالي')
  );
  links.addEventListener('click', event => {
    const anchor = event.target.closest('a');
    if (anchor && regularClick(event)) carryReaderNavigation(anchor.href);
  });
  reader.append(links);
  if (!image && !imageMapReady) {
    // A late map-only photo is supplementary so it cannot move the opening text
    // while the reader is already reading.
    attachDeferredReaderImage = () => {
      const later = media(story, {priority: false, reader: true});
      if (later) links.before(later);
    };
  }

  let frame;
  function scheduleProgress() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const bounds = copy.getBoundingClientRect();
      const traveled = toolbar.getBoundingClientRect().bottom - bounds.top;
      const progress = Math.max(0, Math.min(1, traveled / Math.max(1, bounds.height - innerHeight + toolbar.offsetHeight)));
      fill.style.transform = 'scaleX(' + (bounds.bottom <= innerHeight && traveled > 0 ? 1 : progress) + ')';
    });
  }

  let modes = [];
  let active;
  function showMode(mode) {
    if (active === mode?.id && copy.childElementCount) return;
    active = mode?.id;
    contentType.textContent = mode?.label || 'المادة لدى المصدر';
    attribution.replaceChildren(document.createTextNode(mode?.note || 'يمكن قراءة المادة عبر رابط المصدر.'));
    if (mode?.licenseURL) attribution.append(document.createTextNode(' · '), link('ترخيص المحتوى', mode.licenseURL));
    copy.replaceChildren(...(mode ? paragraphs(mode.text) : []));
    scheduleProgress();
  }
  refreshReadingModes = () => {
    modes = readingModes(story);
    choice.replaceChildren(...modes.map(mode => {
      const option = element('option', mode.label);
      option.value = mode.id;
      return option;
    }));
    chooser.hidden = modes.length < 2;
    const available = modes.find(mode => mode.id === active) || modes[0];
    if (available) choice.value = available.id;
    showMode(available);
  };
  choice.onchange = () => showMode(modes.find(mode => mode.id === choice.value));
  refreshReadingModes();
  addEventListener('scroll', scheduleProgress, {passive: true});
  addEventListener('resize', scheduleProgress);
  bindSwipe(reader, previous, next);
}

function disabledLink(label) {
  const b = button(label);
  b.disabled = true;
  return b;
}

function bindSwipe(surface, previous, next) {
  let start;
  surface.addEventListener('touchstart', event => {
    const touch = event.touches[0];
    start = event.touches.length === 1 && touch.clientX > 28 && touch.clientX < innerWidth - 28 &&
      !event.target.closest('button,a,input,select,summary,.reader-toolbar') ? touch : null;
  }, {passive: true});
  surface.addEventListener('touchcancel', () => { start = null; }, {passive: true});
  surface.addEventListener('touchend', event => {
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.clientX;
    const dy = touch.clientY - start.clientY;
    start = null;
    if (Math.abs(dx) < 85 || Math.abs(dx) < Math.abs(dy) * 1.8 || String(getSelection())) return;
    const story = dx > 0 ? next : previous;
    if (story) {
      const href = articleURL(story);
      carryReaderNavigation(href);
      location.href = href;
    }
  }, {passive: true});
}

async function load(path, validate) {
  const response = await (window.zamenStartup?.[path] || fetch(path, {cache: 'no-cache'}));
  if (!response?.ok) throw new Error(path);
  const data = await response.json();
  if (!validate(data)) throw new Error(path);
  return data;
}

function showUpdated(datasets) {
  const latest = Math.max(...datasets.map(data => Date.parse(data?.updated_at) || 0));
  if (latest <= 0) return;
  const target = $('updated');
  target.dateTime = new Date(latest).toISOString();
  target.textContent = 'آخر تحديث ' + shortDate.format(latest) + '، ' + clock.format(latest);
  target.hidden = false;
}

async function initialize() {
  announce('جارٍ تحميل الأخبار');
  const isFeed = data => Array.isArray(data?.items);
  const isMap = data => data && typeof data === 'object' && !Array.isArray(data);
  void load('data/images.json', isMap).then(data => {
    images = data;
  }).catch(() => {}).finally(() => {
    imageMapReady = true;
    mediaUpdates.forEach(update => update());
    attachDeferredReaderImage?.();
  });
  if (articleId) {
    void load('data/licensed-articles.json', isMap).then(data => {
      licensed = data;
      refreshReadingModes?.();
    }).catch(() => {});
  }
  const [rss, sheets, classifications] = await Promise.allSettled([
    load('data/news.json', isFeed), load('data/sheets-news.json', isFeed), load('data/rss-classifications.json', isMap)
  ]);
  if (!rss.value && !sheets.value) {
    $('feed').setAttribute('aria-busy', 'false');
    $('news').replaceChildren(empty('تعذر تحميل الأخبار. تحقّق من الاتصال وحاول مجددًا.', true));
    announce('تعذر تحميل الأخبار');
    return;
  }
  const arabic = /[\u0600-\u06ff]/;
  const archivedClassifications = classifications.value || {};
  const publicRSS = (rss.value?.items || [])
    .filter(story => arabic.test(story?.title_ar) && arabic.test(story?.summary_ar))
    .map(story => Object.hasOwn(story, 'rss_category') ? story :
      {...story, rss_category: archivedClassifications[story.id] || null});
  items = [...new Map([...publicRSS, ...(sheets.value?.items || [])]
    .filter(story => story?.id !== undefined && story.id !== null)
    .map(story => [String(story.id), story])).values()]
    .sort((a, b) => (Date.parse(b.published_at) || 0) - (Date.parse(a.published_at) || 0));
  loaded = true;
  editionStamp = [rss.value?.updated_at, sheets.value?.updated_at, items.length].join('|');
  showUpdated([rss.value, sheets.value]);
  renderNav();
  if (articleId) {
    announce('');
    renderReader();
  } else {
    renderFeed();
    restoreFeedPosition();
  }
  if (!rss.value || !sheets.value) {
    const warning = element('p', 'بعض الأخبار غير متاحة الآن.', 'note');
    (articleId ? $('reader') : $('feed')).prepend(warning);
  }
}

initialize().finally(() => delete window.zamenStartup);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', {updateViaCache: 'none'}).catch(() => {});
