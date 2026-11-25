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

function group(story) {
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
const dateOptions = {calendar: 'gregory', timeZone: 'Asia/Riyadh'};
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
let licensed = {};
let category = categoryAlias(params.get('category'));
let query = params.get('q') || '';
let loaded = false;
let sidebarOpen;
const tablet = matchMedia('(min-width: 760px)');
const sidebarDefault = () => !tablet.matches || read('zamen-sidebar-closed', false) !== true;

function route({section = home, q = '', article = ''} = {}) {
  const next = new URLSearchParams();
  if (article) next.set('article', article);
  if (section !== home) next.set('category', section);
  if (q) next.set('q', q);
  const search = next.toString();
  return search ? '?' + search : './';
}

function setSidebar(open) {
  sidebarOpen = open;
  $('sidebar').hidden = !open;
  $('sidebarToggle').setAttribute('aria-expanded', String(open));
}

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
  $('bottom').querySelector('button')?.setAttribute('aria-expanded', String(open));
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
  setSidebar(!sidebarOpen);
  if (tablet.matches) save('zamen-sidebar-closed', !sidebarOpen);
};
tablet.addEventListener('change', () => setSidebar(sidebarDefault()));
setSidebar(sidebarDefault());
syncTheme();
root.style.setProperty('--reading-size', readingSize / 16 + 'rem');

function navLink(name, glyph, className) {
  const a = link(name, route({section: name}), className, glyph);
  if (category === name) a.setAttribute('aria-current', articleId ? 'location' : 'page');
  return a;
}

function renderNav() {
  const known = new Set(categories.map(([name]) => name));
  const extra = [...new Set(items.map(group))].filter(name => !known.has(name));
  const sections = [...categories.slice(0, -1), ...extra.map(name => [name, 'layers']), categories.at(-1)];
  $('nav').replaceChildren(...sections.map(([name, glyph]) => navLink(name, glyph, 'nav-link')));
  const search = element('button', '', 'tab');
  search.type = 'button';
  search.append(icon('search'), document.createTextNode('بحث'));
  search.setAttribute('aria-controls', 'searchPanel');
  search.setAttribute('aria-expanded', String(!$('searchPanel').hidden));
  search.onclick = searchToggle;
  $('bottom').replaceChildren(navLink(home, 'home', 'tab'), navLink('السياسة', 'globe', 'tab'), search, navLink(saved, 'bookmark', 'tab'));
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
  $('searchToggle').focus();
};

const title = story => story.title_ar || story.original_title || 'خبر';
const articleURL = story => route({article: String(story.id), section: category, q: query});
const normalize = value => value.toLowerCase().normalize('NFKC').replace(/[\u064B-\u065F\u0640]/g, '').replace(/[أإآ]/g, 'ا');

function filtered() {
  const needle = normalize(query);
  return items.filter(story => {
    const inSection = category === home || (category === saved ? fav.has(String(story.id)) : group(story) === category);
    return inSection && (!needle || normalize([story.title_ar, story.original_title, story.summary_ar, story.excerpt, story.source].join(' ')).includes(needle));
  });
}

function imageCandidates(story) {
  return [...new Set([story.image_url, story.image, images[story.id]].map(safe).filter(Boolean))];
}

function responsiveImage(source) {
  const url = new URL(source);
  if (url.hostname !== 'ichef.bbci.co.uk') return null;

  // These BBC paths refer to the same media ID in the source's resized endpoint.
  const match = url.pathname.match(/^\/(?:news\/\d+\/branded_arabic|ace\/branded_news\/\d+\/cpsprodpb)\/([a-z0-9]+\/live\/[a-z0-9.-]+)$/i);
  if (!match) return null;
  return [480, 640, 800, 1024].map(width =>
    url.origin + '/news/' + width + '/cpsprodpb/' + match[1] + ' ' + width + 'w'
  ).join(', ');
}

