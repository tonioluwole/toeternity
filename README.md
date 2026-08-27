# Eternity

A dynamic, AI-driven text adventure RPG powered by the Google Gemini API. The application uses a Python/Flask backend acting as a virtual Game Master, managing character state, NPC dispositions, and dynamic narrative generation, all presented through a responsive web interface with real-time text-to-speech narration.

## Core Features
* **AI Game Master:** Powered by Google Gemini (`gemini-3.1-flash-lite`), utilizing strict Pydantic JSON schemas to enforce consistent game state, inventory management, and HP tracking.
* **Class & Elemental System:** Four distinct classes (Kinetic, Vanguard, Elementalist, Warden) with branching Ascension paths and an integrated elemental combat matrix.
* **Dynamic Stage Lighting:** The UI responds to the narrative's mood (e.g., *mystical*, *combat*, *icy*) by manipulating CSS radial gradients to mimic physical stage washes.
* **Real-Time Narration:** Asynchronous text-to-speech audio buffering using the Google Cloud TTS API.
* **Server-Side State Offloading:** Secure `Flask-Session` memory handling prevents payload bloat and prevents client-side manipulation of the character sheet.
* **Strict NPC Routing:** Pre-defined logical flowcharts ensure major characters behave consistently without AI hallucination.

## Architecture Notes
* **Garbage Collection:** The backend automatically truncates short-term chat history to the last 6 actions while summarizing older plot points into a rolling `campaign_summary` to optimize API token limits.
* **Filesystem Exclusions:** The `flask_session/` and `__pycache__/` directories are intentionally excluded from version control to protect runtime data.

## Developer Setup (For Self-Hosting)
*Note: Players do not need to install anything to play the game; it is accessible via any modern web browser. The instructions below are strictly for developers who wish to clone, modify, or host their own instance of the game.*

**1. Clone the repository and install dependencies:**
`bash
git clone https://github.com/yourusername/eternity.git
cd eternity
pip install -r requirements.txt
`

**2. Configure Environment Variables:**
Create a `.env` file in the root directory and add the following keys:
`env
SECRET_KEY=your_secure_flask_session_key
GEMINI_API_KEY=your_google_gemini_api_key
GOOGLE_CREDENTIALS_JSON={"type": "service_account", "project_id": "..."}
`

**3. Run the Development Server:**
`bash
python app.py
`
Access the game locally at `http://localhost:5000`.

**Production Deployment (Waitress & Nginx):**
For production environments, bypass the built-in Flask server. Use a WSGI server like Waitress bound to your desired port, and route external traffic to it via an Nginx reverse proxy. Ensure **NAT Loopback** is enabled on your router if accessing the external domain from within your local network.

`bash
pip install waitress
waitress-serve --port=8080 app:app
`