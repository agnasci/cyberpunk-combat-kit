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

## Última entrega: E9-01 a E9-05, correções do teste da beta (2026-11-20)

Origem: relatos de um testador da 0.1.0 (docs/PLAN.md, E9). Versão local subiu para 0.1.1
(`package.json`, `module.json`, lockfile, README); `release/module.zip` gerado, nada
publicado. Decisões D32–D35.

- E9-01: supressivo vale até 25 m no menu (`src/domain/menu.ts`); esquiva à distância só
  quando o ataque passa a DV (`dodgeOffered` em `attack-rules.ts`, `workflows/attack.ts`).
- E9-02: pente máximo 0 = não usa munição (`weapon-adapter.ts`, campo `magazineMax`);
  `thrownWeapon` arma branca só arremessa (`thrown-only` em `modes.ts`); `preferredWeapon`
  escolhe a primeira equipada pronta; botão "atacar o alvo marcado" do painel abre a escolha de
  arma quando há mais de uma equipada (`panel-slots.ts`).
- E9-03: Alt + clique esquerdo marca só este alvo ou desmarca (`token-click.ts`, ajuste de
  cliente `targetModifier`, `targetToggles` no domínio).
- E9-04: "Recarregar" no menu (por arma e no próprio token) e no painel, pelo `reload()`
  nativo (`reloadWeapon`, `reloadFor` em `quick-menu.ts`).
- E9-05: rodadas seguidas de estrangulamento no card (`chokeStreak` no resultado do mestre,
  `resolution-card.hbs`) e no menu (`activeChokeStreak`).
- Também: `.local/` e `foundry-data/` fora do ESLint/Prettier; actions do workflow em v5
  (pendência do Node 20); docs/COMPATIBILITY.md com o comportamento de `thrownWeapon` e
  `reload()`; README com os atalhos.

Validação:
- Automatizada: `npm run package` exit 0 (`check` com 15 arquivos e 200 testes, 14 novos;
  guardas sem vazamento; zip com 9 arquivos, v0.1.1).
- Teste manual real (Foundry 12.343, CPR v0.92.4, mundo `cyberdeck-hud`, Gamemaster, com o
  Character Panel ativo):
  1. Supressivo habilitado no menu a 6 m (antes "fora de alcance").
  2. Esquiva: 15 contra DV 13 pediu esquiva; 4 e 14 contra DV 25 erraram sem pedido.
  3. Molotov do compêndio (`thrownWeapon` à distância, pente 0/0): acertou e aplicou dano;
     o CPR mostrou o aviso "*CLICK*" dele, sem bloquear.
  4. Kendachi Mono-Star (`thrownWeapon` arma branca): "simples" recusado com aviso;
     arremesso rolou e resolveu.
  5. Painel: o botão de mira abriu o menu com as 9 armas; Assault Rifle → Recarregar levou o
     pente de 5 a 25 (caixa 25 → 5); botão de recarga do painel na pistola sem munição deu o
     aviso do sistema e, com uma caixa de teste, abriu "Select Ammo" e encheu 6 → 8; o botão
     some com o pente cheio.
  6. Alt + clique esquerdo no NPC trocou o alvo (só ele) e, de novo, desmarcou; seleção intacta.
  7. Agarrão no PdM e dois estrangulamentos: cards com "Rodadas seguidas: 1/3" e "2/3"; menu
     do PdM com "estrangulamento 2/3 rodadas" em Estrangular.
  Tudo desfeito: danos pelos cards, agarrão solto, itens de teste apagados, munição como
  antes; atores de teste com PV 40/40. A limpeza clicou também botões de cards antigos de
  11-18 (já constavam desfeitos); nenhum ator de teste mudou.
- Não testados: estrangulamento com combate ativo (zerar a contagem entre rodadas está só nos
  testes unitários); Alt + clique como jogador; recarga em arma de um ator de outro dono; o
  disparo supressivo em si.
- Limite: o aviso "*CLICK*" do sistema em arremessáveis à distância e o "No Token(s)
  targeted!" ao atacar pela API sem alvo marcado vêm do CPR; não dá para tirar sem mexer nele.

## Entregas anteriores

E8 (API v1 e beta 0.1.0), E7 (painel), E6 (Quickhacks), E5 (pacotes), E2 (menu), E4
(efeitos), E3 (modos, áreas D24, agarrão) e E0/E1: evidências no histórico do git deste arquivo. Mundo de teste
`cyberdeck-hud`: armas de teste com munição no "CCK Teste — Atirador"; perícias do "NPC Teste
(CNH)"; pacotes de teste em `Data/cck-packs/` (`teste`, `quebrado`, `qh-teste`); chat cheio de
cards de teste. Uma aba do navegador embutido aberta como Gamemaster.

## Próximas tarefas

Estados: `TODO`, `EM ANDAMENTO`. Uma tarefa por vez; detalhe em docs/PLAN.md.

| ID | Estado | Entrega | Condição |
|---|---|---|---|
| E9-06 | TODO | Release 0.1.1 | Versão e pacote prontos; falta commit, tag, push e release a pedido do usuário |
| E10 | TODO | Refino visual no estilo do Character Panel e do Netrunner HUD | Depois da E9 |
| P-02 | EM ANDAMENTO | Pacote pessoal com o conteúdo do PneumaQuickHack (só `private/`) | Montado e validado pelo `packs.register` em 2026-11-19; falta carregar `dist-personal/` no Foundry (reinício do servidor) e rodar o Netrunning completo com ele |

## Dependências externas

- Character Panel: `docs/INTEGRATION.md` (E6-02 de lá) ainda não escrito; a E7 daqui usa o contrato descrito no docs/ARCHITECTURE.md de lá.

## Pendências abertas

- Página do pacote em foundryvtt.com (conta do usuário, manual) com o aviso da Homebrew
  Content Policy: item que falta do checklist do docs/LEGAL.md.

- Decisões D15–D35 aguardam confirmação do usuário em docs/DECISIONS.md.
- Não testados no Foundry: crítico (dois 6) real; arremesso com dano que mostrasse a
  armadura inteira; espingarda com alvo de jogador; explosivo com cobertura; Artes Marciais
  sem o item de perícia; 60 s sem resposta; token não vinculado; dois donos ativos.
- Limites conhecidos: desfazer não desfaz estados nem fim de agarrão (D20); lesão de perna
  e soltar item são avisos (D21); movimentos especiais de Artes Marciais não feitos; ROF 2
  do corpo a corpo é um ataque por chamada.
- `npm audit`: aviso moderado em `minimatch` via `typescript-eslint` 8.72.2 (ferramenta de
  desenvolvimento); subir junto com o Character Panel.
