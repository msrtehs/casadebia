/* ============================================
   CASA DE BIA — Simulador: Controlador da UI
   ============================================ */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    let state = window.SIM.load();

    // Pré-seleção via ?pkg=...
    const urlParams = new URLSearchParams(location.search);
    const preselectPkg = urlParams.get('pkg');
    if (preselectPkg && window.SIM_PRICING.packages[preselectPkg] && !state.package) {
      state.package = preselectPkg;
      window.SIM.save(state);
    }

    // ===== ELEMENTOS =====
    const stepCards = document.querySelectorAll('.sim-step');
    const progressFill = document.getElementById('progressFill');
    const progressStep = document.getElementById('progressStep');
    const progressPct = document.getElementById('progressPct');

    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');

    const budgetTotal = document.getElementById('budgetTotal');
    const budgetList = document.getElementById('budgetList');
    const budgetEmpty = document.getElementById('budgetEmpty');
    const budgetPanel = document.getElementById('budgetPanel');
    const budgetHeader = document.getElementById('budgetHeader');

    // ===== RENDER PROGRESS =====
    const renderProgress = () => {
      const pct = Math.round((state.currentStep / state.totalSteps) * 100);
      if (progressFill) progressFill.style.width = pct + '%';
      if (progressStep) progressStep.textContent = `Etapa ${state.currentStep} de ${state.totalSteps}`;
      if (progressPct) progressPct.textContent = pct + '%';
    };

    // ===== SHOW STEP =====
    const showStep = (n) => {
      // Pula etapa 3 (gás) se Premium
      if (n === 3 && state.package === 'premium') {
        n = state.currentStep < 3 ? 4 : 2;
      }
      state.currentStep = Math.max(1, Math.min(n, state.totalSteps));
      window.SIM.save(state);

      stepCards.forEach(s => {
        s.classList.toggle('active', parseInt(s.dataset.step, 10) === state.currentStep);
      });

      // Botão Prev
      if (btnPrev) btnPrev.disabled = state.currentStep === 1;

      // Botão Next - texto contextual
      if (btnNext) {
        if (state.currentStep === state.totalSteps) {
          btnNext.innerHTML = '<i data-lucide="send"></i>Enviar para WhatsApp';
        } else {
          btnNext.innerHTML = 'Próxima etapa<i data-lucide="arrow-right"></i>';
        }
        if (window.lucide) window.lucide.createIcons();
      }

      renderProgress();
      // Re-render do resumo ao chegar na Etapa 8 (refletir últimas mudanças)
      if (state.currentStep === 8 && typeof renderSummary === 'function') renderSummary();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ===== VALIDAÇÃO POR ETAPA =====
    const canAdvance = () => {
      switch (state.currentStep) {
        case 1: return !!state.package;
        case 2: return state.guests >= 1;
        case 3: return state.gas === true || state.gas === false;
        case 4: {
          if (state.package === 'premium' || state.package === 'promax') return true;
          if (state.decoration?.enabled === false) return true;
          if (state.decoration?.enabled === true) {
            return !!state.decoration.type && !!state.decoration.combo;
          }
          return false;
        }
        case 5: return true; // Serviços são opcionais
        case 6: return !!state.date;
        case 7: {
          const name = (state.customer?.name || '').trim();
          const digits = (state.customer?.whatsapp || '').replace(/\D/g, '');
          return name.length >= 3 && (digits.length === 10 || digits.length === 11);
        }
        default: return true;
      }
    };

    const validateStep7Inputs = () => {
      let ok = true;
      if (inpName) {
        const valid = (inpName.value || '').trim().length >= 3;
        inpName.closest('.sim-input-group')?.classList.toggle('has-error', !valid);
        if (!valid) ok = false;
      }
      if (inpWhatsapp) {
        const digits = (inpWhatsapp.value || '').replace(/\D/g, '');
        const valid = digits.length === 10 || digits.length === 11;
        inpWhatsapp.closest('.sim-input-group')?.classList.toggle('has-error', !valid);
        if (!valid) ok = false;
      }
      return ok;
    };

    const showValidationError = (msg) => {
      const active = document.querySelector('.sim-step.active');
      if (!active) return;
      let bar = active.querySelector('.sim-info-bar.error');
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'sim-info-bar error';
        bar.innerHTML = `<i data-lucide="alert-circle"></i><span></span>`;
        active.appendChild(bar);
        if (window.lucide) window.lucide.createIcons();
      }
      bar.querySelector('span').textContent = msg;
      setTimeout(() => bar?.remove(), 3500);
    };

    // ===== RENDER BUDGET =====
    const renderBudget = (animate = true) => {
      const { items, total } = window.SIM.calculate(state);

      if (budgetTotal) {
        budgetTotal.innerHTML = `${window.SIM.formatBRL(total)}<small></small>`;
        if (animate) {
          budgetTotal.classList.remove('bumping');
          void budgetTotal.offsetWidth;
          budgetTotal.classList.add('bumping');
        }
      }

      if (budgetList && budgetEmpty) {
        if (items.length === 0) {
          budgetList.innerHTML = '';
          budgetEmpty.style.display = '';
        } else {
          budgetEmpty.style.display = 'none';
          budgetList.innerHTML = items.map(it => `
            <div class="sim-budget-item">
              <div class="sim-budget-item-label">
                <strong>${it.label}</strong>
                ${it.sub ? `<span class="sub">${it.sub}</span>` : ''}
              </div>
              <div class="sim-budget-item-value">${window.SIM.formatBRL(it.value)}</div>
            </div>
          `).join('');
        }
      }
    };

    // ===== ETAPA 1 — PACOTES =====
    const pkgOptions = document.querySelectorAll('.sim-option[data-pkg]');
    const renderPackages = () => {
      pkgOptions.forEach(opt => {
        opt.classList.toggle('selected', opt.dataset.pkg === state.package);
      });
    };
    pkgOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        state.package = opt.dataset.pkg;
        // Reset de gás se mudar pacote
        if (state.package === 'premium') state.gas = null;
        window.SIM.save(state);
        renderPackages();
        renderBudget();
      });
    });

    // ===== ETAPA 2 — CONVIDADOS =====
    const guestInput = document.getElementById('guestInput');
    const guestMinus = document.getElementById('guestMinus');
    const guestPlus = document.getElementById('guestPlus');
    const guestInfo = document.getElementById('guestInfo');

    const updateGuestUI = () => {
      if (guestInput) guestInput.value = state.guests || 0;
      if (guestMinus) guestMinus.disabled = state.guests <= 0;

      if (guestInfo && state.package) {
        const pkg = window.SIM_PRICING.packages[state.package];
        if (state.guests > pkg.capacity && pkg.extraPerGuest > 0) {
          const extra = state.guests - pkg.capacity;
          const cost = extra * pkg.extraPerGuest;
          guestInfo.innerHTML = `<i data-lucide="info"></i><span>Pacote inclui ${pkg.capacity} pessoas. <strong>+${extra} excedente${extra > 1 ? 's' : ''} = ${window.SIM.formatBRL(cost)}</strong></span>`;
          guestInfo.style.display = '';
        } else if (state.guests > pkg.capacity) {
          guestInfo.innerHTML = `<i data-lucide="alert-triangle"></i><span>Acima da capacidade do pacote (${pkg.capacity} pessoas).</span>`;
          guestInfo.style.display = '';
          guestInfo.classList.add('error');
        } else if (state.guests > 0) {
          guestInfo.innerHTML = `<i data-lucide="check-circle-2"></i><span>Dentro da capacidade do pacote ${pkg.name}.</span>`;
          guestInfo.style.display = '';
          guestInfo.classList.remove('error');
        } else {
          guestInfo.style.display = 'none';
        }
        if (window.lucide) window.lucide.createIcons();
      }
    };

    const setGuests = (n) => {
      state.guests = Math.max(0, Math.min(500, parseInt(n, 10) || 0));
      window.SIM.save(state);
      updateGuestUI();
      renderBudget();
    };

    if (guestMinus) guestMinus.addEventListener('click', () => setGuests(state.guests - 1));
    if (guestPlus) guestPlus.addEventListener('click', () => setGuests(state.guests + 1));
    if (guestInput) guestInput.addEventListener('input', (e) => setGuests(e.target.value));

    // ===== ETAPA 3 — GÁS =====
    const gasOptions = document.querySelectorAll('.sim-yesno-option[data-gas]');
    const renderGas = () => {
      gasOptions.forEach(opt => {
        opt.classList.toggle('selected', String(state.gas) === opt.dataset.gas);
      });
    };
    gasOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        state.gas = (opt.dataset.gas === 'true');
        window.SIM.save(state);
        renderGas();
        renderBudget();
      });
    });

    // ===== ETAPA 4 — DECORAÇÃO =====
    const decoYesNo = document.querySelectorAll('.sim-yesno-option[data-deco]');
    const decoModule = document.getElementById('decoModule');
    const decoTypes = document.querySelectorAll('.sim-yesno-option[data-deco-type]');
    const decoTypeSection = document.getElementById('decoTypeSection');
    const decoCombosSection = document.getElementById('decoCombosSection');
    const decoCombosGrid = document.getElementById('decoCombos');
    const decoAddonsSection = document.getElementById('decoAddonsSection');
    const decoAddonsGrid = document.getElementById('decoAddons');
    const decoSummary = document.getElementById('decoSummary');
    const decoIncludedNote = document.getElementById('decoIncludedNote');

    // Premium já inclui decoração — força enabled=false e exibe nota
    const isPremium = () => state.package === 'premium' || state.package === 'promax';

    const renderDecorationVisibility = () => {
      // Exibe nota informativa se Premium/Pro Max
      if (decoIncludedNote) decoIncludedNote.style.display = isPremium() ? '' : 'none';
      const decoTxt = document.getElementById('decoIncludedText');
      if (decoTxt) {
        if (state.package === 'promax') {
          decoTxt.innerHTML = 'Seu pacote <strong>Pro Max</strong> já inclui decoração completa, arco de bolas e forro de mesa. Esta etapa é opcional caso queira extras.';
        } else if (state.package === 'premium') {
          decoTxt.innerHTML = 'Seu pacote <strong>Premium</strong> já inclui decoração básica (kit painel pegue e monte). Esta etapa é opcional caso queira extras.';
        }
      }

      // Esconde toda a UI de decoração se Premium (já incluso)
      const decoQuestion = document.getElementById('decoQuestion');
      if (decoQuestion) decoQuestion.style.display = isPremium() ? 'none' : '';

      // Mostra módulo apenas se enabled=true
      if (decoModule) decoModule.style.display = (state.decoration?.enabled === true && !isPremium()) ? '' : 'none';

      // Sub-seções progressivas
      if (decoTypeSection) decoTypeSection.style.display = (state.decoration?.enabled === true) ? '' : 'none';
      if (decoCombosSection) decoCombosSection.style.display = state.decoration?.type ? '' : 'none';
      if (decoAddonsSection) decoAddonsSection.style.display = state.decoration?.combo ? '' : 'none';
    };

    const renderDecorationYesNo = () => {
      decoYesNo.forEach(opt => {
        opt.classList.toggle('selected', String(state.decoration?.enabled) === opt.dataset.deco);
      });
    };

    const renderDecorationTypes = () => {
      decoTypes.forEach(opt => {
        opt.classList.toggle('selected', state.decoration?.type === opt.dataset.decoType);
      });
    };

    const renderDecorationCombos = () => {
      if (!decoCombosGrid) return;
      const filtered = window.DECORATION_DATA.combos.filter(c => c.type === state.decoration?.type);

      if (!filtered.length) {
        decoCombosGrid.innerHTML = '<div class="deco-combo-empty">Nenhum combo disponível para este tipo no momento.</div>';
        return;
      }

      decoCombosGrid.innerHTML = filtered.map(c => `
        <button class="deco-combo ${state.decoration?.combo === c.id ? 'selected' : ''}" data-combo="${c.id}" type="button">
          <img src="${c.image}" alt="${c.name}" class="deco-combo-img" loading="lazy">
          <div class="deco-combo-body">
            <div class="deco-combo-name">${c.name}</div>
            <p class="deco-combo-desc">${c.description}</p>
            <ul class="deco-combo-items">
              ${c.items.map(i => `<li><i data-lucide="check"></i>${i}</li>`).join('')}
            </ul>
            <div class="deco-combo-price">${window.SIM.formatBRL(c.price)}</div>
          </div>
        </button>
      `).join('');

      decoCombosGrid.querySelectorAll('.deco-combo').forEach(btn => {
        btn.addEventListener('click', () => {
          state.decoration.combo = btn.dataset.combo;
          window.SIM.save(state);
          renderDecorationCombos();
          renderDecorationVisibility();
          renderDecorationSummary();
          renderBudget();
        });
      });

      if (window.lucide) window.lucide.createIcons();
    };

    const renderDecorationAddons = () => {
      if (!decoAddonsGrid) return;
      decoAddonsGrid.innerHTML = window.DECORATION_DATA.addons.map(a => {
        const checked = (state.decoration?.addons || []).includes(a.id);
        return `
          <button class="deco-addon ${checked ? 'selected' : ''}" data-addon="${a.id}" type="button">
            <span class="deco-addon-check"></span>
            <span class="deco-addon-info">
              <h5>${a.name}</h5>
              <p>${a.description}</p>
            </span>
            <span class="deco-addon-price">+ ${window.SIM.formatBRL(a.price)}</span>
          </button>
        `;
      }).join('');

      decoAddonsGrid.querySelectorAll('.deco-addon').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.addon;
          state.decoration.addons = state.decoration.addons || [];
          const idx = state.decoration.addons.indexOf(id);
          if (idx >= 0) state.decoration.addons.splice(idx, 1);
          else state.decoration.addons.push(id);
          window.SIM.save(state);
          renderDecorationAddons();
          renderDecorationSummary();
          renderBudget();
        });
      });
    };

    const renderDecorationSummary = () => {
      if (!decoSummary) return;
      if (state.decoration?.enabled !== true || !state.decoration?.combo) {
        decoSummary.style.display = 'none';
        return;
      }
      const combo = window.DECORATION_DATA.combos.find(c => c.id === state.decoration.combo);
      const addonsTotal = (state.decoration.addons || []).reduce((sum, id) => {
        const a = window.DECORATION_DATA.addons.find(x => x.id === id);
        return sum + (a?.price || 0);
      }, 0);
      const total = (combo?.price || 0) + addonsTotal;
      const addonsCount = (state.decoration.addons || []).length;

      decoSummary.style.display = '';
      decoSummary.innerHTML = `
        <span class="deco-summary-label">
          <strong>${combo?.name || ''}</strong>
          ${addonsCount > 0 ? ` + ${addonsCount} adicional${addonsCount > 1 ? 'is' : ''}` : ''}
        </span>
        <span class="deco-summary-value">${window.SIM.formatBRL(total)}</span>
      `;
    };

    // Yes/No de decoração
    decoYesNo.forEach(opt => {
      opt.addEventListener('click', () => {
        const enabled = opt.dataset.deco === 'true';
        state.decoration = state.decoration || { enabled: null, type: null, combo: null, addons: [] };
        state.decoration.enabled = enabled;
        // Se desabilitar, limpa o resto
        if (!enabled) {
          state.decoration.type = null;
          state.decoration.combo = null;
          state.decoration.addons = [];
        }
        window.SIM.save(state);
        renderDecorationYesNo();
        renderDecorationVisibility();
        renderDecorationSummary();
        renderBudget();
      });
    });

    // Tipo de decoração
    decoTypes.forEach(opt => {
      opt.addEventListener('click', () => {
        state.decoration.type = opt.dataset.decoType;
        // Reset combo se mudar tipo
        state.decoration.combo = null;
        window.SIM.save(state);
        renderDecorationTypes();
        renderDecorationCombos();
        renderDecorationVisibility();
        renderDecorationSummary();
        renderBudget();
      });
    });

    // ===== ETAPA 5 — SERVIÇOS =====
    const svcContainer = document.getElementById('svcList');

    // Garante estrutura inicial dos serviços
    const ensureServices = () => {
      state.services = state.services || {};
      const defaults = {
        animadora:     { enabled: false, items: [] },
        recepcionista: { enabled: false, hours: 0 },
        fritadeira:    { enabled: false, hours: 0 },
        seguranca:     { enabled: false, qtd: 0, hours: 0, controle: 'nenhum' },
        garcom:        { enabled: false, qtd: 0, hours: 0 },
        dj:            { enabled: false, tipo: null, hours: 0 },
        fotografo:     { enabled: false, pacote: null },
        storymaker:    { enabled: false, pacote: null }
      };
      Object.keys(defaults).forEach(k => {
        state.services[k] = Object.assign({}, defaults[k], state.services[k] || {});
      });
    };

    // Calcula subtotal de um serviço específico
    const serviceSubtotal = (key) => {
      const svc = state.services[key];
      if (!svc?.enabled) return 0;
      const SD = window.SERVICES_DATA;

      switch (key) {
        case 'animadora':
          return (svc.items || []).reduce((s, id) => {
            const it = SD.animadora.items.find(i => i.id === id);
            return s + (it?.price || 0);
          }, 0);
        case 'recepcionista': return (svc.hours || 0) * SD.recepcionista.hourlyRate;
        case 'fritadeira':    return (svc.hours || 0) * SD.fritadeira.hourlyRate;
        case 'seguranca': {
          const base = (svc.qtd || 0) * (svc.hours || 0) * SD.seguranca.hourlyRate;
          const ctrl = SD.seguranca.controlOptions.find(c => c.id === svc.controle);
          return base + (ctrl?.price || 0);
        }
        case 'garcom':        return (svc.qtd || 0) * (svc.hours || 0) * SD.garcom.hourlyRate;
        case 'dj': {
          const t = SD.dj.types.find(x => x.id === svc.tipo);
          if (!t) return 0;
          return (svc.hours || 0) * (SD.dj.hourlyRate + t.extraPerHour);
        }
        case 'fotografo': {
          const p = SD.fotografo.packages.find(x => x.id === svc.pacote);
          return p?.price || 0;
        }
        case 'storymaker': {
          const p = SD.storymaker.packages.find(x => x.id === svc.pacote);
          return p?.price || 0;
        }
        default: return 0;
      }
    };

    // Renderiza o body de cada serviço conforme seu modo
    const renderServiceBody = (key) => {
      const svc = state.services[key];
      const SD = window.SERVICES_DATA[key];

      switch (SD.mode) {
        case 'multi-checkbox':
          return `
            <div class="svc-field">
              <label>Selecione os serviços:</label>
              <div class="svc-checkboxes">
                ${SD.items.map(it => {
                  const checked = (svc.items || []).includes(it.id);
                  return `
                    <button class="deco-addon ${checked ? 'selected' : ''}" data-svc-item="${it.id}" type="button">
                      <span class="deco-addon-check"></span>
                      <span class="deco-addon-info">
                        <h5>${it.name}</h5>
                      </span>
                      <span class="deco-addon-price">+ ${window.SIM.formatBRL(it.price)}</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
          `;

        case 'hours':
          return `
            <div class="svc-field">
              <label>Quantas horas?</label>
              <div class="svc-num-input">
                <button data-svc-action="hours-minus" type="button">−</button>
                <input type="number" data-svc-input="hours" min="0" max="24" value="${svc.hours || 0}">
                <button data-svc-action="hours-plus" type="button">+</button>
                <span class="unit">${window.SIM.formatBRL(SD.hourlyRate)}/h</span>
              </div>
            </div>
          `;

        case 'qty-hours':
          return `
            <div class="svc-field-grid">
              <div class="svc-field">
                <label>Quantos profissionais?</label>
                <div class="svc-num-input">
                  <button data-svc-action="qtd-minus" type="button">−</button>
                  <input type="number" data-svc-input="qtd" min="0" max="20" value="${svc.qtd || 0}">
                  <button data-svc-action="qtd-plus" type="button">+</button>
                </div>
              </div>
              <div class="svc-field">
                <label>Quantas horas?</label>
                <div class="svc-num-input">
                  <button data-svc-action="hours-minus" type="button">−</button>
                  <input type="number" data-svc-input="hours" min="0" max="24" value="${svc.hours || 0}">
                  <button data-svc-action="hours-plus" type="button">+</button>
                  <span class="unit">${window.SIM.formatBRL(SD.hourlyRate)}/h</span>
                </div>
              </div>
            </div>
          `;

        case 'qty-hours-control':
          return `
            <div class="svc-field-grid">
              <div class="svc-field">
                <label>Quantos seguranças?</label>
                <div class="svc-num-input">
                  <button data-svc-action="qtd-minus" type="button">−</button>
                  <input type="number" data-svc-input="qtd" min="0" max="20" value="${svc.qtd || 0}">
                  <button data-svc-action="qtd-plus" type="button">+</button>
                </div>
              </div>
              <div class="svc-field">
                <label>Quantas horas?</label>
                <div class="svc-num-input">
                  <button data-svc-action="hours-minus" type="button">−</button>
                  <input type="number" data-svc-input="hours" min="0" max="24" value="${svc.hours || 0}">
                  <button data-svc-action="hours-plus" type="button">+</button>
                  <span class="unit">${window.SIM.formatBRL(SD.hourlyRate)}/h</span>
                </div>
              </div>
            </div>
            <div class="svc-field">
              <label>Controle de acesso:</label>
              <div class="svc-radio-group">
                ${SD.controlOptions.map(c => `
                  <button class="svc-radio ${svc.controle === c.id ? 'selected' : ''}" data-svc-control="${c.id}" type="button">
                    <span class="svc-radio-name">${c.name}</span>
                    <span class="svc-radio-meta">${c.price > 0 ? '+ ' + window.SIM.formatBRL(c.price) : 'Sem custo'}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          `;

        case 'type-hours':
          return `
            <div class="svc-field">
              <label>Tipo de DJ:</label>
              <div class="svc-radio-group">
                ${SD.types.map(t => {
                  const ratePerHour = SD.hourlyRate + t.extraPerHour;
                  return `
                    <button class="svc-radio ${svc.tipo === t.id ? 'selected' : ''}" data-svc-type="${t.id}" type="button">
                      <span class="svc-radio-name">${t.name}</span>
                      <span class="svc-radio-meta">${window.SIM.formatBRL(ratePerHour)}/h</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>
            <div class="svc-field">
              <label>Quantas horas?</label>
              <div class="svc-num-input">
                <button data-svc-action="hours-minus" type="button">−</button>
                <input type="number" data-svc-input="hours" min="0" max="24" value="${svc.hours || 0}">
                <button data-svc-action="hours-plus" type="button">+</button>
              </div>
            </div>
          `;

        case 'package':
          return `
            <div class="svc-field">
              <label>Escolha o pacote:</label>
              <div class="svc-package-group">
                ${SD.packages.map(p => `
                  <button class="svc-package ${svc.pacote === p.id ? 'selected' : ''}" data-svc-package="${p.id}" type="button">
                    <span class="svc-package-name">${p.name}</span>
                    <span class="svc-package-meta">${p.desc}</span>
                    <span class="svc-package-price">${window.SIM.formatBRL(p.price)}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          `;

        default: return '';
      }
    };

    const renderServices = () => {
      if (!svcContainer) return;
      const SD = window.SERVICES_DATA;
      const order = ['animadora', 'recepcionista', 'fritadeira', 'seguranca', 'garcom', 'dj', 'fotografo', 'storymaker'];

      svcContainer.innerHTML = order.map(key => {
        const cfg = SD[key];
        const svc = state.services[key];
        const subtotal = serviceSubtotal(key);
        return `
          <div class="svc-card ${svc.enabled ? 'enabled' : ''}" data-svc="${key}">
            <div class="svc-head" data-svc-toggle>
              <div class="svc-icon"><i data-lucide="${cfg.icon}"></i></div>
              <div class="svc-head-info">
                <h4>${cfg.name}</h4>
                <p>${cfg.desc}</p>
              </div>
              <div class="svc-head-right">
                <span class="svc-head-total ${subtotal > 0 ? 'has-value' : ''}">${window.SIM.formatBRL(subtotal)}</span>
                <span class="svc-toggle"></span>
              </div>
            </div>
            <div class="svc-body">${renderServiceBody(key)}</div>
          </div>
        `;
      }).join('');

      attachServiceListeners();
      if (window.lucide) window.lucide.createIcons();
    };

    const attachServiceListeners = () => {
      svcContainer.querySelectorAll('.svc-card').forEach(card => {
        const key = card.dataset.svc;

        // Toggle on/off
        card.querySelector('[data-svc-toggle]')?.addEventListener('click', (e) => {
          // Não toggle se clicar dentro do body
          if (e.target.closest('.svc-body')) return;
          state.services[key].enabled = !state.services[key].enabled;
          window.SIM.save(state);
          renderServices();
          renderBudget();
        });

        // Multi-checkbox (animadora)
        card.querySelectorAll('[data-svc-item]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.svcItem;
            const arr = state.services[key].items = state.services[key].items || [];
            const idx = arr.indexOf(id);
            if (idx >= 0) arr.splice(idx, 1);
            else arr.push(id);
            window.SIM.save(state);
            renderServices();
            renderBudget();
          });
        });

        // Inputs numéricos +/-
        card.querySelectorAll('[data-svc-action]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.svcAction;
            const [field, op] = action.split('-');
            const delta = op === 'plus' ? 1 : -1;
            const max = field === 'hours' ? 24 : 20;
            state.services[key][field] = Math.max(0, Math.min(max, (state.services[key][field] || 0) + delta));
            window.SIM.save(state);
            renderServices();
            renderBudget();
          });
        });

        // Inputs digitados
        card.querySelectorAll('[data-svc-input]').forEach(inp => {
          inp.addEventListener('input', (e) => {
            const field = inp.dataset.svcInput;
            const max = field === 'hours' ? 24 : 20;
            const val = Math.max(0, Math.min(max, parseInt(inp.value, 10) || 0));
            state.services[key][field] = val;
            window.SIM.save(state);
            renderBudget();
            // Atualiza só o subtotal sem re-render completo
            const totalEl = card.querySelector('.svc-head-total');
            if (totalEl) {
              const sub = serviceSubtotal(key);
              totalEl.textContent = window.SIM.formatBRL(sub);
              totalEl.classList.toggle('has-value', sub > 0);
            }
          });
        });

        // Radios genéricos (controle, tipo)
        card.querySelectorAll('[data-svc-control]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.services[key].controle = btn.dataset.svcControl;
            window.SIM.save(state);
            renderServices();
            renderBudget();
          });
        });
        card.querySelectorAll('[data-svc-type]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.services[key].tipo = btn.dataset.svcType;
            window.SIM.save(state);
            renderServices();
            renderBudget();
          });
        });

        // Pacotes (fotógrafo, storymaker)
        card.querySelectorAll('[data-svc-package]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.services[key].pacote = btn.dataset.svcPackage;
            window.SIM.save(state);
            renderServices();
            renderBudget();
          });
        });
      });
    };

    // ===== ETAPA 6 — CALENDÁRIO =====
    const calMonthLabel = document.getElementById('calMonthLabel');
    const calGrid = document.getElementById('calGrid');
    const calPrev = document.getElementById('calPrev');
    const calNext = document.getElementById('calNext');
    const calSelected = document.getElementById('calSelected');

    const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const WEEK_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

    let calView = (() => {
      const now = new Date();
      if (state.date) {
        const [y, m] = state.date.split('-').map(Number);
        return { year: y, month: m - 1 };
      }
      return { year: now.getFullYear(), month: now.getMonth() };
    })();

    const todayStr = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const todayMidnight = () => {
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      return t;
    };

    const formatDatePT = (iso) => {
      if (!iso) return '';
      const [y, m, d] = iso.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return `${WEEK_PT[dt.getDay()]}, ${d} de ${MONTHS_PT[m - 1]} de ${y}`;
    };

    const renderCalendar = () => {
      if (!calGrid) return;
      const { year, month } = calView;
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startWeekday = firstDay.getDay();
      const today = todayMidnight();

      if (calMonthLabel) calMonthLabel.textContent = `${MONTHS_PT[month]} ${year}`;

      // Botão de mês anterior — não deixa ir antes do mês atual
      if (calPrev) {
        const minMonth = today.getFullYear() * 12 + today.getMonth();
        const currMonth = year * 12 + month;
        calPrev.disabled = currMonth <= minMonth;
      }

      // Cabeçalho com dias da semana + slots vazios + dias do mês
      let html = WEEK_PT.map(d => `<div class="cal-day-name">${d}</div>`).join('');
      for (let i = 0; i < startWeekday; i++) html += `<div class="cal-day empty"></div>`;
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(year, month, d);
        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isPast = dt < today;
        const isToday = iso === todayStr();
        const isSelected = state.date === iso;
        const cls = ['cal-day'];
        if (isPast) cls.push('disabled');
        else cls.push('selectable');
        if (isToday) cls.push('today');
        if (isSelected) cls.push('selected');
        html += `<button type="button" class="${cls.join(' ')}" ${isPast ? 'disabled' : ''} data-cal-date="${iso}">${d}</button>`;
      }
      calGrid.innerHTML = html;

      // Listeners
      calGrid.querySelectorAll('.cal-day.selectable').forEach(btn => {
        btn.addEventListener('click', () => {
          state.date = btn.dataset.calDate;
          window.SIM.save(state);
          renderCalendar();
          renderSelectedDate();
        });
      });
    };

    const renderSelectedDate = () => {
      if (!calSelected) return;
      if (!state.date) {
        calSelected.style.display = 'none';
        return;
      }
      calSelected.style.display = '';
      calSelected.innerHTML = `
        <div class="cal-selected-date-label">Data escolhida</div>
        <div class="cal-selected-date-value">${formatDatePT(state.date)}</div>
      `;
    };

    calPrev?.addEventListener('click', () => {
      calView.month--;
      if (calView.month < 0) { calView.month = 11; calView.year--; }
      renderCalendar();
    });
    calNext?.addEventListener('click', () => {
      calView.month++;
      if (calView.month > 11) { calView.month = 0; calView.year++; }
      renderCalendar();
    });

    // ===== ETAPA 7 — DADOS DO CLIENTE =====
    const inpName = document.getElementById('inpName');
    const inpWhatsapp = document.getElementById('inpWhatsapp');

    const formatWhatsapp = (val) => {
      const digits = val.replace(/\D/g, '').slice(0, 11);
      if (digits.length === 0) return '';
      if (digits.length <= 2) return `(${digits}`;
      if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    };

    if (inpName) {
      inpName.value = state.customer?.name || '';
      inpName.addEventListener('input', (e) => {
        state.customer.name = e.target.value;
        window.SIM.save(state);
        e.target.closest('.sim-input-group')?.classList.remove('has-error');
      });
    }
    if (inpWhatsapp) {
      inpWhatsapp.value = formatWhatsapp(state.customer?.whatsapp || '');
      inpWhatsapp.addEventListener('input', (e) => {
        const formatted = formatWhatsapp(e.target.value);
        e.target.value = formatted;
        state.customer.whatsapp = formatted.replace(/\D/g, '');
        window.SIM.save(state);
        e.target.closest('.sim-input-group')?.classList.remove('has-error');
      });
    }

    // ===== ETAPA 8 — RESUMO E ENVIO =====
    const summaryRoot = document.getElementById('summaryRoot');
    const summarySuccess = document.getElementById('summarySuccess');

    const buildSummary = () => {
      const SD = window.SERVICES_DATA;
      const DD = window.DECORATION_DATA;
      const PK = window.SIM_PRICING.packages[state.package];
      const { items, total } = window.SIM.calculate(state);

      const sections = [];

      // Pacote e convidados
      if (PK) {
        sections.push({
          title: 'Pacote e convidados',
          rows: [
            { label: 'Pacote', sub: `Até ${PK.capacity} pessoas`, value: window.SIM.formatBRL(PK.price), strongLabel: PK.name },
            { label: 'Convidados estimados', value: `${state.guests || 0} pessoa${state.guests !== 1 ? 's' : ''}` }
          ]
        });
      }

      // Gás (se aplicável)
      if (state.gas !== null && PK && !PK.includesGas) {
        sections.push({
          title: 'Gás',
          rows: [
            { label: state.gas ? 'Sim, vou usar gás' : 'Sem uso de gás', value: state.gas ? window.SIM.formatBRL(window.SIM_PRICING.gas) : 'Sem custo' }
          ]
        });
      }

      // Decoração
      if (state.decoration?.enabled === true) {
        const combo = DD.combos.find(c => c.id === state.decoration.combo);
        const rows = [];
        if (combo) {
          rows.push({
            strongLabel: combo.name,
            label: combo.type === 'pegue-monte' ? 'Pegue e Monte' : 'Decoração Completa',
            value: window.SIM.formatBRL(combo.price)
          });
        }
        (state.decoration.addons || []).forEach(id => {
          const a = DD.addons.find(x => x.id === id);
          if (a) rows.push({ label: a.name, sub: 'Adicional', value: window.SIM.formatBRL(a.price) });
        });
        if (rows.length) sections.push({ title: 'Decoração', rows });
      }

      // Serviços
      const svcRows = [];
      const svc = state.services || {};

      if (svc.animadora?.enabled && svc.animadora.items?.length) {
        svc.animadora.items.forEach(id => {
          const it = SD.animadora.items.find(i => i.id === id);
          if (it) svcRows.push({ strongLabel: 'Animadora', label: it.name, value: window.SIM.formatBRL(it.price) });
        });
      }
      if (svc.recepcionista?.enabled && svc.recepcionista.hours > 0) {
        const cost = svc.recepcionista.hours * SD.recepcionista.hourlyRate;
        svcRows.push({ strongLabel: 'Recepcionista', label: `${svc.recepcionista.hours} hora${svc.recepcionista.hours > 1 ? 's' : ''}`, value: window.SIM.formatBRL(cost) });
      }
      if (svc.fritadeira?.enabled && svc.fritadeira.hours > 0) {
        const cost = svc.fritadeira.hours * SD.fritadeira.hourlyRate;
        svcRows.push({ strongLabel: 'Fritadeira', label: `${svc.fritadeira.hours} hora${svc.fritadeira.hours > 1 ? 's' : ''}`, value: window.SIM.formatBRL(cost) });
      }
      if (svc.seguranca?.enabled && svc.seguranca.qtd > 0 && svc.seguranca.hours > 0) {
        const base = svc.seguranca.qtd * svc.seguranca.hours * SD.seguranca.hourlyRate;
        const ctrl = SD.seguranca.controlOptions.find(c => c.id === svc.seguranca.controle);
        svcRows.push({ strongLabel: 'Segurança', label: `${svc.seguranca.qtd} pessoa${svc.seguranca.qtd > 1 ? 's' : ''} × ${svc.seguranca.hours}h`, value: window.SIM.formatBRL(base) });
        if (ctrl && ctrl.price > 0) svcRows.push({ label: `Controle: ${ctrl.name}`, value: window.SIM.formatBRL(ctrl.price), sub: 'Adicional segurança' });
      }
      if (svc.garcom?.enabled && svc.garcom.qtd > 0 && svc.garcom.hours > 0) {
        const cost = svc.garcom.qtd * svc.garcom.hours * SD.garcom.hourlyRate;
        svcRows.push({ strongLabel: 'Garçom', label: `${svc.garcom.qtd} pessoa${svc.garcom.qtd > 1 ? 's' : ''} × ${svc.garcom.hours}h`, value: window.SIM.formatBRL(cost) });
      }
      if (svc.dj?.enabled && svc.dj.tipo && svc.dj.hours > 0) {
        const t = SD.dj.types.find(x => x.id === svc.dj.tipo);
        if (t) {
          const cost = (SD.dj.hourlyRate + t.extraPerHour) * svc.dj.hours;
          svcRows.push({ strongLabel: 'DJ', label: `${t.name} · ${svc.dj.hours}h`, value: window.SIM.formatBRL(cost) });
        }
      }
      if (svc.fotografo?.enabled && svc.fotografo.pacote) {
        const p = SD.fotografo.packages.find(x => x.id === svc.fotografo.pacote);
        if (p) svcRows.push({ strongLabel: 'Fotógrafo', label: p.name, value: window.SIM.formatBRL(p.price) });
      }
      if (svc.storymaker?.enabled && svc.storymaker.pacote) {
        const p = SD.storymaker.packages.find(x => x.id === svc.storymaker.pacote);
        if (p) svcRows.push({ strongLabel: 'Story Maker', label: p.name, value: window.SIM.formatBRL(p.price) });
      }
      if (svcRows.length) sections.push({ title: 'Serviços adicionais', rows: svcRows });

      // Data
      if (state.date) {
        sections.push({
          title: 'Data do evento',
          rows: [{ label: formatDatePT(state.date), value: '' }]
        });
      }

      // Cliente
      if (state.customer?.name || state.customer?.whatsapp) {
        sections.push({
          title: 'Seus dados',
          rows: [
            { label: 'Nome', value: state.customer?.name || '—', strongLabel: state.customer?.name },
            { label: 'WhatsApp', value: formatWhatsapp(state.customer?.whatsapp || '') }
          ]
        });
      }

      return { sections, total };
    };

    const renderSummary = () => {
      if (!summaryRoot) return;
      if (summarySuccess) summarySuccess.classList.remove('show');

      const { sections, total } = buildSummary();

      summaryRoot.innerHTML = `
        <div class="summary-header">
          <div class="summary-header-label">Valor total estimado</div>
          <div class="summary-total">${window.SIM.formatBRL(total)}</div>
        </div>
        <div class="summary-body">
          ${sections.map(sec => `
            <div class="summary-section">
              <h4>${sec.title}</h4>
              ${sec.rows.map(r => `
                <div class="summary-row">
                  <div class="summary-row-label">
                    ${r.strongLabel ? `<strong>${r.strongLabel}</strong>` : ''}
                    ${r.label}
                    ${r.sub ? `<div class="sub">${r.sub}</div>` : ''}
                  </div>
                  ${r.value ? `<div class="summary-row-value">${r.value}</div>` : ''}
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
        <div class="summary-cta">
          <p class="summary-cta-text">Tudo certo? Clique abaixo para enviar seu orçamento <strong>direto para o WhatsApp</strong>. Você não perde nenhuma escolha.</p>
          <button type="button" id="btnSendWhatsapp" class="btn btn-whatsapp btn-lg">
            <i data-lucide="send"></i>Enviar para WhatsApp
          </button>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
      document.getElementById('btnSendWhatsapp')?.addEventListener('click', sendToWhatsapp);
    };

    // ===== GERADOR DA MENSAGEM E ENVIO =====
    const buildWhatsappMessage = () => {
      const SD = window.SERVICES_DATA;
      const DD = window.DECORATION_DATA;
      const PK = window.SIM_PRICING.packages[state.package];
      const { total } = window.SIM.calculate(state);

      const lines = [];
      lines.push('*🎉 NOVO PEDIDO — CASA DE BIA*');
      lines.push('');

      if (state.customer?.name) lines.push(`👤 *Cliente:* ${state.customer.name}`);
      if (state.customer?.whatsapp) lines.push(`📱 *WhatsApp:* ${formatWhatsapp(state.customer.whatsapp)}`);
      if (state.date) lines.push(`📅 *Data do evento:* ${formatDatePT(state.date)}`);
      lines.push('');

      // PACOTE
      if (PK) {
        lines.push(`🎯 *PACOTE:* ${PK.name} — ${window.SIM.formatBRL(PK.price)}`);
        lines.push(`   • Capacidade: até ${PK.capacity} pessoas`);
        lines.push(`   • Convidados estimados: ${state.guests || 0}`);
        if (state.guests > PK.capacity && PK.extraPerGuest > 0) {
          const extra = state.guests - PK.capacity;
          lines.push(`   • Excedente: +${extra} pessoa${extra > 1 ? 's' : ''} × ${window.SIM.formatBRL(PK.extraPerGuest)} = ${window.SIM.formatBRL(extra * PK.extraPerGuest)}`);
        }
        if (PK.includesGas) lines.push(`   • Gás incluso ✓`);
        if (PK.includesDecoration) lines.push(`   • Decoração inclusa ✓`);
        if (PK.includesPhotographer) lines.push(`   • Equipe de fotografia e filmagem (básico) inclusa ✓`);
      }
      lines.push('');

      // GÁS
      if (PK && !PK.includesGas && state.gas !== null) {
        lines.push(`🔥 *GÁS:* ${state.gas ? `Sim (+${window.SIM.formatBRL(window.SIM_PRICING.gas)})` : 'Não'}`);
        lines.push('');
      }

      // DECORAÇÃO
      if (state.decoration?.enabled === true) {
        const combo = DD.combos.find(c => c.id === state.decoration.combo);
        if (combo) {
          lines.push(`🎨 *DECORAÇÃO:* ${combo.name} — ${window.SIM.formatBRL(combo.price)}`);
          lines.push(`   • Tipo: ${combo.type === 'pegue-monte' ? 'Pegue e Monte' : 'Decoração Completa'}`);
          if ((state.decoration.addons || []).length) {
            lines.push('   • Adicionais:');
            state.decoration.addons.forEach(id => {
              const a = DD.addons.find(x => x.id === id);
              if (a) lines.push(`      ◦ ${a.name} (+${window.SIM.formatBRL(a.price)})`);
            });
          }
          lines.push('');
        }
      } else if (state.decoration?.enabled === false) {
        lines.push(`🎨 *DECORAÇÃO:* Sem decoração`);
        lines.push('');
      }

      // SERVIÇOS
      const svc = state.services || {};
      const svcLines = [];

      if (svc.animadora?.enabled && svc.animadora.items?.length) {
        const items = svc.animadora.items.map(id => SD.animadora.items.find(i => i.id === id)).filter(Boolean);
        const totalSvc = items.reduce((s, i) => s + i.price, 0);
        svcLines.push(`   • *Animadora:* ${items.map(i => i.name).join(', ')} — ${window.SIM.formatBRL(totalSvc)}`);
      }
      if (svc.recepcionista?.enabled && svc.recepcionista.hours > 0) {
        svcLines.push(`   • *Recepcionista:* ${svc.recepcionista.hours}h — ${window.SIM.formatBRL(svc.recepcionista.hours * SD.recepcionista.hourlyRate)}`);
      }
      if (svc.fritadeira?.enabled && svc.fritadeira.hours > 0) {
        svcLines.push(`   • *Fritadeira:* ${svc.fritadeira.hours}h — ${window.SIM.formatBRL(svc.fritadeira.hours * SD.fritadeira.hourlyRate)}`);
      }
      if (svc.seguranca?.enabled && svc.seguranca.qtd > 0 && svc.seguranca.hours > 0) {
        const base = svc.seguranca.qtd * svc.seguranca.hours * SD.seguranca.hourlyRate;
        const ctrl = SD.seguranca.controlOptions.find(c => c.id === svc.seguranca.controle);
        const totalSeg = base + (ctrl?.price || 0);
        const ctrlText = ctrl && ctrl.id !== 'nenhum' ? ` (controle: ${ctrl.name})` : '';
        svcLines.push(`   • *Segurança:* ${svc.seguranca.qtd}× ${svc.seguranca.hours}h${ctrlText} — ${window.SIM.formatBRL(totalSeg)}`);
      }
      if (svc.garcom?.enabled && svc.garcom.qtd > 0 && svc.garcom.hours > 0) {
        const cost = svc.garcom.qtd * svc.garcom.hours * SD.garcom.hourlyRate;
        svcLines.push(`   • *Garçom:* ${svc.garcom.qtd}× ${svc.garcom.hours}h — ${window.SIM.formatBRL(cost)}`);
      }
      if (svc.dj?.enabled && svc.dj.tipo && svc.dj.hours > 0) {
        const t = SD.dj.types.find(x => x.id === svc.dj.tipo);
        const cost = (SD.dj.hourlyRate + (t?.extraPerHour || 0)) * svc.dj.hours;
        svcLines.push(`   • *DJ:* ${t?.name || ''} · ${svc.dj.hours}h — ${window.SIM.formatBRL(cost)}`);
      }
      if (svc.fotografo?.enabled && svc.fotografo.pacote) {
        const p = SD.fotografo.packages.find(x => x.id === svc.fotografo.pacote);
        if (p) svcLines.push(`   • *Fotógrafo:* ${p.name} — ${window.SIM.formatBRL(p.price)}`);
      }
      if (svc.storymaker?.enabled && svc.storymaker.pacote) {
        const p = SD.storymaker.packages.find(x => x.id === svc.storymaker.pacote);
        if (p) svcLines.push(`   • *Story Maker:* ${p.name} — ${window.SIM.formatBRL(p.price)}`);
      }

      if (svcLines.length) {
        lines.push('🛠️ *SERVIÇOS ADICIONAIS:*');
        lines.push(...svcLines);
        lines.push('');
      }

      // TOTAL
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      lines.push(`💰 *VALOR TOTAL ESTIMADO:* ${window.SIM.formatBRL(total)}`);
      lines.push('━━━━━━━━━━━━━━━━━━━━');
      lines.push('');
      lines.push('Aguardo retorno para confirmar! 🙏');

      return lines.join('\n');
    };

    const sendToWhatsapp = () => {
      // Validação
      if (!state.customer?.name || state.customer.name.trim().length < 3) {
        showValidationError('Volte para a Etapa 7 e informe seu nome.');
        return;
      }
      const digits = (state.customer?.whatsapp || '').replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 11) {
        showValidationError('Volte para a Etapa 7 e informe um WhatsApp válido.');
        return;
      }
      if (!state.date) {
        showValidationError('Volte para a Etapa 6 e escolha a data do evento.');
        return;
      }

      const msg = buildWhatsappMessage();
      const url = window.waLink(msg);
      const { total } = window.SIM.calculate(state);

      // Salva pedido no histórico (Admin)
      if (window.DataStore?.saveOrder) {
        window.DataStore.saveOrder({
          customerName: state.customer.name,
          customerWhatsapp: state.customer.whatsapp,
          eventDate: state.date,
          packageId: state.package,
          guests: state.guests,
          total: total,
          message: msg,
          state: JSON.parse(JSON.stringify(state))
        });
      }

      if (summarySuccess) {
        summarySuccess.classList.add('show');
        if (summaryRoot) summaryRoot.style.display = 'none';
      }

      window.open(url, '_blank', 'noopener');
    };

    // ===== NAVEGAÇÃO =====
    btnPrev?.addEventListener('click', () => showStep(state.currentStep - 1));
    btnNext?.addEventListener('click', () => {
      // Última etapa: dispara envio direto
      if (state.currentStep === state.totalSteps) {
        sendToWhatsapp();
        return;
      }
      // Validação extra para Etapa 7 (formulário)
      if (state.currentStep === 7) {
        if (!validateStep7Inputs()) {
          showValidationError('Preencha seu nome (mín. 3 letras) e um WhatsApp válido.');
          return;
        }
      }
      if (!canAdvance()) {
        const msgs = {
          1: 'Selecione um pacote para continuar.',
          2: 'Informe o número de convidados.',
          3: 'Escolha se deseja usar gás.',
          4: state.decoration?.enabled === true
              ? 'Escolha o tipo e um combo de decoração.'
              : 'Indique se deseja decoração.',
          6: 'Selecione a data do evento.',
          7: 'Preencha seu nome (mín. 3 letras) e um WhatsApp válido.'
        };
        showValidationError(msgs[state.currentStep] || 'Complete a etapa para avançar.');
        return;
      }
      showStep(state.currentStep + 1);
    });

    // ===== MOBILE: TOGGLE BUDGET =====
    if (budgetHeader && budgetPanel) {
      budgetHeader.addEventListener('click', () => {
        if (window.innerWidth < 1024) {
          budgetPanel.classList.toggle('open');
        }
      });
    }

    // ===== BOTÃO RESETAR =====
    const btnReset = document.getElementById('btnReset');
    btnReset?.addEventListener('click', () => {
      if (confirm('Limpar todas as escolhas e recomeçar?')) {
        state = window.SIM.reset();
        renderAll();
      }
    });

    // ===== RENDER INICIAL =====
    const renderAll = () => {
      ensureServices();
      renderPackages();
      updateGuestUI();
      renderGas();
      renderDecorationYesNo();
      renderDecorationTypes();
      renderDecorationVisibility();
      if (state.decoration?.type) renderDecorationCombos();
      renderDecorationAddons();
      renderDecorationSummary();
      renderServices();
      renderCalendar();
      renderSelectedDate();
      renderSummary();
      renderBudget(false);
      showStep(state.currentStep);
    };

    renderAll();
  });
})();
