// Regenerate a reviewable migration from the versioned application templates.
// Usage: node scripts/generate-utility-config.cjs <output.sql>
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const original = process.env.TEMPLATE_SOURCE_ROOT || root;
const { createRequire } = require('node:module');
const requireApp = createRequire(path.join(fs.existsSync(path.join(root, 'node_modules')) ? root : original, 'package.json'));
const ts = requireApp('typescript');
const cache = new Map();
function load(id, parent = path.join(root, 'src', 'entry.ts')) {
  if (!id.startsWith('.') && !id.startsWith('@/')) return requireApp(id);
  let target = id.startsWith('@/') ? path.join(root, 'src', id.slice(2)) : path.resolve(path.dirname(parent), id);
  let file = [target + '.ts', path.join(target, 'index.ts')].find(file => fs.existsSync(file));
  if (!file && target.startsWith(root)) {
    target = path.join(original, path.relative(root, target));
    file = [target + '.ts', path.join(target, 'index.ts')].find(file => fs.existsSync(file));
  }
  if (!file) throw new Error(`Missing template module: ${id}`);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('module', 'exports', 'require', compiled)(module, module.exports, dependency => load(dependency, file));
  return module.exports;
}
const { TICKET_TEMPLATE_REGISTRY } = load('@/lib/tickets/templates/registry');
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const json = value => quote(JSON.stringify(value, (_key, item) => item instanceof RegExp ? { pattern: item.source, flags: item.flags } : item)) + '::jsonb';
let sql = '-- Generated from versioned utility templates. Run after the storm-first workflow migration.\nBEGIN;\n';
for (const template of Object.values(TICKET_TEMPLATE_REGISTRY)) {
  sql += `UPDATE public.ticket_templates SET field_definitions=${json(template.fieldConfig)}, default_values=${json(template.defaultValues)}, payload_version=${template.payloadVersion} WHERE utility_client=${quote(template.utilityClient)} AND template_key=${quote(template.templateKey)};\n`;
}
sql += `-- Fill configuration for legacy events that have no frozen field definitions.\nUPDATE public.storm_events se SET config_snapshot=se.config_snapshot || jsonb_build_object('field_definitions',tt.field_definitions,'default_values',tt.default_values,'payload_version',tt.payload_version) FROM public.ticket_templates tt WHERE tt.template_key=se.ticket_template_key AND tt.utility_client=se.utility_client AND NOT (se.config_snapshot ? 'field_definitions');\nCOMMIT;\n`;
if (!process.argv[2]) { process.stdout.write(sql); } else { fs.writeFileSync(path.resolve(process.argv[2]), sql); }
