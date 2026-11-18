# Estado e passagem de contexto

Atualizado em: 2026-11-17.

## Situação

- Projeto criado em 2026-11-17 só com documentação de planejamento; nenhum código, nenhum
  commit. Git iniciado localmente com a identidade noreply do GitHub; sem remoto.
- Pesquisa feita: PneumaQuickHack (MIT), Pneuma Combat Tools e Visual Tools (sem licença),
  pipeline de ataque/dano do CPR v0.92.4 (lido no código, não executado), regras do livro
  base (pt-BR) e do CEMK, API planejada do Character Panel (ainda não implementada lá).

## Última entrega: E0-01 — decisões confirmadas (2026-11-17)

O usuário confirmou D01–D12 sem mudanças e decidiu D13 (referência = os três módulos
Pneuma; edição pessoal leva sons e imagens do Combat/Visual Tools) e D14 (texto original do
livro no compêndio pessoal, colado pelo usuário em `private/compendium/text/`; agentes só
criam os itens com dados mecânicos). Arquivos: `docs/DECISIONS.md`, `docs/PERSONAL.md`,
`docs/PLAN.md`, `private.example/`. Validação: inspeção documental; Prettier sem avisos.

## Próximas tarefas

Estados: `TODO`. Uma tarefa por vez; detalhe em docs/PLAN.md.

| ID | Estado | Entrega | Condição |
|---|---|---|---|
| E0-02 | TODO | Ferramentas e módulo vazio | Pode começar |
| E0-03 | TODO | Guardas da edição pessoal | Depois de E0-02 |
| E0-04 | TODO | Provas de API em execução | Depois de E0-02 |

## Dependências externas

- Character Panel: API v1 (tarefa E6-01 de lá) antes da E7 daqui.

## Pendências abertas

- Nenhuma.
