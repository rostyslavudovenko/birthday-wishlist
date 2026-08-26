import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";

const stableKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const wishlistFields = [
  "slug",
  "title",
  "ownerName",
  "description",
  "icon",
  "theme",
  "visibility",
  "isFeatured",
  "displayOrder",
  "gifts",
];

const giftFields = ["key", "name", "description", "price", "image", "storeUrl"];

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyFields(value, allowedFields, path, errors) {
  for (const field of Object.keys(value)) {
    if (!allowedFields.includes(field)) {
      errors.push(`path.{field}: unknown field.`);
    }
  }
}

function validateString(value, path, errors, { minLength = 1, maxLength }) {
  if (typeof value !== "string") {
    errors.push(`${path}: must be a string.`);
    return;
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length < minLength) {
    errors.push(`${path}: must contain at least ${minLength} character(s).`);
  }

  if (maxLength !== undefined && normalizedValue.length > maxLength) {
    errors.push(`${path}: must contain no more than ${maxLength} characters.`);
  }
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validateGift(gift, index, errors) {
  const path = `gifts[${index}]`;

  if (!isRecord(gift)) {
    errors.push(`${path}: must be an object.`);
    return;
  }

  hasOnlyFields(gift, giftFields, path, errors);

  for (const field of giftFields) {
    if (!(field in gift)) {
      errors.push(`path.{field}: required field is missing.`);
    }
  }

  validateString(gift.key, `${path}.key`, errors, { maxLength: 120 });

  if (typeof gift.key === "string" && !stableKeyPattern.test(gift.key)) {
    errors.push(
      `${path}.key: use lowercase letters, numbers, and single hyphens only.`,
    );
  }

  validateString(gift.name, `${path}.name`, errors, { maxLength: 160 });
  validateString(gift.description, `${path}.description`, errors, {
    maxLength: 1000,
  });
  validateString(gift.price, `${path}.price`, errors, { maxLength: 120 });
  validateString(gift.image, `${path}.image`, errors, { maxLength: 2048 });

  if (gift.storeUrl !== null) {
    if (typeof gift.storeUrl !== "string" || !isHttpUrl(gift.storeUrl)) {
      errors.push(`${path}.storeUrl: must be null or a valid HTTP(S) URL.`);
    }
  }
}

function validateWishlist(value) {
  const errors = [];

  if (!isRecord(value)) {
    return ["Wishlist definition must be a JSON object."];
  }

  hasOnlyFields(value, wishlistFields, "wishlist", errors);

  for (const field of wishlistFields) {
    if (!(field in value)) {
      errors.push(`wishlist.${field}: required field is missing.`);
    }
  }

  validateString(value.slug, "wishlist.slug", errors, { maxLength: 120 });

  if (typeof value.slug === "string" && !stableKeyPattern.test(value.slug)) {
    errors.push(
      "wishlist.slug: use lowercase letters, numbers, and single hyphens only.",
    );
  }

  validateString(value.title, "wishlist.title", errors, { maxLength: 120 });
  validateString(value.ownerName, "wishlist.ownerName", errors, {
    maxLength: 80,
  });
  validateString(value.description, "wishlist.description", errors, {
    maxLength: 500,
  });
  validateString(value.icon, "wishlist.icon", errors, { maxLength: 20 });

  if (value.theme !== "classic" && value.theme !== "bubblegum") {
    errors.push('wishlist.theme: must be either "classic" or "bubblegum".');
  }

  if (value.visibility !== "public" && value.visibility !== "unlisted") {
    errors.push('wishlist.visibility: must be either "public" or "unlisted".');
  }

  if (typeof value.isFeatured !== "boolean") {
    errors.push("wishlist.isFeatured: must be a boolean.");
  }

  if (
    typeof value.displayOrder !== "number" ||
    !Number.isInteger(value.displayOrder) ||
    value.displayOrder < 0
  ) {
    errors.push("wishlist.displayOrder: must be a non-negative integer.");
  }

  if (!Array.isArray(value.gifts) || value.gifts.length === 0) {
    errors.push("wishlist.gifts: must contain at least one gift.");
  } else {
    value.gifts.forEach((gift, index) => validateGift(gift, index, errors));

    const giftKeyIndexes = new Map();

    value.gifts.forEach((gift, index) => {
      if (!isRecord(gift) || typeof gift.key !== "string") {
        return;
      }

      const previousIndex = giftKeyIndexes.get(gift.key);

      if (previousIndex !== undefined) {
        errors.push(
          `gifts[index].key:duplicatesgifts[{previousIndex}].key "${gift.key}".`,
        );
        return;
      }

      giftKeyIndexes.set(gift.key, index);
    });
  }

  return errors;
}

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error(
      "Usage: npm run wishlist:validate -- <path-to-wishlist.json>",
    );
    process.exitCode = 1;
    return;
  }

  const absolutePath = resolve(process.cwd(), inputPath);
  let wishlist;

  try {
    const fileContent = await readFile(absolutePath, "utf8");
    wishlist = JSON.parse(fileContent);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error(`Could not read wishlist definition: ${message}`);
    process.exitCode = 1;
    return;
  }

  const errors = validateWishlist(wishlist);

  if (errors.length > 0) {
    console.error(`Wishlist validation failed with ${errors.length} error(s):`);

    for (const error of errors) {
      console.error(`- ${error}`);
    }

    process.exitCode = 1;
    return;
  }

  console.log("Wishlist definition is valid.");
  console.log(`Slug: ${wishlist.slug}`);
  console.log(`Visibility: ${wishlist.visibility}`);
  console.log(`Gifts: ${wishlist.gifts.length}`);
}

await main();
