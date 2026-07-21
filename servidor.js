const express = require('express');
const cors = require('cors');
const client = require('./database');

const app = express();
app.use(cors());

app.use(require('./rotas/personagem'));

app.use(require('./rotas/mapa'));

app.use(require('./rotas/combate'));

app.use(require('./rotas/acampamento'));

app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});