# Estado e passagem de contexto

Atualizado em: 2026-11-18.

## Situação

- E0 a E5 concluídas (E5 em 2026-11-18). Entrada pelo menu do clique direito e por
  macro/console: `game.modules.get("cyberpunk-combat-kit").api` com `attack`, `grapple`,
  `effects.{register, unregister, play}` e `packs.{register, unregister, active}`.
- Commits locais na `main`: `48847b9` (E0 + E1), `a7c5c6b` (E3), `bdd6f35` (E4 + E2). Sem
  remoto nem repositório no GitHub. **E5 ainda não commitada.**

## Última entrega: E5-01 a E5-03, pacotes de conteúdo (2026-11-18)

Novos: `src/domain/pack.ts`, `src/domain/overrides.ts`, `src/effects/packs.ts`,
`src/integrations/foundry/pack-store.ts`, `src/ui/pack-manager.ts`, `src/ui/cue-editor.ts`,
`tests/unit/pack.test.ts`, `tests/unit/overrides.test.ts`. Alterados: `engine.ts` (camadas
associação → pacotes → código → padrão), `settings.ts` (`settingsMenuType`), `main.ts`
(cards antes dos menus no `init`), API, tipos, textos (inclui nomes dos eventos), CSS,
`scripts/build-personal.mjs` (flag `personalPack`). Detalhe em docs/EFFECTS.md ("Como ficou
na E5"); decisão D27.

Validação:
- Automatizada: `npm run check` exit 0 (12 arquivos, 140 testes; 36 novos de pacotes e
  associações: caminhos maliciosos, tipos proibidos, chaves inválidas, limites, ordem).
- `build:personal` com cópia temporária de `private.example/` (apagada depois): manifesto com
  `flags.personalPack`, sem `manifest`, pasta `personal/` copiada.
- Teste manual real (Foundry 12.343, CPR v0.92.4, mundo `cyberdeck-hud`, Gamemaster, idioma
  en). Pacotes de teste criados em `Data/cck-packs/`: `teste` (som `notify.wav` e ícone
  `fire.svg` do próprio Foundry) e `quebrado` (erros de propósito).
  1. Configurar ajustes → "Manage packs" → "Add folder…" → FilePicker (caminho digitado e
     duplo clique, "Select Directory") em `cck-packs/quebrado`: cinco erros listados, caixa
     desligada e bloqueada. `cck-packs/teste`: resumo "Pacote de teste (teste 1.0.0) · 2
     effects", ligado. Salvar pelo mouse: ajuste gravado e pacote ativo sem F5.
  2. `api.effects.play(attack.hit)`: tocou o som do pacote (`hit.wav`, volume 0,6 × 0,7) e o
     sprite no alvo (sumiu no fim), no lugar do efeito padrão.
  3. F5: pacote continuou ativo.
  4. "Edit effects": 24 linhas; "Hit" → Silence; som de "Miss" escolhido no FilePicker em
     Core Data (`sounds/lock.wav`). Salvo: acerto sem visual nem som; erro com o visual padrão
     e `lock.wav` no lugar do som sintetizado. "Restore all" pelo mouse: associações vazias e
     acerto voltou ao pacote.
  5. `api.packs.register`: manifesto com URL externa recusado (`bad-asset-path`); válido
     entra em `active()` e sai com `unregister`.
  6. Mundo deixado como estava: lista de pacotes e associações vazias (as pastas de teste
     ficaram em `Data/cck-packs/`).
- Corrigido no teste: `registerMenu` com classe simples lançava erro e cortava o resto do
  `init` (cards de resolução sem ouvintes); botões do editor escondidos pela altura fixa;
  FilePicker recusava sons do núcleo; barra de rolagem horizontal no editor.
- Não testado: propagação das mudanças a um segundo cliente (as abas do navegador embutido
  compartilham o cookie de sessão; o `onChange` de ajuste de mundo é do Foundry); pacote
  pessoal carregado no Foundry (a junção aponta para `dist/`); sprite `webm` e sons de pacote
  por fluxo real de ataque (só pela API); textos em pt-BR na tela; reordenar pelo botão de
  subir.

## Entregas anteriores

E2 (menu), E4 (efeitos), E3 (modos, áreas posicionadas D24, agarrão) e E0/E1: evidências no
histórico do git deste arquivo. Mundo de teste `cyberdeck-hud`: armas de teste com munição no
"CCK Teste — Atirador"; perícias do "NPC Teste (CNH)" e token dele na cena; chat cheio de
cards de teste. Uma aba do navegador embutido aberta como Gamemaster.

## Próximas tarefas

Estados: `TODO`. Uma tarefa por vez; detalhe em docs/PLAN.md.

| ID | Estado | Entrega | Condição |
|---|---|---|---|
| E6-01 | TODO | Regras puras de Quickhack (docs/RULES.md §8) | Pode começar; definições já validadas em `pack.ts` |
| E6-02 | TODO | Jack In, Breach, Jack Out, Force Out | Depois de E6-01 |
| E6-03 | TODO | Quickhack a partir de definições de pacote | Depois de E6-02 |

## Dependências externas

- Character Panel: API v1 (tarefa E6-01 de lá) antes da E7 daqui.

## Pendências abertas

- Decisões D15–D27 aguardam confirmação do usuário em docs/DECISIONS.md.
- Não testados no Foundry: crítico (dois 6) real; arremesso com dano que mostrasse a
  armadura inteira; espingarda com alvo de jogador; explosivo com cobertura; Artes Marciais
  sem o item de perícia; 60 s sem resposta; token não vinculado; dois donos ativos.
- Limites conhecidos: desfazer não desfaz estados nem fim de agarrão (D20); lesão de perna
  e soltar item são avisos (D21); movimentos especiais de Artes Marciais não feitos; ROF 2
  do corpo a corpo é um ataque por chamada.
- `npm audit`: aviso moderado em `minimatch` via `typescript-eslint` 8.72.2 (ferramenta de
  desenvolvimento); subir junto com o Character Panel.
