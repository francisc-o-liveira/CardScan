import fs from "node:fs";
import path from "node:path";
import { expect, test as setup } from "@playwright/test";
import { E2E_USER_FILE, newE2eUser } from "./helpers";

setup("register a fresh user through the UI and save its credentials", async ({ page }) => {
  const user = newE2eUser();

  await page.goto("/register");
  await page.getByLabel("Username").fill(user.username);
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(`, ${user.username}`)).toBeVisible();

  fs.mkdirSync(path.dirname(E2E_USER_FILE), { recursive: true });
  fs.writeFileSync(E2E_USER_FILE, JSON.stringify(user));
});
