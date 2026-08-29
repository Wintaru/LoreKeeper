-- Player self-service opt-in: let other party members see a character's
-- wallet and loot in the Roster tab. Off by default — a player's currency
-- and items stay private until they choose to share them.

alter table characters
  add column if not exists share_inventory_with_party boolean not null default false;
