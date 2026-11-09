const express = require('express');
const cors = require('cors');
const client = require('./database');
const { perderMissaoDeBossSumido } = require('./missoes_logica');

const app = express();
app.use(cors());

app.use(require('./rotas/personagem'));

app.use(require('./rotas/mapa'));

app.use(require('./rotas/combate'));

app.use(require('./rotas/acampamento'));

app.use(require('./rotas/missoes'));

app.listen(3000, async () => {
    console.log('Servidor rodando em http://localhost:3000');
    await perderMissaoDeBossSumido();   // boss some ao reiniciar: perde a missão
});