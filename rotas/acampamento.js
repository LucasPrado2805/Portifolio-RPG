const estado = require('../estado');
const express = require('express');
const router = express.Router();
const client = require('../database');

router.get('/acampar', async (req, res) => {
     if (estado.combateAtual) {
        return res.json({ ok: false, motivo: 'em combate' });
    }

    const heroi = (await client.query(
        'SELECT saldo_mov_turno, acampado FROM personagem WHERE id_personagem = 1'
    )).rows[0];

    if (heroi.acampado) {
        return res.json({ ok: false, motivo: 'ja acampado' });
    }

    if (heroi.saldo_mov_turno < 1) {
        return res.json({ ok: false, motivo: 'sem saldo' });
    }

    await client.query(
        'UPDATE personagem SET saldo_mov_turno = saldo_mov_turno - 1, acampado = true WHERE id_personagem = 1'
    );

    res.json({ ok: true });
});

module.exports = router;