# 🔥 Guia de configuração do Firebase

Este guia explica como ativar a sincronização em nuvem do site Casa de Bia.

## ❓ Por que usar Firebase?

**Sem Firebase** (estado atual):
- Admin funciona, mas alterações ficam apenas no navegador da pessoa que editou
- Visitantes do site público sempre veem os preços padrão
- Histórico de pedidos fica só no computador da Bia

**Com Firebase**:
- ✅ Edições no admin aparecem para **todos os visitantes** em tempo real
- ✅ Bia pode acessar o admin de **qualquer dispositivo** (celular, tablet, outro PC)
- ✅ Histórico de pedidos sincronizado entre todos os dispositivos
- ✅ Login real e seguro com email + senha
- ✅ **100% gratuito** (plano Spark do Firebase comporta milhares de pedidos/mês)

## 📋 Pré-requisitos

- Uma conta Google (Gmail)
- 10 minutos do seu tempo

## 🚀 Passo a passo

### 1️⃣ Criar o projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Faça login com sua conta Google
3. Clique em **Adicionar projeto** (ou "Add project")
4. Nome do projeto: **Casa de Bia** (ou outro)
5. Continue → desative o Google Analytics (opcional, não precisamos) → **Criar projeto**
6. Aguarde alguns segundos e clique em **Continuar**

### 2️⃣ Adicionar app Web ao projeto

1. Na tela inicial do projeto, clique no ícone **Web** (`</>`)
2. Apelido do app: **Site Casa de Bia**
3. **NÃO marque** "Configurar Firebase Hosting"
4. Clique em **Registrar app**
5. **IMPORTANTE**: na próxima tela aparece um bloco de código com o `firebaseConfig`. **Copie esse objeto inteiro** — ele tem este formato:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "casa-de-bia.firebaseapp.com",
  projectId: "casa-de-bia",
  storageBucket: "casa-de-bia.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
};
```

Clique em **Continuar para o console**.

### 3️⃣ Ativar o Firestore Database

1. No menu lateral esquerdo, clique em **Build → Firestore Database**
2. Clique em **Criar banco de dados**
3. Escolha **Iniciar no modo de produção** → próximo
4. Local: **southamerica-east1** (São Paulo, mais próximo) → **Ativar**
5. Aguarde alguns segundos.

### 4️⃣ Configurar regras de segurança do Firestore

1. Ainda em Firestore, clique na aba **Regras**
2. Substitua todo o conteúdo por:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Configuração: leitura pública (necessária para o site público mostrar preços)
    // Escrita só por usuários autenticados (admin)
    match /config/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // Pedidos: leitura/escrita só por admin autenticado
    match /orders/{doc} {
      allow read, write: if request.auth != null;
      // Permite o site público criar pedidos (sem login)
      allow create: if true;
    }
  }
}
```

3. Clique em **Publicar**

### 5️⃣ Ativar Authentication

1. No menu lateral, clique em **Build → Authentication**
2. Clique em **Vamos começar**
3. Aba **Sign-in method**: clique em **Email/Senha**
4. Ative a primeira opção (Email/senha) → **Salvar**

### 6️⃣ Criar o usuário admin

1. Na aba **Users**, clique em **Adicionar usuário**
2. Email: por exemplo `bia@casadebia.com` (qualquer email serve, **memorize**)
3. Senha: escolha uma senha forte (mínimo 6 caracteres)
4. **Adicionar usuário**

### 7️⃣ Colar a configuração no site

1. Abra o arquivo `assets/js/firebase-config.js` do projeto
2. Substitua o objeto `window.FIREBASE_CONFIG = { ... }` pelos valores do passo 2:

```js
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSy...",                                    // ← cole aqui
  authDomain: "casa-de-bia.firebaseapp.com",              // ← cole aqui
  projectId: "casa-de-bia",                               // ← cole aqui
  storageBucket: "casa-de-bia.appspot.com",               // ← cole aqui
  messagingSenderId: "123456789",                         // ← cole aqui
  appId: "1:123456789:web:abc..."                         // ← cole aqui
};
```

3. **Salve o arquivo**
4. Se já publicou no GitHub: faça commit dessa alteração e o GitHub Pages atualiza sozinho

### 8️⃣ Testar

1. Abra o site
2. Acesse **admin-login.html**
3. Agora aparece o campo **Email** (porque detectou que o Firebase está ativo)
4. Faça login com email + senha que você criou no passo 6
5. Faça uma alteração qualquer (mude um preço, adicione um combo)
6. Abra o site em outro dispositivo ou aba anônima → veja a alteração refletida
7. ✅ Pronto!

## 💰 Custos

O **plano gratuito (Spark)** do Firebase comporta:
- 50.000 leituras/dia
- 20.000 escritas/dia
- 1 GB de armazenamento

Para uma Casa de Bia com até **centenas de visitantes/dia**, isso é mais que suficiente. Você nunca vai pagar nada.

## ⚠️ Segurança importante

### O `firebaseConfig` NÃO é segredo
Pode ficar no código público do GitHub. Ele só identifica o projeto. **A segurança vem das regras do Firestore (passo 4) e do Authentication.**

### Senha forte
Use uma senha forte para o admin. **Não compartilhe**.

### Backup
Periodicamente, exporte o histórico de pedidos do Firestore como segurança extra:
- Firestore Console → menu de 3 pontos → **Exportar dados**

## 🔄 Voltar para localStorage (desativar Firebase)

Se algo der errado, basta restaurar o `firebase-config.js` original:

```js
window.FIREBASE_CONFIG = {
  apiKey: "PLACEHOLDER",
  authDomain: "PLACEHOLDER",
  projectId: "PLACEHOLDER",
  storageBucket: "PLACEHOLDER",
  messagingSenderId: "PLACEHOLDER",
  appId: "PLACEHOLDER"
};
```

O site volta a funcionar com localStorage local.

## 🆘 Problemas comuns

**"Permission denied" ao salvar no admin:**
- Verifique se as regras do Firestore (passo 4) foram publicadas
- Confirme que está logada (não deslogou por inatividade)

**"Email não encontrado" no login:**
- Confirme que criou o usuário em Authentication → Users
- Use exatamente o mesmo email (sem typo)

**Site público continua mostrando preços antigos:**
- Limpe o cache do navegador (Ctrl+Shift+R)
- Abra em aba anônima para confirmar

---

Em caso de dúvida, abra uma issue no repositório do GitHub.
