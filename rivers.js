'use strict';
/* =====================================================================
   RIVER RUN — DATA
   Rivers, rapids, camps, history markers, bridges, towns and crowds.
   Miles are river miles from the put-in (Grand Canyon uses Lees Ferry miles).
   Some miles are approximate. Facts are short summaries for a game.
   ===================================================================== */

const CRAFTS={
  raft:{name:'Oar Raft',tag:'EASY',desc:'Big and heavy. Bounces off rocks. Hard to flip. Best for your first run.',
    hp:140,rockDmg:.45,tol:55,row:230,back:320,turn:4.4,maxTurn:1.9,kLong:1.35,kLat:1.7,mass:1.5,roll:0,r:30,len:76,wid:48,crew:3,
    arc:{lat:150,fwd:110,back:140,cruise:20,resp:3.2,assist:9,damp:4.5}},
  kayak:{name:'Whitewater Kayak',tag:'MEDIUM',desc:'Fast and agile. Turns very quickly. Flips more easily, but you can roll back up (sometimes).',
    hp:100,rockDmg:.6,tol:40,row:360,back:260,turn:8,maxTurn:3.3,kLong:.95,kLat:2.3,mass:.75,roll:.5,r:15,len:64,wid:18,crew:1,arc:{lat:190,fwd:170,back:130,cruise:30,resp:4.2,assist:12,damp:5},
    pd:{name:'PADDLE!',cd:.3,J:105,Jb:80,yaw:1.15,same:.65,bothJ:0,btn:['L','R','NEXT','BACK'],help:'Tap LEFT / RIGHT strokes and alternate them. Hold BACK + stroke to back-paddle.',keys:'A / D strokes · W next stroke · hold S to back-paddle · mouse: click to stroke'}},
  dory:{name:'Wooden Dory',tag:'HARD',desc:'The classic Grand Canyon boat. Long rocker hull tracks straight and rides waves well, but rocks crack the hull.',
    hp:90,rockDmg:1.25,tol:33,row:280,back:380,turn:3.8,maxTurn:1.7,kLong:1.1,kLat:2.7,mass:1.6,roll:0,r:26,len:84,wid:34,crew:2,arc:{lat:150,fwd:150,back:170,cruise:30,resp:3.4,assist:9,damp:4.5},
    pd:{name:'ROW!',cd:.5,J:55,Jb:70,yaw:.95,same:1,bothJ:180,bothB:200,bothCd:.75,btn:['L OAR','R OAR','BOTH','BACK'],help:'LEFT or RIGHT oar to pivot. BOTH for power. Hold BACK + BOTH to pull away from danger. Keep a steady rhythm.',keys:'A / D one oar · W both oars · hold S to back-row · mouse: click to row'}},
  tube:{name:'Inner Tube',tag:'CHAOS',desc:'No oars. You kick. It spins. Keep your feet downstream. Good luck.',
    hp:100,rockDmg:.3,tol:26,row:120,back:120,turn:5,maxTurn:2.6,kLong:2,kLat:2.1,mass:.5,roll:0,r:20,len:46,wid:46,crew:1,arc:{lat:90,fwd:60,back:60,cruise:0,resp:2.4,assist:2.5,damp:2.2},
    pd:{name:'KICK!',cd:.22,J:45,Jb:35,yaw:.6,same:.8,bothJ:0,btn:['KICK L','KICK R','KICK','BACK'],help:'Tap LEFT / RIGHT to kick. Keep your feet downstream.',keys:'A / D kick · W next kick · hold S to kick backward'}}
};

const LEVELS={
  low:{name:'Low',speed:.8,rocks:1.6,holes:.7,sev:.9,hp:.9,note:'more rocks'},
  med:{name:'Medium',speed:1,rocks:1,holes:1,sev:1,hp:1,note:'balanced'},
  high:{name:'High',speed:1.3,rocks:.55,holes:1.35,sev:1.15,hp:1.15,note:'faster, bigger holes'},
  flood:{name:'Flood',speed:1.6,rocks:.35,holes:1.6,sev:1.3,hp:1.2,debris:true,note:'brown water, floating logs'}
};
const LEVEL_KEYS=['low','med','high','flood'];

const MODES={
  day:{name:'Day trip',desc:'Just go down the river.'},
  overnight:{name:'Overnight',desc:'Land at a real campsite, enjoy the night, launch at dawn. Gear can wash away.'},
  expedition:{name:'Expedition',desc:'Multi-day. Crew health, food and supplies, camp fights, floods, man overboard. Like the Oregon Trail, on water.'}
};

const INTL={'I':.1,'II':.25,'II+':.32,'III':.45,'III+':.52,'IV':.65,'IV+':.72,'V':.85,'V+':.93};
function sev(R,c){return R.scale==='gc'?c/10:(INTL[c]||.4);}
function clsText(R,c){return R.scale==='gc'?`Class ${c}/10 (Grand Canyon scale)`:`Class ${c}`;}

/* POI kinds: hist (history), town, geo (geology), nat (nature), art (rock art), fest (festival).
   A POI with "page" pauses the game and shows a full page. Others show a short card. */
const KIND_ICON={hist:'📜',town:'🏠',geo:'🪨',nat:'🌿',art:'🖐',fest:'🎉',warn:'⚠️'};

/* =====================================================================
   GRAND CANYON — one shared data set (Lees Ferry mile 0 → Diamond Creek mile 226)
   Rapid miles and 1–10 ratings follow the common river-mile list.
   Sections are cut from it at real exits: Phantom Ranch, Whitmore, Diamond Creek.
   ===================================================================== */
