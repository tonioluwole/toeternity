// Global toggle for voice (you can wire this to a button later if you want a mute option)
let voiceEnabled = true;
let currentDMAudio = null

async function speakDM(text) {
    if (!voiceEnabled || !text) return;
    
    // Stop browser TTS
    window.speechSynthesis.cancel();
    
    // Stop any playing audio
    if (currentDMAudio) {
        currentDMAudio.pause();
        currentDMAudio.currentTime = 0;
    }

    try {
        // Ask your secure Python backend for the audio file
        const response = await fetch('/api/voice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: text })
        });

        if (response.ok) {
            // Convert the server's response into a playable URL
            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            
            currentDMAudio = new Audio(audioUrl);
            currentDMAudio.play();
        } else {
            throw new Error("Server voice generation failed");
        }
    } catch (error) {
        console.error("Voice Error, falling back to browser TTS:", error);
        // Fallback to browser voice if your quota runs out or the server fails
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    }
}

function toggleMute() {
    // Flip the boolean value
    voiceEnabled = !voiceEnabled;
    
    const muteBtn = document.getElementById('mute-btn');
    
    if (voiceEnabled) {
        muteBtn.innerText = '🔊 Mute';
    } else {
        muteBtn.innerText = '🔇 Unmute';
        // Instantly cut off any currently playing voice
        window.speechSynthesis.cancel();
    }
}

// Fix for some browsers needing a moment to load voices
window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
};
let characterState = null;
let chatHistory = [];
const GEMINI_KEY_STORAGE = "eternity_gemini_api_key";
const GEMINI_KEY_URL = "https://ai.google.dev/gemini-api/docs/api-key";

function ensureGeminiApiKey() {
    let key = sessionStorage.getItem(GEMINI_KEY_STORAGE);
    if (key) return key;

    key = (prompt(
        "This game needs your own Google Gemini API key.\n\n" +
        "1. Open https://ai.google.dev/gemini-api/docs/api-key (a tab should already be open)\n" +
        "2. Sign in and create an API key\n" +
        "3. Paste the key here\n\n" +
        "The key stays in this browser tab only and is sent to the Game Master server for your session."
    ) || "").trim();

    if (!key) {
        alert("A Gemini API key is required to play. Get one at " + GEMINI_KEY_URL);
        return null;
    }

    sessionStorage.setItem(GEMINI_KEY_STORAGE, key);
    return key;
}

function apiHeaders(extra) {
    const headers = Object.assign({ "Content-Type": "application/json" }, extra || {});
    const key = sessionStorage.getItem(GEMINI_KEY_STORAGE);
    if (key) headers["X-Gemini-Api-Key"] = key;
    return headers;
}
const classDescriptions = {
    "Kinetic": "A psychic hero who uses the power of their mind to throw objects, build forcefields, and control enemies.",
    "Vanguard": "A superhuman brawler who relies on extreme physical speed, giant size, and unbreakable toughness.",
    "Elementalist": "A master of natural forces who attacks and defends using blasts of fire, water, earth, and lightning.",
    "Warden": "A fierce shape-shifter who can command explosive plant growth and transform into deadly wild animals."
};


