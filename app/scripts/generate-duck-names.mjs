// Genera src/data/duck-names.txt (nombres graciosos para patos nuevos).
// Uso: node scripts/generate-duck-names.mjs
// Mezcla una lista curada (inspirada en listas de nombres chistosos de mascotas: comida, objetos, juegos de palabras
// y nombres genéricos; SIN personajes, marcas ni personas reales) todas de UNA sola palabra. Estático:
// puedes editar el .txt a mano y no hace falta volver a correr este script.
import fs from 'node:fs';

const curated = `
Cheems|Churro|Tamalito|Croqueta|Wifi|Cheto|Mondongo|Casanova|Chupete|Babas|Bandido|Yoda|Nugget|Waffles|Biscuit
Noodles|Fluffernutter|Tater|Beans|Peanut|Munchkin|Binx|Hobbit|Baloo|Jabba|Bruiser|Hercules
Quackers|Quackbert|Quackula|Quack Obama|Quackie Chan|Quack Sparrow|Quackspeare|Duck Norris|Donald Quack
Daffy Duck Tape|Sir Quacksalot|Quackamole|Quackaroni|Quackerjack|Quackintosh|Quack Vader|Quackzilla
Quackbeard|Quackmire|Lord Quackington|Duckleberry|Duckingham|Ducktator|Duckifer|Ducktective|Duckpool
Duckzilla|Duck Vader|Duckrates|Duckimus Prime|Beaky|Beakman|Beakoncé|Beakasso|Waddles|Waddlesworth
Waddle Fett|Waddlelujah|Patricio|Patacón|Patoso|Patito Feo|Patolino|Patatín|Patatán|Patomán|Patinete
Pastelito|Pancho Pato|Paco Pato|Pepe Pato|Don Pato|Doña Pata|Pichón|Platanito|Plumas|Plumífero|Plumón
Plumitas|Pluma Pluma|Pelusa|Pelusín|Peluchín|Peluche|Pelotas|Pochi|Popote|Pozole|Pambazo|Pancita|Panqué
Panzón|Panchito|Papas|Papitas|Pepino|Pepinillo|Picante|Pimienta|Pipo|Pixel|Pixelito|Bit|Byte|Megabyte
Kilobyte|Ctrl Z|Alt F4|Bug|Debug|Glitch|Lag|Ping|Pong|Respawn|Checkpoint|Boss Final|Noob|Pro Gamer
Speedrun|Mario Duck|Luigi Duck|Sonic Duck|Link Duck|Pikaduck|Quackachu|Charmanduck|Bulbasquack
Squirtlequack|Waddle Dee|Pac Duck|Duck Hunt|Donkey Quack|Mega Duck|Duckio|Ducko|Duckie|Duckles
Duckers|Duckett|Duckinson|Ducksworth|Duckman|Duckwheat|Duckweed|Chicharrón|Chicharito|Chilaquil
Chilaquiles|Chorizo|Chamoy|Chamorro|Chancla|Chanclas|Chapulín|Chaparro|Chaparrito|Chico|Chiquitín
Chimuelo|Chimichanga|Chimichurri|Chispa|Chispita|Chocolate|Choco|Chocolatito|Chonchón|Churrumais
Burrito|Bolillo|Birote|Bizcocho|Bizcochito|Bombón|Botana|Botanita|Buñuelo|Camote|Camotito|Cacahuate
Calabaza|Calabacita|Calcetín|Calcetines|Canelita|Cajeta|Capirotada|Cebollín|Cebollita|Chayote|Chilito
Chile|Coco|Cocolito|Cocoa|Colibrí|Cometa|Concha|Conchita|Cuate|Cucurucho|Dona|Donita|Donut|Dumpling
Elote|Elotito|Empanada|Empanadita|Enchilada|Esquite|Flan|Flancito|Fresita|Frijol|Frijolito|Galleta
Galletita|Gordito|Gordo|Guacamole|Guaca|Guayaba|Habanero|Helado|Hotcake|Jalapeño|Jalapeñito|Jamón
Jamoncito|Jitomate|Kiwi|Lechuga|Limón|Limoncito|Lentejas|Lasaña|Macarrón|Mango|Mangito|Manzana
Manzanita|Maruchan|Marshmallow|Mazapán|Mermelada|Merengue|Mole|Molito|Mollete|Muffin|Nacho|Nachos
Naranja|Naranjita|Nopal|Nopalito|Nutella|Palomita|Palomitas|Pan Dulce|Pan con Queso|Panqueque|Papaya
Pasta|Pastor|Taco|Taquito|Tacos|Tamal|Tamales|Tequila|Tortilla|Tortillita|Tostada|Tostadita|Torta
Tortita|Totopo|Uva|Uvita|Waffle|Yogurt|Zanahoria|Zarzamora|Sushi|Ramen|Pizza|Pizzita|Pepperoni
Salami|Salchicha|Salchichón|Sándwich|Pretzel|Pancake|Pudding|Cupcake|Cookie|Cookies|Brownie
Cheesecake|Smores|Gummy|Gomita|Gomitas|Jelly|Jellybean|Lollipop|Mochi|Boba|Matcha|Tofu|Wasabi
Tempura|Dim Sum|Baguette|Croissant|Crepa|Crepita|Pie|Strudel|Tiramisú|Cannoli|Gnocchi|Ravioli
Spaghetti|Meatball|Albóndiga|Albondiguita|Dorito|Cheeto|Takis|Tostito|Ruffles|Pringles|Sabritas
Gansito|Pingüino|Submarino|Mantecada|Don Gato|Don Ramón|Don Quijote|Sancho Panza|Don Chuy|Doña Lupe
Chavo|Chilindrina|Quico|Chapulín Colorado|Pitufo|Gargamel|Garfield|Odie|Snoopy|Woodstock|Scooby
Shaggy|Pumba|Timón|Simba|Nala|Rafiki|Mufasa|Bambi|Dumbo|Pinocho|Pepito Grillo|Genio|Mushu|Elsa|Olaf
Sven|Moana|Maui|Hei Hei|Stitch|Lilo|Nemo|Dory|Marlin|Wall-E|Buzz|Woody|Slinky|Mr Potato|Sulley
Mike Wazowski|Boo|Shrek|Fiona|Burro|Lord Farquaad|Gingy|Po|Shifu|Oogway|Kung Fu Pato|Master Quack
Sensei Plumas|Ninja Pato|Samurai Pato|Pato Jedi|Obi Wan Quackobi|Luke Skywaddler|Han Quacko|Chewquacka
R2 Quack2|C3 Duck|Darth Quacker|Baby Yoda|Grogu|Gandalf|Gandalfo|Frodo|Samwise|Gollum|Legolas|Bilbo
Smaug|Dumbledore|Dobby|Hagrid|Hedwig|Harry Plumas|Voldemort|Pikachu|Eevee|Snorlax|Psyduck|Slowpoke
Jigglypuff|Meowth|Togepi|Bart|Homero|Milhouse|Moe|Barney|Flanders|Apu|Krusty|Patricio Estrella
Bob Esponja|Calamardo|Don Cangrejo|Gary|Plankton|Arenita|Finn|Jake|Marceline|BMO|Rick|Morty
Mr Meeseeks|Stewie|Brian|Cartman|Kenny|Butters|Sheldon|Walter White|Jesse|Saul|Heisenberg|Neo
Morpheus|Terminator|Rambo|Rocky Balboa|Maverick|Goose|Indiana Quack|Austin Powers|Mr Bean
Capitán Pico|Capitán Pato|Capitán Plumas|Capitán Cuac|Almirante Pato|Comandante Pico|General Pluma
Coronel Mostaza|Sargento Quack|Teniente Pato|Cabo Plumas|Soldado Pico|Rey Pato|Reina Pata
Príncipe Pico|Princesa Plumas|Duque de Quack|Barón Plumas|Conde Cuac|Doctor Quack|Doctora Pico
Profesor Plumas|Maestro Pato|Licenciado Cuac|Ingeniero Pico|Arquitecto Quack|Chef Quack|Chef Pico
Chef Plumas|Cuac Cuac|Cuac|Cuaco|Cuaquín|Cuaquito|Cuaquita|Cuacamole|Cuacamayo|Cuacodrilo|Cuacosaurio
Cuaqui|Cuacuac|Cuachito|Cuachín|Cuachón|Cuaco Loco|Cuaco Taco|Pico Loco|Pico de Gallo|Pico Rico
Pico Pico|Pico Chico|Picoso|Picotazo|Picotín|Picudo|Picudito|Piquito|Pachuco|Pachón|Pachanga|Pacheco
Zapato|Zapatito|Sombrero|Sombrerito|Maracas|Mariachi|Mariachito|Charro|Charrito|Piñata|Piñatita
Pulque|Mezcal|Mezcalito|Cantinflas|Tin Tan|Chabelo|Pedro Infante|Vicente Fernández|Selena|Shakira
Bad Duck|Taylor Quack|Lady Quackquack|Elvis Quackley|Michael Quackson|Freddie Quackury|Bob Quack
Snoop Duck|Ozzy Quackbourne|Quackdonna|Justin Beaver|Britney Quacks|Duck Sinatra|Bruno Quack
Ed Sheeduck|Daft Duck|Metaquack|Kurt Quackbain|Mozquack|Bachquack|Picapato|Dali Duck|Frida Cuac
Van Quack|Leonardo da Quacki|Banquacksy|Einstein Pato|Isaac Quackton|Nikola Quackla|Charles Quackwin
Quackleo|Quackrates|Napoleón Quackaparte|Cleopatra Cuac|Julio Quack|Gengis Cuac|Robin Quack|Merlín
Excalibur|Sir Lancelot|Sir Galahad|Sir Wobble|Sir Fluffington|Sir Chonk|Chonk|Chonky|Chonker
Floof|Floofy|Floofball|Fluffy|Fluffball|Fluffkins|Fuzzy|Fuzzball|Fuzzbucket|Fuzzy Wuzzy|Wiggles
Wigglebutt|Wobbles|Wobblebutt|Waddlebutt|Butterbutt|Butterball|Butter|Buttercup|Butterscotch
Buttons|Bubbles|Bubba|Bubbalicious|Boop|Boopsie|Beep|Beepers|Bloop|Bonk|Bonkers|Bongo|Bingo|Bongus
Bingus|Bungus|Dingus|Doofus|Dorkus|Goofus|Goober|Goofball|Goofy|Gooseberry|Gizmo|Gadget|Widget
Doodle|Doodles|Noodle|Puddles|Pickles|Pickles McGee|Sprinkles|Skittles|Smarties|Twinkie|Twinkletoes
Tootsie|Toots|Tootles|Toodles|Tater Tot|Tot|Spud|Spudnik|Muffin Top|Muffinator|Crumpet|Crumb|Crumbs
Crumbles|Cracker|Crackers|Snickers|Snickerdoodle|Snacks|Snackers|Snackbar|Munchie|Munchies|Nibbles
Nibbler|Gobbles|Gobbler|Chomp|Chomper|Chompers|Chompy|Gulp|Slurp|Slurpee|Burp|Hiccup|Hiccups|Sneezy
Achoo|Coughdrop|Sniffles|Snore|Snoozy|Snooze|Zzz|Napper|Nappy|Sleepy|Dozer|Drowsy|Lazybones|Slothy
Turbo|Turbo Duck|Flash|Zoom|Zoomer|Zippy|Zip|Zap|Zapper|Zigzag|Zany|Zazzle|Zonk|Zorro|Zorrito|Zeus
Poseidón|Hades|Hércules|Atenea|Apolo|Ares|Dionisio|Hermes|Thor|Loki|Odín|Freya|Anubis|Osiris|Xolo
Xoloitzcuintle|Quetzalcóatl|Tláloc|Moctezuma|Cuauhtémoc|Sirenito|Ariel|Úrsula|Tritón|Flounder
Sebastián|Aurora|Maléfica|Cenicienta|Blancanieves|Bella|Bestia|Gastón|Lumière|Chip|Chop|Ardillita
Tuerquita|Tornillo|Tornillito|Martillo|Martillito|Clavo|Clavito|Taladro|Desarmador|Llave Inglesa
Pinzas|Serrucho|Cinta|Pegamento|Resistol|Diurex|Tijeras|Lápiz|Borrador|Crayola|Crayón|Marcador
Cuaderno|Libreta|Mochila|Lonchera|Sacapuntas|Engrapadora|Clip|Clippy|Post It|Cartulina|Papelito
Cartoncito|Calcomanía|Estampita|Timbre|Cartero|Buzón|Telegrama|Mensajito|Wasap|Tiktok|Insta
Feisbuk|Tuit|Yutub|Twitch|Streamer|Influencer|Youtuber|Gamer|Bot|Botcito|Robot|Robotito|Android
Cyborg|Cyberduck|Ciberpato|Tecnopato|Pato Pixel|Pato Retro|Pato Arcade|Pato Gamer|Pato Boss
Pato Mafioso|Pato Padrino|Vito Corleone|Tony Montana|Tony Soprano|Pato Gánster|Pato Detective
Pato Policía|Pato Bombero|Pato Doctor|Pato Pirata|Pato Vaquero|Pato Astronauta|Pato Cósmico
Pato Lunar|Pato Solar|Pato Estelar|Pato Galáctico|Pato Nebulosa|Pato Meteoro|Pato Cometa|Marciano
Alien Duck|ET Pato|Ovni|Ovnipato|Platillo Volador|Pato Volador|Superpato|Súper Cuac|Batpato|Batduck
Batquack|Spiderduck|Ironduck|Hulk Duck|Aquaquack|Wonder Quack|Superquack|Joker Quack|Harley Quackinn
Deadquack|Wolverquack|Venomquack|Thanquack|Groot Duck|Rocket Duck|Doctor Extraño Pato|Pato Patán
Patatús|Patachula|Patapum|Patapúm|Pataplán|Pata Negra|Patas de Seda|Patas Largas|Patas Cortas|Patón
Patona|Patudo|Patuco|Patucos|Patuchito|Patufo|Patillas|Patillitas|Patilludo|Patinador|Patines
Patineta|Patito de Hule|Patito de Goma|Rubber Duck|Rubber Ducky|Ducky|Ducky Momo|Ducky Dan|Ducky Doo
Lucky Duck|Lucky|Lucky Charm|Lucky Quack|Lucky Plumas|Lucky Pato|Lucas|Lucas Quack|Lucas Plumas
Pantufla|Pantuflas|Pantuflita|Pijama|Cobija|Cobijita|Almohada|Almohadita|Edredón|Sábana|Sabanita
Chilaquil Jr|Pelón|Pelona|Peloncito|Greñas|Greñudo|Greñita|Chuy|Chucho|Chuchito|Cuco|Cuquito|Beto
Betito|Güero|Güerito|Prieto|Prietito|Flaco|Flaquito|Flaquísimo|Gordibuenísimo|Zonzo|Tontín|Tontuelo
Menso|Mensito|Mensote|Loquito|Locuelo|Lelo|Lelito|Burrito Pato|Terco|Tercito|Sabelotodo|Chismoso
Chismosito|Mitotero|Fodongo|Fachoso|Fachosito|Elegantón|Presumido|Presumidito|Payasito|Payaso|Bromista
Travieso|Travesura|Berrinchudo|Berrinche|Llorón|Lloroncito|Dormilón|Comelón|Tragón|Tragoncito|Glotón
Mojado|Mojadito|Remojado|Chapoteador|Chapuzón|Chapucero|Salpicón|Salpicaduras|Zambullida|Clavado
Hundido|Flotador|Flotante|Burbujita|Burbujas|Espuma|Espumita|Jabón|Jaboncito|Champú|Regadera|Tina
`;

