# Instruções de Deploy

## Configuração de Roteamento (404 ao recarregar)

Para resolver o problema de 404 ao recarregar a página, é necessário configurar o servidor web para redirecionar todas as rotas para `index.html`.

### Apache (.htaccess)
O arquivo `.htaccess` já foi criado na raiz do projeto. Copie-o para a raiz do servidor web (mesmo nível do `index.html`).

### IIS (web.config)
O arquivo `web.config` já foi criado na raiz do projeto. Copie-o para a raiz do servidor web (mesmo nível do `index.html`).

### Nginx
Adicione a seguinte configuração no seu `nginx.conf`:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

### Servidor Node.js (Express)
Se estiver usando Express, adicione:

```javascript
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/front-fisio/browser/index.html'));
});
```

## Build de Produção

```bash
ng build --configuration production
```

Os arquivos serão gerados em `dist/front-fisio/browser/`.

**Importante:** Copie os arquivos `.htaccess` ou `web.config` para a pasta `dist/front-fisio/browser/` após o build.

