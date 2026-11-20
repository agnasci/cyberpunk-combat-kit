# Estado e passagem de contexto

Atualizado em: 2026-11-20.

## Situação

- E0 a E10, F-01, P-02, P-04 e a revisão de regras R-01 concluídas (2026-11-20). Última release pública: `v0.1.1` (E9)
  em https://github.com/agnasci/cyberpunk-combat-kit, com
  `module.json` e `module.zip`. Manifesto:
  `https://github.com/agnasci/cyberpunk-combat-kit/releases/latest/download/module.json`.
- Entrada pelo menu do clique direito, pela aba "Combate" do Character Panel e pela API v1
  (docs/INTEGRATION.md).
- `origin/main` em `f4e58fd` (tag `v0.1.1`). Commits locais ainda não enviados: E10, F-01, o
  ícone dos Quickhacks, as chaves combinadas de cue, a revisão de regras e o marcador de alvo; entram na próxima release (0.1.2)
  quando o usuário pedir.
- Character Panel: v0.2.0 publicada em 2026-11-19 com a API v1 (release `v0.2.0` de lá); a
  integração precisa dela (README).

## Última entrega: mira animada do alvo marcado (2026-11-20)

- Ajuste pedido depois: anel retirado (informação demais) e nitidez corrigida com traço
  suavizado (`SmoothGraphics`) e texto supersampled 3×; conferido no Foundry em zoom 1× e
  2,5× (traço liso, texto nítido, console sem erros).

- Pedido do usuário: UI mais criativa para o alvo marcado, animação desligável e cor ligada à
  do Character Panel; tecla de marcar alvo continua Alt (D35).
- D40: `domain/target-marker.ts` (`markerFrame` com tempo: travamento, anel girando,
  cantos que respiram; `parseCssColor`), `integrations/foundry/target-marker.ts` (camada
  no token, ticker do canvas, etiqueta com distância), `panelPalette()` em
  `integrations/panel/panel-bridge.ts`; ajustes `targetMarker` e `targetAnimation`.
- Validação: `npm run check` exit 0 (217 testes; `check:private` sem vazamento). No Foundry:
  mira com "TARGET · 6 m" (Foundry em inglês); trocar a cor do painel para magenta mudou a mira
  na hora; anel muda de posição entre quadros; ao marcar de novo os cantos começam fora e a
  etiqueta só aparece no fim; com a animação desligada a mira fica parada; console sem erros.
  Restaurado: cor do painel padrão, animação ligada, sem alvos.
- Não testado: prévia de cor arrastando o seletor do painel; como jogador; desempenho com
  muitos alvos.

## Entrega anterior: revisão de regras (2026-11-20)

- Pedido do usuário: revisar código e regras contra o livro. Vários alvos só pelos
  templates de área.
- Revisão das p. 169–189 (docs/RULES.md, "Revisão"; D39): alcance corpo a corpo e do
  agarrão entre as bordas dos tokens (`reachDistance` em `domain/range.ts`); Artes
  Marciais sem ponto na perícia bloqueadas (`no-martial-arts`); aviso de Lesão Crítica
  para quem já estava Mortalmente Ferido e leva dano de ataque (`damageTaken`,
  `mortalCriticalInjury`), detectado pela armadura atravessada porque o sistema trava os
  PV em 0.

Validação:
- Automatizada: `npm run check` exit 0 (212 testes; `check:private` sem vazamento).
- Teste manual real (Foundry, edição pública pela junção): o clique com tecla marca, troca
  e desmarca o alvo sem selecionar; menu mostra a faca "no alcance" contra token 2×2 encostado
  (3 m entre centros); ataque de Artes Marciais sem a perícia recusado com aviso; tiro real
  num PdM com 0 PV mostrou o aviso de Lesão Crítica. Tudo restaurado (PV 40, ablação 0,
  munição 6, token 1×1).
- Não testado: como jogador; agarrão contra token grande.

P-04 (efeitos por tipo de arma): chaves combinadas `evento:tipo+forma` (D38) e sprite com
proporção; conteúdo pessoal só em `private/`. Não testado com o Sequencer.

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

- Decisões D15–D40 aguardam confirmação do usuário em docs/DECISIONS.md.
- Não testados no Foundry: crítico (dois 6) real; arremesso com dano que mostrasse a
  armadura inteira; espingarda com alvo de jogador; explosivo com cobertura; 60 s sem resposta; token não vinculado; dois donos ativos; defesa
  automática dos PdMs em supressão e agarrão; tiro rápido como jogador de outro cliente.
- Limites conhecidos: desfazer não desfaz estados nem fim de agarrão (D20); lesão de perna
  e soltar item são avisos (D21); movimentos especiais de Artes Marciais não feitos; ROF 2
  do corpo a corpo é um ataque por chamada.
- `npm audit`: aviso moderado em `minimatch` via `typescript-eslint` 8.72.2 (ferramenta de
  desenvolvimento); subir junto com o Character Panel.
