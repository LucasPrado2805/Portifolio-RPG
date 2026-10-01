const client = require('./database');
const estado = require('./estado');

// AVANÇAR — sobe o ordem_atual; se acabou, conclui e paga
async function avancar(idDinamico, idMissao, ordemAtual) {
    const novaOrdem = ordemAtual + 1;

    const proximo = (await client.query(
        'SELECT 1 FROM missao_obj WHERE missao_id = $1 AND ordem = $2',
        [idMissao, novaOrdem]
    )).rows[0];

    if (proximo) {
        await client.query(
            'UPDATE obj_dinamico SET ordem_atual = $1, ultimo_num = 0 WHERE id_dinamico = $2',
            [novaOrdem, idDinamico]
        );
        await invocarSeNecessario(idMissao, novaOrdem);
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
async function verificarIrAte() {
    const heroi = (await client.query(
        'SELECT x, y FROM personagem WHERE id_personagem = 1'
    )).rows[0];

    const dinamico = (await client.query(
        `SELECT id_dinamico, missao_id, ordem_atual FROM obj_dinamico
         WHERE personagem_id = 1 AND status = 'ativa'`
    )).rows[0];

    if (!dinamico) return null;

    const obj = (await client.query(
        'SELECT tipo, alvo FROM missao_obj WHERE missao_id = $1 AND ordem = $2',
        [dinamico.missao_id, dinamico.ordem_atual]
    )).rows[0];

    if (!obj || obj.tipo !== 'ir_ate') return null;

    const destino = (await client.query(
        'SELECT x, y FROM posicoes WHERE id_posicao = $1',
        [obj.alvo]
    )).rows[0];

    if (destino && heroi.x === destino.x && heroi.y === destino.y) {
        return await avancar(dinamico.id_dinamico, dinamico.missao_id, dinamico.ordem_atual);
    }
    return null;
}

// O objetivo ativo é um combate invocar? (pra silenciar a carta do bioma)
async function objetivoAtivoEhInvocar() {
    const dinamico = (await client.query(
        `SELECT missao_id, ordem_atual FROM obj_dinamico
         WHERE personagem_id = 1 AND status = 'ativa'`
    )).rows[0];

    if (!dinamico) return false;

    const obj = (await client.query(
        'SELECT tipo, modo FROM missao_obj WHERE missao_id = $1 AND ordem = $2',
        [dinamico.missao_id, dinamico.ordem_atual]
    )).rows[0];

    return obj && obj.tipo === 'combate' && obj.modo === 'invocar';
}

module.exports = { avancar, verificarCombate, invocarSeNecessario, verificarIrAte, objetivoAtivoEhInvocar };