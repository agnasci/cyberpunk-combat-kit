# Estado e passagem de contexto

Atualizado em: 2026-11-18.

## Situação

- E0 a E6 concluídas (E6 em 2026-11-18). Entrada pelo menu do clique direito e por
  macro/console: `game.modules.get("cyberpunk-combat-kit").api` com `attack`, `grapple`,
  `effects.{register, unregister, play}`, `packs.{register, unregister, active}` e
  `quickhacks.{run, list}`.
- Commits locais na `main`: `48847b9` (E0 + E1), `a7c5c6b` (E3), `bdd6f35` (E4 + E2),
  `87b90e8` (E5). Sem remoto nem repositório no GitHub. E6 no commit seguinte.

## Última entrega: E6-01 a E6-03, Quickhacks (2026-11-18)

Regras conferidas no CEMK (p. 16–17 e 25–26) e no livro base (p. 197), resumidas em
docs/RULES.md §8. Novos: `src/domain/quickhack.ts`, `src/integrations/cpr/net-adapter.ts`,
`src/integrations/foundry/net-store.ts`, `src/workflows/quickhack.ts`,
`tests/unit/quickhack.test.ts`, `tests/unit/net-adapter.test.ts`. Alterados: `pack.ts`
(efeito de Quickhack com parâmetros, `alerts`, `requiresUnaware`), `menu.ts` e
`quick-menu.ts` (grupo Netrunning), `gm-request.ts` e `gm-executor.ts` (operações `net*`),
`defense.ts` (VON e Interface como resposta), `attack-adapter.ts` (`rollRole`, `rollStat`),
`resolution-card.ts` (resultados de rede, rótulos, card para lista de usuários),
`settings.ts` (ajustes `quickhacks`, `neuroportNames`, `selfIceNames`), cues padrão de
`quickhack.*`, API, tipos, textos. Detalhe em docs/ARCHITECTURE.md ("Quickhacks (R09)");
decisão D28.

Validação:
- Automatizada: `npm run check` exit 0 (14 arquivos, 171 testes; 31 novos: alcance,
  firewall, Neuroport, Breach, nível por rank, um por alvo por turno, bloqueio de 60 min,
  alerta, roteamento, duração, estado salvo, pedidos ao mestre, menu, efeitos do pacote,
  peças no ator).
- Teste manual real (Foundry 12.343, CPR v0.92.4, mundo `cyberdeck-hud`, Gamemaster, idioma
  en). Pacote fictício `Data/cck-packs/qh-teste` (seis Quickhacks de teste: dano, dano
  contínuo, condição, lesão, conduzido silencioso e nível 5). Netrunner "CNH Teste —
  Netrunner" (Interface 4) contra "CCK Teste — PdM" com Neuroport e um Self-ICE de teste.
  1. Desligado: `api.quickhacks.run` avisa "Quickhacks are off"; nenhum hook de turno.
  2. Ligado: Alt + clique direito no PdM → "Netrunning · 3 NET Actions per turn" → Jack In
     pelo mouse: diálogo nativo "Jack In" (rank 4), pedido de defesa e diálogo de VON do PdM;
     12 contra 10 → "Connected, target unaware"; card sussurrado ao mestre e donos do
     Netrunner; flag gravada no token do alvo.
  3. Quickhack antes do Breach recusado; Breach DV6 vencido. Nível 5 recusado (rank 4).
     Silencioso com sucesso: alvo continua sem saber. Dano 2d6: 11 direto nos PV (SP 7
     ignorado), alvo passa a saber; o silencioso que exige alvo sem saber passa a ser
     recusado. "Undo damage" pelo card devolveu os PV.
  4. Condição `prone` aplicada; lesão "Whiplash" copiada do compêndio do sistema.
  5. Em combate: segundo Quickhack na mesma rodada recusado; condição com 2 rodadas sumiu na
     rodada 3; dano contínuo 1d6 = 4 no fim do turno do PdM, card só para o mestre.
  6. Force Out do PdM (Concentração 17 contra Interface 16): ligação removida e bloqueio até
     `worldTime` 3600; Jack In recusado; depois de `game.time.advance(3600)` liberado.
  7. Saída do alcance com animação: a 60 m a ligação caiu com bloqueio; dentro do alcance
     ficou.
  8. Menu ligado: Breach com DV, Quickhacks ordenados por nível com o motivo de cada
     bloqueio, Jack Out pelo teclado ("disconnected from").
  9. Mundo deixado como estava: Quickhacks desligados, lista de pacotes vazia, combate,
     token e cyberware de teste apagados, PV 40, `worldTime` 0. A pasta `qh-teste` ficou em
     `Data/cck-packs/`.
- Corrigido no teste: cyberware só conta instalado pela lista do ator (`isInstalledInActor`);
  posição final do token vem do `changes` (o documento anima); card repetia "Jack In · Jack
  In" e mostrava "Range DV".
- Não testado: dois clientes (jogador Netrunner contra PdM do mestre, e mestre contra
  personagem de jogador respondendo VON/Interface), alvo Netrunner (pula o teste),
  firewall com Interface 1–2, Force Out pelo menu (só pela API), alvo morto, textos em
  pt-BR na tela, conteúdo pessoal (P-02).

## Entregas anteriores

E5 (pacotes), E2 (menu), E4 (efeitos), E3 (modos, áreas D24, agarrão) e E0/E1: evidências no
histórico do git deste arquivo. Mundo de teste `cyberdeck-hud`: armas de teste com munição
no "CCK Teste — Atirador"; perícias do "NPC Teste (CNH)" e token dele na cena; chat cheio de
cards de teste. Uma aba do navegador embutido aberta como Gamemaster.

## Próximas tarefas

Estados: `TODO`, `BLOQUEADA`. Uma tarefa por vez; detalhe em docs/PLAN.md.

| ID | Estado | Entrega | Condição |
|---|---|---|---|
| E8-01 | TODO | API v1 (docs/ARCHITECTURE.md) e `docs/INTEGRATION.md` | Pode começar |
| P-02 | TODO | Pacote pessoal com o conteúdo do PneumaQuickHack (só `private/`) | E5-01 e E6-03 prontas |
| E7-01 | BLOQUEADA | Ponte com o Character Panel | API v1 do painel (E6-01 de lá) |

## Dependências externas

- Character Panel: API v1 (tarefa E6-01 de lá) antes da E7 daqui.

## Pendências abertas

- Decisões D15–D28 aguardam confirmação do usuário em docs/DECISIONS.md.
- Não testados no Foundry: crítico (dois 6) real; arremesso com dano que mostrasse a
  armadura inteira; espingarda com alvo de jogador; explosivo com cobertura; Artes Marciais
  sem o item de perícia; 60 s sem resposta; token não vinculado; dois donos ativos.
- Limites conhecidos: desfazer não desfaz estados nem fim de agarrão (D20); lesão de perna
  e soltar item são avisos (D21); movimentos especiais de Artes Marciais não feitos; ROF 2
  do corpo a corpo é um ataque por chamada.
- `npm audit`: aviso moderado em `minimatch` via `typescript-eslint` 8.72.2 (ferramenta de
  desenvolvimento); subir junto com o Character Panel.
