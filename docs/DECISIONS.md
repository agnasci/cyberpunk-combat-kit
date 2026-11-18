# Decisões e propostas

Estados: **Proposta** (aguarda o usuário), **Confirmada**, **Substituída por Dxx**.

| ID | Estado | Decisão | Motivo |
|---|---|---|---|
| D01 | Confirmada (2026-11-17) | Id `cyberpunk-combat-kit`, título "Combat Kit — for Cyberpunk RED", prefixos `cck-`/`CCK.` | Padrão dos outros módulos do autor e da política da RTG; não colide com `pneuma-combattools` |
| D02 | Confirmada (2026-11-17) | TypeScript + Vite + Vitest, Node 24, mesma configuração do Character Panel; alvo Foundry 12.343 + CPR v0.92.4 | Base já publicada pelo mesmo autor |
| D03 | Confirmada (2026-11-17) | Rolagens pelo pipeline nativo (`item.createRoll` / `confirmRoll` / `roll`) e dano por `actor._applyDamage`; regras próprias só onde o sistema não tem (DV por distância, resolução, área, Quickhacks) | Uma fonte de verdade; card igual ao da ficha |
| D04 | Confirmada (2026-11-17) | Executor único do mestre ativo por `game.socket` para alterar atores alheios; sem `socketlib` | Jogador não tem permissão nos PdMs; evitar dependência |
| D05 | Confirmada (2026-11-17) | API pública versionada (`api.version = 1`) e hooks `cck*`; pacotes registráveis por código | Pacote pessoal e outros módulos entram pelo mesmo caminho |
| D06 | Confirmada (2026-11-17) | Quickhacks: motor genérico, ajuste de mundo desligado por padrão, definições só por pacote | Pedido do usuário; nomes e efeitos são conteúdo do CEMK |
| D07 | Confirmada (2026-11-17) | Edição pessoal no mesmo repositório em `private/` (gitignored) com `build:personal` e guardas no `check`; versão `-personal` sem `manifest`/`download` | Uma base de código; impedir vazamento e sobrescrita por atualização |
| D08 | Confirmada (2026-11-17) | Sem orçamento de ações nem barra de turnos própria nesta fase | Tracker nativo basta; reduzir peso (lição do Combat Tools) |
| D09 | Confirmada (2026-11-17) | Efeitos com backend próprio (PIXI + áudio do Foundry) e Sequencer opcional; nada de JB2A/Sequencer obrigatório | Edição pública sem dependências pesadas nem assets de terceiros |
| D10 | Confirmada (2026-11-17) | Menu rápido: clique direito em token não possuído abre o menu; dono/mestre usa Alt+clique direito (configurável) para não perder o Token HUD | Pedido do usuário sem quebrar o fluxo nativo |
| D11 | Confirmada (2026-11-17) | Integração com o painel só pela API pública dele; o painel nunca depende do combate | Mesma regra D12 do Character Panel |
| D12 | Confirmada (2026-11-17) | Compêndio pessoal só com o que falta no sistema (CEMK); itens do livro base vêm dos compêndios do sistema | Evitar duplicação; o sistema já tem licença da RTG |
| D13 | Confirmada (2026-11-17) | Referência de ideias: PneumaQuickHack, Pneuma Combat Tools e Pneuma Visual Tools. A edição pessoal inclui também sons e imagens do Combat/Visual Tools (uso privado; P-04) | Pedido do usuário; os dois últimos não têm licença, então nada deles na edição pública |
| D14 | Confirmada (2026-11-17) | Texto original do livro no compêndio pessoal: o usuário cola o texto de cada item em `private/compendium/text/<pacote>/<id>.html`, que o build pessoal usa como descrição. Agentes criam os itens com dados mecânicos e um campo de texto vazio, sem transcrever o livro; um extrator local por página (`pdftotext`), rodado pelo usuário, pode ser feito sob pedido | O usuário tem o livro e quer o texto para uso pessoal; agentes não reproduzem texto protegido |
| D15 | Proposta (2026-11-17) | Roteamento padrão (R13) da E1: rolagens nativas seguem o modo de rolagem de cada usuário; o card de resolução é público, salvo PdM contra PdM, que vai só aos mestres. Ajuste de mundo para outros cenários fica para quando o usuário pedir | Menos ocultação por padrão; o mestre já pode rolar às cegas pelo modo de rolagem do Foundry |
| D16 | Proposta (2026-11-17) | Defesa: pedido ao jogador dono ativo (preferindo quem tem o ator como personagem), senão ao mestre executor; 60 s sem resposta: à distância vale a DV, corpo a corpo fica sem resolução com aviso. O atacante rola antes do pedido de defesa | Cancelar a rolagem do atacante não incomoda o defensor; corpo a corpo não tem DV para usar |
| D17 | Proposta (2026-11-17) | `api.attack` exposto já na E1 como entrada de teste e para macros (contrato completo na E8) | O workflow precisa de um gatilho antes do menu da E2 |