const GC_ZONES=[
  {m:0,name:'Marble Canyon',width:540,wallH:820,pal:{wall:'#b4552f',wall2:'#86391f',strata:'#d07a4a',sand:'#ddbb84',water:'#3f7f6f',veg:'#78883a',rock:'#7b5a4a'}},
  {m:61,name:'Furnace Flats',width:600,wallH:900,pal:{wall:'#9c4a3a',wall2:'#6e3b3a',strata:'#c9785c',sand:'#d9b47e',water:'#4a8478',veg:'#7a8a3a',rock:'#6f4a40'}},
  {m:77,name:'Upper Granite Gorge',width:420,wallH:700,pal:{wall:'#352c36',wall2:'#5b4252',strata:'#a46b72',sand:'#cfab7a',water:'#3d7a6c',veg:'#6f8a3a',rock:'#3e3842'}},
  {m:117,name:'Middle Granite Gorge',width:450,wallH:850,pal:{wall:'#7a6a5a',wall2:'#5a4a3e',strata:'#a88e72',sand:'#d4b07e',water:'#3e7a6b',veg:'#6f8a3a',rock:'#5a4e44'}},
  {m:160,name:'Lava Canyon walls',width:500,wallH:760,pal:{wall:'#2a2829',wall2:'#5a3a2b',strata:'#8b5a3c',sand:'#c8a679',water:'#3e7a6b',veg:'#6e8a3a',rock:'#2b2a2c'}},
  {m:192,name:'Lower Granite Gorge',width:440,wallH:720,pal:{wall:'#4a3a3e',wall2:'#6a4a4a',strata:'#a07060',sand:'#d0ad7c',water:'#3f7a6c',veg:'#6f8a3a',rock:'#4a4044'}}
];
/* [mile, name, rating, scout text, extra] */
const GC_RAPIDS=[
 [8.0,'Badger Creek',5,'The first big rapid. Badger Creek and Jackass Creek both push boulders in. Enter right of center. Holes wait at the bottom.',{line:[.15,.1,0]}],
 [11.4,'Soap Creek',5,'Steep drop with a strong wave train. Hit the waves straight.'],
 [14.5,'Sheer Wall',3,'Small rapid against a tall wall.'],
 [17.1,'House Rock',7,'The current pushes you right, toward the wall. Big holes at the bottom. Row away early.',{line:[-.1,.3,-.2],haz:[{t:'hole',u:.15,v:.85,p:1.3,s:1.6,n:'House Rock Hole'}]}],
 [20.7,'North Canyon',5,'Start of the Roaring Twenties. Big waves.'],
 [21.4,'21 Mile',5,'Wave train. Stay in the middle.'],
 [23.2,'23 Mile',4,'Rocky waves.'],
 [24.4,'Georgie (24 Mile)',6,'Holes on the sides. Keep the boat straight.'],
 [24.7,'24.5 Mile',6,'A big hole waits on the left side.',{line:[.25,.3,.2],haz:[{t:'hole',u:-.35,v:.4,p:1.2,s:1.5,n:'24.5 Hole'}]}],
 [25.1,'25 Mile',6,'Rocks and holes. Pick a line and commit.'],
 [25.7,'Cave Springs',5,'Look for the cave in the left wall. Big waves.'],
 [26.8,'27 Mile',5,'Last of the Roaring Twenties.'],
 [30.4,'Fence Fault',3,'A riffle along a fault in the rock.'],
 [36.3,'36 Mile',4,'A sharp turn with a rock at the bottom.'],
 [44.0,'President Harding',4,'A big rock in the middle of the river. Go around it.',{haz:[{t:'rock',u:0,v:.5,r:46,n:'Harding Rock'}],line:[.4,.45,.3]}],
 [52.4,'Nankoweap',3,'Shallow and rocky. Many channels.'],
 [56.3,'Kwagunt',5,'Rocks at the top. Waves below.'],
 [60.1,'60 Mile',4,'Fast water with a few holes.'],
 [65.9,'Lava Canyon (Chuar)',4,'Wide and rocky.'],
 [69.0,'Tanner',6,'Long wave train. Rocks on the left.'],
 [69.9,'Basalt',6,'Black basalt boulders. Hit the waves straight.'],
 [72.9,'Unkar',6,'The river turns hard right. The current pushes into the left wall at the bottom.',{line:[.2,.1,.3]}],
 [75.8,'Nevills (75 Mile)',6,'Big holes on the left. Run right.',{line:[.3,.3,.2]}],
 [77.1,'Hance',8,'Long rock garden with many holes. Pick a path through and keep the boat straight.'],
 [79.1,'Sockdolager',7,'Huge waves between black walls. Hit them straight on.'],
 [82.1,'Grapevine',7,'Long wave train. Holes at the sides. Stay in the center.',{line:[0,0,0]}],
 [84.1,'83 Mile',4,'Small one. Breathe.'],
 [85.3,'Zoroaster',5,'Fast water and holes near the walls.'],
 [88.3,'Bright Angel',3,'Small rapid at Phantom Ranch.'],
 [89.5,'Pipe Creek',3,'Riffle below the bridges.'],
 [90.8,'Horn Creek',8,'Two rocks, "the Horns," stick up at the top. Big holes below them. Enter right of the horns.',{line:[.35,.2,.1],haz:[{t:'rock',u:-.05,v:.12,r:26,n:'The Horns'},{t:'rock',u:.12,v:.13,r:22},{t:'hole',u:-.1,v:.42,p:1.3,s:1.5}]}],
 [93.1,'Salt Creek',3,'Easy waves.'],
 [93.9,'Granite',8,'Big waves and a strong current toward the left wall. Stay right of center.',{line:[.3,.2,.25]}],
 [95.5,'Hermit',8,'A long train of huge waves. The fifth wave is the biggest. Hit it straight!',{line:[0,0,0],haz:[{t:'wave',u:0,v:.55,h:1,w:.22,n:'Fifth Wave'}]}],
 [97.1,'Boucher',4,'Rocky. Pick a slot.'],
 [98.2,'Crystal',8,'Crystal Hole is near the center at the top. Pull hard to the right to miss it. Then watch for the rock garden on the left.',{fan:1,line:[.35,.4,.05],haz:[{t:'hole',u:-.05,v:.28,p:1.7,s:2,n:'Crystal Hole'},{t:'rock',u:-.55,v:.8,r:34,n:'Rock Garden'}]}],
 [99.7,'Tuna Creek',6,'Rocky with strong currents.'],
 [100.0,'Lower Tuna',4,'Rocks on the right.'],
 [101.1,'Agate',3,'Easy.'],
 [101.8,'Sapphire',7,'Holes at the bottom. Keep the boat straight.'],
 [102.6,'Turquoise',3,'Small waves.'],
 [104.5,'Emerald',5,'Waves and a hole.'],
 [105.2,'Ruby',5,'Strong waves and a hole at the top.'],
 [106.5,'Serpentine',7,'Big wave train that pushes into the wall. Row to the middle.'],
 [108.4,'Bass',4,'Riffle near the old cable crossing.'],
 [109.3,'Shinumo',4,'Rocky waves.'],
 [111.4,'Hakatai',4,'Waves.'],
 [112.8,'Waltenberg',6,'Big rocks and holes. Named for John Waltenberg, a miner who worked with William Bass.'],
 [122.2,'122 Mile',4,'Waves.'],
 [123.3,'Forster',5,'Rocks on the right.'],
 [125.5,'Fossil',5,'Waves with a hole at the top.'],
 [129.7,'Specter',6,'Big waves in dark rock.'],
 [131.1,'Bedrock',7,'A huge granite rock splits the river. Go RIGHT of it. The left side is a trap.',{line:[.45,.5,.3],haz:[{t:'rock',u:-.1,v:.42,r:62,n:'Bedrock'}]}],
 [132.3,'Deubendorff',7,'Long and rocky. Named for Seymour Dubendorff of the 1909 Stone expedition.'],
 [134.3,'Tapeats',5,'Waves at the mouth of Tapeats Creek.'],
 [138.4,'Doris',4,'Named for Doris Nevills, who swam it in 1940.'],
 [139.7,'Fishtail',4,'A rock with a fishtail wave.'],
 [144.0,'Kanab',3,'Rocky riffle.'],
 [150.2,'Upset',8,'A big hole at the bottom left. Run right of center.',{line:[.3,.35,.35],haz:[{t:'hole',u:-.3,v:.75,p:1.5,s:1.7,n:'Upset Hole'}]}],
 [157.3,'Havasu',3,'Small rapid at the mouth of Havasu Creek.'],
 [164.9,'164 Mile',3,'Riffle.'],
 [171.9,'Gateway',3,'Waves.'],
 [179.7,'Lava Falls',9,'Do NOT go into the Ledge Hole on the left. Run the right side. Hit the V-Wave straight and miss the Black Rock at the bottom right.',{fan:-1,line:[.25,.4,.15],haz:[{t:'hole',u:-.38,v:.2,p:1.6,s:1.8,n:'Ledge Hole',pour:true},{t:'wave',u:.42,v:.35,h:1,w:.14,n:'V-Wave'},{t:'rock',u:.6,v:.85,r:40,n:'Black Rock'},{t:'boil',u:.1,v:.65,r:60}]}],
 [180.1,'Lower Lava',4,'Still white water. Keep it straight.'],
 [188.3,'Whitmore',3,'Riffle at Whitmore Wash.'],
 [205.6,'205 Mile (Kolb)',6,'Big waves. Named for the Kolb brothers, who filmed their trip in 1911.'],
 [209.2,'209 Mile',5,'A big hole on the left at some water levels. Run right.',{line:[.3,.3,.2],haz:[{t:'hole',u:-.35,v:.4,p:1.2,s:1.4,n:'209 Hole'}]}],
 [212.5,'Little Bastard',3,'Small but tricky.'],
 [217.8,'217 Mile',5,'Big waves.'],
 [223.7,'224 Mile',3,'Riffle.']
];
const GC_POIS=[
 {id:'gc-lees',m:0,k:'hist',side:1,n:'Lees Ferry',scene:'town',page:{sub:'Mile 0 of the Grand Canyon',body:[
   'Every Grand Canyon river mile is counted from here. Lees Ferry is the one place for many miles where you can drive down to the river.',
   'In the early 1870s John D. Lee started a ferry here. For about 60 years it was the main way to cross the Colorado River in this area, until Navajo Bridge opened in 1929.',
   'The water comes from the bottom of Lake Powell, through Glen Canyon Dam about 15 miles upstream. That is why it is clear, green and very cold, about 50°F, even in summer.',
   'Rangers check every trip here: life jackets, the groover, the fire pan. Then the river carries you into Marble Canyon.']}},
 {id:'gc-navajo',m:4.2,k:'hist',side:1,n:'Navajo Bridges',scene:'bridge',txt:'Two bridges cross high above you. The old one opened in 1929. The new one, built in 1995, carries the highway. Look for California condors on the steel.'},
 {id:'gc-badger',m:7.8,k:'geo',side:-1,n:'Why rapids form',scene:'rapid',txt:'Badger Creek and Jackass Creek come in from both sides here. Flash floods wash boulders out of side canyons and build "debris fans." The fans narrow the river and make rapids. Almost every rapid in the canyon formed this way.'},
 {id:'gc-brown',m:12.1,k:'hist',side:1,n:'Brown\'s Riffle',scene:'canyon',txt:'In 1889 Frank M. Brown, leader of a railroad survey, drowned near here. His men carved a note on the wall. The survey had no life jackets.'},
 {id:'gc-roar',m:20.4,k:'nat',side:-1,n:'The Roaring Twenties',scene:'rapid',txt:'From mile 20 to 27 the rapids come one after another. Boatmen call this the Roaring Twenties.'},
 {id:'gc-25',m:25.0,k:'hist',side:1,n:'Peter Hansbrough',scene:'canyon',txt:'In 1889 two more members of the Brown survey, Peter Hansbrough and Henry Richards, drowned near 25 Mile. The survey gave up soon after.'},
 {id:'gc-stanton',m:32.0,k:'hist',side:1,n:'Stanton\'s Cave',scene:'cavern',txt:'Robert Brewster Stanton\'s survey stored gear in this cave in 1889. Scientists later found split-twig animal figurines inside that are about 4,000 years old.'},
 {id:'gc-vasey',m:32.2,k:'nat',side:1,n:'Vasey\'s Paradise',scene:'spring',stop:'view',txt:'Springs gush out of the Redwall limestone and make a hanging garden of green plants on the cliff. Powell named it for the botanist George Vasey. Watch for poison ivy!'},
 {id:'gc-redwall',m:33.3,k:'geo',side:-1,n:'Redwall Cavern',scene:'cavern',stop:'lunch',page:{sub:'Mile 33 · a huge cave carved by the river',body:[
   'The river has carved a giant room into the base of the Redwall limestone. John Wesley Powell guessed it could seat 50,000 people. He was wrong, but it is still huge.',
   'The Redwall limestone is about 340 million years old. It formed at the bottom of a warm, shallow sea. Look for fossil shells and corals in the rock.',
   'The red color is only a stain. Iron from the red layers above washes down and paints the gray limestone.',
   'Camping is not allowed in the cavern, but most trips stop to play frisbee on the sand.']}},
 {id:'gc-nautiloid',m:35.0,k:'geo',side:-1,n:'Nautiloid Canyon',scene:'canyon',stop:'hike',txt:'In the floor of this side canyon you can see fossils of nautiloids, squid-like animals with long cone shells. They lived about 500 million years ago.'},
 {id:'gc-dam',m:39.7,k:'hist',side:1,n:'Marble Canyon dam site',scene:'dam',txt:'In the 1950s and 60s engineers drilled test holes here for a dam. Public protest stopped it. One famous newspaper ad asked: should we also flood the Sistine Chapel so tourists can get nearer the ceiling?'},
 {id:'gc-nank',m:52.6,k:'art',side:1,n:'Nankoweap Granaries',scene:'granary',stop:'hike',page:{sub:'Mile 53 · Ancestral Puebloan food storage',body:[
   'High on the cliff above Nankoweap Creek are small stone rooms with square doors. About 900 years ago, Ancestral Puebloan farmers stored corn, beans and seeds in them, away from water and animals.',
   'A steep trail climbs about 700 feet to the granaries. From there you get one of the most famous views in the Grand Canyon: the river curving south between red walls.',
   'People farmed the wide delta at the mouth of the creek. The dry, high granaries kept the harvest safe through the winter.',
   'Do not enter or touch the walls. Many people visit every year, and the granaries are fragile.']}},
 {id:'gc-lcr',m:61.7,k:'nat',side:-1,n:'Little Colorado River',scene:'turquoise',stop:'swim',page:{sub:'Mile 61.7 · the blue river',body:[
   'When it is not flooding, the Little Colorado River is a bright turquoise blue. Calcium carbonate from springs upstream colors the water and builds travertine ledges.',
   'River runners float down its small rapids in their life jackets, like a water park. The water is warmer than the cold main river.',
   'Upstream is the Sipapu, a sacred place for the Hopi people, who say their ancestors came into this world there.',
   'The endangered humpback chub, a fish found only in the Colorado River system, spawns here.']}},
 {id:'gc-unkar',m:72.6,k:'art',side:1,n:'Unkar Delta',scene:'ruin',stop:'hike',txt:'On this wide delta, Ancestral Puebloan people built houses and farmed corn about 1,000 years ago. You can still see room outlines and broken pottery. Leave everything where it lies.'},
 {id:'gc-hance',m:76.8,k:'hist',side:-1,n:'John Hance',scene:'rapid',txt:'Hance Rapid is named for John Hance, a miner and early tour guide famous for his tall tales. He claimed he dug the Grand Canyon himself.'},
 {id:'gc-vishnu',m:77.6,k:'geo',side:1,n:'Vishnu Schist',scene:'canyon',txt:'You are now in the Upper Granite Gorge. The black rock is Vishnu Schist, about 1.7 billion years old. The pink stripes are Zoroaster granite that melted its way in.'},
 {id:'gc-sock',m:78.9,k:'hist',side:-1,n:'Sockdolager',scene:'rapid',txt:'Powell\'s 1869 crew named this rapid. "Sockdolager" was old slang for a knockout punch.'},
 {id:'gc-clear',m:84.6,k:'nat',side:1,n:'Clear Creek',scene:'spring',stop:'hike',txt:'A side creek with a waterfall a short hike up. Its clear water is a big change from the river.'},
 {id:'gc-phantom',m:87.7,k:'hist',side:1,n:'Phantom Ranch',scene:'lodge',stop:'lunch',page:{sub:'Mile 88 · the only lodge at the bottom of the Grand Canyon',body:[
   'Phantom Ranch was designed by the architect Mary Colter and opened in 1922. You can only get here on foot, by mule or by boat.',
   'Mules still carry the mail. Letters sent from here get a stamp that says "Mailed by Mule from the Bottom of the Canyon." Buy lemonade and postcards at the canteen.',
   'The Black Bridge (Kaibab Suspension Bridge) opened in 1928. Its long steel cables were carried down the trail on the shoulders of Havasupai men.',
   'Many trips change passengers here. People hike out on the Bright Angel Trail, about 10 miles and 4,400 feet up, and new people hike in.']}},
 {id:'gc-horn',m:90.6,k:'warn',side:1,n:'Horn Creek',scene:'rapid',txt:'Two rocks called the Horns sit at the top of Horn Creek Rapid. At low water this is one of the hardest rapids in the canyon.'},
 {id:'gc-hermit',m:95.3,k:'nat',side:-1,n:'Hermit\'s waves',scene:'rapid',txt:'Hermit Rapid has a long train of huge standing waves. Boatmen talk about "the fifth wave," the biggest one. Ride it straight and you will fly.'},
 {id:'gc-boucher',m:96.9,k:'hist',side:-1,n:'Louis Boucher',scene:'canyon',txt:'Louis Boucher, a miner with a white beard, lived alone near here around 1900. People called him "the Hermit," and Hermit Creek is named for him.'},
 {id:'gc-crystal',m:97.6,k:'hist',side:1,n:'Crystal: a young rapid',scene:'rapid',page:{sub:'Mile 98 · made by a flood in 1966',body:[
   'Before 1966 Crystal was a small riffle. Then a huge flash flood came down Crystal Creek on river right and pushed a fan of boulders into the river. Overnight it became one of the hardest rapids in the canyon.',
   'In 1983 heavy snowmelt filled Lake Powell, and Glen Canyon Dam had to release about 90,000 cubic feet per second. At that flow Crystal Hole grew enormous and flipped many boats.',
   'This shows how rapids form: side-canyon floods drop boulders, and the river slowly works to move them.',
   'The classic run stays right of the hole, then pulls away from the rock garden on the left.']}},
 {id:'gc-gems',m:100.6,k:'hist',side:-1,n:'The Gems',scene:'canyon',txt:'Early river runners named the next rapids for gemstones: Agate, Sapphire, Turquoise, Emerald and Ruby.'},
 {id:'gc-bass',m:108.6,k:'hist',side:1,n:'William Bass',scene:'cabin',stop:'hike',txt:'William Bass guided tourists here around 1900. He built a trail and strung a cable across the river near mile 109 to bring guests to his camp on Shinumo Creek.'},
 {id:'gc-elves',m:117.2,k:'nat',side:-1,n:'Elves Chasm',scene:'spring',stop:'swim',page:{sub:'Mile 116.5 · ferns, moss and a waterfall',body:[
   'A short scramble from the river leads to a pool under a waterfall. Maidenhair ferns, moss and red monkeyflowers cover the travertine walls.',
   'The water comes from springs high in the limestone. It is much warmer than the river.',
   'Many people climb behind the falls and jump into the pool. Be careful: the rock is slick.',
   'It is one of the most loved stops on the whole trip.']}},
 {id:'gc-blacktail',m:120.6,k:'geo',side:1,n:'The Great Unconformity',scene:'canyon',stop:'hike',page:{sub:'Mile 120.6 · Blacktail Canyon',body:[
   'In Blacktail Canyon you can put your hand on a line in the rock where more than one billion years of history are missing.',
   'Below the line is ancient Vishnu Schist and granite. Directly on top sits the Tapeats Sandstone, about 525 million years old. The layers that were in between wore away before the sandstone formed.',
   'Geologists call this the Great Unconformity. John Wesley Powell described it in 1869.',
   'The narrow canyon also has great echoes. Many guides sing here.']}},
 {id:'gc-thunder',m:134.4,k:'nat',side:1,n:'Thunder River',scene:'spring',txt:'Up Tapeats Creek, Thunder River bursts out of a cave in the cliff. At about half a mile long, it is one of the shortest rivers in the world.'},
 {id:'gc-narrows',m:135.6,k:'geo',side:-1,n:'Granite Narrows',scene:'canyon',txt:'The narrowest place on the river in the Grand Canyon: only about 76 feet wide. All the water squeezes through.'},
 {id:'gc-deer',m:136.9,k:'nat',side:1,n:'Deer Creek Falls',scene:'spring',stop:'swim',page:{sub:'Mile 136 · a waterfall into the river',body:[
   'Deer Creek pours out of a narrow slot high on the cliff and falls straight down near the river. The spray and the wind under the falls feel amazing on a hot day.',
   'A trail climbs to the Deer Creek Narrows above the falls. Look for old handprint pictographs along the way. Do not touch them.',
   'Above the narrows is the Patio, a shady place where the creek runs over flat rock.',
   'The trail along the narrows is very exposed. Stay on it.']}},
 {id:'gc-kanab',m:143.5,k:'hist',side:1,n:'Kanab Creek',scene:'canyon',txt:'Powell\'s second expedition ended its trip here in 1872. He decided the river below was too dangerous for his boats.'},
 {id:'gc-matkat',m:148.4,k:'nat',side:-1,n:'Matkatamiba',scene:'canyon',stop:'hike',txt:'A short, narrow slot canyon. You climb up with your hands and feet pressed on both walls, then find a big amphitheater of stone.'},
 {id:'gc-havasu',m:157.2,k:'nat',side:-1,n:'Havasu Creek',scene:'turquoise',stop:'swim',page:{sub:'Mile 157 · Havasupai land',body:[
   'Havasu Creek is famous for its blue-green water and travertine pools. The color comes from minerals in the spring water and sunlight on the white bottom.',
   'The Havasupai, "people of the blue-green water," have lived in this canyon for hundreds of years. Their village of Supai is upstream.',
   'Boats tie up in the narrow mouth of the creek. It is tight, so trips take turns.',
   'Never enter if the creek looks brown or the sky is stormy. Flash floods come fast here.']}},
 {id:'gc-national',m:166.8,k:'nat',side:1,n:'National Canyon',scene:'canyon',txt:'National Canyon has smooth, gray limestone narrows. In summer the monsoon can send flash floods down it.'},
 {id:'gc-toro',m:176.5,k:'geo',side:1,n:'Toroweap Overlook',scene:'canyon',txt:'Look up at the north rim. Toroweap Overlook sits about 3,000 feet straight above the river.'},
 {id:'gc-anvil',m:177.7,k:'geo',side:-1,n:'Vulcan\'s Anvil',scene:'volcano',page:{sub:'Mile 178 · a volcanic neck in the river',body:[
   'The dark tower in the middle of the river is Vulcan\'s Anvil. It is the hard core of an old volcano, worn down by the river.',
   'Many times in the last million years, lava poured over the canyon rim here and flowed into the river. Some lava dams blocked the Colorado and made lakes behind them. The river cut through every dam.',
   'For some Native people this rock is a sacred place. River guides ask people not to touch it.',
   'When you pass the Anvil, you can hear Lava Falls. It is about one mile ahead.']}},
 {id:'gc-lavascout',m:179.4,k:'warn',side:-1,n:'Lava Falls scout',scene:'crowd',stop:'view',txt:'Boats stop on the left to scout. Lava formed where Prospect Canyon pushed a debris fan into the river. Many people say it is the biggest rapid they will ever run.'},
 {id:'gc-whitmore',m:187.4,k:'town',side:-1,n:'Whitmore Helipad',scene:'heli',txt:'Many trips change passengers here. A helicopter flies people up to a ranch on the rim. Listen for it echo off the walls.'},
 {id:'gc-kolb',m:205.4,k:'hist',side:1,n:'The Kolb brothers',scene:'canyon',txt:'In 1911 Emery and Ellsworth Kolb rowed and filmed the whole canyon. They showed the film at the South Rim for decades.'},
 {id:'gc-pumpkin',m:213.3,k:'geo',side:1,n:'Pumpkin Spring',scene:'turquoise',stop:'view',txt:'A round, orange travertine bowl holds a green spring pool. It looks inviting, but the water has arsenic in it. Look, do not drink or swim.'},
 {id:'gc-diamond',m:225.6,k:'town',side:-1,n:'Diamond Creek',scene:'takeout',txt:'Take-out on river left. A rough road climbs Hualapai land to Peach Springs. In 1884 the Farlee Hotel opened here, the first hotel in the Grand Canyon.'}
];
const GC_CAMPS=[[5.0,'5 Mile',1],[11.3,'Soap Creek',1],[16.6,'Hot Na Na',-1],[20.8,'Lower North Canyon',1],[23.5,'Lone Cedar',-1],[29.5,'Shinumo Wash',-1],[31.9,'South Canyon',1],[35.1,'Nautiloid',-1],[38.7,'Marthas',-1],[41.2,'Buck Farm',1],[45,'Willie Taylor',-1],[47.7,'Lower Saddle',1],[50.1,'Dinosaur',1],[53.4,'Main Nankoweap',1],[56.6,'Kwagunt',1],[58.6,'Awatubi',1],[62.2,'Below LCR',1],[65.1,'Carbon',1],[66.1,'Palisades',-1],[68.7,'Tanner',1],[71.6,'Cardenas',-1],[74.2,'Below Granary',-1],[76.1,'Nevills',-1],[81.7,'Grapevine',-1],[84.6,'Clear Creek',1],[87.7,'Lower Cremation',-1],[91.7,'91 Mile Creek',1],[93.8,'Granite',-1],[95.4,'Hermit',-1],[97.2,'Boucher',-1],[100.1,'Lower Tuna',-1],[103.4,'New Shady Grove',1],[108.3,'Ross Wheeler',-1],[109,'Bass',1],[115.1,'Lower Garnet',1],[119.4,'Big Dune',1],[122.8,'122 Mile Canyon',-1],[125.5,'Fossil',-1],[132.5,'Stone Creek',1],[134.4,'Lower Tapeats',1],[137.7,'Football Field',-1],[143.9,'Above Kanab',-1],[148.9,'Matkat Hotel',-1],[152.1,'Ledges',1],[158.3,'First Chance',1],[165.2,'Tuckup',1],[168.6,'Fern Glen',1],[172.1,'Mohawk',-1],[174.8,'Lower Cove',1],[177.6,'Honga Spring',-1],[180.1,'Below Lower Lava',1],[182.9,'Lower Chevron',1],[186,'Lower 185 Mile',1],[188.7,'Lower Whitmore',1],[192.3,'Fat City',-1],[194.6,'Hualapai Acres',-1],[198.9,'Parashant',1],[202.9,'203 Mile',1],[207,'Indian Canyon',-1],[209.8,'209.8 Mile',-1],[213.1,'213.1 Mile',1],[216.1,'Opposite 3 Springs',1],[220.1,'Middle 220 Mile',1],[222.2,'222 Mile',-1]];
const GC_SEASON='Late October: the motor season is over. Oar trips run in cool weather with short days. The water from Glen Canyon Dam stays cold, around 50°F.';
function gcSection(o){
  const a=o.start,b=o.end;
  return Object.assign({river:'Colorado River, Arizona',scale:'gc',speed:125,cfs:[8000,14000,24000,45000],sky:'#a8d0ea',season:GC_SEASON,zones:GC_ZONES.filter((z,i)=>(GC_ZONES[i+1]?GC_ZONES[i+1].m:999)>a&&z.m<b),
    rapids:GC_RAPIDS.filter(r=>r[0]>a+.3&&r[0]<b-.5).map(([m,n,c,beta,x])=>Object.assign({n,m,c,beta},x||{})),
    pois:GC_POIS.filter(p=>p.m>=a&&p.m<=b),camps:GC_CAMPS.filter(c=>c[0]>a+1&&c[0]<b-1).map(([m,n,side])=>({n:n+' Camp',m,side})),
    bridges:[{n:'Navajo Bridges',m:4.4,high:true,double:true},{n:'Black Bridge',m:87.6,high:true},{n:'Silver Bridge',m:87.9,high:true}].filter(x=>x.m>a&&x.m<b),
    marks:[{n:"Vulcan's Anvil",m:178.1,u:-.05,r:30}].filter(x=>x.m>a&&x.m<b),
    crowds:[{m:179.5,side:-1,count:26,spread:180,label:'Scouting trips'},{m:88,side:1,count:14,spread:140,label:'Hikers at Phantom'}].filter(x=>x.m>a&&x.m<b)},o,{width:(GC_ZONES.filter(z=>z.m<=a).pop()||GC_ZONES[0]).width,wallH:(GC_ZONES.filter(z=>z.m<=a).pop()||GC_ZONES[0]).wallH,pal:(GC_ZONES.filter(z=>z.m<=a).pop()||GC_ZONES[0]).pal});
}

