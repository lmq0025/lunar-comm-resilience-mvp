import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(e2eDir, "..", "..");
const scenarioPath = path.join(repoRoot, "configs", "default_scenario.yaml");
const evidenceDir = path.join(repoRoot, "outputs", "round7_evidence");

test.describe.serial("Round 7 production UI", () => {
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
    await expect(page.getByText("节点 12", { exact: true })).toBeVisible();
    await expect(page.getByText("链路 20", { exact: true })).toBeVisible();
    await expect(page.getByText("业务 4", { exact: true })).toBeVisible();
    await expect(page.getByText("故障 4", { exact: true })).toBeVisible();
    await expect(page.getByText("自愈策略 5", { exact: true })).toBeVisible();
    await expect(page.getByText("技术指标 14", { exact: true })).toBeVisible();
    await expect(page.getByText("界面发生错误")).toHaveCount(0);
    await page.screenshot({ path: path.join(evidenceDir, "01_中文项目管理.png"), fullPage: true });

    await page.getByRole("button", { name: "保存项目" }).first().click();
    await expect(page.getByText("已保存到数据库", { exact: true }).first()).toBeVisible();
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText("已保存到数据库", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("节点 12", { exact: true })).toBeVisible();
  });

  test("八个功能页面真实导航", async () => {
    const pages = ["项目管理", "拓扑编辑", "业务配置", "故障计划", "自愈策略", "仿真运行", "结果分析", "运行历史"];
    for (const title of pages) {
      await page.getByRole("menuitem", { name: new RegExp(title) }).click();
      await expect(page.locator(".ant-menu-item-selected")).toContainText(title);
      await expect(page.getByRole("heading", { name: new RegExp(title) }).first()).toBeVisible();
      await expect(page.getByText("界面发生错误")).toHaveCount(0);
      if (title === "拓扑编辑") {
        await expect(page.getByText("月球轨道与空间通信层")).toBeVisible();
        await page.screenshot({ path: path.join(evidenceDir, "02_分层拓扑编辑器.png"), fullPage: true });
      }
      if (title === "业务配置") {
        await expect(page.getByText("业务列表")).toBeVisible();
      }
      if (title === "故障计划") {
        await expect(page.getByText("此处仅预览计划目标，故障尚未注入。")).toBeVisible();
        await page.screenshot({ path: path.join(evidenceDir, "04_故障计划高亮目标.png"), fullPage: true });
      }
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
      if (index === 1) {
        await page.getByRole("menuitem", { name: /业务配置/ }).click();
        await expect(page.locator(".unified-edge.is-route").first()).toBeVisible();
        await page.screenshot({ path: path.join(evidenceDir, "03_中文业务路径.png"), fullPage: true });
        await page.getByRole("menuitem", { name: /仿真运行/ }).click();
      }
      if (index === 2) {
        await expect(page.getByText("正常拓扑快照")).toBeVisible();
        await page.screenshot({ path: path.join(evidenceDir, "05_正常拓扑.png"), fullPage: true });
      }
      if (index === 3) {
        await expect(page.getByText("故障后、自愈前拓扑快照")).toBeVisible();
        await page.screenshot({ path: path.join(evidenceDir, "06_故障后拓扑.png"), fullPage: true });
      }
      if (index === 5) {
        await expect(page.getByText("第 6 步无效路径 4", { exact: true })).toBeVisible();
        await page.screenshot({ path: path.join(evidenceDir, "07_第6步非路由自愈.png"), fullPage: true });
      }
      if (index === 6) {
        await expect(page.getByText("第 7 步备用有效路径 4", { exact: true })).toBeVisible();
        await page.screenshot({ path: path.join(evidenceDir, "08_第7步备用路径.png"), fullPage: true });
      }
      if (index === 7) {
        await page.getByRole("tab", { name: "自愈后" }).click();
        await expect(page.getByText("自愈后拓扑", { exact: true })).toBeVisible();
        await page.screenshot({ path: path.join(evidenceDir, "09_自愈后拓扑.png"), fullPage: true });
      }
    }

    await expect(page.getByText("适用 14", { exact: true })).toBeVisible();
    await expect(page.getByText("通过 14", { exact: true })).toBeVisible();
    await expect(page.getByText("未通过 0", { exact: true })).toBeVisible();
    await expect(page.getByText("成果文件 16 个", { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "13_十四项指标结果.png"), fullPage: true });
    await expect(page.getByRole("button", { name: "下载全部 ZIP" })).toBeEnabled();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "下载全部 ZIP" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("lunar_comm_results.zip");
    expect(await download.failure()).toBeNull();
    await page.screenshot({ path: path.join(evidenceDir, "14_成果文件列表.png"), fullPage: true });

    await page.getByRole("tab", { name: "结果分析" }).click();
    await expect(page.getByText("三阶段韧性恢复对比")).toBeVisible();
    await page.getByTestId("three-stage-recovery-panel").screenshot({ path: path.join(evidenceDir, "10_三阶段恢复图.png") });
    await expect(page.getByText("五级自愈策略消融（历史验证实验）")).toBeVisible();
    await page.getByTestId("healing-ablation-panel").screenshot({ path: path.join(evidenceDir, "11_五级消融图.png") });
    await expect(page.getByText("故障传播因果链")).toBeVisible();
    await page.getByTestId("propagation-cause-chain").screenshot({ path: path.join(evidenceDir, "12_故障传播因果链.png") });
  });

  test("刷新后恢复完整结果和成果清单", async () => {
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("menuitem", { name: /结果分析/ }).click();
    await expect(page.getByText("适用 14", { exact: true })).toBeVisible();
    await expect(page.getByText("通过 14", { exact: true })).toBeVisible();
    await expect(page.getByText("成果文件 16 个", { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "15_刷新恢复.png"), fullPage: true });

    await page.getByRole("menuitem", { name: /运行历史/ }).click();
    await expect(page.getByText("9/9", { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "16_运行历史.png"), fullPage: true });
    expect(browserErrors.filter((error) => /Maximum update depth|Interface error|界面发生错误/.test(error))).toEqual([]);
  });
});

test.describe("Round 7 restart persistence", () => {
  test("应用重启后可从运行历史恢复上一轮结果", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByText("后端已连接", { exact: true }).first()).toBeVisible();
    await page.getByRole("menuitem", { name: /运行历史/ }).click();
    await expect(page.getByText("9/9", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "恢复运行" }).first().click();
    await expect(page.getByText("运行状态和各步骤结果已恢复", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "结果分析" }).click();
    await expect(page.getByText("三阶段韧性恢复对比", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "指标验证与报告" }).click();
    await expect(page.getByText("适用 14", { exact: true })).toBeVisible();
    await expect(page.getByText("通过 14", { exact: true })).toBeVisible();
    await expect(page.getByText("成果文件 16 个", { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "17_重启后运行恢复.png"), fullPage: true });
  });
});
