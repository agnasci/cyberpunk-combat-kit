# Desenvolvimento e padrões

## Ambiente

Node 24 LTS (`.nvmrc`), npm com `package-lock.json` e dependências fixadas (D02). Foundry
local: `D:\Foundry Virtual Tabletop` (12.343), dados em `%LOCALAPPDATA%\FoundryVTT\Data`.
Mundo de teste descartável: "Cyberdeck HUD" (`cyberdeck-hud`), usuários Gamemaster e
Runner Teste (confirmar com o usuário antes de usar outro mundo).

| Comando | Responsabilidade |
|---|---|
| `npm ci` | Instalar exatamente o lockfile |
| `npm run typecheck` | Tipos de `src/` (`tsconfig.json`) e de `vite.config.ts` + `tests/` (`tsconfig.node.json`) |
| `npm run lint` | ESLint + Prettier (verificação) |
| `npm test` | Vitest em `tests/**/*.test.ts`, sem Foundry |
| `npm run build` | Edição pública em `dist/` |
| `npm run build:personal` | Edição pessoal em `dist-personal/` (`scripts/build-personal.mjs`, docs/PERSONAL.md) |
| `npm run check:private` | Guardas de vazamento (`scripts/check-private.mjs`) |
| `npm run check` | typecheck, lint, test, build e `check:private` |
| `node scripts/import-aa.mjs …` | Converte uma exportação do Automated Animations num pacote (docs/EFFECTS.md) |
| `npm run package` | `check` + `release/module.zip` e `release/module.json` a partir de `dist/` (`scripts/package.mjs`) |

Versões das dependências iguais às do Character Panel (D02). `npm audit` acusa um aviso
moderado em `minimatch` via `typescript-eslint` 8.72.2 (só ferramenta de desenvolvimento);
a correção exige subir `typescript-eslint` e fica para quando o painel subir também.

## Servidor local para testes

Sem abrir o aplicativo, um servidor por vez:

```powershell
node "D:\Foundry Virtual Tabletop\resources\app\main.js" --dataPath="$env:LOCALAPPDATA\FoundryVTT" --port=30000 --world=cyberdeck-hud --noupnp
```

No navegador embutido, `/join` com um usuário por aba (método em
`D:\Desenvolvimento\cyberpunk-netrunner-hud\docs\TESTING.md`). O áudio só desbloqueia
depois de um clique na página.

## Instalação local para teste

Uma junção por vez (as duas edições têm o mesmo id). Hoje existe a junção para `dist`
(criada na E0-02); para a edição pessoal, apague-a e crie esta:

```powershell
New-Item -ItemType Junction -Path "$env:LOCALAPPDATA\FoundryVTT\Data\modules\cyberpunk-combat-kit" -Target "D:\Desenvolvimento\cyberpunk-combat-kit\dist-personal"
```

Para testar a edição pública, apontar a junção para `dist`. `module.json` novo ou alterado
exige voltar ao setup e relançar o mundo.

## Implementação

- Um propósito por arquivo; sem `utils` gigante; sem comentários no código.
- Não ler `actor.system.*` fora de `src/integrations/cpr/`; não tocar em `canvas`/socket fora
  de `src/integrations/foundry/`.
- Tipos mínimos do Foundry em `src/types/foundry.d.ts`, só o que foi verificado.
- Textos de interface em `lang/`; rótulos do sistema pelas chaves `CPR.*`.
- Funções do domínio determinísticas e testadas; aleatoriedade só pelas rolagens do sistema.
- CSS escopado sob `.cck-*`; lições de CSS em
  `D:\Desenvolvimento\cyberpunk-character-panel\docs\DEVELOPMENT.md`.

## Git e entrega

Commits pequenos (`docs:`, `feat:`, `fix:`, `test:`) só quando o usuário pedir; push e
release só com pedido explícito. Autor e committer no noreply do GitHub (já configurado
neste repositório). Release (D31), sempre a partir de `dist/`:

1. Subir `version` em `package.json` e `module.json` e a versão em `download`
   (`.../releases/download/vX.Y.Z/module.zip`).
2. `npm run package` e conferir a lista impressa (o script falha se versão e URL não baterem).
3. Commit, tag `vX.Y.Z`, push e release no GitHub: o workflow `release.yml` refaz o pacote e
   anexa `module.json` e `module.zip` (a tag tem de ser `v` + a versão do `package.json`).
4. Sem o workflow: `gh release create vX.Y.Z release/module.json release/module.zip`.
5. Checklist de docs/LEGAL.md antes de cada release pública.
