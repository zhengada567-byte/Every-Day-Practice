# Module 4 — Science: investigation & matter

M4_D = {
    "hypothesis": ["theory", "observation", "accurate"],
    "accurate": ["observation", "hypothesis", "temporary"],
    "observation": ["hypothesis", "accurate", "theory"],
    "temporary": ["accurate", "theory", "volume"],
    "theory": ["hypothesis", "observation", "accurate"],
    "volume": ["expand", "contract", "condense"],
    "elastic": ["rubber", "expand", "contract"],
    "rubber": ["elastic", "contract", "rusting"],
    "contract": ["expand", "condense", "elastic"],
    "expand": ["contract", "evaporate", "volume"],
    "evaporate": ["condense", "expand", "decaying"],
    "condense": ["evaporate", "expand", "volume"],
    "shattering": ["rusting", "decaying", "contract"],
    "decaying": ["rusting", "evaporate", "shattering"],
    "rusting": ["shattering", "decaying", "condense"],
    "limitation": ["excessive", "component", "property"],
    "excessive": ["limitation", "enhance", "temporary"],
    "consist of": ["component", "property", "volume"],
    "component": ["appliance", "consist of", "insulation"],
    "appliance": ["component", "kettle", "copper"],
    "insulation": ["conductivity", "copper", "property"],
    "copper": ["conductivity", "kettle", "insulation"],
    "kettle": ["appliance", "copper", "evaporate"],
    "conductivity": ["copper", "insulation", "property"],
    "enhance": ["excessive", "accurate", "property"],
    "property": ["conductivity", "component", "limitation"],
    "composition": ["substance", "consist of", "component"],
    "substance": ["composition", "property", "phenomena"],
    "dough": ["substance", "grind", "composition"],
    "grind": ["dough", "shattering", "split"],
    "phenomena": ["observation", "theory", "substance"],
    "split": ["grind", "expand", "contract"],
    "resistance": ["conductivity", "insulation", "copper"],
    "barrel": ["kettle", "volume", "substance"],
    "alley": ["barrel", "component", "temporary"],
    "coarse": ["conductivity", "property", "accurate"],
}

