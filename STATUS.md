# Estado e passagem de contexto

Atualizado em: 2026-11-20.

## Situação

- E0 a E8 concluídas (2026-11-19). Beta 0.1.0 publicada a pedido do usuário:
  https://github.com/agnasci/cyberpunk-combat-kit (público), release `v0.1.0` com
  `module.json` e `module.zip`. Manifesto:
  `https://github.com/agnasci/cyberpunk-combat-kit/releases/latest/download/module.json`.
- Entrada pelo menu do clique direito, pela aba "Combate" do Character Panel e pela API v1
  (docs/INTEGRATION.md).
- `main` em `origin` (GitHub) a partir de `b98fd85` (E8); release feita da tag `v0.1.0`.
- Character Panel: v0.2.0 publicada em 2026-11-19 com a API v1 (release `v0.2.0` de lá); a
  integração precisa dela (README).

## Última entrega: F-01 fluidez (2026-11-20)

- Tiro rápido: `registerQuickFireTool` e `onTokenFireClick` (`quick-menu.ts`,
  `token-click.ts`), `quickFireApplies` no domínio, ajuste de cliente oculto `quickFire`.
- "Pular diálogos de rolagem" (`skipRollDialogs`) no menu, painel e defesa; tiro rápido sempre
  pula. "Defesa dos PdMs" (`npcDefense`, `defendsAutomatically`). Atacante sem seleção:
  token do personagem (`chooseAttacker` em `domain/routing.ts`, `attackerToken`). D37.

Validação:
- Automatizada: `npm run check` exit 0 (204 testes; novo `tests/unit/routing.test.ts`).
- Teste manual real (Foundry, Gamemaster): ferramenta aparece e fica ativa entre recargas;
  Atirador selecionado + clique no PdM: alvo marcado, seleção mantida, ataque e dano sem
  diálogos (antes do ajuste: dois diálogos do CPR). Com "Defesa dos PdMs" automática, PdM com
  REF 8 esquivou sozinho (13) num acerto e não houve pedido nos erros; sem nenhum token
  selecionado e o Atirador como personagem do usuário, o ataque saiu dele. Tudo desfeito
  (PV 40, ablação 0, REF 6, munição 6, sem personagem, ajustes de volta ao padrão).
- Observação de teste: cliques simulados no canvas só selecionam tokens com um movimento do
  mouse antes (o PIXI precisa do hover).
- Não testado: como jogador de verdade (outro cliente); defesa automática em supressão e
  agarrão.

## Entregas anteriores

E10 (visual), E9 (v0.1.1), E8 (API v1 e beta 0.1.0), E7 (painel), E6 (Quickhacks), E5 (pacotes), E2 (menu), E4
(efeitos), E3 (modos, áreas D24, agarrão) e E0/E1: evidências no histórico do git deste arquivo. Mundo de teste
`cyberdeck-hud`: armas de teste com munição no "CCK Teste — Atirador"; perícias do "NPC Teste
(CNH)"; pacotes de teste em `Data/cck-packs/` (`teste`, `quebrado`, `qh-teste`); chat cheio de
cards de teste. Uma aba do navegador embutido aberta como Gamemaster.

## Próximas tarefas

Estados: `TODO`, `EM ANDAMENTO`. Uma tarefa por vez; detalhe em docs/PLAN.md.

| ID | Estado | Entrega | Condição |
|---|---|---|---|
| F-02 | EM ANDAMENTO | Integrar armas e itens e automatizar efeitos e sons com a biblioteca de exemplo (suíte Pneuma: P-02, P-04, P-03) | Só em `private/` |
| P-02 | EM ANDAMENTO | Pacote pessoal com o conteúdo do PneumaQuickHack (só `private/`) | Montado e validado pelo `packs.register` em 2026-11-19; falta carregar `dist-personal/` no Foundry (reinício do servidor) e rodar o Netrunning completo com ele |

## Dependências externas

- Character Panel: `docs/INTEGRATION.md` (E6-02 de lá) ainda não escrito; a E7 daqui usa o contrato descrito no docs/ARCHITECTURE.md de lá.

## Pendências abertas

- Página do pacote em foundryvtt.com (conta do usuário, manual) com o aviso da Homebrew
  Content Policy: item que falta do checklist do docs/LEGAL.md.

- Decisões D15–D37 aguardam confirmação do usuário em docs/DECISIONS.md.
- Não testados no Foundry: crítico (dois 6) real; arremesso com dano que mostrasse a
  armadura inteira; espingarda com alvo de jogador; explosivo com cobertura; Artes Marciais
  sem o item de perícia; 60 s sem resposta; token não vinculado; dois donos ativos.
- Limites conhecidos: desfazer não desfaz estados nem fim de agarrão (D20); lesão de perna
  e soltar item são avisos (D21); movimentos especiais de Artes Marciais não feitos; ROF 2
  do corpo a corpo é um ataque por chamada.
- `npm audit`: aviso moderado em `minimatch` via `typescript-eslint` 8.72.2 (ferramenta de
  desenvolvimento); subir junto com o Character Panel.
