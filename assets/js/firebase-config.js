/* ============================================
   CASA DE BIA — Firebase Config
   ============================================
   COMO ATIVAR O FIREBASE (passo a passo no FIREBASE_SETUP.md):
   1. Crie um projeto em https://console.firebase.google.com
   2. Ative Firestore Database e Authentication (Email/Senha)
   3. Em "Configurações do projeto" → Adicione um app web
   4. Copie o objeto firebaseConfig que aparece e cole abaixo
   5. Crie um usuário em Authentication → Users
   6. Pronto — o site sincroniza tudo automaticamente
   ============================================ */
window.FIREBASE_CONFIG = {
  // ⚠️ Mantenha "PLACEHOLDER" para usar localStorage local.
  // Substitua pelos valores reais para ativar sincronização em nuvem.
  apiKey: "PLACEHOLDER",
  authDomain: "PLACEHOLDER",
  projectId: "PLACEHOLDER",
  storageBucket: "PLACEHOLDER",
  messagingSenderId: "PLACEHOLDER",
  appId: "PLACEHOLDER"
};

// Detecta se o Firebase foi configurado (não está em placeholder)
window.FIREBASE_ENABLED = (() => {
  const c = window.FIREBASE_CONFIG;
  return c && c.apiKey && c.apiKey !== "PLACEHOLDER" && c.projectId && c.projectId !== "PLACEHOLDER";
})();
