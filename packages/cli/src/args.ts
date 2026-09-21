export interface CliOptions {
  config?: string;
  flows: string[];
  report?: string;
  blockHits: boolean;
  help: boolean;
}

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = { flows: [], blockHits: false, help: false };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--config":
      case "-c":
        options.config = nextArg(args, ++i, arg);
        break;
      case "--flow":
      case "-f":
        options.flows.push(nextArg(args, ++i, arg));
        break;
      case "--report":
        options.report = nextArg(args, ++i, arg);
        break;
      case "--block-hits":
        options.blockHits = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function nextArg(args: string[], index: number, flag: string): string {
  const value = args[index];
  if (value === undefined) throw new Error(`Missing value for ${flag}`);
  return value;
}

export const USAGE = `Usage: beacon-qa --config <path> [--flow <name>]... [--report <path>] [--block-hits]

  --config, -c   Path to a beacon.config.mjs exporting { baseURL?, plan, flows }
  --flow, -f     Run only this flow (repeatable). Default: run every flow in the config
  --report       Write a static HTML report to this path
  --block-hits   Abort Adobe hits after capturing them, so the page's tags don't send test traffic to a real report suite
  --help, -h     Show this message
`;
