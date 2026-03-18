import crypto from "crypto";

// License key format: HIVE-{VERSION}-{CHECKSUM}-{EXPIRY}
// Example: HIVE-1-A3F2B1C4-20261231

const LICENSE_SECRET = process.env.HIVEMIND_LICENSE_SECRET || "hivemind-default-secret-change-in-production";

export function validateLicense(licenseKey) {
  if (!licenseKey) {
    return {
      valid: false,
      error: "License key required for on-premise deployment",
      tier: null
    };
  }

  // Parse license key
  const parts = licenseKey.split("-");
  if (parts.length !== 4 || parts[0] !== "HIVE") {
    return {
      valid: false,
      error: "Invalid license key format",
      tier: null
    };
  }

  const [prefix, version, checksum, expiry] = parts;

  // Validate checksum
  const payload = `${prefix}-${version}-${expiry}`;
  const expectedChecksum = crypto
    .createHmac("sha256", LICENSE_SECRET)
    .update(payload)
    .digest("hex")
    .substring(0, 8)
    .toUpperCase();

  if (checksum !== expectedChecksum) {
    return {
      valid: false,
      error: "Invalid license key signature",
      tier: null
    };
  }

  // Check expiry
  if (expiry !== "UNLIMITED") {
    const expiryDate = new Date(
      expiry.substring(0, 4),
      parseInt(expiry.substring(4, 6)) - 1,
      expiry.substring(6, 8)
    );

    if (expiryDate < new Date()) {
      return {
        valid: false,
        error: `License expired on ${expiryDate.toDateString()}`,
        tier: null
      };
    }
  }

  // Determine tier based on version
  const tiers = {
    "1": "starter",
    "2": "professional",
    "3": "enterprise",
    "99": "unlimited"
  };

  return {
    valid: true,
    tier: tiers[version] || "starter",
    version,
    expiry: expiry === "UNLIMITED" ? null : expiry,
    error: null
  };
}

export function generateLicense(version = "1", expiryDate = "UNLIMITED") {
  // version: 1=starter, 2=professional, 3=enterprise, 99=unlimited
  // expiryDate: YYYYMMDD format or "UNLIMITED"

  const payload = `HIVE-${version}-${expiryDate}`;
  const checksum = crypto
    .createHmac("sha256", LICENSE_SECRET)
    .update(payload)
    .digest("hex")
    .substring(0, 8)
    .toUpperCase();

  return `HIVE-${version}-${checksum}-${expiryDate}`;
}

export function checkLicense() {
  const licenseKey = process.env.HIVEMIND_LICENSE_KEY;

  // Skip license check in development
  if (process.env.NODE_ENV !== "production") {
    console.log("[license] Development mode - license check skipped");
    return { valid: true, tier: "dev", error: null };
  }

  // Skip license check if not using on-premise deployment (no DB_URL)
  if (!process.env.DB_URL && !process.env.HIVEMIND_ONPREMISE) {
    return { valid: true, tier: "cloud", error: null };
  }

  const result = validateLicense(licenseKey);

  if (!result.valid) {
    console.error(`[license] INVALID LICENSE: ${result.error}`);
    console.error(`[license] On-premise deployment requires a valid license key.`);
    console.error(`[license] Set HIVEMIND_LICENSE_KEY environment variable.`);
    console.error(`[license] Contact sales@hivemind.com for a license.`);
  } else {
    console.log(`[license] Valid ${result.tier} license`);
    if (result.expiry) {
      console.log(`[license] Expires: ${result.expiry}`);
    }
  }

  return result;
}

// CLI tool for generating licenses (admin only)
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args[0] === "generate") {
    const version = args[1] || "1";
    const expiry = args[2] || "UNLIMITED";
    const license = generateLicense(version, expiry);
    console.log(`Generated license key: ${license}`);
    console.log(`Tier: ${["starter", "professional", "enterprise", "unlimited"][parseInt(version) === 99 ? 3 : parseInt(version) - 1]}`);
    console.log(`Expiry: ${expiry}`);
  } else if (args[0] === "validate") {
    const license = args[1];
    const result = validateLicense(license);
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("Usage:");
    console.log("  node src/license.js generate [version] [expiry]");
    console.log("  node src/license.js validate <license-key>");
    console.log("");
    console.log("Versions: 1=starter, 2=professional, 3=enterprise, 99=unlimited");
    console.log("Expiry: YYYYMMDD or UNLIMITED");
  }
}
