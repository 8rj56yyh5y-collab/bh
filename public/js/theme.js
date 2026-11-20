// Тема застосовується до відмальовки сторінки, щоб не було «спалаху» іншої теми.
(function () {
  try {
    var t = localStorage.getItem('bh-theme');
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  } catch (e) { /* приватний режим */ }
})();
