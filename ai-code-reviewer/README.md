# 🤖 AI Code Review Tool

Công cụ review code thông minh sử dụng **Gemini AI** và **GitHub API**.

## ✨ Tính Năng Chính

### 1. 💬 Chat với Gemini AI

- Chat tương tác liên tục với AI
- Tự động phát hiện và review code khi paste
- Hỗ trợ nhiều ngôn ngữ lập trình

### 2. 🔍 Preview Pull Request

- Xem chi tiết code changes trong PR
- Hiển thị màu sắc đẹp mắt (+ xanh, - đỏ)
- AI review từng file với Gemini
- Thống kê chi tiết và summary

### 3. 🚀 Auto Review & Merge PR (NEW!)

- **Tự động kiểm tra conflicts** và thông báo
- **Phát hiện lỗi CI/CD** và yêu cầu sửa
- **AI review code** tìm vấn đề bảo mật/critical
- **Tự động approve** khi không có lỗi
- **Tự động merge** PR khi an toàn
- **Thông báo chi tiết** về trạng thái PR

## 🚀 Cách Sử Dụng

### Cài đặt

```bash
npm install
```

### Chat với AI

```bash
npm run chat
```

- Gõ bất cứ gì để chat
- Paste code để AI review
- Gõ "exit" để thoát

### Preview Pull Request

```bash
npm run preview
```

- Nhập owner (vd: microsoft)
- Nhập repo (vd: vscode)
- Nhập PR number (vd: 12345)
- Chọn file nào muốn AI review

### Auto Review & Merge PR

```bash
npm run auto-review
```

- Nhập owner/repo/PR number
- Chọn auto-approve (y/n)
- Chọn auto-merge (y/n)
- Tool sẽ tự động:
  - ✅ Check conflicts
  - ✅ Check CI/CD status
  - ✅ AI review code
  - ✅ Approve nếu OK
  - ✅ Merge nếu được phép

## 🎯 Logic Tự Động

### ❌ **BLOCK** (Không approve):

- Có merge conflicts
- CI/CD checks failed
- AI phát hiện lỗi critical/security
- Có change requests

### ⏳ **WAIT** (Chờ):

- CI/CD đang chạy
- Chờ human review

### ✅ **APPROVE/MERGE** (Thành công):

- Không có conflicts
- Tất cả checks passed
- Không có critical issues
- Đã có approval (nếu cần)

## ⚙️ Cấu Hình

Cập nhật API keys trong `src/config/env.ts`:

- GitHub token để truy cập PR
- Gemini API key để AI review

## 📁 Cấu Trúc

```
src/
├── chat-gemini.ts           # Chat tương tác với AI
├── preview-pull-request.ts  # Preview PR với AI review
├── auto-review-pr.ts        # Auto review & merge PR
├── services/
│   ├── github-service.ts    # GitHub API integration
│   └── openai.service.ts    # Gemini AI service
└── config/
    └── env.ts              # API configuration
```

## 🎯 Ví Dụ Sử Dụng

**Chat với AI:**

```
👤 Bạn: function add(a, b) { return a + b; }
🔍 AI Code Review: [Gemini phân tích code...]
```

**Preview Pull Request:**

```
👤 Owner: microsoft
📁 Repo: vscode
🔢 PR: 12345

🔍 AI sẽ hiển thị:
- Thông tin PR (tiêu đề, tác giả, stats)
- Files thay đổi với syntax highlighting
- Tùy chọn AI review từng file
```

**Auto Review & Merge PR:**

```
🤖 AUTO REVIEW PULL REQUEST #123
Repository: microsoft/vscode
Settings: Auto-approve=true, Auto-merge=true

📊 Checking PR status...
   State: open
   Mergeable: true
   Has Conflicts: ✅ NO

🧪 CI/CD Checks:
   ✅ Build: success
   ✅ Tests: success
   ✅ Lint: success

👥 Review Status:
   Approvals: ✅ 2
   Change Requests: ✅ 0

🤖 Running AI Code Review...
   Reviewing src/main.ts...
   ✅ No critical issues found

🎯 Decision: AUTO-MERGE
✅ All checks passed
✅ No conflicts detected
✅ No critical issues found

🎉 PR successfully merged!
```

Made with ❤️ using Gemini AI & GitHub API
