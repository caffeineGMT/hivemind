#!/usr/bin/env node

import { parseArgs } from "node:util";
import { run } from "../src/cli.js";

run(process.argv.slice(2));
