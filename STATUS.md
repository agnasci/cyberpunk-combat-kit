# Estado e passagem de contexto

Atualizado em: 2026-11-17.

## Situação

- E0 e E1 concluídas. O módulo ataca com tiro único à distância e com arma branca, pede
  defesa ao dono do alvo, aplica dano pelo mestre e desfaz. Ainda sem menu (E2): a entrada
  é `game.modules.get("cyberpunk-combat-kit").api.attack({weaponId?, skipDialog?})` com um
  token seu selecionado e um alvo marcado.
- Nada commitado da E0 nem da E1 (só o commit inicial de documentação); sem remoto.

## Última entrega: E1-01 a E1-04 (2026-11-17)

- **E1-01** — `src/domain/range.ts`, `src/domain/attack-rules.ts` e testes. Pendências de
  leitura do docs/RULES.md resolvidas no livro (REF 8, empate, metade da armadura
  arredondada para cima, crítico com dois 6) e conferidas contra o `_applyDamage`.
- **E1-02** — `src/integrations/cpr/weapon-adapter.ts` (snapshots, tabela de DV do
  sistema, PV e ablação), `attack-adapter.ts` (ataque, Evasão e dano pelo pipeline nativo,
  com LUCK), `damage-adapter.ts`; fixtures em `tests/fixtures/cpr-actors.ts`.
- **E1-03** — `src/domain/gm-request.ts` (validação de pedidos, escolha do mestre e de quem
  defende), `src/integrations/foundry/socket.ts`, `gm-executor.ts`, `users.ts`, `tokens.ts`.
- **E1-04** — `src/workflows/attack.ts`, `src/workflows/defense.ts`,
  `src/ui/defense-prompt.ts`, `src/ui/resolution-card.ts`, `templates/resolution-card.hbs`,
  `styles/combat-kit.css`, `src/domain/routing.ts`, `src/api/index.ts`, textos em `lang/`.

Validação:
- Automatizada: `npm run check` exit 0 (7 arquivos, 43 testes; typecheck, lint, build e
  guardas de `private/`).
- Teste manual real (2026-11-17, Foundry 12.343 do usuário + CPR v0.92.4, mundo
  `cyberdeck-hud`, edição pública 0.0.1; Gamemaster e Runner Teste em abas do navegador
  embutido; ataque disparado pela API no console, diálogos clicados de verdade):
  1. Jogador → PdM a 20 m: ataque 14 contra DV 20, erro; munição 8 → 7; PdM com REF 6 não
     recebeu pedido de esquiva.
  2. Jogador → PdM a 6 m: 25 contra DV 13, acerto; dano 13 − SP 7 = 6 PV aplicados pelo
     mestre (40 → 34, ablação 1). "Desfazer dano" clicado pelo jogador: 40 PV, ablação 0,
     card "Dano desfeito".
  3. PdM com REF 8: o mestre recebeu "Esquivar", clicou, rolou Evasão no diálogo nativo
     (17); ataque 18 acertou; 6 PV aplicados.
  4. PdM (mestre) → personagem do jogador, corpo a corpo: o jogador recebeu "Rolar defesa"
     e rolou Evasão no diálogo nativo (26 contra 14, erro; depois 14 contra 24, acerto).
     Card de dano nativo com `ignoreArmorPercent` 50; o dano 3 não passou da armadura
     reduzida (SP 7 → 4). Conta conferida à parte no console: 6 contra SP 7 → 2 PV.
  5. Sem mestre conectado: ataque recusado com aviso, sem rolagem e sem gastar munição.
- Corrigido durante o teste: distância medida pelo centro animado do token (7,5 m em vez de
  6 m) e botão "Desfazer" em card sem mudança. A correção do botão foi conferida só pela
  renderização do template no Foundry, não num ataque novo.

Mudanças no mundo de teste `cyberdeck-hud`: perícias (Melee Weapon 3, Evasion 2) e uma
"Medium Melee" no "CCK Teste — PdM"; colete Kevlar no "CCK Teste — Atirador"; Handgun 4 e
Evasion 3 no atirador; pente da pistola em 4; PV de todos em 40; cards de teste no chat.
O mundo continua ativo no Foundry que o usuário abriu, com o Runner Teste conectado pela aba
do navegador embutido.

## Próximas tarefas

Estados: `TODO`. Uma tarefa por vez; detalhe em docs/PLAN.md.

| ID | Estado | Entrega | Condição |
|---|---|---|---|
| E2-01 | TODO | Menu no clique direito (D10) com armas equipadas e modos | Pode começar; usar o ouvinte em captura provado na E0-04 e bloquear o HUD do mestre no Alt |
| E2-02 | TODO | Medir DV, marcar alvo, mirar | Depois de E2-01 |

## Dependências externas

- Character Panel: API v1 (tarefa E6-01 de lá) antes da E7 daqui.

## Pendências abertas

- D15 (roteamento padrão), D16 (defesa e tempo limite) e D17 (`api.attack` antecipado)
  aguardam confirmação do usuário em docs/DECISIONS.md.
- Não testados no Foundry: crítico (dois 6) num ataque real, pedido de defesa sem resposta
  (60 s), personagem com dois donos ativos, token não vinculado (ator sintético), cena com
  outra unidade de grade.
- Nada commitado da E0/E1: commit fica a pedido do usuário.
- `npm audit`: aviso moderado em `minimatch` via `typescript-eslint` 8.72.2 (ferramenta de
  desenvolvimento); subir junto com o Character Panel.
- Template criado pelo jogador: conferir na E3 (áreas).
