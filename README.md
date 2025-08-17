# jsGit (Mini Git in Node.js)

A **basic version control system** inspired by Git, built entirely in Node.js.  
This is a learning project where I try to re-create the core ideas of Git from scratch — commits, objects, snapshots, and more.

---

## 🚀 Features (Current)
- 📂 Creates its own `.jsGit` folder (like `.git`)
- 📝 Tracks files and stores snapshots
- 🔑 Generates unique object IDs (SHA-like hashes)
- 🙈 Skips ignored files (basic `.jsGitIgnore`)
- 💾 Supports `commit` from the terminal

---

## 🔮 Upcoming Features
- 📜 `log` → view commit history  
- 🔄 `checkout` → switch between commits  
- 🌱 Branching (multiple lines of development)  
- 🧑‍💻 File diffs (to show changes between commits)  
- 🎯 Staging area (like Git index)  

---

## ⚡ Usage

1. Clone this repo  
   ```bash
   git clone https://github.com/your-username/jsGit.git
   cd jsGit
   node git.js init
   node git.js commit "message"
