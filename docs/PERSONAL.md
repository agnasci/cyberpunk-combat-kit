# Edição pessoal (fora do Git)

Requisito R12: na máquina do usuário, o módulo tem todo o conteúdo do PneumaQuickHack, os
demais efeitos que o usuário escolher e um compêndio pessoal com itens e Quickhacks
oficiais. Nada disso pode ir para o GitHub, releases ou página do Foundry.

## Estrutura

```text
private/                       (no .gitignore; criar a partir de private.example/)
  pack/                        pacote de conteúdo pessoal (formato de docs/EFFECTS.md)
    cck-pack.json
    icons/  sounds/  fx/
  compendium/
    src/<pacote>/*.json        fontes dos documentos (um arquivo por item)
    text/<pacote>/<id>.html    texto original colado pelo usuário (D14)
  module.personal.json         sobreposição do manifesto (packs, versão "-personal")
  NOTICES.md                   avisos de licença do que foi copiado (ex.: MIT do Pneuma)
dist-personal/                 saída do build pessoal (no .gitignore)
```

`private.example/` (versionado) traz só a estrutura vazia e um manifesto de exemplo com
dados fictícios, para recriar `private/` numa máquina nova.

## Build

- `npm run build`: edição pública em `dist/`; **nunca** lê `private/`.
- `npm run build:personal`: roda o build público, copia `private/pack/` para
  `dist-personal/personal/`, compila `private/compendium/src` em LevelDB
  (`@foundryvtt/foundryvtt-cli`, dependência de desenvolvimento a confirmar em P-03) e
  mescla `module.personal.json` no manifesto.
- O manifesto pessoal mantém o id `cyberpunk-combat-kit`, mas **sem** `manifest` e
  `download` e com versão `X.Y.Z-personal`, para o Foundry não sobrescrever a edição pessoal
  com uma atualização pública.
- Quando `private/pack/` existe, `build:personal` grava
  `flags["cyberpunk-combat-kit"].personalPack = "personal"` no manifesto; no `ready` o
  módulo lê `modules/cyberpunk-combat-kit/personal/cck-pack.json` e registra como pacote de
  código. Sem a flag (edição pública) nada é requisitado.
- Junção local de teste aponta para `dist-personal/` (docs/DEVELOPMENT.md).

## Guardas contra vazamento (parte do `npm run check`)

`scripts/check-private.mjs` (`npm run check:private`; testes em
`tests/unit/check-private.test.ts`). Arquivos verificados: os versionados, os novos não
ignorados pelo Git e `dist/`.

1. `git ls-files private dist-personal` precisa estar vazio.
2. Nenhum arquivo verificado pode ter o mesmo hash de um arquivo não vazio de `private/`.
3. Nenhum id pessoal pode aparecer em arquivo verificado (inclusive docs): ids de
   Quickhack e chaves de `assets` de `private/pack/cck-pack.json`, `_id` e `quickhackId`
   das fontes em `private/compendium/src/`.
4. Nenhum nome de arquivo de `private/` pode aparecer em `src/`, `lang/`, `templates/`,
   `styles/` ou `dist/` (docs podem citar nomes de arquivos dos módulos de referência).
5. Release (`gh release create`) só a partir de `dist/`; checklist em docs/LEGAL.md.

Tokens com menos de 4 caracteres e tudo o que vem de `private.example/` (ids, nomes e
conteúdo idêntico) são ignorados. `build:personal` recusa versão sem `-personal`, remove
`manifest` e `download` (valor `null` na sobreposição apaga a chave) e, por enquanto, só
avisa que a compilação do compêndio é da P-03.

## Fontes do conteúdo pessoal

| Fonte | Licença | O que entra em `private/` | Como |
|---|---|---|---|
| PneumaQuickHack 0.9.2 (`GMPneuma/PneumaQuickHack`) | MIT | 12 ícones, catálogo dos 11 Quickhacks (id, nome, nível, DV, dano automático), textos de mensagem e efeitos automatizados (uma lesão crítica tirada do compêndio do sistema; dois Quickhacks com dano, um imediato e um contínuo) | Converter para `cck-pack.json` (P-02); aviso MIT em `private/NOTICES.md` |
| Pneuma Combat Tools / Visual Tools | **Sem licença** | Confirmado pelo usuário (D13): sons (`message-alert.wav`, `your-turn.wav`) e imagens PNG/WebP; as animações deles são código procedural, então viram cues pessoais reescritos com esses assets | Uso privado; nunca no repositório (P-04) |
| Sistema CPR (compêndios) | Licença da RTG para o sistema | Nada copiado: o compêndio pessoal referencia os pacotes do sistema | — |
| CEMK (livro do usuário) | RTG, todos os direitos | Itens do Edgerunners Armory (p. 31–37) e Quickhacks (p. 17–18) | Ver abaixo |

## Compêndio pessoal

- Escopo: o que **não** existe nos compêndios do sistema (docs/COMPATIBILITY.md): itens do
  CEMK (drogas, acessórios e munições, armas, cyberware, Neuroport/Self-ICE) e os Quickhacks
  (itens `gear` com flag `quickhackId`, técnica do PneumaQuickHack).
- Itens do livro base e das DLCs já vêm do sistema; uma pasta "Atalhos" no compêndio pessoal
  pode listar referências, sem duplicar documentos.
- Preenchimento (D14): agentes criam cada item com os campos mecânicos (tipo, custo, dano,
  ROF, mãos, ocultável, humanity loss, DV) e um arquivo de texto vazio em
  `compendium/text/<pacote>/<id>.html`. O usuário cola ali o texto original do livro dele; o
  build pessoal usa esse arquivo como descrição e, se estiver vazio, mostra só os dados.
  Agentes não transcrevem o livro nem leem esses arquivos.
- Opcional, sob pedido: script local `npm run personal:text -- <id> <página>` que extrai a
  página do PDF do usuário com `pdftotext` direto para o arquivo do item, para ele aparar.
- Fonte JSON revisável por item; o build gera o LevelDB. Pastas por categoria.
