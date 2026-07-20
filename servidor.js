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
let combateAtual = null;

app.get('/sacar-carta', async (req, res) => {
    // 1. onde o herói está
    const heroi = (await client.query(
        'SELECT x, y FROM personagem WHERE id_personagem = 1'
    )).rows[0];

    // 2. qual o bioma daquela casa
    const casa = (await client.query(
        'SELECT bioma_id FROM posicoes WHERE x = $1 AND y = $2',
        [heroi.x, heroi.y]
    )).rows[0];

    // 3. sorteia: 0 = vazia, senão uma criatura do bioma
    const sorteio = Math.floor(Math.random() * 3); // 0, 1 ou 2

    if (sorteio === 0) {
        combateAtual = null;
        return res.json({ vazia: true });
    }

    const criaturas = (await client.query(
        'SELECT nome, vida, ataque FROM criaturas WHERE bioma_id = $1',
        [casa.bioma_id]
    )).rows;

    // pega a criatura 0 ou 1 da lista (sorteio vale 1 ou 2 aqui)
    const criatura = criaturas[sorteio - 1];

    // guarda a CÓPIA na memória (vida que vai cair na luta)
    combateAtual = {
        nome: criatura.nome,
        vidaMonstro: criatura.vida,
        ataqueMonstro: criatura.ataque
    };

    res.json({ vazia: false, ...combateAtual });
});

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
    'SELECT nome, x, y, saldo_mov_turno, movimento_max, vida FROM personagem WHERE id_personagem = 1'    );
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
        'UPDATE personagem SET x = $1, y = $2, saldo_mov_turno = saldo_mov_turno - $3, andou_no_turno = true, acampado = false WHERE id_personagem = 1',
        [destinoX, destinoY, custo]
    );

    res.json({ ok: true });
});

app.get('/passar-turno', async (req, res) => {
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

app.get('/atacar', async (req, res) => {
    // não tem luta rolando? erro
    if (!combateAtual) {
        return res.json({ erro: 'nenhum combate ativo' });
    }

    // 1. herói ataca: rola d20 e tira da vida da criatura (memória)
    const d20 = Math.floor(Math.random() * 20) + 1;
    combateAtual.vidaMonstro -= d20;

    // 2. criatura morreu? vitória (e ela NÃO revida)
    if (combateAtual.vidaMonstro <= 0) {
        const nome = combateAtual.nome;
        combateAtual = null; // descarta a cópia da memória
        return res.json({ d20, fim: 'vitoria', nome });
    }

    // 3. criatura viva: ela revida na vida do herói (banco)
    await client.query(
        'UPDATE personagem SET vida = vida - $1 WHERE id_personagem = 1',
        [combateAtual.ataqueMonstro]
    );

    // 4. pega a vida atualizada do herói pra checar morte
    const heroi = (await client.query(
        'SELECT vida FROM personagem WHERE id_personagem = 1'
    )).rows[0];

    // 5. herói morreu? derrota
    if (heroi.vida <= 0) {
        combateAtual = null;
        return res.json({ d20, fim: 'derrota', vidaHeroi: heroi.vida });
    }

    // 6. ninguém morreu: devolve o estado pra continuar a luta
    res.json({
        d20,
        fim: null,
        vidaMonstro: combateAtual.vidaMonstro,
        vidaHeroi: heroi.vida
    });
});

app.get('/acampar', async (req, res) => {
    // pega o saldo e o estado atual
    const heroi = (await client.query(
        'SELECT saldo_mov_turno, acampado FROM personagem WHERE id_personagem = 1'
    )).rows[0];

    // já acampado? não deixa acampar de novo
    if (heroi.acampado) {
        return res.json({ ok: false, motivo: 'ja acampado' });
    }

    // sem saldo pra pagar o custo 1? bloqueia
    if (heroi.saldo_mov_turno < 1) {
        return res.json({ ok: false, motivo: 'sem saldo' });
    }

    // paga 1 de movimento e liga o acampamento
    await client.query(
        'UPDATE personagem SET saldo_mov_turno = saldo_mov_turno - 1, acampado = true WHERE id_personagem = 1'
    );

    res.json({ ok: true });
});

app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});