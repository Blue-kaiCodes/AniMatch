# AniMatch 🎌

AniMatch is a highly polished, interactive, consumer-ready anime recommendation and matchmaking platform. It utilizes content-based natural language processing (NLP) algorithms—specifically **TF-IDF (Term Frequency-Inverse Document Frequency)** and **Cosine Similarity**—to calculate high-fidelity matching profiles between users' favorite shows and the rest of the catalog. The intelligence is supported behind-the-scenes by server-side query assistance to deliver deep matchmaking insights and companion chats in a seamless Vercel/Linear-inspired interface.

---

## 🚀 Key Features

* **Advanced Matching & TF-IDF Vector Math**: Seamlessly computes similarity rankings across genres, synopses, and studios, recommending titles with precise, graded match percentages.
* **Premium Local Identity & Session Sync**: A comprehensive onboarding flow with email registration, customizable anime avatars, and genre bias calibrators that dynamically skew recommendation vectors.
* **Dynamic Companion Guide**: An interactive, smart conversation assistant designed to understand natural language intent, find obscure gems, and extract matching series with in-chat card saving.
* **Matchmaker Insights Engine**: 
  * 🧭 **Vibe Check**: Demystifies core aesthetic, pacing, and mood characteristics.
  * 🗺️ **Watch Order**: Recommends chronologically cohesive viewing paths across franchises.
  * 🛡️ **Suitability Check**: Honest, direct rating reviews and trigger indicators.
  * 💡 **Fun Facts**: Fascinating development details and obscure trivia.
* **Interactive Kanban Watch Board**: A fluid, responsive drag-and-drop workspace divided into *Want to Watch*, *Watching*, and *Completed* lanes.
* **Sleek Vercel & Linear-Inspired Theme**: Styled in slate dark tones, custom high-contrast geometric logos, sharp typography (Space Grotesk & Inter), elegant hover transitions, and mobile responsive menus.

---

## 🛠️ Tech Stack

### Frontend
* **Core**: React 19 (TypeScript)
* **Build Tool**: Vite 6
* **Styling**: Tailwind CSS 4
* **Animations**: Motion (formerly Framer Motion)
* **Icons**: Lucide React

### Backend
* **Runtime**: Node.js
* **Framework**: Express (TypeScript server using CJS compilation for production bundle stability)
* **Compiler**: esbuild & tsx
* **External APIs**: AniList GraphQL API, Jikan REST API (MyAnimeList proxy)

---

## 📁 Project Structure

```text
├── .env.example            # Environment variables template
├── .gitignore              # Production ignore boundaries
├── index.html              # Frontend entry HTML mount
├── metadata.json           # Platform deployment config
├── package.json            # Node dependencies & production run scripts
├── server.ts               # Custom hybrid Express backend and Vite middleware
├── tsconfig.json           # Global TypeScript type checking rules
├── vite.config.ts          # Vite asset pipeline configuration
├── scripts/
│   └── fetch_anime.js      # Jikan API dataset populate script
└── src/
    ├── App.tsx             # Main React entry point
    ├── index.css           # Global CSS and Tailwind 4 theme definitions
    ├── main.tsx            # Main DOM rendering hook
    ├── types.ts            # Shareable TypeScript domain definitions
    ├── components/
    │   ├── AnimeCard.tsx             # Grid item displaying title, score & genres
    │   ├── AnimeDetailModal.tsx      # Slide-over dynamic modal with full details and insights
    │   ├── AuthModal.tsx             # Premium custom auth forms and avatar selection
    │   ├── BrowseSection.tsx         # Advanced catalog exploration & filtering
    │   ├── ChatAssistantSection.tsx  # Dynamic interactive companion guide chat room
    │   ├── RecommendationSection.tsx # TF-IDF engine query, autocomplete & connection analysis
    │   ├── UserProfileSection.tsx    # Dashboard stats, edit preferences & recent views
    │   └── WatchBoardSection.tsx     # Draggable watch lists and progress boards
    ├── data/
    │   └── anime_data.json # Dynamic database pool containing popular titles
    └── utils/
        ├── liveAnimeProvider.ts      # GraphQL and REST connectors for AniList/Jikan
        └── recommender.ts            # Mathematical TF-IDF and Cosine Similarity model
```


---

## 🔌 Environment Variables

Create a `.env` file in the root directory and supply the following variables:

```env
# Google Gemini API key used for the Otaku Chat Companion & AI Insights.
# Get a key from: https://aistudio.google.com/
GEMINI_API_KEY="your-gemini-api-key"

# App public URL (for self-referential or OAuth endpoints if expanded)
APP_URL="http://localhost:3000"
```

---

## 💻 Installation & Development

Follow these steps to run AniMatch locally:

### 1. Clone & Set Up Directory
```bash
git clone https://github.com/your-username/animatch.git
cd animatch
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Populating the Catalog (Optional)
The project ships with a pre-built popular anime catalog under `src/data/anime_data.json`. If you wish to pull fresh metadata from MyAnimeList/Jikan:
```bash
node scripts/fetch_anime.js
```

### 4. Running Development Mode
Start the full-stack server (Vite-HMR + Express):
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

---

## 🏗️ Production Build & Run

To prepare and serve AniMatch in a production-ready environment:

### 1. Compile Assets & Bundle Backend
```bash
npm run build
```
This performs a production build of the static React SPA into `dist/` and compiles/bundles the server file into `dist/server.cjs` with `esbuild`.

### 2. Start Production Server
```bash
npm run start
```
The application will listen on port `3000`.

---

## 🤝 Contribution Guidelines
Contributions, issues, and feature requests are welcome! Feel free to open a pull request or submit an issue to improve the recommendation mathematics or add new AI prompts.

---

## 📄 License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details. (Or refer to standard open-source guidelines).
