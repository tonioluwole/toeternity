# Eternity - Text-Based RPG (Alpha)

**Eternity** is an interactive, modern superhero-style text-based RPG powered by an AI Game Master. Players create unique heroes with distinct classes, elements, and power sets, navigating a dynamically generated story where decisions and dice rolls directly shape the world, inventory, and NPC relationships.

---

## 🌟 Features & Systems

### 🦸 Hero Profile & Mechanics
* **Dynamic Stats:** Real-time tracking of Hero Name, Level, Health Points (HP), Abilities, and Specializations.
* **Elemental Matrix:** Exclusive system for Elementalists tracking **Primary**, **Affinity**, and **Struggle** elements to influence combat and narrative outcomes.
* **Level Progression:** Dynamic leveling system managed by the Game Master; reaching Level 5 unlocks specialized power paths.

### 🎒 Inventory & Items
* Interactive inventory panel updating on the fly when items are found, looted, or used in narrative turns.

### 👥 NPC Memory System
* Persistent NPC tracking ledger that logs character interactions, relationships, dispositions, and key story events across gameplay sessions.

### 💾 Session & World Management
* **Save / Load Game:** Save full character progress and story history to return later.
* **New Game Reset:** Complete world reset option that clears previous NPC memory ledgers and builds a fresh universe.
* **Main Menu Toggle:** Seamlessly return to the main splash screen at any point.
* **Class Guide:** Built-in sidebar reference manual describing all playstyles.

---

## ⚡ Hero Classes

* **Kinetic:** A psychic hero who uses the power of their mind to throw objects, build forcefields, and control enemies.
* **Vanguard:** A superhuman brawler who relies on extreme physical speed, giant size, and unbreakable toughness.
* **Elementalist:** A master of natural forces who attacks and defends using blasts of fire, water, earth, and lightning.
* **Warden:** A fierce shape-shifter who can command explosive plant growth and transform into deadly wild animals.

---

## 🛠️ Tech Stack & Architecture

* **Backend:** Python 3.14, Flask, Pydantic, Gemini API (AI Game Master Engine)
* **Frontend:** HTML5, CSS3, JavaScript (Async Fetch API)
* **Data Storage:** Local JSON persistence for character state and world/NPC logs

---

## 🚀 Getting Started

1. **Clone or Extract the Project:**
   Ensure `app.py`, `models.py`, `templates/`, and `static/` are in the main project folder.

2. **Install Dependencies:**
   ```bash
   pip install flask pydantic werkzeug