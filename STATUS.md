# Estado e passagem de contexto

Atualizado em: 2026-11-18.

## Situação

- E0 a E4 concluídas (E2 entregue em 2026-11-18). Entrada pelo menu do clique direito
  e por macro/console:
  `game.modules.get("cyberpunk-combat-kit").api.attack({weaponId?, mode?, location?, skipDialog?})`,
  `.api.grapple({action})` e `.api.effects.{register, unregister, play}`.
- Commits locais na `main`: `48847b9` (E0 + E1), `a7c5c6b` (E3 e áreas). Sem remoto nem
  repositório no GitHub. **E4 e E2 ainda não commitadas.**

## Última entrega: E2-01 e E2-02, menu do clique direito (2026-11-18)

Novos: `src/domain/menu.ts`, `src/integrations/foundry/token-click.ts`,
`src/ui/quick-menu.ts`, `src/workflows/quick-menu.ts`, `tests/unit/menu.test.ts`.
Alterados: `settings.ts` (tecla e "menu em tokens não selecionados"), `area-placement.ts`
(`placementActive`), `weapon-adapter.ts` (tabelas de DV lidas uma vez, `preloadDvTables`),
`attack-steps.ts` (`dvLookup` aceita só perfil e arma), `main.ts`, tipos, textos, CSS.
Detalhe em docs/ARCHITECTURE.md ("Menu rápido"); decisão D26.

Validação:
- Automatizada: `npm run check` exit 0 (10 arquivos, 104 testes; 18 novos do menu).
- Teste manual real (Foundry 12.343, CPR v0.92.4, mundo `cyberdeck-hud`, cena "CCK Teste —
  Provas", idioma en):
  1. Mestre, mouse real: clique direito no PdM abre o Token HUD (sem menu); Alt+clique abre o
     menu, sem HUD, e o Atirador continua selecionado.
  2. Mestre, mouse real: Very Heavy Pistol → Mirar → Perna marcou o PdM como alvo e abriu o
     diálogo nativo já com "Aim for: Leg"; card nativo "Aimed Shot · Location: Leg" e card de
     resolução (erro contra DV 13 a 2 m). Munição reposta depois.
  3. Teclado (eventos sintéticos): setas, Home/End, Enter entra, ←/Esc voltam, Esc na raiz
     fecha e o foco volta ao `body`.
  4. Jogador (Runner Teste), sem token selecionado: menu abre sem tecla no PdM, título
     genérico (nome oculto pelo token), motivo "selecione um token" e "Marcar como alvo"
     funcionando. Com o Atirador: DV 13 pistola, 17 fuzil (automático/supressivo desabilitados
     com 5 balas), cartucho DV 13, granada como área sem DV, faca ao alcance e arremesso DV 16,
     Agarrar. Abrir leva ~8 ms com as tabelas pré-carregadas (antes 1,6 s).
  5. Jogador no próprio token: sem Alt o evento segue para o Foundry; com Alt o evento é
     barrado e o menu mostra "Nada a fazer". Agarrar sem mestre conectado: aviso do módulo.
- Corrigido no teste: Enter agia sobre o índice interno e não sobre o botão focado; primeira
  abertura lenta (lia o compêndio de DV a cada tabela).
- Não testado: HUD do jogador no próprio token com mouse real (o canvas da aba não processava
  hover/seleção nem com clique esquerdo — limite do ambiente, o módulo deixou o evento
  passar); ataque e agarrão do jogador pelo menu com mestre conectado (as duas abas
  compartilham o cookie de sessão; ao recarregar, a aba do mestre virou Runner e foi
  fechada); textos em pt-BR na tela; opção "menu em tokens não selecionados" e teclas Ctrl/Shift
  no Foundry (só testes de domínio); menu com o Character Panel desligado.

## Entregas anteriores

E4 (efeitos), E3 (modos, áreas posicionadas D24, agarrão) e E0/E1: evidências no histórico
do git deste arquivo. Mundo de teste `cyberdeck-hud`: armas de teste com munição no "CCK
Teste — Atirador"; perícias do "NPC Teste (CNH)" e token dele na cena; chat cheio de cards
de teste. Só a aba do Runner Teste ficou aberta no navegador embutido.

## Próximas tarefas

Estados: `TODO`. Uma tarefa por vez; detalhe em docs/PLAN.md.

| ID | Estado | Entrega | Condição |
|---|---|---|---|
| E5-01 | TODO | Manifesto e validação de pacotes | Depois da E4; reaproveita `parseCueSteps` |

## Dependências externas

- Character Panel: API v1 (tarefa E6-01 de lá) antes da E7 daqui.

## Pendências abertas

- Decisões D15–D26 aguardam confirmação do usuário em docs/DECISIONS.md.
- Não testados no Foundry: crítico (dois 6) real; arremesso com dano que mostrasse a
  armadura inteira; espingarda com alvo de jogador; explosivo com cobertura; Artes Marciais
  sem o item de perícia; 60 s sem resposta; token não vinculado; dois donos ativos.
- Limites conhecidos: desfazer não desfaz estados nem fim de agarrão (D20); lesão de perna
  e soltar item são avisos (D21); movimentos especiais de Artes Marciais não feitos; ROF 2
  do corpo a corpo é um ataque por chamada.
- `npm audit`: aviso moderado em `minimatch` via `typescript-eslint` 8.72.2 (ferramenta de
  desenvolvimento); subir junto com o Character Panel.
