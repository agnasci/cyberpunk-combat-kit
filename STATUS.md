# Estado e passagem de contexto

Atualizado em: 2026-11-20.

## Situação

- E0 a E10, F-01, P-02 e P-04 concluídas (2026-11-20). Última release pública: `v0.1.1` (E9)
  em https://github.com/agnasci/cyberpunk-combat-kit, com
  `module.json` e `module.zip`. Manifesto:
  `https://github.com/agnasci/cyberpunk-combat-kit/releases/latest/download/module.json`.
- Entrada pelo menu do clique direito, pela aba "Combate" do Character Panel e pela API v1
  (docs/INTEGRATION.md).
- `origin/main` em `f4e58fd` (tag `v0.1.1`). Commits locais ainda não enviados: E10, F-01, o
  ícone dos Quickhacks e as chaves combinadas de cue; entram na próxima release (0.1.2)
  quando o usuário pedir.
- Character Panel: v0.2.0 publicada em 2026-11-19 com a API v1 (release `v0.2.0` de lá); a
  integração precisa dela (README).

## Última entrega: P-04 efeitos por tipo de arma (2026-11-20)

- Público (D38): chaves combinadas `evento:tipo+forma` procuradas antes das simples
  (`cueKeys`, `isCueKey` em `domain/cues.ts`), para um pacote mudar um tipo de arma sem
  perder o cue de rajada, supressão, cartucho ou explosão; sprite parado mantém a proporção
  da imagem (`fx-canvas.ts`). docs/EFFECTS.md atualizado.
- Conteúdo pessoal: só em `private/` (fonte e licença registradas lá).

Validação:
- Automatizada: `npm run check` exit 0 (207 testes; 3 novos em `tests/unit/cues.test.ts`;
  `check:private` sem vazamento).
- Teste manual real (Foundry, edição pessoal pela junção): sprite largo desenhado com a
  proporção mantida; ataques reais à distância e corpo a corpo e `effects.play` com rajada,
  supressão, arremesso, explosão e artes marciais resolveram a chave combinada certa. Tudo
  desfeito (PV 40, ablação 0, munição 6); junção de volta para `dist/` e mundo relançado na
  0.1.1 pública.
- Não testado: com o módulo Sequencer ativo (não instalado; `.size()` dele pode não manter a
  proporção); como jogador.

## Entregas anteriores

P-02 (edição pessoal no Foundry), F-01 (fluidez), E10 (visual), E9 (v0.1.1), E8 (API v1 e
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

- Decisões D15–D38 aguardam confirmação do usuário em docs/DECISIONS.md.
- Não testados no Foundry: crítico (dois 6) real; arremesso com dano que mostrasse a
  armadura inteira; espingarda com alvo de jogador; explosivo com cobertura; Artes Marciais
  sem o item de perícia; 60 s sem resposta; token não vinculado; dois donos ativos; defesa
  automática dos PdMs em supressão e agarrão; tiro rápido como jogador de outro cliente.
- Limites conhecidos: desfazer não desfaz estados nem fim de agarrão (D20); lesão de perna
  e soltar item são avisos (D21); movimentos especiais de Artes Marciais não feitos; ROF 2
  do corpo a corpo é um ataque por chamada.
- `npm audit`: aviso moderado em `minimatch` via `typescript-eslint` 8.72.2 (ferramenta de
  desenvolvimento); subir junto com o Character Panel.
