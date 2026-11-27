# Estado e passagem de contexto

Atualizado em: 2026-11-26.

## Situação

- E0 a E12, F-01, P-02, P-04, P-05, a revisão de regras R-01 e os turnos (D41) concluídos (E12 em 2026-11-26). Última release pública: `v0.2.1` (2026-11-26)
  em https://github.com/agnasci/cyberpunk-combat-kit, com
  `module.json` e `module.zip`. Manifesto:
  `https://github.com/agnasci/cyberpunk-combat-kit/releases/latest/download/module.json`.
- Entrada pelo menu do clique direito, pela aba "Combate" do Character Panel e pela API v1
  (docs/INTEGRATION.md).
- `main` enviado ao GitHub em 2026-11-20 (E10, F-01, ícone dos Quickhacks, chaves combinadas
  de cue, revisão de regras, mira do alvo, correção do Tiro rápido, turnos D41 e D42–D44), publicado na release `v0.1.2`.
- Character Panel: v0.2.0 (2026-11-19) trouxe a API v1, exigida pela integração; v0.2.1
  (2026-11-20) trouxe `setAttention`, exigido pelo destaque de turno (README).

## Última entrega: release v0.2.1 e kit pessoal 0.2.1 (2026-11-26)

- Pedido do usuário: commit, push, release e kit para o amigo.
- Commits `fix: correções do teste da 0.2.0 (E12)` e `chore: release v0.2.1 (beta)`;
  `npm run package` exit 0 (261 testes, sem vazamento); diff conferido sem nomes de arquivos
  pessoais. Tag e release `v0.2.1` com `module.json` e `module.zip`; workflow `release.yml`
  passou; manifesto público devolve 0.2.1 e o zip baixado é idêntico ao `dist/`.
- Edição pessoal 0.2.1-personal em `dist-personal/` (a junção do Foundry aponta para lá; o
  servidor só mostra a versão nova depois de reiniciado). Kit em `.local/para-amigo-0.2.1/`
  (fora do Git): zip de 91 entradas, LEIA-ME com o que mudou na 0.2.1, avisos de licença.
  Não testado no Foundry do amigo.

## Entrega anterior: E12 — correções do teste da 0.2.0 (2026-11-26)

- Pedido do usuário, 7 itens: hover transparente; rajada com poucas balas e som sem visual;
  supressivo com uma bala só; tirar o "piu" do erro e o "pow" do acerto; aviso de iniciativa
  ao iniciar combate; regras de Lesão Crítica; opção de rolar a tabela do sistema.
- Código (D52–D56): `styles/combat-kit.css` e `workflows/panel-slots.ts` (hover opaco,
  `cck-tooltip`); `domain/cues.ts` (âncora `spray`, repetição em procedural, `repeat` até
  20, padrões de rajada/supressivo, sem som em acerto/erro/esquiva); `effects/engine.ts`;
  `fx-audio.ts` (`burst` com 10 disparos); `scripts/lib/aa-convert.mjs` (`extra` com
  `at`/`repeat`/`repeatDelay`); `domain/initiative.ts`, `workflows/initiative-prompt.ts`,
  ajuste `initiativePrompt`; `domain/attack-rules.ts` (`criticalInjuryFor`),
  `domain/gm-request.ts` (op `criticalInjury`), `cpr/injury-adapter.ts`, `gm-executor.ts`,
  `combat-common.ts` (`rollTargetInjury`), `ui/resolution-card.ts` e template, textos.
- Edição pessoal: ajustes do pacote gerado com rajada de 12–14 balas e supressivo de 16–20
  balas em `spray`, alinhados à duração de cada som; pacote gerado de novo e
  `build:personal` feito (a junção continua em `dist-personal/`).
- Validação automatizada: `npm run check` exit 0 (18 arquivos, 261 testes; novo
  `tests/unit/e12-fixes.test.ts`; `check:private` sem vazamento).
