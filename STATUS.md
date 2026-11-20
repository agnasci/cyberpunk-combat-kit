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

## Última entrega: P-02 edição pessoal no Foundry (2026-11-20)

- Ícone do Quickhack nas entradas do menu (`MenuQuickhack.icon`, `domain/menu.ts`), igual às
  armas. `private/module.personal.json` com versão 0.1.1-personal.
- Teste manual real: junção trocada para `dist-personal/` e mundo relançado; módulo
  0.1.1-personal com a flag do pacote pessoal; Quickhacks ligados: os 11 do pacote listados
  pela API e no menu, todos com ícone. Netrunner de teste na cena e Neuroport temporário
  instalado no PdM (`system.installedItems.list`): Jack In (10 contra VON 15, rolado sozinho
  pela "Defesa dos PdMs" automática), Overheat (falhou duas vezes, entrou com 11 contra DV 8)
  e, num combate rápido, 4 de dano contínuo no fim do turno do PdM, com card e desfazer.
- Limpeza: Jack Out, combate apagado, dano desfeito, efeito "Overheat" removido, Neuroport e
  lista de instalados restaurados, token do netrunner apagado, ajustes de volta (Quickhacks
  desligados, defesa "perguntar"); junção de volta para `dist/` e mundo relançado na 0.1.1.
- Não testados no Foundry com o pacote pessoal: os outros 9 Quickhacks um a um (efeitos
  `guided` e `criticalInjury` foram testados na E6 com o pacote de teste).

## Entrega anterior: F-01 fluidez (2026-11-20)

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
| P-04 | TODO | Efeitos e sons por tipo de arma com os assets da suíte Pneuma (pedido F-02) | Bloqueada: baixar o Pneuma Visual/Combat Tools precisa de autorização do usuário |
| P-03 | TODO | Compêndio pessoal (CEMK): armas e itens com dados mecânicos | Bloqueada: dados mecânicos vêm do livro do usuário (D14) |

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
