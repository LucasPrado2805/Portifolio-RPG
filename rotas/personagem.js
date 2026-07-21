const express = require('express');
const router = express.Router();
const client = require('../database');

// devolve o herói
router.get('/personagem', async (req, res) => {
    const resultado = await client.query(
        'SELECT nome, x, y, saldo_mov_turno, movimento_max, vida FROM personagem WHERE id_personagem = 1'
    );
    res.json(resultado.rows[0]);
});

module.exports = router;