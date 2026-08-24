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

async function loadConfiguration() {
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

  return {
    url: url.replace(/\/+$/u, ""),
    secretKey,
  };
}

function runValidation(inputPath) {
  const validatorPath = resolve(
    process.cwd(),
    "scripts/wishlist-importer/validate-wishlist.mjs",
  );

  const result = spawnSync(process.execPath, [validatorPath, inputPath], {
    encoding: "utf8",
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  return result.status === 0;
}

async function requestRows(path, configuration) {
  const response = await fetch(`${configuration.url}/rest/v1/${path}`, {
    headers: {
      apikey: configuration.secretKey,
      Authorization: `Bearer ${configuration.secretKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const responseText = await response.text();

    throw new Error(
      `Supabase sync preview failed (${response.status}): ${responseText}`,
    );
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Supabase returned an unexpected sync preview response.");
  }

  return data;
}

async function fetchCurrentWishlist(slug, configuration) {
  const encodedSlug = encodeURIComponent(slug);
  const rows = await requestRows(
    `wishlists?select=id,slug,title,owner_name,description,icon,visibility,is_featured,display_order&slug=eq.${encodedSlug}&limit=1`,
    configuration,
  );

  return rows[0] ?? null;
}

async function fetchCurrentGifts(wishlistId, configuration) {
  return requestRows(
    `gifts?select=gift_key,name,description,price,image,store_url,display_order,is_visible,reserved_at&wishlist_id=eq.${wishlistId}&order=display_order.asc,id.asc`,
    configuration,
  );
}

function compareField(changes, label, currentValue, nextValue) {
  if (currentValue !== nextValue) {
    changes.push({ label, currentValue, nextValue });
  }
}

function buildWishlistChanges(current, next) {
  const changes = [];

  compareField(changes, "Title", current.title, next.title);
  compareField(changes, "Owner name", current.owner_name, next.ownerName);
  compareField(changes, "Description", current.description, next.description);
  compareField(changes, "Icon", current.icon, next.icon);
  compareField(changes, "Visibility", current.visibility, next.visibility);
  compareField(changes, "Featured", current.is_featured, next.isFeatured);
  compareField(
    changes,
    "Display order",
    current.display_order,
    next.displayOrder,
  );

  return changes;
}

function buildGiftChanges(currentGifts, nextGifts) {
  const currentByKey = new Map(
    currentGifts.map((gift) => [gift.gift_key, gift]),
  );
  const nextByKey = new Map(nextGifts.map((gift) => [gift.key, gift]));

  const additions = [];
  const updates = [];
  const reorders = [];
  const hides = [];
  const restores = [];
  const unchanged = [];

  nextGifts.forEach((nextGift, index) => {
    const nextDisplayOrder = (index + 1) * 10;
    const currentGift = currentByKey.get(nextGift.key);

    if (!currentGift) {
      additions.push({
        key: nextGift.key,
        name: nextGift.name,
        displayOrder: nextDisplayOrder,
      });
      return;
    }

    if (!currentGift.is_visible) {
      restores.push({ key: nextGift.key, name: nextGift.name });
    }

    const changedFields = [];
    compareField(changedFields, "name", currentGift.name, nextGift.name);
    compareField(
      changedFields,
      "description",
      currentGift.description,
      nextGift.description,
    );
    compareField(changedFields, "price", currentGift.price, nextGift.price);
    compareField(changedFields, "image", currentGift.image, nextGift.image);
    compareField(
      changedFields,
      "store URL",
      currentGift.store_url,
      nextGift.storeUrl,
    );

    if (changedFields.length > 0) {
      updates.push({
        key: nextGift.key,
        name: nextGift.name,
        changedFields,
      });
    }

    if (currentGift.display_order !== nextDisplayOrder) {
      reorders.push({
        key: nextGift.key,
        name: nextGift.name,
        currentOrder: currentGift.display_order,
        nextOrder: nextDisplayOrder,
      });
    }

    if (
      currentGift.is_visible &&
      changedFields.length === 0 &&
      currentGift.display_order === nextDisplayOrder
    ) {
      unchanged.push({ key: nextGift.key, name: nextGift.name });
    }
  });

  currentGifts.forEach((currentGift) => {
    if (currentGift.is_visible && !nextByKey.has(currentGift.gift_key)) {
      hides.push({
        key: currentGift.gift_key,
        name: currentGift.name,
        isReserved: currentGift.reserved_at !== null,
      });
    }
  });

  return {
    additions,
    updates,
    reorders,
    hides,
    restores,
    unchanged,
  };
}

function formatValue(value) {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string" && value.length > 90) {
    return `${value.slice(0, 87)}...`;
  }

  return JSON.stringify(value);
}

function printWishlistChanges(changes) {
  console.log("Wishlist changes");
  console.log("----------------");

  if (changes.length === 0) {
    console.log("No metadata changes.");
    return;
  }

  for (const change of changes) {
    console.log(
      `~ ${change.label}: ${formatValue(change.currentValue)} -> ${formatValue(change.nextValue)}`,
    );
  }
}

function printGiftChanges(changes) {
  console.log("");
  console.log("Gift changes");
  console.log("------------");

  for (const gift of changes.additions) {
    console.log(`+ ADD [${gift.key}] ${gift.name} at ${gift.displayOrder}`);
  }

  for (const gift of changes.updates) {
    console.log(`~ UPDATE [${gift.key}] ${gift.name}`);

    for (const field of gift.changedFields) {
      console.log(
        `    ${field.label}: ${formatValue(field.currentValue)} -> ${formatValue(field.nextValue)}`,
      );
    }
  }

  for (const gift of changes.reorders) {
    console.log(
      `↕ REORDER [${gift.key}] ${gift.name}: ${gift.currentOrder} -> ${gift.nextOrder}`,
    );
  }

  for (const gift of changes.restores) {
    console.log(`↺ RESTORE [${gift.key}] ${gift.name}`);
  }

  for (const gift of changes.hides) {
    const reservationNote = gift.isReserved ? " (currently reserved)" : "";
    console.log(`- HIDE [${gift.key}] gift.name{reservationNote}`);
  }

  if (
    changes.additions.length === 0 &&
    changes.updates.length === 0 &&
    changes.reorders.length === 0 &&
    changes.restores.length === 0 &&
    changes.hides.length === 0
  ) {
    console.log("No gift changes.");
  }

  console.log("");
  console.log(`Unchanged gifts: ${changes.unchanged.length}`);
}

function countChanges(wishlistChanges, giftChanges) {
  return (
    wishlistChanges.length +
    giftChanges.additions.length +
    giftChanges.updates.length +
    giftChanges.reorders.length +
    giftChanges.hides.length +
    giftChanges.restores.length
  );
}

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error("Usage: npm run wishlist:sync -- <path-to-wishlist.json>");
    process.exitCode = 1;
    return;
  }

  if (!runValidation(inputPath)) {
    process.exitCode = 1;
    return;
  }

  const absolutePath = resolve(process.cwd(), inputPath);
  const definition = JSON.parse(await readFile(absolutePath, "utf8"));
  const configuration = await loadConfiguration();
  const currentWishlist = await fetchCurrentWishlist(
    definition.slug,
    configuration,
  );

  if (!currentWishlist) {
    throw new Error(
      `Wishlist "${definition.slug}" was not found. Use wishlist:import to create it.`,
    );
  }

  const currentGifts = await fetchCurrentGifts(
    currentWishlist.id,
    configuration,
  );
  const wishlistChanges = buildWishlistChanges(currentWishlist, definition);
  const giftChanges = buildGiftChanges(currentGifts, definition.gifts);
  const totalChanges = countChanges(wishlistChanges, giftChanges);

  console.log("");
  console.log(`Sync preview for "${definition.slug}"`);
  console.log("=".repeat(24 + definition.slug.length));
  console.log("");

  printWishlistChanges(wishlistChanges);
  printGiftChanges(giftChanges);

  console.log("");
  console.log(`Planned changes: ${totalChanges}`);
  console.log("Read-only preview complete. No data was written to Supabase.");
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  console.error(`Wishlist sync preview failed: ${message}`);
  process.exitCode = 1;
}
