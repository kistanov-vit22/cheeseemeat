/**
 * Бэкенд мини-приложения на Google Apps Script.
 * Хранит меню, зоны, точки самовывоза и заказы в Google Таблице.
 * Инструкция — в README.md.
 */

var SHEETS = {
  Categories: ['group', 'name', 'emoji', 'image', 'sort'],
  Catalog: ['id', 'category', 'name', 'description', 'price', 'weight', 'emoji', 'image', 'available', 'sort'],
  Zones: ['id', 'name', 'price', 'freeFrom', 'minOrder', 'eta', 'active'],
  Pickup: ['id', 'name', 'address', 'hours', 'active'],
  Orders: ['id', 'token', 'createdAt', 'status', 'mode', 'date', 'slot', 'name', 'phone', 'where', 'comment', 'items', 'subtotal', 'delivery', 'total', 'userId', 'userName']
};
var STATUSES = ['Новый', 'Готовится', 'В пути', 'Готов к выдаче', 'Выполнен', 'Отменён'];

// ---------- первичная настройка: запустите setup() один раз ----------
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  });

  var cats = ss.getSheetByName('Categories');
  if (cats.getLastRow() === 1) {
    var rows = [
      ['Полуфабрикаты', 'Пельмени', '🥟', '', 1],
      ['Полуфабрикаты', 'Вареники', '🥟', '', 2],
      ['Полуфабрикаты', 'Прочие полуфабрикаты', '🍲', '', 3],
      ['Полуфабрикаты', 'Манты/позы/буузы', '🥟', '', 4],
      ['Полуфабрикаты', 'Котлеты/биточки', '🍔', '', 5],
      ['Полуфабрикаты', 'Блины', '🥞', '', 6],
      ['Колбасы', 'Варёные колбасы', '🌭', '', 7],
      ['Колбасы', 'Копчёные колбасы', '🥩', '', 8],
      ['Колбасы', 'СК и СВ колбасы', '🥓', '', 9],
      ['Колбасы', 'Сосиски и сардельки', '🌭', '', 10],
      ['Колбасы', 'Ливерные колбасы', '🍖', '', 11],
      ['Деликатесы мясные', 'Копчёные деликатесы', '🍖', '', 12],
      ['Деликатесы мясные', 'СК и СВ деликатесы', '🥓', '', 13],
      ['Сало, шпик, грудинка', 'Сало и шпик', '🥓', '', 14],
      ['Сало, шпик, грудинка', 'Грудинка', '🥓', '', 15],
      ['Сыры', 'Сыры с добавками', '🧀', '', 16],
      ['Сыры', 'Мягкий сыр', '🧀', '', 17],
      ['Сыры', 'Полутвердый сыр', '🧀', '', 18],
      ['Сыры', 'Рассольный сыр', '🧀', '', 19],
      ['Сыры', 'Плавленый сыр', '🧀', '', 20],
      ['Сыры', 'Сыр с плесенью', '🧀', '', 21],
      ['Хлеб и выпечка', 'Хлеб', '🍞', '', 22],
      ['Хлеб и выпечка', 'Сухарные изделия', '🥖', '', 23],
      ['Кондитерские изделия', 'Мармелад', '🍬', '', 24],
      ['Кондитерские изделия', 'Зефир', '🍡', '', 25],
      ['Кондитерские изделия', 'Пастила', '🍥', '', 26],
      ['Кондитерские изделия', 'Восточные сладости', '🍯', '', 27],
      ['Кондитерские изделия', 'Печенье и вафли', '🍪', '', 28],
      ['Кондитерские изделия', 'Конфеты и леденцы', '🍭', '', 29],
      ['Бакалея', 'Соусы', '🥫', '', 30],
      ['Бакалея', 'Масло растительное', '🫒', '', 31],
      ['Бакалея', 'Крупа', '🌾', '', 32],
      ['Бакалея', 'Приправы, специи', '🌶️', '', 33],
      ['Бакалея', 'Макароны', '🍝', '', 34],
      ['Бакалея', 'Соль, сахар', '🧂', '', 35],
      ['Бакалея', 'Мёд', '🍯', '', 36],
      ['Бакалея', 'Мука', '🌾', '', 37],
      ['Бакалея', 'Чай, чайные напитки', '🍵', '', 38],
      ['Холодцы и заливное', 'Холодец', '🍲', '', 39],
      ['Холодцы и заливное', 'Заливное', '🍲', '', 40],
      ['Молочная продукция', 'Масло', '🧈', '', 41],
      ['Молочная продукция', 'Молоко', '🥛', '', 42],
      ['Молочная продукция', 'Сметана, сливки', '🥛', '', 43],
      ['Молочная продукция', 'Йогурты и десерты', '🍨', '', 44],
      ['Молочная продукция', 'Творог, творожная масса', '🥛', '', 45],
      ['Молочная продукция', 'Кисломолочная продукция', '🥛', '', 46],
      ['Консервация', 'Мясная консервация', '🥫', '', 47],
      ['Консервация', 'Молочная консервация', '🥫', '', 48],
      ['Консервация', 'Грибная консервация', '🍄', '', 49],
      ['Консервация', 'Фруктовая консервация', '🍑', '', 50],
      ['Консервация', 'Овощная консервация', '🥒', '', 51],
      ['Консервация', 'Разносолы', '🥒', '', 52],
      ['Паштеты и намазки', 'Паштеты', '🥫', '', 53],
      ['Паштеты и намазки', 'Намазки', '🥫', '', 54],
      ['Овощи, грибы, ягоды', 'Замороженные овощи', '🥦', '', 55],
      ['Овощи, грибы, ягоды', 'Замороженные ягоды', '🫐', '', 56],
      ['Напитки', 'Морсы', '🥤', '', 57],
      ['Напитки', 'Сезонные напитки', '🥤', '', 58],
      ['Напитки', 'Вода', '💧', '', 59],
      ['Напитки', 'Минеральная вода', '💧', '', 60],
      ['Напитки', 'Квасы', '🍺', '', 61],
      ['Мороженое', 'Порционное мороженое', '🍦', '', 62],
      ['Мороженое', 'Семейное мороженое', '🍨', '', 63],
      ['Яйцо', 'Яйцо куриное', '🥚', '', 64]
    ];
    cats.getRange(2, 1, rows.length, 5).setValues(rows);
  }
  var cat = ss.getSheetByName('Catalog');
  if (cat.getLastRow() === 1) {
    cat.getRange(2, 1, 6, 10).setValues([
      ['p1', 'Полутвердый сыр', 'Сыр «Российский»', 'Классический мягкий вкус', 690, '300 г', '🧀', '', true, 1],
      ['p2', 'Мягкий сыр', 'Моцарелла', 'Нежная, для салатов и пиццы', 340, '125 г', '🧀', '', true, 2],
      ['p3', 'Варёные колбасы', 'Колбаса «Докторская»', 'Нежная, из говядины и свинины', 540, '400 г', '🌭', '', true, 3],
      ['p4', 'Копчёные колбасы', 'Колбаса «Сервелат»', 'Копчёно-варёная', 780, '350 г', '🥩', '', true, 4],
      ['p5', 'СК и СВ колбасы', 'Салями', 'Сырокопчёная, нарезка', 890, '200 г', '🥓', '', true, 5],
      ['p6', 'Масло', 'Масло сливочное 82,5%', 'Традиционное', 260, '180 г', '🧈', '', true, 6]
    ]);
  }
  var zones = ss.getSheetByName('Zones');
  if (zones.getLastRow() === 1) {
    zones.getRange(2, 1, 2, 7).setValues([
      ['z1', 'Центр', 0, 0, 600, '45–60 мин', true],
      ['z2', 'Спальные районы', 200, 2000, 800, '60–80 мин', true]
    ]);
  }
  var pick = ss.getSheetByName('Pickup');
  if (pick.getLastRow() === 1) {
    pick.getRange(2, 1, 1, 5).setValues([['k1', 'Кухня', 'ул. Ленина, 10', '10:00–22:00', true]]);
  }

  // выпадающий список статусов в таблице заказов
  var orders = ss.getSheetByName('Orders');
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build();
  orders.getRange(2, SHEETS.Orders.indexOf('status') + 1, 1000, 1).setDataValidation(rule);

  // уведомление клиенту при смене статуса
  var has = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'onOrderEdit'; });
  if (!has) ScriptApp.newTrigger('onOrderEdit').forSpreadsheet(ss).onEdit().create();
}