async function startNewGame() {
    console.log("[Step 1] startNewGame triggered");
    if (!ensureGeminiApiKey()) return;
    document.getElementById('start-modal').style.display = 'none';

    const name = prompt("Enter Hero Name:", "Vaughn") || "Wanderer";
    console.log("[Step 2] Name chosen:", name);
    
    let classChoice = "";
    while (!["1","2","3","4"].includes(classChoice)) {
        classChoice = prompt("Choose Class:\n1. Kinetic: A psychic hero who uses the power of their mind to throw objects, build forcefields, and control enemies.\n\n2. Vanguard: A superhuman brawler who relies on extreme physical speed, giant size, and unbreakable toughness.\n\n3. Elementalist: A master of natural forces who attacks and defends using blasts of fire, water, earth, and lightning.\n\n4. Warden: A fierce shape-shifter who can command explosive plant growth and transform into deadly wild animals.", "2");
    }
    
    const classes = {"1": "Kinetic", "2": "Vanguard", "3": "Elementalist", "4": "Warden"};
    const charClass = classes[classChoice];
    console.log("[Step 3] Class chosen:", charClass);
    
    let element = "";
    if (charClass === "Elementalist") {
        const wheel = ["fire", "air", "electricity", "light", "water", "plant", "earth", "dark"];
        // Safeguarded in case the prompt returns null
        while (!element || !wheel.includes(element.toLowerCase())) {
            element = prompt(`Choose Primary Element (${wheel.join(", ")}):`, "fire") || "fire";
        }
    }
    console.log("[Step 4] Element chosen:", element);

    const log = document.getElementById('story-log');
    log.innerText = "Forging world...\n";
    
    // Safeguarded in case the global variable got deleted
    if (typeof chatHistory === 'undefined') {
        window.chatHistory = [];
    } else {
        chatHistory = []; 
    }
    
    console.log("[Step 5] UI prepped, sending fetch request to Python...");

    try {
        const res = await fetch('/api/start_game', {
            method: 'POST',
            headers: apiHeaders(),
            body: JSON.stringify({ name: name, class: charClass, element: element.toLowerCase() })
        });
        
        console.log("[Step 6] Python responded! Status:", res.status);

        if (!res.ok) {
            throw new Error(`Server Error: ${res.status}`);
        }

        const data = await res.json();
        console.log("[Step 7] JSON parsed successfully:", data);
        
        characterState = data.character;
        updateUI();
        
        if (typeof updateNPCs === 'function') {
            updateNPCs(data.npc_ledger); 
        }

        // --- NEW: Change the atmosphere based on the DM's output ---
        if (data.atmosphere) {
            setAtmosphere(data.atmosphere);
        }
        console.log("[Step 8] UI updated on screen");
        
        log.innerText = data.story;
        if (typeof speakDM === 'function') {
            speakDM(data.story);
        }
        console.log("[Step 9] Game successfully started!");

    } catch (error) {
        console.error("[CRASH DETECTED]:", error);
        log.innerText = `\n\n[System Error]: Failed to connect to the Game Master.\nDetails: ${error.message}`;
    }
}

function updateUI() {
    if (!characterState) return;

    // 1. Basic Stats (Notice we removed the char-class-desc line here!)
    document.getElementById('char-name').innerText = `${characterState.name} (Lvl ${characterState.level})`;
    document.getElementById('char-class').innerText = characterState.class;

    // 2. Health Bar
    document.getElementById('char-hp-text').innerText = `${characterState.hp} / ${characterState.max_hp}`;
    const hpPercent = Math.max(0, (characterState.hp / characterState.max_hp) * 100);
    const hpFill = document.getElementById('health-bar-fill');
    if (hpFill) hpFill.style.width = hpPercent + '%';

    if (hpPercent > 0 && hpPercent <= 25) {
        document.body.classList.add('low-hp');
    } else {
        document.body.classList.remove('low-hp');
    }

    // 3. Elemental Matrix
    const matrixDiv = document.getElementById('elemental-matrix');
    if (matrixDiv) {
        if (characterState.class === "Elementalist") {
            matrixDiv.style.display = "block";
            document.getElementById('primary-element').innerText = characterState.primary_element || "None";
            document.getElementById('affinity-element').innerText = characterState.affinity_element || "None";
            document.getElementById('struggle-element').innerText = characterState.struggle_element || "None";
        } else {
            matrixDiv.style.display = "none";
        }
    }

    // 4. Abilities List
    const abilitiesList = document.getElementById('abilities-list');
    if (abilitiesList) {
        abilitiesList.innerHTML = '';
        if (characterState.abilities) {
            characterState.abilities.forEach(ability => {
                let abilityName = typeof ability === 'string' ? ability : ability.name;
                let abilityDesc = typeof ability === 'string' ? "An ability forged in your journey." : ability.description;

                let details = document.createElement('details');
                details.className = 'ability-dropdown';
                
                let summary = document.createElement('summary');
                summary.innerText = abilityName;
                if (abilityName.includes("✦")) summary.classList.add("accent");
                
                let descDiv = document.createElement('div');
                descDiv.className = 'ability-desc';
                descDiv.innerText = abilityDesc;
                
                details.appendChild(summary);
                details.appendChild(descDiv);
                abilitiesList.appendChild(details);
            });
        }
    }

    // 5. Inventory
    const invList = document.getElementById('inventory-list');
    if (invList) {
        invList.innerHTML = '';
        if (characterState.inventory && characterState.inventory.length > 0) {
            characterState.inventory.forEach(item => {
                let li = document.createElement('li');
                li.className = 'inventory-item';
                li.innerText = item;
                invList.appendChild(li);
            });
        } else {
            let li = document.createElement('li');
            li.className = 'inventory-item empty';
            li.innerText = 'Backpack is empty';
            invList.appendChild(li);
        }
    }
}

