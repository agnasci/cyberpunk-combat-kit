# Cyberpunk Combat Kit — instruções para agentes

## Comece aqui

1. Leia este arquivo e [STATUS.md](STATUS.md) em toda sessão.
2. Leia [SPEC.md](SPEC.md) antes de alterar comportamento.
3. Escolha a próxima tarefa disponível em "Próximas tarefas" do [STATUS.md](STATUS.md);
   o detalhe de cada uma (objetivo, arquivos, aceite) está em [docs/PLAN.md](docs/PLAN.md).
4. Abra somente os documentos e arquivos necessários à tarefa. Consulte o mapa abaixo.
5. Verifique o estado do diretório/Git antes de editar; preserve alterações alheias.

Módulo de Foundry VTT V12 para Cyberpunk RED – CORE que automatiza o fluxo de combate
(ataque com alvo, defesa, dano, modos de fogo, área), toca efeitos audiovisuais e oferece
um menu rápido no botão direito sobre inimigos. Funciona sozinho e se encaixa no
Character Panel (`D:\Desenvolvimento\cyberpunk-character-panel`) pela API pública dele.
A ficha e o pipeline de rolagem do sistema são a fonte de verdade.

## Duas edições, um repositório

- **Pública** (GitHub, Foundry): só regras genéricas do núcleo, efeitos próprios, importador
  de pacotes e motor de Quickhacks **desligado por padrão e sem conteúdo**.
- **Pessoal** (só na máquina do usuário): a pasta `private/` (no `.gitignore`) guarda o
  pacote de conteúdo pessoal e o compêndio pessoal; `npm run build:personal` gera
  `dist-personal/`. Regras em [docs/PERSONAL.md](docs/PERSONAL.md).
- Nunca mova, copie, cite ou descreva arquivos de `private/` em código versionado, commits,
  issues, releases ou documentos públicos. `npm run check` deve falhar se algo vazar.

## Regras de trabalho

- E0 a E4 existem: ataques, modos, áreas, agarrão e efeitos, pelo menu do clique direito
  (E2) e pela API.
- Separe requisito do usuário, proposta técnica e fato verificado. Não invente
  APIs, campos de ficha, fórmulas, compatibilidade, testes ou resultados.
- Execute uma tarefa pequena por vez; não implemente etapas futuras por antecipação.
- Antes de programar, registre objetivo, arquivos afetados e critérios de aceite.
- Reuse o sistema: rolagens, diálogos, cards, `_applyDamage`, tabelas de DV e de lesões são
  do CPR. Isole acesso ao Foundry/sistema em `src/integrations/`.
- O domínio (`src/domain/`) não acessa `game`, `Hooks`, `canvas`, DOM ou documentos.
- UI não calcula regra: mostra o que o domínio/adaptador entrega e chama ações.
- Mudanças em atores que o usuário não possui passam pelo executor do mestre (socket).
- Fora do escopo: painel de personagem (é do Character Panel), arquitetura NET e
  netrunning de ciberespaço (é do Netrunner HUD). Na dúvida sobre a fronteira, pergunte.
- Conteúdo publicável (docs/LEGAL.md): nenhum texto, tabela, arte ou logo da RTG ou da
  CD PROJEKT; nenhum código de projeto sem licença compatível (Pneuma Combat/Visual Tools
  não têm licença: só ideias).
- Não modifique o código do Foundry, do sistema ou de outros módulos instalados.
- Use português nos documentos e comunicação; identificadores de código em inglês.
- Evite dependências, abstrações genéricas, arquivos enormes e duplicação de estado.
- Não escreva comentários no código; explique nos documentos.
- Não exija um plugin de IA específico: estes documentos devem bastar a qualquer IA.
- Registre decisões duráveis em `docs/DECISIONS.md`; progresso somente em `STATUS.md`.
- Só marque concluído com evidência. Diferencie testes automatizados, inspeção
  documental e teste manual real no Foundry. Bloqueio não significa conclusão.

## Leitura sob demanda

| Necessidade | Fonte canônica |
|---|---|
| Objetivo e requisitos | [SPEC.md](SPEC.md) |
| Tarefas abertas e pendências | [STATUS.md](STATUS.md) |
| Etapas, arquivos e critérios de aceite | [docs/PLAN.md](docs/PLAN.md) |
| Camadas, contratos, API, integração com o painel | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Regras de combate (resumo próprio + páginas) | [docs/RULES.md](docs/RULES.md) |
| APIs reais do sistema CPR e do Foundry | [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md) |
| Estudo dos módulos de referência | [docs/RESEARCH.md](docs/RESEARCH.md) |
| Efeitos audiovisuais e formato de pacote | [docs/EFFECTS.md](docs/EFFECTS.md) |
| Edição pessoal e compêndio pessoal | [docs/PERSONAL.md](docs/PERSONAL.md) |
| Licenças e conteúdo publicável | [docs/LEGAL.md](docs/LEGAL.md) |
| Ambiente e comandos | [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) |
| Validação automatizada e manual | [docs/TESTING.md](docs/TESTING.md) |
| Decisões e propostas | [docs/DECISIONS.md](docs/DECISIONS.md) |

## Convenções do código

- Prefixo CSS `cck-`; chaves i18n `CCK.*`; id do módulo `cyberpunk-combat-kit` (D01).
  Rótulos do sistema pelas chaves `CPR.*` dele.
- Socket `module.cyberpunk-combat-kit`; flags em `flags["cyberpunk-combat-kit"]`.
- Cores por variáveis CSS; quando o painel estiver ativo, usar a paleta dele (`getPalette`).

## Economia de contexto

Mantenha este arquivo curto (meta: até 100 linhas). Não copie o histórico em
prompts, comentários ou novos arquivos de instruções. Use IDs de requisito e
tarefa. Pesquise por símbolo/caminho antes de ler diretórios inteiros. Não leia
dependências, `private/` ou arquivos gerados salvo investigação direcionada.

## Encerramento de sessão

Atualize `STATUS.md` com tarefa, arquivos relevantes, validação executada, pendências
e próximo passo concreto; tire do STATUS o que foi concluído (o histórico fica no git).
Se houver código, execute os checks pertinentes e registre falhas sem mascará-las.
Não faça push, publicação ou alteração na mesa real sem solicitação correspondente.