function media(story, {priority = false, reader = false} = {}) {
  const candidates = imageCandidates(story);
  if (reader && !candidates.length) return null;
  const frame = element('div', '', 'media');
  const mark = element('div', '', 'mark');
  const logo = element('img');
  logo.src = 'icon.svg';
  logo.alt = '';
  logo.width = 32;
  logo.height = 32;
  const unavailable = element('span', 'الصورة غير متاحة');
  unavailable.hidden = candidates.length > 0;
  mark.append(logo, unavailable);
  frame.append(mark);
  if (!candidates.length) {
    frame.classList.add('missing');
    return frame;
  }
  const photo = element('img', '', 'photo');
  photo.alt = typeof story.image_alt === 'string' ? story.image_alt : '';
  photo.loading = priority ? 'eager' : 'lazy';
  photo.fetchPriority = priority ? 'high' : 'auto';
  photo.decoding = 'async';
  photo.referrerPolicy = 'no-referrer';
  photo.addEventListener('load', () => { mark.hidden = true; });
  photo.sizes = reader ? '(min-width: 850px) 768px, 94vw' : priority ?
    '(min-width: 1450px) 820px, (min-width: 980px) 56vw, (min-width: 760px) 61vw, 94vw' :
    '(min-width: 1250px) 380px, (min-width: 650px) 44vw, 106px';
  function setSource(source) {
    const variants = responsiveImage(source);
    if (variants) photo.srcset = variants;
    photo.src = source;
  }
  photo.addEventListener('error', () => {
    if (photo.srcset) {
      photo.removeAttribute('srcset');
      return;
    }
    if (candidates.length) {
      setSource(candidates.shift());
      return;
    }
    photo.remove();
    unavailable.hidden = false;
    // Keep the reserved dimensions when an in-flight image fails.
  });
  setSource(candidates.shift());
  frame.append(photo);
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
  const copy = element('div', '', 'copy');
  const heading = element('h' + level);
  heading.append(link(title(story), articleURL(story)));
  if (variant !== 'brief') {
    article.append(media(story, {priority: variant === 'featured'}));
    copy.append(element('p', variant === 'featured' ? 'الخبر الرئيسي · ' + group(story) : group(story), 'tag'));
  }
  copy.append(heading);
  if (variant === 'featured' && (story.summary_ar || story.excerpt)) {
    const deck = element('p', story.summary_ar || story.excerpt, 'deck');
    deck.dir = 'auto';
    copy.append(deck);
  }
  copy.append(metadata(story));
  article.append(copy);
  return article;
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
  $('heading').textContent = query ? 'نتائج البحث' : category;
  $('heading').tabIndex = -1;
  $('count').textContent = count;
  $('feed').setAttribute('aria-busy', 'false');
  if (announceCount) announce(count);
  const target = $('news');
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
  front.append(card(list[0], 'featured'));
  if (list.length > 1) {
    const latest = element('section', '', 'latest');
    latest.append(element('h2', 'آخر الأخبار'), ...list.slice(1, 5).map(story => card(story, 'brief', 3)));
    front.append(latest);
  }
  target.append(front);
  const grouped = new Map();
  list.slice(1).forEach(story => {
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
    modes.push(['المقال المرخص', entry.text, entry.attribution, licenseURL]);
    if (entry.translation_ar) modes.push(['الترجمة', entry.translation_ar, entry.attribution, licenseURL]);
  }
  if (story.detailed_ar) {
    const note = story.content_basis === 'rss_excerpt' ? 'تغطية موسّعة مبنية على مقتطف RSS' : 'تغطية موسّعة مبنية على البيانات المتاحة';
    modes.push(['التغطية الموسّعة', story.detailed_ar, /gemini/i.test(story.model || '') ? note + ' بصياغة Gemini.' : note + '.']);
  }
  if (story.summary_ar) modes.push(['الملخص', story.summary_ar, 'ملخص الخبر. اقرأ النص المنشور لدى المصدر.']);
  if (story.excerpt) modes.push(['مقتطف RSS', story.excerpt, 'مقتطف من موجز RSS. اقرأ النص المنشور لدى المصدر.']);
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
  const sequence = list.includes(story) ? list : items;
  const index = sequence.indexOf(story);
  return [sequence[index - 1], sequence[index + 1]];
}

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
  } catch {
    const label = element('label', 'رابط المقال ');
    const field = element('input');
    field.value = url;
    field.readOnly = true;
    label.append(field);
    $('shareFeedback').replaceChildren(label);
    field.select();
  }
}

