import json
import sys
import os
from dotenv import load_dotenv 
from flask import Flask, jsonify, render_template, request, Response
from google import genai
from google.genai import types
from models import DMResponse
from google.cloud import texttospeech

load_dotenv()

def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)

ROOT_DIR = resource_path(".")
MODEL_ID = "gemini-3.1-flash-lite"

app = Flask(
    __name__,
    template_folder=os.path.join(ROOT_DIR, "templates"),
    static_folder=os.path.join(ROOT_DIR, "static"),
)

def get_request_api_key():
    header_key = request.headers.get("X-Gemini-Api-Key", "").strip()
    body_key = ""
    if request.is_json and request.json:
        body_key = (request.json.get("gemini_api_key") or "").strip()
    return header_key or body_key or os.environ.get("GEMINI_API_KEY") or ""

def get_gemini_client():
    api_key = get_request_api_key()
    if not api_key:
        return None
    return genai.Client(api_key=api_key)

json_path = resource_path("elements.json")
with open(json_path, "r", encoding="utf-8") as elements_file:
    ELEMENTS = json.load(elements_file)

CLASS_PATHS = {
    "Kinetic": {
        "Telekinetic Ascendant": [
            {"name": "✦ Kinetic Railgun", "description": "Compress ambient debris into a dense projectile and fire it at a single target at supersonic speeds."},
            {"name": "✦ Gravimetric Shockwave", "description": "Emit a massive, outward pulse of kinetic force that shatters the environment and flings all surrounding enemies backward."},
            {"name": "✦ Impenetrable Force-Dome", "description": "Project a massive, stationary bubble of telekinetic energy that blocks all incoming physical and elemental attacks."},
            {"name": "✦ Telekinetic Flight", "description": "Bind yourself in kinetic energy to fly seamlessly, allowing you to traverse any terrain or execute devastating dive-bomb impacts."}
        ],
        "Telepathic Ascendant": [
            {"name": "✦ Memory Severance", "description": "Violently assault a single target's mind, forcing them to relive traumatic memories to inflict severe psychic damage."},
            {"name": "✦ Psychic Scream", "description": "Unleash a telepathic shockwave that shatters the focus of all nearby enemies, causing immediate disorientation and pain."},
            {"name": "✦ Mind Domination", "description": "Take direct, overriding control of an enemy's nervous system and actions, temporarily turning them into an ally."},
            {"name": "✦ Cognitive Phasing", "description": "Erase your physical presence from the minds of all observers, allowing you to casually walk through active crossfire to reposition undetected."}
        ]
    },
    "Vanguard": {
        "Speedster Ascendant": [
            {"name": "✦ Mach-Tension Strike", "description": "Accelerate your fist to supersonic speeds to deliver a single, devastating blow that shatters physical armor."},
            {"name": "✦ Afterimage Flurry", "description": "Move so fast you appear in a dozen places at once, striking every enemy in the vicinity simultaneously."},
            {"name": "✦ Molecular Phasing", "description": "Vibrate your molecular structure to become completely intangible, causing enemy attacks and crowd control to pass harmlessly through you."},
            {"name": "✦ Tachyon Sprint", "description": "Enter a state of hyper-movement, allowing you to run on water, scale skyscrapers, and cross massive distances instantly."}
        ],
        "Titan Ascendant": [
            {"name": "✦ Colossal Haymaker", "description": "Rapidly expand your mass and physical size to towering heights to deliver a single, bone-crushing strike."},
            {"name": "✦ Seismic Stomp", "description": "Slam the ground with immense, localized weight, generating a shockwave that shatters the terrain and knocks all nearby foes off their feet."},
            {"name": "✦ Juggernaut Stance", "description": "Alter your physical density to become an immovable object, gaining total immunity to pain, stagger effects, and forced movement."},
            {"name": "✦ Meteor Leap", "description": "Channel extreme physical power into your legs to vault across the battlefield, crashing down into a new position like a meteor."}
        ]
    },
    "Elementalist": {
        "Singularity Ascendant": [
            {"name": "✦ Singularity Crush", "description": "Create a localized gravity well that pulls enemies in before detonating with heavy radiation."},
            {"name": "✦ Gamma-Ray Beam", "description": "Fire a concentrated, blinding beam of radioactive hard-light that bypasses physical armor."},
            {"name": "✦ Zero-G Suspension", "description": "Nullify gravity in a specific area, leaving enemies floating helplessly in a void."},
            {"name": "✦ Perpendicular Shift", "description": "Manipulate your personal gravity to effortlessly run and fight along vertical walls and ceilings."}
        ],
        "Bio-Electric Ascendant": [
            {"name": "✦ Conductive Spore Cloud", "description": "Release a thick cloud of electrified pollen that shocks enemies over time and tracks movements."},
            {"name": "✦ Nervous System Hijack", "description": "Shoot bio-electrical vines to briefly override and control a target's motor functions."},
            {"name": "✦ Neural Overcharge", "description": "Supercharge a nervous system to drastically increase reaction speed and physical reflexes."},
            {"name": "✦ Mycelial Spark-Dash", "description": "Dissolve into charged spores to instantly travel along unseen root networks and re-materialize."}
        ],
        "Sand Ascendant": [
            {"name": "✦ Abrasive Cyclone", "description": "Summon a violent, high-speed sandstorm that strips away armor and suffocates foes."},
            {"name": "✦ High-Velocity Grit", "description": "Fire tightly compressed blasts of sand that cut through solid objects like a steel waterjet."},
            {"name": "✦ Dust Devil Glide", "description": "Levitate on a swirling cyclone of abrasive sand to glide over terrain and scale walls over a short range."},
            {"name": "✦ Sand Cloud Platform", "description": "Compress a dense cloud of hovering sand to stand on, granting you high-altitude, sustained flight."}
        ],
        "Steam Ascendant": [
            {"name": "✦ Scalding Geyser", "description": "Erupt superheated steam from the ground, launching targets into the air with severe thermal damage."},
            {"name": "✦ Concussive Pressure Wave", "description": "Release a highly pressurized vapor blast capable of shattering concrete and throwing enemies back."},
            {"name": "✦ Thermal Fog Screen", "description": "Blanket the battlefield in a thick, boiling mist that blinds enemies and sears skin on contact."},
            {"name": "✦ Pressurized Geyser Leap", "description": "Superheat ambient moisture to create a massive steam explosion, launching yourself incredibly high."}
        ],
    },
    "Warden": {
        "Verdant Ascendant": [
            {"name": "✦ Ironwood Impale", "description": "Summon a dense, spear-like root from the earth to violently pierce and shatter a single target's defenses."},
            {"name": "✦ Instant Season Growth", "description": "Force a rapid cycle of growth and decay, erupting the battlefield in crushing vines and a thick haze of toxic, pink and gold pollen."},
            {"name": "✦ Grasping Thicket", "description": "Summon an array of unbreakable, thorny vines that entangle enemies, holding them completely immobile while draining their stamina."},
            {"name": "✦ Timber-Step", "description": "Merge your physical form into the trunk of a tree or large plant, instantly traversing the root network to emerge from another."}
        ],
        "Feral Ascendant": [
            {"name": "✦ Apex Rend", "description": "Temporarily transform your limbs to grow claws and talons and deliver slashing attacks that cause severe bleeding."},
            {"name": "✦ Stampeding Rift", "description": "Tear open a portal to the Beast World, unleashing a chaotic stampede of supernatural beasts that tramples all enemies in a wide path."},
            {"name": "✦ Primal Intimidation", "description": "Unleash a terrifying, supernatural roar backed by a dark atmospheric aura that paralyzes weaker enemies with pure instinctual fear."},
            {"name": "✦ Predator's Vault", "description": "Shift into a sleek, hyper-agile beast form to leap incredible distances, silently scale sheer drops, and ambush prey from above."}
        ]
    }
}

