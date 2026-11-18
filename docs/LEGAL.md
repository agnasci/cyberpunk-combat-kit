# Licenças e conteúdo publicável

Objetivo: publicar a edição pública no GitHub e no Foundry sem violar licenças, mantendo a
edição pessoal só na máquina do usuário (docs/PERSONAL.md). Não é aconselhamento jurídico;
é a regra de trabalho do projeto.

## Nosso código

MIT (`LICENSE`). Código do Character Panel e do Netrunner HUD (mesmo autor, MIT) pode ser
reaproveitado.

## Aviso obrigatório (README, module.json, página do Foundry)

"Combat Kit is unofficial content provided under the Homebrew Content Policy of R. Talsorian
Games and is not approved or endorsed by RTG. This content references materials that are
the property of R. Talsorian Games and its licensees."

## Referências e o que se pode aproveitar

| Projeto | Licença | Edição pública | Edição pessoal |
|---|---|---|---|
| PneumaQuickHack | MIT | Ideias; trecho adaptado só com o aviso MIT em `THIRD_PARTY_NOTICES.md` e decisão registrada. Ícones e catálogo **não** (são conteúdo do CEMK) | Tudo, com o aviso MIT em `private/NOTICES.md` |
| Pneuma Combat Tools, Visual Tools e demais da suíte | Sem licença (todos os direitos reservados) | Só ideias e fluxos, reescritos do zero | Só com decisão do usuário, uso privado |
| Sistema `cyberpunk-red-core` | GPL v3 (código) + licença RTG (conteúdo) | Chamar em execução; não copiar arquivos, templates, CSS ou imagens | Igual |
| cpr-combat-hud | MIT | Ideias | Ideias |

## Proibido na edição pública

- Texto de regras, descrições, tabelas (DVs, lesões, preços), nomes e efeitos de Quickhacks,
  arte ou logotipos da RTG ou de Cyberpunk 2077/Edgerunners (CD PROJEKT/Netflix).
- Assets de terceiros sem licença compatível.
- Nome com "Cyberpunk RED" como marca principal; usar "Combat Kit — for Cyberpunk RED".

## Checklist antes de publicar

- [ ] `npm run check` com as guardas de `private/` passando (docs/PERSONAL.md).
- [ ] Release feita só de `dist/`; `module.zip` listado e conferido.
- [ ] Busca por texto de livro e nomes de Quickhacks no repositório sem resultados.
- [ ] `THIRD_PARTY_NOTICES.md` atualizado se houver trecho adaptado ou asset CC0.
- [ ] Aviso da Homebrew Content Policy no README, `module.json` e página do pacote.
- [ ] E-mail de autor dos commits = noreply do GitHub.
