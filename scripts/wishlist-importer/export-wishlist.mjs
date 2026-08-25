import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

async function loadExporterConfiguration() {
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

  if (!url || !secretKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SECRET_KEY are required in " +
        ".env.wishlist-importer.",
    );
  }

  let normalizedUrl;

  try {
    normalizedUrl = new URL(url);
  } catch {
    throw new Error(
      "SUPABASE_URL in .env.wishlist-importer must be a valid absolute URL.",
    );
  }

  if (
    normalizedUrl.protocol !== "https:" &&
    normalizedUrl.protocol !== "http:"
  ) {
    throw new Error("SUPABASE_URL must use http:// or https://.");
  }

  return {
    url: normalizedUrl.toString().replace(/\/+$/u, ""),
    secretKey,
  };
}

async function requestRows(path, configuration) {
  const requestUrl = new URL(`/rest/v1/${path}`, `${configuration.url}/`);
  const response = await fetch(requestUrl, {
    headers: {
      apikey: configuration.secretKey,
      Authorization: `Bearer ${configuration.secretKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      `Supabase export failed (${response.status}): ${responseText}`,
    );
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Supabase returned an unexpected export response.");
  }

  return data;
}

async function fetchWishlist(slug, configuration) {
  const encodedSlug = encodeURIComponent(slug);
  const rows = await requestRows(
    `wishlists?select=id,slug,title,owner_name,description,icon,visibility,is_featured,display_order&slug=eq.${encodedSlug}&limit=1`,
    configuration,
  );

  return rows[0] ?? null;
}

async function fetchGifts(wishlistId, configuration) {
  return requestRows(
    `gifts?select=gift_key,name,description,price,image,store_url,display_order,is_visible&wishlist_id=eq.${wishlistId}&order=display_order.asc,id.asc`,
    configuration,
  );
}

function createDefinition(wishlist, gifts) {
  const visibleGifts = gifts.filter((gift) => gift.is_visible === true);

  return {
    slug: wishlist.slug,
    title: wishlist.title,
    ownerName: wishlist.owner_name,
    description: wishlist.description,
    icon: wishlist.icon,
    visibility: wishlist.visibility,
    isFeatured: wishlist.is_featured,
    displayOrder: wishlist.display_order,
    gifts: visibleGifts.map((gift) => ({
      key: gift.gift_key,
      name: gift.name,
      description: gift.description,
      price: gift.price,
      image: gift.image,
      storeUrl: gift.store_url,
    })),
  };
}

async function fileExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function main() {
  const slug = process.argv[2];
  const force = process.argv.includes("--force");

  if (!slug || !slugPattern.test(slug)) {
    console.error(
      "Usage: npm run wishlist:export -- <wishlist-slug> [--force]",
    );
    console.error(
      "The slug must use lowercase letters, numbers, and single hyphens only.",
    );
    process.exitCode = 1;
    return;
  }

  const configuration = await loadExporterConfiguration();
  const wishlist = await fetchWishlist(slug, configuration);

  if (!wishlist) {
    throw new Error(`Wishlist "${slug}" was not found.`);
  }

  const gifts = await fetchGifts(wishlist.id, configuration);
  const definition = createDefinition(wishlist, gifts);

  if (definition.gifts.length === 0) {
    throw new Error(`Wishlist "${slug}" has no visible gifts to export.`);
  }

  const outputDirectory = resolve(process.cwd(), "wishlists/private");
  const outputPath = resolve(outputDirectory, `${slug}.json`);

  await mkdir(outputDirectory, { recursive: true });

  if (!force && (await fileExists(outputPath))) {
    throw new Error(
      `Export stopped: ${outputPath} already exists. Use --force to replace it.`,
    );
  }

  await writeFile(outputPath, `${JSON.stringify(definition, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });

  console.log("Wishlist exported successfully.");
  console.log(`Slug: ${definition.slug}`);
  console.log(`Gifts: ${definition.gifts.length}`);
  console.log(`File: ${outputPath}`);
  console.log("");
  console.log("Reservation names and tokens were not exported.");
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  console.error(`Wishlist export failed: ${message}`);
  process.exitCode = 1;
}
