/* 自定义下拉组件（Material You 风格） */
(function () {
  const KEY = { UP: 'ArrowUp', DOWN: 'ArrowDown', ENTER: 'Enter', ESC: 'Escape', HOME: 'Home', END: 'End', SPACE: ' ' };

  function initDropdown(root) {
    const control = root.querySelector('.dropdown__control');
    const menu = root.querySelector('.dropdown__menu');
    const hidden = root.querySelector('input[type="hidden"]');
    const valueEl = root.querySelector('.dropdown__value');
    if (!control || !menu || !hidden || !valueEl) return;

    const options = Array.from(menu.querySelectorAll('[role="option"]'));
    let activeIndex = Math.max(0, options.findIndex(o => o.getAttribute('aria-selected') === 'true'));

    function open() {
      if (root.classList.contains('dropdown--open')) return;
      root.classList.add('dropdown--open');
      control.setAttribute('aria-expanded', 'true');
      // 聚焦到当前已选项
      requestAnimationFrame(() => {
        const current = options[activeIndex] || options[0];
        current && current.focus({ preventScroll: true });
      });
      document.addEventListener('click', onDocClick, { capture: true });
      document.addEventListener('keydown', onDocKeydown, true);
    }

    function close() {
      if (!root.classList.contains('dropdown--open')) return;
      root.classList.remove('dropdown--open');
      control.setAttribute('aria-expanded', 'false');
      control.focus({ preventScroll: true });
      document.removeEventListener('click', onDocClick, { capture: true });
      document.removeEventListener('keydown', onDocKeydown, true);
    }

    function onDocClick(e) {
      if (!root.contains(e.target)) close();
    }
    function onDocKeydown(e) {
      if (e.key === KEY.ESC) { e.stopPropagation(); e.preventDefault(); close(); }
    }

    function select(index) {
      if (index < 0 || index >= options.length) return;
      options.forEach((o, i) => o.setAttribute('aria-selected', i === index ? 'true' : 'false'));
      activeIndex = index;
      const opt = options[index];
      hidden.value = String(opt.dataset.value ?? '');
      valueEl.textContent = opt.textContent ?? '';
      root.dispatchEvent(new CustomEvent('dropdown-change', { detail: { value: hidden.value }, bubbles: true }));
      close();
    }

    function move(delta) {
      const count = options.length;
      if (!count) return;
      activeIndex = (activeIndex + delta + count) % count;
      const target = options[activeIndex];
      target.focus({ preventScroll: true });
      menu.scrollTop = Math.max(0, target.offsetTop - 8);
    }

    // 初始化默认值
    const initVal = hidden.value || options[0]?.dataset.value || '';
    const initIdx = options.findIndex(o => o.dataset.value === initVal);
    select(initIdx >= 0 ? initIdx : 0);

    control.addEventListener('click', (e) => { e.stopPropagation(); root.classList.contains('dropdown--open') ? close() : open(); });
    control.addEventListener('keydown', (e) => {
      if (e.key === KEY.SPACE || e.key === KEY.ENTER || e.key === KEY.DOWN) { e.preventDefault(); open(); }
    });

    options.forEach((opt, i) => {
      opt.tabIndex = -1;
      opt.addEventListener('click', (e) => { e.stopPropagation(); select(i); });
      opt.addEventListener('keydown', (e) => {
        if (e.key === KEY.ENTER) { e.preventDefault(); select(i); }
        else if (e.key === KEY.DOWN) { e.preventDefault(); move(1); }
        else if (e.key === KEY.UP) { e.preventDefault(); move(-1); }
        else if (e.key === KEY.HOME) { e.preventDefault(); activeIndex = 0; options[0].focus(); }
        else if (e.key === KEY.END) { e.preventDefault(); activeIndex = options.length - 1; options[activeIndex].focus(); }
        else if (e.key === KEY.ESC) { e.preventDefault(); close(); }
      });
    });
  }

  function boot() {
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(initDropdown);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
