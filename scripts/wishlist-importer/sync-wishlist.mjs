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
    fileEnvironment = parseEnvironmentFile(
      await readFile(environmentPath, "utf8"),
    );
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(".env.wishlist-importer was not found.");
    }

    throw error;
  }

  const url = process.env.SUPABASE_URL ?? fileEnvironment.SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ?? fileEnvironment.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SECRET_KEY are required in .env.wishlist-importer.",
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
  const requestUrl = new URL("rest/v1/" + path, configuration.url + "/");
  const response = await fetch(requestUrl, {
    headers: {
      apikey: configuration.secretKey,
      Authorization: "Bearer " + configuration.secretKey,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      "Supabase request failed (" +
        response.status +
        "): " +
        (await response.text()),
    );
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Supabase returned an unexpected response.");
  }

  return data;
}

async function fetchCurrentWishlist(slug, configuration) {
  const rows = await requestRows(
    "wishlists?select=id,slug,title,owner_name,description,icon,theme,visibility,is_featured,display_order&slug=eq." +
      encodeURIComponent(slug) +
      "&limit=1",
    configuration,
  );

  return rows[0] ?? null;
}

async function fetchCurrentGifts(wishlistId, configuration) {
  return requestRows(
    "gifts?select=gift_key,name,description,price,image,store_url,display_order,is_visible,reserved_at&wishlist_id=eq." +
      wishlistId +
      "&order=display_order.asc,id.asc",
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
  compareField(changes, "Theme", current.theme, next.theme);
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
  const changes = {
    additions: [],
    updates: [],
    reorders: [],
    hides: [],
    restores: [],
    unchanged: [],
  };

  nextGifts.forEach((nextGift, index) => {
    const nextOrder = (index + 1) * 10;
    const currentGift = currentByKey.get(nextGift.key);

    if (!currentGift) {
      changes.additions.push({ ...nextGift, displayOrder: nextOrder });
      return;
    }

    if (!currentGift.is_visible) {
      changes.restores.push({ key: nextGift.key, name: nextGift.name });
    }

    const fields = [];

    compareField(fields, "name", currentGift.name, nextGift.name);
    compareField(
      fields,
      "description",
      currentGift.description,
      nextGift.description,
    );
    compareField(fields, "price", currentGift.price, nextGift.price);
    compareField(fields, "image", currentGift.image, nextGift.image);
    compareField(fields, "store URL", currentGift.store_url, nextGift.storeUrl);

    if (fields.length > 0) {
      changes.updates.push({
        key: nextGift.key,
        name: nextGift.name,
        fields,
      });
    }

    if (currentGift.display_order !== nextOrder) {
      changes.reorders.push({
        key: nextGift.key,
        name: nextGift.name,
        currentOrder: currentGift.display_order,
        nextOrder,
      });
    }

    if (
      currentGift.is_visible &&
      fields.length === 0 &&
      currentGift.display_order === nextOrder
    ) {
      changes.unchanged.push({ key: nextGift.key, name: nextGift.name });
    }
  });

  currentGifts.forEach((gift) => {
    if (gift.is_visible && !nextByKey.has(gift.gift_key)) {
      changes.hides.push({
        key: gift.gift_key,
        name: gift.name,
        isReserved: gift.reserved_at !== null,
      });
    }
  });

  return changes;
}

function formatValue(value) {
  if (value === null) {
    return "null";
  }

  const output = JSON.stringify(value);
  return output.length > 90 ? output.slice(0, 87) + "..." : output;
}

function printPreview(slug, wishlistChanges, giftChanges) {
  console.log('\nSync preview for "' + slug + '"\n');
  console.log("Wishlist changes");
  console.log("----------------");

  if (wishlistChanges.length === 0) {
    console.log("No metadata changes.");
  }

  for (const change of wishlistChanges) {
    console.log(
      "~ " +
        change.label +
        ": " +
        formatValue(change.currentValue) +
        " -> " +
        formatValue(change.nextValue),
    );
  }

  console.log("\nGift changes");
  console.log("------------");

  for (const gift of giftChanges.additions) {
    console.log("+ ADD [" + gift.key + "] " + gift.name);
  }

  for (const gift of giftChanges.updates) {
    console.log("~ UPDATE [" + gift.key + "] " + gift.name);

    for (const field of gift.fields) {
      console.log(
        "    " +
          field.label +
          ": " +
          formatValue(field.currentValue) +
          " -> " +
          formatValue(field.nextValue),
      );
    }
  }

  for (const gift of giftChanges.reorders) {
    console.log(
      "REORDER [" +
        gift.key +
        "] " +
        gift.name +
        ": " +
        gift.currentOrder +
        " -> " +
        gift.nextOrder,
    );
  }

  for (const gift of giftChanges.restores) {
    console.log("RESTORE [" + gift.key + "] " + gift.name);
  }

  for (const gift of giftChanges.hides) {
    const reservationNote = gift.isReserved ? " (currently reserved)" : "";
    console.log("- HIDE [" + gift.key + "] " + gift.name + reservationNote);
  }

  const total =
    wishlistChanges.length +
    giftChanges.additions.length +
    giftChanges.updates.length +
    giftChanges.reorders.length +
    giftChanges.hides.length +
    giftChanges.restores.length;

  console.log("\nUnchanged gifts: " + giftChanges.unchanged.length);
  console.log("Planned changes: " + total);

  return total;
}

async function applySync(definition, configuration, allowHideReserved) {
  const requestUrl = new URL(
    "rest/v1/rpc/sync_wishlist_with_gifts",
    configuration.url + "/",
  );
  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      apikey: configuration.secretKey,
      Authorization: "Bearer " + configuration.secretKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_slug: definition.slug,
      p_title: definition.title,
      p_owner_name: definition.ownerName,
      p_description: definition.description,
      p_icon: definition.icon,
      p_theme: definition.theme,
      p_visibility: definition.visibility,
      p_is_featured: definition.isFeatured,
      p_display_order: definition.displayOrder,
      p_gifts: definition.gifts,
      p_allow_hide_reserved: allowHideReserved,
    }),
  });

  if (!response.ok) {
    throw new Error(
      "Supabase sync failed (" +
        response.status +
        "): " +
        (await response.text()),
    );
  }

  const data = await response.json();

  if (!Array.isArray(data) || data.length !== 1) {
    throw new Error("Supabase returned an unexpected sync result.");
  }

  return data[0];
}

