const express = require('express');
const router = express.Router();
const client = require('../database');

const DIRECOES = {
    leste:     { dx: 1,  dy: 0 },
    oeste:     { dx: -1, dy: 0 },
    sudeste:   { dx: 0,  dy: 1 },
    noroeste:  { dx: 0,  dy: -1 },
    nordeste:  { dx: 1,  dy: -1 },
    sudoeste:  { dx: -1, dy: 1 }
};

router.get('/posicoes', async (req, res) => {
    const resultado = await client.query(`
        SELECT posicoes.x, posicoes.y, biomas.cor, biomas.transponivel
        FROM posicoes
        LEFT JOIN biomas ON posicoes.bioma_id = biomas.id_bioma
        ORDER BY posicoes.y, posicoes.x
    `);
    res.json(resultado.rows);
});

// devolve todas as cidades (nome + coordenada)
router.get('/cidades', async (req, res) => {
    const resultado = await client.query('SELECT id_cidade, nome, x, y FROM cidades');
    res.json(resultado.rows);
});

// move o herói: checa terreno e saldo antes de andar
router.get('/mover/:direcao', async (req, res) => {
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
        'UPDATE personagem SET x = $1, y = $2, saldo_mov_turno = saldo_mov_turno - $3, andou_no_turno = true, acampado = false WHERE id_personagem = 1',
        [destinoX, destinoY, custo]
    );

    res.json({ ok: true });
});

router.get('/passar-turno', async (req, res) => {
    // estado atual do herói
    const heroi = (await client.query(
        'SELECT x, y, acampado, andou_no_turno FROM personagem WHERE id_personagem = 1'
    )).rows[0];

    let cura = 0;

    if (heroi.acampado) {
        // está numa cidade?
        const cidade = (await client.query(
            'SELECT 1 FROM cidades WHERE x = $1 AND y = $2',
            [heroi.x, heroi.y]
        )).rows[0];

        if (cidade) {
            cura = 20;                        // cidade: sempre 20
        } else if (heroi.andou_no_turno) {
            cura = 5;                         // bioma, andou: 5
        } else {
            cura = 10;                        // bioma, parado: 10
        }
    }

    // aplica cura, reabastece o movimento e zera o flag "andou"
    await client.query(
    'UPDATE personagem SET vida = LEAST(vida + $1, vida_max), saldo_mov_turno = movimento_max, andou_no_turno = false WHERE id_personagem = 1',        [cura]
    );

    res.json({ ok: true, cura });
});

router.get('/gerar-mapa/:largura/:altura', async (req, res) => {
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

module.exports = router;