const RIVERS=[
/* ---------------- RUBY-HORSETHIEF ---------------- */
{id:'ruby',name:'Ruby-Horsethief Canyons',river:'Colorado River, Colorado → Utah',stretch:'Loma → Westwater Ranger Station',start:0,end:25,scale:'intl',width:560,speed:85,
 cfs:[3000,8000,20000,30000],wallH:360,sky:'#a8cfe8',wind:.6,days:3,
 season:'Late October: calm, low fall flows, cool nights and gold cottonwoods. Afternoon upstream wind is common.',
 blurb:'A gentle float through red sandstone, with arches, side hikes and the black rock of Black Rocks.',
 pal:{wall:'#b4522e',wall2:'#8d3c21',strata:'#d27a4b',sand:'#e1c48f',water:'#5f7a5a',veg:'#7f8f45',rock:'#7b4e3a'},
 rapids:[
  {n:'Black Rocks',m:16.3,c:'II',fan:-1,beta:'The river turns hard left into black rock. Boils and swirls for about a mile. Big boulders in the middle. Far left misses most of it.',line:[-.3,-.35,-.2],haz:[{t:'rock',u:.25,v:.5,r:36,n:'Black Rocks'}]}],
 pois:[
  {id:'ruby-loma',m:0,k:'town',side:1,n:'Loma Boat Launch',txt:'Put-in just off I-70 near Loma, Colorado. You float through the McInnis Canyons National Conservation Area. Most people take two days and one night.'},
  {id:'ruby-name',m:1.4,k:'geo',side:-1,n:'Ruby Canyon',txt:'Ruby Canyon is named for its ruby-red sandstone cliffs. Look for swallow nests under the overhangs.'},
  {id:'ruby-arch',m:3.2,k:'geo',side:-1,n:'Rattlesnake Canyon',txt:'Up this side canyon is the second-largest group of natural arches in the world, after Arches National Park. It is a long, hard hike from the river.'},
  {id:'ruby-rail',m:4.6,k:'hist',side:1,n:'Horsethief Canyon & the railroad',txt:'From here the railroad follows the river to Westwater. Amtrak\'s California Zephyr runs this line. Local legend says horse thieves used this canyon to move stolen horses between Colorado and Utah.'},
  {id:'ruby-salt',m:7.9,k:'nat',side:-1,n:'Salt Creek',txt:'A quiet, grassy landing with some shade. Watch for herons and bighorn sheep on the slopes.'},
  {id:'ruby-mee',m:13.6,k:'nat',side:-1,n:'Mee Canyon',txt:'Mee Canyon is the best side hike on this stretch. Most people walk a couple of miles up and back.'},
  {id:'ruby-black',m:15.9,k:'geo',side:-1,n:'Black Rocks',txt:'Here the river cuts into black metamorphic rock about 1.7 billion years old, much older than the red sandstone above it. The rock makes boils and whirlpools.'},
  {id:'ruby-picto',m:17.2,k:'art',side:1,n:'Pictograph canyon',txt:'Pull in under the railroad bridge for a 20-minute walk to old pictographs. Look, but do not touch. Skin oils damage rock art.'},
  {id:'ruby-knowles',m:18.3,k:'nat',side:-1,n:'Knowles Canyon',txt:'Knowles Canyon is a long side canyon with good hiking.'},
  {id:'ruby-utah',m:20.6,k:'town',side:1,n:'Utah state line',txt:'Welcome to Utah. The canyon opens up as you come near Westwater.'},
  {id:'ruby-ww',m:24.8,k:'town',side:1,n:'Westwater Ranger Station',txt:'Take-out on river right. This is also the put-in for Westwater Canyon, the next canyon downstream.'}],
 camps:[{n:'Rattlesnake Camp',m:3.3,side:-1},{n:'Cottonwood Camp',m:5.9,side:-1},{n:'Salt Creek Camp',m:8.0,side:-1},{n:'Fault Line Camp',m:10.4,side:-1},
  {n:'Mee Camp',m:13.1,side:-1},{n:'Dog Island',m:14.7,side:1},{n:'Black Rocks Camp',m:17.0,side:-1},{n:'Knowles Camp',m:18.4,side:-1},{n:'May Flats',m:20.3,side:1}],
 bridges:[{n:'Railroad bridge',m:17.25,rail:true}]},

/* ---------------- SAN JUAN UPPER ---------------- */
{id:'sj-upper',name:'San Juan: Sand Island → Mexican Hat',river:'San Juan River, Utah',stretch:'Sand Island (Bluff) → Mexican Hat',start:0,end:27,scale:'intl',width:470,speed:105,
 cfs:[700,3000,8000,15000],wallH:420,sky:'#a9cfe9',wind:.4,days:3,
 season:'Late October: low, clear fall flows, quiet camps and cold nights. Navajo Nation on river left.',
 blurb:'Ancestral Puebloan ruins, rock art and Comb Ridge. River House Ruin is a highlight.',
 pal:{wall:'#c07a45',wall2:'#9a5a30',strata:'#e0a56a',sand:'#e6cf9e',water:'#8f7550',veg:'#7d8f45',rock:'#8a6248'},
 rapids:[
  {n:'Eight Foot Rapid',m:16.0,c:'II+',fan:-1,beta:'Go to the right of the big boulder.',line:[.3,.35,.2],haz:[{t:'rock',u:-.2,v:.45,r:40,n:'Big boulder'}]},
  {n:'Ledge Rapid',m:19.0,c:'II',beta:'A rocky ledge across the river. Find the slot and keep it straight.'}],
 pois:[
  {id:'sj-sand',m:0,k:'town',side:1,n:'Sand Island & Bluff',txt:'Put-in at Sand Island, a few miles from the town of Bluff, Utah. Pioneers of the Hole-in-the-Rock Expedition founded Bluff in 1880. A large petroglyph panel sits near the ramp.'},
  {id:'sj-navajo',m:3,k:'hist',side:-1,n:'Navajo Nation',txt:'River left is the Navajo Nation. You need a Navajo Nation permit to hike or camp on that side.'},
  {id:'sj-butler',m:4.2,k:'art',side:1,n:'Butler Wash panel',txt:'One of the best rock art panels on the San Juan, with tall human figures. Look, but do not touch.'},
  {id:'sj-rh',m:5.9,k:'art',side:1,n:'River House Ruin',page:{sub:'Ancestral Puebloan village · about 900 to late 1200s A.D.',body:[
   'River House sits under a sandstone cliff on the west side of Comb Ridge, about 12 miles southwest of Bluff. Ancestral Puebloan people lived here from about 900 A.D. until the late 1200s.',
   'The site has a kiva (a round room for ceremonies) and several one- and two-story rooms. Along the base of the cliff there are pictographs and hundreds of petroglyphs. See if you can find the Kokopelli figure.',
   'In 1879–80 Mormon pioneers of the Hole-in-the-Rock Expedition passed close by on their way over San Juan Hill.',
   'How to visit with respect: take photos, but do not touch walls or rock art. Stay on the path. Do not move rocks, build rock piles or use chalk. This place belongs to the descendants of the people who built it.']}},
  {id:'sj-comb',m:7.4,k:'hist',side:1,n:'Comb Ridge & San Juan Hill',txt:'Comb Ridge is a long wall of tilted sandstone. Pioneers in 1880 dragged their wagons up San Juan Hill. Look for steps cut for horses and a pioneer inscription.'},
  {id:'sj-chinle',m:10.0,k:'nat',side:-1,n:'Chinle Wash',txt:'Chinle Wash comes in from the Navajo Nation on river left. After rain it can turn the river red-brown with mud.'},
  {id:'sj-chim',m:18.0,k:'hist',side:1,n:'Soda Basin chimney',txt:'An old stone chimney and foundation stand here. People came to this area to look for oil and gold.'},
  {id:'sj-hat',m:26.0,k:'geo',side:1,n:'Mexican Hat rock',txt:'The town takes its name from a balanced rock that looks like an upside-down sombrero.'},
  {id:'sj-town',m:26.6,k:'town',side:1,n:'Mexican Hat',txt:'Take-out on the left side of the US-163 bridge. Mexican Hat is a small town at the edge of the Navajo Nation.'}],
 camps:[{n:'River House Camp',m:6.1,side:1},{n:'Comb Ridge Camp',m:7.7,side:1},{n:'Chinle Camp',m:10.1,side:-1},{n:'14.9 Camp',m:14.9,side:-1},
  {n:'Lower Eight Foot Camp',m:16.6,side:-1},{n:'Ledge Camp',m:19.4,side:-1},{n:'25 Mile Camp',m:25,side:-1}],
 bridges:[{n:'US-163 bridge',m:26.8}],
 towns:[{n:'Mexican Hat',m:26.4,side:1}]},

/* ---------------- GRAY CANYON ---------------- */
{id:'gray',name:'Gray Canyon',river:'Green River, Utah',stretch:'Nefertiti → Swasey\'s',start:75,end:84.3,scale:'intl',width:520,speed:95,
 cfs:[2000,6000,15000,25000],wallH:380,sky:'#a8cfe8',wind:.4,days:2,
 season:'Late October: low fall flows, cold nights, very few other boats.',
 blurb:'The last miles of Desolation-Gray. A good place to learn.',
 pal:{wall:'#b88a55',wall2:'#93693e',strata:'#d3a873',sand:'#e3cc9c',water:'#7b6a4c',veg:'#7f8f45',rock:'#8a7058'},
 rapids:[
  {n:'Nefertiti Rapid',m:75.6,c:'II',beta:'Rocky entry. Find the smooth tongue and stay in the main current.'},
  {n:'Butler Canyon Riffle',m:79.4,c:'II',beta:'Easy waves. Practice keeping the boat straight.'},
  {n:'Swasey Rapid',m:83.6,c:'II+',beta:'Last rapid before the take-out. Rocks near the left shore.'}],
 pois:[
  {id:'gray-ws',m:75.2,k:'nat',side:1,n:'Wild & Scenic Green River',txt:'In 2019, 14 miles of the Green River in Gray Canyon became part of the National Wild & Scenic Rivers System.'},
  {id:'gray-price',m:78.6,k:'nat',side:1,n:'Price River',txt:'The Price River comes in on river right near here, after a long trip down from the Wasatch Plateau.'},
  {id:'gray-swasey',m:84,k:'town',side:-1,n:'Swasey\'s Beach',txt:'Take-out on river left. The town of Green River is about 12 miles away. It is famous for melons and the John Wesley Powell River History Museum.'}],
 camps:[{n:'Price River Camp',m:78.9,side:1},{n:'Butler Camp',m:79.8,side:-1},{n:'Swasey\'s Rock Camp',m:82.2,side:-1}]},

/* ---------------- DESOLATION + GRAY ---------------- */
{id:'deso',name:'Desolation & Gray Canyons',river:'Green River, Utah',stretch:'Sand Wash → Swasey\'s (84 miles)',start:0,end:84.3,scale:'intl',width:520,speed:100,
 cfs:[2000,7000,18000,30000],wallH:620,sky:'#a6cdea',wind:.5,days:5,
 season:'Late October: low flows, cold nights, golden cottonwoods. You may have the canyon to yourself.',
 blurb:'A deep, wild canyon with Fremont rock art, old ranches and dozens of fun rapids.',
 pal:{wall:'#b07c4c',wall2:'#8a5d36',strata:'#cfa171',sand:'#e1c99a',water:'#7d6a4b',veg:'#7f8f45',rock:'#866a52'},
 rapids:[
  {n:'Firewater Rapid',m:30.5,c:'II',beta:'Easy waves. Moonshiners once hid stills in this canyon.'},
  {n:'Steer Ridge',m:39.5,c:'II+',beta:'Rocks on both sides. Thread the middle.'},
  {n:'Joe Hutch Creek',m:54.5,c:'II+',beta:'Rocky. Watch for the holes along the edges.'},
  {n:'Cow Swim',m:55.5,c:'II',beta:'Wave train. Keep it straight.'},
  {n:'Wire Fence',m:59,c:'II+',beta:'Rocks at the bottom. Big beach below.'},
  {n:'Three Fords',m:59.5,c:'III',beta:'Tricky, especially for small boats. Holes on the left. Run right of center.',line:[.25,.3,.15],haz:[{t:'hole',u:-.35,v:.45,p:1,s:1.4,n:'Three Fords Hole'}]},
  {n:'Range Creek',m:64.5,c:'II+',beta:'Fast water with a few rocks.'},
  {n:'Coal Creek',m:70,c:'III',beta:'Watch for the "Thunderous Hole." Stay away from it.',line:[.3,.3,.1],haz:[{t:'hole',u:-.2,v:.4,p:1.2,s:1.6,n:'Thunderous Hole'}]},
  {n:'Rattlesnake',m:73,c:'II+',beta:'Rocks on the right.'},
  {n:'Nefertiti Rapid',m:75.6,c:'II',beta:'Rocky entry. Follow the tongue.'},
  {n:'Swasey Rapid',m:83.6,c:'II+',beta:'Last rapid. Take-out is just below on the left.'}],
 pois:[
  {id:'deso-sand',m:0,k:'hist',side:1,n:'Sand Wash',page:{sub:'Put-in · Hank Stewart\'s sheep ferry',body:[
   'Sand Wash is a dirt boat ramp about 100 miles from the town of Green River. Almost every Desolation trip starts here.',
   'In the 1920s, Henry "Hank" Stewart ran a ferry here. It moved sheep between summer and winter ranges. Up to 45,000 sheep crossed each year, about 50 per trip. Stewart charged 3 cents a sheep and 1 dollar a wagon. His best year made $2,700.',
   'Stewart took his cabin apart in Ouray, labeled the logs, and hauled them about 35 miles over the frozen river. You can still visit the cabin. Spring floods have filled it with layers of mud.',
   'He was a friend of Butch Cassidy\'s gang, spoke the Ute language, rowed on river surveys and carried the mail. The ferry ran until 1952.']}},
  {id:'deso-ute',m:4,k:'hist',side:-1,n:'Ute homeland',txt:'For many miles, the east shore is part of the Uintah and Ouray Reservation, homeland of the Ute Tribe.'},
  {id:'deso-uinta',m:10,k:'geo',side:1,n:'Lake Uinta',txt:'These cliffs are the Green River Formation. About 50 million years ago a huge lake, Lake Uinta, laid down this rock layer by layer.'},
  {id:'deso-fremont',m:19,k:'art',side:1,n:'Fremont rock art',txt:'The Fremont people farmed these river bottoms around 900 A.D. and built granaries. Look for pictographs near Jack Creek and figures with headdresses in Flat Canyon.'},
  {id:'deso-light',m:25,k:'hist',side:-1,n:'Lighthouse Rock',txt:'John Wesley Powell\'s 1869 expedition made the first known boat trip through here and named the canyon "Desolation." Many river runners think the name is unfair.'},
  {id:'deso-fire',m:30.4,k:'hist',side:-1,n:'Firewater Canyon',txt:'During Prohibition (after 1920), moonshining was a big local trade. Stills were hidden up side canyons like this one.'},
  {id:'deso-steer',m:39.4,k:'hist',side:1,n:'Steer Ridge',txt:'The Seamount brothers brought supplies to their ranch at Rock Creek down this side canyon.'},
  {id:'deso-rock',m:42.3,k:'hist',side:1,n:'Rock House · Rock Creek Ranch',page:{sub:'River right · Seamount family homestead · private property',body:[
   'Rock Creek is the only place in Desolation Canyon where white homesteaders lived for a long time.',
   'Around 1905 the Seamount brothers, Dan and Bill, bought the ranch from Shed Lunt. They built log and stone buildings, the "rock houses," and some still stand today. They used water from Rock Creek to grow alfalfa and gardens.',
   'About 2.5 miles up Rock Creek there is a Fremont pictograph panel. Fresh, clear water runs in the creek all year.',
   'Today the ranch is private property. Do not camp at the ranch, and leave everything as you found it.']}},
  {id:'deso-mcp',m:56.4,k:'hist',side:-1,n:'McPherson Ranch',page:{sub:'River left · Florence Creek · started 1887',body:[
   'In 1887 Jim McPherson and his uncles started the first ranch in the canyon, at Florence Creek. For more than forty years McPherson ran what one historian calls a "model operation."',
   'Ranchers came for the bunch grass and for water from side creeks like Nine Mile, Rock Creek and Florence Creek. They irrigated alfalfa and gardens in the river bottoms.',
   'Sheepmen used ferries to move flocks between winter range on the Pariette Bench and summer range on the East Tavaputs Plateau.',
   'By 1940 most settlers had left. The Taylor Grazing Act, World War II and new jobs pulled people away. As one writer put it, Desolation went back to its name.']}},
  {id:'deso-range',m:64.3,k:'art',side:1,n:'Range Creek',txt:'Several miles up Range Creek are Fremont ruins and granaries, some of the best-kept Fremont sites anywhere.'},
  {id:'deso-coal',m:69.8,k:'hist',side:1,n:'Coal Creek dam site',txt:'Around 1907 a company drilled the bedrock here to build a dam. It went bankrupt by 1913. Later dam plans failed because the rock is crumbly and the place is so remote.'},
  {id:'deso-ws',m:72,k:'nat',side:1,n:'Wild & Scenic',txt:'In 2019 Congress made a new Desolation Canyon Wilderness of about 143,000 acres, and 14 miles of Gray Canyon became Wild & Scenic.'},
  {id:'deso-swasey',m:84,k:'town',side:-1,n:'Swasey\'s Beach',txt:'Take-out on river left. The town of Green River is about 12 miles away.'}],
 camps:[{n:'Mile 9 Camp',m:9,side:1},{n:'Jack Creek Camp',m:19.3,side:1},{n:'Firewater Camp',m:31,side:-1},{n:'Steer Ridge Camp',m:40,side:1},
  {n:'Mile 48 Camp',m:48,side:-1},{n:'Cow Swim Camp',m:55.8,side:-1},{n:'Wire Fence Beach',m:59.25,side:1},{n:'Range Creek Camp',m:64.8,side:1},{n:'Rattlesnake Camp',m:73.3,side:-1},{n:'Price River Camp',m:78.9,side:1}]},

/* ---------------- SAN JUAN LOWER ---------------- */
{id:'sj-lower',name:'San Juan: Mexican Hat → Clay Hills',river:'San Juan River, Utah',stretch:'Mexican Hat → Clay Hills (57 miles)',start:27,end:83.5,scale:'intl',width:440,speed:110,
 cfs:[700,3000,8000,15000],wallH:900,sky:'#a9cfe9',wind:.4,days:5,
 season:'Late October: low flows make Government Rapid rocky. Deep, quiet canyon.',
 blurb:'The Goosenecks, the Honaker Trail and Government Rapid in a 1,000-foot-deep canyon.',
 pal:{wall:'#a8743f',wall2:'#7f522c',strata:'#d29c62',sand:'#e2c99a',water:'#8f7550',veg:'#7d8f45',rock:'#7d5c43'},
 rapids:[
  {n:'Ross Rapid',m:55,c:'II',beta:'Rocky riffle. Pick a line.'},
  {n:'Government Rapid',m:63.5,c:'III',fan:1,beta:'The hardest rapid here. Large rocks can hang up your boat. Start right of center and keep moving.',line:[.25,.2,0],haz:[{t:'rock',u:-.25,v:.4,r:34,n:'Government Rock'}]}],
 pois:[
  {id:'sjl-hat',m:27.2,k:'town',side:1,n:'Mexican Hat put-in',txt:'Put-in below the US-163 bridge. Bring all your drinking water: old mines upstream can affect the water.'},
  {id:'sjl-mend',m:31,k:'hist',side:1,n:'Mendenhall Cabin',txt:'A stone cabin left by an early prospector. Most history on the lower San Juan is about the search for oil and gold.'},
  {id:'sjl-goose',m:35,k:'geo',side:1,n:'The Goosenecks',txt:'The river loops back and forth in deep "entrenched meanders." It travels miles to move a short distance as the raven flies. Look up: Goosenecks State Park is on the rim.'},
  {id:'sjl-hon',m:44.8,k:'hist',side:1,n:'Honaker Trail',txt:'In the 1890s prospectors built a trail down 1,200 feet of cliff to look for gold. The gold rush failed, but geologists still hike it to study the rock layers.'},
  {id:'sjl-gov',m:63.3,k:'warn',side:1,n:'Government Rapid ahead',txt:'The only Class III rapid on the lower San Juan. Scout it from the right.'},
  {id:'sjl-gulch',m:66.5,k:'art',side:-1,n:'Grand Gulch',txt:'Grand Gulch enters here. It holds many Ancestral Puebloan cliff dwellings and rock art panels on Cedar Mesa.'},
  {id:'sjl-clay',m:83.3,k:'town',side:1,n:'Clay Hills',txt:'Take-out at Clay Hills. Lake Powell once backed up near here. The river has since cut through the lake mud.'}],
 camps:[{n:'Upper Honaker Camp',m:44.4,side:1},{n:'Johns Canyon Camp',m:52.3,side:1},{n:'Ross Rapid Camp',m:55.4,side:-1},{n:'Slickhorn Camp',m:66.9,side:1},{n:'Oljeto Camp',m:72,side:-1},{n:'Mile 78 Camp',m:78,side:1}]},

/* ---------------- WESTWATER ---------------- */
{id:'westwater',name:'Westwater Canyon',river:'Colorado River, Utah',stretch:'Westwater Ranger Station → Cisco',start:0,end:17,scale:'intl',width:430,speed:115,
 cfs:[2000,7000,20000,30000],wallH:430,sky:'#a8cfe8',days:2,
 season:'Late October: low water makes Skull and the Room of Doom very technical.',
 blurb:'Black-rock gorge near the Utah line. Short and punchy.',
 pal:{wall:'#2d2a2e',wall2:'#4b3a3a',strata:'#7a4630',sand:'#c9a97c',water:'#7c6648',veg:'#6f7d3c',rock:'#4a4648'},
 rapids:[
  {n:'Marble Canyon',m:4.6,c:'III',beta:'First rapid in the black rock. Waves and a few holes.'},
  {n:'Staircase',m:5.0,c:'III',beta:'A series of small ledges. Keep moving down the steps.'},
  {n:'Big Hummer',m:5.4,c:'III',beta:'Big standing waves. Hit them straight.'},
  {n:'Funnel Falls',m:6.1,c:'IV',beta:'A drop with a hole. Run the smooth tongue on the right.',line:[.25,.3,.1],haz:[{t:'hole',u:-.25,v:.35,p:1.1,s:1.5,n:'The Funnel',pour:true}]},
  {n:'Surprise',m:6.6,c:'III',beta:'Not much warning. Read the water fast.'},
  {n:'Skull',m:7.1,c:'IV',beta:'Big hole in the center. Below, the Room of Doom whirlpool waits on the left. Stay right.',line:[.3,.35,.2],haz:[{t:'hole',u:-.1,v:.35,p:1.2,s:1.4,n:'Skull Hole'},{t:'boil',u:-.6,v:.78,r:70,n:'Room of Doom'}]},
  {n:'Bowling Alley',m:7.4,c:'III',beta:'Rocks like pins. Do not be the ball.'},
  {n:'Sock-It-To-Me',m:7.9,c:'IV',beta:'Big waves and whirlpools. Hit the waves straight.'},
  {n:'Last Chance',m:8.4,c:'III',beta:'Last rapid. Rocks near the end.'}],
 pois:[
  {id:'ww-rs',m:0,k:'town',side:1,n:'Westwater Ranger Station',txt:'Put-in. You need a permit from the BLM. The canyon starts a few miles down.'},
  {id:'ww-miner',m:3.4,k:'hist',side:1,n:'Miner\'s Cabin',txt:'An old cabin from prospecting days sits near the canyon entrance.'},
  {id:'ww-gneiss',m:4.3,k:'geo',side:-1,n:'Black gneiss',txt:'The black rock here is about 1.7 billion years old. It is hard rock, so the river squeezes into a narrow, fast gorge.'},
  {id:'ww-doom',m:7.0,k:'warn',side:-1,n:'The Room of Doom',txt:'Below Skull, a huge eddy on the left can trap boats and swimmers and spin them for a long time. Rowers pull right early.'},
  {id:'ww-cisco',m:16.7,k:'town',side:-1,n:'Cisco Landing',txt:'Take-out near Cisco, a near-ghost town on the old railroad.'}],
 camps:[{n:'Miner\'s Cabin Camp',m:3.3,side:1},{n:'Little Hole Camp',m:10,side:-1},{n:'Mile 13 Camp',m:13,side:1}]},

/* ---------------- CATARACT ---------------- */
{id:'cataract',name:'Cataract Canyon',river:'Colorado River, Utah',stretch:'Confluence → Big Drop 3',start:0,end:16.2,scale:'intl',width:600,speed:115,
 cfs:[5000,20000,50000,70000],wallH:650,sky:'#a6cdea',days:2,
 season:'Late October: low water. The Big Drops are rocky and technical.',
 blurb:'Big desert whitewater below the Green and Colorado confluence. Ends with the Big Drops.',
 pal:{wall:'#c4652f',wall2:'#9e4a22',strata:'#dd8a52',sand:'#e3c38d',water:'#8b6b45',veg:'#7e8c40',rock:'#7d5a42'},
 rapids:[
  {n:'Brown Betty (Rapid 1)',m:4.3,c:'III',beta:'First rapid below the Confluence. Read the tongue and follow it.'},
  {n:'Rapid 5',m:6.4,c:'III',beta:'Wave train with rocks at the edges.'},
  {n:'Rapid 10',m:9.6,c:'III+',beta:'Bigger holes. Push through them straight.'},
  {n:'Mile Long Rapid',m:12.4,c:'IV',beta:'Many rapids in a row. No time to rest.'},
  {n:'Big Drop 1',m:14.3,c:'IV',beta:'The Big Drops start here. Big waves and holes.'},
  {n:'Big Drop 2',m:14.6,c:'V',beta:'Little Niagara: a huge pour-over hole on the right. Stay left.',line:[-.2,-.25,-.1],haz:[{t:'hole',u:.3,v:.4,p:1.5,s:1.6,n:'Little Niagara',pour:true}]},
  {n:'Big Drop 3',m:15.0,c:'V',beta:"Satan's Gut is on the left. Do not go in. Run right of center.",line:[.3,.35,.2],haz:[{t:'hole',u:-.4,v:.45,p:1.6,s:1.8,n:"Satan's Gut"}]}],
 pois:[
  {id:'cat-conf',m:0,k:'geo',side:1,n:'The Confluence',txt:'The Green River and the Colorado River meet here, inside Canyonlands National Park. Below this point the rapids begin.'},
  {id:'cat-spanish',m:3.8,k:'nat',side:1,n:'Spanish Bottom',txt:'A wide flat on river right. A trail climbs to the Doll House, a group of rock towers in the Maze District.'},
  {id:'cat-betty',m:4.1,k:'hist',side:-1,n:'Brown Betty',txt:'This rapid is named for the cook boat of the 1889 Brown-Stanton railroad survey. The boat, the Brown Betty, wrecked here.'},
  {id:'cat-drops',m:14.0,k:'warn',side:1,n:'The Big Drops',txt:'In about a mile the river drops roughly 30 feet. At high water these are some of the biggest rapids in the West.'}],
 camps:[{n:'Spanish Bottom',m:3.9,side:1},{n:'Brown Betty Camp',m:4.7,side:-1},{n:'Mile 8 Camp',m:8,side:1},{n:'Mile 11 Camp',m:11,side:-1},{n:'Big Drop Camp',m:13.6,side:1}]},

/* ---------------- GRAND CANYON SECTIONS (real exits) ---------------- */
gcSection({id:'gc-upper',name:'Grand Canyon: Lees Ferry → Phantom Ranch',stretch:'Mile 0 → 88 (upper half)',start:0,end:88.7,days:6,
 blurb:'Marble Canyon, the Roaring Twenties, Redwall Cavern, Nankoweap, the Little Colorado and the Inner Gorge. Exit at Phantom Ranch.',
 takeout:{n:'Boat Beach, Phantom Ranch',m:88.05,side:1,how:'Passengers hike out the Bright Angel Trail: about 10 miles and 4,400 feet up.',miss:'Next exit: Whitmore helipad, 99 miles and about 40 rapids away, including Horn Creek, Granite, Hermit, Crystal and Lava Falls.'}}),
gcSection({id:'gc-lower',name:'Grand Canyon: Phantom Ranch → Whitmore',stretch:'Mile 88 → 187 (big-water half)',start:87.8,end:188.1,days:7,
 blurb:'Horn Creek, Granite, Hermit, Crystal, the Gems, Elves Chasm, Bedrock, Deer Creek, Havasu and Lava Falls. Exit by helicopter.',
 takeout:{n:'Whitmore Helipad',m:187.5,side:-1,how:'A helicopter flies you to Bar 10 Ranch on the rim.',miss:'Next exit: Diamond Creek, 38 miles down. The helicopter leaves without you.'}}),
gcSection({id:'gc-bottom',name:'Grand Canyon: Whitmore → Diamond Creek',stretch:'Mile 187 → 226 (Lower Gorge)',start:187.2,end:226.5,days:3,
 blurb:'Black lava walls give way to the Lower Granite Gorge. 205 Mile, 209 Mile, Pumpkin Spring and the Diamond Creek take-out.',
 takeout:{n:'Diamond Creek take-out',m:225.8,side:-1,how:'A rough Hualapai road climbs to Peach Springs.',miss:'Below Diamond Creek: Diamond Creek Rapid, then the Lower Gorge and 50 miles to Lake Mead. The Hualapai road is the only way out.'}}),
gcSection({id:'gc-full',name:'Grand Canyon: the full trip',stretch:'Lees Ferry → Diamond Creek (226 miles)',start:0,end:226.5,days:14,expOnly:true,
 blurb:'The whole river: 226 miles, about 70 rapids, two weeks. Expedition only. Your progress saves at every camp.',
 takeout:{n:'Diamond Creek take-out',m:225.8,side:-1,how:'A rough Hualapai road climbs to Peach Springs.',miss:'Below Diamond Creek: Diamond Creek Rapid, then the Lower Gorge and 50 miles to Lake Mead. The Hualapai road is the only way out.'}}),

/* ---------------- GAULEY ---------------- */
{id:'gauley',name:'Upper Gauley',river:'Gauley River, West Virginia',stretch:'Summersville Dam → Bucklick',start:0,end:9.6,scale:'intl',width:400,speed:120,
 cfs:[2000,2800,4500,7000],wallH:280,sky:'#b9d3dc',trees:true,dayOnly:true,
 season:'Gauley Season: fall dam releases on weekends from September into October. Gauley Fest is the third Saturday of September.',
 blurb:'Steep, technical East Coast whitewater. Five Class V rapids. Watch for logs. Crowds at Pillow Rock and Sweet\'s Falls.',
 pal:{wall:'#24401f',wall2:'#355a2c',strata:null,sand:'#8d8a80',water:'#36595c',veg:'#2e6b2f',rock:'#6e6d68'},
 rapids:[
  {n:'Initiation',m:0.9,c:'III+',beta:'A warm-up. Big waves.'},
  {n:'Insignificant',m:1.8,c:'V',beta:'Not small at all. Big holes on the right side. Start left of center.',line:[-.3,-.1,0]},
  {n:'Pillow Rock',m:4.1,c:'V',beta:'A huge boulder on the right piles up water like a pillow. Stay left. Do not let it push you in.',line:[-.1,-.15,0],haz:[{t:'rock',u:.45,v:.5,r:55,n:'Pillow Rock'}]},
  {n:'Lost Paddle',m:5.9,c:'V',beta:'Long rapid in four parts. Many holes and rocks. Keep the boat straight and keep moving.'},
  {n:'Iron Ring',m:7.4,c:'V',beta:'Dangerous rocks and a big hole near the ledge. Choose a clean line.'},
  {n:"Sweet's Falls",m:8.4,c:'V',beta:'A 14-foot drop. You must hit it straight. Hold on.',line:[.2,.2,0],haz:[{t:'hole',u:.05,v:.4,p:1.25,s:3.2,n:"Sweet's Falls",pour:true}]}],
 pois:[
  {id:'gau-dam',m:0,k:'hist',side:1,n:'Summersville Dam',txt:'The Upper Gauley runs below Summersville Dam. In fall the lake is lowered, and the extra water makes "Gauley Season," with big flows on weekends.'},
  {id:'gau-fest',m:0.4,k:'fest',side:-1,n:'Gauley Fest',page:{sub:'Summersville, West Virginia · third Saturday of September',body:[
   'Gauley Fest is called "Woodstock on the water." Thousands of paddlers camp in Summersville, swap stories and buy and sell gear. A big raffle gives away boats.',
   'American Whitewater started the festival in 1983 to celebrate stopping a hydroelectric project that would have ended this river.',
   'On release days, crowds line the banks at Pillow Rock and Sweet\'s Falls. Hundreds of boaters scout and party on the rocks. When someone runs a great line, the noise is deafening. When someone flips, it is even louder.',
   'John Sweet first ran this river in 1968. Sweet\'s Falls is named for him.']}},
  {id:'gau-pillow',m:3.9,k:'fest',side:-1,n:'Pillow Rock crowd',txt:'The crowd on the left bank and on top of the rocks is waiting for you. Pillow Rock is called "the best 10 seconds in whitewater."'},
  {id:'gau-sweet',m:8.2,k:'fest',side:1,n:'Sweet\'s Falls crowd',txt:'The biggest crowd of the day. A couple of thousand people may be watching. Hit it straight!'}],
 camps:[],
 crowds:[{m:4.05,side:-1,count:70,spread:260,label:'Gauley Fest crowd',onRock:true},{m:4.1,side:1,count:30,spread:200},{m:8.35,side:1,count:80,spread:300,label:'Sweet\'s Falls crowd'},{m:8.4,side:-1,count:45,spread:240},{m:5.9,side:-1,count:18,spread:160}]}
];

