// Тестовые данные для демо-режима (когда API_URL в config.js пустой).
// В боевом режиме то же самое приходит из Google Таблицы.
window.DEMO_DATA = {
  categories: [
    { group: 'Сыры', name: 'Твёрдые сыры', emoji: '🧀', image: '' },
    { group: 'Сыры', name: 'Мягкие сыры', emoji: '🧀', image: '' },
    { group: 'Сыры', name: 'Рассольные сыры', emoji: '🥛', image: '' },
    { group: 'Колбасы', name: 'Варёные', emoji: '🌭', image: '' },
    { group: 'Колбасы', name: 'Копчёные', emoji: '🥩', image: '' },
    { group: 'Колбасы', name: 'Сырокопчёные', emoji: '🥓', image: '' },
    { group: 'Деликатесы', name: 'Ветчина и бекон', emoji: '🥓', image: '' },
    { group: 'Деликатесы', name: 'Балыки и карпаччо', emoji: '🍖', image: '' },
    { group: 'Молочное', name: 'Масло и сливки', emoji: '🧈', image: '' },
    { group: 'Молочное', name: 'Сметана и творог', emoji: '🥛', image: '' }
  ],
  catalog: [
    { id: 'p1', category: 'Твёрдые сыры', name: 'Сыр «Российский»', description: 'Классический мягкий вкус, подходит для бутербродов и запекания', price: 690, weight: '300 г', emoji: '🧀', image: '', available: true },
    { id: 'p2', category: 'Твёрдые сыры', name: 'Сыр «Пармезан» 12 мес.', description: 'Выдержанный, с зернистой текстурой', price: 1290, weight: '250 г', emoji: '🧀', image: '', available: true },
    { id: 'p3', category: 'Твёрдые сыры', name: 'Сыр «Маасдам»', description: 'Сладковатый ореховый вкус и крупные «глазки»', price: 820, weight: '300 г', emoji: '🧀', image: '', available: false },
    { id: 'p4', category: 'Мягкие сыры', name: 'Моцарелла', description: 'Нежная, для салатов и пиццы', price: 340, weight: '125 г', emoji: '🧀', image: '', available: true },
    { id: 'p5', category: 'Мягкие сыры', name: 'Камамбер', description: 'С белой плесенью, сливочный вкус', price: 560, weight: '150 г', emoji: '🧀', image: '', available: true },
    { id: 'p6', category: 'Рассольные сыры', name: 'Брынза', description: 'Солоноватая, рассыпчатая', price: 390, weight: '250 г', emoji: '🥛', image: '', available: true },
    { id: 'p7', category: 'Варёные', name: 'Колбаса «Докторская»', description: 'Нежная, из говядины и свинины', price: 540, weight: '400 г', emoji: '🌭', image: '', available: true },
    { id: 'p8', category: 'Варёные', name: 'Сосиски молочные', description: 'Для завтраков и гриля', price: 310, weight: '450 г', emoji: '🌭', image: '', available: true },
    { id: 'p9', category: 'Копчёные', name: 'Колбаса «Сервелат»', description: 'Копчёно-варёная, с насыщенным ароматом', price: 780, weight: '350 г', emoji: '🥩', image: '', available: true },
    { id: 'p10', category: 'Копчёные', name: 'Охотничьи колбаски', description: 'Пряные, полукопчёные', price: 620, weight: '300 г', emoji: '🥩', image: '', available: true },
    { id: 'p11', category: 'Сырокопчёные', name: 'Салями', description: 'Сырокопчёная, нарезка', price: 890, weight: '200 г', emoji: '🥓', image: '', available: true },
    { id: 'p12', category: 'Ветчина и бекон', name: 'Ветчина из индейки', description: 'Нежная, с минимумом жира', price: 590, weight: '300 г', emoji: '🥓', image: '', available: true },
    { id: 'p13', category: 'Ветчина и бекон', name: 'Бекон варёно-копчёный', description: 'Для завтраков и закусок', price: 480, weight: '250 г', emoji: '🥓', image: '', available: true },
    { id: 'p14', category: 'Балыки и карпаччо', name: 'Балык свиной', description: 'Сыровяленый, нарезка', price: 970, weight: '150 г', emoji: '🍖', image: '', available: true },
    { id: 'p15', category: 'Масло и сливки', name: 'Масло сливочное 82,5%', description: 'Традиционное', price: 260, weight: '180 г', emoji: '🧈', image: '', available: true },
    { id: 'p16', category: 'Сметана и творог', name: 'Сметана 20%', description: 'Густая, без добавок', price: 140, weight: '400 г', emoji: '🥛', image: '', available: true },
    { id: 'p17', category: 'Сметана и творог', name: 'Творог 5%', description: 'Рассыпчатый, фермерский', price: 190, weight: '300 г', emoji: '🥛', image: '', available: true }
  ],
  zones: [
    { id: 'z1', name: 'Центр', price: 0, freeFrom: 0, minOrder: 600, eta: '45–60 мин' },
    { id: 'z2', name: 'Спальные районы', price: 200, freeFrom: 2000, minOrder: 800, eta: '60–80 мин' },
    { id: 'z3', name: 'Пригород', price: 400, freeFrom: 3500, minOrder: 1200, eta: '90–120 мин' }
  ],
  pickup: [
    { id: 'k1', name: 'Магазин на Ленина', address: 'ул. Ленина, 10', hours: '10:00–22:00' },
    { id: 'k2', name: 'Точка у метро', address: 'ул. Станционная, 2', hours: '10:00–21:00' }
  ],
  settings: {}
};
