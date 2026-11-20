# Codex 自主開發：安裝與操作手冊

這是 **增量檔案包**，不是新的 Slidev 專案。請合併進既有 `galois-field/`，不要用檔案包覆蓋整個專案；既有 `package.json`、`README.md`、`slides.md` 和 Vue 檔案均由你原本的儲存庫保留。

## 0. 環境與安全前提

- Ubuntu / Linux，建議 Node.js 22+、pnpm、Git、已登入的最新版 Codex CLI；在隔離的 VM 或容器中執行無人值守流程。
- 專案必須位於 `feature/build-calculator` 分支。
- 程序以 `workspace-write` sandbox 與 `approval_policy=never` 啟動，沙盒內工具網路預設關閉；**不是全面的系統安全保證**。請勿將其他秘密、SSH 代理或私人資料夾暴露給 Codex 容器。
- 監督器以 `node scripts/supervise-codex.mjs` 直接執行，不經 TypeScript 編譯，因而不需 `tsx` 或額外監控依賴。
- 本包只建立自主開發所需的配置、測試協定、監控與規格；核心 `.ts` 實作交由 Codex 完成。**尚未執行真實 Codex 開發與有限體運算測試。**

## 1. 合併檔案

將壓縮檔解開到暫存目錄，先看差異，再合併非衝突檔案（請調整路徑）：

```bash
cd /path/to/galois-field
git switch feature/build-calculator
git status --short
mkdir -p /tmp/gf-codex-overlay
unzip /path/to/galois-field-codex-overlay.zip -d /tmp/gf-codex-overlay
rsync -avn --ignore-existing /tmp/gf-codex-overlay/ ./
# 確認預覽清單後，才移除 -n：
rsync -av --ignore-existing /tmp/gf-codex-overlay/ ./
```

`--ignore-existing` 是為了避免覆蓋已有的 `AGENTS.md`、`vitest.config.ts` 或其他檔案。若這些檔案原本已存在，請**人工比對合併**；不能直接跳過必要配置後假設系統完整。

`.gitignore.codex-additions` 是附加內容提案，不會自動覆蓋現有 `.gitignore`。確認其中規則未重複或影響既有流程後，將有效規則加入 `.gitignore`，特別是 `reports/tests/`。

## 2. 安裝測試依賴並建立起點 Commit

```bash
pnpm add -D vitest
pnpm exec vitest --version
node scripts/selftest-supervisor.mjs
```

注意：`--check` 會要求工作樹乾淨，所以首次安裝後，需要先提交新增的配置、依賴與 `.gitignore`：

```bash
git status --short
git add AGENTS.md agenda.md .codex docs scripts tests/helpers tests/fixtures vitest.config.ts CODEX_SETUP.md .gitignore.codex-additions .gitignore package.json pnpm-lock.yaml
git commit -m "chore(calculator): add supervised Codex development harness"
node scripts/supervise-codex.mjs --check
```

如果你的 `package.json` 已使用別的版本 Vitest 或自訂 vitest 設定，請先整合而不是盲目覆蓋。

## 3. 正式執行

```bash
node scripts/supervise-codex.mjs --run
# 或在支援 systemd --user 的 Ubuntu 環境，加上 cgroup 記憶體/CPU/程序數限制：
bash scripts/run-limited.sh --run
```

- supervisor 每階段呼叫 `codex exec --json --sandbox workspace-write --ask-for-approval never -`。
- Codex 主 Agent 可根據 `.codex/agents/*.toml` 派遣 **最多三個同時執行的 Subagent**。
- 預設單次 Codex/測試任務 15 分鐘、輸出閒置 8 分鐘、整體 3 小時、每階段最多 2 次自動修復。`run-limited.sh` 使用 systemd 使用者 scope 加上 MemoryMax=4G、CPUQuota=200%、TasksMax=256；如果 systemd 無法建立 scope，腳本不會降級為無限制執行。scope **不保證登出後仍會運作**。
- 若需要調整執行時間，執行前設定 `GF_TASK_TIMEOUT_MS`、`GF_IDLE_TIMEOUT_MS`、`GF_TOTAL_TIMEOUT_MS`、`GF_MAX_REPAIRS`。不要在正在執行的過程中修改監控程式。
- 環境檢查會拒絕在錯誤分支、髒工作樹、沒有 vitest、沒有 codex 或沒有 pnpm 的情況下啟動。
- 結束會產生 `reports/tests/<run-id>/` 的彙整報告；原始日誌放在預設的同層目錄 `../galois-field-codex-runlogs/<run-id>/`，不應加入 Git。

## 4. 退出狀態碼

| Code | 狀態 | 說明 |
|---:|---|---|
| 0 | COMPLETED | 所有必要測試和（若存在）建置成功，已完成本機 checkpoint commits |
| 2 | BLOCKED | 規格、權限或環境需人工決策 |
| 3 | FAILED | 測試或工具故障、修復上限已達 |
| 4 | ABORTED | 逾時、閒置、異常修改、訊號等安全中止 |
| 5 | SUPERVISOR_ERROR | 監督程式自身例外 |

失敗時保留 Git diff、可讀取的未追蹤原始檔快照、錯誤紀錄與失敗報告。**不會自動 reset 或清理未提交修改**。人工檢查後，若要重新 `--run`，應先處理工作區，使其回復乾淨狀態。不要為了乾淨而使用 `git reset --hard`。

## 5. 安全邊界與限制

- `AGENTS.md` 是行為規約，不是 OS 層的強制存取控制。檔案異動監測是**事後或準即時偵測**，不是強制禁止所有寫入；強隔離請使用 VM/container 與只讀掛載。
- supervisor 不會升權、push、deploy、安裝依賴或修改原本的 Slidev 內容。既有 `components/GFCalculator.vue` 等介面元件由後續開發階段處理。
- 若程序崩潰、磁碟滿或斷電，部分最後訊息可能無法寫入；使用獨立磁碟與日誌收集器可降低風險。
- `.codex/config.toml` 僅對受信任的 Codex 專案生效。若你看到自訂 Agent 未載入，先確認 CLI 版本與儲存庫信任狀態。
- 自動確認沒有秘密外洩是不可能的；請避免將認證資訊放進可讀的工作容器。記錄器採有限的權杖遮罩並限制檔案存取權限，但不能保證過濾所有敏感資訊。

## 6. 立即自我檢查

```bash
node --check scripts/supervise-codex.mjs
node --check scripts/export-test-report.mjs
node scripts/selftest-supervisor.mjs
```

`selftest-supervisor.mjs` 用 **假 Codex / 假 pnpm** 測試正常完成、異常退出、逾時、非法改檔、凍結規格遭修改、缺少測試紀錄、錯誤 Git 分支與髒工作樹。不會呼叫真 Codex，也**不代表 GF 計算機的數學正確性已驗證**。
