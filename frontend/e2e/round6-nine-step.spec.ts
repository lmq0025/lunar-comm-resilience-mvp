import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(e2eDir, "..", "..");
const scenarioPath = path.join(repoRoot, "configs", "default_scenario.yaml");
const evidenceDir = path.join(repoRoot, "outputs", "round6_1_evidence");

test.describe.serial("Round 6.1 production UI", () => {
  let context: BrowserContext;
  let page: Page;
  const browserErrors: string[] = [];

  test.beforeAll(async ({ browser }) => {
    fs.mkdirSync(evidenceDir, { recursive: true });
    context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true });
    page = await context.newPage();
    page.on("pageerror", (error) => browserErrors.push(error.stack ?? error.message));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("启动和连接", async () => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByText("后端已连接", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Disconnected|Backend Disconnected/)).toHaveCount(0);
    await expect(page.getByText(/Interface error|界面发生错误/)).toHaveCount(0);
    await page.screenshot({ path: path.join(evidenceDir, "connection_connected.png"), fullPage: true });
  });

  test("导入默认场景并保存到 SQLite", async () => {
    await page.getByRole("menuitem", { name: /项目管理/ }).click();
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /导入项目\/场景/ }).click();
    const chooser = await chooserPromise;
    await chooser.setFiles(scenarioPath);

    await expect(page.getByText("未保存", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Nodes 12", { exact: true })).toBeVisible();
    await expect(page.getByText("Links 20", { exact: true })).toBeVisible();
    await expect(page.getByText("Services 4", { exact: true })).toBeVisible();
    await expect(page.getByText("Faults 4", { exact: true })).toBeVisible();
    await expect(page.getByText("Healing 5", { exact: true })).toBeVisible();
    await expect(page.getByText("Indicators 14", { exact: true })).toBeVisible();
    await expect(page.getByText("界面发生错误")).toHaveCount(0);
    await page.screenshot({ path: path.join(evidenceDir, "topology_12_nodes_20_links.png"), fullPage: true });

    await page.getByRole("button", { name: "保存项目" }).first().click();
    await expect(page.getByText("已保存到数据库", { exact: true }).first()).toBeVisible();
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText("已保存到数据库", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Nodes 12", { exact: true })).toBeVisible();
  });

  test("八个功能页面真实导航", async () => {
    const pages = ["项目管理", "拓扑编辑", "业务配置", "故障计划", "自愈策略", "仿真运行", "结果分析", "运行历史"];
    for (const title of pages) {
      await page.getByRole("menuitem", { name: new RegExp(title) }).click();
      await expect(page.locator(".ant-menu-item-selected")).toContainText(title);
      await expect(page.getByRole("heading", { name: new RegExp(title) }).first()).toBeVisible();
      await expect(page.getByText("界面发生错误")).toHaveCount(0);
    }
  });

  test("通过九个按钮完成默认场景", async () => {
    await page.getByRole("menuitem", { name: /仿真运行/ }).click();
    const labels = [
      /构建拓扑/,
      /计算路径/,
      /运行正常状态/,
      /注入故障/,
      /分析故障影响/,
      /执行自愈/,
      /重新计算路径/,
      /运行自愈后状态/,
      /验证技术指标/
    ];

    for (let index = 0; index < labels.length; index += 1) {
      const button = page.getByRole("button", { name: labels[index] }).first();
      await expect(button).toBeEnabled();
      await button.click();
      if (index < labels.length - 1) await expect(page.getByRole("button", { name: labels[index + 1] }).first()).toBeEnabled();
      if (index === 5) {
        await expect(page.getByText("第 6 步无效路径 4", { exact: true })).toBeVisible();
        await page.screenshot({ path: path.join(evidenceDir, "step6_no_reroute.png"), fullPage: true });
      }
      if (index === 6) {
        await expect(page.getByText("第 7 步备用有效路径 4", { exact: true })).toBeVisible();
        await page.screenshot({ path: path.join(evidenceDir, "step7_backup_routes.png"), fullPage: true });
      }
    }

    await expect(page.getByText("适用 14", { exact: true })).toBeVisible();
    await expect(page.getByText("通过 14", { exact: true })).toBeVisible();
    await expect(page.getByText("未通过 0", { exact: true })).toBeVisible();
    await expect(page.getByText("成果文件 16 个", { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "step9_14_of_14.png"), fullPage: true });
  });

  test("刷新后恢复完整结果和成果清单", async () => {
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("menuitem", { name: /结果分析/ }).click();
    await expect(page.getByText("适用 14", { exact: true })).toBeVisible();
    await expect(page.getByText("通过 14", { exact: true })).toBeVisible();
    await expect(page.getByText("成果文件 16 个", { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "refresh_recovery.png"), fullPage: true });

    await page.getByRole("menuitem", { name: /运行历史/ }).click();
    await expect(page.getByText("9/9", { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "run_history.png"), fullPage: true });
    expect(browserErrors.filter((error) => /Maximum update depth|Interface error|界面发生错误/.test(error))).toEqual([]);
  });
});
