# Status Drafter Tool 📝

A professional tool designed to help developers and teams draft, manage, and enhance their daily stand-up updates and weekly summaries.

## 🚀 Features

- **Dual Modes**: Switch seamlessly between **Daily Stand-up** and **Weekly Summary** formats.
- **Smart Editor**:
    - Structured fields for tasks, progress, blockers, and next steps.
    - **AI Enhancement**: integrated with OpenRouter (DeepSeek) to rewrite your rough notes into professional corporate-speak.
    - Real-time preview.
- **Dashboard**:
    - View history of all your drafts.
    - Filter by Project, Type (Daily/Weekly), Timeframe, or Search text.
    - Delete old drafts or load them back into the editor.
- **Project & Role Management**:
    - Create and manage multiple Projects.
    - Define specific Roles within each project.
- **Export Options**:
    - One-click **Copy to Clipboard**.
    - **Format for Slack** (adds code blocks for cleaner rendering).
    - Email integration (opens default mail client).

## 🛠️ Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+).
- **Backend**: Node.js, Express.js.
- **Database**: SQLite (Persistent local storage).
- **AI Integration**: OpenRouter API (Access to LLMs like DeepSeek).

## 📂 Module Explanation

### Core Files
- **`server.js`**: The main entry point. Sets up the Express server, handles API routes (`/api/drafts`, `/api/projects`, etc.), and manages the connection to the OpenRouter AI API.
- **`database.js`**: Handles SQLite database connection and initialization. Automatically creates `drafts.db` and the necessary tables (`drafts`, `projects`, `roles`) if they don't exist.
- **`script.js`**: The brains of the frontend. Manages the UI state, handles form inputs, communicates with the backend API, and renders the dashboard and settings.
- **`index.html`**: The main markup file containing the Editor, Dashboard, and Settings views.
- **`style.css`**: Contains all styling variables (CSS custom properties) and rules for the dark-themed UI.

### Data Models
- **Drafts**: Stores the content, type (daily/weekly), and associated project/role.
- **Projects**: Simple name-based organization for your tasks.
- **Roles**: Job titles associated with specific projects.

## ⚙️ Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- npm (Node Package Manager)

### Installation

1. **Clone the repository** (or download the files):
   ```bash
   git clone <repository-url>
   cd Status_Drafter
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file in the root directory to enable AI features.
   ```bash
   # .env
   OPENROUTER_API_KEY=your_api_key_here
   # Optional: defaults to 'tngtech/deepseek-r1t2-chimera:free'
   OPENROUTER_MODEL=your_preferred_model
   ```

### Running the Application

1. **Start the Server**:
   ```bash
   # Run in production mode
   npm start
   
   # OR run in development mode (auto-restart on changes)
   npm run dev
   ```

2. **Open the App**:
   Visit `http://localhost:3001` in your browser.

## 📝 Usage

1. **Editor**: Fill in your status details. Use the "AI Enhance" button to polish your text. Click "Save Draft" to store it in the database.
2. **Dashboard**: Go here to see past updates. You can filter by date or project to find specific entries.
3. **Settings**: Use this tab to add new Projects (e.g., "Website Redesign") and Roles (e.g., "Frontend Dev").

## 📄 License

This project is licensed under the ISC License.
