// Minimal shape definitions for the Project Gorgon CDN JSON files.
// Only fields we actively use are typed; everything else is left open.

export interface Ability {
  Name: string;
  InternalName: string;
  Skill: string;
  Level: number;
  Prerequisite?: string;
  Description?: string;
  DamageType?: string;
  Keywords?: string[];
  IconID?: number;
  PvE?: {
    Damage?: number;
    PowerCost?: number;
    RageCost?: number;
    Range?: number;
    ResetTime?: number;
    AttributesThatModDeltaDamage?: string[];
    AttributesThatModPowerCost?: string[];
    SpecialValues?: Array<{
      Label?: string;
      Suffix?: string;
      Value?: number;
      AttributesThatDelta?: string[];
      SkipIfZero?: boolean;
    }>;
    [k: string]: unknown;
  };
  SpecialInfo?: string;
  [k: string]: unknown;
}

export interface ModifierTier {
  EffectDescs?: string[];
  MaxLevel?: number;
  MinLevel?: number;
  SkillLevelPrereq?: number;
  MinRarity?: string;
  [k: string]: unknown;
}

export interface Modifier {
  InternalName: string;
  Skill: string;       // e.g. "Archery", "AnySkill", "ShamanicInfusion"
  Prefix?: string;
  Suffix?: string;
  Slots?: string[];    // ["Head","Chest",...]
  Tiers?: Record<string, ModifierTier>;
  IconID?: number;
  [k: string]: unknown;
}

export interface AttributeDef {
  DefaultValue?: number;
  DisplayType?: string;
  DisplayRule?: string;
  Label?: string;
  IconIds?: number[];
  [k: string]: unknown;
}

export interface SkillDef {
  Id?: number;
  Combat?: boolean;
  Description?: string;
  AssociatedItemKeywords?: string[];
  HideWhenZero?: boolean;
  IconID?: number;
  [k: string]: unknown;
}

export type AbilityMap = Record<string, Ability>;
export type ModifierMap = Record<string, Modifier>;
export type AttributeMap = Record<string, AttributeDef>;
export type SkillMap = Record<string, SkillDef>;

export interface CdnBundle {
  version: string;
  abilities: AbilityMap;
  modifiers: ModifierMap;
  attributes: AttributeMap;
  skills: SkillMap;
}

export const EQUIPMENT_SLOTS = [
  'Head', 'Chest', 'Legs', 'Hands', 'Feet',
  'Ring', 'Necklace', 'MainHand', 'OffHand',
] as const;
export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];