SYSTEM_INSTRUCTION = """
You are the Game Master for 'Eternity', a high-fantasy RPG inspired by the lively, cinematic worlds of Vox Machina and the Mighty Nein. The hero classes are: Kinetic, Vanguard, Elementalist, and Warden.

TONE, SETTING & NARRATIVE STYLE:
- SETTING: A vibrant fantasy world filled with bustling adventurer guilds, lively taverns, and dangerous wilds. NPCs include diverse humanoid races (elves, tieflings, dwarves, orcs, etc.), while non-humanoid creatures are strictly beasts or monsters.
- STYLE: Use plain, accessible English. You can use mild fantasy flavor, but avoid overly archaic, medieval, or dense jargon. 
- Focus on gripping, cinematic storytelling. Describe environments and action sequences vividly, blending magical combat with tactical action.
- PACING: Keep your narrative responses concise (2 to 3 paragraphs maximum). Avoid wall-of-text responses.
- PLAYER AGENCY: Never dictate the hero's actions, thoughts, or dialogue. Always describe the *results* of their action, then end your response with a clear hook, consequence, or question that prompts the player on what to do next.
- ECONOMY: The setting uses a traditional fantasy economy. All in-game financial transactions, loot values, guild bounties, or monetary discussions must be specified in Gold (gp), Silver (sp), or Copper (cp) pieces.

RULES & MECHANICS:
1. ACTION RESOLUTION: Evaluate the player's action and roll an internal d20. 
   - 1: Critical Failure (severe consequence or damage taken)
   - 2-10: Setback/Failure (action fails, or succeeds with a heavy cost)
   - 11-19: Success (action succeeds as intended)
   - 20: Critical Success (action succeeds perfectly with a bonus effect)
2. COMBAT: Adjust difficulty based on clever power use. Track HP logically. If a player is hit, reduce their HP in the 'hero_update'. If HP <= 0, status is 'Dead'. Record their death in 'major_event_summary'.
3. ELEMENTAL COMBAT: If the hero is an Elementalist, actively factor in their 'primary_element', 'affinity_element', and 'struggle_element'. Give them narrative and mechanical advantages when using affinities, and severe disadvantages/damage penalties when facing their struggle element.
4. PROGRESSION: Character max HP increases as they level up. When a character overcomes a major challenge or defeats a boss, increment their 'level' by 1. 
5. COMPANION: If the hero has rescued the fairy companion, she travels with them permanently. She should periodically interject with witty commentary, mildly unhelpful advice, or minor magical distractions during the hero's actions to provide comedic relief.
6. ASCENSION: If they reach Level 5, the system will pause and ask them to choose a permanent specialized path. Build narrative anticipation as they approach this milestone.
7. NPC TRACKING: If the hero interacts with a named NPC, evaluate how the interaction went and output an update in 'npc_updates' detailing their new disposition (e.g., Hostile, Friendly, Suspicious) and a note on what happened.
8. INVENTORY & CONSUMABLES: The hero has an 'inventory' list. If they find loot, receive a gift, or buy an item, add it to this list. If they use a consumable item (like a Health Potion), you MUST remove it from their inventory list. If a healing item is used, you must mechanically increase their 'hp' up to their 'max_hp' in the 'hero_update'.
9. ATMOSPHERE: Use the 'atmosphere' JSON field to output exactly one of these six words to describe the current scene's mood: "mystical", "icy", "combat", "darkness", "forest", or "neutral". This drives the game's UI colors.
"""

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/start_game", methods=["POST"])
def start_game():
    data = request.json
    char_name = data.get("name", "Wanderer")
    char_class = data.get("class", "Vanguard")
    primary_elem = data.get("element", "").lower()

    # Calculate elemental affinity
    aff, strg = None, None
    if char_class == "Elementalist" and primary_elem in ELEMENTS["elemental_wheel"]:
        aff = ELEMENTS["elemental_matrix"][primary_elem]["affinity"]
        strg = ELEMENTS["elemental_matrix"][primary_elem]["struggle"]

    abilities = []
    if char_class == "Kinetic": 
        abilities = [
            {"name": "Kinetic Thrust", "description": "A focused blast of physical force to strike or aggressively push a single target."},
            {"name": "Repulsion Field", "description": "A quick, short-range outward pulse to knock back adjacent enemies."},
            {"name": "Mind-Graze", "description": "Briefly read surface thoughts or project a short distraction into a target's mind."},
            {"name": "Grav-Leap", "description": "Briefly lower your personal gravity to jump a significant distance or safely soften a fall."}
        ]
    elif char_class == "Vanguard": 
        abilities = [
            {"name": "Quickstrikes", "description": "A rapid succession of precise, heavy physical blows."},
            {"name": "Sweeping Blow", "description": "A wide, forceful swing designed to strike multiple adjacent enemies at once."},
            {"name": "Toughness", "description": "Brace yourself to shrug off minor damage and resist being knocked down."},
            {"name": "Surge Dash", "description": "A sudden burst of speed to close the distance to a target instantly or evade an attack."}
        ]
    elif char_class == "Warden": 
        abilities = [
            {"name": "Vine-Lash", "description": "Whip a target with a rapidly grown, thorny vine."},
            {"name": "Spore Cloud", "description": "Release a burst of irritating pollen to temporarily blind and distract nearby enemies."},
            {"name": "Beast Call", "description": "Communicate with and summon small local wildlife for scouting or minor distractions."},
            {"name": "Bramble-Swing", "description": "Shoot a sturdy vine to swing across gaps or pull yourself quickly to higher ground."}
        ]
    elif char_class == "Elementalist": 
        p_cap = primary_elem.capitalize()
        abilities = [
            {"name": f"Basic {p_cap} Bolt", "description": f"Fire a simple, concentrated projectile of {primary_elem}."},
            {"name": f"{p_cap} Burst", "description": f"Release a short-range, unrefined shockwave of {primary_elem} energy."},
            {"name": f"Basic {p_cap} Ward", "description": f"Create a minor defensive shield of {primary_elem} to deflect attacks."},
            {"name": f"{p_cap} Glide", "description": f"Ride a brief surge of {primary_elem} to slide quickly across the ground or hover momentarily."}
        ]

    initial_char = {
        "name": char_name, "class": char_class, "level": 1,
        "hp": 20, "max_hp": 20, "abilities": abilities, "status": "Alive",
        "current_chapter": 1, # Track the plot
        "primary_element": primary_elem, "affinity_element": aff, "struggle_element": strg,
        "specialized_path": None,
        "inventory": ["Lesser Healing Potion", "50 Gold Pieces"] 
    }

    prompt = f"Hero: {json.dumps(initial_char)}\nBegin the story. Describe where they awaken."

    client = get_gemini_client()
    if client is None:
        return jsonify({
            "error": "A Google Gemini API key is required. Create one at https://ai.google.dev/gemini-api/docs/api-key and paste it in the game."
        }), 401

    response = client.models.generate_content(
        model=MODEL_ID, contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION, response_mime_type="application/json", response_schema=DMResponse, temperature=0.8,
        ),
    )
    dm_data = DMResponse.model_validate_json(response.text)
    char_dict = dm_data.hero_update.model_dump(by_alias=True)
    
    if char_class == "Elementalist":
        char_dict["primary_element"] = primary_elem
        char_dict["affinity_element"] = aff
        char_dict["struggle_element"] = strg

    return jsonify({
        "character": char_dict, 
        "story": dm_data.narrative,
        "npc_ledger": {},
        "atmosphere": dm_data.atmosphere
    })

