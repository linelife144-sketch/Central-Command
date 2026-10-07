# Project-local Pi agent tooling

The `disler/pi-vs-claude-code` repository is cloned at `third_party/pi-vs-claude-code/` and its project resources are registered in `.pi/settings.json`.

## Available resources

- **Extensions:** all runnable files in the clone's `extensions/` directory, excluding its `themeMap.ts` (an imported helper, not an extension). The project's shared theme helper lives in `.pi/lib/themeMap.ts`, outside Pi's auto-discovered extension directory.
- **Skill:** `bowser`, loaded from `.pi/skills/` in the clone.
- **Prompt commands:** the clone's `.claude/commands/*.md` templates, including `/prime` and `/plan_w_team`.
- **Agents and teams:** `.pi/agents/` is linked into this project's `.pi/agents/` so the system selector, team dispatcher, chain runner, and Pi-Pi expert workflow can find their definitions.
- **Themes:** all themes in the clone's `.pi/themes/` are discoverable; the project does not force a theme choice.
- **Damage-control rules:** `.pi/damage-control-rules.yaml` links to the clone's rules file. Agent session data is kept in ignored `.pi/agent-sessions/`.

The clone's `yaml` runtime dependency was installed with Bun in the clone directory. Do not copy its `.env.sample` into project environment files or put real credentials in the cloned repository.

## Use and safety

Project resources load only after Pi grants project trust. Start Pi from this repository; if prompted, review and trust the project before using these resources. Pi extensions are executable code with the same OS permissions as Pi, so review upstream changes before updating the clone.

The repository contains several alternative interaction modes (for example, multiple footer/widget extensions, `agent-team` vs. `agent-chain`, and two damage-control variants). They are all registered for this project as requested, but their behavior may overlap when composed. The shared communication identity flags are registered only by `coms-net.ts`; `coms.ts` reads those values from argv because Pi scopes `getFlag()` to the extension that registered each flag. The dispatcher/chain modes can intentionally restrict the primary agent to orchestration tools. Choose a compatible subset for a session when using those modes; avoid running both damage-control variants together.

To try one extension in isolation without changing project settings:

```bash
pi --no-extensions --extension ./third_party/pi-vs-claude-code/extensions/minimal.ts
```

The clone remains an independent Git checkout; update it from its own directory when desired. Its upstream configuration is not copied over this project's settings.
