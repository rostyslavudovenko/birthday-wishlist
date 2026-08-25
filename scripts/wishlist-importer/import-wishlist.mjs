import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

function parseEnvironmentFile(content) {
  const environment = {};

  for (const sourceLine of content.split(/\r?\n/u)) {
    const line = sourceLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    environment[key] = value;
  }

  return environment;
}

async function loadImporterConfiguration() {
  const environmentPath = resolve(process.cwd(), ".env.wishlist-importer");
  let fileEnvironment;

  try {
    const content = await readFile(environmentPath, "utf8");
    fileEnvironment = parseEnvironmentFile(content);
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(
        ".env.wishlist-importer was not found. Create it from the provided example.",
      );
    }

    throw error;
  }

  const url = process.env.SUPABASE_URL ?? fileEnvironment.SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? fileEnvironment.SUPABASE_SECRET_KEY;
  const siteUrl =
    process.env.WISHLIST_SITE_URL ??
    fileEnvironment.WISHLIST_SITE_URL ??
    "http://localhost:5173";

  if (!url || !secretKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SECRET_KEY are required in " +
        ".env.wishlist-importer.",
    );
  }

  return {
    url: url.replace(/\/+$/u, ""),
    secretKey,
    siteUrl: siteUrl.replace(/\/+$/u, ""),
  };
}

function runCommand(scriptName, inputPath) {
  const scriptPath = resolve(
    process.cwd(),
    `scripts/wishlist-importer/${scriptName}`,
  );

  const result = spawnSync(process.execPath, [scriptPath, inputPath], {
    encoding: "utf8",
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  return result.status === 0;
}

async function createWishlist(wishlist, configuration) {
  const response = await fetch(
    `${configuration.url}/rest/v1/rpc/create_wishlist_with_gifts`,
    {
      method: "POST",
      headers: {
        apikey: configuration.secretKey,
        Authorization: `Bearer ${configuration.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_slug: wishlist.slug,
        p_title: wishlist.title,
        p_owner_name: wishlist.ownerName,
        p_description: wishlist.description,
        p_icon: wishlist.icon,
        p_visibility: wishlist.visibility,
        p_is_featured: wishlist.isFeatured,
        p_display_order: wishlist.displayOrder,
        p_gifts: wishlist.gifts,
      }),
    },
  );

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      `Supabase import failed (${response.status}): ${responseText}`,
    );
  }

  const data = await response.json();

  if (!Array.isArray(data) || data.length !== 1) {
    throw new Error("Supabase returned an unexpected import response.");
  }

  return data[0];
}

async function main() {
  const inputPath = process.argv[2];
  const confirmationFlag = process.argv[3];

  if (!inputPath || confirmationFlag !== "--confirm") {
    console.error(
      "Usage: npm run wishlist:import -- <path-to-wishlist.json> --confirm",
    );
    console.error(
      "The --confirm flag is required because this command writes data.",
    );
    process.exitCode = 1;
    return;
  }

  if (!runCommand("validate-wishlist.mjs", inputPath)) {
    process.exitCode = 1;
    return;
  }

  if (!runCommand("preflight-wishlist.mjs", inputPath)) {
    process.exitCode = 1;
    return;
  }

  const absolutePath = resolve(process.cwd(), inputPath);
  const wishlist = JSON.parse(await readFile(absolutePath, "utf8"));
  const configuration = await loadImporterConfiguration();

  console.log("");
  console.log(`Creating wishlist "${wishlist.slug}"...`);

  const result = await createWishlist(wishlist, configuration);

  if (
    typeof result.wishlist_id !== "number" ||
    typeof result.created_gift_count !== "number"
  ) {
    throw new Error("Supabase returned incomplete import result data.");
  }

  console.log("Wishlist created successfully.");
  console.log(`Wishlist ID: ${result.wishlist_id}`);
  console.log(`Created gifts: ${result.created_gift_count}`);
  console.log(`URL: configuration.siteUrl/w/{wishlist.slug}`);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  console.error(`Wishlist import failed: ${message}`);
  process.exitCode = 1;
}
