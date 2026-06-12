#!/usr/bin/env node
// Thin executable entry for the `code-indexer` bin. The dispatch logic lives in
// cli.ts (`runCli`) as a side-effect-free module so it can be imported and reused
// by the published dist bundle without auto-running.
import { runCli } from './cli.js';

runCli(process.argv.slice(2));
