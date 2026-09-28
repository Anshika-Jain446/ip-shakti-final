# 🌿 IP-SAKTI MVP — Modern Frontend UI

An evidence-first, high-performance React + Vite web application for preliminary IP, Traditional Knowledge (TK), and Access & Benefit Sharing (ABS) assessment.

---

## ✨ Features & Design Highlights

- 🎨 **Modern Aesthetics**: Built with glassmorphic cards, natural dark-forest color palettes, and fluid typography.
- ⚡ **Auto-Hiding Sticky Header**: Smooth scroll-triggered navbar that auto-hides on scroll down and reappears on scroll up.
- 🧴 **Dynamic Product Intake**: Interactive intake form for product classification, ingredients, intended purpose, and jurisdiction.
- 📊 **Dynamic Domain Routing**: Real-time progress bars for Traditional Knowledge (TK), Access & Benefit Sharing (ABS), and Intellectual Property (IP).
- 🎥 **Media & Assets**: Custom video backgrounds and Lovable design components.

---

## 🛠️ Tech Stack

- **Framework**: React 18 + Vite
- **Routing**: React Router DOM (v7)
- **Icons**: Lucide React
- **Styling**: Vanilla CSS (CSS Design System with CSS Variables)

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Repository Structure

```text
frontend/
├── landing-page/      # Video & media background assets
├── lovavbele/         # Lovable UI components & design system assets
├── src/
│   ├── components/    # Navbar, HeroBackground, and modular components
│   ├── pages/         # Login, SignUp, and app pages
│   ├── App.jsx        # Main application router & dynamic analysis engine
│   ├── LandingPage.jsx# Landing page sections & features
│   ├── index.css      # Design tokens, variables & typography
│   └── main.jsx       # App entrypoint
├── index.html         # HTML5 template
├── vite.config.js     # Vite configuration
└── package.json       # Dependencies & scripts
```
