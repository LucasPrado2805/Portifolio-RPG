const express = require('express');
const router = express.Router();
const client = require('../database');

let combateAtual = null;

router.get('/sacar-carta', async (req, res) => {
    const heroi = (await client.query(
        'SELECT x, y FROM personagem WHERE id_personagem = 1'
    )).rows[0];

    const casa = (await client.query(
        'SELECT bioma_id FROM posicoes WHERE x = $1 AND y = $2',
        [heroi.x, heroi.y]
    )).rows[0];

    const sorteio = Math.floor(Math.random() * 3);

    if (sorteio === 0) {
        combateAtual = null;
        return res.json({ vazia: true });
    }

    const criaturas = (await client.query(
        'SELECT nome, vida, ataque FROM criaturas WHERE bioma_id = $1',
        [casa.bioma_id]
    )).rows;

    const criatura = criaturas[sorteio - 1];

    combateAtual = {
        nome: criatura.nome,
        vidaMonstro: criatura.vida,
        ataqueMonstro: criatura.ataque
    };

    res.json({ vazia: false, ...combateAtual });
});

router.get('/atacar', async (req, res) => {
    if (!combateAtual) {
        return res.json({ erro: 'nenhum combate ativo' });
    }

    const d20 = Math.floor(Math.random() * 20) + 1;
    combateAtual.vidaMonstro -= d20;

    if (combateAtual.vidaMonstro <= 0) {
        const nome = combateAtual.nome;
        combateAtual = null;
        return res.json({ d20, fim: 'vitoria', nome });
    }

    await client.query(
        'UPDATE personagem SET vida = vida - $1 WHERE id_personagem = 1',
        [combateAtual.ataqueMonstro]
    );

    const heroi = (await client.query(
        'SELECT vida FROM personagem WHERE id_personagem = 1'
    )).rows[0];

    if (heroi.vida <= 0) {
        combateAtual = null;
        return res.json({ d20, fim: 'derrota', vidaHeroi: heroi.vida });
    }

    res.json({
        d20,
        fim: null,
        vidaMonstro: combateAtual.vidaMonstro,
        vidaHeroi: heroi.vida
    });
});

module.exports = router;