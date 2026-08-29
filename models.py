from typing import List, Optional
from pydantic import BaseModel, Field

class InventoryCategories(BaseModel):
    consumables: list[str]
    equipment: list[str]
    quest_items: list[str]

class HeroAbility(BaseModel):
    name: str
    description: str = Field(description="A short, flavorful description of what this ability does.")

class HeroPowerState(BaseModel):
    name: str
    power_class: str = Field(alias='class')
    level: int = Field(default=1)
    current_chapter: int = Field(default=1)
    primary_element: Optional[str] = Field(default=None)
    affinity_element: Optional[str] = Field(default=None)
    struggle_element: Optional[str] = Field(default=None)
    specialized_path: Optional[str] = Field(default=None)
    hp: int
    max_hp: int
    abilities: List[HeroAbility]
    inventory: InventoryCategories # Updated from List[str]
    status: str = Field(default='Alive')

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
    chapter_complete: bool = Field(default=False, description="Set to true ONLY if the player completes the CURRENT PLOT OBJECTIVE.")
    atmosphere: str = Field(
        default="neutral",
        description="The visual mood of the current scene. Must be exactly one of: 'mystical', 'icy', 'combat', 'darkness', 'forest', or 'neutral'."
    )
    campaign_summary: str = Field(default="")