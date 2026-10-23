const { Writable } = require("node:stream");
const readline = require("node:readline");
const bcrypt = require("bcryptjs");
const { connectDb, disconnectDb } = require("../config/db");
const { env } = require("../config/env");
const { Admin } = require("../models/Admin");
const { emailField, strongPassword } = require("../validation/common");

/** Reads a line from the terminal; when `hidden` is true the typed characters are not echoed. */
function ask(question, hidden) {
  return new Promise((resolvePrompt) => {
    let muted = false;
    const output = new Writable({
      write(chunk, encoding, callback) {
        if (!muted) process.stdout.write(chunk, encoding);
        callback();
      },
    });
    const rl = readline.createInterface({ input: process.stdin, output, terminal: true });
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolvePrompt(answer);
    });
    muted = hidden;
  });
}

function readArg(name) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const allowAdditional = process.argv.includes("--additional");

  const emailInput = readArg("email") ?? process.env.ADMIN_EMAIL ?? (await ask("Administrator e-mail: ", false));
  const nameInput = readArg("name") ?? process.env.ADMIN_NAME ?? (await ask("Administrator name: ", false));
  const email = emailField.safeParse(emailInput);
  if (!email.success) throw new Error(`Invalid e-mail: ${email.error.issues[0]?.message ?? "invalid"}`);
  const name = nameInput.trim();
  if (name.length < 2 || name.length > 100) throw new Error("Name must contain between 2 and 100 characters");

  let passwordInput = process.env.ADMIN_PASSWORD;
  if (!passwordInput) {
    passwordInput = await ask("Password (min 12 chars, upper + lower + digit): ", true);
    const confirmation = await ask("Confirm password: ", true);
    if (passwordInput !== confirmation) throw new Error("Passwords do not match");
  }
  const password = strongPassword.safeParse(passwordInput);
  if (!password.success) throw new Error(`Weak password: ${password.error.issues.map((issue) => issue.message).join(", ")}`);

  const dbName = await connectDb();
  console.log(`Connected to database "${dbName}" (${env.NODE_ENV}).`);

  if (!allowAdditional && (await Admin.countDocuments()) > 0) {
    throw new Error("An administrator already exists. Use --additional only if you really want another one.");
  }
  if (await Admin.exists({ email: email.data })) throw new Error("An administrator with this e-mail already exists.");

  const passwordHash = await bcrypt.hash(password.data, env.BCRYPT_ROUNDS);
  await Admin.create({ email: email.data, name, passwordHash });
  console.log(`Administrator created: ${email.data}`);
}

main()
  .catch((error) => {
    console.error(`\nAdministrator not created: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
