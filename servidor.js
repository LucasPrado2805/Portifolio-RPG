require('dotenv').config({ override: true });

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

// as 6 direções de um hexágono pointy-top, em (dx, dy) axial
const DIRECOES = {
    leste:     { dx: 1,  dy: 0 },
    oeste:     { dx: -1, dy: 0 },
    sudeste:   { dx: 0,  dy: 1 },
    noroeste:  { dx: 0,  dy: -1 },
    nordeste:  { dx: 1,  dy: -1 },
    sudoeste:  { dx: -1, dy: 1 }
};

// devolve todas as casas do mapa
app.get('/posicoes', async (req, res) => {
    const resultado = await client.query('SELECT * FROM posicoes ORDER BY y, x');
    res.json(resultado.rows);
});

// devolve todas as cidades (nome + coordenada)
app.get('/cidades', async (req, res) => {
    const resultado = await client.query('SELECT id_cidade, nome, x, y FROM cidades');
    res.json(resultado.rows);
});

// devolve o herói (x,y direto, sem JOIN)
app.get('/personagem', async (req, res) => {
    const resultado = await client.query(
        'SELECT nome, x, y FROM personagem WHERE id_personagem = 1'
    );
    res.json(resultado.rows[0]);
});

// move o herói somando a direção escolhida no x,y dele
app.get('/mover/:direcao', async (req, res) => {
    const dir = DIRECOES[req.params.direcao];
    if (!dir) {
        return res.status(400).json({ erro: 'direcao invalida' });
    }
    await client.query(
        'UPDATE personagem SET x = x + $1, y = y + $2 WHERE id_personagem = 1',
        [dir.dx, dir.dy]
    );
    res.json({ ok: true });
});

// gera o mapa: cria largura x altura casas centradas em (0,0)
app.get('/gerar-mapa/:largura/:altura', async (req, res) => {
    const largura = parseInt(req.params.largura);
    const altura = parseInt(req.params.altura);
    const metadeX = Math.floor(largura / 2);
    const metadeY = Math.floor(altura / 2);

    await client.query('DELETE FROM posicoes');

    for (let y = -metadeY; y <= metadeY; y++) {
        for (let x = -metadeX; x <= metadeX; x++) {
            await client.query(
                'INSERT INTO posicoes (x, y) VALUES ($1, $2)',
                [x, y]
            );
        }
    }

    res.json({ ok: true, casas_criadas: largura * altura });
});

app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});