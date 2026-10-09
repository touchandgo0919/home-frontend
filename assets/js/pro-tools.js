(() => {
  const L = (zh, en) => window.HomeI18n?.language === 'en' ? en : zh;
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const api = (path, method = 'GET', body) => window.homeApp.api(path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const button = (text, onClick, className = '') => {
    const node = el('button', text, className);
    node.type = 'button';
    node.addEventListener('click', onClick);
    return node;
  };
  const option = (value, text) => {
    const node = el('option', text);
    node.value = value;
    return node;
  };

  async function render(root, status) {
    const access = await api('pro/status');
    root.replaceChildren();
    const intro = el('div', undefined, 'pro-intro');
    intro.append(el('strong', access.active ? L('Pro 整理已启用', 'Pro tools are active') : L('Pro 整理', 'Pro tools')));
    intro.append(el('p', access.active
      ? L('批量移动、标签筛选和链接检测。原有收藏、导出及备份始终可用。', 'Bulk moves, tag filters and link checks. Your existing bookmarks, exports and backups remain available.')
      : L('高级整理功能正在内测，暂未开放购买。现有收藏、分组、导入导出和备份继续免费。', 'Advanced tools are in preview and cannot be purchased yet. Existing bookmarks, collections, import/export and backups remain free.')));
    root.append(intro);

    if (!access.active) {
      const list = el('ul', undefined, 'pro-feature-list');
      for (const item of [L('批量移动书签到目标分组', 'Move multiple bookmarks to one collection'),
        L('给书签添加标签并组合筛选', 'Tag bookmarks and combine filters'),
        L('检测失效链接；对受限或超时网站显示“未知”', 'Check links; restricted or timed-out sites show “unknown”')]) list.append(el('li', item));
      root.append(list);
      status.textContent = '';
      return;
    }

    let data = await api('pro/organize');
    const selected = new Set(), checks = new Map();
    const filters = el('div', undefined, 'pro-filters');
    const keyword = el('input'); keyword.type = 'search'; keyword.placeholder = L('筛选标题或网址', 'Filter title or URL');
    keyword.setAttribute('aria-label', keyword.placeholder);
    const collection = el('select'); collection.setAttribute('aria-label', L('筛选分组', 'Filter collection'));
    const tag = el('select'); tag.setAttribute('aria-label', L('筛选标签', 'Filter tag'));
    const list = el('div', undefined, 'pro-list');
    const count = el('small', '', 'pro-count');
    const actions = el('div', undefined, 'pro-actions');
    const target = el('select'); target.setAttribute('aria-label', L('目标分组', 'Destination collection'));
    const tagInput = el('input'); tagInput.placeholder = L('输入标签', 'Enter a tag'); tagInput.maxLength = 40;
    tagInput.setAttribute('aria-label', tagInput.placeholder);
    const groupNames = () => new Map(data.collections.map(group => [group.id, group.name]));
    const visible = () => {
      const query = keyword.value.trim().toLocaleLowerCase();
      return data.bookmarks.filter(item =>
        (!collection.value || String(item.category_id) === collection.value) &&
        (!tag.value || item.tags.some(value => value.toLocaleLowerCase() === tag.value.toLocaleLowerCase())) &&
        (!query || `${item.title} ${item.url}`.toLocaleLowerCase().includes(query)));
    };
    function fillChoices() {
      const oldCollection = collection.value, oldTag = tag.value, oldTarget = target.value;
      collection.replaceChildren(option('', L('全部分组', 'All collections')));
      target.replaceChildren(option('', L('移动到…', 'Move to…')));
      for (const group of data.collections) {
        collection.append(option(String(group.id), group.name));
        target.append(option(String(group.id), group.name));
      }
      tag.replaceChildren(option('', L('全部标签', 'All tags')));
      for (const name of [...new Set(data.bookmarks.flatMap(item => item.tags))].sort((a, b) => a.localeCompare(b))) tag.append(option(name, name));
      collection.value = oldCollection; tag.value = oldTag; target.value = oldTarget;
    }
    function renderList() {
      list.replaceChildren();
      const shown = visible(), names = groupNames();
      count.textContent = L(`显示 ${shown.length} 条，已选 ${selected.size} 条`, `${shown.length} shown, ${selected.size} selected`);
      if (!shown.length) list.append(el('p', L('没有匹配的书签。', 'No matching bookmarks.')));
      for (const item of shown) {
        const row = el('label', undefined, 'pro-row');
        const check = el('input'); check.type = 'checkbox'; check.checked = selected.has(item.id);
        check.addEventListener('change', () => { if (check.checked) selected.add(item.id); else selected.delete(item.id); renderList(); });
        const details = el('span', undefined, 'pro-details');
        details.append(el('strong', item.title), el('small', `${names.get(item.category_id) || ''} · ${item.url}`));
        if (item.tags.length) details.append(el('small', item.tags.map(value => `#${value}`).join('  '), 'pro-tags'));
        const result = checks.get(item.id);
        if (result) details.append(el('small', ({ reachable: L('可访问', 'Reachable'), missing: L('失效', 'Missing'), restricted: L('需要登录或访问受限', 'Restricted'), skipped: L('未检测本地网址', 'Local URL skipped'), unknown: L('无法判断', 'Unknown') })[result.status] || result.status, `pro-check pro-check-${result.status}`));
        row.append(check, details); list.append(row);
      }
    }
    async function refresh() {
      data = await api('pro/organize');
      selected.clear(); fillChoices(); renderList();
      await window.homeApp.reload();
    }
    let busy = false;
    async function run(action) {
      if (busy) return;
      busy = true; actions.setAttribute('aria-busy', 'true'); status.textContent = L('处理中…', 'Working…');
      try { await action(); }
      catch (error) { status.textContent = window.HomeI18n?.translate(error.message) || error.message; }
      finally { busy = false; actions.removeAttribute('aria-busy'); }
    }
    const selectedIds = max => {
      if (!selected.size) throw new Error(L('请先选择书签。', 'Select bookmarks first.'));
      if (selected.size > max) throw new Error(L(`一次最多选择 ${max} 条。`, `Select up to ${max} at a time.`));
      return [...selected];
    };
    const move = button(L('批量移动', 'Move selected'), () => run(async () => {
      const ids = selectedIds(100), category_id = Number(target.value);
      if (!category_id) throw new Error(L('请选择目标分组。', 'Choose a destination collection.'));
      await api('pro/bookmarks/move', 'POST', { ids, category_id });
      await refresh(); status.textContent = L(`已移动 ${ids.length} 条。`, `Moved ${ids.length} bookmarks.`);
    }));
    const addTag = button(L('添加标签', 'Add tag'), () => run(async () => {
      const ids = selectedIds(100), value = tagInput.value.trim();
      await api('pro/bookmarks/tag', 'POST', { ids, tag: value, action: 'add' });
      await refresh(); status.textContent = L(`已为 ${ids.length} 条添加标签。`, `Added a tag to ${ids.length} bookmarks.`);
    }));
    const removeTag = button(L('移除标签', 'Remove tag'), () => run(async () => {
      const ids = selectedIds(100), value = tagInput.value.trim();
      await api('pro/bookmarks/tag', 'POST', { ids, tag: value, action: 'remove' });
      await refresh(); status.textContent = L(`已从 ${ids.length} 条移除标签。`, `Removed a tag from ${ids.length} bookmarks.`);
    }));
    const checkLinks = button(L('检测链接', 'Check links'), () => run(async () => {
      const ids = selectedIds(10);
      const result = await api('pro/links/check', 'POST', { ids });
      for (const row of result.results) checks.set(row.id, row);
      renderList(); status.textContent = L('检测完成。失效仅表示网站返回 404/410；其他错误不会自动删除书签。', 'Checks complete. Only HTTP 404/410 is marked missing; no bookmarks are deleted.');
    }));
    const selectVisible = button(L('选择可见项', 'Select visible'), () => {
      for (const item of visible().slice(0, 100)) selected.add(item.id);
      renderList();
    });
    const clear = button(L('清空选择', 'Clear selection'), () => { selected.clear(); renderList(); });
    keyword.addEventListener('input', renderList);
    collection.addEventListener('change', renderList);
    tag.addEventListener('change', renderList);
    filters.append(keyword, collection, tag);
    actions.append(selectVisible, clear, target, move, tagInput, addTag, removeTag, checkLinks);
    root.append(filters, count, list, actions);
    fillChoices(); renderList(); status.textContent = '';

    if (window.homeApp.role() === 'platform') {
      const admin = el('details', undefined, 'pro-admin');
      admin.append(el('summary', L('管理员：手动开通测试账号', 'Admin: grant Pro preview access')));
      const id = el('input'); id.type = 'number'; id.min = '1'; id.placeholder = L('账号 ID', 'Account ID'); id.setAttribute('aria-label', id.placeholder);
      const days = el('input'); days.type = 'number'; days.min = '1'; days.max = '3650'; days.value = '30'; days.setAttribute('aria-label', L('有效天数', 'Duration in days'));
      const grant = button(L('开通测试', 'Grant preview'), () => run(async () => {
        const tenantId = Number(id.value), duration = Number(days.value);
        if (!Number.isSafeInteger(tenantId) || tenantId < 1 || !Number.isSafeInteger(duration) || duration < 1 || duration > 3650) throw new Error(L('请输入有效的账号 ID 和天数。', 'Enter a valid account ID and duration.'));
        await api(`pro/admin/entitlements/${tenantId}`, 'PUT', { expires_at: Date.now() + duration * 86400000 });
        status.textContent = L('测试权限已开通。', 'Preview access granted.');
      }));
      const revoke = button(L('取消测试', 'Revoke preview'), () => run(async () => {
        const tenantId = Number(id.value);
        if (!Number.isSafeInteger(tenantId) || tenantId < 1) throw new Error(L('请输入账号 ID。', 'Enter an account ID.'));
        await api(`pro/admin/entitlements/${tenantId}`, 'DELETE');
        status.textContent = L('测试权限已取消。', 'Preview access revoked.');
      }));
      const form = el('div', undefined, 'pro-admin-fields'); form.append(id, days, grant, revoke);
      admin.append(form); root.append(admin);
    }
  }
  window.NavPro = { render };
})();
