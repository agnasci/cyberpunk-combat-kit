# Estado e passagem de contexto

Atualizado em: 2026-11-19.

## Situação

- E0 a E8 concluídas (2026-11-19). Beta 0.1.0 publicada a pedido do usuário:
  https://github.com/agnasci/cyberpunk-combat-kit (público), release `v0.1.0` com
  `module.json` e `module.zip`. Manifesto:
  `https://github.com/agnasci/cyberpunk-combat-kit/releases/latest/download/module.json`.
- Entrada pelo menu do clique direito, pela aba "Combate" do Character Panel e pela API v1
  (docs/INTEGRATION.md).
- `main` em `origin` (GitHub) a partir de `b98fd85` (E8); release feita da tag `v0.1.0`.
- Character Panel: API v1 commitada lá em `f6e17c4`, sem push nem release.

## Última entrega: E8-01 API v1 e E8-02 beta 0.1.0 publicada (2026-11-19)

Novos: `src/domain/api-input.ts`, `src/workflows/announce.ts`, `src/workflows/direct-damage.ts`,
`tests/unit/api-input.test.ts`, `docs/INTEGRATION.md`, `scripts/package.mjs`,
`.github/workflows/release.yml`. Alterados: `src/api/index.ts` (`applyDamage`, congelado),
`src/main.ts` (`cckReady`), `src/workflows/attack.ts` e `combat-common.ts` (`attacker`,
`target`, anúncio de dano), `src/integrations/foundry/tokens.ts` (`tokenFromRef`, `ownedToken`,
`chosenTarget`), fluxos que postam card (por `postResolution`), textos, `package.json` e
`module.json` (0.1.0, `manifest`, `download`, `url`, `bugs`), `.gitignore` (`release/`), docs
(ARCHITECTURE, DEVELOPMENT, README, AGENTS; decisões D30 e D31).

Validação:
- Automatizada: `npm run package` exit 0 (`check` com 15 arquivos e 186 testes, 13 novos de
  `api-input`; guardas de `private/` sem vazamento; `release/module.zip` com 9 arquivos).
- Zip conferido: aberto pelo .NET (`ZipFile`), extraído com `Expand-Archive` e `diff -r` contra
  `dist/` idêntico; `module.json` de dentro com versão 0.1.0.
- Teste manual real (Foundry 12.343, CPR v0.92.4, mundo `cyberdeck-hud`, Gamemaster, pelo
  console e por uma Macro de verdade):
  1. `api.version` 1, objeto congelado, membros `attack`, `applyDamage`, `grapple`, `effects`,
     `packs`, `quickhacks`.
  2. Sem token controlado nem alvo: `applyDamage` com `location: "leg"` devolveu
     `bad-location`; sem `target` devolveu `no-target`; 9 de dano no PdM (SP 7) tirou 2 PV e
     1 de armadura, card "Armadilha · damage" com desfazer, hook `cckDamageApplied` (`direct`).
  3. `attack({attacker, target, weaponId, mode: "single", skipDialog: true})` sem nada
     selecionado: acerto 18, 10 PV, hooks `cckDamageApplied` (`attack`) e `cckAttackResolved`.
  4. Macro de exemplo do docs/INTEGRATION.md criada como Macro de script: 1ª execução errou
     (hook com `miss`, sem dano extra); 2ª acertou (24, dano 13, 6 PV) e aplicou 2 de
     "Sangramento" sem armadura (PV 32). Tudo desfeito pelos cards (PV 40, ablação 0), macro
     apagada, munição da pistola de teste de volta a 6.
- Só por inspeção: `cckReady` (o hook dispara no `ready`, antes de o console poder ouvir);
  `cckQuickhackResolved` (mesmo caminho de `postResolution`, Quickhacks desligados no mundo).
- Checklist do docs/LEGAL.md: `check` com guardas ok; pacote só de `dist/`, listado e conferido;
  busca por nomes de Quickhacks oficiais no repositório sem resultados (texto de livro: só
  inspeção, docs/RULES.md é resumo próprio); nenhum trecho adaptado nem asset de terceiros,
  então `THIRD_PARTY_NOTICES.md` não é necessário; aviso da Homebrew Content Policy no README
  e no `module.json` (página do pacote no Foundry ainda não existe); todos os commits com o
  noreply do GitHub.
- Publicação (E8-02): antes do push, histórico conferido sem nenhum caminho de `private/`,
  `dist-personal/`, `dist/` ou `release/` e com autor/committer só no noreply. Repositório
  criado com `gh repo create --public --push`; release `v0.1.0` (não marcada como pré-release,
  para o `latest` do manifesto funcionar). O `module.json` baixado pela URL do manifesto tem
  versão 0.1.0 e o `download` certo; o zip baixado era idêntico ao local. O workflow
  `release.yml` rodou no GitHub com sucesso (verificação da tag, `npm run package`, reenvio dos
  arquivos); o zip refeito pelo GitHub, extraído, é idêntico ao `dist/` local.
- Não testado: instalar pelo manifesto num Foundry (a instalação local é a junção para
  `dist/`, não foi trocada); hooks em outro cliente; jogador chamando a API.

## Entregas anteriores

E7 (painel), E6 (Quickhacks), E5 (pacotes), E2 (menu), E4 (efeitos), E3 (modos, áreas D24,
agarrão) e E0/E1: evidências no histórico do git deste arquivo. Mundo de teste
`cyberdeck-hud`: armas de teste com munição no "CCK Teste — Atirador"; perícias do "NPC Teste
(CNH)"; pacotes de teste em `Data/cck-packs/` (`teste`, `quebrado`, `qh-teste`); chat cheio de
cards de teste. Uma aba do navegador embutido aberta como Gamemaster.

## Próximas tarefas

Estados: `TODO`. Uma tarefa por vez; detalhe em docs/PLAN.md.

| ID | Estado | Entrega | Condição |
|---|---|---|---|
| P-02 | TODO | Pacote pessoal com o conteúdo do PneumaQuickHack (só `private/`) | E5-01 e E6-03 prontas |

## Dependências externas

- Character Panel: `docs/INTEGRATION.md` (E6-02 de lá) ainda não escrito; a E7 daqui usa o contrato descrito no docs/ARCHITECTURE.md de lá.

## Pendências abertas

- Página do pacote em foundryvtt.com (conta do usuário, manual) com o aviso da Homebrew
  Content Policy: item que falta do checklist do docs/LEGAL.md.
- Workflow: GitHub avisou que `actions/checkout@v4` e `actions/setup-node@v4` usam Node 20
  (depreciado; rodaram forçados em Node 24). Subir as versões das actions na próxima release.

- Decisões D15–D31 aguardam confirmação do usuário em docs/DECISIONS.md.
- Não testados no Foundry: crítico (dois 6) real; arremesso com dano que mostrasse a
  armadura inteira; espingarda com alvo de jogador; explosivo com cobertura; Artes Marciais
  sem o item de perícia; 60 s sem resposta; token não vinculado; dois donos ativos.
- Limites conhecidos: desfazer não desfaz estados nem fim de agarrão (D20); lesão de perna
  e soltar item são avisos (D21); movimentos especiais de Artes Marciais não feitos; ROF 2
  do corpo a corpo é um ataque por chamada.
- `npm audit`: aviso moderado em `minimatch` via `typescript-eslint` 8.72.2 (ferramenta de
  desenvolvimento); subir junto com o Character Panel.
