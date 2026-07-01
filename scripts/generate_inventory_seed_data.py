import json
import os
from pathlib import Path

# Raw inventory data
raw_data = """Quantity	Item
1	chainsaw
1	22 in combo spotlight light bar
4	trailer wheel chocks
1	coiled air compressor hose
15	ratchet straps
2	4 way wrenches
2	multiport extension cords
2	3 ton ratchet Jack stand jacks
4	cases of water
1	case of gatorade
3	1L smart waters
1	box mountain trailmix
1	box chewy granola bars
1	box kars granola bars
1	bottle goof off
1	bottle hot sauce
1	bottle Bug and tar remover
2	5/16th trailer ball
2	in trailer ball (missing pin)
1	Box Hydration drink mixes
1	reese lock (tongue lock)
1	box emergency road triangles
1	Portable air compressor
2	5gal diesel cans
3	5gal gas cans
1	trailer spare
1	fire extinguisher
1	750 watt power inverter
33	PVD recharged
65	vests
24	wire guard
1	covid masks
7	pair gloves
19	wire snips
50	safety glasses
20	fingers
12	DA binders
16	DA binders w/ glasses
12	cones
37	hard hats
11	Da binders needing refiling
29	strobes
12	wire guard binders
46	ice cleats
14	notepads
12	roles CAUTION tape
3	role VOLTAGE tape
36	foot warmers
48	1/2 hand warmers
25	bottles of HEET
23	truck stickers
13	truck magnets
27	bike lights
5	head lamps
17	flashlights
29	silicone wipes
2	first aid kits
6	diesel fuel supplements
1	Pair chemical gloves
1	Box xlarge nitrile gloves
47	red 2 pocket folders
113	file folders
1	Pack of binder sleeves
1	milwalki 1/2 in drive impact hand money gun
1	Kobalt Anvil 1/2 in impact drill
1	kobalt quick release impact
1	kobalt Bit kit
1	1500 watt power inverter
18	ipad straps
1	500 watt power inverter
1	2gauge HD 51 in batterycable
1	4gauge HD 51 in battery cable
1	4gauge HD 32in battery cable
6	walkie talkies
2	compartment clip boards
3	walkie talkie 2outlet charger cables
1	stapler
1	pair scissors
3	roles tape
1	role packing tape
2	roles yellow lable tape
2	staple removers"""

# Parse the data
lines = raw_data.strip().split('\n')[1:]  # Skip header
inventory_items = []

for line in lines:
    parts = line.split('\t')
    if len(parts) == 2:
        quantity = int(parts[0])
        item_name = parts[1].strip()
        
        # Generate a slug for the item
        slug = item_name.lower().replace(' ', '_').replace('/', '_').replace('(', '').replace(')', '').replace('-', '_')[:50]
        
        # Categorize items
        category = "Uncategorized"
        item_lower = item_name.lower()
        
        if any(word in item_lower for word in ['chainsaw', 'wrench', 'jack', 'drill', 'impact', 'snips', 'stapler', 'scissors']):
            category = "Tools"
        elif any(word in item_lower for word in ['light', 'spotlight', 'strobe', 'lamp', 'flashlight', 'bike light']):
            category = "Lighting"
        elif any(word in item_lower for word in ['cord', 'cable', 'charger', 'inverter', 'walkie talkie']):
            category = "Electronics"
        elif any(word in item_lower for word in ['vest', 'hard hat', 'glasses', 'gloves', 'mask', 'cleats', 'binder', 'folder', 'notepad', 'tape', 'cone']):
            category = "Safety & PPE"
        elif any(word in item_lower for word in ['water', 'gatorade', 'drink', 'trailmix', 'granola', 'heet', 'supplement']):
            category = "Supplies & Consumables"
        elif any(word in item_lower for word in ['trailer', 'wheel', 'chock', 'ball', 'hose', 'compressor', 'extinguisher', 'triangle']):
            category = "Vehicle & Trailer"
        elif any(word in item_lower for word in ['strap', 'ipad strap', 'sticker', 'magnet', 'wipe', 'kit']):
            category = "Equipment"
        
        inventory_items.append({
            "id": len(inventory_items) + 1,
            "item_name": item_name,
            "slug": slug,
            "quantity": quantity,
            "category": category,
            "unit": "each",
            "min_stock_level": 1,
            "location": "Trailer",
            "status": "available",
            "created_at": "2026-02-10T00:00:00Z",
            "updated_at": "2026-02-10T00:00:00Z"
        })

# Determine output path (relative to script location)
script_dir = Path(__file__).parent
output_path = script_dir.parent / "sql" / "seed-data" / "inventory-items.json"

# Create directory if it doesn't exist
output_path.parent.mkdir(parents=True, exist_ok=True)

# Write to file
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(inventory_items, f, indent=2, ensure_ascii=False)

print(f"✓ Successfully generated {len(inventory_items)} inventory items")
print(f"✓ Output saved to: {output_path}")
