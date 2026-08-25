from typing import List, Optional
from pydantic import BaseModel, Field

class HeroAbility(BaseModel):
    name: str
    description: str = Field(description="A short, flavorful description of what this ability does.")

class HeroPowerState(BaseModel):
    name: str
    power_class: str = Field(alias='class')
    level: int = Field(default=1)
    primary_element: Optional[str] = Field(default=None)
    affinity_element: Optional[str] = Field(default=None)
    struggle_element: Optional[str] = Field(default=None)
    specialized_path: Optional[str] = Field(default=None)
    hp: int
    max_hp: int
    abilities: List[HeroAbility]
    inventory: List[str] = Field(default=[])
    status: str = Field(default='Alive')

    # --- NEW: NPC Relationship Schema ---
class NPCRelationship(BaseModel):
    name: str = Field(description="The name of the NPC.")
    disposition: str = Field(description="e.g., Friendly, Hostile, Suspicious, Indebted, Terrified")
    notes: str = Field(description="A brief summary of their last interaction with the hero.")

class DMResponse(BaseModel):
    narrative: str
    d20_roll: int
    hero_update: HeroPowerState
    unlocked_path_choice: Optional[List[str]] = Field(default=None)
    major_event_summary: str = Field(default="")
    npc_updates: Optional[List[NPCRelationship]] = Field(default=None)
    atmosphere: str = Field(
        default="default",
        description="The visual mood of the current scene. Must be exactly one of: 'default', 'combat', 'mystical', or 'icy'."
    )