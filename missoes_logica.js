const client = require('./database');
const estado = require('./estado');

// BUSCAR OBJETIVO ATIVO — junta a missão ativa e o objetivo atual num objeto só
async function buscarObjetivoAtivo() {
    const dinamico = (await client.query(
        `SELECT id_dinamico, missao_id, ordem_atual, turno_meta FROM obj_dinamico
         WHERE personagem_id = 1 AND status = 'ativa'`
    )).rows[0];

    if (!dinamico) return null;   // sem missão ativa

    const obj = (await client.query(
        'SELECT tipo, modo, alvo, meta FROM missao_obj WHERE missao_id = $1 AND ordem = $2',
        [dinamico.missao_id, dinamico.ordem_atual]
    )).rows[0];

    if (!obj) return null;

    return { ...dinamico, ...obj };   // ex: { id_dinamico, missao_id, ordem_atual, turno_meta, tipo, modo, alvo, meta }
}

// AVANÇAR — sobe o ordem_atual; se acabou, conclui e paga
async function avancar(idDinamico, idMissao, ordemAtual) {
    const novaOrdem = ordemAtual + 1;

    const proximo = (await client.query(
        'SELECT 1 FROM missao_obj WHERE missao_id = $1 AND ordem = $2',
        [idMissao, novaOrdem]
    )).rows[0];

    if (proximo) {
        await client.query(
            'UPDATE obj_dinamico SET ordem_atual = $1, ultimo_num = 0, turno_meta = NULL WHERE id_dinamico = $2',
            [novaOrdem, idDinamico]
        );
        await invocarSeNecessario(idMissao, novaOrdem);
        await prepararEsperar(idMissao, novaOrdem);

        // se o próximo objetivo for perda e o herói puder pagar, cobra e já avança de novo
        const pagou = await prepararPerda(idMissao, novaOrdem);
        if (pagou) return pagou;

        return { estado: 'avancou', ordem: novaOrdem };
    } else {
        const recompensa = (await client.query(
            'SELECT recompensa FROM missoes WHERE id_missao = $1', [idMissao]
        )).rows[0].recompensa;

        await client.query(
            `UPDATE obj_dinamico SET status = 'concluida' WHERE id_dinamico = $1`, [idDinamico]
        );
        await client.query(
            'UPDATE personagem SET dinheiro = dinheiro + $1 WHERE id_personagem = 1', [recompensa]
        );
        return { estado: 'concluida', recompensa };
    }
}

// INVOCAR — se o objetivo desta ordem for combate invocar, monta o boss no estado
async function invocarSeNecessario(idMissao, ordem) {
    const obj = (await client.query(
        'SELECT tipo, modo, alvo, vida_mod, ataq_mod FROM missao_obj WHERE missao_id = $1 AND ordem = $2',
        [idMissao, ordem]
    )).rows[0];

    if (!obj) return;
    if (obj.tipo !== 'combate') return;
    if (obj.modo !== 'invocar') return;

    const base = (await client.query(
        'SELECT id_criatura, nome, vida, ataque FROM criaturas WHERE id_criatura = $1',
        [obj.alvo]
    )).rows[0];

    if (!base) return;

    estado.combateAtual = {
        id: base.id_criatura,
        nome: base.nome,
        vidaMonstro: base.vida + (obj.vida_mod || 0),
        ataqueMonstro: base.ataque + (obj.ataq_mod || 0)
    };
}

// ESPERAR (preparar) — se o objetivo desta ordem for esperar, grava o turno em que a espera termina
async function prepararEsperar(idMissao, ordem) {
    const obj = (await client.query(
        'SELECT tipo, alvo FROM missao_obj WHERE missao_id = $1 AND ordem = $2',
        [idMissao, ordem]
    )).rows[0];

    if (!obj || obj.tipo !== 'esperar') return;

    // turno_meta = turno de agora + quantos turnos esperar
    await client.query(
        `UPDATE obj_dinamico
         SET turno_meta = (SELECT turno_atual FROM personagem WHERE id_personagem = 1) + $1
         WHERE personagem_id = 1 AND missao_id = $2 AND status = 'ativa'`,
        [obj.alvo, idMissao]
    );
}

