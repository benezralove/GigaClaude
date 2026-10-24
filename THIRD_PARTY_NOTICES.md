# Third-party notices

Some skills in `plugins/team-kit/skills/` are copied from open-source projects. Their licences apply to those files, and the full texts are in [licenses/](licenses/).

| Skills | Source | Licence | Text |
|---|---|---|---|
| ponytail, ponytail-audit, ponytail-debt, ponytail-gain, ponytail-help, ponytail-review | https://github.com/DietrichGebert/ponytail | MIT, Copyright (c) 2026 DietrichGebert | [licenses/ponytail.LICENSE.txt](licenses/ponytail.LICENSE.txt) |
| impeccable | https://github.com/pbakaus/impeccable | Apache-2.0 | [licenses/impeccable.LICENSE.txt](licenses/impeccable.LICENSE.txt) |
| cloudflare, agents-sdk, durable-objects, workers-best-practices, wrangler, sandbox-sdk, cloudflare-email-service, cloudflare-one, cloudflare-one-migrations, turnstile-spin, web-perf, basin, cf-cli, gateway-workers, k2, nextjs-on-cloudflare, sandbox-stable, sandbox-next, sandbox-migrate-to-next, workers-profiling | https://github.com/cloudflare/skills | Apache-2.0 | [licenses/cloudflare-skills.LICENSE.txt](licenses/cloudflare-skills.LICENSE.txt) |
| graphify | https://github.com/safishamsi/graphify | Apache-2.0 (earlier portions MIT) | [licenses/graphify.LICENSE.txt](licenses/graphify.LICENSE.txt), [NOTICE](licenses/graphify.NOTICE.txt), [MIT](licenses/graphify.LICENSE-MIT.txt) |
| GSD status line (`extras/statusline/gsd-statusline.js`) | https://github.com/gsd-build/get-shit-done | MIT, Copyright (c) 2025 Lex Christopherson | [licenses/gsd.LICENSE.txt](licenses/gsd.LICENSE.txt) |

Modifications: none to the files above, except that they are repackaged as a Claude Code plugin. The impeccable design-check hook runs impeccable's own `scripts/hook.mjs`.

## Bundled plugins

| Plugin | Source | Licence | Text |
|---|---|---|---|
| security-guidance | https://github.com/anthropics/claude-plugins-public/tree/main/plugins/security-guidance | Apache-2.0 | [plugins/security-guidance/LICENSE](plugins/security-guidance/LICENSE) |
| typescript-lsp | https://github.com/anthropics/claude-plugins-public/tree/main/plugins/typescript-lsp | Apache-2.0 | [plugins/typescript-lsp/LICENSE](plugins/typescript-lsp/LICENSE) |

superpowers, last30days and twelvelabs are not copied here; the marketplace points at their own repositories.