// Más nombres de UNA sola palabra (comida, onomatopeyas, palabras chistosas, objetos, naturaleza).
const extra = `
Aguacate|Aceituna|Aceitunita|Albahaca|Alcachofa|Almendra|Amaranto|Anís|Arándano|Arroz|Arrocito|Atole|Avena|Azúcar
Azucarito|Bagel|Banana|Bananito|Barquillo|Betabel|Berenjena|Bisquet|Bistec|Bizcotelas|Blueberry|Bocadillo|Bollito
Bollo|Borrego|Brócoli|Brocolito|Burbujín|Cacahuatito|Café|Cafecito|Calamar|Caldito|Caldo|Camarón|Camaroncito|Canela
Cappuccino|Caramelo|Carameloso|Cardamomo|Cereza|Cerecita|Chabacano|Chai|Champiñón|Chantilly|Chicle|Chiclosito|Chilpayate
Chinampa|Chirimoya|Chispas|Chistorra|Chivito|Cilantro|Ciruela|Ciruelita|Clavito|Cóctel|Coliflor|Compota|Corndog|Cremita
Crocante|Croquetón|Crujiente|Crutón|Cuernito|Curry|Dátil|Dulcito|Durazno|Duraznito|Edamame|Ejote|Ejotito|Espagueti
Espinaca|Fideo|Fideíto|Fondue|Fresa|Frambuesa|Fritanga|Frito|Frutilla|Galletón|Gazpacho|Gelatina|Gelatinita|Gofre|Granola
Granizado|Grosella|Guanábana|Guisado|Guiso|Hamburguesa|Hamburguesita|Harina|Hojaldra|Hongo|Hongüito|Horchata|Hummus
Jengibre|Jícama|Jugo|Jugosito|Kétchup|Kebab|Kimchi|Kiwito|Lima|Litchi|Lomito|Macadamia|Maíz|Maicito|Malteada|Mandarina
Mantequilla|Mantequita|Manteca|Maple|Margarita|Mayonesa|Mayito|Melón|Melocotón|Membrillo|Menta|Miel|Mielcita|Mijo
Mostaza|Mostacita|Nabo|Nabito|Nachito|Nuez|Nuececita|Ñoño|Ñoquis|Ñandú|Ñoñito|Orégano|Palmera|Pastelón|Pavo|Pepitas
Pepita|Pera|Perejil|Pesto|Pickle|Piña|Piñita|Pistache|Plátano|Pollito|Polvorón|Pomelo|Puré|Quesadilla|Quesito|Queso
Rábano|Rabanito|Raviolito|Rebanada|Rollito|Romero|Rosca|Sal|Salsa|Salsita|Sandía|Sandiíta|Sardina|Sazón|Semilla
Sopa|Sopita|Sopes|Sorbete|Soufflé|Sprite|Tahini|Tallarín|Tamarindo|Tapioca|Tarta|Tartita|Tocino|Tocinito|Tomate
Tomatito|Toronja|Trufa|Turrón|Vainilla|Vainillita|Zacate|Zumo|Zucchini
Ajonjolí|Alfajor|Arepa|Bolita|Bolillito|Cacerola|Cajita|Cazuela|Chicharito Frito|Cuchara|Cucharita|Tenedor|Tenedorcito
Plato|Platito|Taza|Tacita|Vasito|Servilleta|Mantel|Charola|Sartén|Sartencito|Olla|Ollita|Cazo|Cucharón|Colador|Rodillo
Batidora|Licuadora|Tostador|Waflera|Molcajete|Comal|Comalito|Tortillero|Salero|Pimentero|Azucarera|Cafetera|Tetera
Abanico|Abrigo|Bufanda|Bufandita|Calceta|Gorrito|Gorro|Guante|Guantecito|Listón|Moñito|Moño|Paraguas|Paraguita
Pañuelo|Pijamita|Playera|Sudadera|Tenis|Tenisito|Zapatilla|Chaleco|Chamarra|Corbata|Corbatita|Lentes|Lentecitos
Bigote|Bigotito|Barbita|Barbón|Chongo|Chongito|Copete|Copetón|Rulo|Rulitos|Trenza|Trencita|Flequillo|Peineta
Aaaah|Ayayay|Bam|Bang|Beep Beep|Blah|Bleh|Blub|Blup|Bluf|Boing|Bonk|Boom|Brrr|Bzzz|Chaz|Chin|Chof|Clap|Clic|Clip Clop
Crac|Crash|Crunch|Cuaz|Din|Don Don|Dong|Fiu|Flop|Fum|Glub|Glubglub|Guau|Hop|Hup|Iuju|Jeje|Jiji|Juju|Kaboom|Kapow|Mua|Muac
Ñam|Ñaca|Oink|Pam|Pausa|Pif|Paf|Pluf|Plop|Pof|Poing|Pum|Puf|Pupú|Pupusa|Quiquiriquí|Ring|Rrr|Shh|Slap|Smack|Splash
Splat|Splish|Splosh|Tac|Tic|Tictac|Tin|Tun|Tururú|Uff|Uf|Uyuyuy|Wiii|Woah|Wow|Yuju|Yupi|Zas|Zaz|Zumbido|Zzzap
Abracadabra|Alakazam|Anchoa|Bacalao|Bafle|Balón|Balonazo|Bamboleo|Bananazo|Barullo|Batata|Bochorno|Bolsita|Bombita
Bongó|Bonito|Borbotón|Botellita|Brillito|Brillo|Brincos|Brinquito|Bufón|Burbujeo|Cabezón|Cabecita|Cachetes|Cachetón
Cachorro|Cachucha|Calabacín|Campanita|Campana|Canica|Canicas|Carambola|Carcajada|Carrito|Cascabel|Cascarita|Chacharero
Chachalaca|Chambelán|Charquito|Chasquido|Chiflido|Chiflón|Chinchín|Chingolo|Chiquilín|Chirimbolo|Chisme|Chispazo
Chistoso|Chocante|Chocolatazo|Churumbel|Cocoliso|Cojín|Cometín|Confeti|Cosquillas|Cosquilla|Cosquillitas|Croac|Cuchi
Cuchicheo|Cuchufleta|Cucú|Cuentito|Cumbia|Cumbión|Dedal|Dedito|Disfraz|Dominó|Doraemon|Dormilona|Embuste|Enredo
Esponja|Esponjita|Fandango|Farándula|Fiestón|Fiestero|Flautín|Flauta|Fogata|Fogatita|Fosforito|Frenesí|Gaita|Gajo
Galope|Garabato|Garabatito|Gazpachito|Gotita|Globo|Globito|Guasa|Guaje|Guitarrita|Güiro|Hamaca|Hamaquita|Hipo|Hojita
Hullito|Ingenio|Jarabe|Jarana|Jarrito|Jolgorio|Jueguito|Juguete|Juguetón|Kazoo|Lámpara|Lamparita|Lana|Lanita|Lazo
Lentejuela|Locura|Lorenzo|Lunita|Maceta|Macetita|Madeja|Maletín|Maniático|Mariposa|Mariposón|Marioneta|Matraca|Meñique
Migaja|Minuto|Mochilita|Moneda|Monedita|Monito|Monigote|Mundillo|Murmullo|Nenúfar|Nimbo|Noodlito|Nube|Nubecita|Ocarina
Ojitos|Ojón|Olita|Ondulado|Orejón|Oreja|Orejitas|Pachoncito|Palillo|Palito|Pandero|Panderito|Panzita|Pasita|Pataleta
Payasín|Pelotón|Pepenado|Perico|Perillo|Pestaña|Piruleta|Pirueta|Pistacho|Pitido|Pito|Pitillo|Pizquita|Plaf|Plumita
Pompa|Pompita|Pompón|Popis|Popó|Potecito|Pulgarcito|Pulgoso|Puntito|Quesote|Quimera|Quisquilla|Rabito|Rabón|Raspado
Rasposo|Rayuela|Regalito|Regordete|Remolino|Resorte|Retozón|Rimbombante|Risita|Risas|Risotada|Rizos|Rizado|Rocanrol
Rollo|Ronroneo|Rosquilla|Rumbero|Sacudida|Saltarín|Saltimbanqui|Sancocho|Sapito|Serpentina|Siesta|Sombrilla|Sonajero
Sonrisa|Sopapo|Sorpresa|Soplido|Sueñito|Tamborcito|Tambor|Tarareo|Tartamudo|Tembleque|Tilín|Timbal|Timbalito|Tintín
Tirolés|Titiritero|Tobogán|Tomboy|Tontería|Topito|Torbellino|Tornasol|Tostón|Trabalenguas|Trampolín|Trapito|Trapo
Traviesito|Trompeta|Trompito|Trompo|Tropezón|Trueno|Truquito|Tuerca|Tulipán|Tumbón|Turuleta|Ukelele|Vaivén|Vals
Vaquita|Vasija|Ventarrón|Villancico|Vueltita|Yoyo|Yeyé|Zambomba|Zancudo|Zapateado|Zarandeo|Zigzagueo|Zumbón|Zurdo
Alberto|Aurelio|Bartolo|Bernabé|Bonifacio|Calixto|Casimiro|Cirilo|Cleofás|Cornelio|Crisóstomo|Eustaquio|Evaristo|Fausto
Filomeno|Florentino|Gerundio|Hipólito|Ladislao|Leopoldo|Macario|Maximiliano|Melquiades|Nicanor|Olegario|Panfilo
Perfecto|Pancracio|Rodolfo|Rufino|Sabino|Sinforoso|Telésforo|Teodoro|Tiburcio|Ulises|Venancio|Zacarías|Zenón
Agapito|Anacleto|Benancio|Cándido|Clotilde|Eufrasia|Genoveva|Gertrudis|Hermenegilda|Hortensia|Leocadia|Petronila|Pilar
Aguamiel|Alcatraz|Alebrije|Ámbar|Amatista|Arcoíris|Azabache|Bahía|Bosquecillo|Brisa|Cascada|Cenote|Chubasco|Cielito
Coral|Cristal|Diamante|Esmeralda|Estrellita|Estrella|Gaviota|Granizo|Isla|Islita|Jade|Lago|Laguna|Lagunita|Lluvia
Llovizna|Luciérnaga|Luna|Manantial|Marea|Meteoro|Nevada|Niebla|Nimbus|Océano|Olita|Orilla|Oasis|Pantano|Perla|Perlita
Pétalo|Pradera|Rocío|Rubí|Safiro|Sirocco|Tormenta|Tormentita|Topacio|Vendaval|Zafiro|Chaparrón|Charco Feliz
Aleteo|Chapoteo|Charco|Estanque|Migajas|Burbuja|Cuacuacuac|Quackito|Quackín|Quackón|Quackazo|Quackero|Quacktastic|Quackeroo
Quackster|Quackling|Quackalot|Quackenstein|Quackaroo|Quackadoodle|Quackapoo|Quacklet|Duckaroo|Duckadoodle|Duckling
Duckster|Duckerino|Duckolino|Duckito|Duckín|Duckón|Duckzy|Duckles|Ducklet|Quackerino|Quackolino|Cuaquerino|Cuaquetón
Cuaquerío|Cuacazo|Cuacón|Cuaquetas|Cuaquetita|Cuaquetín|Cuacuaco|Patazo|Patito|Patón|Patoncito|Patuquín|Patuco|Patolín
Patiquín|Patirojo|Patimoco|Patichueco|Patiduro|Patisucio|Patosín|Patotas|Patuleco|Patagón|Patagonio|Patorro|Patorrón
Chapoteito|Chapotón|Chapucín|Remojón|Mojadón|Salpicón|Salpiquín|Zambullín|Zambullón|Buceador|Buceadorcito|Flotadorcito
`;

