const fs = require("fs");
const path = require("path");

function loadBackendEnv() {
  const envPath = path.resolve(__dirname, "../../backend/.env");
  if (!fs.existsSync(envPath)) return {};
  const values = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    values[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return values;
}

function getAdminCredentials() {
  const env = loadBackendEnv();
  return {
    email:
      process.env.E2E_ADMIN_EMAIL ||
      env.INITIAL_ADMIN_EMAIL ||
      "admin@example.com",
    password:
      process.env.E2E_ADMIN_PASSWORD || env.INITIAL_ADMIN_PASSWORD || "",
  };
}

async function assertNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    };
  });
  if (overflow.scrollWidth > overflow.clientWidth + 1) {
    throw new Error(
      `Horizontal overflow: scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth}`
    );
  }
}

module.exports = {
  getAdminCredentials,
  assertNoHorizontalOverflow,
};