function renderReader() {
  $('feed').hidden = true;
  const reader = $('reader');
  reader.hidden = false;
  const back = link('العودة إلى الأخبار', route({section: category, q: query}), 'back', 'right');
  reader.append(back);
  const story = items.find(item => String(item.id) === articleId);
  if (!story) {
    reader.append(empty('هذا الخبر غير متاح في النسخة الحالية.'));
    return;
  }
  document.title = title(story) + ' | زامن';
  const bar = element('div', '', 'progress');
  bar.setAttribute('aria-hidden', 'true');
  const fill = element('span');
  bar.append(fill);
  reader.append(bar, element('p', group(story), 'tag'), element('h1', title(story)), metadata(story, false));
  const toolbar = element('div', '', 'reader-toolbar');
  const controls = sizes.map((size, index) => {
    const b = button(['صغير', 'متوسط', 'كبير'][index]);
    b.setAttribute('aria-pressed', String(readingSize === size));
    b.onclick = () => {
      readingSize = size;
      save('zamen-size', size);
      root.style.setProperty('--reading-size', size / 16 + 'rem');
      controls.forEach((control, i) => control.setAttribute('aria-pressed', String(sizes[i] === size)));
      updateProgress();
    };
    return b;
  });
  const shareButton = button('مشاركة المقال', 'share', 'icon-button');
  shareButton.onclick = () => share(story);
  toolbar.append(element('span', 'حجم الخط'), ...controls, bookmark(story), shareButton);
  const feedback = element('span', '', 'note');
  feedback.id = 'shareFeedback';
  toolbar.append(feedback);
  reader.append(toolbar);
  const image = media(story, {priority: true, reader: true});
  if (image) reader.append(image);
  const modes = readingModes(story);
  const modeBar = element('div', '', 'controls');
  const copy = element('div', '', 'reading-copy');
  const showMode = index => {
    const [, text, note, licenseURL] = modes[index];
    copy.replaceChildren(element('p', note, 'note'), ...paragraphs(text));
    if (licenseURL) copy.append(link('ترخيص المحتوى', licenseURL, 'original', 'external'));
    [...modeBar.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
    updateProgress();
  };
  modes.forEach(([label], index) => {
    const mode = button(label);
    mode.onclick = () => showMode(index);
    modeBar.append(mode);
  });
  reader.append(modeBar, copy);
  const original = safe(story.article_url);
  if (original) reader.append(link('اقرأ لدى المصدر الأصلي', original, 'original', 'external'));
  const [previous, next] = readerNeighbors(story);
  const links = element('nav', '', 'reader-links');
  links.setAttribute('aria-label', 'التنقل بين الأخبار');
  links.append(
    previous ? link('الخبر السابق', articleURL(previous), '', 'right') : disabledLink('الخبر السابق'),
    next ? link('الخبر التالي', articleURL(next), '', 'left') : disabledLink('الخبر التالي')
  );
  reader.append(links);
  function updateProgress() {
    const bottom = copy.getBoundingClientRect().bottom + scrollY - innerHeight;
    fill.style.transform = 'scaleX(' + Math.min(1, scrollY / Math.max(1, bottom)) + ')';
  }
  if (modes.length) showMode(0);
  else copy.append(element('p', 'يتوفر رابط المصدر لهذا الخبر.', 'note'));
  addEventListener('scroll', updateProgress, {passive: true});
  addEventListener('resize', updateProgress);
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
      !event.target.closest('button,a,input') ? touch : null;
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
    if (story) location.href = articleURL(story);
  }, {passive: true});
}

async function load(path, validate) {
  const response = await fetch(path, {cache: 'no-cache'});
  if (!response.ok) throw new Error(path);
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
  const [rss, sheets, mediaData, licenses] = await Promise.allSettled([
    load('data/news.json', isFeed), load('data/sheets-news.json', isFeed),
    load('data/images.json', isMap), load('data/licensed-articles.json', isMap)
  ]);
  if (!rss.value && !sheets.value) {
    $('feed').setAttribute('aria-busy', 'false');
    $('news').replaceChildren(empty('تعذر تحميل الأخبار. تحقّق من الاتصال وحاول مجددًا.', true));
    announce('تعذر تحميل الأخبار');
    return;
  }
  const arabic = /[\u0600-\u06ff]/;
  const publicRSS = (rss.value?.items || []).filter(story => arabic.test(story?.title_ar) && arabic.test(story?.summary_ar));
  items = [...new Map([...publicRSS, ...(sheets.value?.items || [])]
    .filter(story => story?.id !== undefined && story.id !== null)
    .map(story => [String(story.id), story])).values()]
    .sort((a, b) => (Date.parse(b.published_at) || 0) - (Date.parse(a.published_at) || 0));
  images = mediaData.value || {};
  licensed = licenses.value || {};
  loaded = true;
  showUpdated([rss.value, sheets.value]);
  renderNav();
  if (articleId) {
    announce('');
    renderReader();
  } else {
    renderFeed();
  }
  if (!rss.value || !sheets.value) {
    const warning = element('p', 'بعض الأخبار غير متاحة الآن.', 'note');
    (articleId ? $('reader') : $('feed')).prepend(warning);
  }
}

initialize();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js', {updateViaCache: 'none'}).catch(() => {});
