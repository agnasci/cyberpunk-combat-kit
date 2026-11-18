# Validação

## Automatizada (Vitest, sem Foundry)

- Domínio: DV por distância, quem pode esquivar, resolução com empate, multiplicadores
  (mirado, automático), área (quem está dentro), regras de Quickhack, roteamento de
  mensagens, validação de manifesto de pacote, mapa evento → cue.
- Cada regra cita a página de docs/RULES.md no nome ou na descrição do teste.
- Fixtures sintéticas em `tests/fixtures/` (sem dados de livro, sem nada de `private/`).
- Guardas de `private/` (docs/PERSONAL.md) rodam no `npm run check`.

## Manual no Foundry (mundo descartável)

Registrar data, versão, edição (pública/pessoal), usuários e o que foi conferido.
Roteiro mínimo por entrega com fluxo de combate:

1. Jogador ataca PdM pelo menu do clique direito: card nativo + resolução + dano aplicado.
2. PdM ataca jogador: jogador recebe o pedido de esquiva; resultado conforme roteamento.
3. Sem mestre ativo: ação que mexe em ator alheio é recusada com aviso.
4. Dono/mestre: clique direito ainda abre o Token HUD; Alt+clique abre o menu.
5. Desfazer dano restaura HP e armadura.
6. Efeitos: aparecem para quem vê os tokens; somem com o ajuste desligado; movimento
   reduzido deixa estático.
7. Com e sem o Character Panel ativo.
8. Quickhacks desligados: nenhum vestígio na interface.

## Critério de "concluído"

Teste automatizado ≠ inspeção de código ≠ teste manual real. O STATUS diz qual foi feito.
