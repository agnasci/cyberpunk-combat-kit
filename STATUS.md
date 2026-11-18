# Estado e passagem de contexto

Atualizado em: 2026-11-17.

## Situação

- E0, E1 e E3 concluídas; **E2 (menu do clique direito) pulada a pedido do usuário** e ainda
  pendente. Entrada por macro/console:
  `game.modules.get("cyberpunk-combat-kit").api.attack({weaponId?, mode?, location?, skipDialog?})`
  e `.api.grapple({action})`, com um token seu selecionado e alvo(s) marcado(s).
- Commit `48847b9` (E0 + E1) na `main`, só local; não há remoto nem repositório no GitHub.
  A E3 ainda não foi commitada.

## Última entrega: áreas posicionadas (D24, 2026-11-17)

Pedido do usuário: áreas que se colocam, pegam todos dentro e se apagam sozinhas (ideia do
Pneuma Combat Tools, sem código dele). Novos: `src/integrations/foundry/area-placement.ts`,
`src/ui/placement-hint.ts`. Alterados: `src/domain/area.ts` (faixa do cartucho, círculo,
contém genérico, limite de queda), `src/workflows/area.ts`, `suppressive.ts`,
`attack-steps.ts` (`dvLookup`), `tokens.ts`, `main.ts` (limpa sobras), card (ponto mirado no
lugar do template pendente), textos, CSS, testes.

Validação:
- Automatizada: `npm run check` exit 0 (8 arquivos, 73 testes).
- Teste manual real (Foundry do usuário, mesmo mundo; Runner Teste e Gamemaster em abas;
  cliques do mouse simulados por script no canvas, rolagens com `skipDialog`):
  1. Cartucho: faixa 6 × 6 m apontada para a direita, pegou PdM e NPC; com uma parede entre
     os dois, só o PdM. Esc cancela sem rolar nem criar card.
  2. Explosivo com acerto (18 contra DV 16 a 4 m): um dano (17) para PdM, NPC e o próprio
     atirador, que estava dentro; template apagado ~5 s depois.
  3. Explosivo errado: card sem botão para o jogador; o mestre clicou "Escolher onde caiu",
     a área ficou cinza e recusou o clique fora dos 10 m; dentro, detonou (15) só em quem
     ficou na área; o diálogo de dano nativo apareceu para o mestre.
  4. Supressivo: círculo de 25 m; com a parede, só o PdM recebeu o teste; template apagado.
  5. Desfazer devolveu os PV de todos; parede de teste apagada; munição gasta não reposta.
- Não testado: limpeza de sobras ao abrir o mundo; grade hexagonal ou sem grade; tokens
  maiores que 1 quadrado (só o centro conta).

## Entrega anterior: E3-01 a E3-06 (2026-11-17)

Arquivos novos: `src/domain/modes.ts`, `area.ts`, `grapple.ts`;
`src/integrations/cpr/effect-adapter.ts`; `src/integrations/foundry/grapple-store.ts`;
`src/workflows/attack-steps.ts`, `combat-common.ts`, `area.ts`, `suppressive.ts`,
`grapple.ts`; testes `modes.test.ts` e `area-grapple.test.ts`. Alterados: adaptadores
(snapshot com tipo/munição/modos, rolagens nativas genéricas, dano direto), executor do
mestre (estrangular, derrubar, iniciar/terminar agarrão), pedido de defesa genérico (Evasão,
Concentração, Briga), card com vários alvos e desfazer por alvo, textos em `lang/`.

Validação:
- Automatizada: `npm run check` exit 0 (8 arquivos, 68 testes; typecheck, lint, build e
  guardas de `private/`).