// PERDA (preparar) — evento: cobra o que o herói tiver, até zerar, e avança sempre
async function prepararPerda(idMissao, ordem) {
    const obj = (await client.query(
        'SELECT tipo, alvo FROM missao_obj WHERE missao_id = $1 AND ordem = $2',
        [idMissao, ordem]
    )).rows[0];

    if (!obj || obj.tipo !== 'perda') return null;

    const custo = -obj.alvo;   // alvo -50 → custo 50

    const heroi = (await client.query(
        'SELECT dinheiro FROM personagem WHERE id_personagem = 1'
    )).rows[0];

    const pagou = Math.min(heroi.dinheiro, custo);   // nunca tira mais do que o herói tem

    await client.query(
        'UPDATE personagem SET dinheiro = dinheiro - $1 WHERE id_personagem = 1',
        [pagou]
    );

    const dinamico = (await client.query(
        `SELECT id_dinamico FROM obj_dinamico
         WHERE personagem_id = 1 AND missao_id = $1 AND status = 'ativa'`,
        [idMissao]
    )).rows[0];

    const r = await avancar(dinamico.id_dinamico, idMissao, ordem);
    return { ...r, pagou };
}

// VERIFICAR COMBATE — chamado quando uma criatura morre
async function verificarCombate(idMorto) {
    const dinamico = (await client.query(
        `SELECT id_dinamico, missao_id, ordem_atual FROM obj_dinamico
         WHERE personagem_id = 1 AND status = 'ativa'`
    )).rows[0];

    if (!dinamico) return null;

    const obj = (await client.query(
        'SELECT tipo, alvo FROM missao_obj WHERE missao_id = $1 AND ordem = $2',
        [dinamico.missao_id, dinamico.ordem_atual]
    )).rows[0];

    if (!obj) return null;
    if (obj.tipo !== 'combate') return null;
    if (idMorto !== obj.alvo) return null;

    return await avancar(dinamico.id_dinamico, dinamico.missao_id, dinamico.ordem_atual);
}

// VERIFICAR IR_ATE — chamado no encerrar; se o objetivo ativo é ir_ate e o herói chegou, avança
async function verificarIrAte(ativo) {
    if (!ativo || ativo.tipo !== 'ir_ate') return null;

    const heroi = (await client.query(
        'SELECT x, y FROM personagem WHERE id_personagem = 1'
    )).rows[0];

    const destino = (await client.query(
        'SELECT x, y FROM posicoes WHERE id_posicao = $1',
        [ativo.alvo]
    )).rows[0];

    if (destino && heroi.x === destino.x && heroi.y === destino.y) {
        return await avancar(ativo.id_dinamico, ativo.missao_id, ativo.ordem_atual);
    }
    return null;
}

// VERIFICAR ESPERAR — recebe o objetivo ativo; se o turno chegou na meta, avança
async function verificarEsperar(ativo) {
    if (!ativo || ativo.tipo !== 'esperar') return null;
    if (ativo.turno_meta === null) return null;   // meta não foi gravada; não avança

    const heroi = (await client.query(
        'SELECT turno_atual FROM personagem WHERE id_personagem = 1'
    )).rows[0];

    if (heroi.turno_atual >= ativo.turno_meta) {
        return await avancar(ativo.id_dinamico, ativo.missao_id, ativo.ordem_atual);
    }
    return null;   // ainda não chegou, espera mais
}

// VERIFICAR PERDA — chamado no encerrar; se o objetivo ativo é perda, tenta cobrar de novo
async function verificarPerda() {
    const dinamico = (await client.query(
        `SELECT missao_id, ordem_atual FROM obj_dinamico
         WHERE personagem_id = 1 AND status = 'ativa'`
    )).rows[0];

    if (!dinamico) return null;

    return await prepararPerda(dinamico.missao_id, dinamico.ordem_atual);
}