- Teste manual real (Foundry 12.343, CPR v0.92.4, `cyberdeck-hud`, Gamemaster, edição
  pessoal):
  1. Tooltip dos botões do painel com fundo sólido e borda, acima do botão, sobre o mapa.
  2. Rajada com o fuzil de assalto (munição Rifle Basic) a 6 quadrados: 12 sprites de bala
     (variante de 60 pés) em 2,9 s com o som de rajada.
  3. Supressivo: 20 balas em direções e distâncias sorteadas em 8,2 s, vistas na tela saindo
     do atirador; padrão procedural (sem pacote, pela API de efeitos): 10 traços espalhados e
     rajada com 10.
  4. `attack.hit`, `attack.miss` (também `melee`) e `attack.dodged`: nenhuma fonte de som
     criada; `attack.critical` ainda toca.
  5. Combate com 3 tokens iniciado: o mestre recebeu o diálogo com os 3 (sem jogador
     conectado); "Rolar iniciativa" deu 25, 23 e 13.
  6. Pistola contra o PdM a 0 PV: aviso "já estava Mortalmente Ferido" e botão da tabela do
     corpo; o clique rolou 2d6 no card nativo, pôs a lesão sorteada na ficha e
     trocou o botão pelo nome. Dados forçados: dois 6 no corpo (+5 do sistema no dano) e tiro
     mirado na cabeça (rolou na tabela da cabeça).
- Restaurado: PdM com 9 PV, sem lesões, na posição 600,500; munição do fuzil 0 e da
  espingarda 4; defesa dos PdMs de volta para "perguntar"; combate de teste apagado. Ficaram
  mensagens de teste no chat e a pistola muito pesada com 8/8.
- Não testado: lembrete de iniciativa como jogador (outro cliente); botão de lesão clicado
  por jogador dono do card; lesão com a regra de duplicadas "reroll"; edição pública inteira
  no Foundry.

## Entrega anterior: release v0.2.0 e kit pessoal para teste (2026-11-23)

- Pedido do usuário: publicar a versão atual e gerar a edição pessoal como pasta para um
  amigo testar.
- `v0.2.0` (beta): versão em `package.json`, `module.json` e README; `npm run package` exit 0
  (252 testes, `check:private` sem vazamento); antes do push, conferido que os commits não
  trazem nomes de arquivos pessoais. Tag e release com `module.json` e `module.zip`; o workflow
  `release.yml` passou e reenviou os dois; o manifesto público devolve 0.2.0 e o zip baixado é
  idêntico ao `dist/`.
- Edição pessoal 0.2.0-personal montada e ativa no Foundry do usuário (servidor reiniciado
  sem mundo aberto; setup mostra 0.2.0-personal). Kit em `.local/para-amigo-0.2.0/` (fora do
  Git): zip para `Data/modules`, LEIA-ME com instalação (JB2A grátis para os vídeos; sem
  Automated Animations) e o que testar, e os avisos de licença. Não testado no Foundry do amigo.

## Entrega anterior: E11 e P-05 — animações de módulos instalados e conversor do Automated Animations (2026-11-23)

- Pedido do usuário: usar no Combat Kit, sem o Automated Animations, a configuração de
  animações e os sons que ele tem (plano pessoal em `private/`).
- E11-01 a E11-05 (código público, D45–D49): `domain/pack.ts` (`requires`, `external`,
  listas, `withActiveModules`), `domain/cues.ts` (opções de sprite e som, FLAC, variantes,
  qualificadores `item-`/`ammo-`, `status.active`, `persistentCues`), `effects/engine.ts`,
  `fx-canvas.ts` (`template`, `attachLoop`, pré-carga), `fx-audio.ts` (início no meio),
  `weapon-adapter.ts` (tipo da munição), `combat-cues.ts`/`area.ts` (qualificadores em
  áreas), `pack-store.ts`/`packs.ts`/`pack-manager.ts` (módulos ativos, aviso), novos
  `workflows/status-fx.ts` e `fx-preload.ts`, ajuste `fxStatus`, textos, CSS.