// --- Lista de bloqueo (derechos de autor / marcas / personas reales) ---------------------------
// Nada de personajes protegidos (Nintendo, Pokémon, Disney, Pixar, DreamWorks, Star Wars, Marvel/DC,
// Los Simpson, Bob Esponja, El Chavo…), marcas comerciales ni personas reales vivas o con herederos.
// Las palabras sueltas (Taco, Churro, Pixel…) y la mitología/personajes de dominio público sí se permiten.
const blockedSubstrings = [
  'mario', 'luigi', 'sonic', 'zelda', 'link duck', 'pac duck', 'pac-', 'duck hunt', 'donkey', 'kirby', 'waddle dee',
  'mega duck', 'duckio', 'pika', 'quackachu', 'charman', 'bulbasquack', 'squirtle', 'psyduck', 'snorlax', 'eevee',
  'jigglypuff', 'meowth', 'togepi', 'yoda', 'vader', 'darth', 'jedi', 'skywaddler', 'quacko', 'chewquacka', 'r2 ', 'c3 ',
  'obi wan', 'grogu', 'fett', 'jabba', 'gandalf', 'frodo', 'samwise', 'gollum', 'legolas', 'bilbo', 'smaug', 'hobbit',
  'dumbledore', 'dobby', 'hagrid', 'hedwig', 'harry', 'voldemort', 'batpato', 'batduck', 'batquack', 'spiderduck',
  'ironduck', 'hulk', 'aquaquack', 'wonder quack', 'superquack', 'joker', 'harley', 'deadquack', 'duckpool', 'wolverquack',
  'venomquack', 'thanquack', 'groot', 'rocket duck', 'extraño', 'superpato', 'súper cuac', 'daffy', 'donald', 'patolino',
  'quackerjack', 'quackmire', 'quackintosh', 'quackzilla', 'duckzilla', 'duckimus', 'quackie chan', 'quack obama',
  'duck norris', 'quack sparrow', 'beakoncé', 'beakman', 'beakasso', 'duckleberry', 'duckman', 'cyberduck',
  'ducky momo', 'lucky charm', 'bob esponja', 'calamardo', 'cangrejo', 'plankton', 'arenita', 'patricio estrella',
  'meeseeks', 'walter white', 'heisenberg', 'rocky balboa', 'rambo', 'terminator', 'austin powers', 'mr bean',
  'indiana', 'vito corleone', 'tony montana', 'tony soprano', 'padrino', 'mike wazowski', 'lord farquaad', 'kung fu',
  'cantinflas', 'tin tan', 'chabelo', 'infante', 'vicente fern', 'selena', 'shakira', 'bad duck', 'taylor', 'quackquack',
  'elvis', 'michael quackson', 'freddie', 'bob quack', 'snoop', 'ozzy', 'quackdonna', 'beaver', 'britney', 'sinatra',
  'bruno', 'sheeduck', 'daft', 'metaquack', 'kurt', 'frida', 'dali', 'banquacksy', 'einstein', 'quackla', 'ducktective x',
];
const blockedExact = new Set([
  'cheems', 'baloo', 'binx', 'munchkin', 'fluffernutter', 'bubbalicious', 'boopsie', 'chip', 'chop', 'gizmo', 'gadget',
  'goofy', 'dumbo', 'bambi', 'pinocho', 'pepito grillo', 'genio', 'mushu', 'elsa', 'olaf', 'sven', 'moana', 'maui',
  'hei hei', 'stitch', 'lilo', 'nemo', 'dory', 'marlin', 'wall-e', 'buzz', 'woody', 'slinky', 'mr potato', 'sulley',
  'boo', 'shrek', 'fiona', 'gingy', 'po', 'shifu', 'oogway', 'timón', 'pumba', 'simba', 'nala', 'rafiki', 'mufasa',
  'sirenito', 'ariel', 'úrsula', 'tritón', 'flounder', 'sebastián', 'aurora', 'maléfica', 'cenicienta', 'blancanieves',
  'bella', 'bestia', 'gastón', 'lumière', 'garfield', 'odie', 'snoopy', 'woodstock', 'scooby', 'shaggy', 'pitufo',
  'gargamel', 'don gato', 'don ramón', 'chavo', 'chilindrina', 'quico', 'chapulín colorado', 'chicharito', 'zorro',
  'zorrito', 'bart', 'homero', 'milhouse', 'moe', 'barney', 'flanders', 'apu', 'krusty', 'gary', 'finn', 'jake',
  'marceline', 'bmo', 'rick', 'morty', 'stewie', 'brian', 'cartman', 'kenny', 'butters', 'sheldon', 'jesse', 'saul',
  'neo', 'morpheus', 'maverick', 'goose', 'et pato', 'pong', 'clippy', 'post it', 'crayola', 'resistol', 'diurex',
  'maruchan', 'nutella', 'dorito', 'cheeto', 'takis', 'tostito', 'ruffles', 'pringles', 'sabritas', 'churrumais',
  'gansito', 'pingüino', 'submarino', 'twinkie', 'skittles', 'smarties', 'snickers', 'tootsie', 'tater tot', 'tiktok',
  'insta', 'feisbuk', 'tuit', 'yutub', 'wasap', 'twitch', 'android', 'turbo', 'turbo duck', 'flash', 'sneezy', 'sleepy',
  'hiccup', 'hermes', 'wiggles', 'wigglebutt', 'ducky momo', 'pato jedi', 'alien duck', 'slowpoke', 'slurpee', 'doraemon', 'sprite', 'nimbus', 'alakazam', 'tictac', 'tomboy', 'corndog',
]);
const isBlocked = (n) => {
  const l = n.toLowerCase();
  return blockedExact.has(l) || blockedSubstrings.some((s) => l.includes(s));
};

const seen = new Map();
const add = (n) => {
  n = n.trim();
  // Solo nombres de UNA palabra (sin espacios).
  if (n && n.length <= 20 && /^[^\s]+$/.test(n) && !isBlocked(n) && !seen.has(n.toLowerCase())) seen.set(n.toLowerCase(), n);
};
for (const list of [curated, extra]) list.split(/[|\n]/).forEach(add);

const names = [...seen.values()];
const header =
  '# Nombres graciosos para patos nuevos (uno por línea).\n' +
  '# Las líneas vacías y las que empiezan con # se ignoran. Puedes agregar los tuyos al final.\n';
fs.writeFileSync(new URL('../src/data/duck-names.txt', import.meta.url), header + names.join('\n') + '\n');
console.log(`${names.length} nombres`);
