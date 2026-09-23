import { spawnSync } from "node:child_process";
import { networkInterfaces } from "node:os";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const MOBILE_DIR = path.join(ROOT, "apps/mobile");
const EAS_CONFIG = path.join(MOBILE_DIR, "eas.json");
const API_PORT = process.env.PORT ?? "4100";
const isWindows = process.platform === "win32";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipBuild = args.includes("--skip-build");
const explicitUrl = args.find((arg) => arg.startsWith("--api-url="))?.split("=")[1];

/** Lower rank = better candidate. Docker/WSL/VPN adapters usually live in 172.16/12. */
const rankAddress = (address: string): number => {
  if (address.startsWith("192.168.")) return 0;
  if (address.startsWith("10.")) return 1;
  return 2;
};

const detectLanIp = (): string => {
  const candidates = Object.values(networkInterfaces())
    .flat()
    .filter((iface): iface is NonNullable<typeof iface> => !!iface && iface.family === "IPv4" && !iface.internal)
    .map((iface) => iface.address)
    .sort((a, b) => rankAddress(a) - rankAddress(b));

  if (candidates.length === 0) {
    throw new Error("No LAN IPv4 address found. Connect to a network or pass --api-url=http://<host>:<port>/api");
  }
  return candidates[0];
};

const run = (command: string, commandArgs: string[], cwd = ROOT): number =>
  spawnSync(command, commandArgs, { cwd, stdio: "inherit", shell: isWindows }).status ?? 1;

const exists = (command: string): boolean =>
  spawnSync(command, ["--version"], { stdio: "ignore", shell: isWindows }).status === 0;

const step = (label: string, command: string, commandArgs: string[]): void => {
  console.log(`
> ${label}`);
  if (run(command, commandArgs) !== 0) throw new Error(`Step failed: ${label}`);
};

const waitForPostgres = (): void => {
  for (let attempt = 0; attempt < 30; attempt++) {
    const result = spawnSync("docker", ["inspect", "-f", "{{.State.Health.Status}}", "cardscan-postgres"], {
      encoding: "utf8",
      shell: isWindows,
    });
    if (result.stdout?.trim() === "healthy") return;
    spawnSync(process.execPath, ["-e", "setTimeout(() => {}, 2000)"]);
  }
  throw new Error("Postgres did not become healthy in time");
};

/** Lets the phone reach the API on Windows. Needs an elevated shell; a failure is reported, not fatal. */
const openFirewall = (): void => {
  if (!isWindows) return;
  const ruleName = "CardScan API";
  const existing = spawnSync("netsh", ["advfirewall", "firewall", "show", "rule", `name=${ruleName}`], { stdio: "ignore" });
  if (existing.status === 0) return;

  const created = spawnSync(
    "netsh",
    ["advfirewall", "firewall", "add", "rule", `name=${ruleName}`, "dir=in", "action=allow", "protocol=TCP", `localport=${API_PORT}`],
    { stdio: "ignore" },
  );
  console.log(
    created.status === 0
      ? `Firewall: opened TCP ${API_PORT}`
      : `Firewall: could not open TCP ${API_PORT} (run this terminal as Administrator once, or allow it manually)`,
  );
};

/** Cards already imported, or 0 when the table is empty or unreachable. */
const countCards = (): number => {
  const result = spawnSync(
    "docker",
    ["exec", "cardscan-postgres", "psql", "-U", "cardscan", "-d", "cardscan", "-tAc", "select count(*) from cards"],
    // No shell: the SQL contains spaces, and cmd.exe would split it into separate arguments.
    { encoding: "utf8" },
  );
  return Number.parseInt(result.stdout?.trim() ?? "", 10) || 0;
};

const prepareStack = (): void => {
  if (!fs.existsSync(path.join(ROOT, ".env"))) {
    fs.copyFileSync(path.join(ROOT, ".env.example"), path.join(ROOT, ".env"));
    console.log("Created .env from .env.example");
  }
  if (!fs.existsSync(path.join(ROOT, "node_modules"))) step("Installing dependencies", "pnpm", ["install"]);
  if (!exists("docker")) throw new Error("Docker is required for Postgres/Redis. Install Docker Desktop and retry.");

  step("Starting Postgres + Redis", "pnpm", ["docker:up"]);
  waitForPostgres();
  step("Applying database migrations", "pnpm", ["exec", "dotenv", "-e", ".env", "--", "prisma", "migrate", "deploy", "--schema=prisma/schema.prisma"]);

  // Without a catalog the app opens onto empty screens, so import Pokémon (seconds) and Magic (minutes).
  if (countCards() === 0) {
    step("Importing the Pokémon catalog", "pnpm", ["--filter", "@cardscan/api", "sync:pokemon"]);
    step("Importing the Magic catalog (a few minutes)", "pnpm", ["--filter", "@cardscan/api", "sync:magic"]);
  }
  openFirewall();
};

const writeApiUrl = (apiUrl: string): void => {
  const config = JSON.parse(fs.readFileSync(EAS_CONFIG, "utf8"));
  config.build.preview.env = { ...config.build.preview.env, EXPO_PUBLIC_API_URL: apiUrl };
  fs.writeFileSync(EAS_CONFIG, `${JSON.stringify(config, null, 2)}\n`);
};

const main = (): void => {
  const apiUrl = explicitUrl ?? `http://${detectLanIp()}:${API_PORT}/api`;
  console.log(`\nAPI URL baked into the APK: ${apiUrl}`);
  writeApiUrl(apiUrl);

  if (dryRun) {
    console.log("Dry run: eas.json updated, nothing else executed.");
    return;
  }

  prepareStack();
  if (skipBuild) {
    console.log("\nStack ready (--skip-build). Start the API with: pnpm dev:api");
    return;
  }

  if (!exists("eas")) {
    console.log("Installing eas-cli...");
    if (run("npm", ["install", "-g", "eas-cli"]) !== 0) process.exit(1);
  }

  if (run("eas", ["whoami"], MOBILE_DIR) !== 0) {
    console.log("Not logged in to Expo. Opening login...");
    if (run("eas", ["login"], MOBILE_DIR) !== 0) process.exit(1);
  }

  console.log("\nStarting Android APK build on EAS (takes a few minutes)...\n");
  const status = run("eas", ["build", "-p", "android", "--profile", "preview", "--non-interactive"], MOBILE_DIR);
  if (status !== 0) process.exit(status);

  console.log(`\nDone. Keep the API reachable at ${apiUrl} (pnpm docker:up && pnpm dev:api) while using the app.`);
};

try {
  main();
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}