- E11-06 e E11-07 (D50, D51): `scripts/import-aa.mjs`, `scripts/lib/aa-convert.mjs`,
  `scripts/lib/js-literal.mjs` (lê bancos em JS como dado, sem executar),
  `build-personal.mjs` (`private/packs/*`, `personalPacks`), `check-private.mjs` (varre
  `private/packs` e chaves de `external`).
- P-05 (só `private/`): pacote gerado com 184 efeitos, 55 vídeos do JB2A grátis e 39 sons;
  ajustes manuais num arquivo de ajustes; aviso em `private/NOTICES.md`. O JB2A grátis
  (`JB2A_DnD5e` 0.9.4, baixado com permissão do usuário) foi instalado em `Data/modules`.
- Validação automatizada: `npm run check` exit 0 (16 arquivos de teste, 252 testes; novos
  `e11-fx.test.ts` e `import-aa.test.ts`; `check:private` sem vazamento).
- Teste manual real (Foundry 12.343, CPR v0.92.4, `cyberdeck-hud`, Gamemaster, edição
  pessoal 0.1.1-personal pela junção em `dist-personal/`, servidor reiniciado para ler o
  manifesto):
  1. Os dois pacotes pessoais carregaram e passaram na validação do módulo; o gerenciador
     lista os dois em "Registrados por código".
  2. JB2A desligado: o rifle tocou o traço procedural de reserva e o som da exportação.
  3. JB2A ligado: rifle com "Rifle (Basic)" a 2 m usou a variante de 15 pés (âncora 0,20) e a
     ~11 m a de 60 pés (âncora 0,07), bala vista na tela indo até o alvo; automático tocou o
     som de rajada encaixado; faca (golpe 400×300, âncora 0,375) e desarmado; espingarda
     (disparo e impacto); granada perfurante (projétil até o ponto, pino em FLAC começando em
     1 s, explosão 600×600 = 6 quadrados); EMP (vídeo depois do primeiro carregamento);
     Jack In pelo efeito do cyberdeck.
  4. Ataque real pela API (faca contra o PdM, defesa rolada): som e golpe da exportação,
     acerto, 2 PV; desfeito pelo card (PV 9 de novo).
  5. Caído no PdM: indicador persistente apareceu, seguiu o token ao mover, sumiu ao tirar o
     estado, voltou depois de F5; desligar "Efeitos persistentes" ou "Efeitos visuais" tira na
     hora e religar devolve.
  6. Movimento reduzido: vídeo parado no primeiro quadro e removido depois.
  - A aba do navegador embutido estava como oculta para o navegador; para ver os efeitos,
    `document.hidden` foi sobrescrito só no console daquela aba (o motor não toca em aba
    oculta, de propósito).
- Depois, a pedido do usuário (2026-11-23), a junção ficou em `dist-personal/` (edição
  pessoal ativa no Foundry dele; voltar para `dist/` para testar a pública). Antes disso:
  Foundry reiniciado sem mundo aberto (como estava), PdM sem Caído e na posição 600,500. Ficaram: JB2A instalado e ativo no
  `cyberdeck-hud`; mensagens de teste no chat.
- Não testado: como jogador e em dois clientes; JB2A Patreon; granadas especiais (casadas
  pelo nome do item, que pode não bater); armas de marca com nome próprio do compêndio;
  quadro parado com movimento reduzido mostra o primeiro quadro, que em balas é vazio.

## Entrega anterior: usabilidade — desfazer estados, Death Save dos PdMs, destaque de turno (2026-11-20)

- Pedido do usuário (lista de ideias de usabilidade, itens 9, 11 e 14): D42 (desfazer também
  os estados que a ação ligou), D43 (botão "Death Save dos PdMs" no tracker, mestre) e D44
  (borda do Character Panel pulsa no turno do personagem exibido; ajuste de cliente
  `turnPanelHighlight`).
