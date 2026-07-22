const express = require('express');
const router = express.Router();
const client = require('../database');
const estado = require('../estado');

router.get('/atacar', async (req, res) => {
    if (!estado.combateAtual) {
        return res.json({ erro: 'nenhum combate ativo' });
    }

    const d20 = Math.floor(Math.random() * 20) + 1;
    estado.combateAtual.vidaMonstro -= d20;

    if (estado.combateAtual.vidaMonstro <= 0) {
        const nome = estado.combateAtual.nome;
        estado.combateAtual = null;
        return res.json({ d20, fim: 'vitoria', nome });
    }

    await client.query(
        'UPDATE personagem SET vida = GREATEST(vida - $1, 0) WHERE id_personagem = 1',
        [estado.combateAtual.ataqueMonstro]
    );

    const heroi = (await client.query(
        'SELECT vida FROM personagem WHERE id_personagem = 1'
    )).rows[0];

    if (heroi.vida <= 0) {
        estado.combateAtual = null;
        return res.json({ d20, fim: 'derrota', vidaHeroi: heroi.vida });
    }

    res.json({
        d20,
        fim: null,
        vidaMonstro: estado.combateAtual.vidaMonstro,
        vidaHeroi: heroi.vida
    });
});

module.exports = router;