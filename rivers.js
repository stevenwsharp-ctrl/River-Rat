'use strict';
/* =====================================================================
   RIVER RUN — DATA
   Rivers, rapids, camps, history markers, bridges, towns and crowds.
   Miles are river miles from the put-in (Grand Canyon uses Lees Ferry miles).
   Some miles are approximate. Facts are short summaries for a game.
   ===================================================================== */

const CRAFTS={
  raft:{name:'Oar Raft',tag:'EASY',desc:'Big and heavy. Bounces off rocks. Hard to flip. Best for your first run.',
    hp:140,rockDmg:.45,tol:55,row:240,back:290,turn:4.4,maxTurn:1.9,kLong:1.35,kLat:1.7,mass:1.5,roll:0,r:30,len:76,wid:48,crew:3},
  kayak:{name:'Whitewater Kayak',tag:'MEDIUM',desc:'Fast and agile. Turns very quickly. Flips more easily, but you can roll back up (sometimes).',
    hp:100,rockDmg:.6,tol:40,row:360,back:230,turn:8,maxTurn:3.3,kLong:.95,kLat:2.3,mass:.75,roll:.5,r:15,len:64,wid:18,crew:1,
    pd:{name:'PADDLE!',cd:.3,J:105,Jb:80,yaw:1.15,same:.65,bothJ:0,btn:['L','R','NEXT','BACK'],help:'Tap LEFT / RIGHT strokes and alternate them. Hold BACK + stroke to back-paddle.',keys:'A / D strokes · W next stroke · hold S to back-paddle · mouse: click to stroke'}},
  dory:{name:'Wooden Dory',tag:'HARD',desc:'The classic Grand Canyon boat. Long rocker hull tracks straight and rides waves well, but rocks crack the hull.',
    hp:80,rockDmg:1.7,tol:33,row:290,back:330,turn:3.8,maxTurn:1.7,kLong:1.1,kLat:2.7,mass:1.6,roll:0,r:26,len:84,wid:34,crew:2,
    pd:{name:'ROW!',cd:.5,J:55,Jb:70,yaw:.95,same:1,bothJ:180,bothB:200,bothCd:.75,btn:['L OAR','R OAR','BOTH','BACK'],help:'LEFT or RIGHT oar to pivot. BOTH for power. Hold BACK + BOTH to pull away from danger. Keep a steady rhythm.',keys:'A / D one oar · W both oars · hold S to back-row · mouse: click to row'}},
  tube:{name:'Inner Tube',tag:'CHAOS',desc:'No oars. You kick. It spins. Keep your feet downstream. Good luck.',
    hp:100,rockDmg:.3,tol:26,row:120,back:120,turn:5,maxTurn:2.6,kLong:2,kLat:2.1,mass:.5,roll:0,r:20,len:46,wid:46,crew:1,
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

/* ---------------- GRAND CANYON: MARBLE ---------------- */
{id:'gc-marble',name:'Grand Canyon: Marble Canyon',river:'Colorado River, Arizona',stretch:'Lees Ferry → Mile 36',start:0,end:36,scale:'gc',width:560,speed:110,
 cfs:[8000,14000,24000,45000],wallH:820,sky:'#a8d0ea',days:3,
 season:'Late October: the motor season is over. Oar trips run in cool weather. The water from Glen Canyon Dam stays cold, around 50°F.',
 blurb:'The start of the big trip. Cold green water, the Roaring Twenties, Vasey\'s Paradise and Redwall Cavern.',
 pal:{wall:'#b4552f',wall2:'#86391f',strata:'#d07a4a',sand:'#ddbb84',water:'#3f7f6f',veg:'#78883a',rock:'#7b5a4a'},
 rapids:[
  {n:'Badger Creek',m:7.9,c:6,beta:'The first big rapid of the trip. Enter right of center. Holes wait at the bottom.',line:[.15,.1,0]},
  {n:'Soap Creek',m:11.2,c:6,beta:'Steep drop with a strong wave train. Hit the waves straight.'},
  {n:'House Rock',m:17.0,c:7,beta:'The current pushes you right, toward the wall. Big holes at the bottom. Row away early.',line:[-.1,.3,-.2],haz:[{t:'hole',u:.15,v:.85,p:1.3,s:1.6,n:'House Rock Hole'}]},
  {n:'North Canyon',m:20.6,c:5,beta:'Start of the Roaring Twenties. Big waves.'},
  {n:'21 Mile',m:21.2,c:5,beta:'Wave train. Stay in the middle.'},
  {n:'24 Mile',m:24.1,c:6,beta:'Holes on the sides. Keep the boat straight.'},
  {n:'24.5 Mile',m:24.6,c:6,beta:'A big hole waits on the left side.',line:[.25,.3,.2],haz:[{t:'hole',u:-.35,v:.4,p:1.2,s:1.5,n:'24.5 Hole'}]},
  {n:'25 Mile',m:25.0,c:6,beta:'Rocks and holes. Pick a line and commit.'},
  {n:'Cave Springs',m:25.6,c:5,beta:'Look for the cave in the left wall. Big waves.'},
  {n:'27 Mile',m:27.1,c:5,beta:'Last of the Roaring Twenties. Ride it out.'}],
 pois:[
  {id:'gc-lees',m:0,k:'hist',side:1,n:'Lees Ferry',page:{sub:'Mile 0 of the Grand Canyon',body:[
   'Every Grand Canyon river mile is counted from here. Lees Ferry is the one place for many miles where you can drive down to the river.',
   'In the early 1870s John D. Lee started a ferry here. For about 60 years it was the main way to cross the Colorado River in this area, until Navajo Bridge opened in 1929.',
   'The water comes from the bottom of Lake Powell, through Glen Canyon Dam about 15 miles upstream. That is why it is clear, green and very cold, about 50°F, even in summer.',
   'Rangers check every trip here. Then the river carries you into Marble Canyon.']}},
  {id:'gc-navajo',m:4.3,k:'hist',side:1,n:'Navajo Bridge',txt:'Two bridges cross high above you. The old one opened in 1929. The new one, built in 1995, carries the highway. Look for California condors on the steel.'},
  {id:'gc-badger',m:7.8,k:'geo',side:-1,n:'Why rapids form',txt:'Badger Creek and Jackass Creek come in from both sides here. Flash floods wash boulders out of side canyons and build "debris fans." The fans narrow the river and make rapids.'},
  {id:'gc-brown',m:12,k:'hist',side:1,n:'Brown\'s Riffle',txt:'In 1889 Frank M. Brown, leader of a railroad survey, drowned near here. The survey had no life jackets.'},
  {id:'gc-roar',m:20.4,k:'nat',side:-1,n:'The Roaring Twenties',txt:'From mile 20 to 27 the rapids come one after another. Boatmen call this the Roaring Twenties.'},
  {id:'gc-25',m:24.95,k:'hist',side:1,n:'Peter Hansbrough',txt:'In 1889 two more members of the Brown survey, Peter Hansbrough and Henry Richards, drowned near 25 Mile. The survey gave up soon after.'},
  {id:'gc-stanton',m:31.4,k:'hist',side:1,n:'Stanton\'s Cave',txt:'Robert Brewster Stanton\'s survey stored gear in this cave in 1889. Scientists later found split-twig figurines in it that are about 4,000 years old.'},
  {id:'gc-vasey',m:31.9,k:'nat',side:1,n:'Vasey\'s Paradise',txt:'Springs gush out of the Redwall limestone and make a garden of green plants on the cliff. Powell named it for the botanist George Vasey.'},
  {id:'gc-redwall',m:33,k:'geo',side:-1,n:'Redwall Cavern',page:{sub:'Mile 33 · a huge cave carved by the river',body:[
   'The river has carved a giant room into the base of the Redwall limestone. John Wesley Powell guessed it could seat 50,000 people. He was wrong, but it is still huge.',
   'The Redwall limestone is about 340 million years old. It formed at the bottom of a warm, shallow sea. Look for fossils of sea animals in the rock.',
   'The red color is only a stain. Iron from the red layers above washes down and paints the gray limestone.',
   'Camping is not allowed in the cavern, but most trips stop to play on the sand.']}}],
 camps:[{n:'Soap Creek Camp',m:11.5,side:1},{n:'Hot Na Na Camp',m:16.7,side:-1},{n:'North Canyon Camp',m:20.8,side:1},{n:'Silver Grotto Camp',m:29.5,side:-1},{n:'South Canyon Camp',m:31.6,side:1},{n:'Nautiloid Camp',m:34.7,side:-1}],
 bridges:[{n:'Navajo Bridges',m:4.4,high:true,double:true}]},

/* ---------------- GRAND CANYON: INNER GORGE ---------------- */
{id:'gc-inner',name:'Grand Canyon: Inner Gorge',river:'Colorado River, Arizona',stretch:'Hance → Phantom Ranch',start:76,end:88.6,scale:'gc',width:430,speed:125,
 cfs:[8000,14000,24000,45000],wallH:650,sky:'#9fc4dc',days:2,
 season:'Late October: cool, short days. Few hikers at Phantom Ranch. The water stays cold.',
 blurb:'Black schist and pink granite. Fast, narrow and loud. Ends under the bridges at Phantom Ranch.',
 pal:{wall:'#352c36',wall2:'#5b4252',strata:'#a46b72',sand:'#cfab7a',water:'#3d7a6c',veg:'#6f8a3a',rock:'#3e3842'},
 rapids:[
  {n:'Hance',m:76.7,c:8,beta:'Long rock garden with many holes. Pick a path through and keep the boat straight.'},
  {n:'Sockdolager',m:78.7,c:7,beta:'Huge waves between black walls. Hit them straight on.'},
  {n:'Grapevine',m:81.5,c:7,beta:'Long wave train. Holes at the sides. Stay in the center.',line:[0,0,0]},
  {n:'83 Mile',m:83.6,c:4,beta:'Small one. Breathe.'},
  {n:'Zoroaster',m:84.6,c:6,beta:'Fast water and a few holes near the walls.'}],
 pois:[
  {id:'gci-hance',m:76.4,k:'hist',side:-1,n:'John Hance',txt:'Hance Rapid is named for John Hance, a miner and early tour guide famous for his tall tales. He claimed he dug the Grand Canyon himself.'},
  {id:'gci-vishnu',m:77.5,k:'geo',side:1,n:'Vishnu Schist',txt:'You are now in the Inner Gorge. The black rock is Vishnu Schist, about 1.7 billion years old. The pink stripes are Zoroaster granite that melted its way in.'},
  {id:'gci-sock',m:78.5,k:'hist',side:-1,n:'Sockdolager',txt:'Powell\'s 1869 crew named this rapid. "Sockdolager" was old slang for a knockout punch.'},
  {id:'gci-clear',m:84.1,k:'nat',side:1,n:'Clear Creek',txt:'A side creek with a waterfall a short hike up. Its clear water is a big change from the river.'},
  {id:'gci-phantom',m:87.6,k:'hist',side:1,n:'Phantom Ranch',page:{sub:'Mile 88 · the only lodge at the bottom of the Grand Canyon',body:[
   'Phantom Ranch was designed by the architect Mary Colter and opened in 1922. You can only get here on foot, by mule or by boat.',
   'Mules still carry the mail and supplies. Letters sent from here get a stamp that says "Mailed by Mule from the Bottom of the Canyon."',
   'The Black Bridge (Kaibab Suspension Bridge) opened in 1928. Its long steel cables were carried down the trail on the shoulders of Havasupai men.',
   'The Silver Bridge downstream carries a water pipeline for the South Rim and hikers on the Bright Angel Trail.']}}],
 camps:[{n:'Hance Camp',m:76.4,side:-1},{n:'Grapevine Camp',m:81.7,side:-1},{n:'Clear Creek Camp',m:84.2,side:1},{n:'Cremation Camp',m:86.9,side:-1},{n:'Boat Beach',m:88.3,side:1}],
 bridges:[{n:'Black Bridge',m:87.5,high:true},{n:'Silver Bridge',m:87.9,high:true}]},

/* ---------------- GRAND CANYON: CRYSTAL ---------------- */
{id:'gc-crystal',name:'Grand Canyon: Crystal & The Gems',river:'Colorado River, Arizona',stretch:'Mile 97 → Mile 108.5',start:97,end:108.5,scale:'gc',width:470,speed:120,
 cfs:[8000,14000,24000,45000],wallH:760,sky:'#a8d0ea',days:2,
 season:'Late October: cold water and cool air. Wear a wetsuit for Crystal.',
 blurb:'Crystal, one of the biggest holes in the canyon, then rapids named for gems.',
 pal:{wall:'#3a2f38',wall2:'#5f4555',strata:'#b07a6e',sand:'#d2ae7d',water:'#3e7a6b',veg:'#6f8a3a',rock:'#45404a'},
 rapids:[
  {n:'Crystal',m:98.2,c:10,fan:1,beta:'Crystal Hole is near the center at the top. Pull hard to the right to miss it. Then watch for the rock garden on the left.',line:[.35,.4,.05],haz:[{t:'hole',u:-.05,v:.28,p:1.7,s:2,n:'Crystal Hole'},{t:'rock',u:-.55,v:.8,r:34,n:'Rock Garden'}]},
  {n:'Tuna Creek',m:99.3,c:6,beta:'Rocky with strong currents. Stay focused after Crystal.'},
  {n:'Sapphire',m:101.1,c:6,beta:'Holes at the bottom. Keep the boat straight.'},
  {n:'Turquoise',m:101.8,c:4,beta:'Small waves. Enjoy the view.'},
  {n:'Ruby',m:104.6,c:6,beta:'Strong waves and a hole at the top.'},
  {n:'Serpentine',m:106.0,c:7,beta:'Big wave train that pushes into the wall. Row to the middle.'}],
 pois:[
  {id:'gcc-crystal',m:97.6,k:'hist',side:1,n:'Crystal: a young rapid',page:{sub:'Mile 98 · made by a flood in 1966',body:[
   'Before 1966 Crystal was a small riffle. Then a huge flash flood came down Crystal Creek on river right and pushed a fan of boulders into the river. Overnight it became one of the hardest rapids in the canyon.',
   'In 1983 heavy snowmelt filled Lake Powell, and Glen Canyon Dam had to release about 90,000 cubic feet per second. At that flow Crystal Hole grew enormous and flipped many boats. Rangers stopped trips here to help people.',
   'This shows how rapids form: side-canyon floods drop boulders, and the river slowly works to move them.',
   'The classic run stays right of the hole, then pulls away from the rock garden on the left.']}},
  {id:'gcc-gems',m:100.5,k:'hist',side:-1,n:'The Gems',txt:'Early river runners named the next rapids for gemstones: Agate, Sapphire, Turquoise, Emerald, Ruby and Serpentine.'}],
 camps:[{n:'Lower Tuna Camp',m:99.6,side:-1},{n:'Mile 103 Camp',m:103,side:1},{n:'Ross Wheeler Camp',m:107.9,side:-1}]},

/* ---------------- GRAND CANYON: LAVA FALLS ---------------- */
{id:'gc-lava',name:'Grand Canyon: Lava Falls',river:'Colorado River, Arizona',stretch:'Mile 176 → Mile 186',start:176,end:186,scale:'gc',width:500,speed:125,
 cfs:[8000,14000,24000,45000],wallH:760,sky:'#b4cfe0',days:2,
 season:'Late October: warm days, cold water. Other trips often wait on the left bank to watch boats run Lava.',
 blurb:'The most famous rapid in North America. Black basalt and a lot of white water.',
 pal:{wall:'#2a2829',wall2:'#5a3a2b',strata:'#8b5a3c',sand:'#c8a679',water:'#3e7a6b',veg:'#6e8a3a',rock:'#2b2a2c'},
 marks:[{n:"Vulcan's Anvil",m:178.1,u:-.05,r:30}],
 rapids:[
  {n:'Lava Falls',m:179.4,c:10,fan:-1,beta:'Do NOT go into the Ledge Hole on the left. Run the right side. Hit the V-Wave straight and miss the Black Rock at the bottom right.',line:[.25,.4,.15],haz:[{t:'hole',u:-.38,v:.2,p:1.6,s:1.8,n:'Ledge Hole',pour:true},{t:'wave',u:.42,v:.35,h:1,w:.14,n:'V-Wave'},{t:'rock',u:.6,v:.85,r:40,n:'Black Rock'},{t:'boil',u:.1,v:.65,r:60}]},
  {n:'Lower Lava',m:179.8,c:5,beta:'Still white water. Keep it straight.'},
  {n:'185 Mile',m:184.9,c:3,beta:'Easy riffle. You made it.'}],
 pois:[
  {id:'gcl-toro',m:176.3,k:'geo',side:1,n:'Toroweap Overlook',txt:'Look up at the north rim. Toroweap Overlook sits about 3,000 feet straight above the river.'},
  {id:'gcl-anvil',m:177.7,k:'geo',side:-1,n:'Vulcan\'s Anvil',page:{sub:'Mile 178 · a volcanic neck in the river',body:[
   'The dark tower in the middle of the river is Vulcan\'s Anvil. It is the hard core of an old volcano, worn down by the river.',
   'Many times in the last million years, lava poured over the canyon rim here and flowed into the river. Some lava dams blocked the Colorado and made lakes behind them. The river cut through every dam.',
   'For some Native people this rock is a sacred place. River guides ask people not to touch it.',
   'When you pass the Anvil, you can hear Lava Falls. It is about one mile ahead.']}},
  {id:'gcl-lava',m:179.1,k:'warn',side:-1,n:'Lava Falls scout',txt:'Boats stop on the left to scout. Lava formed where Prospect Canyon pushed a debris fan into the river. Many people say it is the biggest rapid they will ever run.'}],
 camps:[{n:'Mile 177 Camp',m:177,side:1},{n:'Lower Lava Camp',m:180.3,side:-1},{n:'Mile 183 Camp',m:183,side:1}],
 crowds:[{m:179.2,side:-1,count:26,spread:180,label:'Scouting trips'}]},

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