// ---------- чтение таблиц ----------
function readSheet_(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  var vals = sh.getDataRange().getValues();
  var head = vals.shift();
  return vals.map(function (row) {
    var o = {};
    head.forEach(function (h, i) { o[h] = row[i]; });
    return o;
  });
}
function isOn_(v) {
  var s = String(v).toLowerCase();
  return !(v === false || s === 'false' || s === '0' || s === 'нет' || s === '');
}
function catalog_() {
  return readSheet_('Catalog').filter(function (r) { return r.id !== '' && r.name !== ''; })
    .sort(function (a, b) { return (Number(a.sort) || 0) - (Number(b.sort) || 0); })
    .map(function (r) {
      return { id: String(r.id), category: String(r.category), name: String(r.name), description: String(r.description),
        price: Number(r.price) || 0, weight: String(r.weight), emoji: String(r.emoji), image: String(r.image), available: isOn_(r.available) };
    });
}
function categories_() {
  return readSheet_('Categories').filter(function (r) { return r.name !== ''; })
    .sort(function (a, b) { return (Number(a.sort) || 0) - (Number(b.sort) || 0); })
    .map(function (r) {
      return { group: String(r.group || 'Каталог'), name: String(r.name), emoji: String(r.emoji), image: String(r.image) };
    });
}
function zones_() {
  return readSheet_('Zones').filter(function (r) { return r.id !== '' && isOn_(r.active); }).map(function (r) {
    return { id: String(r.id), name: String(r.name), price: Number(r.price) || 0, freeFrom: Number(r.freeFrom) || 0, minOrder: Number(r.minOrder) || 0, eta: String(r.eta) };
  });
}
function pickup_() {
  return readSheet_('Pickup').filter(function (r) { return r.id !== '' && isOn_(r.active); }).map(function (r) {
    return { id: String(r.id), name: String(r.name), address: String(r.address), hours: String(r.hours) };
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- GET: меню и статус заказа ----------
function doGet(e) {
  try {
    var action = (e.parameter && e.parameter.action) || 'bootstrap';
    if (action === 'bootstrap') {
      return json_({ categories: categories_(), catalog: catalog_(), zones: zones_(), pickup: pickup_(), settings: {} });
    }
    if (action === 'status') {
      var id = String(e.parameter.id || ''), token = String(e.parameter.token || '');
      var found = findOrder_(id);
      if (!found || String(found.row[1]) !== token || token === '') return json_({ error: 'not_found' });
      return json_({ status: String(found.row[3]) });
    }
    return json_({ error: 'unknown_action' });
  } catch (err) {
    return json_({ error: 'server_error' });
  }
}

function findOrder_(id) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
  if (!sh || sh.getLastRow() < 2) return null;
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, SHEETS.Orders.length).getValues();
  for (var i = vals.length - 1; i >= 0; i--) if (String(vals[i][0]) === id) return { rowIndex: i + 2, row: vals[i] };
  return null;
}

// ---------- проверка подписи initData (https://dev.max.ru/docs/webapps/validation/) ----------
function toHex_(bytes) {
  return bytes.map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
}
function validateInitData_(initData, botToken) {
  if (!initData || !botToken) return null;
  var pairs = initData.split('&').map(function (p) {
    var i = p.indexOf('=');
    return [p.slice(0, i), decodeURIComponent(p.slice(i + 1).replace(/\+/g, ' '))];
  });
  var hash = null, rest = [];
  pairs.forEach(function (p) { if (p[0] === 'hash') hash = p[1]; else rest.push(p); });
  if (!hash) return null;
  rest.sort(function (a, b) { return a[0] < b[0] ? -1 : (a[0] > b[0] ? 1 : 0); });
  var launch = rest.map(function (p) { return p[0] + '=' + p[1]; }).join('\n');
  var secret = Utilities.computeHmacSha256Signature(botToken, 'WebAppData');
  var sig = toHex_(Utilities.computeHmacSha256Signature(launch, secret));
  if (sig !== hash) return null;
  var data = {};
  rest.forEach(function (p) { data[p[0]] = p[1]; });
  var authDate = Number(data.auth_date) || 0;
  if (Date.now() / 1000 - authDate > 24 * 3600) return null; // данные старше суток
  try { data.user = JSON.parse(data.user); } catch (e) { data.user = null; }
  return data;
}

// ---------- POST: создание заказа ----------
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.action !== 'order') return json_({ error: 'Неизвестное действие' });

    var props = PropertiesService.getScriptProperties();
    var botToken = props.getProperty('BOT_TOKEN');
    var user = null;
    var data = validateInitData_(String(body.initData || ''), botToken);
    if (data && data.user) user = data.user;
    else if (props.getProperty('ALLOW_NO_AUTH') !== 'true') return json_({ error: 'Откройте приложение из MAX, чтобы оформить заказ' });

    // состав и цены считаем на сервере, значениям с клиента не доверяем
    var cat = {};
    catalog_().forEach(function (p) { cat[p.id] = p; });
    var items = [], subtotal = 0;
    (body.items || []).slice(0, 60).forEach(function (it) {
      var p = cat[String(it.id)], qty = Math.floor(Number(it.qty));
      if (!p || !p.available || !(qty > 0)) return;
      qty = Math.min(qty, 99);
      subtotal += p.price * qty;
      items.push(p.name + ' × ' + qty + ' = ' + p.price * qty);
    });
    if (!items.length) return json_({ error: 'В заказе нет доступных блюд. Обновите меню.' });

    var mode = body.mode === 'pickup' ? 'pickup' : 'delivery';
    var delivery = 0, where = '';
    if (mode === 'delivery') {
      var zone = zones_().filter(function (z) { return z.id === String(body.zoneId); })[0];
      if (!zone) return json_({ error: 'Выберите зону доставки' });
      if (subtotal < zone.minOrder) return json_({ error: 'Минимальный заказ для этой зоны — ' + zone.minOrder + ' ₽' });
      delivery = (zone.freeFrom > 0 && subtotal >= zone.freeFrom) ? 0 : zone.price;
      var addr = String(body.address || '').trim().slice(0, 200);
      if (addr.length < 5) return json_({ error: 'Укажите адрес' });
      where = addr + ' (' + zone.name + ')';
    } else {
      var pt = pickup_().filter(function (p) { return p.id === String(body.pickupId); })[0];
      if (!pt) return json_({ error: 'Выберите точку самовывоза' });
      where = pt.name + ', ' + pt.address;
    }

    var name = String(body.name || '').trim().slice(0, 60);
    var phone = String(body.phone || '').trim().slice(0, 25);
    if (name.length < 2 || phone.replace(/\D/g, '').length < 10) return json_({ error: 'Проверьте имя и телефон' });
    var date = String(body.date || ''), slot = String(body.slot || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !(slot === 'asap' || /^\d{2}:\d{2}–\d{2}:\d{2}$/.test(slot))) return json_({ error: 'Выберите время' });

    lock.waitLock(20000);
    var props2 = PropertiesService.getScriptProperties();
    var seq = (Number(props2.getProperty('ORDER_SEQ')) || 0) + 1;
    props2.setProperty('ORDER_SEQ', String(seq));
    var id = String(1000 + seq);
    var token = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
    var total = subtotal + delivery;
    var comment = String(body.comment || '').trim().slice(0, 300);

    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Orders');
    sh.appendRow([id, token, new Date(), 'Новый', mode === 'delivery' ? 'Доставка' : 'Самовывоз', date, slot === 'asap' ? 'как можно скорее' : slot,
      name, "'" + phone, where, comment, items.join('\n'), subtotal, delivery, total,
      user ? user.id : '', user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : '']);
    lock.releaseLock();

    notifyOwner_(id, mode, date, slot, name, phone, where, comment, items, delivery, total);
    return json_({ ok: true, order: { id: id, token: token, total: total, delivery: delivery } });
  } catch (err) {
    try { lock.releaseLock(); } catch (x) {}
    return json_({ error: 'Не удалось оформить заказ, попробуйте ещё раз' });
  }
}

