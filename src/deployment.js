import { execSync } from "node:child_process";
import * as db from "./db.js";

/**
 * Create a Git tag for the current commit before deployment
 * @param {string} companyId - Company ID
 * @param {string} cwd - Working directory
 * @returns {{commitSha: string, gitTag: string}} - Commit SHA and tag name
 */
export function tagDeployment(companyId, cwd) {
  try {
    // Get current commit SHA
    const commitSha = execSync("git rev-parse HEAD", { cwd, encoding: "utf-8" }).trim();

    // Create tag with timestamp
    const timestamp = new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15);
    const gitTag = `deploy-${timestamp}`;

    // Create and push tag
    execSync(`git tag ${gitTag}`, { cwd });
    execSync(`git push origin ${gitTag}`, { cwd });

    console.log(`[deployment] Tagged commit ${commitSha.slice(0, 8)} as ${gitTag}`);

    return { commitSha, gitTag };
  } catch (err) {
    console.error(`[deployment] Failed to tag commit: ${err.message}`);
    throw err;
  }
}

/**
 * Health check the deployment URL
 * @param {string} url - Deployment URL to check
 * @param {number} maxRetries - Maximum retry attempts
 * @param {number} retryDelayMs - Delay between retries in milliseconds
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function healthCheckDeployment(url, maxRetries = 5, retryDelayMs = 3000) {
  console.log(`[deployment] Health checking ${url}...`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${url}/api/health`, {
        method: "GET",
        headers: { "User-Agent": "Hivemind-Health-Check" },
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[deployment] Health check passed: ${JSON.stringify(data)}`);
        return { success: true };
      } else {
        console.log(`[deployment] Health check attempt ${attempt}/${maxRetries}: HTTP ${response.status}`);
      }
    } catch (err) {
      console.log(`[deployment] Health check attempt ${attempt}/${maxRetries}: ${err.message}`);
    }

    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, retryDelayMs));
    }
  }

  return { success: false, error: `Health check failed after ${maxRetries} attempts` };
}

/**
 * Rollback to the last known good deployment
 * @param {string} companyId - Company ID
 * @param {string} cwd - Working directory
 * @param {string} reason - Reason for rollback
 * @returns {Promise<{success: boolean, deploymentUrl?: string, error?: string}>}
 */
