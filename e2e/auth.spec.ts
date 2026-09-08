import { test, expect } from "@playwright/test";

test.describe("authentication screen", () => {
  test("renders the login form", async ({ page }) => {
    await page.goto("/");
    const loginForm = page.locator("form");

    await expect(page.getByPlaceholder("Email")).toBeVisible();
    await expect(page.getByPlaceholder("Kata sandi")).toBeVisible();
    await expect(loginForm.getByRole("button", { name: "Masuk", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Masuk dengan Google" })).toBeVisible();
  });

  test("validates empty submission", async ({ page }) => {
    await page.goto("/");
    const loginForm = page.locator("form");

    await loginForm.getByRole("button", { name: "Masuk", exact: true }).click();

    await expect(page.getByText("Isi email dan kata sandi terlebih dahulu.")).toBeVisible();
  });

  test("toggles password visibility", async ({ page }) => {
    await page.goto("/");

    const passwordInput = page.getByPlaceholder("Kata sandi");
    const toggle = page.getByRole("button", { name: "Tampilkan kata sandi" });

    await expect(passwordInput).toHaveAttribute("type", "password");
    await toggle.click();
    await expect(passwordInput).toHaveAttribute("type", "text");
    await expect(page.getByRole("button", { name: "Sembunyikan kata sandi" })).toBeVisible();
  });

  test("switches between sign-in and sign-up", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Daftar", exact: true }).click();

    await expect(page.getByRole("button", { name: "Buat akun" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Daftar dengan Google" })).toBeVisible();
  });
});