// QUEBRAR ESPERAR — chamado ao mover; se o objetivo ativo é esperar, o herói saiu do lugar e perde a missão
async function quebrarEsperar() {
    const dinamico = (await client.query(
        `SELECT id_dinamico, missao_id, ordem_atual FROM obj_dinamico
         WHERE personagem_id = 1 AND status = 'ativa'`
    )).rows[0];

    if (!dinamico) return false;

    const obj = (await client.query(
        'SELECT tipo FROM missao_obj WHERE missao_id = $1 AND ordem = $2',
        [dinamico.missao_id, dinamico.ordem_atual]
    )).rows[0];

    if (!obj || obj.tipo !== 'esperar') return false;   // não estava esperando, pode andar

    await client.query(
        `UPDATE obj_dinamico SET status = 'perdida' WHERE id_dinamico = $1`,
        [dinamico.id_dinamico]
    );
    return true;   // estava esperando e se mexeu: missão perdida
}

// O objetivo ativo é um combate invocar? (pra silenciar a carta do bioma)
function objetivoAtivoEhInvocar(ativo) {
    return !!ativo && ativo.tipo === 'combate' && ativo.modo === 'invocar';
}

// VERIFICAR DADOS — chamado pelo botão Rolar
// grupo A: compara a rolagem com a meta fixa da missao_obj
async function verificarDados() {
    const dinamico = (await client.query(
        `SELECT id_dinamico, missao_id, ordem_atual FROM obj_dinamico
         WHERE personagem_id = 1 AND status = 'ativa'`
    )).rows[0];
    if (!dinamico) return { ok: false, motivo: 'nenhuma missao ativa' };

    const obj = (await client.query(
        'SELECT tipo, alvo, modo, meta FROM missao_obj WHERE missao_id = $1 AND ordem = $2',
        [dinamico.missao_id, dinamico.ordem_atual]
    )).rows[0];
    if (!obj || obj.tipo !== 'dados') return { ok: false, motivo: 'objetivo atual nao e dados' };

    const rolagem = Math.floor(Math.random() * obj.alvo) + 1;   // 1 até o tamanho do dado

    let acertou;
    if (obj.modo === 'fixo')        acertou = rolagem === obj.meta;
    else if (obj.modo === 'minimo') acertou = rolagem >= obj.meta;
    else if (obj.modo === 'maximo') acertou = rolagem <= obj.meta;
    else return { ok: false, motivo: 'modo ' + obj.modo + ' ainda nao implementado' };

    let missao = null;
    if (acertou) {
        missao = await avancar(dinamico.id_dinamico, dinamico.missao_id, dinamico.ordem_atual);
    }
    // errou: não grava nada, o jogador rola de novo

    return { ok: true, dado: obj.alvo, modo: obj.modo, meta: obj.meta, rolagem, acertou, missao };
}
// AO LIGAR O SERVIDOR — se a missão ativa estava num boss, o boss sumiu da memória: perde a missão
async function perderMissaoDeBossSumido() {
    const ativo = await buscarObjetivoAtivo();
    if (!objetivoAtivoEhInvocar(ativo)) return;   // não estava num boss, nada a fazer

    await client.query(
        `UPDATE obj_dinamico SET status = 'perdida' WHERE id_dinamico = $1`,
        [ativo.id_dinamico]
    );
    console.log('Missão ' + ativo.missao_id + ' perdida: o servidor reiniciou durante o boss.');
}

module.exports = { perderMissaoDeBossSumido, buscarObjetivoAtivo, avancar, verificarCombate, invocarSeNecessario, verificarIrAte, objetivoAtivoEhInvocar, verificarDados, prepararEsperar, verificarEsperar, quebrarEsperar, prepararPerda, verificarPerda };