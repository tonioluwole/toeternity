# Eternity: Superhero Text RPG

Eternity is a dynamic, AI-driven text adventure RPG built with Python and Flask. You play as a burgeoning superhuman in a modern world, guided by an AI Game Master that dynamically resolves combat, tracks inventory, manages NPC relationships, and even shifts the game's visual atmosphere based on the narrative mood.

## 🌟 Core Features

*   **AI Game Master:** Powered by Google's Gemini API, the DM evaluates creative power use, rolls internal d20s for action resolution, and drives a cinematic narrative.
*   **Immersive Voice Narration:** Fully integrated with Google Cloud Text-to-Speech (Chirp3-HD) to voice the Game Master's narration.
*   **Dynamic UI Atmosphere:** The frontend actively listens to the AI's "mood" output and dynamically shifts the CSS theme (e.g., Pitch Black for darkness, Deep Purple for mystical, Blood Red for combat).
*   **Deep RPG Mechanics:** 
    *   **Four Base Classes:** Kinetic, Vanguard, Elementalist, and Warden.
    *   **Elemental Matrix:** Elementalists must balance their primary element, affinities, and struggles in combat.
    *   **Level 5 Ascension:** A branching progression system where heroes permanently unlock specialized, god-tier ability paths.
*   **State Tracking:** A built-in short-term memory buffer keeps the AI contextually aware, while local JSON saves track HP, inventory, and NPC dispositions.

## 🛠️ Tech Stack

*   **Backend:** Python, Flask, Pydantic
*   **Frontend:** Vanilla JavaScript, HTML5, CSS3
*   **AI & Audio APIs:** Google GenAI (`gemini-3.1-flash-lite`), Google Cloud Text-to-Speech

---

## 🚀 Local Development Setup

### 1. Prerequisites
*   Python 3.8+ installed on your machine.
*   A Google Gemini API Key.
*   A Google Cloud Service Account JSON file (with Text-to-Speech API enabled).

### 2. Environment Configuration
Create a `.env` file in the root directory to safely store your Google Cloud credentials path:
```env
GOOGLE_APPLICATION_CREDENTIALS="google-credentials.json"