export async function rollbackDeployment(companyId, cwd, reason) {
  console.log(`[deployment] Rolling back deployment for company ${companyId.slice(0, 8)}...`);
  console.log(`[deployment] Reason: ${reason}`);

  try {
    // Get last successful deployment
    const lastGood = db.getLastSuccessfulDeployment(companyId);

    if (!lastGood) {
      console.error("[deployment] No previous successful deployment found to rollback to");
      return { success: false, error: "No previous successful deployment found" };
    }

    console.log(`[deployment] Found last good deployment: ${lastGood.git_tag} (${lastGood.commit_sha.slice(0, 8)})`);

    // Save current state (stash uncommitted changes if any)
    try {
      execSync("git stash push -u -m 'Auto-stash before rollback'", { cwd, stdio: "ignore" });
    } catch {
      // No changes to stash
    }

    // Reset to last good commit
    execSync(`git reset --hard ${lastGood.commit_sha}`, { cwd });
    execSync(`git push origin main --force`, { cwd });

    console.log(`[deployment] Reset to commit ${lastGood.commit_sha.slice(0, 8)}`);

    // Deploy to Vercel
    console.log(`[deployment] Deploying rolled-back version to Vercel...`);
    const deployOutput = execSync("npx vercel --prod --yes", {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Extract deployment URL from Vercel output
    const urlMatch = deployOutput.match(/https:\/\/[^\s]+\.vercel\.app/);
    const deploymentUrl = urlMatch ? urlMatch[0] : null;

    if (deploymentUrl) {
      console.log(`[deployment] Rollback deployed to: ${deploymentUrl}`);

      // Health check the rollback
      const healthCheck = await healthCheckDeployment(deploymentUrl);

      if (healthCheck.success) {
        console.log(`[deployment] Rollback successful and health check passed`);

        // Log the rollback deployment
        const deploymentId = db.logDeployment({
          companyId,
          commitSha: lastGood.commit_sha,
          gitTag: `rollback-to-${lastGood.git_tag}`,
          deploymentUrl,
          status: 'success',
        });

        db.updateDeploymentStatus(deploymentId, 'success', true, null);

        return { success: true, deploymentUrl };
      } else {
        console.error(`[deployment] Rollback deployed but health check failed: ${healthCheck.error}`);
        return { success: false, error: `Health check failed: ${healthCheck.error}` };
      }
    } else {
      console.error("[deployment] Failed to extract deployment URL from Vercel output");
      return { success: false, error: "Could not extract deployment URL" };
    }
  } catch (err) {
    console.error(`[deployment] Rollback failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Deploy with automatic rollback on failure
 * @param {string} companyId - Company ID
 * @param {string} cwd - Working directory
 * @returns {Promise<{success: boolean, deploymentUrl?: string, deploymentId?: number, error?: string}>}
 */
export async function deployWithRollback(companyId, cwd) {
  console.log(`[deployment] Starting deployment with rollback protection for company ${companyId.slice(0, 8)}...`);

  let deploymentId = null;

  try {
    // Step 1: Tag the current commit
    const { commitSha, gitTag } = tagDeployment(companyId, cwd);

    // Step 2: Create deployment record
    deploymentId = db.logDeployment({
      companyId,
      commitSha,
      gitTag,
      deploymentUrl: null,
      status: 'deploying',
    });

    // Step 3: Deploy to Vercel
    console.log(`[deployment] Deploying to Vercel...`);
    const deployOutput = execSync("npx vercel --prod --yes", {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Extract deployment URL
    const urlMatch = deployOutput.match(/https:\/\/[^\s]+\.vercel\.app/);
    const deploymentUrl = urlMatch ? urlMatch[0] : null;

    if (!deploymentUrl) {
      throw new Error("Could not extract deployment URL from Vercel output");
    }

    console.log(`[deployment] Deployed to: ${deploymentUrl}`);

    // Update deployment record with URL
    db.getDb().prepare("UPDATE deployment_history SET deployment_url = ? WHERE id = ?").run(deploymentUrl, deploymentId);

    // Step 4: Health check
    const healthCheck = await healthCheckDeployment(deploymentUrl);

    if (healthCheck.success) {
      // Success!
      db.updateDeploymentStatus(deploymentId, 'success', true, null);
      console.log(`[deployment] Deployment successful!`);
      return { success: true, deploymentUrl, deploymentId };
    } else {
      // Health check failed — trigger rollback
      console.error(`[deployment] Health check failed: ${healthCheck.error}`);
      db.updateDeploymentStatus(deploymentId, 'failed', false, healthCheck.error);

      console.log(`[deployment] Triggering automatic rollback...`);
      const rollback = await rollbackDeployment(companyId, cwd, `Health check failed: ${healthCheck.error}`);

      if (rollback.success) {
        db.markDeploymentRolledBack(deploymentId, `Auto-rollback: ${healthCheck.error}`);
        return {
          success: false,
          error: `Deployment failed health check and was automatically rolled back to previous version. Rollback URL: ${rollback.deploymentUrl}`,
        };
      } else {
        return {
          success: false,
          error: `Deployment failed health check AND rollback failed: ${rollback.error}`,
        };
      }
    }
  } catch (err) {
    console.error(`[deployment] Deployment failed: ${err.message}`);

    if (deploymentId) {
      db.updateDeploymentStatus(deploymentId, 'failed', false, err.message);

      // Attempt rollback
      console.log(`[deployment] Triggering automatic rollback...`);
      const rollback = await rollbackDeployment(companyId, cwd, `Deployment error: ${err.message}`);

      if (rollback.success) {
        db.markDeploymentRolledBack(deploymentId, `Auto-rollback: ${err.message}`);
        return {
          success: false,
          error: `Deployment failed and was automatically rolled back. Error: ${err.message}. Rollback URL: ${rollback.deploymentUrl}`,
        };
      }
    }

    return { success: false, error: err.message };
  }
}