@app.route("/api/voice", methods=["POST"])
def generate_voice():
    text = request.json.get("text")
    if not text:
        return jsonify({"error": "No text provided"}), 400

    creds_json = os.environ.get("GOOGLE_CREDENTIALS_JSON")
    if not creds_json:
        return jsonify({"error": "Missing Google credentials"}), 500
        
    creds_dict = json.loads(creds_json)
    client = texttospeech.TextToSpeechClient.from_service_account_info(creds_dict)

    synthesis_input = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(
        language_code="en-GB",
        name="en-GB-Chirp3-HD-Enceladus" 
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )

    try:
        response = client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )
        return Response(response.audio_content, mimetype="audio/mpeg")
    except Exception as e:
        print(f"Google TTS Error: {e}")
        return jsonify({"error": "Failed to generate voice"}), 500

PLOT_POINTS = {
    1: "The Awakening: The hero awakens in a crumbling underground ruin with no memory of how they got there. They must explore the room and retrieve a pulsing artifact called the Aether Core from a trapped stone pedestal. Set 'chapter_complete' to true ONLY when the hero successfully survives the trap and the Aether Core is explicitly added to their inventory.",
    2: "The Shadow Ambush: The hero exits the ruins and travels through a dense, foggy forest toward the nearest town. They must be ambushed by a pack of feral Shadow-Hounds hunting the Core. Set 'chapter_complete' to true ONLY when the hero defeats or outruns the pack and physically passes through the safe gates of the town.",
    3: "The Glimmering Nuisance: The hero spots a sarcastic, fast-talking female fairy trapped inside a glass lantern held by a wandering scavenger. She provides comedic relief and demands to be rescued. Set 'chapter_complete' to true ONLY when the hero frees her and she formally tags along as a companion.",
    4: "The Prism Mechanism: The hero must find an eccentric scholar in the town to examine the Aether Core. To open it, the hero must solve a mechanical puzzle by rotating three large crystal lenses to mix red, blue, and green light beams into a focused white beam. The fairy should offer terribly unhelpful puzzle advice. Set 'chapter_complete' to true ONLY when the light beams are aligned correctly and the Core unlocks.",
    5: "The Betrayal: The unlocked Core projects a holographic map to the World-Forge, but the scholar betrays the hero, stealing the map and summoning two heavy elemental golems to cover their escape. Set 'chapter_complete' to true ONLY when the hero destroys both golems and finds the scholar's escape trail.",
    6: "The World-Forge Climax: The hero tracks the scholar to the World-Forge. They must engage in a final boss battle to stop the scholar from plugging the Aether Core into the forge's main terminal, which would shatter the continent. Set 'chapter_complete' to true ONLY when the scholar is defeated and the hero physically unplugs or destroys the Aether Core.",
    7: "The Legacy: The main quest is over. Allow the player to freely explore the world, take on local guild bounties, and build their legacy."
}

