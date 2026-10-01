const express = require('express');
const router = express.Router();
const client = require('../database');
const estado = require('../estado');
const { avancar, invocarSeNecessario } = require('../missoes_logica');

// VER MISSÃO — gasta 1 movimento, rola d4, sorteia missão da cidade
router.get('/ver-missao', async (req, res) => {
    if (estado.combateAtual) {
        return res.json({ ok: false, motivo: 'em combate' });
    }
    const heroi = (await client.query(
        'SELECT x, y, saldo_mov_turno FROM personagem WHERE id_personagem = 1'
    )).rows[0];

    const cidade = (await client.query(
        'SELECT id_cidade FROM cidades WHERE x = $1 AND y = $2',
        [heroi.x, heroi.y]
    )).rows[0];

    if (!cidade) return res.json({ ok: false, motivo: 'nao esta em cidade' });
    if (heroi.saldo_mov_turno < 1) return res.json({ ok: false, motivo: 'sem movimento' });

    await client.query(
        'UPDATE personagem SET saldo_mov_turno = saldo_mov_turno - 1 WHERE id_personagem = 1'
    );
    const d4 = Math.floor(Math.random() * 4) + 1;

    const missao = (await client.query(
        `SELECT id_missao, texto, recompensa FROM missoes
         WHERE cidade_id = $1 AND nivel = 1 AND n_d4 = $2 AND missao_pai IS NULL`,
        [cidade.id_cidade, d4]
    )).rows[0];

    if (!missao) {
        return res.json({ ok: true, d4, missao: null });
    }

    res.json({ ok: true, d4, missao });
});

// ACEITAR MISSÃO
router.get('/aceitar-missao/:id', async (req, res) => {
    const idMissao = parseInt(req.params.id);

    await client.query(
        `UPDATE obj_dinamico SET status = 'perdida'
         WHERE personagem_id = 1 AND status = 'ativa'`
    );

    const heroi = (await client.query(
        'SELECT turno_atual FROM personagem WHERE id_personagem = 1'
    )).rows[0];

    await client.query(
        `INSERT INTO obj_dinamico
         (personagem_id, missao_id, turno_aceite, status, ordem_atual)
         VALUES (1, $1, $2, 'ativa', 1)`,
        [idMissao, heroi.turno_atual]
    );

    await invocarSeNecessario(idMissao, 1); // se o 1º objetivo já for boss invocado, ele cai agora

    res.json({ ok: true, combate: estado.combateAtual });
});

// VERIFICAR — checa o objetivo da vez (ir_ate, no encerrar)
router.get('/verificar-missoes', async (req, res) => {
    const heroi = (await client.query(
        'SELECT x, y FROM personagem WHERE id_personagem = 1'
    )).rows[0];

    const ativas = (await client.query(
        `SELECT id_dinamico, missao_id, ordem_atual FROM obj_dinamico
         WHERE personagem_id = 1 AND status = 'ativa'`
    )).rows;

    const resultados = [];

    for (const d of ativas) {
        const obj = (await client.query(
            'SELECT tipo, alvo FROM missao_obj WHERE missao_id = $1 AND ordem = $2',
            [d.missao_id, d.ordem_atual]
        )).rows[0];
        if (!obj) continue;

        let concluido = false;

        if (obj.tipo === 'ir_ate') {
            const destino = (await client.query(
                'SELECT x, y FROM posicoes WHERE id_posicao = $1',
                [obj.alvo]
            )).rows[0];
            if (destino && heroi.x === destino.x && heroi.y === destino.y) concluido = true;
        }

        if (concluido) {
            const r = await avancar(d.id_dinamico, d.missao_id, d.ordem_atual);
            resultados.push({ missao: d.missao_id, ...r, combate: estado.combateAtual });
        }
    }

    res.json({ ok: true, resultados });
});

module.exports = router;