#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { config } from '../src/config.js';
import { createBetaAccessService } from '../src/services/betaAccessService.js';
import { createBetaAccessStore } from '../src/services/betaAccessStore.js';

export async function runBetaAccessCli(argv, dependencies = {}) {
  const output = dependencies.output || process.stdout;
  const errorOutput = dependencies.errorOutput || process.stderr;
  const settings = dependencies.settings || config.betaAccess;
  const args = parseArgs(argv);
  const command = args._[0];
  if (!command) throw new Error('BETA_ACCESS_COMMAND_REQUIRED');

  const store = dependencies.store || createBetaAccessStore({ dbPath: args.database || settings.dbPath });
  const service = dependencies.service || createBetaAccessService({ store, settings });
  try {
    if (command === 'create') {
      if (!output.isTTY && !dependencies.allowNonTtyCreate) {
        throw new Error('BETA_ACCESS_CREATE_REQUIRES_TTY');
      }
      const created = service.createCodes({
        count: args.count || 1,
        expiresDays: args['expires-in-days'] || settings.defaultExpiresDays,
        maxUses: args['max-uses'] || settings.defaultMaxUses,
        labelPrefix: args['label-prefix'] || null
      });
      output.write('Store these codes now. They will not be shown again.\n');
      for (const item of created) output.write(`${item.record.id}\t${item.code}\n`);
      return created.map(item => item.record);
    }

    if (command === 'list') {
      for (const record of store.listCodes()) output.write(`${JSON.stringify(record)}\n`);
      return;
    }

    if (command === 'update') {
      const record = store.updateCode(required(args.id, '--id'), {
        label: args.label,
        expiresAt: args['expires-at'],
        maxUses: args['max-uses']
      });
      output.write(`${JSON.stringify(requireRecord(record))}\n`);
      return;
    }

    if (command === 'enable' || command === 'disable') {
      const record = store.setEnabled(required(args.id, '--id'), command === 'enable');
      output.write(`${JSON.stringify(requireRecord(record))}\n`);
      return;
    }

    if (command === 'revoke') {
      const record = store.revokeCode(required(args.id, '--id'));
      output.write(`${JSON.stringify(requireRecord(record))}\n`);
      return;
    }

    if (command === 'backup') {
      const destination = await store.backup(required(args.output, '--output'));
      output.write(`${destination}\n`);
      return;
    }

    throw new Error('BETA_ACCESS_UNKNOWN_COMMAND');
  } catch (error) {
    errorOutput.write(`Beta access command failed: ${error.code || error.message || 'UNKNOWN'}\n`);
    throw error;
  } finally {
    if (!dependencies.store) store.close();
  }
}

function parseArgs(argv) {
  const result = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) {
      result._.push(value);
      continue;
    }
    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) throw new Error(`BETA_ACCESS_VALUE_REQUIRED:${key}`);
    result[key] = next;
    index += 1;
  }
  return result;
}

function required(value, label) {
  if (!value) throw new Error(`BETA_ACCESS_REQUIRED:${label}`);
  return value;
}

function requireRecord(record) {
  if (!record) throw new Error('BETA_ACCESS_CODE_NOT_FOUND');
  return record;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runBetaAccessCli(process.argv.slice(2)).catch(() => {
    process.exitCode = 1;
  });
}