@app.route("/api/action", methods=["POST"])
def process_action():
    data = request.json
    
    history = data.get("history", [])
    history_text = "No recent events."
    if history:
        history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history])
    
    npc_ledger = data.get("npc_ledger", {})
    known_npcs = json.dumps(npc_ledger)
    
    # --- NEW: Plot Tracking ---
    current_chapter = data['character'].get('current_chapter', 1)
    chapter_goal = PLOT_POINTS.get(current_chapter, "Survive and explore the world. (Free Roam)")
    
    prompt = (
        f"Hero State: {json.dumps(data['character'])}\n"
        f"Recent Events (Short-Term Memory):\n{history_text}\n"
        f"Known NPCs (Disposition & Notes):\n{known_npcs}\n\n"
        f"CURRENT PLOT OBJECTIVE (Steer the narrative toward this): {chapter_goal}\n\n"
        f"Action: '{data['action']}'\n"
        "Evaluate action, roll d20, apply rules, update state. If interacting with a named NPC, update their standing in 'npc_updates'. If the player achieves the CURRENT PLOT OBJECTIVE, set 'chapter_complete' to true."
    )
    
    client = get_gemini_client()
    if client is None:
        return jsonify({
            "error": "A Google Gemini API key is required. Create one at https://ai.google.dev/gemini-api/docs/api-key and paste it in the game."
        }), 401

    response = client.models.generate_content(
        model=MODEL_ID, contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION, response_mime_type="application/json", response_schema=DMResponse, temperature=0.7,
        ),
    )
    dm_data = DMResponse.model_validate_json(response.text)
    char_dict = dm_data.hero_update.model_dump(by_alias=True)

    # Process and update NPC ledger in-memory for this client response
    if dm_data.npc_updates:
        for npc in dm_data.npc_updates:
            npc_ledger[npc.name] = {
                "disposition": npc.disposition,
                "notes": npc.notes
            }

    # --- NEW: Advance the Chapter ---
    if getattr(dm_data, 'chapter_complete', False):
        char_dict['current_chapter'] = current_chapter + 1
    else:
        char_dict['current_chapter'] = current_chapter

    path_choices = None
    if char_dict["level"] >= 5 and not char_dict.get("specialized_path"):
        class_name = char_dict["class"]
        all_paths = CLASS_PATHS.get(class_name, {})
        
        if class_name == "Elementalist":
            primary_elem = char_dict.get("primary_element", "").lower()
            allowed_paths = {}
            
            element_to_fusion = {
                "light": "Singularity Ascendant", "dark": "Singularity Ascendant",
                "plant": "Bio-Electric Ascendant", "electricity": "Bio-Electric Ascendant",
                "earth": "Sand Ascendant", "air": "Sand Ascendant",
                "water": "Steam Ascendant", "fire": "Steam Ascendant"
            }
            
            fusion_path = element_to_fusion.get(primary_elem)
            if fusion_path and fusion_path in all_paths:
                allowed_paths[fusion_path] = all_paths[fusion_path]
                
            path_choices = allowed_paths
        else:
            path_choices = all_paths

    is_dead = char_dict["status"].lower() == "dead" or char_dict["hp"] <= 0
    if is_dead:
        char_dict["hp"], char_dict["status"] = 0, "Dead"

    return jsonify({
        "character": char_dict, 
        "narrative": dm_data.narrative, 
        "is_dead": is_dead, 
        "path_choices": path_choices,
        "npc_ledger": npc_ledger,
        "atmosphere": dm_data.atmosphere
    })

