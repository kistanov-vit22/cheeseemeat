/* Оформление заказа: доставка / самовывоз, слоты времени, статусы заказа */
(function () {
  'use strict';
  var A = window.App;
  if (!A) return;
  var esc = A.esc, fmt = A.fmt, $ = A.$, CFG = A.cfg, WA = A.wa;

  // Статусы. В таблице владелец выбирает их из выпадающего списка — значения совпадают дословно.
  var FLOW = {
    delivery: ['Новый', 'Готовится', 'В пути', 'Выполнен'],
    pickup: ['Новый', 'Готовится', 'Готов к выдаче', 'Выполнен']
  };
  var STATUS_HINT = {
    'Новый': 'Заказ принят, скоро подтвердим',
    'Готовится': 'Кухня готовит ваш заказ',
    'В пути': 'Курьер уже едет к вам',
    'Готов к выдаче': 'Можно забирать',
    'Выполнен': 'Заказ выполнен. Приятного аппетита!',
    'Отменён': 'Заказ отменён'
  };

  var co = null; // состояние формы оформления

  // ---------- вспомогательное ----------
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function hhmm(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dayDate(i) { var n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate() + i); }
  function dayLabel(i) {
    if (i === 0) return 'Сегодня';
    if (i === 1) return 'Завтра';
    return dayDate(i).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function slotsFor(i) {
    var now = Date.now(), base = dayDate(i), step = CFG.slotMinutes, out = [];
    for (var m = CFG.openHour * 60; m + step <= CFG.closeHour * 60; m += step) {
      var start = base.getTime() + m * 60000;
      out.push({ label: hhmm(m) + '–' + hhmm(m + step), ok: start >= now + CFG.leadMinutes * 60000 });
    }
    return out;
  }
  function firstDayWithSlots() {
    for (var i = 0; i < CFG.daysAhead; i++) if (slotsFor(i).some(function (s) { return s.ok; })) return i;
    return 0;
  }
  function rand(n) {
    var s = '', c = 'abcdefghijkmnpqrstuvwxyz23456789';
    for (var i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)];
    return s;
  }
  function zone() { var z = A.state.data.zones; for (var i = 0; i < z.length; i++) if (z[i].id === co.zoneId) return z[i]; return null; }
  function point() { var p = A.state.data.pickup; for (var i = 0; i < p.length; i++) if (p[i].id === co.pickupId) return p[i]; return null; }
  function userUnsafe() { try { return (WA && WA.initDataUnsafe && WA.initDataUnsafe.user) || null; } catch (e) { return null; } }

  function calc() {
    var sub = A.cartTotal(), fee = 0, minOrder = 0, z = null;
    if (co.mode === 'delivery') {
      z = zone();
      if (z) {
        minOrder = Number(z.minOrder) || 0;
        var free = Number(z.freeFrom) || 0;
        fee = (free > 0 && sub >= free) ? 0 : (Number(z.price) || 0);
      }
    }
    return { sub: sub, fee: fee, total: sub + fee, minOrder: minOrder, zone: z };
  }

  // ---------- форма ----------
  function openCheckout() {
    var d = A.state.data, profile = A.store('profile') || {}, u = userUnsafe();
    var name = profile.name || (u ? [u.first_name, u.last_name].filter(Boolean).join(' ') : '');
    var pl = A.getPlace() || {};
    var isPickup = A.getMode() === 'pickup' && d.pickup.length > 0;
    if (!isPickup && !d.zones.length) isPickup = true;
    co = {
      mode: isPickup ? 'pickup' : 'delivery',
      zoneId: (pl.zoneId && d.zones.some(function (z) { return z.id === pl.zoneId; })) ? pl.zoneId : (d.zones.length ? d.zones[0].id : ''),
      pickupId: (pl.pickupId && d.pickup.some(function (p) { return p.id === pl.pickupId; })) ? pl.pickupId : (d.pickup.length ? d.pickup[0].id : ''),
      day: firstDayWithSlots(), slot: '',
      name: name, phone: profile.phone || '', address: pl.address || profile.address || '', comment: '',
      hasDelivery: false, hasPickup: false, sending: false // способ выбран на главном экране, переключатель скрыт
    };
    if (co.day === 0 && slotsFor(0).some(function (x) { return x.ok; })) co.slot = 'asap'; // по умолчанию «как можно скорее»
    var phoneBtn = (WA && WA.requestContact) ? '<button type="button" class="btn btn--ghost btn--sm" data-action="co-phone">Из MAX</button>' : '';
    var body =
      '<div class="seg" id="co-seg"></div>' +
      '<div class="field" data-f="name"><label for="co-name">Имя</label><input id="co-name" autocomplete="name" maxlength="60" value="' + esc(co.name) + '"></div>' +
      '<div class="field" data-f="phone"><label for="co-phone">Телефон</label><div class="row" style="gap:8px"><input id="co-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 900 000-00-00" value="' + esc(co.phone) + '">' + phoneBtn + '</div></div>' +
      '<div id="co-dyn"></div>' +
      '<div class="field"><label>День</label><div class="slots" id="co-days"></div></div>' +
      '<div class="field" data-f="slot"><label>Время</label><div class="slots" id="co-slots"></div></div>' +
      '<div class="field"><label for="co-comment">Комментарий</label><textarea id="co-comment" maxlength="300" placeholder="Домофон, этаж, пожелания"></textarea></div>' +
      '<div class="totals" id="co-totals"></div>';
    var foot = '<div class="err" id="co-err" hidden></div><button class="btn" id="co-submit" data-action="co-submit">Заказать</button>';
    var sh = A.openSheet('checkout', 'Оформление', body, foot);

    sh.addEventListener('input', function (e) {
      var t = e.target;
      if (t.id === 'co-name') co.name = t.value;
      else if (t.id === 'co-phone') co.phone = t.value;
      else if (t.id === 'co-address') co.address = t.value;
      else if (t.id === 'co-comment') co.comment = t.value;
      var f = t.closest('.field'); if (f) f.classList.remove('is-bad');
      if (t.id === 'co-name' || t.id === 'co-phone' || t.id === 'co-address') saveProfile(); // запоминаем, даже если заказ не оформили
    });
    sh.addEventListener('change', function (e) {
      if (e.target.id === 'co-zone') { co.zoneId = e.target.value; renderDyn(); renderTotals(); }
      if (e.target.id === 'co-point') { co.pickupId = e.target.value; renderDyn(); }
    });
    renderSeg(); renderDyn(); renderDays(); renderSlots(); renderTotals();
  }

  function saveProfile() {
    var old = A.store('profile') || {};
    A.store('profile', {
      name: co.name.trim() || old.name || '',
      phone: co.phone.trim() || old.phone || '',
      address: co.address.trim() || old.address || ''
    });
  }

  function renderSeg() {
    var el = $('#co-seg'); if (!el) return;
    if (!(co.hasDelivery && co.hasPickup)) { el.hidden = true; return; }
    el.innerHTML =
      '<button type="button" data-action="co-mode" data-v="delivery" class="' + (co.mode === 'delivery' ? 'is-on' : '') + '">Доставка</button>' +
      '<button type="button" data-action="co-mode" data-v="pickup" class="' + (co.mode === 'pickup' ? 'is-on' : '') + '">Самовывоз</button>';
  }

  function renderDyn() {
    var el = $('#co-dyn'); if (!el) return;
    var d = A.state.data, html = '';
    if (co.mode === 'delivery') {
      html += '<div class="field" data-f="zone"><label for="co-zone">Зона доставки</label><select id="co-zone">' +
        d.zones.map(function (z) {
          var price = Number(z.price) ? fmt(z.price) : 'бесплатно';
          return '<option value="' + esc(z.id) + '"' + (z.id === co.zoneId ? ' selected' : '') + '>' + esc(z.name) + ' · ' + price + '</option>';
        }).join('') + '</select></div>';
      var z = zone();
      if (z) {
        var bits = [];
        if (z.eta) bits.push('Время доставки: ' + esc(z.eta));
        if (Number(z.minOrder)) bits.push('Минимальный заказ: ' + fmt(z.minOrder));
        if (Number(z.freeFrom)) bits.push('Бесплатно от ' + fmt(z.freeFrom));
        if (bits.length) html += '<p class="hint">' + bits.join(' · ') + '</p>';
      }
      html += '<div class="field" data-f="address"><label for="co-address">Адрес</label><input id="co-address" autocomplete="street-address" maxlength="200" placeholder="Улица, дом, квартира" value="' + esc(co.address) + '"></div>';
    } else {
      html += '<div class="field" data-f="point"><label for="co-point">Где забрать</label><select id="co-point">' +
        d.pickup.map(function (p) {
          return '<option value="' + esc(p.id) + '"' + (p.id === co.pickupId ? ' selected' : '') + '>' + esc(p.name) + '</option>';
        }).join('') + '</select></div>';
      var p = point();
      if (p) html += '<p class="hint">' + esc(p.address) + (p.hours ? ' · ' + esc(p.hours) : '') + '</p>';
    }
    el.innerHTML = html;
  }

  function renderDays() {
    var el = $('#co-days'); if (!el) return;
    var html = '';
    for (var i = 0; i < CFG.daysAhead; i++) {
      html += '<button type="button" class="slot' + (co.day === i ? ' is-on' : '') + '" data-action="co-day" data-i="' + i + '">' + esc(dayLabel(i)) + '</button>';
    }
    el.innerHTML = html;
  }

  function renderSlots() {
    var el = $('#co-slots'); if (!el) return;
    var slots = slotsFor(co.day);
    var any = slots.some(function (s) { return s.ok; });
    if (co.slot === 'asap' ? !(co.day === 0 && any) : (co.slot && !slots.some(function (s) { return s.ok && s.label === co.slot; }))) co.slot = '';
    var html = '';
    if (co.day === 0 && any) html += '<button type="button" class="slot' + (co.slot === 'asap' ? ' is-on' : '') + '" data-action="co-slot" data-v="asap">Как можно скорее</button>';
    html += slots.map(function (s) {
      return '<button type="button" class="slot' + (co.slot === s.label ? ' is-on' : '') + '"' + (s.ok ? '' : ' disabled') + ' data-action="co-slot" data-v="' + esc(s.label) + '">' + s.label + '</button>';
    }).join('');
    if (co.slot === 'asap') html += '<p class="hint" style="width:100%">Как можно скорее: ' + esc(CFG.asapText || 'в течение 1–2 часов') + '. Подтвердим время по телефону.</p>';
    if (!any) html += '<p class="hint" style="width:100%">На этот день свободного времени нет, выберите другой день</p>';
    el.innerHTML = html;
  }

  function renderTotals() {
    var el = $('#co-totals'); if (!el) return;
    var c = calc(), html = '';
    html += '<div class="row"><span>Блюда</span><span>' + fmt(c.sub) + '</span></div>';
    if (co.mode === 'delivery') {
      html += '<div class="row"><span>Доставка</span><span>' + (c.fee ? fmt(c.fee) : 'бесплатно') + '</span></div>';
      var free = c.zone ? Number(c.zone.freeFrom) || 0 : 0;
      if (free > 0 && c.sub < free) html += '<p class="hint">Добавьте блюд на ' + fmt(free - c.sub) + ' — доставка будет бесплатной</p>';
      if (c.minOrder > c.sub) html += '<p class="err">Минимальный заказ для этой зоны — ' + fmt(c.minOrder) + '</p>';
    }
    html += '<div class="row big"><span>Итого</span><span>' + fmt(c.total) + '</span></div>';
    el.innerHTML = html;
    var btn = $('#co-submit'); if (btn) btn.textContent = 'Заказать · ' + fmt(c.total);
  }

  function showErr(msg) { var e = $('#co-err'); if (!e) return; e.textContent = msg || ''; e.hidden = !msg; }
  function bad(f) { var el = document.querySelector('#co-dyn [data-f="' + f + '"], [data-f="' + f + '"]'); if (el) el.classList.add('is-bad'); }

  function validate() {
    var digits = co.phone.replace(/\D/g, '');
    var c = calc(), errs = [];
    document.querySelectorAll('.is-bad').forEach(function (n) { n.classList.remove('is-bad'); });
    if (!A.cartLines().length) errs.push('Корзина пуста');
    if (co.name.trim().length < 2) { errs.push('Укажите имя'); bad('name'); }
    if (digits.length < 10) { errs.push('Проверьте телефон'); bad('phone'); }
    if (co.mode === 'delivery') {
      if (!co.zoneId) errs.push('Выберите зону доставки');
      if (co.address.trim().length < 5) { errs.push('Укажите адрес'); bad('address'); }
      if (c.minOrder > c.sub) errs.push('Минимальный заказ — ' + fmt(c.minOrder));
    } else if (!co.pickupId) errs.push('Выберите точку самовывоза');
    if (!co.slot) { errs.push('Выберите время'); bad('slot'); }
    return errs;
  }

  // ---------- отправка ----------
  function payload() {
    return {
      action: 'order',
      items: A.cartLines().map(function (l) { return { id: l.p.id, qty: l.qty }; }),
      mode: co.mode, zoneId: co.mode === 'delivery' ? co.zoneId : '', pickupId: co.mode === 'pickup' ? co.pickupId : '',
      date: ymd(dayDate(co.day)), slot: co.slot,
      name: co.name.trim(), phone: co.phone.trim(), address: co.mode === 'delivery' ? co.address.trim() : '',
      comment: co.comment.trim(),
      initData: (WA && WA.initData) || ''
    };
  }

  function slotText() {
    return dayLabel(co.day).toLowerCase() + ', ' + (co.slot === 'asap' ? 'как можно скорее' : co.slot);
  }

  function localOrder(id, token, serverOrder) {
    var c = calc(), z = zone(), p = point();
    return {
      id: id, token: token, createdAt: Date.now(), mode: co.mode, status: 'Новый',
      total: serverOrder && serverOrder.total != null ? serverOrder.total : c.total,
      fee: serverOrder && serverOrder.delivery != null ? serverOrder.delivery : c.fee,
      slot: slotText(),
      where: co.mode === 'delivery' ? (co.address.trim() + (z ? ' (' + z.name + ')' : '')) : (p ? p.name + ', ' + p.address : ''),
      items: A.cartLines().map(function (l) { return { id: l.p.id, name: l.p.name, qty: l.qty, sum: l.sum }; })
    };
  }

  function submit() {
    if (co.sending) return;
    var errs = validate();
    if (errs.length) { showErr(errs[0]); A.haptic('error'); return; }
    showErr('');
    co.sending = true;
    var btn = $('#co-submit'); btn.disabled = true; btn.textContent = 'Отправляем…';

    var p;
    var API = CFG.ORDER_URL || CFG.API_URL; // ORDER_URL: тест — каталог из демо, а заказ уходит в таблицу
    if (!API) {
      p = new Promise(function (res) { setTimeout(function () { res({ ok: true, order: { id: 'D' + (1000 + Math.floor(Math.random() * 9000)), token: rand(12) } }); }, 600); });
    } else {
      p = fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload()) })
        .then(function (r) { return r.json(); });
    }
    p.then(function (res) {
      if (!res || res.error || !res.order) throw new Error((res && res.error) || 'Не удалось отправить заказ');
      var o = localOrder(res.order.id, res.order.token, res.order);
      var list = A.store('orders') || [];
      list.unshift(o);
      A.store('orders', list.slice(0, 30));
      A.store('profile', { name: co.name.trim(), phone: co.phone.trim(), address: co.address.trim() });
      A.clearCart();
      A.closeSheet('checkout'); A.closeSheet('cart');
      A.haptic('success');
      syncOrdersBtn();
      openOrder(o.id);
    }).catch(function (e) {
      co.sending = false;
      btn.disabled = false; renderTotals();
      showErr(e && e.message && e.message !== 'Failed to fetch' ? e.message : 'Нет связи. Проверьте интернет и повторите');
      A.haptic('error');
    });
  }

  // ---------- заказы и статусы ----------
  function orders() { return A.store('orders') || []; }
  function saveOrder(o) {
    var list = orders();
    for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(o.id)) list[i] = o;
    A.store('orders', list);
  }
  function findOrder(id) { var l = orders(); for (var i = 0; i < l.length; i++) if (String(l[i].id) === String(id)) return l[i]; return null; }
  function isFinal(o) { return o.status === 'Выполнен' || o.status === 'Отменён'; }

  function refreshOrder(o) {
    if (isFinal(o)) return Promise.resolve(o);
    var API = CFG.ORDER_URL || CFG.API_URL;
    if (!API) { // демо: статус «двигается» сам каждые 20 секунд
      var flow = FLOW[o.mode], idx = Math.min(Math.floor((Date.now() - o.createdAt) / 20000), flow.length - 1);
      o.status = flow[idx]; saveOrder(o); return Promise.resolve(o);
    }
    return fetch(API + '?action=status&id=' + encodeURIComponent(o.id) + '&token=' + encodeURIComponent(o.token), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (res) { if (res && res.status) { o.status = res.status; saveOrder(o); } return o; })
      .catch(function () { return o; });
  }

  function badgeClass(s) { return s === 'Выполнен' ? ' is-done' : (s === 'Отменён' ? ' is-cancel' : ''); }

  function orderBody(o) {
    var flow = FLOW[o.mode] || FLOW.delivery, html = '';
    html += '<div class="row"><span class="badge' + badgeClass(o.status) + '">' + esc(o.status) + '</span><span class="muted">' + new Date(o.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + '</span></div>';
    html += '<p style="margin-top:8px">' + esc(STATUS_HINT[o.status] || '') + '</p>';
    if (o.status !== 'Отменён') {
      var cur = flow.indexOf(o.status);
      html += '<ul class="track">' + flow.map(function (s, i) {
        return '<li class="' + (i < cur ? 'is-done' : (i === cur ? (s === 'Выполнен' ? 'is-done' : 'is-now') : '')) + '">' + esc(s) + '</li>';
      }).join('') + '</ul>';
    }
    html += '<div class="line"><div class="muted">' + (o.mode === 'delivery' ? 'Доставка' : 'Самовывоз') + ' · ' + esc(o.slot) + '</div><div>' + esc(o.where) + '</div></div>';
    html += (o.items || []).map(function (it) {
      return '<div class="line row"><span>' + esc(it.name) + ' × ' + it.qty + '</span><span>' + fmt(it.sum) + '</span></div>';
    }).join('');
    if (o.mode === 'delivery') html += '<div class="line row"><span>Доставка</span><span>' + (o.fee ? fmt(o.fee) : 'бесплатно') + '</span></div>';
    html += '<div class="row big" style="padding-top:10px;font-weight:700;font-size:17px"><span>Итого</span><span>' + fmt(o.total) + '</span></div>';
    html += '<button class="btn" style="margin-top:14px" data-action="order-repeat" data-id="' + esc(o.id) + '">Повторить заказ</button>';
    if (CFG.supportPhone) html += '<p class="hint" style="margin-top:12px">Вопросы по заказу: ' + esc(CFG.supportPhone) + '</p>';
    return html;
  }

  var pollTimer = null;
  function openOrder(id) {
    var o = findOrder(id);
    if (!o) { A.toast('Заказ не найден на этом устройстве'); return; }
    var sh = A.openSheet('order', 'Заказ №' + o.id, orderBody(o), '');
    var f = sh.querySelector('.sheet__foot'); if (f) f.remove();
    function tick() {
      var cur = findOrder(id);
      if (!cur || !A.sheetEl('order')) { clearInterval(pollTimer); return; }
      refreshOrder(cur).then(function (u) {
        var s = A.sheetEl('order');
        if (s) s.querySelector('.sheet__body').innerHTML = orderBody(u);
        if (isFinal(u)) clearInterval(pollTimer);
      });
    }
    clearInterval(pollTimer);
    tick();
    pollTimer = setInterval(tick, 15000);
  }

  function openOrders() {
    var list = orders();
    if (!list.length) { A.toast('Заказов пока нет'); return; }
    var sh = A.openSheet('orders', 'Мои заказы', '<div id="orders-list"></div>', '');
    var f = sh.querySelector('.sheet__foot'); if (f) f.remove();
    function paint() {
      var el = $('#orders-list'); if (!el) return;
      el.innerHTML = orders().map(function (o) {
        return '<div class="order-card" data-action="order-open" data-id="' + esc(o.id) + '"><div class="row"><b>№' + esc(o.id) + '</b><span class="badge' + badgeClass(o.status) + '">' + esc(o.status) + '</span></div>' +
          '<div class="muted" style="margin-top:4px">' + esc(o.slot) + ' · ' + fmt(o.total) + '</div>' +
          '<button class="btn btn--ghost btn--sm" style="margin-top:8px" data-action="order-repeat" data-id="' + esc(o.id) + '">Повторить заказ</button></div>';
      }).join('');
    }
    paint();
    Promise.all(orders().map(refreshOrder)).then(paint);
  }

  function repeatOrder(id) {
    var o = findOrder(id); if (!o) return;
    var cat = A.state.data.catalog, added = 0, missing = [];
    (o.items || []).forEach(function (it) {
      var p = null;
      for (var i = 0; i < cat.length; i++) if ((it.id && cat[i].id === it.id) || (!it.id && cat[i].name === it.name)) { p = cat[i]; break; }
      if (p && p.available) { A.setQty(p.id, (A.state.cart[p.id] || 0) + it.qty); added++; } else missing.push(it.name);
    });
    A.closeSheet('order', true); A.closeSheet('orders', true);
    if (!added) { A.toast('Этих товаров сейчас нет в наличии'); return; }
    A.toast(missing.length ? 'Добавили в корзину. Нет в наличии: ' + missing.join(', ') : 'Заказ добавлен в корзину');
    A.haptic('success');
    A.openCart();
  }

  function syncOrdersBtn() { var b = $('#ordersBtn'); if (b) b.hidden = orders().length === 0; }

  // ---------- подключение к каталогу ----------
  A.onCheckout = openCheckout;
  A.onAction = function (a, el) {
    switch (a) {
      case 'co-mode': if (co) { co.mode = el.dataset.v; renderSeg(); renderDyn(); renderTotals(); A.haptic('select'); } break;
      case 'co-day': if (co) { co.day = Number(el.dataset.i); renderDays(); renderSlots(); A.haptic('select'); } break;
      case 'co-slot': if (co) { co.slot = el.dataset.v; renderSlots(); var f = document.querySelector('[data-f="slot"]'); if (f) f.classList.remove('is-bad'); A.haptic('select'); } break;
      case 'co-phone':
        if (WA && WA.requestContact) {
          WA.requestContact().then(function (r) {
            if (r && r.phone) { co.phone = '+' + String(r.phone).replace(/^\+/, ''); var i = $('#co-phone'); if (i) i.value = co.phone; }
          }).catch(function () { A.toast('Не удалось получить номер, введите вручную'); });
        }
        break;
      case 'co-submit': submit(); break;
      case 'open-orders': openOrders(); break;
      case 'order-open': openOrder(el.dataset.id); break;
      case 'order-repeat': repeatOrder(el.dataset.id); break;
    }
  };
  A.onReady = function () {
    syncOrdersBtn();
    // Диплинк https://max.ru/<бот>?startapp=order_<номер>
    try {
      var sp = WA && WA.initDataUnsafe && WA.initDataUnsafe.start_param;
      if (sp && String(sp).indexOf('order_') === 0) {
        var id = String(sp).slice(6);
        if (findOrder(id)) openOrder(id); else openOrders();
      }
    } catch (e) {}
  };
  // если каталог уже загрузился раньше, чем подключился этот файл
  if (A.state && A.state.data && A.state.data.catalog.length) A.onReady();
})();
