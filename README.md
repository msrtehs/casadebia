# 🎉 Casa de Bia — Site de Eventos

Site moderno com simulador completo de eventos, painel admin e integração WhatsApp.
Hospedado no GitHub Pages, sem custo de servidor.

## ✨ Funcionalidades

- **Site público** com Home animada, galeria de fotos, mapa de localização e descrição de serviços
- **Simulador de evento em 8 etapas** com cálculo em tempo real e envio automático para WhatsApp
- **Painel Admin** completo: pacotes, decoração, serviços, configurações e histórico de pedidos
- **Firebase opcional** para sincronização em nuvem (funciona sem)

## 🚀 Como publicar no GitHub Pages

### Passo 1 — Criar conta no GitHub
1. Acesse [github.com](https://github.com) e crie uma conta gratuita
2. Confirme seu email

### Passo 2 — Criar o repositório
1. Clique em **New repository** (botão verde no canto superior direito)
2. Nome do repositório: `casa-de-bia` (ou outro de sua preferência)
3. Marque como **Public**
4. Clique em **Create repository**

### Passo 3 — Enviar os arquivos do site
**Opção A — Pelo navegador (mais fácil):**
1. Na página do repositório recém-criado, clique em **uploading an existing file**
2. Arraste **todos** os arquivos da pasta `CasaDeBia` para o navegador
3. Aguarde o upload terminar
4. Em "Commit changes", escreva "Site inicial" e clique em **Commit changes**

**Opção B — Por linha de comando:**
```bash
cd CasaDeBia
git init
git add .
git commit -m "Site inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/casa-de-bia.git
git push -u origin main
```

### Passo 4 — Ativar o GitHub Pages
1. No repositório, vá em **Settings** (ícone de engrenagem)
2. Menu lateral: **Pages**
3. Em "Source", selecione **Deploy from a branch**
4. Branch: **main** · Pasta: **/ (root)** · clique em **Save**
5. Aguarde 1–2 minutos. O site ficará online em:
   `https://SEU_USUARIO.github.io/casa-de-bia/`

### Passo 5 — Pronto!
- ✅ Site no ar
- ✅ Acessível de qualquer lugar
- ✅ HTTPS automático
- ✅ Grátis para sempre

## 🔥 Ativar Firebase (opcional, recomendado)

Sem Firebase: o admin funciona, mas alterações ficam apenas no navegador da pessoa que editou.

Com Firebase: mudanças no admin aparecem para todos os visitantes em tempo real.

👉 **Veja o passo a passo completo em [FIREBASE_SETUP.md](FIREBASE_SETUP.md)**

## 🔐 Acesso ao painel admin

- **URL**: `seusite/admin-login.html`
- **Senha padrão**: `casadebia123` (altere em Configurações imediatamente)
- Atalho: link "Admin" discreto no rodapé de qualquer página

## 📞 Configurar WhatsApp

O número está configurado em **Painel Admin → Configurações → Número do WhatsApp**.
Padrão atual: `+55 71 99965-2027`

## 📁 Estrutura do projeto

```
CasaDeBia/
├── index.html              ← Home
├── fotos.html              ← Galeria
├── localizacao.html        ← Mapa + endereço
├── servicos.html           ← Descrição de serviços
├── simulador.html          ← Simulador de eventos
├── admin-login.html        ← Login do admin
├── admin.html              ← Painel admin
├── 404.html                ← Página de erro
├── .nojekyll               ← Permite arquivos com underline
├── README.md               ← Este arquivo
├── FIREBASE_SETUP.md       ← Guia Firebase
└── assets/
    ├── css/
    │   ├── main.css        ← Entrada CSS
    │   ├── variables.css   ← Design tokens
    │   ├── base.css        ← Reset
    │   ├── components.css  ← Navbar/footer/botões
    │   ├── home.css        ← Home
    │   ├── inner.css       ← Páginas internas
    │   ├── simulator.css   ← Simulador
    │   └── admin.css       ← Admin
    └── js/
        ├── config.js              ← Configurações globais
        ├── firebase-config.js     ← Credenciais Firebase
        ├── data-store.js          ← Camada de dados
        ├── firebase-store.js      ← Adapter Firebase (opcional)
        ├── layout.js              ← Navbar/footer/WhatsApp
        ├── home.js                ← Carrossel + reveal
        ├── gallery.js             ← Filtro + lightbox
        ├── simulator-state.js     ← Estado do simulador
        ├── simulator.js           ← Controlador do simulador
        └── admin.js               ← Controlador do admin
```

## 🎨 Identidade visual

```
Rose principal:   #C8445A
Rose claro:       #F5E8EB
Dourado:          #D4A942
Dourado claro:    #FAF3E0
Texto:            #3D2B1F
Fundo:            #FDF9F7
Escuro (hero):    #1C1410
```

Tipografia: **Playfair Display** (display) + **Inter** (corpo)

## 📝 Atualizar fotos reais

Quando suas fotos estiverem prontas, há 2 caminhos:

**1. Upload via GitHub:**
- Crie a pasta `assets/images/` no repositório
- Envie as fotos para lá
- Substitua as URLs Unsplash em `index.html` (slides do hero) e `fotos.html` (galeria) pelas URLs locais
- Ex: `src="assets/images/aniversario1.jpg"`

**2. Pelo painel admin (apenas decoração):**
- Os combos de decoração aceitam URL de imagem editável no admin
- Você pode usar qualquer hospedagem de imagens (imgur, cloudinary, etc.)

## 🆘 Suporte

Em caso de dúvida ou problema:
1. Verifique este README
2. Veja o FIREBASE_SETUP.md se for sobre Firebase
3. Abra uma issue no repositório do GitHub

---

Feito com 💗 para a Casa de Bia · Salvador, BA
