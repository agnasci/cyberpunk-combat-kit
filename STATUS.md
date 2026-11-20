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

## Última entrega: E10 refino visual (2026-11-20)

E9 publicada antes como v0.1.1 (commit `f4e58fd`, tag e release no GitHub; workflow ok; o
manifesto `latest` aponta para 0.1.1).

E10: `styles/combat-kit.css` reescrito com tokens `--cck-*` (D36);
`panel-bridge.ts` repassa toda a paleta do painel; `classes: ["cck-app"]` nos três DialogV2
(`defense-prompt`, `pack-manager`, `cue-editor`; tipo em `foundry.d.ts`); `img` da arma no
snapshot, nas entradas do menu (`MenuEntry.icon`), no botão de arma do painel (com munição
`6/8`, vermelha quando vazia) e nos títulos da aba Combate.

Validação:
- Automatizada: `npm run check` exit 0 (200 testes).
- Teste manual real (Foundry, mundo `cyberdeck-hud`, Gamemaster, painel ativo), por
  capturas: menu do clique direito com ícones das armas e distância em selo; diálogo de
  esquiva; card com ataque, dano, alvo e desfazer; aba Combate do painel; botão de arma com
  ícone e munição; janelas "Content packs" e "Effects per event"; aviso de mirar o cartucho
  (Esc cancelou sem gastar munição). Dano de teste desfeito, REF e munição restaurados.
- Não testado: aparência sem o Character Panel ativo (cores padrão iguais às do painel);
  tela pequena.

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
| F-01 | EM ANDAMENTO | Fluidez: mestre seleciona e clica no alvo para atirar; revisão da experiência de jogador e mestre | Pedido do usuário (2026-11-20) |
| F-02 | TODO | Integrar armas e itens e automatizar efeitos e sons com a biblioteca de exemplo | Depois da F-01 |
| P-02 | EM ANDAMENTO | Pacote pessoal com o conteúdo do PneumaQuickHack (só `private/`) | Montado e validado pelo `packs.register` em 2026-11-19; falta carregar `dist-personal/` no Foundry (reinício do servidor) e rodar o Netrunning completo com ele |

## Dependências externas

- Character Panel: `docs/INTEGRATION.md` (E6-02 de lá) ainda não escrito; a E7 daqui usa o contrato descrito no docs/ARCHITECTURE.md de lá.

## Pendências abertas

- Página do pacote em foundryvtt.com (conta do usuário, manual) com o aviso da Homebrew
  Content Policy: item que falta do checklist do docs/LEGAL.md.

- Decisões D15–D36 aguardam confirmação do usuário em docs/DECISIONS.md.
- Não testados no Foundry: crítico (dois 6) real; arremesso com dano que mostrasse a
  armadura inteira; espingarda com alvo de jogador; explosivo com cobertura; Artes Marciais
  sem o item de perícia; 60 s sem resposta; token não vinculado; dois donos ativos.
- Limites conhecidos: desfazer não desfaz estados nem fim de agarrão (D20); lesão de perna
  e soltar item são avisos (D21); movimentos especiais de Artes Marciais não feitos; ROF 2
  do corpo a corpo é um ataque por chamada.
- `npm audit`: aviso moderado em `minimatch` via `typescript-eslint` 8.72.2 (ferramenta de
  desenvolvimento); subir junto com o Character Panel.
