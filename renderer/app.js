/* 主界面脚本：关于 Sanaka 展开/收起交互（含过渡动画） */
(() => {
  // Electron 渲染进程通过 preload 注入的安全 API
  const ipcAPI = window.electronAPI;

  // ===== 操作系统图标映射 =====
  const osIconMap = {
    win10: 'assets/icons/win10.svg',
    win98: 'assets/icons/win98.svg',
    linux: 'assets/icons/Tux.svg'
  };

  // ===== 现有交互保留：关于卡片 & 抽屉 =====
  const toggleBtn = document.getElementById('aboutToggle');
  const card = document.getElementById('aboutCard');
  const createBtn = document.getElementById('createToggle');
  const drawer = document.getElementById('createDrawer');
  const backdrop = document.getElementById('drawerBackdrop');
  const addDiskBtn = document.getElementById('add-disk-btn');
  if (!toggleBtn || !card) { /* skip about init when missing */ } else {
  const openCard = () => { if (!card.hasAttribute('hidden')) return; card.removeAttribute('hidden'); void card.offsetWidth; card.classList.add('about-card--open'); toggleBtn.setAttribute('aria-expanded', 'true'); };
  const closeCard = () => { if (card.hasAttribute('hidden')) return; card.classList.remove('about-card--open'); const onEnd = (e) => { if (e && e.target !== card) return; card.setAttribute('hidden', ''); card.removeEventListener('transitionend', onEnd); }; card.addEventListener('transitionend', onEnd, { once: true }); setTimeout(() => { if (!card.hasAttribute('hidden')) { card.setAttribute('hidden', ''); } }, 220); toggleBtn.setAttribute('aria-expanded', 'false'); };
  const openDrawer = () => { if (!drawer || !backdrop) return; if (!drawer.hasAttribute('hidden')) return; if (createBtn) { createBtn.setAttribute('hidden', ''); } if (!card.hasAttribute('hidden')) { closeCard(); } backdrop.removeAttribute('hidden'); drawer.removeAttribute('hidden'); void drawer.offsetWidth; backdrop.classList.add('backdrop--open'); drawer.classList.add('drawer--open'); };
  const closeDrawer = () => { if (!drawer || !backdrop) return; if (drawer.hasAttribute('hidden')) return; backdrop.classList.remove('backdrop--open'); drawer.classList.remove('drawer--open'); const onEnd = (e) => { if (e && e.target !== drawer) return; drawer.setAttribute('hidden', ''); backdrop.setAttribute('hidden', ''); if (createBtn) { createBtn.removeAttribute('hidden'); } drawer.removeEventListener('transitionend', onEnd); }; drawer.addEventListener('transitionend', onEnd, { once: true }); setTimeout(() => { if (!drawer.hasAttribute('hidden')) { drawer.setAttribute('hidden', ''); backdrop.setAttribute('hidden', ''); if (createBtn) { createBtn.removeAttribute('hidden'); } } }, 260); };
  toggleBtn.addEventListener('click', (e) => { const isOpen = !card.hasAttribute('hidden'); if (isOpen) { closeCard(); } else { openCard(); } e.stopPropagation(); });
  if (createBtn) { createBtn.addEventListener('click', (e) => { const isOpen = drawer && !drawer.hasAttribute('hidden'); if (isOpen) { closeDrawer(); } else { openDrawer(); } e.stopPropagation(); }); }
  const drawerClose = document.getElementById('drawerClose');
  if (backdrop) { backdrop.addEventListener('click', () => closeDrawer()); }
  if (drawerClose) { drawerClose.addEventListener('click', () => closeDrawer()); }
  document.addEventListener('click', (e) => { if (!card.hasAttribute('hidden')) { const within = card.contains(e.target) || toggleBtn.contains(e.target); if (!within) closeCard(); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeCard(); if (typeof closeDrawer === 'function') closeDrawer(); } });
  }

  // 监听主进程的“打开关于”指令（独立查询 DOM，避免初始化时元素未就绪导致无响应）
  const openAboutFromIPC = () => {
    const t = document.getElementById('aboutToggle');
    const c = document.getElementById('aboutCard');
    if (c) {
      if (c.hasAttribute('hidden')) {
        c.removeAttribute('hidden');
        void c.offsetWidth;
        c.classList.add('about-card--open');
      }
      if (t) t.setAttribute('aria-expanded', 'true');
      const anchor = document.getElementById('menu-about-entry');
      if (anchor && typeof anchor.scrollIntoView === 'function') {
        anchor.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  };
  if (ipcAPI) {
    ipcAPI.on('open-about-drawer', () => {
      try { console.debug('[IPC] open-about-drawer received'); } catch (_e) {}
      openAboutFromIPC();
    });
  }

  // ===== 操作系统图标动态更新 =====
  const osTemplateInput = document.getElementById('os-template-input');
  const osIconDisplay = document.getElementById('os-icon-display');
  const updateOSIcon = () => {
    const osValue = osTemplateInput.value;
    const iconPath = osIconMap[osValue];
    if (iconPath) {
      osIconDisplay.src = iconPath;
      osIconDisplay.style.display = 'block';
    } else {
      osIconDisplay.src = '';
      osIconDisplay.style.display = 'none';
    }
  };
  if (osTemplateInput && osIconDisplay) {
    osTemplateInput.addEventListener('change', updateOSIcon);
  }

  // 初始渲染
  // 网络启用开关：按状态执行淡出→折叠 与 淡入→展开动画序列

  // =====================
  // 磁盘列表基础状态与事件绑定
  // =====================
  let diskList = [];

  // 名称智能格式化：保留后缀名，超长中部省略
  const formatDiskName = (filePath) => {
    if (typeof filePath !== 'string' || !filePath) return '';
    // 兼容 Windows 和 POSIX 路径，安全提取文件名
    const base = filePath.split(/[/\\]/).pop();
    const lastDot = base.lastIndexOf('.');
    const name = lastDot > 0 ? base.slice(0, lastDot) : base;
    const ext = lastDot > 0 ? base.slice(lastDot) : '';
    const max = 20;
    if (name.length <= max) return name + ext;
    const keep = Math.max(6, Math.floor((max - 3) / 2));
    const head = name.slice(0, keep);
    const tail = name.slice(-keep);
    return head + '...' + tail + ext;
  };

  const renderDiskList = () => {
    const container = document.getElementById('disk-list-container');
    if (!container) return;
    container.innerHTML = '';
    if (diskList.length === 0) {
      const hint = document.createElement('div');
      hint.className = 'disk-empty-hint';
      hint.textContent = '可添加现有磁盘文件或新建磁盘';
      container.appendChild(hint);
      container.style.minHeight = '120px';
      return;
    }
    diskList.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'disk-item';

      const title = document.createElement('span');
      title.className = 'disk-item__name';
      title.textContent = formatDiskName(item.path);

      const del = document.createElement('button');
      del.className = 'disk-item__del';
      del.type = 'button';
      del.setAttribute('aria-label', '删除磁盘');
      del.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71a1 1 0 010 1.41L13.41 12l4.89 4.88a1 1 0 11-1.41 1.42L12 13.41l-4.88 4.89a1 1 0 11-1.42-1.41L10.59 12 5.7 7.12A1 1 0 117.11 5.7L12 10.59l4.88-4.89a1 1 0 011.42 0z"/></svg>';
      del.addEventListener('click', () => {
        diskList = diskList.filter((d) => d.id !== item.id);
        renderDiskList();
      });

      row.appendChild(title);
      row.appendChild(del);
      container.appendChild(row);
    });
  };

  const addDisk = () => {
    const btn = document.getElementById('add-disk-btn');
    try { console.debug('[UI] 添加磁盘按钮点击'); } catch (_e) {}
    if (!ipcAPI) {
      try { console.error('[IPC] 预加载 API 不可用，检查 preload 注入与 contextIsolation 配置'); } catch (_e) {}
      return;
    }
    try {
      if (btn) btn.disabled = true;
      ipcAPI.send('open-disk-picker');
      try { console.debug('[IPC] 已发送 open-disk-picker'); } catch (_e) {}
    } catch (e) {
      try { console.error('[IPC] 发送失败：', e); } catch (_e) {}
    } finally {
      setTimeout(() => { if (btn) btn.disabled = false; }, 1200);
    }
  };

  if (ipcAPI) {
    ipcAPI.on('disk-path-selected', (filePath) => {
      try { console.debug('[IPC] 收到 disk-path-selected：', filePath); } catch (_e) {}
      if (typeof filePath !== 'string' || !filePath) return;
      if (diskList.length >= 4) {
        try { console.warn('[UI] 磁盘数量已达上限 (4)'); } catch (_e) {}
        return;
      }
      const id = Date.now() + Math.random().toString(16).slice(2);
      diskList.push({ id, path: filePath });
      renderDiskList();
    });
  }

  if (addDiskBtn) {
    addDiskBtn.addEventListener('click', addDisk);
  }

})();
