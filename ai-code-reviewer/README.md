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

## ⚙️ Cấu Hình

Cập nhật API keys trong `src/config/env.ts`:

- GitHub token để truy cập PR
- Gemini API key để AI review

## 📁 Cấu Trúc

```
src/
├── chat-gemini.ts           # Chat tương tác với AI
├── preview-pull-request.ts  # Preview PR với AI review
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

Made with ❤️ using Gemini AI & GitHub API