// ---------- сообщения через бота MAX ----------
function sendMax_(userId, text) {
  var token = PropertiesService.getScriptProperties().getProperty('BOT_TOKEN');
  if (!token || !userId) return;
  try {
    UrlFetchApp.fetch('https://platform-api2.max.ru/messages?user_id=' + encodeURIComponent(userId), {
      method: 'post', contentType: 'application/json', headers: { Authorization: token },
      payload: JSON.stringify({ text: String(text).slice(0, 3900) }), muteHttpExceptions: true
    });
  } catch (e) {}
}

function notifyOwner_(id, mode, date, slot, name, phone, where, comment, items, delivery, total) {
  var owner = PropertiesService.getScriptProperties().getProperty('OWNER_USER_ID');
  if (!owner) return;
  var text = 'Новый заказ №' + id + '\n' + (mode === 'delivery' ? 'Доставка' : 'Самовывоз') + ' · ' + date + ' · ' + (slot === 'asap' ? 'как можно скорее' : slot) + '\n' +
    name + ', ' + phone + '\n' + where + (comment ? '\nКомментарий: ' + comment : '') + '\n\n' + items.join('\n') +
    (mode === 'delivery' ? '\nДоставка: ' + delivery + ' ₽' : '') + '\nИтого: ' + total + ' ₽';
  sendMax_(owner, text);
}

// Срабатывает, когда владелец меняет статус в таблице Orders
function onOrderEdit(e) {
  try {
    var sh = e.range.getSheet();
    var statusCol = SHEETS.Orders.indexOf('status') + 1;
    if (sh.getName() !== 'Orders' || e.range.getColumn() !== statusCol || e.range.getRow() < 2) return;
    var row = sh.getRange(e.range.getRow(), 1, 1, SHEETS.Orders.length).getValues()[0];
    var status = String(row[3]), userId = row[SHEETS.Orders.indexOf('userId')];
    if (!userId || e.oldValue === status) return;
    var botName = PropertiesService.getScriptProperties().getProperty('BOT_USERNAME');
    var text = 'Заказ №' + row[0] + ': ' + status;
    if (botName) text += '\nПодробности: https://max.ru/' + botName + '?startapp=order_' + row[0];
    sendMax_(userId, text);
  } catch (err) {}
}