@app.route("/api/choose_path", methods=["POST"])
def choose_path():
    data = request.json
    char = data.get("character")
    chosen_path = data.get("path")
    
    char["specialized_path"] = chosen_path
    new_abilities = CLASS_PATHS[char["class"]][chosen_path]
    char["abilities"].extend(new_abilities)
    
    extra_narrative = ""
    if char["class"] == "Elementalist":
        fusion_to_elements = {
            "Singularity Ascendant": ["light", "dark"],
            "Bio-Electric Ascendant": ["plant", "electricity"],
            "Sand Ascendant": ["earth", "air"],
            "Steam Ascendant": ["water", "fire"]
        }
        
        if chosen_path in fusion_to_elements:
            pair = fusion_to_elements[chosen_path]
            primary = char.get("primary_element", "").lower()
            secondary = pair[1] if pair[0] == primary else pair[0]
            char["secondary_element"] = secondary
            extra_narrative = f" You have also unlocked complete mastery over {secondary.capitalize()}!"
    
    narrative = f"\n\n*** You have ascended. The power of the {chosen_path} surges through you.{extra_narrative} New abilities have been permanently unlocked. ***\n"
    
    return jsonify({"character": char, "narrative": narrative})

if __name__ == "__main__":
    app.run(debug=True, port=5000)