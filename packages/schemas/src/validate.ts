import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { ErrorObject, ValidateFunction } from 'ajv';

export type ContractName = 'TaskEnvelope' | 'AgentAssignment' | 'AgentResult' | 'Evidence' | 'Finding' | 'GateResult' | 'ReviewResult' | 'MergeDecision' | 'RunManifest';
export interface ContractValidationResult { ok: boolean; errors: ErrorObject[] }

type AjvInstance = {
  addSchema(schema: object): void;
  getSchema(ref: string): ValidateFunction | undefined;
};
type AjvConstructor = new (options?: Record<string, unknown>) => AjvInstance;
type AddFormats = (ajv: AjvInstance) => unknown;

// Ajv and ajv-formats publish CommonJS-compatible entry points whose default
// import shape varies under NodeNext/ESM. Resolve that boundary explicitly so
// the rest of the package remains native ESM and strongly typed.
const require = createRequire(import.meta.url);
const loadedAjv = require('ajv') as unknown;
const Ajv = ((loadedAjv as { default?: AjvConstructor }).default ?? loadedAjv) as AjvConstructor;
const loadedFormats = require('ajv-formats') as unknown;
const addFormats = ((loadedFormats as { default?: AddFormats }).default ?? loadedFormats) as AddFormats;

const schemaPath = new URL('../schema/contracts.schema.json', import.meta.url);
const schema = JSON.parse(readFileSync(schemaPath, 'utf8')) as { $id: string };
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
ajv.addSchema(schema);
const validators = new Map<ContractName, ValidateFunction>();

function validatorFor(name: ContractName): ValidateFunction {
  const cached = validators.get(name);
  if (cached) return cached;
  const validate = ajv.getSchema(`${schema.$id}#/$defs/${name}`);
  if (!validate) throw new Error(`JSON Schema definition not found: ${name}`);
  validators.set(name, validate);
  return validate;
}

export function validateContract(name: ContractName, value: unknown): ContractValidationResult {
  const validate = validatorFor(name);
  const ok = Boolean(validate(value));
  return { ok, errors: ok ? [] : [...(validate.errors ?? [])] };
}

export function assertContract(name: ContractName, value: unknown): void {
  const result = validateContract(name, value);
  if (!result.ok) throw new Error(`${name} failed schema validation: ${result.errors.map((error) => `${error.instancePath || '/'} ${error.message ?? 'invalid'}`).join('; ')}`);
}