- Arquivos: `domain/gm-request.ts` (`statuses`, validação, `isUndoable`),
  `integrations/foundry/grapple-store.ts` (`setStatus` devolve o que ligou, `clearStatuses`),
  `gm-executor.ts`, `net-store.ts`, `cpr/damage-adapter.ts`, `workflows/combat-common.ts`,
  `quickhack.ts`; novos `domain/death-save.ts`, `ui/death-save-button.ts`,
  `workflows/npc-death-saves.ts`, `workflows/turn-attention.ts`; `cpr/attack-adapter.ts`
  (`rollDeathSave`), `cpr/weapon-adapter.ts` (`isMortallyWounded`), `panel/panel-bridge.ts`
  (`panelSubject`, `setPanelAttention`), `settings.ts`, `main.ts`, tipos, `lang/*.json`, CSS,
  testes (`gm-request`, `death-save`), README, DECISIONS.
- Validação: `npm run check` exit 0 (227 testes; `check:private` sem vazamento). Manual real
  (Foundry 12.343, `cyberdeck-hud`, Gamemaster, com o Character Panel local que já tem
  `setAttention`): destaque ligou no turno do Atirador exibido, desligou no do PdM e seguiu a
  troca de token; botão do tracker rolou um único Death Save (NPC Teste, mortalmente ferido;
  o PdM grave e o PJ ficaram de fora), card nativo "Success" e penalidade 0 → 1; agarrar e
  arremessar o PdM tirou 6 PV e ligou Caído, com `statuses: ["prone"]` no card; Desfazer
  devolveu 9 PV e tirou Caído. Botão ganhou escopo `#combat` porque o CSS do sistema
  (`#ui-right button`) pintava de claro. Console sem erros dos módulos.
- Restaurado: ajustes (`enforce`, `ask`), penalidade do NPC 0, combate apagado, sem alvos nem
  agarrão. **O token "CCK Teste — PdM" ficou ao lado do Atirador** (posição antiga não guardada).
- Não testado: como jogador (destaque no cliente do dono); desfazer de Inconsciente
  (estrangulamento) e de estado de Quickhack; PdM com Death Save falho; tracker destacado.
- Character Panel: `setAttention` publicado na release v0.2.1 de lá (2026-11-20).

## Entrega anterior: turnos e orçamento de ações (2026-11-20)

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

Estados: `TODO`. Uma tarefa por vez; detalhe em docs/PLAN.md.

| ID | Estado | Entrega | Condição |
|---|---|---|---|
| P-03 | TODO | Compêndio pessoal (CEMK): armas e itens com dados mecânicos | Bloqueada: dados mecânicos vêm do livro do usuário (D14) |

## Dependências externas

- Character Panel: `docs/INTEGRATION.md` (E6-02 de lá) ainda não escrito; a E7 daqui usa o contrato descrito no docs/ARCHITECTURE.md de lá.

## Pendências abertas

- Página do pacote em foundryvtt.com (conta do usuário, manual) com o aviso da Homebrew
  Content Policy: item que falta do checklist do docs/LEGAL.md.

- Decisões D15–D41, D45–D51 e D55 aguardam confirmação do usuário em docs/DECISIONS.md.
- Não testados no Foundry: crítico (dois 6) com dados naturais (só forçados); arremesso com dano que mostrasse a
  armadura inteira; espingarda com alvo de jogador; explosivo com cobertura; 60 s sem resposta; token não vinculado; dois donos ativos; defesa
  automática dos PdMs em supressão e agarrão; tiro rápido como jogador de outro cliente.
- Limites conhecidos: desfazer não desfaz o fim do agarrão (D20, D42) nem a Lesão Crítica rolada (D55); lesão de perna
  e soltar item são avisos (D21); movimentos especiais de Artes Marciais não feitos; ROF 2
  do corpo a corpo é um ataque por chamada.
- `npm audit`: aviso moderado em `minimatch` via `typescript-eslint` 8.72.2 (ferramenta de
  desenvolvimento); subir junto com o Character Panel.
