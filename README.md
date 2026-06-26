# 💰 FinanceApp — Web (Controle Financeiro)

Versão **web** do controle financeiro pessoal, feita em **React + Vite + Firebase**. Funciona em qualquer navegador (celular ou computador), pode ser instalada como app na tela inicial (**PWA**) e usa o **mesmo banco de dados** do app mobile — os dados são compartilhados.

Projeto Firebase: **controle-financeiro-rf** (já configurado em `src/firebaseConfig.js`).

---

## ✨ O que tem

- Login, cadastro, recuperação de senha e sessão que permanece salva no navegador
- **Painel** com saldo, receitas/despesas do mês, total economizado e gráfico dos últimos 6 meses
- **Receitas** e **Despesas** com categorias, forma de pagamento, busca e edição
- **Metas** com barra de progresso, % concluído, valor restante e prazo
- **Relatórios** com filtro por ano/mês e gráfico de pizza por categoria
- **Exportar CSV**, **tema claro/escuro** e layout responsivo (sidebar no PC, barra inferior no celular)
- Dados em **tempo real** (Firestore)

---

## 🚀 Rodar no seu computador

Pré-requisito: **Node.js 18+** instalado.

```bash
npm install      # instala as dependências (só na primeira vez)
npm run dev      # inicia o servidor de desenvolvimento
```

Abra o endereço que aparecer no terminal (geralmente `http://localhost:5173`).
Para acessar do celular na mesma rede Wi-Fi, use o endereço “Network” mostrado no terminal.

---

## 🌐 Publicar de graça no Firebase Hosting

Assim o app fica no ar 24h, com link próprio, sem depender do seu computador.

### 1. Instalar a ferramenta do Firebase (só uma vez)
```bash
npm install -g firebase-tools
```

### 2. Fazer login na sua conta Google
```bash
firebase login
```

### 3. Gerar a versão de produção
```bash
npm run build
```
Isso cria a pasta `dist/` com o site pronto.

### 4. Publicar
```bash
firebase deploy --only hosting
```

No final, o terminal mostra o link do tipo
`https://controle-financeiro-rf.web.app` — esse é o endereço do seu app. 🎉

> O projeto já vem com `firebase.json` e `.firebaserc` configurados, então o `deploy` não pede mais nada.

### Atualizar depois
Sempre que mudar algo, rode de novo:
```bash
npm run build && firebase deploy --only hosting
```

---

## 📲 Instalar como app no celular

Depois de publicado, abra o link no celular:
- **Android (Chrome):** menu ⋮ → "Adicionar à tela inicial"
- **iPhone (Safari):** botão compartilhar → "Adicionar à Tela de Início"

O app abre em tela cheia, com ícone próprio, parecendo um aplicativo nativo — e continua **de graça**.

---

## ⚙️ Pré-requisitos no Firebase (já feitos)

- **Authentication → E-mail/senha** ativado
- **Firestore Database** criado
- Regras do arquivo `firestore.rules` publicadas

> Na primeira vez que abrir o Painel/Relatórios, o Firestore pode pedir a criação de um **índice composto** (aparece um link no console do navegador, tecla F12 → aba Console). É só clicar no link, confirmar e aguardar ~1 minuto. São dois índices: `transactions` (userId + date) e `goals` (userId + deadline).

---

## 🛠️ Stack

React 18 · Vite 5 · React Router · Firebase Auth + Firestore · Recharts · Lucide Icons · PWA.

```
financeapp-web/
├── index.html
├── firebase.json          # configuração do Hosting
├── .firebaserc            # projeto: controle-financeiro-rf
├── firestore.rules        # regras de segurança
├── public/                # manifest, service worker, ícones
└── src/
    ├── firebaseConfig.js  # credenciais (já preenchidas)
    ├── contexts/          # Auth, Data, Theme, Toast
    ├── services/          # acesso ao Firebase
    ├── utils/             # formatação, categorias, CSV
    ├── components/        # Layout, modais, lista, etc.
    └── pages/             # Login, Dashboard, Receitas, Despesas, Metas, Relatórios, Perfil
```