M4 = [
    (
        "hypothesis",
        "",
        "science hypothesis experiment cartoon",
        "diagram",
        [
            (
                "Before starting the lab, our team wrote a ___ that taller cups would hold more water because they have greater height inside.",
                "hypothesis",
            ),
            (
                "The teacher reminded us that a ___ must be testable, so we planned measurements we could repeat on three different afternoons.",
                "hypothesis",
            ),
            (
                "If your ___ is supported by the data, you still need more trials before telling the class that the pattern is proven.",
                "hypothesis",
            ),
            (
                "After the first results disagreed with our guess, we revised our ___ instead of changing the numbers to match what we hoped.",
                "hypothesis",
            ),
        ],
    ),
    (
        "accurate",
        "",
        "accurate measurement ruler cartoon",
        "diagram",
        [
            (
                "To get an ___ reading of the plant's growth, we measured from the soil line to the tip of the highest leaf every Monday morning.",
                "accurate",
            ),
            (
                "The digital scale was more ___ than guessing by hand, so we used it when comparing the mass of rocks before and after soaking.",
                "accurate",
            ),
            (
                "Careful labels on each jar helped us keep ___ records, which mattered when we reviewed photos from week one and week four.",
                "accurate",
            ),
            (
                "If your thermometer is not ___ , your temperature table may mislead the whole group during the heating and cooling investigation.",
                "accurate",
            ),
        ],
    ),
    (
        "observation",
        "",
        "science observation notebook magnifying glass cartoon",
        "cartoon",
        [
            (
                "During the field trip, each student made an ___ of how many birds visited the feeder during a quiet fifteen-minute sit by the window.",
                "observation",
            ),
            (
                "Your lab notebook should separate ___ from opinion, describing only what your eyes or instruments actually detected during the trial.",
                "observation",
            ),
            (
                "A sudden color change in the liquid was an important ___ that a chemical reaction might be starting inside the heated beaker.",
                "observation",
            ),
            (
                "Repeated ___ of the pendulum's swing helped us notice that the arc grew smaller whenever we forgot to release it from the same angle.",
                "observation",
            ),
        ],
    ),
    (
        "temporary",
        "",
        "temporary sign short term cartoon",
        "cartoon",
        [
            (
                "The bridge closure was ___ , so commuters expected traffic to return to normal after workers finished replacing the cracked beams.",
                "temporary",
            ),
            (
                "Frost on the grass was a ___ change that melted by noon, leaving the field damp while the sun warmed the playground.",
                "temporary",
            ),
            (
                "We built a ___ dam from sandbags during the drill, knowing the river would wash it away once the practice ended at sunset.",
                "temporary",
            ),
            (
                "The museum placed a ___ screen in front of the statue while experts cleaned the stone, promising to reopen the hall on Friday.",
                "temporary",
            ),
        ],
    ),
    (
        "theory",
        "",
        "science theory diagram education cartoon",
        "diagram",
        [
            (
                "After many classes tested the idea with different plants, the school accepted the ___ that light direction affects stem bending.",
                "theory",
            ),
            (
                "A scientific ___ is stronger than a single lucky result because it explains patterns seen in labs around the world for years.",
                "theory",
            ),
            (
                "The video described how the ___ of plate movement helps explain earthquakes along coasts where two huge slabs of crust meet.",
                "theory",
            ),
            (
                "Students learned that a ___ can change when new evidence appears, which is normal and does not mean scientists were careless.",
                "theory",
            ),
        ],
    ),
    (
        "volume",
        "",
        "volume container water displacement science cartoon",
        "diagram",
        [
            (
                "We calculated the ___ of the rectangular box by multiplying its length, width, and height, then checked with water displacement.",
                "volume",
            ),
            (
                "The recipe failed because we confused mass with ___, using a cup meant for flour to measure liquid without leveling carefully.",
                "volume",
            ),
            (
                "When rocks sank in the graduated cylinder, the water level rose, showing that their ___ pushed aside an equal amount of fluid.",
                "volume",
            ),
            (
                "The science question asked for ___ of space inside the tank, not how loud the pump sounded when the motor switched on.",
                "volume",
            ),
        ],
    ),
    (
        "elastic",
        "",
        "elastic stretch rubber band cartoon",
        "cartoon",
        [
            (
                "The waistband remained ___ after dozens of stretches, returning to its original length each time the fabric relaxed on the table.",
                "elastic",
            ),
            (
                "We tested which material was most ___ by hanging weights on strips and measuring how far each one stretched before snapping.",
                "elastic",
            ),
            (
                "An ___ ball stores energy when squashed and may launch upward when the pressure inside is released through the valve.",
                "elastic",
            ),
            (
                "The bridge designer chose cables with ___ properties so they could flex slightly during high winds without cracking immediately.",
                "elastic",
            ),
        ],
    ),
    (
        "rubber",
        "",
        "rubber band material stretch cartoon",
        "cartoon",
        [
            (
                "The sole of the hiking boot was made from thick ___ that gripped wet rocks better than the smooth plastic samples we tried.",
                "rubber",
            ),
            (
                "During the insulation test, a sheet of ___ blocked less heat than the foam panel, which we recorded in our comparison chart.",
                "rubber",
            ),
            (
                "The factory tour showed how liquid latex becomes solid ___ through heating, stretching, and cutting into bands for packaging.",
                "rubber",
            ),
            (
                "Because ___ bends without cracking easily, engineers sometimes use it for seals around doors that must close tightly in the rain.",
                "rubber",
            ),
        ],
    ),
    (
        "contract",
        "",
        "metal contract cold heat science cartoon",
        "diagram",
        [
            (
                "The metal lid seemed stuck until hot water made the jar expand slightly and the rim stopped gripping as it began to ___ .",
                "contract",
            ),
            (
                "In winter, gaps appear in old sidewalks because concrete can ___ when temperatures drop during long freezing nights in January.",
                "contract",
            ),
            (
                "The balloon skin will ___ as the air inside cools, shrinking the toy until you warm it gently above the radiator.",
                "contract",
            ),
            (
                "Muscle fibers ___ when you relax your arm, shortening the visible bulge after you finish lifting the heavy classroom chair.",
                "contract",
            ),
        ],
    ),
    (
        "expand",
        "",
        "expand heat balloon science cartoon",
        "diagram",
        [
            (
                "Heated air began to ___ inside the bottle, pushing the balloon outward until the plastic stretched thin over the rubber stopper.",
                "expand",
            ),
            (
                "Ice can ___ when it freezes inside a crack, widening the stone slowly until a piece of the trail breaks loose downhill.",
                "expand",
            ),
            (
                "The map drawer would not close because humidity made the paper sheets ___ overnight, rubbing against the wooden sides.",
                "expand",
            ),
            (
                "As steam filled the kitchen, the bread dough continued to ___ in the warm bowl, doubling in size before baking began at noon.",
                "expand",
            ),
        ],
    ),
    (
        "evaporate",
        "",
        "water evaporate sun puddle science cartoon",
        "cartoon",
        [
            (
                "After recess, the puddle on the asphalt seemed to ___ in the sun, leaving only a dark outline of grit and fallen leaves.",
                "evaporate",
            ),
            (
                "Salt crystals appeared when seawater began to ___ in the shallow tray, leaving minerals behind on the glass near the lamp.",
                "evaporate",
            ),
            (
                "The teacher explained that sweat helps cool skin because moisture can ___ from your arms, carrying heat away into the air.",
                "evaporate",
            ),
            (
                "If you leave the lid off the jar, the scented liquid will slowly ___ until the classroom no longer smells like peppermint.",
                "evaporate",
            ),
        ],
    ),
    (
        "condense",
        "",
        "water condense cold glass science cartoon",
        "cartoon",
        [
            (
                "Droplets began to ___ on the outside of the cold can when humid air touched the metal and changed into tiny beads.",
                "condense",
            ),
            (
                "Steam from the kettle will ___ on the mirror if you breathe nearby, forming a foggy patch you can draw shapes in quickly.",
                "condense",
            ),
            (
                "At night, water vapor in the tent can ___ on the fabric, making sleeping bags feel damp unless you vent the flap.",
                "condense",
            ),
            (
                "The cloud formed when warm moist air rose, cooled, and allowed vapor to ___ into visible bits drifting across the valley.",
                "condense",
            ),
        ],
    ),
    (
        "shattering",
        "",
        "glass shatter safety cartoon",
        "cartoon",
        [
            (
                "The frozen marble floor made the dropped flask ___ into glittering pieces that scattered under the desks before we swept carefully.",
                "shattering",
            ),
            (
                "Safety goggles are required because ___ glass can spray sideways faster than you can turn away from the broken beaker.",
                "shattering",
            ),
            (
                "The old window was ___ during the hailstorm, leaving sharp fragments caught in the frame until the custodian boarded it up.",
                "shattering",
            ),
            (
                "We learned that sudden temperature change can cause ceramic cups to crack, sometimes ___ them without any one strong bump.",
                "shattering",
            ),
        ],
    ),
    (
        "decaying",
        "",
        "decaying leaves compost science cartoon",
        "cartoon",
        [
            (
                "Fallen logs were ___ in the forest, turning soft and dark as fungi broke them down into nutrients for new seedlings nearby.",
                "decaying",
            ),
            (
                "The compost bin smelled earthy because fruit peels were ___ slowly, helped by worms stirring the layers with their tunnels.",
                "decaying",
            ),
            (
                "Scientists study ___ leaves to learn how carbon returns to the soil instead of staying locked inside dried plant tissue forever.",
                "decaying",
            ),
            (
                "Without decomposers, ___ matter would pile up in parks, covering trails and blocking sunlight from reaching the ground plants.",
                "decaying",
            ),
        ],
    ),
    (
        "rusting",
        "",
        "rusting metal oxidation science cartoon",
        "cartoon",
        [
            (
                "The old gate was ___ along the bottom hinge, flaking orange powder onto the path whenever someone pushed it open quickly.",
                "rusting",
            ),
            (
                "Salt spray from the harbor speeds up ___ on bicycle chains, so riders rinse and oil them after riding near the pier.",
                "rusting",
            ),
            (
                "We painted the steel bracket to slow ___ , because bare metal left in the rain forms rough patches within a few weeks.",
                "rusting",
            ),
            (
                "The investigation compared nails in dry air, damp air, and water to see which conditions increased ___ on the iron samples.",
                "rusting",
            ),
        ],
    ),
    (
        "limitation",
        "",
        "limitation restriction diagram cartoon",
        "diagram",
        [
            (
                "The small battery was a serious ___ for our robot, because the motor drained power after only five minutes on the track.",
                "limitation",
            ),
            (
                "During the design review, engineers listed each ___ of the bridge model, including weight, cost, and materials available in the shop.",
                "limitation",
            ),
            (
                "Our survey had a ___ of only fifty students, so the teacher warned us not to claim the results represent every school in the city.",
                "limitation",
            ),
            (
                "Night vision goggles have a ___ in thick fog, which is why the manual says pilots must still rely on instruments in low clouds.",
                "limitation",
            ),
        ],
    ),
    (
        "excessive",
        "",
        "excessive too much warning cartoon",
        "cartoon",
        [
            (
                "Adding ___ sugar to the yeast mixture slowed growth, because the extra sweetness drew water out of the cells through osmosis.",
                "excessive",
            ),
            (
                "The coach said ___ training without rest days could injure runners, even when they feel strong during the first week of practice.",
                "excessive",
            ),
            (
                "Lights left on all weekend used ___ electricity, so the class calculated how much money the school could save with timers.",
                "excessive",
            ),
            (
                "Wear safety goggles when ___ steam bursts from the beaker, because hot droplets can burn skin faster than students expect.",
                "excessive",
            ),
        ],
    ),
    (
        "consist of",
        "",
        "mixture parts consist diagram cartoon",
        "diagram",
        [
            (
                "The lab manual stated that the unknown powder might ___ three salts dissolved together, so we tested each possible combination separately.",
                "consist of",
            ),
            (
                "Healthy soil samples usually ___ mineral grains, water, air pockets, and living organisms that break down fallen leaves over time.",
                "consist of",
            ),
            (
                "The committee learned that the new alloy will ___ iron, carbon, and a small amount of nickel to increase strength without much extra weight.",
                "consist of",
            ),
            (
                "Your poster should explain what mixtures ___ , using labeled diagrams instead of listing ingredients without showing how they connect.",
                "consist of",
            ),
        ],
    ),
    (
        "component",
        "",
        "machine components parts diagram cartoon",
        "diagram",
        [
            (
                "Each ___ of the motor, including the coil and magnets, must be aligned carefully or the fan will vibrate loudly on the desk.",
                "component",
            ),
            (
                "Technicians replaced a failed ___ in the dishwasher rather than buying an entirely new machine, saving plastic and metal from the landfill.",
                "component",
            ),
            (
                "Our group drew every ___ of the water filter on the board, showing how sediment trays stack above the charcoal layer inside.",
                "component",
            ),
            (
                "If one electronic ___ overheats, the whole circuit may shut down, which is why the kit includes a spare fuse in the bag.",
                "component",
            ),
        ],
    ),
    (
        "appliance",
        "",
        "home appliance kitchen cartoon",
        "cartoon",
        [
            (
                "The energy audit measured how much power each kitchen ___ used during an hour of normal cooking on a typical school holiday morning.",
                "appliance",
            ),
            (
                "Before plugging in any ___ , the safety sheet told us to dry our hands and check that cords were not frayed near the plug.",
                "appliance",
            ),
            (
                "Older ___ often waste heat, so replacing them with efficient models can lower bills while still washing clothes just as cleanly.",
                "appliance",
            ),
            (
                "During the invention fair, Maya explained how her low-cost ___ could sort recycling using sensors instead of manual labor after lunch.",
                "appliance",
            ),
        ],
    ),
    (
        "insulation",
        "",
        "home insulation heat cartoon cross section",
        "diagram",
        [
            (
                "Thick wall ___ kept the classroom cooler in May, slowing the movement of heat from the sunny parking lot through the bricks.",
                "insulation",
            ),
            (
                "We wrapped the hot water pipe with foam ___ so less energy escaped before the liquid reached the sink across the hall.",
                "insulation",
            ),
            (
                "Penguin feathers trap air that acts as natural ___ , helping the birds stay warm while they stand on ice for hours.",
                "insulation",
            ),
            (
                "The challenge was to build a box whose ___ would keep an ice cube from melting for thirty minutes in a warm gym.",
                "insulation",
            ),
        ],
    ),
    (
        "copper",
        "",
        "copper wire metal science cartoon",
        "cartoon",
        [
            (
                "The circuit kit used thin ___ wire because it carries electric current well and bends easily around the battery holder clips.",
                "copper",
            ),
            (
                "Statues made from ___ develop a green surface over time when oxygen in the air reacts with the metal outdoors.",
                "copper",
            ),
            (
                "Miners once prized ___ ore for tools and decoration, long before factories drew miles of cable across continents for power grids.",
                "copper",
            ),
            (
                "Our table compared how quickly heat traveled along ___ and aluminum rods when we held one end over a small flame.",
                "copper",
            ),
        ],
    ),
    (
        "kettle",
        "",
        "electric kettle boil water cartoon",
        "cartoon",
        [
            (
                "When the ___ switched off automatically, the water had reached boiling and the class was ready to steep the tea bags safely.",
                "kettle",
            ),
            (
                "We measured how long the ___ took to heat one liter of water on high power versus low power using the lab watt meter.",
                "kettle",
            ),
            (
                "Steam rose from the spout as the ___ heated the remaining cup of water left from the previous group's chemistry demonstration.",
                "kettle",
            ),
            (
                "The hotel room had a small ___ for making hot drinks, but the guide reminded travelers to pour slowly to avoid splashes.",
                "kettle",
            ),
        ],
    ),
    (
        "conductivity",
        "",
        "heat conductivity metal rods science cartoon",
        "diagram",
        [
            (
                "Our chart ranked metals by thermal ___ , showing which rod carried warmth to the wax flag fastest during the demonstration.",
                "conductivity",
            ),
            (
                "Salt water has higher electrical ___ than pure water, which is why the bulb lit when we placed the probes in the brine.",
                "conductivity",
            ),
            (
                "The engineer chose a gasket material with low ___ so heat from the engine would not escape into the passenger cabin.",
                "conductivity",
            ),
            (
                "Students learned that ___ describes how easily energy flows through a substance, not how heavy or colorful the sample looks.",
                "conductivity",
            ),
        ],
    ),
    (
        "enhance",
        "",
        "enhance improve science cartoon",
        "cartoon",
        [
            (
                "Adding a reflector behind the lamp can ___ brightness at the workbench without increasing electricity use during late evening study sessions.",
                "enhance",
            ),
            (
                "Certain enzymes ___ chemical reactions in cells, allowing digestion to finish faster than it would without those biological helpers.",
                "enhance",
            ),
            (
                "The software filter did not change the data, but it could ___ faint lines on the graph so trends were easier to discuss.",
                "enhance",
            ),
            (
                "Planting trees along the stream may ___ water quality by shading the channel and reducing erosion from heavy rain on bare soil.",
                "enhance",
            ),
        ],
    ),
    (
        "property",
        "",
        "material properties science chart cartoon",
        "diagram",
        [
            (
                "Hardness is one physical ___ of a mineral that geologists test by scratching samples with tools of known strength on the bench.",
                "property",
            ),
            (
                "The lab sheet asked us to record each ___ we measured, such as density, flexibility, and whether the plastic melted near the heater.",
                "property",
            ),
            (
                "Wax changed from solid to liquid when heated, demonstrating a ___ that depends on temperature rather than on the shape of the mold.",
                "property",
            ),
            (
                "Comparing the ___ of rubber and glass helped explain why one material bounced while the other cracked under the same dropped weight.",
                "property",
            ),
        ],
    ),
    (
        "composition",
        "",
        "material composition mixture diagram cartoon",
        "diagram",
        [
            (
                "The lab report described the ___ of the alloy, listing each metal present and the percentage measured by the spectrometer on Tuesday.",
                "composition",
            ),
            (
                "Changing the ___ of the soil sample altered how quickly water drained through the tube during our permeability demonstration in class.",
                "composition",
            ),
            (
                "Artists sometimes hide the ___ of old paintings under X-rays, revealing sketches and pigments layered over many years of work.",
                "composition",
            ),
            (
                "Before recycling, we sorted plastic by ___ because different polymers melt at different temperatures in the factory furnace.",
                "composition",
            ),
        ],
    ),
    (
        "substance",
        "",
        "chemistry substance beaker cartoon",
        "cartoon",
        [
            (
                "Wear gloves when handling an unknown ___ , because even powders that look harmless can react strongly with water on the bench.",
                "substance",
            ),
            (
                "The teacher defined a pure ___ as matter with the same properties throughout, unlike a mixture of sand and salt in one jar.",
                "substance",
            ),
            (
                "Oxygen is a ___ that many living things need, dissolving in river water so fish can breathe through their gills underwater.",
                "substance",
            ),
            (
                "When the mysterious ___ changed color after heating, we recorded the time and temperature in our notebook before it cooled again.",
                "substance",
            ),
        ],
    ),
    (
        "dough",
        "",
        "bread dough baking cartoon",
        "cartoon",
        [
            (
                "After kneading the ___ for ten minutes, the class left it to rise near the window while we measured how much carbon dioxide formed inside.",
                "dough",
            ),
            (
                "Too much water made the ___ sticky, so we sprinkled flour on the table and folded it until the surface felt smooth and elastic.",
                "dough",
            ),
            (
                "The bakery showed how ___ bubbles expand in the oven when yeast releases gas, turning a dense lump into a light loaf.",
                "dough",
            ),
            (
                "We compared two ___ samples, one with yeast and one without, to see which rose higher in the same warm cupboard overnight.",
                "dough",
            ),
        ],
    ),
    (
        "grind",
        "",
        "grind pepper mill cartoon",
        "cartoon",
        [
            (
                "Students used a mortar and pestle to ___ the chalk into powder before mixing it with vinegar to study how fast bubbles formed.",
                "grind",
            ),
            (
                "The mill continued to ___ wheat between heavy stones, producing flour that felt warm when it poured into the wooden bin below.",
                "grind",
            ),
            (
                "Safety rules warned us not to ___ glass in the open lab, because tiny shards can scatter farther than people expect when they break.",
                "grind",
            ),
            (
                "To speed dissolution, we decided to ___ the tablet into smaller pieces, increasing the surface area touching the water in the beaker.",
                "grind",
            ),
        ],
    ),
    (
        "phenomena",
        "",
        "natural phenomena lightning rainbow cartoon",
        "cartoon",
        [
            (
                "The unit on weather ___ included lightning, halos around the moon, and frost patterns that form on windows during cold clear nights.",
                "phenomena",
            ),
            (
                "Scientists collect data on natural ___ such as tides and auroras, then look for patterns that might be explained by tested models.",
                "phenomena",
            ),
            (
                "Our poster listed three classroom ___ we could repeat, unlike rare events such as earthquakes that cannot be scheduled for Friday labs.",
                "phenomena",
            ),
            (
                "The textbook chapter linked everyday ___ like rust and evaporation to particle ideas we had studied earlier in the term.",
                "phenomena",
            ),
        ],
    ),
    (
        "split",
        "",
        "split log axe cartoon",
        "cartoon",
        [
            (
                "Heating caused the wooden ruler to ___ along a hidden crack, sending two pieces skittering across the desk during the expansion demo.",
                "split",
            ),
            (
                "The class watched a laser ___ a beam through a prism, producing a band of colors on the white screen at the back wall.",
                "split",
            ),
            (
                "When the frozen juice cup began to ___ , we saw sharp lines form on the surface before the ice slid apart in the tray.",
                "split",
            ),
            (
                "Genetic material can ___ when a cell divides, copying information so each new cell receives a full set of instructions for life.",
                "split",
            ),
        ],
    ),
    (
        "resistance",
        "",
        "electrical resistance circuit cartoon",
        "diagram",
        [
            (
                "A longer thin wire showed more electrical ___ than a short thick one, so the bulb in that part of the circuit glowed dimmer.",
                "resistance",
            ),
            (
                "The worksheet asked us to measure ___ in ohms and explain why the same battery produced different currents through two resistors.",
                "resistance",
            ),
            (
                "Rubber gloves provide high ___ to current, which helps protect electricians when they work near live equipment in the workshop.",
                "resistance",
            ),
            (
                "Swimmers feel water's ___ against their arms, a different kind of opposition than electrons meeting impurities inside a metal wire.",
                "resistance",
            ),
        ],
    ),
    (
        "barrel",
        "",
        "wooden barrel container cartoon",
        "cartoon",
        [
            (
                "Rainwater collected in the ___ behind the shed, and we dipped a graduated cylinder in to measure how many liters filled after the storm.",
                "barrel",
            ),
            (
                "The museum displayed a shipping ___ used a century ago, showing how hoops of metal held curved wooden staves tightly together.",
                "barrel",
            ),
            (
                "During the investigation, we rolled the ___ across the floor to study how its mass affected the distance it traveled on the ramp.",
                "barrel",
            ),
            (
                "Workers sealed the ___ with a lid so the olive oil inside would not spill during the long truck ride to the coastal factory.",
                "barrel",
            ),
        ],
    ),
    (
        "alley",
        "",
        "narrow alley between buildings cartoon",
        "cartoon",
        [
            (
                "The delivery truck could barely fit down the ___ behind the shops, so crates were carried by hand to the loading door step by step.",
                "alley",
            ),
            (
                "Echoes bounced off brick walls in the quiet ___ , making our footsteps sound louder than they did on the wide main street nearby.",
                "alley",
            ),
            (
                "The map showed a shortcut through an ___ that connected the school parking lot to the park without crossing the busy intersection.",
                "alley",
            ),
            (
                "Recycling bins lined the ___ , and we recorded how wind swirled between the buildings during our weather journal project in March.",
                "alley",
            ),
        ],
    ),
    (
        "coarse",
        "",
        "coarse sand texture cartoon",
        "cartoon",
        [
            (
                "___ sand felt rough between our fingers, while the fine sample flowed almost like powder when we poured it through the funnel.",
                "coarse",
            ),
            (
                "The filter removed ___ debris from the water, leaving clearer liquid in the lower flask after gravity pulled it through the paper.",
                "coarse",
            ),
            (
                "Builders mix ___ gravel with cement so the concrete grips better, creating strong foundations that resist cracking under heavy loads.",
                "coarse",
            ),
            (
                "Under the microscope, ___ salt crystals looked jagged and uneven compared with the tiny, smooth grains in the refined table salt.",
                "coarse",
            ),
        ],
    ),
]