- Teste manual real (2026-11-17, Foundry 12.343 do usuário + CPR v0.92.4, mundo
  `cyberdeck-hud`, edição pública; Gamemaster e Runner Teste em abas do navegador embutido).
  Ataques disparados pela API no console. As respostas de defesa e os diálogos nativos de
  confirmação foram clicados por um script de teste no console de cada aba, exceto o
  "Detonar aqui" e o diálogo de dano do mestre, clicados à mão. Perícias subidas
  temporariamente para forçar acertos.
  1. Tiro mirado: rolagem nativa com −8 e local; cabeça 14 de dano → 28 PV (dobrado pelo
     sistema); perna 15 − SP 7 = 8 PV e aviso de Perna Quebrada.
  2. Automático (fuzil): 27 contra DV 22 da tabela "(Autofire)" → ×4 (limite da arma);
     10 balas gastas; recusado com 9 balas e em pistola.
  3. Cartucho: 15 contra DV 13 em dois alvos; o de REF 8 esquivou (17), o outro tomou 8.
  4. Explosivo com acerto: área de 10 m no alvo; esquiva de 17 contra 24 não bastou; dois
     alvos com dano único (10 e 17); atacante fora da área.
  5. Explosivo errado: card com "Detonar aqui" só para o mestre (o jogador não vê); o mestre
     moveu a área e detonou; só quem ficou dentro tomou dano (23).
  6. Supressivo: 27 contra VON + Concentração 15 e 16 → os dois buscam cobertura; 10 balas.
  7. Arremesso de faca: Atletismo 22 contra "DV Thrown Weapon" 16 a 6 m; desarmado não
     arremessa; faca corpo a corpo a 6 m recusada por alcance.
  8. Briga: 8 − SP 7 = 1 (armadura inteira). Artes Marciais: "Armor Ignored: 50%" no card.
  9. Agarrão: agarrar (22 contra 7) põe flags nos dois tokens e "−2" nos dois atores
     ("Total Mods: −2" nas rolagens seguintes); estrangular 3 vezes (6 PV cada) → inconsciente;
     derrubar → 6 PV, caído, agarrão desfeito; escapar pelo mestre (13 contra 12) desfaz;
     soltar desfaz; desfazer do derrubar devolveu os PV.
- Corrigido durante o teste: o efeito de −2 sem as flags que o CPR exige quebrava qualquer
  rolagem do ator (docs/COMPATIBILITY.md). Rótulos ajustados depois do teste (DV na linha do
  alvo, "ataque" no corpo a corpo, "agarrar"); só o "agarrar" foi visto no Foundry depois.

Mudanças no mundo de teste `cyberdeck-hud`: no "CCK Teste — Atirador", fuzil, espingarda,
lança-granadas, desarmado, Artes Marciais e faca, com munição (fuzil, cartucho, granada AP);
perícias do "NPC Teste (CNH)" criadas e token dele na cena; PV, ablação e estados
restaurados; perícias de teste voltaram aos valores anteriores. Chat cheio de cards de
teste. O mundo segue aberto no Foundry do usuário; o Runner Teste e o Gamemaster seguem
conectados por abas do navegador embutido.

## Próximas tarefas

Estados: `TODO`. Uma tarefa por vez; detalhe em docs/PLAN.md.

| ID | Estado | Entrega | Condição |
|---|---|---|---|
| E2-01 | TODO | Menu no clique direito (D10) com armas e modos (inclui os da E3); ideia do Pneuma (docs/RESEARCH.md) | Pode começar; ouvinte em captura provado na E0-04; bloquear o HUD do mestre no Alt |
| E2-02 | TODO | Medir DV, marcar alvo, mirar | Depois de E2-01 |
| E4-01 | TODO | Motor de cues e eventos | Pode começar em paralelo à E2 |

## Dependências externas

- Character Panel: API v1 (tarefa E6-01 de lá) antes da E7 daqui.

## Pendências abertas

- Decisões D15–D24 aguardam confirmação do usuário em docs/DECISIONS.md.
- Não testados no Foundry: crítico (dois 6) real; arremesso com dano que mostrasse a
  armadura inteira; espingarda com alvo de jogador; explosivo com cobertura; Artes Marciais
  sem o item de perícia; 60 s sem resposta; token não vinculado; dois donos ativos.
- Limites conhecidos: desfazer não desfaz estados nem fim de agarrão (D20); lesão de perna
  e soltar item são avisos (D21); movimentos especiais de Artes Marciais não feitos; ROF 2
  do corpo a corpo é um ataque por chamada.
- `npm audit`: aviso moderado em `minimatch` via `typescript-eslint` 8.72.2 (ferramenta de
  desenvolvimento); subir junto com o Character Panel.
