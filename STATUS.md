# Estado e passagem de contexto

Atualizado em: 2026-11-18.

## Situação

- E0 a E7 concluídas (E7 em 2026-11-18). Entrada pelo menu do clique direito, pela aba
  "Combate" do Character Panel e por macro/console:
  `game.modules.get("cyberpunk-combat-kit").api` com `attack`, `grapple`,
  `effects.{register, unregister, play}`, `packs.{register, unregister, active}` e
  `quickhacks.{run, list}`.
- Commits locais na `main`: `48847b9` (E0 + E1), `a7c5c6b` (E3), `bdd6f35` (E4 + E2),
  `87b90e8` (E5), `80d35f2` (E6). Sem remoto. E7 no commit seguinte.
- Character Panel: API v1 (E6-01 de lá) commitada lá em `f6e17c4`, sem push nem release.

## Última entrega: E7-01 e E7-02, encaixe no Character Panel (2026-11-18)

Novos: `src/integrations/panel/panel-bridge.ts`, `src/workflows/panel-slots.ts`. Alterados:
`src/domain/menu.ts` (`drawerSections`), `src/workflows/quick-menu.ts` (`menuViewFor`,
`runMenuAction`, `openMenuFor` exportados), `main.ts`, tipos, textos, CSS (`.cck-pslot__*`,
variáveis `--cck-panel-*` no menu), `tests/unit/menu.test.ts`. Detalhe em
docs/ARCHITECTURE.md ("Integração com o Character Panel"); decisão D29.

Validação:
- Automatizada: `npm run check` exit 0 (14 arquivos, 173 testes; 2 novos da aba Combate).
- Teste manual real (Foundry 12.343, CPR v0.92.4, mundo `cyberdeck-hud`, Gamemaster, painel
  0.1.1 com a API v1 em `dist/`):
  1. Com painel: `--cck-panel-accent` igual ao destaque do painel (#22d3ee); fim da barra
     mostrou "Very Heavy Pistol · 6"; dock com atacar e menu; aba "Combate" na linha de abas.
  2. Clique real na aba "Combate" com o PdM marcado: alvo, distância 2 m, armas com DV, mirado
     (cabeça, item, perna), corpo a corpo "in reach". Clique em "Single shot": diálogos nativos
     de ataque e dano, ataque 19 contra DV 13, dano 10, 3 PV no PdM; munição no fim da barra
     passou a 5 sozinha. Dano desfeito pelo card (PV 40).
  3. Painel recolhido: atacar e menu continuam visíveis; menu aberto pelo dock com a borda na
     cor do painel.
  4. Painel desligado no mundo: Combat Kit carrega, sem variável de cor, menu do clique direito
     com o laranja padrão. Painel religado e mundo recarregado.
- Não testado: jogador (personagem atribuído sem token selecionado), troca da cor de destaque
  com o menu aberto, Netrunning pela aba Combate, encaixe em cima, largura estreita.

## Entregas anteriores

E6 (Quickhacks), E5 (pacotes), E2 (menu), E4 (efeitos), E3 (modos, áreas D24, agarrão) e
E0/E1: evidências no histórico do git deste arquivo. Mundo de teste `cyberdeck-hud`: armas de
teste com munição no "CCK Teste — Atirador"; perícias do "NPC Teste (CNH)"; pacotes de teste
em `Data/cck-packs/` (`teste`, `quebrado`, `qh-teste`); chat cheio de cards de teste. Uma aba do
navegador embutido aberta como Gamemaster.

## Próximas tarefas

Estados: `TODO`. Uma tarefa por vez; detalhe em docs/PLAN.md.

| ID | Estado | Entrega | Condição |
|---|---|---|---|
| E8-01 | TODO | API v1 (docs/ARCHITECTURE.md) e `docs/INTEGRATION.md` | Pode começar |
| P-02 | TODO | Pacote pessoal com o conteúdo do PneumaQuickHack (só `private/`) | E5-01 e E6-03 prontas |

## Dependências externas

- Character Panel: `docs/INTEGRATION.md` (E6-02 de lá) ainda não escrito; a E7 daqui usa o contrato descrito no docs/ARCHITECTURE.md de lá.

## Pendências abertas

- Decisões D15–D29 aguardam confirmação do usuário em docs/DECISIONS.md.
- Não testados no Foundry: crítico (dois 6) real; arremesso com dano que mostrasse a
  armadura inteira; espingarda com alvo de jogador; explosivo com cobertura; Artes Marciais
  sem o item de perícia; 60 s sem resposta; token não vinculado; dois donos ativos.
- Limites conhecidos: desfazer não desfaz estados nem fim de agarrão (D20); lesão de perna
  e soltar item são avisos (D21); movimentos especiais de Artes Marciais não feitos; ROF 2
  do corpo a corpo é um ataque por chamada.
- `npm audit`: aviso moderado em `minimatch` via `typescript-eslint` 8.72.2 (ferramenta de
  desenvolvimento); subir junto com o Character Panel.
