# 🛡️ Upwork Copilot

[![Python](https://img.shields.io/badge/Python-3.9%2B-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=flat&logo=google-chrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![AI Powered](https://img.shields.io/badge/AI-GLM--4%2FOpenAI-purple?style=flat&logo=openai)](https://bigmodel.cn/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Don't waste Connects on bad clients.**  
> Upwork Copilot is an open-source tool designed to help freelancers instantly detect "Red Flag" clients, reveal hidden financial stats, and draft winning proposals using AI.

![Demo Screenshot](./assets/demo.png)
*(Note: Please ensure you have a screenshot named 'demo.png' inside the 'assets' folder)*

---

## ✨ Features

### 🚩 1. Intelligent Risk Audit
Automatically scans the job post and client history for potential scams.
- **Red Flags**: Detects keywords like "Telegram", "WhatsApp", "Payment outside Upwork".
- **Client History**: Analyzes past reviews for signs of "scope creep" or "unresponsive behavior".

### 💰 2. Financial X-Ray
Upwork's UI can be cluttered. This tool uses Regex to extracting key financial data instantly:
- **Total Spent**: See how much the client has invested.
- **Avg Hourly Rate**: Check if the client pays a fair wage.

### ✍️ 3. AI Proposal Assistant
Struggling to write cover letters? The AI reads the specific Job Description (JD) and generates a **Strategic Hook**:
- **Context-Aware**: Mentions specific problems found in the JD.
- **Professional Tone**: Avoids generic "Hello sir" templates.

### 🔒 4. Smart Focus
Automatically detects the active **Side Panel (Slider)** on Upwork. It won't get confused by the background job list, ensuring accurate analysis for the specific job you are viewing.

---

