# Desenvolvimento e padrões

## Ambiente

Node 24 LTS (`.nvmrc`), npm com `package-lock.json` e dependências fixadas (D02). Foundry
local: `D:\Foundry Virtual Tabletop` (12.343), dados em `%LOCALAPPDATA%\FoundryVTT\Data`.
Mundo de teste descartável: "Cyberdeck HUD" (`cyberdeck-hud`), usuários Gamemaster e
Runner Teste (confirmar com o usuário antes de usar outro mundo).

| Comando (a criar na E0-02) | Responsabilidade |
|---|---|
| `npm ci` | Instalar exatamente o lockfile |
| `npm run typecheck` | Tipos do código e da configuração |
| `npm run lint` | ESLint + Prettier (verificação) |
| `npm test` | Vitest em `tests/**/*.test.ts`, sem Foundry |
| `npm run build` | Edição pública em `dist/` |
| `npm run build:personal` | Edição pessoal em `dist-personal/` (docs/PERSONAL.md) |
| `npm run check` | Tudo acima menos o build pessoal, mais as guardas de `private/` |

## Instalação local para teste

Uma junção por vez (as duas edições têm o mesmo id):

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
neste repositório). Release: igual ao Character Panel (`docs/DEVELOPMENT.md` de lá), sempre
a partir de `dist/`.
