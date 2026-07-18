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
    const resultado = await client.query(`
        SELECT posicoes.x, posicoes.y, biomas.cor, biomas.transponivel
        FROM posicoes
        LEFT JOIN biomas ON posicoes.bioma_id = biomas.id_bioma
        ORDER BY posicoes.y, posicoes.x
    `);
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
        'SELECT nome, x, y, saldo_mov_turno, movimento_max FROM personagem WHERE id_personagem = 1'
    );
    res.json(resultado.rows[0]);
});

// move o herói: checa terreno e saldo antes de andar
app.get('/mover/:direcao', async (req, res) => {
    const dir = DIRECOES[req.params.direcao];
    if (!dir) {
        return res.status(400).json({ erro: 'direcao invalida' });
    }

    // 1. onde o herói está e quanto saldo ele tem
    const heroiRes = await client.query(
        'SELECT x, y, saldo_mov_turno FROM personagem WHERE id_personagem = 1'
    );
    const heroi = heroiRes.rows[0];

    // 2. pra qual casa ele quer ir
    const destinoX = heroi.x + dir.dx;
    const destinoY = heroi.y + dir.dy;

    // 3. o que existe nessa casa (bioma dela: passa? quanto custa?)
    const casaRes = await client.query(`
        SELECT biomas.transponivel, biomas.custo_mov
        FROM posicoes
        LEFT JOIN biomas ON posicoes.bioma_id = biomas.id_bioma
        WHERE posicoes.x = $1 AND posicoes.y = $2
    `, [destinoX, destinoY]);

    // não existe casa ali → fora do mapa, bloqueia
    if (casaRes.rows.length === 0) {
        return res.json({ ok: false, motivo: 'fora do mapa' });
    }

    const casa = casaRes.rows[0];

    // terreno bloqueado (mar)
    if (casa.transponivel === false) {
        return res.json({ ok: false, motivo: 'intransponivel' });
    }

    const custo = casa.custo_mov ?? 1; // se vier vazio, assume 1

    // saldo insuficiente → bloqueia (a regra que combinamos)
    if (heroi.saldo_mov_turno < custo) {
        return res.json({ ok: false, motivo: 'sem saldo' });
    }

    // 4. pode andar: move e desconta o custo do saldo
    await client.query(
        'UPDATE personagem SET x = $1, y = $2, saldo_mov_turno = saldo_mov_turno - $3 WHERE id_personagem = 1',
        [destinoX, destinoY, custo]
    );

    res.json({ ok: true });
});

// passar o turno: reabastece o saldo de movimento pro máximo
app.get('/passar-turno', async (req, res) => {
    await client.query(
        'UPDATE personagem SET saldo_mov_turno = movimento_max WHERE id_personagem = 1'
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