# Estado e passagem de contexto

Atualizado em: 2026-11-20.

## Situação

- E0 a E10, F-01, P-02, P-04, a revisão de regras R-01 e os turnos (D41) concluídos (2026-11-20). Última release pública: `v0.1.1` (E9)
  em https://github.com/agnasci/cyberpunk-combat-kit, com
  `module.json` e `module.zip`. Manifesto:
  `https://github.com/agnasci/cyberpunk-combat-kit/releases/latest/download/module.json`.
- Entrada pelo menu do clique direito, pela aba "Combate" do Character Panel e pela API v1
  (docs/INTEGRATION.md).
- `main` enviado ao GitHub em 2026-11-20 (E10, F-01, ícone dos Quickhacks, chaves combinadas
  de cue, revisão de regras, mira do alvo, correção do Tiro rápido e turnos D41), sem release: a última
  continua `v0.1.1`; a 0.1.2 sai quando o usuário pedir.
- Character Panel: v0.2.0 publicada em 2026-11-19 com a API v1 (release `v0.2.0` de lá); a
  integração precisa dela (README).

## Última entrega: turnos e orçamento de ações (2026-11-20)

- Pedido do usuário: indicador visual de quem está no turno e contador de ações e movimento
  que impede andar e agir além do permitido, desligável; borda preta também nas pontas da
  mira.
- D41: `domain/turn-budget.ts` (orçamento, Correr, caído, cadência 2, quadrados, placa),
  `integrations/foundry/turn-store.ts` (flag do combatente, MOV, Caído),
  `integrations/foundry/turn-indicator.ts` (placa no canvas), `workflows/turn-economy.ts`
  (portões de Ação, `preUpdateToken`, levantar-se, selo do tracker), `ui/turn-badge.ts`;
  gasto da Ação em `nativeAttack`, agarrão e recarga; ajustes `actionEconomy` e
  `turnIndicator`. Mira: ponta quadrada nos traços (D40).
- Validação: `npm run check` exit 0 (224 testes; `check:private` sem vazamento). No Foundry
  (mestre, combate de teste): placa "MOVE 12 m" e selos no tracker; 4 quadrados passam, mais 4
  abrem "Correr?", aceito grava Ação gasta e 8/12; ataque depois disso recusado; passar de 12
  recusado; caído não anda e não levanta sem Ação; arma de cadência 2 fez dois ataques e o
  terceiro foi recusado; "só contar" deixou andar 10 quadrados e marcou excesso; "desligado"
  tira os selos e a placa vira "TURN"; pontas da mira com contorno; console sem erros.
  Restaurado: sem combate, posições, sem alvos, ajustes como antes.
- Não testado: como jogador (gravação da flag pelo próprio combatente); movimento pela régua
  com vários pontos; grade hexagonal; agarrão e recarga gastando a Ação no Foundry.

## Entrega anterior: mira animada do alvo marcado (2026-11-20)

- D40 e D37 (Tiro rápido ataca sem trocar o alvo). Conferido no Foundry; não testado como
  jogador nem com muitos alvos.

## Entregas anteriores

P-04, P-02 (edição pessoal no Foundry), F-01 (fluidez), E10 (visual), E9 (v0.1.1), E8 (API v1 e
beta 0.1.0), E7 (painel), E6 (Quickhacks), E5 (pacotes), E2 (menu), E4 (efeitos), E3 (modos,
áreas D24, agarrão) e E0/E1: evidências no histórico do git deste arquivo. Mundo de teste
`cyberdeck-hud`: armas de teste com munição no "CCK Teste — Atirador"; perícias do "NPC Teste
(CNH)"; pacotes de teste em `Data/cck-packs/` (`teste`, `quebrado`, `qh-teste`); chat cheio de
cards de teste. Uma aba do navegador embutido aberta como Gamemaster.

## Próximas tarefas

Estados: `TODO`, `EM ANDAMENTO`. Uma tarefa por vez; detalhe em docs/PLAN.md.

| ID | Estado | Entrega | Condição |
|---|---|---|---|
| P-03 | TODO | Compêndio pessoal (CEMK): armas e itens com dados mecânicos | Bloqueada: dados mecânicos vêm do livro do usuário (D14) |

## Dependências externas

- Character Panel: `docs/INTEGRATION.md` (E6-02 de lá) ainda não escrito; a E7 daqui usa o contrato descrito no docs/ARCHITECTURE.md de lá.

## Pendências abertas

- Página do pacote em foundryvtt.com (conta do usuário, manual) com o aviso da Homebrew
  Content Policy: item que falta do checklist do docs/LEGAL.md.

- Decisões D15–D41 aguardam confirmação do usuário em docs/DECISIONS.md.
- Não testados no Foundry: crítico (dois 6) real; arremesso com dano que mostrasse a
  armadura inteira; espingarda com alvo de jogador; explosivo com cobertura; 60 s sem resposta; token não vinculado; dois donos ativos; defesa
  automática dos PdMs em supressão e agarrão; tiro rápido como jogador de outro cliente.
- Limites conhecidos: desfazer não desfaz estados nem fim de agarrão (D20); lesão de perna
  e soltar item são avisos (D21); movimentos especiais de Artes Marciais não feitos; ROF 2
  do corpo a corpo é um ataque por chamada.
- `npm audit`: aviso moderado em `minimatch` via `typescript-eslint` 8.72.2 (ferramenta de
  desenvolvimento); subir junto com o Character Panel.
