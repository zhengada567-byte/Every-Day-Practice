"""Build data/wordpack.json with explanations, picture tags, and 4 sentences per word."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "wordpack.json"


def wc(text: str) -> int:
    return len(text.replace("___", "WORD").split())


def s(text: str, answer: str, distractors: list) -> dict:
    filled = text.replace("___", answer)
    n = wc(text)
    if n <= 15:
        raise ValueError(f"Sentence too short ({n} words): {filled}")
    return {"text": text, "answer": answer, "distractors": distractors}


# Level 1 clues: no target word, root, or close giveaway in the explanation text.
EXPLANATIONS = {
    "affect": "To change how something develops. One event can alter another in ways you may not expect.",
    "earthworm": "A long, soft animal that lives in soil. It tunnels through dirt and helps air and water reach plant roots.",
    "effect": "What happens because of an earlier action or cause. Dropping a book can create a loud noise when it hits the floor.",
    "emergent": "The highest rainforest level, where the tallest trees rise above the main canopy into bright sun and wind.",
    "ferocious": "Very wild, violent, or aggressive. Such behaviour can seem frightening and powerful in animals or storms.",
    "grasshopper": "A jumping plant-eater with long back legs and strong jaws. Large swarms can strip a field in days.",
    "insect": "A small animal with six legs, three body parts, and often wings. Ants, bees, and beetles belong to this group.",
    "mammal": "An animal with hair or fur that feeds milk to its young. Dogs, whales, and humans belong to this group.",
    "poisonous": "Unsafe to eat or touch; certain plants and animals can make you very sick if handled wrongly.",
    "sustain": "To keep something going over time; to support life, health, or interest so it continues.",
    "trek": "A long, hard journey, especially on foot through wild or rough country.",
    "underground": "Located below the surface of the ground, hidden from view above.",
    "understory": "The shaded middle level of a forest, below the canopy but above the forest floor.",
    "carbon footprint": "The total climate impact of your daily choices, from travel and electricity to what you buy and throw away.",
    "climate change": "Long-term shifts in weather patterns and average temperature on Earth, linked to pollution and human activity.",
    "damage": "Harm that makes something worse, broken, or less valuable.",
    "dangerous": "Not safe; likely to cause harm or injury.",
    "destructive": "Causing serious harm, ruin, or breakage.",
    "drought": "When little rain falls for a long time, rivers shrink and crops struggle or fail.",
    "frequent": "Happening often or many times.",
    "greenhouse gas": "A gas that traps heat in the atmosphere, warming the planet when too much builds up.",
    "gust": "A sudden powerful blast of wind that can knock things over in seconds.",
    "marine": "Having to do with the sea; describing life or activities in salt water.",
    "prone": "Likely to experience something or tend toward it, such as flooding in a low valley.",
    "rescue": "To save someone or something from danger; teams do this after storms or accidents.",
    "resource": "Something useful that people or nature need, such as water, timber, or fish. Supplies can be limited.",
    "storm-proof": "Designed to withstand severe wind and heavy rain without breaking.",
    "survivor": "Someone or something that remains alive after an accident, disaster, or other danger.",
    "armoured": "Covered with hard protection, such as metal plates or thick plates on skin.",
    "bellow": "To roar or shout deeply and loudly, in a way that carries far across a field or cave.",
    "confused": "Unable to think clearly; unsure what is happening or what to do.",
    "cosy": "Warm, comfortable, and pleasant, often in a small safe space.",
    "creature": "A living being, especially one that seems strange, wild, or imaginary.",
    "excited": "Feeling very happy and eager about something about to happen.",
    "fawn over": "To shower someone with exaggerated praise, often in a way that seems insincere.",
    "fierce": "Showing strong, wild anger or power; frighteningly intense.",
    "fossil": "Ancient remains or imprints of plants or animals preserved in rock for millions of years.",
    "frantically": "In a rushed, panicked way, as if there is no time to think.",
    "harmful": "Causing damage or injury; bad for health or safety.",
    "haunted": "Thought to be visited by spirits; scary because of strange happenings.",
    "legend": "An old story passed down for generations, often about heroes, magic, or great events.",
    "muster": "To gather courage, strength, or people together before facing something difficult.",
    "nervous": "Worried or uneasy about what might happen.",
    "relieved": "Glad because something frightening or difficult has ended or turned out well.",
    "scales": "Small, flat, hard plates on the skin of fish and reptiles that protect the body.",
    "shriek": "A loud, high, sharp cry, often from fear or surprise.",
    "slobbery": "Wet and messy with drool.",
    "spooky": "Strange and creepy in a fun or frightening way, like a tale told on a dark night.",
    "stunning": "Extremely beautiful or impressive; breathtaking.",
    "suspicious": "Feeling that something is wrong, dishonest, or not trustworthy.",
    "tame": "Gentle and used to humans; not wild.",
    "threatening": "Giving a warning that harm may come; menacing.",
    "underworld": "In myths, the land of the dead or spirits beneath the earth.",
    "vanish": "To go out of sight suddenly so you cannot be seen or found.",
    "wrecked": "Badly damaged or destroyed.",
    "hypothesis": "A testable idea or educated guess that scientists check with experiments and evidence.",
    "accurate": "Correct and exact, without mistakes; measurements or records match what is truly true.",
    "observation": "Careful watching and noting of what happens, using senses or tools to gather facts.",
    "temporary": "Lasting for only a short time; not permanent.",
    "theory": "A well-tested scientific explanation that fits many results from experiments and repeated studies.",
    "volume": "The amount of three-dimensional space something takes up, such as how much a box or tank can hold.",
    "elastic": "Able to stretch and then return to its original shape when the pulling force is removed.",
    "rubber": "A flexible material that bends easily and is often used for bands, tires, and waterproof coats.",
    "contract": "To become smaller or tighter, often when cooled or when a material is squeezed.",
    "expand": "To become larger or spread out, often when heated or when pressure decreases.",
    "evaporate": "To change from a liquid into a gas, such as when water turns into vapour in the air.",
    "condense": "To change from a gas into a liquid, such as when vapour forms droplets on a cold surface.",
    "shattering": "Breaking suddenly into many sharp pieces, often with a loud crash.",
    "decaying": "Breaking down or rotting slowly over time as living material is broken down by bacteria or fungi.",
    "rusting": "Forming reddish-brown flakes on iron or steel when metal reacts with oxygen and moisture over time.",
    "limitation": "A restriction or weak point that sets how far something can go or what it cannot do.",
    "excessive": "More than is needed, safe, or reasonable; too much.",
    "consist of": "To be made up of particular parts or ingredients that together form a whole.",
    "component": "A part that combines with others to make a machine, system, or structure work.",
    "appliance": "A powered machine used at home for jobs such as cooking, cleaning, or cooling food.",
    "insulation": "Material or design that reduces how much heat, sound, or electricity passes through.",
    "copper": "A reddish-brown metal that carries electricity and heat well; used in wires and pipes.",
    "kettle": "A container used to heat water, often with a handle, spout, and lid for pouring.",
    "conductivity": "A measure of how well a material allows heat or electricity to pass through it.",
    "enhance": "To improve something or make it stronger, clearer, or more effective.",
    "property": "A quality or feature of a material, such as hardness, flexibility, or melting point.",
    "composition": "What something is made from; the different parts or ingredients combined in a material or mixture.",
    "substance": "A particular kind of matter with uniform properties, such as water, salt, or oxygen gas.",
    "dough": "A thick, soft mixture of flour and liquid used for baking before it is cooked in an oven.",
    "grind": "To crush or rub something into small pieces or powder, often with a tool or machine.",
    "phenomena": "Observable events in nature that can be studied, such as lightning, tides, or rust on metal.",
    "split": "To divide or break apart into two or more parts.",
    "resistance": "Opposition to electric current in a wire, or opposition to movement through a material.",
    "barrel": "A large, rounded container, often made of wood or metal, used to store or transport liquids or goods.",
    "alley": "A narrow passage or street between or behind buildings.",
    "coarse": "Rough in texture, with large grains or pieces rather than smooth and fine.",
}

# Extra roots that give away answers in Level 1 matching (module peers).
EXTRA_FORBIDDEN = {
    "affect": ["effect"],
    "effect": ["affect"],
    "emergent": ["understory", "canopy layer"],
    "understory": ["emergent", "canopy floor"],
    "ferocious": ["fierce", "fiercely"],
    "fierce": ["ferocious"],
    "insect": ["grasshopper", "earthworm"],
    "grasshopper": ["insect", "hopper"],
    "earthworm": ["worm"],
    "poisonous": ["poison", "toxic"],
    "climate change": ["climate", "warming planet"],
    "carbon footprint": ["footprint", "carbon"],
    "greenhouse gas": ["greenhouse"],
    "storm-proof": ["storm proof", "stormproof"],
    "fawn over": ["fawn", "flatter"],
    "haunted": ["haunt"],
    "spooky": ["spook"],
    "threatening": ["threat"],
    "harmful": ["harm"],
    "wrecked": ["wreck"],
    "vanish": [],
    "muster": ["must"],
    "sustain": ["sustainable"],
    "marine": ["sea life"],
    "rescue": ["rescuer"],
    "survivor": ["survive"],
    "drought": ["rainfall"],
    "destructive": ["destroy"],
    "damage": ["damaged"],
    "dangerous": ["danger"],
    "suspicious": ["suspect"],
    "relieved": ["relief"],
    "nervous": ["nerve"],
    "confused": ["confuse"],
    "excited": ["excitement"],
    "frantically": ["frantic"],
    "stunning": ["stun"],
    "legend": ["legendary"],
    "creature": ["create"],
    "fossil": ["fossilized"],
    "scales": ["scaled"],
    "armoured": ["armour", "armor"],
    "bellow": ["bellowing"],
    "shriek": ["shrieking"],
    "slobbery": ["slobber"],
    "underworld": ["under world"],
    "cosy": ["cozy"],
    "tame": ["tamed"],
    "hypothesis": ["theory"],
    "theory": ["hypothesis"],
    "expand": ["contract"],
    "contract": ["expand"],
    "evaporate": ["condense"],
    "condense": ["evaporate"],
    "volume": ["loud", "sound", "audio", "noise"],
    "elastic": ["rubber"],
    "rubber": ["elastic"],
    "observation": ["observe"],
    "accurate": ["accuracy"],
    "temporary": ["temporarily"],
    "shattering": ["shatter"],
    "decaying": ["decay"],
    "rusting": ["rust"],
    "limitation": ["limit"],
    "excessive": ["excess"],
    "consist of": ["consist", "consists", "composed of"],
    "component": ["components"],
    "appliance": ["appliances"],
    "insulation": ["insulate", "insulator"],
    "copper": ["coppery"],
    "kettle": ["kettles"],
    "conductivity": ["conduct", "conductor", "conductive"],
    "enhance": ["enhancement", "enhanced"],
    "property": ["house", "land", "estate", "real estate", "ownership", "building"],
    "composition": ["compose", "composed"],
    "substance": ["substances"],
    "phenomena": ["phenomenon"],
    "resistance": ["resist", "resistant", "resistor"],
    "split": ["splitting", "splits"],
    "grind": ["grinding", "grinder"],
    "coarse": ["coarsely", "coarseness"],
    "dough": ["doughy"],
    "barrel": ["barrels"],
    "alley": ["alleys"],
}


def _tokens(word: str) -> list[str]:
    return [t for t in word.lower().replace("-", " ").replace("‑", " ").split() if t]


def validate_explanation(word: str, text: str) -> None:
    lower = text.lower()
    forbidden = set(_tokens(word))
    forbidden.update(EXTRA_FORBIDDEN.get(word, []))
    for token in forbidden:
        if len(token) < 4 and token not in ("harm", "tame", "cosy", "gust"):
            continue
        if token in lower:
            raise ValueError(f'Explanation for "{word}" must not contain "{token}": {text}')
    # Short roots for selected words
    short = {"harm": ["harmful"], "tame": ["tame"], "gust": ["gust"]}
    for root, words in short.items():
        if word in words and root in lower:
            raise ValueError(f'Explanation for "{word}" must not contain "{root}"')


PACK = {
    "version": 1,
    "ageRange": "10-12",
    "picturePolicy": "cartoon for mood/scary words; photo or diagram otherwise",
    "modules": [
        {
            "id": 1,
            "name": "Module 1 — Nature & living things",
            "words": [],
        },
        {
            "id": 2,
            "name": "Module 2 — Climate & environment",
            "words": [],
        },
        {
            "id": 3,
            "name": "Module 3 — Story, creatures & mood",
            "words": [],
        },
        {
            "id": 4,
            "name": "Module 4 — Science & matter",
            "words": [],
        },
    ],
}

# --- Module 1 ---
M1_D = {
    "affect": ["effect", "sustain", "underground"],
    "earthworm": ["grasshopper", "insect", "mammal"],
    "effect": ["affect", "poisonous", "emergent"],
    "emergent": ["understory", "underground", "insect"],
    "ferocious": ["poisonous", "mammal", "trek"],
    "grasshopper": ["earthworm", "insect", "emergent"],
    "insect": ["mammal", "grasshopper", "poisonous"],
    "mammal": ["insect", "earthworm", "ferocious"],
    "poisonous": ["ferocious", "sustain", "effect"],
    "sustain": ["affect", "underground", "trek"],
    "trek": ["underground", "emergent", "sustain"],
    "underground": ["understory", "earthworm", "trek"],
    "understory": ["emergent", "underground", "insect"],
}

M1 = [
    (
        "affect",
        "To change or influence something. When one thing happens, it can affect how something else turns out.",
        "cause effect diagram education cartoon",
        "diagram",
        [
            (
                "After weeks of dry weather, the lack of rain began to ___ the growth of the vegetables our class had planted behind the science building.",
                "affect",
            ),
            (
                "The biologist explained that even small changes in river temperature can ___ which fish species survive during the hottest months of the year.",
                "affect",
            ),
            (
                "Pollution from the old factory did not only harm the air; it began to ___ the health of trees miles away from the smokestacks.",
                "affect",
            ),
            (
                "When invasive plants spread across the field, they can ___ native wildflowers by stealing sunlight, water, and space in the soil.",
                "affect",
            ),
        ],
    ),
    (
        "earthworm",
        "A long, soft-bodied animal that lives in soil. Earthworms help air and water move through the ground.",
        "earthworm soil cross section cartoon",
        "cartoon",
        [
            (
                "During our outdoor lab, we gently lifted a log and watched a pink ___ slide between damp crumbs of earth and tiny white roots.",
                "earthworm",
            ),
            (
                "The gardener explained that a healthy ___ tunnel network keeps soil loose so plant roots can breathe and absorb rainwater.",
                "earthworm",
            ),
            (
                "After the storm soaked the playground garden, students counted five ___ in one shovel of mud, wriggling toward the cooler depths.",
                "earthworm",
            ),
            (
                "Without creatures like the humble ___, fallen leaves might pile up and the ground below would become hard and difficult for roots to penetrate.",
                "earthworm",
            ),
        ],
    ),
    (
        "effect",
        "A result or outcome caused by something else. If you drop a book, the loud noise is an effect of it hitting the floor.",
        "domino effect simple illustration cartoon",
        "diagram",
        [
            (
                "The teacher warned that litter near storm drains can have a harmful ___ on fish and plants living downstream in the river.",
                "effect",
            ),
            (
                "Scientists studied the ___ of wildfire smoke on lungs by comparing air-quality reports from cities hundreds of miles apart.",
                "effect",
            ),
            (
                "Planting trees along the bank had a positive ___ on erosion, because roots held the soil when fast spring meltwater rushed past.",
                "effect",
            ),
            (
                "One surprising ___ of the long drought was that usually shy animals appeared near houses, searching for water and shade.",
                "effect",
            ),
        ],
    ),
    (
        "emergent",
        "The top layer of a rainforest, where the tallest trees rise above the main canopy into bright sun and strong wind.",
        "rainforest emergent layer cartoon birds",
        "cartoon",
        [
            (
                "From the trail far below, we could barely see eagle nests in the ___ layer, where the tallest trees break through the roof of leaves.",
                "emergent",
            ),
            (
                "Only certain birds and bats thrive in the ___ zone, because branches are thin and winds can knock animals off if they are clumsy.",
                "emergent",
            ),
            (
                "Our guide pointed upward to the ___ treetops that catch full sunlight and the first heavy rain during tropical thunderstorms.",
                "emergent",
            ),
            (
                "Seeds scattered by wind from the ___ layer can travel long distances before landing in distant forests or open fields.",
                "emergent",
            ),
        ],
    ),
    (
        "ferocious",
        "Very fierce, violent, or aggressive. A ferocious animal or storm seems frightening and powerful.",
        "ferocious cartoon lion adventure",
        "cartoon",
        [
            (
                "The nature film showed a ___ mother bear chasing intruders away from her cubs, splashing through the river without slowing down.",
                "ferocious",
            ),
            (
                "Although the cartoon dragon looked ___ when it roared, the story later revealed it only wanted to protect its hidden nest.",
                "ferocious",
            ),
            (
                "During the night, a ___ gust tore branches loose and scattered them across the road before the cleanup crew arrived at dawn.",
                "ferocious",
            ),
            (
                "Even a normally calm guard dog can become ___ if strangers step too close to the fence where puppies are sleeping.",
                "ferocious",
            ),
        ],
    ),
    (
        "grasshopper",
        "An insect with long back legs for jumping and strong jaws for chewing plants. Grasshoppers often live in grasslands and fields.",
        "grasshopper on leaf cartoon",
        "cartoon",
        [
            (
                "While we measured plants in the meadow, a bright green ___ launched from a blade of grass and vanished with a dry clicking sound.",
                "grasshopper",
            ),
            (
                "Under the magnifying glass, the ___ slowly opened its hind wings, revealing patterns that helped it disappear among dry stalks.",
                "grasshopper",
            ),
            (
                "Farmers sometimes worry when a swarm of ___ eats young shoots, because thousands of hungry insects can strip a field in days.",
                "grasshopper",
            ),
            (
                "Our journal entry described how the ___ chewed a neat edge on the leaf, leaving tiny tooth marks we sketched beside the photo.",
                "grasshopper",
            ),
        ],
    ),
    (
        "insect",
        "A small animal with six legs, three body parts, and often wings. Ants, bees, and beetles are insects.",
        "insect anatomy educational cartoon",
        "cartoon",
        [
            (
                "Before we released it, we sketched the ___ carefully, counting six legs and watching its antennae twitch in the sunlit jar.",
                "insect",
            ),
            (
                "Not every tiny crawler is an ___; the teacher reminded us that spiders have eight legs and belong to a different group.",
                "insect",
            ),
            (
                "A single ___ drifting across the classroom window sparked a discussion about pollination and how crops depend on these visitors.",
                "insect",
            ),
            (
                "During the pond field trip, we trapped a water ___ in a tray and observed how it rowed across the surface with oar-like legs.",
                "insect",
            ),
        ],
    ),
    (
        "mammal",
        "An animal that has hair or fur and feeds milk to its young. Dogs, whales, and humans are mammals.",
        "mammals educational collage cartoon",
        "cartoon",
        [
            (
                "Although it lays eggs, the platypus is still a ___ because it has fur and nurses its babies with milk from its mother.",
                "mammal",
            ),
            (
                "The whale surfaced quietly, and our guide explained that every ___ must breathe air, even when it spends life in salt water.",
                "mammal",
            ),
            (
                "We compared a bat skeleton with a mouse and learned that both are classified as ___ because of shared features like jaw bones.",
                "mammal",
            ),
            (
                "On the trail camera footage, a shy nocturnal ___ sniffed the bait, its eyes glowing before it disappeared into the pine forest.",
                "mammal",
            ),
        ],
    ),
    (
        "poisonous",
        "Containing poison; harmful or deadly if eaten, touched, or bitten. Poisonous animals or plants can make you sick.",
        "poison dart frog cartoon rainforest",
        "cartoon",
        [
            (
                "The ranger warned us never to touch the bright frog, because its skin is ___ and could cause serious illness if rubbed near your mouth.",
                "poisonous",
            ),
            (
                "Some berries look delicious but are ___; our field guide showed pictures of safe fruits and dangerous ones side by side.",
                "poisonous",
            ),
            (
                "Certain mushrooms are so ___ that even a small bite can send someone to the hospital, which is why foragers must study them carefully.",
                "poisonous",
            ),
            (
                "The sign beside the reef exhibit explained that the lionfish has ___ spines, so divers must keep a respectful distance.",
                "poisonous",
            ),
        ],
    ),
    (
        "sustain",
        "To keep something going over time; to support life or health so it continues.",
        "sustainable ecosystem diagram cartoon",
        "diagram",
        [
            (
                "A healthy wetland needs many connected species to ___ the food web, from tiny algae to fish and wading birds along the shore.",
                "sustain",
            ),
            (
                "Farmers rotate crops because planting the same crop every year can exhaust minerals needed to ___ fertile soil for future harvests.",
                "sustain",
            ),
            (
                "Clean river water helps ___ trout populations, giving them gravel beds and insects to eat throughout long cold winters.",
                "sustain",
            ),
            (
                "The community garden project hoped to ___ neighborhood interest by inviting families to harvest herbs and share recipes together.",
                "sustain",
            ),
        ],
    ),
    (
        "trek",
        "A long, difficult journey, especially on foot through wild or rough country.",
        "hikers mountain trek cartoon",
        "cartoon",
        [
            (
                "Our family planned a three-day ___ through the hills, carrying maps and extra water because the trail would be steep and remote.",
                "trek",
            ),
            (
                "During the museum exhibit, we followed a simulated ___ across desert dunes, reading diary entries from explorers a century ago.",
                "trek",
            ),
            (
                "The scouts prepared carefully for their overnight ___ , checking boots and rain jackets before heading into the pine forest.",
                "trek",
            ),
            (
                "What began as a short walk became a tiring ___ when the bridge washed out and we had to circle the canyon rim to return.",
                "trek",
            ),
        ],
    ),
    (
        "underground",
        "Beneath the surface of the ground. Underground tunnels, roots, and animals live out of sight below our feet.",
        "underground burrow cross section cartoon",
        "cartoon",
        [
            (
                "The naturalist showed diagrams of mole tunnels running ___, where the animals hunt worms in darkness beneath the soccer field.",
                "underground",
            ),
            (
                "Tree roots spread ___ for meters, anchoring trunks and soaking up water that later rises through tubes inside the bark.",
                "underground",
            ),
            (
                "Engineers bored ___ pipes to carry clean water into the city, marking each section on maps so repair crews could find leaks.",
                "underground",
            ),
            (
                "Fossil hunters explained that some bones remain buried ___ for millions of years until erosion or construction exposes them.",
                "underground",
            ),
        ],
    ),
    (
        "understory",
        "The middle layer of a forest, below the canopy but above the ground, with smaller trees, shrubs, and shade.",
        "rainforest understory layer cartoon",
        "cartoon",
        [
            (
                "In the dim ___ of the rainforest, ferns and orchids grow in humid shade while birds call softly beneath the thick ceiling of leaves.",
                "understory",
            ),
            (
                "Jaguars sometimes hunt in the ___ because prey move quietly there, hidden from the bright sun that burns above the canopy.",
                "understory",
            ),
            (
                "Our field guide listed plants of the ___ layer, including saplings waiting for a fallen tree to open a patch of sunlight.",
                "understory",
            ),
            (
                "Light meters proved the ___ receives only a fraction of noon brightness, which is why leaves there are often broad and dark green.",
                "understory",
            ),
        ],
    ),
]

# --- Module 2 ---
M2_D = {
    "carbon footprint": ["greenhouse gas", "climate change", "resource"],
    "climate change": ["drought", "marine", "destructive"],
    "damage": ["drought", "rescue", "prone"],
    "dangerous": ["destructive", "gust", "survivor"],
    "destructive": ["dangerous", "damage", "drought"],
    "drought": ["frequent", "marine", "rescue"],
    "frequent": ["prone", "gust", "marine"],
    "greenhouse gas": ["carbon footprint", "climate change", "resource"],
    "gust": ["storm-proof", "drought", "marine"],
    "marine": ["resource", "survivor", "rescue"],
    "prone": ["frequent", "dangerous", "damage"],
    "rescue": ["survivor", "resource", "damage"],
    "resource": ["marine", "greenhouse gas", "rescue"],
    "storm-proof": ["destructive", "gust", "prone"],
    "survivor": ["rescue", "marine", "dangerous"],
}

M2 = [
    (
        "carbon footprint",
        "The total amount of greenhouse gases your actions produce, such as from travel, electricity, and what you buy.",
        "carbon footprint infographic cartoon kids",
        "cartoon",
        [
            (
                "Our class calculated how bus rides, plastic snacks, and leftover food add to each student's ___ before brainstorming changes at home.",
                "carbon footprint",
            ),
            (
                "The speaker compared the ___ of flying across the country with taking a train, using simple bars on a slide everyone could read.",
                "carbon footprint",
            ),
            (
                "Choosing local vegetables can shrink your family's ___ because less fuel is burned to refrigerate and truck produce long distances.",
                "carbon footprint",
            ),
            (
                "The worksheet asked us to list three habits that enlarge our ___ and three that reduce it over a typical school week.",
                "carbon footprint",
            ),
        ],
    ),
    (
        "climate change",
        "Long-term changes in Earth's weather patterns and average temperature, largely caused by human activities and greenhouse gases.",
        "climate change earth cartoon education",
        "cartoon",
        [
            (
                "Scientists explained that ___ can shift rainfall patterns, melt glaciers, and make certain heat waves more common than they were decades ago.",
                "climate change",
            ),
            (
                "The documentary showed how ___ affects polar bears, coral reefs, and farmers who depend on snowmelt arriving at predictable times each spring.",
                "climate change",
            ),
            (
                "Communities near the coast are planning sea walls because ___ raises ocean levels and pushes storm surges farther inland during hurricanes.",
                "climate change",
            ),
            (
                "Our debate club researched policies that could slow ___ by using cleaner energy and wasting less electricity in schools and homes.",
                "climate change",
            ),
        ],
    ),
    (
        "damage",
        "Harm or injury that makes something worse or broken. Storms and pollution can cause damage to buildings, land, or habitats.",
        "storm damage cartoon house",
        "cartoon",
        [
            (
                "After the hurricane passed, volunteers recorded the ___ to roofs, trees, and power lines before cleanup crews arrived from neighboring towns.",
                "damage",
            ),
            (
                "Oil spills can ___ coastal marshes for years, harming birds that nest in grasses now coated with sticky black film.",
                "damage",
            ),
            (
                "The insurance inspector photographed hail ___ on cars in the parking lot, noting dented hoods and cracked windshields in her report.",
                "damage",
            ),
            (
                "Students learned that even small litter can ___ streams when chemicals wash off plastic and poison insects fish depend on for food.",
                "damage",
            ),
        ],
    ),
    (
        "dangerous",
        "Likely to cause harm or injury; not safe. Swimming in a flooded river can be dangerous.",
        "warning sign dangerous cartoon",
        "cartoon",
        [
            (
                "The news warned that driving through deep water on the highway is ___ because you cannot see holes or measure how fast currents pull.",
                "dangerous",
            ),
            (
                "Touching downed power lines after a storm is extremely ___ , so our teacher told us to stay far away and call adults immediately.",
                "dangerous",
            ),
            (
                "Climbing unstable cliffs without ropes is ___ , especially after rain loosens rocks that can slide without warning.",
                "dangerous",
            ),
            (
                "Mixing certain cleaning chemicals at home can create ___ fumes, which is why labels say to ventilate rooms and never combine products.",
                "dangerous",
            ),
        ],
    ),
    (
        "destructive",
        "Causing great damage or ruin. A destructive fire or windstorm can destroy homes and forests.",
        "destructive wildfire cartoon aerial",
        "cartoon",
        [
            (
                "High winds overnight proved ___ to the old pier, tearing planks loose and scattering debris along the waterfront before sunrise.",
                "destructive",
            ),
            (
                "The invasive beetle can be ___ to ash trees, boring tunnels under bark until branches weaken and snap during storms.",
                "destructive",
            ),
            (
                "Lightning sparked a ___ blaze that jumped fire lines, forcing families to evacuate with pets and photo albums clutched in their arms.",
                "destructive",
            ),
            (
                "Hailstones the size of golf balls were ___ to greenhouse glass, shattering panels and exposing tender seedlings to cold rain.",
                "destructive",
            ),
        ],
    ),
    (
        "drought",
        "A long period with little or no rain, when rivers shrink and crops struggle to grow.",
        "drought cracked earth cartoon farm",
        "cartoon",
        [
            (
                "During the long summer ___ , the river behind our town shrank until stones showed above the surface and farmers hauled water for cattle.",
                "drought",
            ),
            (
                "Meteorologists said the region's ___ had lasted eleven months, breaking records for the lowest rainfall since measurements began.",
                "drought",
            ),
            (
                "The ___ stressed wildlife, pushing deer closer to roads as they searched for streams that had dried into cracked mud channels.",
                "drought",
            ),
            (
                "Because of the severe ___ , city officials banned lawn sprinklers and asked families to take shorter showers until reservoirs refilled.",
                "drought",
            ),
        ],
    ),
    (
        "frequent",
        "Happening often or many times. Frequent rain showers keep gardens green in some climates.",
        "frequent rainfall chart cartoon",
        "diagram",
        [
            (
                "In our region, ___ heat waves have become more common, so schools are updating plans for hot afternoons without air conditioning.",
                "frequent",
            ),
            (
                "___ power outages annoyed residents until crews trimmed trees away from lines that swayed during winter storms.",
                "frequent",
            ),
            (
                "Coastal towns face ___ flooding at high tide, which is why engineers raised some roads and added pumps near the harbor.",
                "frequent",
            ),
            (
                "Bird watchers noted ___ sightings of the rare heron this spring, suggesting the marsh restoration project might be working.",
                "frequent",
            ),
        ],
    ),
    (
        "greenhouse gas",
        "A gas in the atmosphere that traps heat, such as carbon dioxide from burning fuel. Too much warms the planet.",
        "greenhouse effect diagram cartoon",
        "diagram",
        [
            (
                "Cars and factories release ___ that build up in the atmosphere, acting like a blanket that holds heat close to Earth's surface.",
                "greenhouse gas",
            ),
            (
                "Methane is a powerful ___ produced by landfills and livestock, which is why scientists study ways to capture it before it escapes.",
                "greenhouse gas",
            ),
            (
                "The experiment helped us see how extra ___ can raise temperature inside a model greenhouse compared with normal air levels.",
                "greenhouse gas",
            ),
            (
                "Reducing ___ emissions from power plants is one strategy countries discuss when they meet to plan cleaner energy for the future.",
                "greenhouse gas",
            ),
        ],
    ),
    (
        "gust",
        "A sudden, strong blast of wind. A gust can knock over bikes or scatter leaves in seconds.",
        "wind gust trees cartoon",
        "cartoon",
        [
            (
                "While we crossed the bridge, a powerful ___ nearly pushed us sideways, whistling through railings and churning the river below.",
                "gust",
            ),
            (
                "A sudden ___ lifted the umbrella inside out and sent newspapers skittering across the plaza like startled birds.",
                "gust",
            ),
            (
                "Firefighters worried that each hot ___ might spread embers over the highway, igniting dry grass on the other side.",
                "gust",
            ),
            (
                "During the storm, a brief ___ rattled the windows, then vanished, leaving the wind chimes swinging in sudden quiet.",
                "gust",
            ),
        ],
    ),
    (
        "marine",
        "Related to the sea or ocean. Marine animals and plants live in salt water.",
        "marine life ocean reef cartoon",
        "cartoon",
        [
            (
                "The museum exhibit explained how ___ ecosystems such as coral reefs protect coastlines and shelter thousands of species.",
                "marine",
            ),
            (
                "Oil spills threaten ___ birds that dive for fish, coating feathers so they cannot stay warm or dry in cold water.",
                "marine",
            ),
            (
                "Our research poster compared ___ algae blooms with healthy kelp forests, showing how pollution can upset ocean food webs.",
                "marine",
            ),
            (
                "The ___ biologist described tracking whales by listening to songs recorded underwater with microphones lowered from boats.",
                "marine",
            ),
        ],
    ),
    (
        "prone",
        "Likely to suffer from something or tend to behave a certain way. Prone to flooding means floods happen easily there.",
        "flood prone area map cartoon",
        "diagram",
        [
            (
                "Because the town sits in a low valley, it is especially ___ to flooding whenever heavy rain falls upstream and rivers rise quickly.",
                "prone",
            ),
            (
                "Dry hills without plants are ___ to mudslides after downpours, so residents learn evacuation routes before winter storms arrive.",
                "prone",
            ),
            (
                "Without sunscreen, fair skin is more ___ to burning during field day, even when clouds make the sky look deceptively cool.",
                "prone",
            ),
            (
                "Forests weakened by beetles are ___ to larger wildfires, which is why crews remove dead trees near power lines.",
                "prone",
            ),
        ],
    ),
    (
        "rescue",
        "To save someone or something from danger. Rescue teams help people trapped by storms or accidents.",
        "rescue boat storm cartoon",
        "cartoon",
        [
            (
                "Coast guard crews worked through the night to ___ sailors stranded on rocks after their engine failed in pounding surf.",
                "rescue",
            ),
            (
                "Volunteers formed a chain to ___ dogs left on rooftops when floodwater surrounded houses during the sudden river surge.",
                "rescue",
            ),
            (
                "Firefighters planned how to ___ hikers lost in fog, using radios and thermal cameras while relatives waited at the trailhead.",
                "rescue",
            ),
            (
                "Wildlife workers tried to ___ seabirds covered in oil, gently washing feathers so the birds could float and fly again.",
                "rescue",
            ),
        ],
    ),
    (
        "resource",
        "Something useful that people or nature need, such as water, timber, or fish. Resources can be limited and must be managed.",
        "natural resources water forest cartoon",
        "cartoon",
        [
            (
                "Clean freshwater is a precious ___ that entire communities depend on for drinking, farming, and factories, so wasting it harms everyone.",
                "resource",
            ),
            (
                "The committee debated how to share forest ___ without cutting so many trees that animals lose nesting sites and shade.",
                "resource",
            ),
            (
                "Solar panels turn sunlight into a renewable ___ , reducing the need to burn coal for electricity during hot afternoons.",
                "resource",
            ),
            (
                "Overfishing can drain an ocean ___ faster than populations recover, which is why limits protect breeding seasons for cod and tuna.",
                "resource",
            ),
        ],
    ),
    (
        "storm-proof",
        "Built or designed to withstand severe storms. Storm-proof houses have strong roofs and windows.",
        "hurricane proof house cartoon",
        "cartoon",
        [
            (
                "Engineers showed photos of ___ windows and reinforced roofs that stayed intact while older buildings nearby lost shingles and glass.",
                "storm-proof",
            ),
            (
                "The new school was designed to be ___ , with deep anchors and doors that seal against driving rain during coastal hurricanes.",
                "storm-proof",
            ),
            (
                "Families stored supplies in a ___ shed, bolting it to concrete so winds could not tip it during the worst gusts.",
                "storm-proof",
            ),
            (
                "Building codes now require ___ features along the coast, including straps that tie walls to foundations when cyclones approach.",
                "storm-proof",
            ),
        ],
    ),
    (
        "survivor",
        "A person or animal that stays alive after an accident, disaster, or dangerous event.",
        "disaster survivor rescue cartoon",
        "cartoon",
        [
            (
                "After the earthquake, each ___ who walked out of the collapsed building was checked by medics and given water and blankets.",
                "survivor",
            ),
            (
                "The lone ___ of the shipwreck told reporters how life jackets and calm thinking kept him afloat until helicopters arrived.",
                "survivor",
            ),
            (
                "Scientists studied forest fire ___ trees to learn which species resist heat and can seed new growth after charred soil cools.",
                "survivor",
            ),
            (
                "The documentary honored a Holocaust ___ who visited schools, reminding students how courage and kindness matter during dark times.",
                "survivor",
            ),
        ],
    ),
]

# --- Module 3 ---
M3_D = {
    "armoured": ["scales", "fierce", "fossil"],
    "bellow": ["shriek", "frantically", "fierce"],
    "confused": ["nervous", "suspicious", "relieved"],
    "cosy": ["creature", "haunted", "stunning"],
    "creature": ["fawn over", "fossil", "tame"],
    "excited": ["nervous", "relieved", "frantically"],
    "fawn over": ["muster", "vanish", "tame"],
    "fierce": ["threatening", "armoured", "bellow"],
    "fossil": ["creature", "legend", "wrecked"],
    "frantically": ["excited", "nervous", "shriek"],
    "harmful": ["spooky", "threatening", "suspicious"],
    "haunted": ["spooky", "underworld", "legend"],
    "legend": ["fossil", "creature", "muster"],
    "muster": ["legend", "relieved", "vanish"],
    "nervous": ["excited", "confused", "suspicious"],
    "relieved": ["excited", "cosy", "confused"],
    "scales": ["armoured", "slobbery", "stunning"],
    "shriek": ["bellow", "spooky", "frantically"],
    "slobbery": ["cosy", "tame", "creature"],
    "spooky": ["haunted", "suspicious", "underworld"],
    "stunning": ["cosy", "relieved", "wrecked"],
    "suspicious": ["confused", "nervous", "harmful"],
    "tame": ["fierce", "creature", "threatening"],
    "threatening": ["fierce", "harmful", "haunted"],
    "underworld": ["haunted", "legend", "vanish"],
    "vanish": ["frantically", "creature", "muster"],
    "wrecked": ["harmful", "stunning", "fossil"],
}

M3 = [
    (
        "armoured",
        "Protected by armour or hard covering, like metal plates or thick scales.",
        "knight armoured cartoon adventure",
        "cartoon",
        [
            (
                "The knight remained ___ even after the bridge battle, because metal plates covered his shoulders, chest, and legs from sword blows.",
                "armoured",
            ),
            (
                "Certain beetles look ___ thanks to hard wing cases that click open when they spread hidden wings and lift into the air.",
                "armoured",
            ),
            (
                "The tank model in the museum was heavily ___ , with angled plates designed to deflect blasts away from the crew compartment.",
                "armoured",
            ),
            (
                "Deep-sea fish sometimes seem ___ , with thick scales and bony plates that help them survive crushing pressure in dark trenches.",
                "armoured",
            ),
        ],
    ),
    (
        "bellow",
        "To shout or roar deeply and loudly, like an angry bull or a furious giant.",
        "bull bellow cartoon farm",
        "cartoon",
        [
            (
                "From the cave mouth, we heard the dragon ___ so loudly that pebbles rattled down the slope and birds burst from the trees.",
                "bellow",
            ),
            (
                "The coach did not whisper; he began to ___ instructions across the windy field so every player could hear the new plan.",
                "bellow",
            ),
            (
                "During the thunderstorm, it sounded as if the sky itself would ___ , rumbling for seconds after each flash lit the clouds.",
                "bellow",
            ),
            (
                "Angry about the broken fence, the farmer let out a ___ that made the stray dogs scatter toward the dirt road.",
                "bellow",
            ),
        ],
    ),
    (
        "confused",
        "Unable to think clearly; unsure what is happening or what to do.",
        "confused student thinking cartoon",
        "cartoon",
        [
            (
                "After waking in the strange room with flickering candles, Maya felt ___ about where she was and how she had arrived during the night.",
                "confused",
            ),
            (
                "The new schedule left everyone ___ until the principal posted a chart explaining which classes move to which rooms on Fridays.",
                "confused",
            ),
            (
                "Twisting hallways in the old hotel made us ___ , because identical paintings appeared on every floor beneath the dim lights.",
                "confused",
            ),
            (
                "Without his glasses, Leo was ___ by the blurry board, squinting and copying notes from a neighbor until the teacher noticed.",
                "confused",
            ),
        ],
    ),
    (
        "cosy",
        "Warm, comfortable, and pleasant—often small and safe, like a cosy cabin in winter.",
        "cosy cabin fireplace cartoon",
        "cartoon",
        [
            (
                "We dragged blankets to the fireplace and built a ___ nest of pillows where we could read while wind scratched at the windows.",
                "cosy",
            ),
            (
                "The tiny bookshop felt ___ on rainy afternoons, with yellow lamps, soft chairs, and the smell of paper warming near the heater.",
                "cosy",
            ),
            (
                "After sledding, we returned to the ___ kitchen where cocoa steamed on the stove and wet mittens hung over the radiator.",
                "cosy",
            ),
            (
                "Even the treehouse seemed ___ once we hung fairy lights and laid down rugs, turning planks into a hideout from autumn drizzle.",
                "cosy",
            ),
        ],
    ),
    (
        "creature",
        "A living being, often strange or imaginary. Stories describe creatures such as dragons or forest spirits.",
        "fantasy creature cartoon friendly",
        "cartoon",
        [
            (
                "Legends say a shy ___ leaves glowing footprints in the marsh, vanishing whenever lanterns swing too close to the reeds.",
                "creature",
            ),
            (
                "The diver filmed a deep-sea ___ with transparent fins, drifting like a ribbon through water darker than a moonless night.",
                "creature",
            ),
            (
                "In the puppet show, the forest ___ spoke gently, asking children to plant seeds instead of cutting down ancient oaks.",
                "creature",
            ),
            (
                "Biologists argued whether the lake ___ was real or rumor, setting underwater cameras that clicked every few seconds in the cold.",
                "creature",
            ),
        ],
    ),
    (
        "excited",
        "Feeling very happy and eager about something that is going to happen.",
        "excited kids cartoon party",
        "cartoon",
        [
            (
                "The cousins were so ___ about the midnight treasure hunt that they could not eat dinner and kept checking the map on the porch.",
                "excited",
            ),
            (
                "Before the science fair, Nina felt ___ , pacing beside her volcano model and rehearsing how magma pressure builds underground.",
                "excited",
            ),
            (
                "Fans grew ___ when the band's bus turned the corner, waving homemade signs that fluttered in the evening breeze.",
                "excited",
            ),
            (
                "Even the usually quiet librarian seemed ___ to open the new fantasy wing, unlocking shelves wrapped in paper and ribbon.",
                "excited",
            ),
        ],
    ),
    (
        "fawn over",
        "To praise or flatter someone too eagerly, often in an exaggerated way that seems insincere.",
        "fans fawn over celebrity cartoon humorous",
        "cartoon",
        [
            (
                "It felt awkward to watch the crowd ___ the magician after the show, as if he had saved the town instead of doing card tricks.",
                "fawn over",
            ),
            (
                "Try not to ___ the team captain only because she scored once; defenders worked just as hard during the second half in the rain.",
                "fawn over",
            ),
            (
                "Social media makes it easy to ___ influencers, leaving hundreds of identical compliments beneath photos that took minutes to edit.",
                "fawn over",
            ),
            (
                "The stern coach told parents not to ___ young athletes after every pass, because honest feedback helps players improve their skills.",
                "fawn over",
            ),
        ],
    ),
    (
        "fierce",
        "Showing strong, wild anger or power; frighteningly intense.",
        "fierce wolf cartoon snow adventure",
        "cartoon",
        [
            (
                "The wolf's ___ stare made the campers step back slowly, realizing the animal would defend its territory if they approached closer.",
                "fierce",
            ),
            (
                "A ___ storm rattled the shutters all night, tearing shingles away and flinging garden chairs across the muddy yard.",
                "fierce",
            ),
            (
                "Despite her ___ expression during the debate, Sofia later apologized and explained she had felt cornered by the surprising question.",
                "fierce",
            ),
            (
                "Competition grew ___ as the final minutes ticked down, with both teams diving for the ball in clouds of dust and shouted names.",
                "fierce",
            ),
        ],
    ),
    (
        "fossil",
        "The hardened remains or imprint of a plant or animal from long ago, preserved in rock.",
        "dinosaur fossil museum cartoon",
        "cartoon",
        [
            (
                "In the museum hall, our guide pointed to a ___ of a fish pressed into stone, millions of years older than the nearby mountains.",
                "fossil",
            ),
            (
                "The child brushed sand away from a tiny ___ tooth, while the paleontologist explained how sediment slowly turned bone to stone.",
                "fossil",
            ),
            (
                "Coal and oil formed from ancient life, but a visible ___ in cliff rock lets you touch the ripple of a forgotten lakebed.",
                "fossil",
            ),
            (
                "Using casts of a dinosaur ___ , the class compared hip bones to birds, discussing evidence that some reptiles had feathers.",
                "fossil",
            ),
        ],
    ),
    (
        "frantically",
        "In a wild, rushed, panicked way, as if there is no time to think.",
        "frantically packing cartoon suitcase",
        "cartoon",
        [
            (
                "When the alarm bells rang, students ran ___ down the corridor, clutching coats because they thought the drill might be a real fire.",
                "frantically",
            ),
            (
                "Before the bus left, Miguel searched ___ through his backpack for the permission slip he had printed the night before.",
                "frantically",
            ),
            (
                "The squirrel dug ___ for the acorn it had buried, kicking leaves into the air as dogs barked on the other side of the fence.",
                "frantically",
            ),
            (
                "During the blackout, Mom waved ___ for candles in the junk drawer, laughing when the flashlight finally clicked on under notebooks.",
                "frantically",
            ),
        ],
    ),
    (
        "harmful",
        "Causing damage or injury; bad for health or safety.",
        "harmful pollution sign cartoon",
        "cartoon",
        [
            (
                "The spell book warned that certain herbs become ___ if mixed wrongly, producing smoke that stings eyes and makes breathing difficult.",
                "harmful",
            ),
            (
                "Spreading rumors can be ___ to classmates, hurting feelings long after the original joke seemed funny in a group chat.",
                "harmful",
            ),
            (
                "Ultraviolet rays are ___ without sunscreen, so the nurse reminded us to wear hats during the outdoor science fair in June.",
                "harmful",
            ),
            (
                "Invasive plants may look pretty, but they can be ___ to native flowers by crowding roots and stealing light beside the trail.",
                "harmful",
            ),
        ],
    ),
    (
        "haunted",
        "Believed to be visited by ghosts or spirits; scary because of strange happenings.",
        "haunted house cartoon mild fog",
        "cartoon",
        [
            (
                "Villagers avoided the ___ mill after dark, swearing they heard footsteps on empty floors and whispers in the broken grain chutes.",
                "haunted",
            ),
            (
                "The story described a ___ lighthouse where lights flicker even when generators have been silent for years along the cliff.",
                "haunted",
            ),
            (
                "On Halloween, we toured a ___ house with cartoon ghosts that popped out of barrels, making little kids laugh instead of cry.",
                "haunted",
            ),
            (
                "Some guests claimed the inn was ___ because doors latched themselves, though the owner blamed drafts from the old stone chimney.",
                "haunted",
            ),
        ],
    ),
    (
        "legend",
        "An old story passed down for generations, often about heroes, monsters, or magic.",
        "legend myth book cartoon",
        "cartoon",
        [
            (
                "According to the mountain ___, a silver wolf once guided lost travelers through the blizzard to the hidden valley behind the glacier.",
                "legend",
            ),
            (
                "The fishing ___ explains why the river bends, teaching children to respect promises made to strangers at twilight.",
                "legend",
            ),
            (
                "Historians separated fact from ___ , showing which details appeared only in songs written centuries after the battle.",
                "legend",
            ),
            (
                "Every culture shares a ___ about how the stars formed, turning ordinary constellations into maps of ancient heroes and animals.",
                "legend",
            ),
        ],
    ),
    (
        "muster",
        "To gather together courage, strength, or people, especially before something difficult.",
        "muster courage cartoon knight",
        "cartoon",
        [
            (
                "Before stepping onto the stage, Jonah tried to ___ enough courage to speak the first line without staring at his shoes.",
                "muster",
            ),
            (
                "She had to ___ her nerve before opening the attic door, remembering spooky stories her brother told at bedtime last summer.",
                "muster",
            ),
            (
                "The captain tried to ___ volunteers to repair the sail in pounding rain, promising hot soup when the crew reached harbor.",
                "muster",
            ),
            (
                "Facing the giant footprint in the garden, the friends ___ their bravery and decided to follow it with notebooks and a camera.",
                "muster",
            ),
        ],
    ),
    (
        "nervous",
        "Worried or afraid about what might happen; feeling uneasy in your stomach.",
        "nervous before presentation cartoon",
        "cartoon",
        [
            (
                "Liam felt ___ before the school play, pacing backstage and repeating lines because the auditorium was packed with parents and teachers.",
                "nervous",
            ),
            (
                "The puppy seemed ___ around thunder, hiding under the bed and trembling until its owner sat nearby with a calm voice.",
                "nervous",
            ),
            (
                "I always get ___ before spelling bees, even when I studied, because the bright lights make the letters swim on the placard.",
                "nervous",
            ),
            (
                "She was ___ about presenting her invention, worrying the judges would ask questions she had not practiced answering aloud.",
                "nervous",
            ),
        ],
    ),
    (
        "relieved",
        "Feeling glad because something frightening or difficult has ended or turned out okay.",
        "relieved expression cartoon sigh",
        "cartoon",
        [
            (
                "We were ___ when the last bus appeared around the corner, because we had waited in cold rain for more than forty minutes.",
                "relieved",
            ),
            (
                "After the x-ray showed no fracture, the goalie felt ___ and joked that he would still dive, just more carefully next time.",
                "relieved",
            ),
            (
                "Parents sounded ___ when the principal announced school would reopen, ending weeks of improvised lessons at the kitchen table.",
                "relieved",
            ),
            (
                "The hikers were ___ to see trail markers again, realizing they had circled the ridge but not wandered into the restricted quarry.",
                "relieved",
            ),
        ],
    ),
    (
        "scales",
        "Small, flat, hard plates covering the skin of fish and reptiles. Scales protect the animal's body.",
        "fish scales close up cartoon",
        "cartoon",
        [
            (
                "The biologist showed how a snake's ___ overlap like shingles, helping the reptile slide through grass without tearing its skin.",
                "scales",
            ),
            (
                "Light bounced off the fish's silver ___ as it twisted in the net, each plate catching the sun like tiny mirrors.",
                "scales",
            ),
            (
                "Fossils sometimes preserve ___ impressions, revealing diamond patterns on ancient reptiles that swam in shallow seas.",
                "scales",
            ),
            (
                "We weighed the lizard gently, noting warm ___ under our gloves and counting toes before releasing it beside the log.",
                "scales",
            ),
        ],
    ),
    (
        "shriek",
        "A loud, high, sharp scream or cry, often from fear or surprise.",
        "cartoon shriek surprise funny",
        "cartoon",
        [
            (
                "When the hidden door crashed open, someone let out a ___ that echoed through stone halls and sent bats swirling into the courtyard.",
                "shriek",
            ),
            (
                "The roller coaster turn made Ava ___ with excitement, even though she had promised to stay completely silent through the loop.",
                "shriek",
            ),
            (
                "A sudden ___ from the alley made us jump, until we realized it was only a rusty swing scraping in the wind.",
                "shriek",
            ),
            (
                "The microphone picked up a ___ from the back row when the magician pulled a rubber chicken from an empty hat.",
                "shriek",
            ),
        ],
    ),
    (
        "slobbery",
        "Wet and messy with saliva; drooling.",
        "slobbery dog cartoon funny",
        "cartoon",
        [
            (
                "The friendly mastiff was so ___ that it left damp marks on our jackets whenever it panted and leaned against us by the gate.",
                "slobbery",
            ),
            (
                "After the puppy drank, it gave a ___ kiss that made everyone laugh and search for towels near the kitchen sink.",
                "slobbery",
            ),
            (
                "We avoided the ___ chew toy on the carpet, choosing instead to toss the dry ball across the freshly mowed lawn.",
                "slobbery",
            ),
            (
                "The cartoon dragon looked ___ on purpose, dripping jelly from its grin while the knight held up a giant napkin.",
                "slobbery",
            ),
        ],
    ),
    (
        "spooky",
        "Strange and frightening in a fun or creepy way, like a ghost story on Halloween.",
        "spooky forest fog cartoon mild",
        "cartoon",
        [
            (
                "Fog hung between the trees so thick that every branch looked like a reaching hand, and the path ahead felt wonderfully ___ in lantern light.",
                "spooky",
            ),
            (
                "The soundtrack made the cartoon basement seem ___ , though we knew the glowing eyes belonged to raccoons knocking over paint cans.",
                "spooky",
            ),
            (
                "Our flashlight died during the ___ trail walk, and we giggled nervously while sharing the last phone battery to read the map.",
                "spooky",
            ),
            (
                "The book club chose a ___ mystery set in a lighthouse, promising chills without nightmares before the camping trip next month.",
                "spooky",
            ),
        ],
    ),
    (
        "stunning",
        "Extremely beautiful or impressive; so striking it almost takes your breath away.",
        "stunning landscape sunset cartoon",
        "cartoon",
        [
            (
                "From the cliff edge, we saw a ___ view of the valley, with rivers shining like silver threads beneath clouds painted pink at sunset.",
                "stunning",
            ),
            (
                "The dancer's final leap was ___ , freezing the audience mid-clap while music faded and spotlights warmed her white costume.",
                "stunning",
            ),
            (
                "Bioluminescent waves looked ___ at midnight, each breaker glowing blue as if the ocean held scattered stars along the shore.",
                "stunning",
            ),
            (
                "The restored cathedral ceiling was ___ , covered in gold leaf patterns that seemed to move when we tilted our heads.",
                "stunning",
            ),
        ],
    ),
    (
        "suspicious",
        "Feeling that something is wrong or dishonest; not trusting it.",
        "suspicious detective magnifying glass cartoon",
        "cartoon",
        [
            (
                "The shopkeeper grew ___ when the stranger refused to show what was inside the muddy sack he carried through the market at closing time.",
                "suspicious",
            ),
            (
                "Neighbors became ___ of the quiet house because lights flickered at midnight even though mail piled up on the porch.",
                "suspicious",
            ),
            (
                "The cat gave a ___ stare to the new robotic vacuum, creeping behind furniture until the machine docked and fell silent.",
                "suspicious",
            ),
            (
                "Detectives remained ___ of the alibi, noticing train tickets dated after the witness claimed to be sleeping at home.",
                "suspicious",
            ),
        ],
    ),
    (
        "tame",
        "Not wild; gentle and used to humans. A tame animal can be handled without attacking.",
        "tame deer hand feed cartoon",
        "cartoon",
        [
            (
                "Over many months, keepers worked to ___ the injured hawk so it could perch calmly on a glove during educational shows for schools.",
                "tame",
            ),
            (
                "The once-wild pony grew ___ enough for children to brush its mane, though it still startled at loud motorcycles on the road.",
                "tame",
            ),
            (
                "Legends describe heroes who try to ___ dragons with music, though our comic showed the dragon preferring earplugs and snacks.",
                "tame",
            ),
            (
                "Scientists wondered whether the foxes visiting the campsite were becoming ___ because campers left food scraps near the fire ring.",
                "tame",
            ),
        ],
    ),
    (
        "threatening",
        "Showing that harm may come; menacing.",
        "threatening storm clouds cartoon",
        "cartoon",
        [
            (
                "The giant's ___ shadow spread across the village square as it leaned over the wall, blocking the sun and rumbling like distant thunder.",
                "threatening",
            ),
            (
                "Dark clouds stacked in a ___ wall along the horizon, and the weather app buzzed with warnings about hail and sudden winds.",
                "threatening",
            ),
            (
                "The dog's low growl sounded ___ , so we slowly backed away and closed the gate without slamming it or running.",
                "threatening",
            ),
            (
                "Even a ___ note in the mystery book made us flip ahead, curious who had slipped the envelope under the classroom door.",
                "threatening",
            ),
        ],
    ),
    (
        "underworld",
        "The land of the dead or evil spirits in myths, often beneath the earth.",
        "myth underworld cartoon storybook",
        "cartoon",
        [
            (
                "In the ancient tale, the hero descended into the ___ to bargain for his friend's soul, crossing rivers of mist guarded by silent ferries.",
                "underworld",
            ),
            (
                "The play's ___ set glowed with blue lanterns, representing caverns ruled by a misunderstood king rather than monsters with claws.",
                "underworld",
            ),
            (
                "Archaeologists explained how tombs mirrored beliefs about an ___ where honored rulers carried gifts into the afterlife beside them.",
                "underworld",
            ),
            (
                "Our comic strip joked that the cafeteria basement was an ___ ruled by lost lunch boxes and squeaky vending machines.",
                "underworld",
            ),
        ],
    ),
    (
        "vanish",
        "To disappear suddenly so you cannot be seen or found.",
        "magician vanish cartoon smoke",
        "cartoon",
        [
            (
                "The fox seemed to ___ between one blink and the next, slipping through a gap in the hedge we had not noticed in the leaves.",
                "vanish",
            ),
            (
                "Coins ___ from the magician's palm, reappearing behind a giggling volunteer's ear while the audience tried to spot the hidden sleeve.",
                "vanish",
            ),
            (
                "Snow tracks can ___ after warm winds, erasing evidence of deer that crossed the field only hours before sunrise.",
                "vanish",
            ),
            (
                "When the lights returned after the blackout, the mysterious footprint seemed to ___ , leaving only wet grass and our unanswered questions.",
                "vanish",
            ),
        ],
    ),
    (
        "wrecked",
        "Badly damaged or destroyed.",
        "shipwreck coast cartoon storm",
        "cartoon",
        [
            (
                "After the hurricane, we saw a ___ fishing boat tossed onto the rocks, its mast snapped and paint stripped by waves taller than a house.",
                "wrecked",
            ),
            (
                "The teenager felt ___ after crashing his bicycle into a trash can, bending the wheel and scraping paint along the frame.",
                "wrecked",
            ),
            (
                "Rescuers searched the ___ cabin for supplies, careful of nails sticking out from walls twisted by the tornado's spinning winds.",
                "wrecked",
            ),
            (
                "The toy spaceship looked ___ after the dog carried it through the mud, missing fins and covered in paw prints and grass.",
                "wrecked",
            ),
        ],
    ),
]


def _load_revision_examples():
    import runpy

    return runpy.run_path(str(ROOT / "scripts" / "revision_examples.py"))["REVISION_EXAMPLES"]


REVISION_EXAMPLES = _load_revision_examples()


def build_words(entries, distractor_map):
    words = []
    for entry in entries:
        word, _old_expl, picture_search, picture_style, sents = entry
        explanation = EXPLANATIONS.get(word, _old_expl)
        if word not in EXPLANATIONS:
            raise KeyError(f"Missing EXPLANATIONS entry for: {word}")
        if word not in REVISION_EXAMPLES:
            raise KeyError(f"Missing REVISION_EXAMPLES entry for: {word}")
        validate_explanation(word, explanation)
        d_base = distractor_map[word]
        sentences = [s(t, a, d_base) for t, a in sents]
        words.append(
            {
                "word": word,
                "explanation": explanation,
                "pictureSearch": picture_search,
                "pictureStyle": picture_style,
                "sentences": sentences,
                "examples": REVISION_EXAMPLES[word][:1],
            }
        )
    return words


def _load_module4():
    import runpy

    return runpy.run_path(str(ROOT / "scripts" / "module4_words.py"))


_m4 = _load_module4()

PACK["modules"][0]["words"] = build_words(M1, M1_D)
PACK["modules"][1]["words"] = build_words(M2, M2_D)
PACK["modules"][2]["words"] = build_words(M3, M3_D)
PACK["modules"][3]["words"] = build_words(_m4["M4"], _m4["M4_D"])

# Summary stats
total_words = sum(len(m["words"]) for m in PACK["modules"])
total_sentences = sum(len(w["sentences"]) for m in PACK["modules"] for w in m["words"])

OUT.parent.mkdir(parents=True, exist_ok=True)
with OUT.open("w", encoding="utf-8") as f:
    json.dump(PACK, f, ensure_ascii=False, indent=2)

print(f"Wrote {OUT}")
print(f"Modules: {len(PACK['modules'])}")
print(f"Words: {total_words}")
print(f"Sentences: {total_sentences}")