/* ---------- take-outs, stops and scene types for the other rivers ---------- */
const RIVER_EXTRA={
 ruby:{end:25.7,takeout:{n:'Westwater Ranger Station',m:24.9,side:1,how:'Your shuttle truck waits at the ramp.',miss:'Westwater Canyon starts below: Skull, the Room of Doom and Class IV rapids. You have no permit and no plan.'},
   stops:{'ruby-arch':['hike','arch'],'ruby-mee':['hike','canyon'],'ruby-picto':['view','petro'],'ruby-black':['swim','canyon'],'ruby-salt':['lunch','canyon']},scenes:{'ruby-loma':'town','ruby-rail':'rail','ruby-utah':'canyon','ruby-ww':'takeout','ruby-name':'canyon','ruby-knowles':'canyon'}},
 'sj-upper':{end:27.5,takeout:{n:'Mexican Hat take-out',m:26.7,side:1,how:'Pull out on the left side of the US-163 bridge. Your shuttle waits at the gas station.',miss:'Below the bridge the river enters a 1,000-foot-deep canyon for 57 miles to Clay Hills, with no road out.'},
   stops:{'sj-butler':['view','petro'],'sj-rh':['hike','ruin'],'sj-comb':['hike','canyon'],'sj-chim':['view','cabin']},scenes:{'sj-sand':'petro','sj-navajo':'canyon','sj-chinle':'canyon','sj-hat':'hat','sj-town':'town'}},
 gray:{end:84.7,takeout:{n:'Swasey’s Beach',m:84.05,side:-1,how:'Your shuttle driver waits at the ramp.',miss:'The next take-out is Green River State Park, 12 miles downstream. Your shuttle is at Swasey’s.'},
   stops:{'gray-price':['lunch','canyon']},scenes:{'gray-ws':'canyon','gray-swasey':'takeout'}},
 deso:{end:84.7,takeout:{n:'Swasey’s Beach',m:84.05,side:-1,how:'Your shuttle driver waits at the ramp.',miss:'The next take-out is Green River State Park, 12 miles downstream. Your shuttle is at Swasey’s.'},
   stops:{'deso-fremont':['hike','petro'],'deso-rock':['view','stonehouse'],'deso-mcp':['view','ranch'],'deso-range':['hike','ruin'],'deso-light':['lunch','canyon']},scenes:{'deso-sand':'cabin','deso-ute':'canyon','deso-uinta':'canyon','deso-fire':'cabin','deso-steer':'canyon','deso-coal':'dam','deso-ws':'canyon','deso-swasey':'takeout'}},
 'sj-lower':{end:84.1,takeout:{n:'Clay Hills take-out',m:83.4,side:1,how:'A dirt road leads to Highway 276.',miss:'Below Clay Hills the river spreads over Lake Powell mud flats and drops over a silt waterfall at Piute Farms.'},
   stops:{'sjl-goose':['view','meander'],'sjl-hon':['hike','trail'],'sjl-gulch':['hike','ruin'],'sjl-mend':['view','cabin']},scenes:{'sjl-hat':'town','sjl-gov':'rapid','sjl-clay':'takeout'}},
 westwater:{end:17.4,takeout:{n:'Cisco Landing',m:16.8,side:-1,how:'Your shuttle waits at the landing.',miss:'Below Cisco the river runs many miles with few exits. Your shuttle is at Cisco.'},
   stops:{'ww-miner':['view','cabin']},scenes:{'ww-rs':'town','ww-gneiss':'canyon','ww-doom':'rapid','ww-cisco':'takeout'}},
 cataract:{end:16.7,takeout:{n:'Tow-boat pickup',m:15.9,side:1,how:'A motorboat tows your rafts across Lake Powell to Hite.',miss:'Below here: about 30 miles of slow, silty lake water to Hite. Without the tow boat you row for days.'},
   rapids:[{n:'Capsize (Rapid 15)',m:12.9,c:'IV',beta:'Named for good reason. Big holes on both sides.'},{n:'Ben Hurt (Rapid 20)',m:13.8,c:'IV',beta:'Last rapid before the Big Drops. Rocky.'}],
   stops:{'cat-spanish':['hike','canyon'],'cat-conf':['view','confluence']},scenes:{'cat-betty':'rapid','cat-drops':'rapid'}},
 gauley:{end:10.1,takeout:{n:'Bucklick take-out',m:9.45,side:1,how:'Climb the steep trail to the shuttle buses.',miss:'The Lower Gauley starts below with more Class V rapids. Your shuttle is at the take-out.'},
   rapids:[{n:'Iron Curtain',m:3.0,c:'IV+',beta:'A wall of waves. Punch through straight.'},{n:'Tumblehome',m:6.6,c:'IV',beta:'Rocky. The current pushes into an undercut wall.'},{n:'Shipwreck Rock',m:7.0,c:'IV+',beta:'An undercut rock on the right. Stay left.'}],
   stops:{'gau-pillow':['view','crowd']},scenes:{'gau-dam':'dam','gau-fest':'crowd','gau-sweet':'crowd'}}
};
for(const R of RIVERS){const x=RIVER_EXTRA[R.id];if(!x)continue;
  if(x.end)R.end=x.end;if(x.takeout)R.takeout=x.takeout;
  if(x.rapids){R.rapids=R.rapids.concat(x.rapids).sort((a,b)=>a.m-b.m);}
  for(const p of R.pois||[]){if(x.stops&&x.stops[p.id]){p.stop=x.stops[p.id][0];p.scene=x.stops[p.id][1];}else if(x.scenes&&x.scenes[p.id])p.scene=x.scenes[p.id];}}
const STOP_INFO={hike:['🥾','Hike'],view:['👀','Look around'],lunch:['🥪','Lunch stop'],swim:['🏊','Swim']};