async function main() {
  const inputPath = process.argv[2];
  const confirm = process.argv.includes("--confirm");
  const allowHideReserved = process.argv.includes("--allow-hide-reserved");

  if (!inputPath) {
    console.error(
      "Usage: npm run wishlist:sync -- <path> [--confirm] [--allow-hide-reserved]",
    );
    process.exitCode = 1;
    return;
  }

  if (allowHideReserved && !confirm) {
    throw new Error("--allow-hide-reserved requires --confirm.");
  }

  if (!runValidation(inputPath)) {
    process.exitCode = 1;
    return;
  }

  const definition = JSON.parse(
    await readFile(resolve(process.cwd(), inputPath), "utf8"),
  );
  const configuration = await loadConfiguration();
  const currentWishlist = await fetchCurrentWishlist(
    definition.slug,
    configuration,
  );

  if (!currentWishlist) {
    throw new Error(
      'Wishlist "' +
        definition.slug +
        '" was not found. Use wishlist:import to create it.',
    );
  }

  const currentGifts = await fetchCurrentGifts(
    currentWishlist.id,
    configuration,
  );
  const wishlistChanges = buildWishlistChanges(currentWishlist, definition);
  const giftChanges = buildGiftChanges(currentGifts, definition.gifts);
  const totalChanges = printPreview(
    definition.slug,
    wishlistChanges,
    giftChanges,
  );

  if (!confirm) {
    console.log("Read-only preview complete. No data was written to Supabase.");
    return;
  }

  if (totalChanges === 0) {
    console.log("Nothing to synchronize.");
    return;
  }

  const reservedHides = giftChanges.hides.filter((gift) => gift.isReserved);

  if (reservedHides.length > 0 && !allowHideReserved) {
    throw new Error(
      "Sync would hide a reserved gift. Review the preview and rerun with " +
        "--confirm --allow-hide-reserved only if this is intentional.",
    );
  }

  console.log("\nApplying atomic synchronization...");
  const result = await applySync(definition, configuration, allowHideReserved);

  console.log("Wishlist synchronized successfully.");
  console.log("Added: " + result.added_count);
  console.log("Updated: " + result.updated_count);
  console.log("Hidden: " + result.hidden_count);
  console.log("Restored: " + result.restored_count);
}

try {
  await main();
} catch (error) {
  console.error(
    "Wishlist sync failed: " +
      (error instanceof Error ? error.message : String(error)),
  );
  process.exitCode = 1;
}
