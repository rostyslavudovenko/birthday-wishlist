import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

function loadEnvironmentFile(content) {
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

async function getSupabaseConfiguration() {
  let fileEnvironment = {};

  try {
    const content = await readFile(
      resolve(process.cwd(), ".env.local"),
      "utf8",
    );
    fileEnvironment = loadEnvironmentFile(content);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  const url =
    process.env.VITE_SUPABASE_URL ?? fileEnvironment.VITE_SUPABASE_URL;
  const publishableKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    fileEnvironment.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase configuration is missing. Add VITE_SUPABASE_URL and " +
        "VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.",
    );
  }

  return {
    url: url.replace(/\/+$/u, ""),
    publishableKey,
  };
}

function runLocalValidation(inputPath) {
  const validatorPath = resolve(
    process.cwd(),
    "scripts/wishlist-importer/validate-wishlist.mjs",
  );

  const result = spawnSync(process.execPath, [validatorPath, inputPath], {
    encoding: "utf8",
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    return false;
  }

  return true;
}

async function wishlistExists(slug, configuration) {
  const response = await fetch(
    `${configuration.url}/rest/v1/rpc/get_wishlist`,
    {
      method: "POST",
      headers: {
        apikey: configuration.publishableKey,
        Authorization: `Bearer ${configuration.publishableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_wishlist_slug: slug,
      }),
    },
  );

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      `Supabase preflight failed (${response.status}): ${responseText}`,
    );
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Supabase returned an unexpected preflight response.");
  }

  return data.length > 0;
}

function printCreationPlan(wishlist) {
  console.log("");
  console.log("Creation plan");
  console.log("-------------");
  console.log(`Slug: ${wishlist.slug}`);
  console.log(`Title: ${wishlist.title}`);
  console.log(`Visibility: ${wishlist.visibility}`);
  console.log(`Featured: ${wishlist.isFeatured ? "yes" : "no"}`);
  console.log(`Wishlist display order: ${wishlist.displayOrder}`);
  console.log(`Gifts: ${wishlist.gifts.length}`);
  console.log("");

  wishlist.gifts.forEach((gift, index) => {
    const displayOrder = (index + 1) * 10;
    console.log(`${displayOrder}: ${gift.name}`);
  });
}

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error(
      "Usage: npm run wishlist:preflight -- <path-to-wishlist.json>",
    );
    process.exitCode = 1;
    return;
  }

  if (!runLocalValidation(inputPath)) {
    return;
  }

  const absolutePath = resolve(process.cwd(), inputPath);
  const wishlist = JSON.parse(await readFile(absolutePath, "utf8"));
  const configuration = await getSupabaseConfiguration();

  console.log("");
  console.log("Checking Supabase...");

  if (await wishlistExists(wishlist.slug, configuration)) {
    console.error(
      `Preflight failed: wishlist slug "${wishlist.slug}" already exists.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(`Slug "${wishlist.slug}" is available.`);
  printCreationPlan(wishlist);
  console.log("");
  console.log("Preflight passed. No data was written to Supabase.");
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  console.error(`Preflight failed: ${message}`);
  process.exitCode = 1;
}
