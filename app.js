/* Каталог, выбор способа получения, корзина. Оформление заказа — в checkout.js */
(function () {
  'use strict';

  var CFG = window.APP_CONFIG;
  var WA = window.WebApp || null; // есть только внутри MAX

  // ---------- утилиты ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) {
    return Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ') + ' ' + CFG.currency;
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function store(key, val) {
    try {
      if (val === undefined) { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  function haptic(kind) {
    try {
      if (!WA || !WA.HapticFeedback) return;
      if (kind === 'select') WA.HapticFeedback.selectionChanged().catch(function () {});
      else if (kind === 'success' || kind === 'error' || kind === 'warning') WA.HapticFeedback.notificationOccurred(kind).catch(function () {});
      else WA.HapticFeedback.impactOccurred(kind || 'light').catch(function () {});
    } catch (e) {}
  }
  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2200);
  }

  // иконки (линейные, берут цвет текста)
  var ICON_PATHS = {
    delivery: '<path d="M5 16v-5l1.6-4.2A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.9 1.3L19 11v5"/><path d="M3.5 16h17v2.5h-3V16M6.5 16v2.5h-3M5 11h14"/><circle cx="8" cy="13.5" r=".7"/><circle cx="16" cy="13.5" r=".7"/>',
    pickup: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    catalog: '<path d="M12 6c-2-1.3-5-1.5-8-1v13c3-.5 6-.3 8 1 2-1.3 5-1.5 8-1V5c-3-.5-6-.3-8 1z"/><path d="M12 6v13"/>',
    pin: '<path d="M12 21s-6-5.6-6-10.2A6 6 0 0 1 18 10.8C18 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.2"/>',
    home: '<path d="M4 11l8-6.5 8 6.5"/><path d="M6 10v9h12v-9"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.2-4.2"/>',
    menu: '<path d="M5 8h14M5 12h14M5 16h14"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    orders: '<path d="M7 4h10a1 1 0 0 1 1 1v15l-3-1.8L12 20l-3-1.8L6 20V5a1 1 0 0 1 1-1z"/><path d="M9 9h6M9 13h6"/>'
  };
  function icon(name, size) {
    size = size || 22;
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON_PATHS[name] + '</svg>';
  }

  // ---------- состояние ----------
  var state = {
    data: { catalog: [], categories: [], zones: [], pickup: [], settings: {} },
    cart: store('cart') || {},     // { productId: qty }
    mode: store('mode'),           // 'delivery' | 'pickup' | 'catalog' | null (ещё не выбирали)
    place: store('place') || {},   // { address, zoneId, pickupId }
    query: '',
    group: 0,
  };
  var openCat = null;      // название открытой категории
  var noticeShown = false; // подсказку показываем один раз за запуск

  function mode() { return state.mode || 'catalog'; }
  function canOrder() { return mode() === 'delivery' || mode() === 'pickup'; }
  function product(id) {
    for (var i = 0; i < state.data.catalog.length; i++) if (state.data.catalog[i].id === id) return state.data.catalog[i];
    return null;
  }
  function zoneById(id) { var z = state.data.zones; for (var i = 0; i < z.length; i++) if (z[i].id === id) return z[i]; return null; }
  function pointById(id) { var p = state.data.pickup; for (var i = 0; i < p.length; i++) if (p[i].id === id) return p[i]; return null; }

  function cartLines() {
    var lines = [];
    Object.keys(state.cart).forEach(function (id) {
      var p = product(id), q = state.cart[id];
      if (p && p.available && q > 0) lines.push({ p: p, qty: q, sum: p.price * q });
    });
    return lines;
  }
  function cartTotal() { return cartLines().reduce(function (s, l) { return s + l.sum; }, 0); }
  function cartCount() { return cartLines().reduce(function (s, l) { return s + l.qty; }, 0); }
  function saveCart() { store('cart', state.cart); }
  function setQty(id, qty) {
    if (qty <= 0) delete state.cart[id]; else state.cart[id] = Math.min(qty, 99);
    saveCart();
    renderQtyUI(id);
    renderCartBar();
  }
  function clearCart() { state.cart = {}; saveCart(); renderCartBar(); repaintOpen(); }

  // ---------- загрузка данных ----------
  function normalize(d) {
    d = d || {};
    var catalog = (d.catalog || []).map(function (r) {
      return {
        id: String(r.id), category: String(r.category || 'Другое'), name: String(r.name || ''),
        description: String(r.description || ''), price: Number(r.price) || 0, weight: String(r.weight || ''),
        emoji: String(r.emoji || '🍽️'), image: String(r.image || ''),
        available: !(r.available === false || String(r.available).toLowerCase() === 'false' || String(r.available) === '0' || String(r.available).toLowerCase() === 'нет'),
      };
    }).filter(function (p) { return p.id && p.name; });
    var cats = (d.categories || []).map(function (c) {
      return { group: String(c.group || 'Каталог'), name: String(c.name || ''), emoji: String(c.emoji || '🍽️'), image: String(c.image || '') };
    }).filter(function (c) { return c.name; });
    // категории, которых нет в списке, но которые есть у товаров, добавляем сами
    var known = {};
    cats.forEach(function (c) { known[c.name] = true; });
    catalog.forEach(function (p) {
      if (!known[p.category]) { known[p.category] = true; cats.push({ group: 'Каталог', name: p.category, emoji: p.emoji, image: '' }); }
    });
    // пустые категории не показываем
    var used = {};
    catalog.forEach(function (p) { used[p.category] = true; });
    if (!CFG.showEmptyCategories) cats = cats.filter(function (c) { return used[c.name]; });
    return { catalog: catalog, categories: cats, zones: d.zones || [], pickup: d.pickup || [], settings: d.settings || {} };
  }

  function load() {
    if (!CFG.API_URL) return Promise.resolve(normalize(window.DEMO_DATA));
    return fetch(CFG.API_URL + '?action=bootstrap', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.error) throw new Error(d.error);
        store('bootstrap', d);
        return normalize(d);
      })
      .catch(function (e) {
        var cached = store('bootstrap');
        if (cached) { toast('Нет связи, показываем сохранённый каталог'); return normalize(cached); }
        throw e;
      });
  }

  // ---------- рендер ----------
  function groups() {
    var list = [];
    state.data.categories.forEach(function (c) { if (list.indexOf(c.group) < 0) list.push(c.group); });
    return list;
  }

  function qtyControl(p) {
    if (!canOrder()) return '<button class="btn btn--sm btn--ghost" data-action="open-mode">Заказать</button>';
    if (!p.available) return '<span class="muted">Нет в наличии</span>';
    var q = state.cart[p.id] || 0;
    if (!q) return '<button class="btn btn--sm" data-action="add" data-id="' + esc(p.id) + '">В корзину</button>';
    return '<div class="stepper"><button data-action="dec" data-id="' + esc(p.id) + '" aria-label="Меньше">−</button><span>' + q + '</span><button data-action="inc" data-id="' + esc(p.id) + '" aria-label="Больше">+</button></div>';
  }

  function mediaHTML(image, emoji) {
    return image
      ? '<img src="' + esc(image) + '" alt="" loading="lazy" onerror="this.parentNode.textContent=\'' + esc(emoji) + '\'">'
      : esc(emoji);
  }

  function cardHTML(p) {
    return '<article class="card' + (p.available ? '' : ' is-off') + '" data-pid="' + esc(p.id) + '">' +
      '<div class="card__img" data-action="open-product" data-id="' + esc(p.id) + '">' + mediaHTML(p.image, p.emoji) + '</div>' +
      '<div class="card__body">' +
        '<div class="card__name" data-action="open-product" data-id="' + esc(p.id) + '">' + esc(p.name) + '</div>' +
        '<div class="card__meta">' + esc(p.weight) + '</div>' +
        '<div class="card__foot"><span class="price">' + fmt(p.price) + '</span><span class="qty" data-qty="' + esc(p.id) + '">' + qtyControl(p) + '</span></div>' +
      '</div></article>';
  }

  function tileHTML(c) {
    return '<button class="card tile" data-action="open-cat" data-cat="' + esc(c.name) + '">' +
      '<span class="card__img">' + mediaHTML(c.image, c.emoji) + '</span>' +
      '<span class="card__body"><span class="card__name">' + esc(c.name) + '</span></span></button>';
  }

  function renderHeader() {
    $('#homeBtn').innerHTML = icon('home');
    $('#searchBtn').innerHTML = icon('search');
    $('#menuBtn').innerHTML = icon('menu');
    $('#shopName').textContent = CFG.shopName;
    $('#tagline').textContent = CFG.tagline;
    document.title = CFG.shopName;
  }

  function renderPlaceBar() {
    var b = $('#placeBar'), m = mode(), text, sub = '';
    if (m === 'delivery') {
      var z = zoneById(state.place.zoneId);
      text = state.place.address || 'Укажите адрес доставки';
      if (z) sub = z.name + (z.eta ? ' · ' + z.eta : '');
      b.dataset.action = 'open-place';
    } else if (m === 'pickup') {
      var p = pointById(state.place.pickupId);
      text = p ? p.name + ', ' + p.address : 'Выберите точку самовывоза';
      b.dataset.action = 'open-place';
    } else {
      text = 'Онлайн-каталог · выберите способ получения';
      b.dataset.action = 'open-mode';
    }
    b.innerHTML = icon('pin') + '<span class="placebar__t">' + esc(text) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' + icon('chevron', 18);
  }

  function renderBanners() {
    var el = $('#banners'), list = CFG.banners || [];
    el.hidden = !list.length || !!state.query.trim();
    el.innerHTML = list.map(function (b, i) {
      return '<button class="banner banner--' + (i % 3) + '" data-action="banner" data-cat="' + esc(b.cat || '') + '"><b>' + esc(b.title) + '</b><span>' + esc(b.text) + '</span></button>';
    }).join('');
  }

  function renderChips() {
    $('#cats').innerHTML = groups().map(function (g, i) {
      return '<button class="chip' + (state.group === i ? ' is-active' : '') + '" data-action="chip" data-gi="' + i + '">' + esc(g) + '</button>';
    }).join('');
  }

  function renderCatalog() {
    var q = state.query.trim().toLowerCase(), el = $('#catalog'), html = '', shown = 0;
    $('#cats').hidden = !!q;
    if (q) {
      var items = state.data.catalog.filter(function (p) { return (p.name + ' ' + p.description).toLowerCase().indexOf(q) >= 0; });
      shown = items.length;
      html = '<section class="section"><div class="grid">' + items.map(cardHTML).join('') + '</div></section>';
    } else {
      groups().forEach(function (g, gi) {
        var cats = state.data.categories.filter(function (c) { return c.group === g; });
        shown += cats.length;
        html += '<section class="section" id="grp-' + gi + '" data-gi="' + gi + '"><h2>' + esc(g) + '</h2><div class="grid">' + cats.map(tileHTML).join('') + '</div></section>';
      });
    }
    el.innerHTML = html;
    $('#empty').hidden = shown > 0;
    renderBanners();
  }

  // точечное обновление кнопки количества, чтобы не перерисовывать всю сетку
  function renderQtyUI(id) {
    var p = product(id);
    if (!p) return;
    var sel = id.replace(/"/g, '\\"');
    document.querySelectorAll('[data-qty="' + sel + '"]').forEach(function (el) { el.innerHTML = qtyControl(p); });
    var sq = document.querySelector('[data-sheet-qty="' + sel + '"]');
    if (sq) sq.innerHTML = qtyControl(p);
    refreshCartSheet();
  }

  function renderCartBar() {
    var bar = $('#cartBar'), n = cartCount();
    bar.hidden = n === 0 || !canOrder();
    if (!bar.hidden) bar.innerHTML = '<span>Корзина · ' + n + '</span><span>' + fmt(cartTotal()) + '</span>';
  }

  // ---------- шторки ----------
  var stack = [];
  function syncBack() {
    document.body.classList.toggle('cat-open', stack[stack.length - 1] === 'category');
    if (!WA || !WA.BackButton) return;
    try { if (stack.length) WA.BackButton.show(); else WA.BackButton.hide(); } catch (e) {}
  }
  function openSheet(id, title, bodyHTML, footHTML, opts) {
    closeSheet(id, true);
    var ov = document.createElement('div');
    ov.className = 'overlay'; ov.dataset.sheet = id;
    ov.addEventListener('click', function () { closeTop(); });
    var sh = document.createElement('div');
    sh.className = 'sheet' + (opts && opts.full ? ' sheet--full' : ''); sh.dataset.sheet = id;
    sh.innerHTML = '<div class="sheet__head"><h2>' + esc(title) + '</h2><button class="sheet__x" data-action="close" aria-label="Закрыть">✕</button></div>' +
      '<div class="sheet__body">' + bodyHTML + '</div>' + (footHTML ? '<div class="sheet__foot">' + footHTML + '</div>' : '');
    $('#sheets').appendChild(ov); $('#sheets').appendChild(sh);
    requestAnimationFrame(function () { ov.classList.add('is-in'); sh.classList.add('is-in'); });
    stack.push(id);
    syncBack();
    syncGuard();
    return sh;
  }
  function closeSheet(id, silent) {
    var els = document.querySelectorAll('[data-sheet="' + id + '"]');
    if (!els.length) return;
    els.forEach(function (el) { el.remove(); });
    stack = stack.filter(function (s) { return s !== id; });
    if (id === 'category') openCat = null;
    if (!silent) syncBack();
    syncGuard();
  }
  function closeTop() { if (stack.length) closeSheet(stack[stack.length - 1]); }
  function closeAll() { stack.slice().forEach(function (id) { closeSheet(id); }); }
  function sheetEl(id) { return document.querySelector('.sheet[data-sheet="' + id + '"]'); }

  // «Назад» (свайп на Android, кнопка браузера) закрывает верхнее окошко, а не уходит с сайта.
  // Пока открыто хоть одно окошко, в истории браузера лежит одна служебная запись.
  var guardOn = false, selfBack = false;
  function layers() { return stack.length + (welcomeSel ? 1 : 0); }
  function syncGuard() {
    if (layers() > 0 && !guardOn) {
      try { history.pushState({ layer: 1 }, ''); guardOn = true; } catch (e) {}
    } else if (layers() === 0 && guardOn) {
      // с задержкой: если сразу откроется другое окошко, запись остаётся
      setTimeout(function () {
        if (layers() === 0 && guardOn) { guardOn = false; selfBack = true; history.back(); }
      }, 0);
    }
  }
  window.addEventListener('popstate', function () {
    if (selfBack) { selfBack = false; return; }
    if (!guardOn) return;
    guardOn = false; // служебную запись «назад» уже забрал
    if (stack.length) closeTop();
    else if (welcomeSel) { welcomeSel = null; paintWelcome(); }
    syncGuard();
  });

  if (WA && WA.BackButton) { try { WA.BackButton.onClick(closeTop); } catch (e) {} }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeTop(); });

  // категория
  function categoryBody(name) {
    var items = state.data.catalog.filter(function (p) { return p.category === name; });
    if (!items.length) return '<div class="empty">Товары появятся совсем скоро</div>';
    return '<div class="grid">' + items.map(cardHTML).join('') + '</div>';
  }
  function openCategory(name) {
    openCat = name;
    openSheet('category', name, categoryBody(name), '', { full: true });
    openCat = name;
  }
  function repaintOpen() {
    if (openCat && sheetEl('category')) sheetEl('category').querySelector('.sheet__body').innerHTML = categoryBody(openCat);
  }

  // карточка товара
  function openProduct(id) {
    var p = product(id);
    if (!p) return;
    var body = '<div class="hero-img">' + mediaHTML(p.image, p.emoji) + '</div>' +
      '<p class="muted" style="margin-bottom:6px">' + esc(p.weight) + '</p><p>' + esc(p.description) + '</p>';
    var foot = '<div class="row"><span class="price" style="font-size:20px">' + fmt(p.price) + '</span><span data-sheet-qty="' + esc(p.id) + '">' + qtyControl(p) + '</span></div>';
    openSheet('product', p.name, body, foot);
  }

  // корзина
  function cartSheetBody() {
    var lines = cartLines();
    if (!lines.length) return '<div class="empty">Корзина пуста</div>';
    return lines.map(function (l) {
      return '<div class="line row"><div><div class="line__name">' + esc(l.p.name) + '</div><div class="muted">' + fmt(l.p.price) + ' · ' + esc(l.p.weight) + '</div></div>' +
        '<div style="text-align:right"><div class="stepper"><button data-action="dec" data-id="' + esc(l.p.id) + '">−</button><span>' + l.qty + '</span><button data-action="inc" data-id="' + esc(l.p.id) + '">+</button></div>' +
        '<div class="price" style="margin-top:4px">' + fmt(l.sum) + '</div></div></div>';
    }).join('');
  }
  function cartSheetFoot() {
    if (!cartLines().length) return '';
    return '<div class="row big"><span>Итого за товары</span><b class="price">' + fmt(cartTotal()) + '</b></div>' +
      '<button class="btn" data-action="checkout">Оформить заказ</button>' +
      '<button class="btn btn--ghost" data-action="clear-cart">Очистить корзину</button>';
  }
  function openCart() { openSheet('cart', 'Корзина', cartSheetBody(), cartSheetFoot()); }
  function refreshCartSheet() {
    var sh = sheetEl('cart');
    if (!sh) return;
    if (!cartLines().length) { closeSheet('cart'); return; }
    sh.querySelector('.sheet__body').innerHTML = cartSheetBody();
    var foot = sh.querySelector('.sheet__foot');
    if (foot) foot.innerHTML = cartSheetFoot();
  }

  // ---------- выбор способа получения ----------
  var MODE_IDS = ['delivery', 'pickup', 'catalog'];
  var modeSel = 'delivery';
  function paintModes() {
    var el = $('#mode-opts'); if (!el) return;
    el.innerHTML = MODE_IDS.map(function (id) {
      var m = CFG.modes[id], on = modeSel === id;
      return '<button class="opt' + (on ? ' is-on' : '') + '" data-action="mode-pick" data-v="' + id + '">' +
        '<span class="opt__ic">' + icon(id) + '</span>' +
        '<span class="opt__t"><b>' + esc(m.title) + '</b>' + (on ? '<small>' + esc(m.text) + '</small>' : '') + '</span>' +
        '<span class="radio"></span></button>';
    }).join('');
  }
  function openMode() {
    modeSel = state.mode || 'delivery';
    openSheet('mode', 'Как получить заказ?', '<div id="mode-opts"></div>', '<button class="btn" data-action="mode-save">Продолжить</button>');
    paintModes();
  }
  function afterModeChange() {
    renderPlaceBar(); renderCartBar(); renderCatalog(); repaintOpen();
  }
  function saveMode() {
    state.mode = modeSel; store('mode', modeSel);
    closeSheet('mode');
    afterModeChange();
    if (canOrder()) openNotice();
  }

  // ---------- входная страница (знакомство + выбор) ----------
  var welcomeSel = null;
  function xx(text) {
    // неизвестные места (XXXXX) подсвечиваем, чтобы их было видно и заполнили
    return esc(text).replace(/XXXXX/g, '<mark class="xx">XXXXX</mark>');
  }
  function welcomeHTML() {
    var brand = CFG.logo
      ? '<img class="welcome__logo" src="' + esc(CFG.logo) + '" alt="' + esc(CFG.shopName) + '">'
      : '<h1 class="welcome__name">' + esc(CFG.shopName) + '</h1>';
    var rows = MODE_IDS.map(function (id) {
      return '<button class="opt opt--row" data-action="welcome-pick" data-v="' + id + '">' +
        '<span class="opt__ic">' + icon(id) + '</span>' +
        '<span class="opt__t"><b>' + esc(CFG.modes[id].title) + '</b></span>' +
        '<span class="radio"></span></button>';
    }).join('');
    return '<div class="welcome__col">' +
      '<div class="welcome__hero">' + brand + '<p class="welcome__tag">' + esc(CFG.tagline || '') + '</p></div>' +
      '<div class="welcome__panel">' +
        (CFG.welcome ? '<p class="welcome__hi">' + esc(CFG.welcome) + '</p>' : '') +
        rows +
        (CFG.welcomeInfo ? '<p class="welcome__info">' + esc(CFG.welcomeInfo) + '</p>' : '') +
      '</div></div>' +
      '<div class="welcome__sheet" id="welcomeSheet"></div>';
  }
  function paintWelcome() {
    var w = $('#welcome'), sh = $('#welcomeSheet');
    w.querySelectorAll('.opt--row').forEach(function (b) { b.classList.toggle('is-on', b.dataset.v === welcomeSel); });
    if (!welcomeSel) { sh.classList.remove('is-in'); return; }
    var m = CFG.modes[welcomeSel];
    sh.innerHTML = '<h2>' + esc(m.title) + '</h2><p>' + xx(m.welcomeText || m.text || '') + '</p>' +
      '<button class="btn" data-action="welcome-confirm">' + esc(CFG.welcomeButton || 'Продолжить') + '</button>';
    sh.classList.add('is-in');
  }
  function showWelcome() {
    var w = $('#welcome');
    // если разметку или стили затёрли при правке index.html — создаём сами
    if (!w) {
      w = document.createElement('div'); w.id = 'welcome'; w.className = 'welcome'; w.hidden = true;
      document.body.insertBefore(w, document.body.firstChild);
    }
    if (!document.querySelector('link[href^="welcome.css"]')) {
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'welcome.css?v=2'; document.head.appendChild(l);
    }
    welcomeSel = null;
    w.innerHTML = welcomeHTML();
    w.classList.remove('is-out');
    w.hidden = false;
    document.body.classList.add('welcome-on');
  }
  function hideWelcome() {
    var w = $('#welcome');
    w.classList.add('is-out');
    document.body.classList.remove('welcome-on');
    setTimeout(function () { w.hidden = true; }, 260);
    window.scrollTo(0, 0);
  }
  function pickWelcome(v) {
    state.mode = v; store('mode', v);
    welcomeSel = null;
    hideWelcome();
    syncGuard();
    afterModeChange();
    if (canOrder()) openNotice();
  }

  // подсказка перед заказом
  function openNotice() {
    if (noticeShown || !CFG.notice) return;
    noticeShown = true;
    var n = CFG.notice;
    var body = '<ol class="notice">' + n.items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol>';
    openSheet('notice', n.title, body, '<button class="btn" data-action="close">' + esc(n.button || 'Понятно') + '</button>');
  }

  // адрес доставки / точка самовывоза
  var pickSel = '';
  function paintPoints() {
    var el = $('#place-points'); if (!el) return;
    el.innerHTML = state.data.pickup.map(function (p) {
      var on = pickSel === p.id;
      return '<button class="opt' + (on ? ' is-on' : '') + '" data-action="point-pick" data-v="' + esc(p.id) + '"><span class="opt__ic">' + icon('pin') + '</span>' +
        '<span class="opt__t"><b>' + esc(p.name) + '</b><small>' + esc(p.address) + (p.hours ? ' · ' + esc(p.hours) : '') + '</small></span><span class="radio"></span></button>';
    }).join('');
  }
  function openPlace() {
    var m = mode();
    if (m === 'delivery') {
      var zones = state.data.zones;
      var body = '<div class="field"><label for="pl-zone">Зона доставки</label><select id="pl-zone">' + zones.map(function (z) {
        var price = Number(z.price) ? fmt(z.price) : 'бесплатно';
        return '<option value="' + esc(z.id) + '"' + (z.id === state.place.zoneId ? ' selected' : '') + '>' + esc(z.name) + ' · ' + price + '</option>';
      }).join('') + '</select></div>' +
        '<div class="field"><label for="pl-address">Адрес</label><input id="pl-address" maxlength="200" autocomplete="street-address" placeholder="Улица, дом, квартира" value="' + esc(state.place.address || '') + '"></div>';
      openSheet('place', 'Адрес доставки', body, '<button class="btn" data-action="place-save">Сохранить</button>');
    } else {
      pickSel = state.place.pickupId || (state.data.pickup[0] && state.data.pickup[0].id) || '';
      openSheet('place', 'Где забрать заказ', '<div id="place-points"></div>', '<button class="btn" data-action="place-save">Сохранить</button>');
      paintPoints();
    }
  }
  function savePlace() {
    var pl = state.place;
    if (mode() === 'delivery') {
      var addr = ($('#pl-address').value || '').trim();
      if (addr.length < 5) { toast('Укажите адрес полностью'); return; }
      pl.address = addr; pl.zoneId = $('#pl-zone').value;
    } else {
      pl.pickupId = pickSel;
    }
    store('place', pl);
    closeSheet('place');
    renderPlaceBar();
    haptic('success');
  }

  // меню
  function openMenu() {
    var orders = store('orders') || [];
    var html = '<button class="menu-item" data-action="open-mode">' + icon('pickup') + '<span>Способ получения<small>' + esc(CFG.modes[mode()].title) + '</small></span>' + icon('chevron', 18) + '</button>';
    if (orders.length) html += '<button class="menu-item" data-action="open-orders">' + icon('orders') + '<span>Мои заказы<small>' + orders.length + '</small></span>' + icon('chevron', 18) + '</button>';
    if (CFG.contactsText || CFG.supportPhone) html += '<div class="note" style="margin-top:12px">' + esc(CFG.contactsText || '') + (CFG.supportPhone ? '<br>' + esc(CFG.supportPhone) : '') + '</div>';
    openSheet('menu', 'Меню', html, '');
  }

  // ---------- события ----------
  function scrollToGroup(i) {
    var sec = document.getElementById('grp-' + i);
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var a = el.dataset.action, id = el.dataset.id;
    switch (a) {
      case 'add': setQty(id, 1); haptic('light'); break;
      case 'inc': setQty(id, (state.cart[id] || 0) + 1); haptic('select'); break;
      case 'dec': setQty(id, (state.cart[id] || 0) - 1); haptic('select'); break;
      case 'open-product': openProduct(id); break;
      case 'open-cat': openCategory(el.dataset.cat); break;
      case 'open-cart': openCart(); break;
      case 'clear-cart': clearCart(); closeSheet('cart'); break;
      case 'close': closeTop(); break;
      case 'chip': state.group = Number(el.dataset.gi); renderChips(); scrollToGroup(state.group); break;
      case 'banner':
        if (el.dataset.cat) openCategory(el.dataset.cat); else scrollToGroup(0);
        break;
      case 'home':
        closeAll(); state.query = ''; $('#search').value = ''; $('#searchRow').hidden = true; renderCatalog(); window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'toggle-search':
        var row = $('#searchRow'); row.hidden = !row.hidden;
        if (!row.hidden) $('#search').focus(); else { state.query = ''; $('#search').value = ''; renderCatalog(); }
        break;
      case 'open-menu': openMenu(); break;
      case 'open-mode': closeSheet('menu', true); openMode(); break;
      case 'mode-pick': modeSel = el.dataset.v; paintModes(); haptic('select'); break;
      case 'mode-save': saveMode(); break;
      case 'welcome-pick': welcomeSel = el.dataset.v; paintWelcome(); syncGuard(); haptic('select'); break;
      case 'welcome-confirm': if (welcomeSel) pickWelcome(welcomeSel); break;
      case 'open-place': openPlace(); break;
      case 'point-pick': pickSel = el.dataset.v; paintPoints(); haptic('select'); break;
      case 'place-save': savePlace(); break;
      case 'checkout':
        if (window.App && window.App.onCheckout) window.App.onCheckout();
        break;
      case 'open-orders': closeSheet('menu', true); if (window.App && window.App.onAction) window.App.onAction(a, el); break;
      default:
        if (window.App && window.App.onAction) window.App.onAction(a, el);
    }
  });

  var searchTimer;
  $('#search').addEventListener('input', function (e) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { state.query = e.target.value; renderCatalog(); }, 150);
  });

  // подсветка активного раздела при прокрутке
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking || state.query) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var current = null;
      document.querySelectorAll('.section').forEach(function (s) { if (s.getBoundingClientRect().top < 120) current = Number(s.dataset.gi); });
      if (current != null && current !== state.group) {
        state.group = current; renderChips();
        var act = document.querySelector('.chip.is-active');
        if (act && act.scrollIntoView) act.scrollIntoView({ inline: 'center', block: 'nearest' });
      }
    });
  }, { passive: true });

  // ---------- публичный API для checkout.js ----------
  window.App = {
    cfg: CFG, wa: WA, state: state,
    esc: esc, fmt: fmt, $: $, store: store, toast: toast, haptic: haptic, icon: icon,
    cartLines: cartLines, cartTotal: cartTotal, cartCount: cartCount, clearCart: clearCart,
    openSheet: openSheet, closeSheet: closeSheet, sheetEl: sheetEl,
    renderCartBar: renderCartBar,
    getMode: mode, getPlace: function () { return state.place; },
    onCheckout: null, onAction: null, onReady: null,
  };

  // ---------- старт ----------
  function start() {
    renderHeader();
    showWelcome();
    try { if (WA && WA.ready) WA.ready(); } catch (e) {}
    load().then(function (d) {
      state.data = d;
      $('#loading').hidden = true;
      // убрать из корзины то, чего уже нет в меню
      Object.keys(state.cart).forEach(function (id) { var p = product(id); if (!p || !p.available) delete state.cart[id]; });
      saveCart();
      renderChips(); renderPlaceBar(); renderCatalog(); renderCartBar();
      if (window.App.onReady) window.App.onReady();
    }).catch(function () {
      $('#loading').textContent = 'Не удалось загрузить каталог. Попробуйте позже.';
    });
  }
  start();
})();
