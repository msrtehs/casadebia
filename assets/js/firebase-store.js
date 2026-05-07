/* ============================================
   CASA DE BIA — Firebase Adapter
   ============================================
   Substitui o backend localStorage do DataStore por Firestore + Auth
   quando window.FIREBASE_ENABLED for true. Mantém a mesma API síncrona
   do DataStore usando cache local + write-through para o Firestore.
   ============================================ */
(function () {
  if (!window.FIREBASE_ENABLED) return;

  // Carrega Firebase compat SDK via CDN (sem build step)
  const loadScript = (src) => new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });

  const FB_VERSION = '10.13.2';
  const ready = (async () => {
    await loadScript(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-app-compat.js`);
    await loadScript(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-auth-compat.js`);
    await loadScript(`https://www.gstatic.com/firebasejs/${FB_VERSION}/firebase-firestore-compat.js`);

    if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
    const db = firebase.firestore();
    const auth = firebase.auth();
    return { db, auth };
  })();

  // ===== Override do DataStore quando Firebase está disponível =====
  const original = window.DataStore;
  if (!original) return;

  const CONFIG_DOC = 'config/main';
  const ORDERS_COL = 'orders';

  // Cache local — mantém API síncrona do código existente
  let cache = original.loadData();

  // Carrega config do Firestore na inicialização
  ready.then(async ({ db }) => {
    try {
      const doc = await db.doc(CONFIG_DOC).get();
      if (doc.exists) {
        const remote = doc.data();
        cache = Object.assign({}, original.DEFAULTS, remote, {
          config: Object.assign({}, original.DEFAULTS.config, remote.config || {}),
          auth: cache.auth // senha local não vem do Firebase (autenticação real é Firebase Auth)
        });
        original.saveData(cache);   // salva cache local
        original.applyToSimulator(cache);
        document.dispatchEvent(new CustomEvent('firebase:data-ready'));
      } else {
        // Primeira vez — popula Firestore com defaults
        const seed = JSON.parse(JSON.stringify(original.DEFAULTS));
        delete seed.auth; // senha não vai pro Firestore
        await db.doc(CONFIG_DOC).set(seed);
      }
    } catch (e) {
      console.warn('[Firebase] Falha ao carregar config — usando cache local:', e);
    }
  }).catch(e => console.warn('[Firebase] Falha ao inicializar:', e));

  // Override saveData: salva no cache + envia ao Firestore
  const originalSave = original.saveData.bind(original);
  original.saveData = (data) => {
    const ok = originalSave(data);
    cache = data;
    ready.then(({ db }) => {
      const toSave = JSON.parse(JSON.stringify(data));
      delete toSave.auth;
      db.doc(CONFIG_DOC).set(toSave, { merge: true })
        .catch(e => console.warn('[Firebase] Falha ao salvar:', e));
    });
    return ok;
  };

  // Override saveOrder: salva localmente + envia ao Firestore
  const originalSaveOrder = original.saveOrder.bind(original);
  original.saveOrder = (order) => {
    const saved = originalSaveOrder(order);
    if (saved) {
      ready.then(({ db }) => {
        db.collection(ORDERS_COL).doc(saved.id).set(saved)
          .catch(e => console.warn('[Firebase] Falha ao salvar pedido:', e));
      });
    }
    return saved;
  };

  // Override loadOrders: tenta Firestore, fallback ao cache
  const originalLoadOrders = original.loadOrders.bind(original);
  original.loadOrders = () => {
    return originalLoadOrders();
  };
  // Sincroniza pedidos do Firestore em background
  ready.then(async ({ db }) => {
    try {
      const snap = await db.collection(ORDERS_COL).orderBy('createdAt', 'desc').limit(200).get();
      const remote = snap.docs.map(d => d.data());
      try { localStorage.setItem(original.ORDERS_KEY, JSON.stringify(remote)); } catch {}
      document.dispatchEvent(new CustomEvent('firebase:orders-ready'));
    } catch (e) {
      console.warn('[Firebase] Falha ao carregar pedidos:', e);
    }
  });

  // Override deleteOrder
  const originalDelete = original.deleteOrder.bind(original);
  original.deleteOrder = (id) => {
    const ok = originalDelete(id);
    ready.then(({ db }) => {
      db.collection(ORDERS_COL).doc(id).delete().catch(e => console.warn('[Firebase] Falha ao excluir:', e));
    });
    return ok;
  };

  // Override clearOrders
  const originalClear = original.clearOrders.bind(original);
  original.clearOrders = () => {
    originalClear();
    ready.then(async ({ db }) => {
      const snap = await db.collection(ORDERS_COL).get();
      const batch = db.batch();
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }).catch(e => console.warn('[Firebase] Falha ao limpar pedidos:', e));
  };

  // ===== AUTH com Firebase Auth =====
  // Override login: usa Firebase Auth com email/senha.
  // Padrão: a "senha" digitada vira "<senha>@casadebia.com" como email,
  // mas o usuário recomendado é criar manualmente no Firebase Console.
  const SESSION_KEY = 'casadebia_admin_session';

  original.isLoggedIn = () => {
    try { return sessionStorage.getItem(SESSION_KEY) === 'authenticated'; }
    catch { return false; }
  };

  // O admin agora pede email + senha
  original.loginWithEmail = async (email, password) => {
    const { auth } = await ready;
    try {
      await auth.signInWithEmailAndPassword(email, password);
      try { sessionStorage.setItem(SESSION_KEY, 'authenticated'); } catch {}
      return true;
    } catch (e) {
      console.warn('[Firebase Auth] Login falhou:', e.message);
      return false;
    }
  };

  // Mantém login() compatível: usa email padrão se quem chamou só passou senha
  original.login = (passwordOrEmail, password) => {
    if (password) {
      // chamou com (email, senha)
      return original.loginWithEmail(passwordOrEmail, password);
    }
    // chamou só com senha (compat antiga) — usa email padrão derivado
    const email = `admin@casadebia.com`;
    return original.loginWithEmail(email, passwordOrEmail);
  };

  original.logout = async () => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    try { const { auth } = await ready; await auth.signOut(); } catch {}
  };

  // Sinaliza que adapter está ativo
  window.DataStore.firebase = true;
})();
