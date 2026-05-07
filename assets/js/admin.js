/* ============================================
   CASA DE BIA — Admin Controller
   ============================================ */
(function () {
  // ===== AUTH GUARD =====
  if (!window.DataStore.isLoggedIn()) {
    window.location.href = 'admin-login.html';
    return;
  }

  let data = window.DataStore.loadData();
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const formatBRL = (n) => {
    const num = Number(n) || 0;
    const hasCents = Math.abs(num - Math.round(num)) > 0.001;
    return 'R$ ' + num.toLocaleString('pt-BR', {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: 2
    });
  };

  // ===== TOAST =====
  let toastTimer = null;
  const toast = (msg, type = 'success') => {
    const el = document.getElementById('adminToast');
    if (!el) return;
    el.className = `admin-toast ${type}`;
    const icon = type === 'error' ? 'alert-circle' : 'check-circle-2';
    el.innerHTML = `<i data-lucide="${icon}"></i><span>${msg}</span>`;
    if (window.lucide) window.lucide.createIcons();
    el.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  };

  // ===== SAVE HELPER =====
  const persist = () => {
    if (window.DataStore.saveData(data)) {
      window.DataStore.applyToSimulator(data);
      toast('Alterações salvas');
    } else {
      toast('Erro ao salvar', 'error');
    }
  };

  // ===== NAVEGAÇÃO ENTRE SEÇÕES =====
  const sections = {
    dashboard: renderDashboard,
    pacotes: renderPacotes,
    decoracao: renderDecoracao,
    servicos: renderServicos,
    config: renderConfig,
    historico: renderHistorico
  };

  $$('.admin-nav-link[data-section]').forEach(link => {
    link.addEventListener('click', () => {
      const target = link.dataset.section;
      $$('.admin-nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      $$('.admin-section').forEach(s => s.classList.remove('active'));
      const sec = document.getElementById('section-' + target);
      if (sec) sec.classList.add('active');
      sections[target]?.();
      window.scrollTo(0, 0);
    });
  });

  // Logout
  $('#btnLogout')?.addEventListener('click', () => {
    if (confirm('Sair do painel?')) {
      window.DataStore.logout();
      window.location.href = 'admin-login.html';
    }
  });

  // ===== DASHBOARD =====
  function renderDashboard() {
    const orders = window.DataStore.loadOrders();
    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const last7 = orders.filter(o => {
      const d = new Date(o.createdAt);
      const week = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return d.getTime() >= week;
    });
    $('#statOrders').textContent = orders.length;
    $('#statLast7').textContent = last7.length;
    $('#statRevenue').textContent = formatBRL(totalRevenue);
    $('#statAvg').textContent = orders.length ? formatBRL(totalRevenue / orders.length) : 'R$ 0';

    // Últimos 3 pedidos
    const recent = orders.slice(0, 3);
    const recentEl = $('#recentOrders');
    if (recent.length === 0) {
      recentEl.innerHTML = `<div class="admin-empty"><i data-lucide="inbox"></i><p>Nenhum pedido ainda. Quando alguém fechar pelo simulador, aparece aqui.</p></div>`;
    } else {
      recentEl.innerHTML = recent.map(orderCardHTML).join('');
    }
    if (window.lucide) window.lucide.createIcons();
  }

  // ===== PACOTES =====
  function renderPacotes() {
    const root = $('#pacotesRoot');
    root.innerHTML = Object.values(data.packages).map(pkg => `
      <div class="admin-card">
        <div class="admin-card-header">
          <div>
            <h3>${pkg.name}</h3>
            <p>ID: <code>${pkg.id}</code></p>
          </div>
        </div>
        <div class="admin-grid cols-2">
          <div class="admin-field">
            <label>Preço base</label>
            <div class="admin-field-prefix">
              <span class="prefix">R$</span>
              <input type="number" min="0" data-pkg="${pkg.id}" data-field="price" value="${pkg.price}">
            </div>
          </div>
          <div class="admin-field">
            <label>Capacidade <small>(pessoas)</small></label>
            <input type="number" min="1" data-pkg="${pkg.id}" data-field="capacity" value="${pkg.capacity}">
          </div>
          <div class="admin-field">
            <label>Taxa por excedente <small>(R$ por pessoa acima da capacidade)</small></label>
            <div class="admin-field-prefix">
              <span class="prefix">R$</span>
              <input type="number" min="0" data-pkg="${pkg.id}" data-field="extraPerGuest" value="${pkg.extraPerGuest}">
            </div>
          </div>
          <div class="admin-field">
            <label>Inclui no pacote</label>
            <div style="display:flex; gap: var(--space-4); padding-top: var(--space-2); flex-wrap: wrap;">
              <label style="font-weight:400; display:flex; gap:6px; align-items:center;">
                <input type="checkbox" data-pkg="${pkg.id}" data-field="includesGas" ${pkg.includesGas ? 'checked' : ''}>
                Gás
              </label>
              <label style="font-weight:400; display:flex; gap:6px; align-items:center;">
                <input type="checkbox" data-pkg="${pkg.id}" data-field="includesDecoration" ${pkg.includesDecoration ? 'checked' : ''}>
                Decoração
              </label>
              <label style="font-weight:400; display:flex; gap:6px; align-items:center;">
                <input type="checkbox" data-pkg="${pkg.id}" data-field="includesPhotographer" ${pkg.includesPhotographer ? 'checked' : ''}>
                Fotografia
              </label>
            </div>
          </div>
        </div>
      </div>
    `).join('');

    // Listeners
    root.querySelectorAll('[data-pkg]').forEach(inp => {
      inp.addEventListener('change', () => {
        const pkgId = inp.dataset.pkg;
        const field = inp.dataset.field;
        const val = inp.type === 'checkbox' ? inp.checked
                  : inp.type === 'number' ? Number(inp.value)
                  : inp.value;
        data.packages[pkgId][field] = val;
        persist();
      });
    });
  }

  // ===== DECORAÇÃO =====
  function renderDecoracao() {
    renderCombos();
    renderAddons();
  }

  function renderCombos() {
    const root = $('#combosRoot');
    if (!data.decoration.combos.length) {
      root.innerHTML = `<div class="admin-empty"><i data-lucide="palette"></i><p>Nenhum combo cadastrado. Adicione o primeiro abaixo.</p></div>`;
    } else {
      root.innerHTML = data.decoration.combos.map((c, idx) => `
        <div class="admin-item" data-combo-idx="${idx}">
          <div class="admin-item-summary" data-toggle>
            <img src="${c.image || ''}" class="admin-item-img" onerror="this.style.display='none'">
            <div class="admin-item-info">
              <h4>${c.name}</h4>
              <p>${c.type === 'pegue-monte' ? 'Pegue e Monte' : 'Decoração Completa'} · ${c.description}</p>
            </div>
            <div class="admin-item-price">${formatBRL(c.price)}</div>
            <div class="admin-item-actions">
              <button class="admin-icon-btn" data-toggle aria-label="Editar"><i data-lucide="chevron-down"></i></button>
              <button class="admin-icon-btn danger" data-delete-combo="${idx}" aria-label="Excluir"><i data-lucide="trash-2"></i></button>
            </div>
          </div>
          <div class="admin-item-body">
            <div class="admin-grid cols-2">
              <div class="admin-field">
                <label>Nome</label>
                <input data-combo-field="name" data-idx="${idx}" value="${escapeAttr(c.name)}">
              </div>
              <div class="admin-field">
                <label>Tipo</label>
                <select data-combo-field="type" data-idx="${idx}">
                  <option value="pegue-monte" ${c.type === 'pegue-monte' ? 'selected' : ''}>Pegue e Monte</option>
                  <option value="completa" ${c.type === 'completa' ? 'selected' : ''}>Decoração Completa</option>
                </select>
              </div>
              <div class="admin-field">
                <label>Preço</label>
                <div class="admin-field-prefix">
                  <span class="prefix">R$</span>
                  <input type="number" min="0" data-combo-field="price" data-idx="${idx}" value="${c.price}">
                </div>
              </div>
              <div class="admin-field">
                <label>Imagem (URL)</label>
                <input data-combo-field="image" data-idx="${idx}" value="${escapeAttr(c.image || '')}">
              </div>
            </div>
            <div class="admin-field" style="margin-top: var(--space-4);">
              <label>Descrição</label>
              <textarea data-combo-field="description" data-idx="${idx}">${escapeAttr(c.description)}</textarea>
            </div>
            <div class="admin-field" style="margin-top: var(--space-4);">
              <label>Itens inclusos</label>
              <div class="array-editor" data-combo-items="${idx}">
                ${c.items.map((it, i) => arrayRowHTML(it, i)).join('')}
                <span class="array-add" data-add-item="${idx}"><i data-lucide="plus"></i>Adicionar item</span>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    }

    // Toggles + listeners
    root.querySelectorAll('.admin-item').forEach(item => {
      const toggle = (e) => {
        if (e.target.closest('[data-delete-combo]') || e.target.closest('input') || e.target.closest('select') || e.target.closest('textarea') || e.target.closest('.array-add') || e.target.closest('.array-row .admin-icon-btn')) return;
        item.classList.toggle('open');
      };
      item.querySelectorAll('[data-toggle]').forEach(el => el.addEventListener('click', toggle));
    });

    // Field changes
    root.querySelectorAll('[data-combo-field]').forEach(inp => {
      inp.addEventListener('change', () => {
        const idx = +inp.dataset.idx;
        const f = inp.dataset.comboField;
        const v = inp.type === 'number' ? Number(inp.value) : inp.value;
        data.decoration.combos[idx][f] = v;
        persist();
        if (f === 'name' || f === 'price' || f === 'type' || f === 'image' || f === 'description') {
          // Re-render card (mantém o item aberto)
          const wasOpen = root.querySelector(`[data-combo-idx="${idx}"]`)?.classList.contains('open');
          renderCombos();
          if (wasOpen) root.querySelector(`[data-combo-idx="${idx}"]`)?.classList.add('open');
        }
      });
    });

    // Items array
    root.querySelectorAll('[data-combo-items]').forEach(container => {
      const idx = +container.dataset.comboItems;
      container.querySelectorAll('.array-row input').forEach((inp, i) => {
        inp.addEventListener('change', () => {
          data.decoration.combos[idx].items[i] = inp.value;
          persist();
        });
      });
      container.querySelectorAll('.array-row [data-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
          const i = +btn.dataset.remove;
          data.decoration.combos[idx].items.splice(i, 1);
          persist();
          renderCombos();
          $(`[data-combo-idx="${idx}"]`)?.classList.add('open');
        });
      });
    });
    root.querySelectorAll('[data-add-item]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = +btn.dataset.addItem;
        data.decoration.combos[idx].items.push('Novo item');
        persist();
        renderCombos();
        $(`[data-combo-idx="${idx}"]`)?.classList.add('open');
      });
    });

    // Delete
    root.querySelectorAll('[data-delete-combo]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = +btn.dataset.deleteCombo;
        if (confirm(`Excluir o combo "${data.decoration.combos[idx].name}"?`)) {
          data.decoration.combos.splice(idx, 1);
          persist();
          renderCombos();
        }
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function renderAddons() {
    const root = $('#addonsRoot');
    if (!data.decoration.addons.length) {
      root.innerHTML = `<div class="admin-empty"><i data-lucide="sparkles"></i><p>Nenhum adicional cadastrado.</p></div>`;
    } else {
      root.innerHTML = data.decoration.addons.map((a, idx) => `
        <div class="admin-item" data-addon-idx="${idx}">
          <div class="admin-item-summary" data-toggle>
            <div class="admin-item-icon"><i data-lucide="sparkles"></i></div>
            <div class="admin-item-info">
              <h4>${a.name}</h4>
              <p>${a.description || ''}</p>
            </div>
            <div class="admin-item-price">${formatBRL(a.price)}</div>
            <div class="admin-item-actions">
              <button class="admin-icon-btn" data-toggle><i data-lucide="chevron-down"></i></button>
              <button class="admin-icon-btn danger" data-delete-addon="${idx}"><i data-lucide="trash-2"></i></button>
            </div>
          </div>
          <div class="admin-item-body">
            <div class="admin-grid cols-2">
              <div class="admin-field">
                <label>Nome</label>
                <input data-addon-field="name" data-idx="${idx}" value="${escapeAttr(a.name)}">
              </div>
              <div class="admin-field">
                <label>Preço</label>
                <div class="admin-field-prefix">
                  <span class="prefix">R$</span>
                  <input type="number" min="0" data-addon-field="price" data-idx="${idx}" value="${a.price}">
                </div>
              </div>
            </div>
            <div class="admin-field" style="margin-top: var(--space-4);">
              <label>Descrição</label>
              <input data-addon-field="description" data-idx="${idx}" value="${escapeAttr(a.description || '')}">
            </div>
          </div>
        </div>
      `).join('');
    }

    root.querySelectorAll('.admin-item').forEach(item => {
      const toggle = (e) => {
        if (e.target.closest('[data-delete-addon]') || e.target.closest('input')) return;
        item.classList.toggle('open');
      };
      item.querySelectorAll('[data-toggle]').forEach(el => el.addEventListener('click', toggle));
    });

    root.querySelectorAll('[data-addon-field]').forEach(inp => {
      inp.addEventListener('change', () => {
        const idx = +inp.dataset.idx;
        const f = inp.dataset.addonField;
        const v = inp.type === 'number' ? Number(inp.value) : inp.value;
        data.decoration.addons[idx][f] = v;
        persist();
      });
    });

    root.querySelectorAll('[data-delete-addon]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = +btn.dataset.deleteAddon;
        if (confirm(`Excluir "${data.decoration.addons[idx].name}"?`)) {
          data.decoration.addons.splice(idx, 1);
          persist();
          renderAddons();
        }
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // Adicionar combo / adicional
  $('#btnAddCombo')?.addEventListener('click', () => {
    const id = 'combo-' + Date.now();
    data.decoration.combos.push({
      id, type: 'pegue-monte', name: 'Novo combo', description: 'Descrição do combo',
      items: ['Item 1'], price: 100, image: ''
    });
    persist();
    renderCombos();
  });
  $('#btnAddAddon')?.addEventListener('click', () => {
    data.decoration.addons.push({
      id: 'addon-' + Date.now(), name: 'Novo adicional', description: '', price: 50
    });
    persist();
    renderAddons();
  });

  // ===== SERVIÇOS =====
  function renderServicos() {
    const root = $('#servicosRoot');
    root.innerHTML = Object.values(data.services).map(svc => svcCardHTML(svc)).join('');

    // Listeners genéricos para campos do serviço
    root.querySelectorAll('[data-svc-field]').forEach(inp => {
      inp.addEventListener('change', () => {
        const svcId = inp.dataset.svc;
        const field = inp.dataset.svcField;
        const v = inp.type === 'number' ? Number(inp.value) : inp.value;
        data.services[svcId][field] = v;
        persist();
      });
    });

    // Items da animadora
    root.querySelectorAll('[data-anim-field]').forEach(inp => {
      inp.addEventListener('change', () => {
        const idx = +inp.dataset.idx;
        const f = inp.dataset.animField;
        const v = inp.type === 'number' ? Number(inp.value) : inp.value;
        data.services.animadora.items[idx][f] = v;
        persist();
      });
    });
    root.querySelectorAll('[data-delete-anim]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = +btn.dataset.deleteAnim;
        data.services.animadora.items.splice(idx, 1);
        persist();
        renderServicos();
      });
    });
    $('#btnAddAnim')?.addEventListener('click', () => {
      data.services.animadora.items.push({ id: 'anim-' + Date.now(), name: 'Novo serviço', price: 100 });
      persist();
      renderServicos();
    });

    // Tipos do DJ
    root.querySelectorAll('[data-dj-field]').forEach(inp => {
      inp.addEventListener('change', () => {
        const idx = +inp.dataset.idx;
        const f = inp.dataset.djField;
        const v = inp.type === 'number' ? Number(inp.value) : inp.value;
        data.services.dj.types[idx][f] = v;
        persist();
      });
    });
    root.querySelectorAll('[data-delete-dj]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = +btn.dataset.deleteDj;
        data.services.dj.types.splice(idx, 1);
        persist();
        renderServicos();
      });
    });
    $('#btnAddDj')?.addEventListener('click', () => {
      data.services.dj.types.push({ id: 'dj-' + Date.now(), name: 'Novo tipo', extraPerHour: 0 });
      persist();
      renderServicos();
    });

    // Pacotes (fotógrafo / storymaker)
    root.querySelectorAll('[data-pkg-field]').forEach(inp => {
      inp.addEventListener('change', () => {
        const svcId = inp.dataset.svc;
        const idx = +inp.dataset.idx;
        const f = inp.dataset.pkgField;
        const v = inp.type === 'number' ? Number(inp.value) : inp.value;
        data.services[svcId].packages[idx][f] = v;
        persist();
      });
    });
    root.querySelectorAll('[data-delete-pkg]').forEach(btn => {
      btn.addEventListener('click', () => {
        const svcId = btn.dataset.svc;
        const idx = +btn.dataset.deletePkg;
        data.services[svcId].packages.splice(idx, 1);
        persist();
        renderServicos();
      });
    });
    root.querySelectorAll('[data-add-pkg]').forEach(btn => {
      btn.addEventListener('click', () => {
        const svcId = btn.dataset.addPkg;
        data.services[svcId].packages.push({ id: svcId + '-' + Date.now(), name: 'Novo pacote', desc: 'Descrição', price: 200 });
        persist();
        renderServicos();
      });
    });

    // Controle segurança
    root.querySelectorAll('[data-ctrl-field]').forEach(inp => {
      inp.addEventListener('change', () => {
        const idx = +inp.dataset.idx;
        const f = inp.dataset.ctrlField;
        const v = inp.type === 'number' ? Number(inp.value) : inp.value;
        data.services.seguranca.controlOptions[idx][f] = v;
        persist();
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  function svcCardHTML(svc) {
    let extra = '';
    if (svc.mode === 'multi-checkbox') {
      extra = `
        <div class="admin-field" style="margin-top: var(--space-4);">
          <label>Itens da animadora</label>
          <div class="admin-list">
            ${svc.items.map((it, i) => `
              <div class="admin-item open">
                <div class="admin-item-body" style="padding: var(--space-4); border-top: none;">
                  <div class="admin-grid cols-2" style="gap: var(--space-3);">
                    <div class="admin-field">
                      <label>Nome</label>
                      <input data-anim-field="name" data-idx="${i}" value="${escapeAttr(it.name)}">
                    </div>
                    <div class="admin-field">
                      <label>Preço</label>
                      <div class="admin-field-prefix">
                        <span class="prefix">R$</span>
                        <input type="number" min="0" data-anim-field="price" data-idx="${i}" value="${it.price}">
                      </div>
                    </div>
                  </div>
                  <button class="btn btn-ghost btn-sm" data-delete-anim="${i}" style="margin-top: var(--space-3);">
                    <i data-lucide="trash-2"></i>Remover item
                  </button>
                </div>
              </div>
            `).join('')}
            <span class="array-add" id="btnAddAnim"><i data-lucide="plus"></i>Adicionar item</span>
          </div>
        </div>
      `;
    } else if (svc.mode === 'hours' || svc.mode === 'qty-hours') {
      extra = `
        <div class="admin-field">
          <label>Valor por hora</label>
          <div class="admin-field-prefix">
            <span class="prefix">R$</span>
            <input type="number" min="0" data-svc="${svc.id}" data-svc-field="hourlyRate" value="${svc.hourlyRate}">
          </div>
        </div>
      `;
    } else if (svc.mode === 'qty-hours-control') {
      extra = `
        <div class="admin-field">
          <label>Valor por hora</label>
          <div class="admin-field-prefix">
            <span class="prefix">R$</span>
            <input type="number" min="0" data-svc="${svc.id}" data-svc-field="hourlyRate" value="${svc.hourlyRate}">
          </div>
        </div>
        <div class="admin-field" style="margin-top: var(--space-4);">
          <label>Opções de controle de acesso</label>
          <div class="admin-list">
            ${svc.controlOptions.map((c, i) => `
              <div class="admin-item open">
                <div class="admin-item-body" style="padding: var(--space-4); border-top: none;">
                  <div class="admin-grid cols-2" style="gap: var(--space-3);">
                    <div class="admin-field">
                      <label>Nome</label>
                      <input data-ctrl-field="name" data-idx="${i}" value="${escapeAttr(c.name)}">
                    </div>
                    <div class="admin-field">
                      <label>Preço adicional</label>
                      <div class="admin-field-prefix">
                        <span class="prefix">R$</span>
                        <input type="number" min="0" data-ctrl-field="price" data-idx="${i}" value="${c.price}">
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else if (svc.mode === 'type-hours') {
      extra = `
        <div class="admin-field">
          <label>Valor base por hora</label>
          <div class="admin-field-prefix">
            <span class="prefix">R$</span>
            <input type="number" min="0" data-svc="${svc.id}" data-svc-field="hourlyRate" value="${svc.hourlyRate}">
          </div>
        </div>
        <div class="admin-field" style="margin-top: var(--space-4);">
          <label>Tipos de DJ <small>(adicional cobrado por hora)</small></label>
          <div class="admin-list">
            ${svc.types.map((t, i) => `
              <div class="admin-item open">
                <div class="admin-item-body" style="padding: var(--space-4); border-top: none;">
                  <div class="admin-grid cols-2" style="gap: var(--space-3);">
                    <div class="admin-field">
                      <label>Nome</label>
                      <input data-dj-field="name" data-idx="${i}" value="${escapeAttr(t.name)}">
                    </div>
                    <div class="admin-field">
                      <label>Adicional/hora</label>
                      <div class="admin-field-prefix">
                        <span class="prefix">+R$</span>
                        <input type="number" min="0" data-dj-field="extraPerHour" data-idx="${i}" value="${t.extraPerHour}">
                      </div>
                    </div>
                  </div>
                  <button class="btn btn-ghost btn-sm" data-delete-dj="${i}" style="margin-top: var(--space-3);">
                    <i data-lucide="trash-2"></i>Remover tipo
                  </button>
                </div>
              </div>
            `).join('')}
            <span class="array-add" id="btnAddDj"><i data-lucide="plus"></i>Adicionar tipo</span>
          </div>
        </div>
      `;
    } else if (svc.mode === 'package') {
      extra = `
        <div class="admin-field" style="margin-top: var(--space-4);">
          <label>Pacotes disponíveis</label>
          <div class="admin-list">
            ${svc.packages.map((p, i) => `
              <div class="admin-item open">
                <div class="admin-item-body" style="padding: var(--space-4); border-top: none;">
                  <div class="admin-grid cols-3" style="gap: var(--space-3);">
                    <div class="admin-field">
                      <label>Nome</label>
                      <input data-svc="${svc.id}" data-pkg-field="name" data-idx="${i}" value="${escapeAttr(p.name)}">
                    </div>
                    <div class="admin-field">
                      <label>Descrição</label>
                      <input data-svc="${svc.id}" data-pkg-field="desc" data-idx="${i}" value="${escapeAttr(p.desc)}">
                    </div>
                    <div class="admin-field">
                      <label>Preço</label>
                      <div class="admin-field-prefix">
                        <span class="prefix">R$</span>
                        <input type="number" min="0" data-svc="${svc.id}" data-pkg-field="price" data-idx="${i}" value="${p.price}">
                      </div>
                    </div>
                  </div>
                  <button class="btn btn-ghost btn-sm" data-svc="${svc.id}" data-delete-pkg="${i}" style="margin-top: var(--space-3);">
                    <i data-lucide="trash-2"></i>Remover pacote
                  </button>
                </div>
              </div>
            `).join('')}
            <span class="array-add" data-add-pkg="${svc.id}"><i data-lucide="plus"></i>Adicionar pacote</span>
          </div>
        </div>
      `;
    }

    return `
      <div class="admin-card">
        <div class="admin-card-header">
          <div style="display:flex; align-items:center; gap: var(--space-3);">
            <div class="admin-item-icon"><i data-lucide="${svc.icon}"></i></div>
            <div>
              <h3>${svc.name}</h3>
              <p>${svc.desc}</p>
            </div>
          </div>
        </div>
        <div class="admin-grid cols-2">
          <div class="admin-field">
            <label>Nome do serviço</label>
            <input data-svc="${svc.id}" data-svc-field="name" value="${escapeAttr(svc.name)}">
          </div>
          <div class="admin-field">
            <label>Descrição curta</label>
            <input data-svc="${svc.id}" data-svc-field="desc" value="${escapeAttr(svc.desc)}">
          </div>
        </div>
        ${extra}
      </div>
    `;
  }

  // ===== CONFIG =====
  function renderConfig() {
    $('#cfgWhatsapp').value = data.config.whatsappNumber;
    $('#cfgGas').value = data.config.gasPrice;
  }
  $('#cfgWhatsapp')?.addEventListener('change', (e) => {
    data.config.whatsappNumber = e.target.value.replace(/\D/g, '');
    persist();
  });
  $('#cfgGas')?.addEventListener('change', (e) => {
    data.config.gasPrice = Number(e.target.value);
    persist();
  });
  $('#btnChangePassword')?.addEventListener('click', () => {
    const cur = prompt('Senha atual:');
    if (cur !== data.auth.password) { toast('Senha atual incorreta', 'error'); return; }
    const newPass = prompt('Nova senha (mínimo 6 caracteres):');
    if (!newPass || newPass.length < 6) { toast('Senha muito curta', 'error'); return; }
    data.auth.password = newPass;
    persist();
    toast('Senha alterada com sucesso');
  });
  $('#btnResetData')?.addEventListener('click', () => {
    if (!confirm('Restaurar TODOS os dados aos valores padrão? Esta ação não pode ser desfeita.')) return;
    if (!confirm('Tem certeza? Você vai perder todas as edições feitas no painel.')) return;
    data = window.DataStore.resetData();
    window.DataStore.applyToSimulator(data);
    toast('Dados restaurados');
    renderPacotes(); renderDecoracao(); renderServicos(); renderConfig();
  });

  // ===== HISTÓRICO =====
  function renderHistorico() {
    const root = $('#historicoRoot');
    const orders = window.DataStore.loadOrders();
    if (!orders.length) {
      root.innerHTML = `<div class="admin-empty"><i data-lucide="inbox"></i><p>Nenhum pedido recebido ainda. Quando alguém usar o simulador e clicar em "Enviar para WhatsApp", aparece aqui.</p></div>`;
    } else {
      root.innerHTML = orders.map(orderCardHTML).join('');
      attachOrderListeners(root);
    }
    if (window.lucide) window.lucide.createIcons();
  }
  $('#btnClearOrders')?.addEventListener('click', () => {
    if (!confirm('Apagar TODO o histórico de pedidos? Esta ação não pode ser desfeita.')) return;
    window.DataStore.clearOrders();
    toast('Histórico limpo');
    renderHistorico();
  });

  function orderCardHTML(o) {
    const date = new Date(o.createdAt);
    const dateStr = date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const eventDate = o.eventDate ? new Date(o.eventDate + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
    const wa = o.customerWhatsapp ? formatWhatsappDisplay(o.customerWhatsapp) : '—';
    return `
      <div class="order-card" data-order-id="${o.id}">
        <div class="order-head">
          <div>
            <div class="order-customer">${escapeAttr(o.customerName || 'Sem nome')}</div>
            <div class="order-meta">
              <span><i data-lucide="message-circle"></i>${wa}</span>
              <span><i data-lucide="calendar"></i>Evento: ${eventDate}</span>
              <span><i data-lucide="clock"></i>Recebido: ${dateStr}</span>
              <span><i data-lucide="users"></i>${o.guests || 0} convidados</span>
            </div>
          </div>
          <div class="order-total">${formatBRL(o.total || 0)}</div>
        </div>
        <pre class="order-msg">${escapeAttr(o.message || '')}</pre>
        <div class="order-actions">
          <button class="btn btn-outline btn-sm" data-toggle-msg><i data-lucide="eye"></i>Ver mensagem</button>
          <a class="btn btn-whatsapp btn-sm" href="${window.waLink ? window.waLink(o.message) : '#'}" target="_blank" rel="noopener"><i data-lucide="send"></i>Reabrir no WhatsApp</a>
          <button class="btn btn-ghost btn-sm" data-delete-order="${o.id}"><i data-lucide="trash-2"></i>Excluir</button>
        </div>
      </div>
    `;
  }
  function attachOrderListeners(root) {
    root.querySelectorAll('[data-toggle-msg]').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.order-card').classList.toggle('expanded');
      });
    });
    root.querySelectorAll('[data-delete-order]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.deleteOrder;
        if (!confirm('Excluir este pedido do histórico?')) return;
        window.DataStore.deleteOrder(id);
        toast('Pedido excluído');
        renderHistorico();
      });
    });
  }

  // ===== HELPERS =====
  function arrayRowHTML(value, i) {
    return `
      <div class="array-row">
        <input value="${escapeAttr(value)}">
        <button class="admin-icon-btn danger" data-remove="${i}" type="button"><i data-lucide="x"></i></button>
      </div>
    `;
  }
  function escapeAttr(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function formatWhatsappDisplay(digits) {
    const d = String(digits).replace(/\D/g, '');
    if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return d;
  }

  // ===== INIT =====
  // Aviso de senha padrão
  if (data.auth.password === 'casadebia123') {
    setTimeout(() => toast('⚠️ Senha padrão ativa — altere em Configurações', 'error'), 800);
  }
  // Atualiza link WhatsApp para sair com o numero atualizado
  if (window.CASA_CONFIG) window.CASA_CONFIG.whatsapp.number = data.config.whatsappNumber;

  renderDashboard();
})();
