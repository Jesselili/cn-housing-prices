# 版本管理

本项目使用 Git 管理源代码，并同步到私有 GitHub 仓库。

## 分支约定

- `main`：可运行、可交付的稳定版本，只合并已经验证的改动。
- `feature/<名称>`：新功能或较大改动，完成测试后合并到 `main`。
- `fix/<名称>`：问题修复，完成测试后合并到 `main`。

## 提交约定

提交信息使用清晰的动词开头，例如：

- `feat: add date range filter`
- `fix: normalize selected period correctly`
- `docs: update versioning guide`
- `chore: update dependencies`

一次提交尽量只表达一个完整变化。提交前运行：

```bash
npm test
npm run build
```

## 每次编码操作的标准流程

每次开始编码前先从最新 `main` 创建工作分支：

```bash
git switch main
git pull --ff-only origin main
git switch -c feature/<名称>
```

完成一个完整的小变化后立即提交，不要把多个无关功能长期堆在工作区：

```bash
npm test
npm run build
git status --short
git add <相关文件>
git commit -m "feat: describe the change"
git push -u origin feature/<名称>
```

确认验证通过后再合并到 `main`。如果直接在 `main` 上完成了小型修复，也必须在本地验证后提交并推送，不能依赖未提交工作区作为版本记录。

每个提交都是可定位的恢复点；标签只用于重要的可交付版本，不要求每个小提交都创建标签。

## 版本标签

重要的可交付版本在 `main` 上创建标签，采用语义化版本格式：

- `v0.1.0`：第一版可用功能
- `v0.1.1`：向后兼容的问题修复
- `v0.2.0`：向后兼容的新功能
- `v1.0.0`：稳定正式版本

创建并推送标签：

```bash
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

## 回滚方式

查看历史和标签：

```bash
git log --oneline --decorate --graph --all
git tag --list --sort=-version:refname
```

本地临时回到某个版本查看：

```bash
git switch --detach v0.1.0
```

让当前分支恢复到某个已知提交，并保留恢复动作本身：

```bash
git switch main
git pull --ff-only origin main
git revert <commit>
git push origin main
```

如果需要把工作区精确恢复到某个标签，应先确认没有未提交改动，再执行：

```bash
git switch main
git reset --hard v0.1.0
git push --force-with-lease origin main
```

最后一种方式会改写远程分支历史，仅在明确需要时使用；日常撤销优先使用 `git revert`。