async function sendAction() {
    const input = document.getElementById('action-input');
    const action = input.value.trim();
    if(!action || !characterState) return;

    const log = document.getElementById('story-log');
    log.innerText += `\n\n> ${action}\n\n`;
    input.value = '';
    log.scrollTop = log.scrollHeight;

    const res = await fetch('/api/action', {
        method: 'POST',
        headers: apiHeaders(),
        // We now include the history array in the request payload
        body: JSON.stringify({ action: action, character: characterState, history: chatHistory })
    });

    const data = await res.json();
    characterState = data.character;
    updateUI();
    updateNPCs(data.npc_ledger);

    // Update atmosphere on every turn ---
    if (data.atmosphere) {
        setAtmosphere(data.atmosphere);
    }

    log.innerText += data.narrative;
    log.scrollTop = log.scrollHeight;
    
    speakDM(data.narrative.replace(/\*/g, ''));

    // Push the interaction into our short-term memory buffer
    chatHistory.push({ role: "Hero", content: action });
    chatHistory.push({ role: "Game Master", content: data.narrative.replace(/\*/g, '') });
    
    // Keep only the last 10 interactions (5 full turns) to prevent API token limits
    if (chatHistory.length > 10) {
        chatHistory = chatHistory.slice(chatHistory.length - 10);
    }

    if (data.is_dead) {
        document.getElementById('death-modal').style.display = 'flex';
    } else if (data.path_choices) {
        showPathModal(data.path_choices);
    }
}

function showPathModal(choices) {
    const container = document.getElementById('path-container');
    container.innerHTML = '';
    
    for (const [pathName, abilities] of Object.entries(choices)) {
        let html = `
        <div class="path-card">
            <h3>${pathName}</h3>
            <ul>${abilities.map(a => `
                <li style="margin-bottom: 15px;">
                    <strong style="color: #fff;">${a.name}</strong><br>
                    <span style="font-size: 0.85em; color: #9ca3af;">${a.description}</span>
                </li>`).join('')}
            </ul>
            <button onclick="selectPath('${pathName}')">Ascend to ${pathName}</button>
        </div>`;
        container.innerHTML += html;
    }
    document.getElementById('path-modal').style.display = 'flex';
}

async function selectPath(pathName) {
    document.getElementById('path-modal').style.display = 'none';
    
    const res = await fetch('/api/choose_path', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ character: characterState, path: pathName })
    });
    
    const data = await res.json();
    characterState = data.character;
    updateUI();
    
    const log = document.getElementById('story-log');
    log.innerText += data.narrative;
    log.scrollTop = log.scrollHeight;

    speakDM(data.narrative.replace(/\*/g, ''));
}

async function saveSession() {
    if (!characterState) return;
    const storyText = document.getElementById('story-log').innerText;
    
    await fetch('/api/save_game', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        // Add chatHistory to the save payload
        body: JSON.stringify({ character: characterState, story: storyText, history: chatHistory })
    });
    
    const log = document.getElementById('story-log');
    log.innerText += `\n\n*** YOUR GAME IS SAVED ***\n\n`;
    log.scrollTop = log.scrollHeight;
}

