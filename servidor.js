require('dotenv').config({ override: true });
console.log('senha lida do env:', process.env.DB_PASSWORD);

const express = require('express');
const { Client } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());

const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'rpg2026',
    user: 'postgres',
    password: process.env.DB_PASSWORD
});

client.connect();

app.get('/posicoes', async (req, res) => {
    const resultado = await client.query('SELECT * FROM posicoes');
    res.json(resultado.rows);
});

app.get('/personagem', async (req, res) => {
    const resultado = await client.query(
        'SELECT personagem.nome, posicoes.id_posicao, posicoes.x, posicoes.y FROM personagem JOIN posicoes ON personagem.posicao_atual_id = posicoes.id_posicao WHERE personagem.id_personagem = 1'
    );
    res.json(resultado.rows[0]);
});

app.get('/mover/:direcao', async (req, res) => {
    const direcao = req.params.direcao;
    const passo = direcao === 'frente' ? 1 : -1;
    await client.query(
        'UPDATE personagem SET posicao_atual_id = posicao_atual_id + $1 WHERE id_personagem = 1',
        [passo]
    );
    res.json({ ok: true });
});

app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});