async function loadSession() {
    const res = await fetch('/api/load_game');
    const json = await res.json();
    
    if (json.status === "success") {
        const startModal = document.getElementById('start-modal');
        if (startModal) startModal.style.display = 'none';
        
        characterState = json.data.character;
        // Restore the history from the save file (or default to empty if it's an old save)
        chatHistory = json.data.history || [];
        
        updateUI();
        updateNPCs(json.data.npc_ledger);
        
        const log = document.getElementById('story-log');
        log.innerText = json.data.story + `\n\n*** GAME LOADED ***\n\n`;
        log.scrollTop = log.scrollHeight;
        
        speakDM("Game loaded. Welcome back, let's begin.");
    } else {
        alert("No save file found!");
    }
}

function setAtmosphere(mood) {
    const root = document.documentElement;
    
    // Update the UI text badge
    const moodIndicator = document.getElementById('mood-indicator');
    if (moodIndicator) {
        moodIndicator.innerText = mood;
    }
    
    if (mood === 'mystical') {
        root.style.setProperty('--bg-color', '#1a0b2e'); // Deep purple
        root.style.setProperty('--accent-color', '#ffd700'); // Gold
    } else if (mood === 'icy') {
        root.style.setProperty('--bg-color', '#0f172a'); // Deep blue
        root.style.setProperty('--accent-color', '#00ffff'); // Cyan
    } else if (mood === 'combat') {
        root.style.setProperty('--bg-color', '#2a0808'); // Dark red
        root.style.setProperty('--accent-color', '#ff4444'); // Bright red
    } else if (mood === 'darkness') {
        root.style.setProperty('--bg-color', '#000000'); // Pitch black
        root.style.setProperty('--accent-color', '#ffffff'); // Pure white
    } else if (mood === 'forest') {
        root.style.setProperty('--bg-color', '#06402b'); // Deep jungle green
        root.style.setProperty('--accent-color', '#4ade80'); // Vibrant toxic green
    } else {
        // Default resets (Neutral)
        root.style.setProperty('--bg-color', '#111827');
        root.style.setProperty('--accent-color', '#3b82f6');
    }
}

function updateNPCs(ledger) {
    const panel = document.getElementById('npc-panel');
    const list = document.getElementById('npc-list');
    
    if (!ledger || Object.keys(ledger).length === 0) {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = 'block';
    list.innerHTML = '';

    for (const [name, info] of Object.entries(ledger)) {
        const card = document.createElement('div');
        card.className = 'npc-card';

        // Choose badge color based on key phrases in disposition
        let dispClass = 'badge-neutral';
        const dispLower = (info.disposition || '').toLowerCase();
        
        if (dispLower.includes('friendly') || dispLower.includes('ally') || dispLower.includes('loyal')) {
            dispClass = 'badge-friendly';
        } else if (dispLower.includes('hostile') || dispLower.includes('enemy') || dispLower.includes('terrified')) {
            dispClass = 'badge-hostile';
        } else if (dispLower.includes('indebted') || dispLower.includes('trust')) {
            dispClass = 'badge-indebted';
        }

        card.innerHTML = `
            <div class="npc-header">
                <span class="npc-name">${name}</span>
                <span class="npc-badge ${dispClass}">${info.disposition}</span>
            </div>
            <div class="npc-notes">${info.notes}</div>
        `;
        list.appendChild(card);
    }
}

function confirmNewGame() {
    if (confirm("Are you sure you want to start a new game? Any unsaved progress will be lost.")) {
        startNewGame();
    }
}

function goToMainMenu() {
    if (confirm("Return to the Main Menu? Make sure you have saved your game first!")) {
        // Stop the DM voiceover immediately
        window.speechSynthesis.cancel();
        
        // This un-hides the big Start Menu modal to cover the screen again
        document.getElementById('start-modal').style.display = 'flex';
    }
}