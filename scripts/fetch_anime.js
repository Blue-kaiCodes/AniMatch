import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('./src/data');
const OUTPUT_FILE = path.join(DATA_DIR, 'anime_data.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Fallback high-quality dataset of top popular anime in case of API issues
const FALLBACK_ANIME = [
  {
    "mal_id": 5114,
    "title": "Fullmetal Alchemist: Brotherhood",
    "english_title": "Fullmetal Alchemist: Brotherhood",
    "genres": ["Action", "Adventure", "Drama", "Fantasy"],
    "synopsis": "After a horrific alchemy experiment goes wrong in the Elric household, brothers Edward and Alphonse are left in a dire state. Edward loses his left leg and right arm, while Alphonse's soul is bound to a giant suit of armor. They embark on a quest to find the philosopher's stone to restore their bodies.",
    "score": 9.1,
    "popularity": 3,
    "type": "TV",
    "episodes": 64,
    "status": "Finished Airing",
    "year": 2009,
    "studio": "Bones",
    "image": "https://cdn.myanimelist.net/images/anime/1223/96541.jpg"
  },
  {
    "mal_id": 11061,
    "title": "Hunter x Hunter (2011)",
    "english_title": "Hunter x Hunter",
    "genres": ["Action", "Adventure", "Fantasy"],
    "synopsis": "Gon Freecss aspires to become a Hunter, an exceptional individual capable of greatness. With his friends Killua, Kurapika, and Leorio, he embarks on an perilous journey to find his father, the legendary Hunter Ging Freecss, while conquering deadly trials.",
    "score": 9.04,
    "popularity": 10,
    "type": "TV",
    "episodes": 148,
    "status": "Finished Airing",
    "year": 2011,
    "studio": "Madhouse",
    "image": "https://cdn.myanimelist.net/images/anime/1337/119020.jpg"
  },
  {
    "mal_id": 38524,
    "title": "Shingeki no Kyojin Season 3 Part 2",
    "english_title": "Attack on Titan Season 3 Part 2",
    "genres": ["Action", "Drama", "Suspense"],
    "synopsis": "The battle to retake Wall Maria begins. Eren Yeager and the Scout Regiment fight to reclaim Shiganshina District and uncover the secrets hidden in the Yeager family basement, facing off against the Beast Titan, Armored Titan, and Colossal Titan in a brutal clash.",
    "score": 9.05,
    "popularity": 24,
    "type": "TV",
    "episodes": 10,
    "status": "Finished Airing",
    "year": 2019,
    "studio": "Wit Studio",
    "image": "https://cdn.myanimelist.net/images/anime/1517/100677.jpg"
  },
  {
    "mal_id": 2904,
    "title": "Code Geass: Hangyaku no Lelouch R2",
    "english_title": "Code Geass: Lelouch of the Rebellion R2",
    "genres": ["Action", "Drama", "Sci-Fi"],
    "synopsis": "One year has passed since the Black Rebellion. Lelouch Lamperouge lives a quiet life under Britannia's watchful eye, his memories of being Zero erased. But when C.C. appears and restores his memories, the revolutionary leader awakens once more to destroy the Holy Britannian Empire.",
    "score": 8.91,
    "popularity": 27,
    "type": "TV",
    "episodes": 25,
    "status": "Finished Airing",
    "year": 2008,
    "studio": "Sunrise",
    "image": "https://cdn.myanimelist.net/images/anime/4/9391.jpg"
  },
  {
    "mal_id": 40028,
    "title": "Shingeki no Kyojin: The Final Season",
    "english_title": "Attack on Titan: The Final Season",
    "genres": ["Action", "Drama", "Suspense"],
    "synopsis": "Gabi Braun and Falco Grice have been training their entire lives to inherit one of the seven Titans under Marley's control. However, just as Marley prepares to invade Paradis Island, their world is shattered by the sudden arrival of Eren Yeager and the Survey Corps.",
    "score": 8.8,
    "popularity": 42,
    "type": "TV",
    "episodes": 16,
    "status": "Finished Airing",
    "year": 2020,
    "studio": "MAPPA",
    "image": "https://cdn.myanimelist.net/images/anime/1000/110513.jpg"
  },
  {
    "mal_id": 9253,
    "title": "Steins;Gate",
    "english_title": "Steins;Gate",
    "genres": ["Drama", "Sci-Fi", "Suspense"],
    "synopsis": "Rintarou Okabe is a self-proclaimed mad scientist who runs the Future Gadget Laboratory. Along with his friends Mayuri and Daru, they accidentally invent a microwave device that can send text messages to the past, altering the flow of time and triggering a dark conspiracy.",
    "score": 9.07,
    "popularity": 13,
    "type": "TV",
    "episodes": 24,
    "status": "Finished Airing",
    "year": 2011,
    "studio": "White Fox",
    "image": "https://cdn.myanimelist.net/images/anime/1935/127974.jpg"
  },
  {
    "mal_id": 1535,
    "title": "Death Note",
    "english_title": "Death Note",
    "genres": ["Mystery", "Suspense"],
    "synopsis": "Light Yagami is a brilliant high school student who stumbles upon a mysterious notebook called the Death Note. Discovering that writing a person's name in it kills them, he decides to eliminate all criminals and create a new world as a god named Kira, drawing the attention of the world's greatest detective, L.",
    "score": 8.62,
    "popularity": 1,
    "type": "TV",
    "episodes": 37,
    "status": "Finished Airing",
    "year": 2006,
    "studio": "Madhouse",
    "image": "https://cdn.myanimelist.net/images/anime/9/9453.jpg"
  },
  {
    "mal_id": 21,
    "title": "One Piece",
    "english_title": "One Piece",
    "genres": ["Action", "Adventure", "Fantasy"],
    "synopsis": "Gol D. Roger, the King of the Pirates, revealed the existence of the One Piece before his execution, triggering the Great Pirate Era. Luffy, a boy who ate a Devil Fruit and gained rubber abilities, sets sail with his crew, the Straw Hat Pirates, to find the legendary treasure and become the new Pirate King.",
    "score": 8.72,
    "popularity": 20,
    "type": "TV",
    "episodes": 1100,
    "status": "Currently Airing",
    "year": 1999,
    "studio": "Toei Animation",
    "image": "https://cdn.myanimelist.net/images/anime/1244/138851.jpg"
  },
  {
    "mal_id": 269,
    "title": "Bleach",
    "english_title": "Bleach",
    "genres": ["Action", "Adventure", "Fantasy"],
    "synopsis": "Ichigo Kurosaki is a high school student who can see ghosts. When his family is attacked by a Hollow, a malevolent spirit, Ichigo meets Rukia Kuchiki, a Soul Reaper who transfers her powers to him. Ichigo must now take on the duty of protecting humans and guiding souls to the Soul Society.",
    "score": 7.9,
    "popularity": 35,
    "type": "TV",
    "episodes": 366,
    "status": "Finished Airing",
    "year": 2004,
    "studio": "Studio Pierrot",
    "image": "https://cdn.myanimelist.net/images/anime/3/40451.jpg"
  },
  {
    "mal_id": 51145,
    "title": "Bleach: Sennen Kessen-hen",
    "english_title": "Bleach: Thousand-Year Blood War",
    "genres": ["Action", "Adventure", "Fantasy"],
    "synopsis": "The peace in the Soul Society is shattered when a group of Quincies, led by Yhwach, declare war against the Soul Reapers. Ichigo Kurosaki enters the fray once more to defend his friends and unleash his ultimate power to stop the destruction of all worlds.",
    "score": 9.01,
    "popularity": 250,
    "type": "TV",
    "episodes": 13,
    "status": "Finished Airing",
    "year": 2022,
    "studio": "Studio Pierrot",
    "image": "https://cdn.myanimelist.net/images/anime/1764/126627.jpg"
  },
  {
    "mal_id": 41457,
    "title": "Jujutsu Kaisen",
    "english_title": "Jujutsu Kaisen",
    "genres": ["Action", "Fantasy"],
    "synopsis": "Yuuji Itadori is a high schooler who swallows a cursed finger of the legendary Curse Ryomen Sukuna to protect his friends. Convicted to death by jujutsu sorcerers, Yuuji is allowed to live temporarily under the supervision of Gojou Satoru, joining the Jujutsu Tech to find and consume all of Sukuna's fingers.",
    "score": 8.63,
    "popularity": 12,
    "type": "TV",
    "episodes": 24,
    "status": "Finished Airing",
    "year": 2020,
    "studio": "MAPPA",
    "image": "https://cdn.myanimelist.net/images/anime/1127/113946.jpg"
  },
  {
    "mal_id": 51009,
    "title": "Jujutsu Kaisen 2nd Season",
    "english_title": "Jujutsu Kaisen Season 2",
    "genres": ["Action", "Fantasy"],
    "synopsis": "The season covers Gojo's past with Geto Suguru, showcasing their friendship and the tragic events that led to Geto's descent into darkness, followed by the highly anticipated Shibuya Incident, where curses launch a full-scale assault to seal Gojo Satoru.",
    "score": 8.81,
    "popularity": 54,
    "type": "TV",
    "episodes": 23,
    "status": "Finished Airing",
    "year": 2023,
    "studio": "MAPPA",
    "image": "https://cdn.myanimelist.net/images/anime/1792/138021.jpg"
  },
  {
    "mal_id": 38000,
    "title": "Kimetsu no Yaiba",
    "english_title": "Demon Slayer: Kimetsu no Yaiba",
    "genres": ["Action", "Fantasy"],
    "synopsis": "Tanjirou Kamado's family is slaughtered by a demon, and his sister Nezuko is transformed into one. Devastated, Tanjirou joins the Demon Slayer Corps to find a cure for Nezuko and avenge his family, traveling across Taisho-era Japan alongside Zenitsu and Inosuke.",
    "score": 8.47,
    "popularity": 7,
    "type": "TV",
    "episodes": 26,
    "status": "Finished Airing",
    "year": 2019,
    "studio": "ufotable",
    "image": "https://cdn.myanimelist.net/images/anime/1286/99889.jpg"
  },
  {
    "mal_id": 52991,
    "title": "Sousou no Frieren",
    "english_title": "Frieren: Beyond Journey's End",
    "genres": ["Adventure", "Drama", "Fantasy"],
    "synopsis": "After defeating the Demon King alongside Hero Himmel and her party, elf mage Frieren begins a journey across the lands. Elves have extremely long lives, and after Himmel's passing, Frieren deeply regrets not getting to know him better. She sets out with her apprentice Fern on a search for souls and a deeper understanding of human relationships.",
    "score": 9.39,
    "popularity": 120,
    "type": "TV",
    "episodes": 28,
    "status": "Finished Airing",
    "year": 2023,
    "studio": "Madhouse",
    "image": "https://cdn.myanimelist.net/images/anime/1015/138075.jpg"
  },
  {
    "mal_id": 44511,
    "title": "Chainsaw Man",
    "english_title": "Chainsaw Man",
    "genres": ["Action", "Fantasy"],
    "synopsis": "Denji lives in poverty, hunting Devils alongside his chainsaw-dog Pochita to pay off his deceased father's debts. Betrayed and left for dead by the Yakuza, Pochita merges with Denji's heart, resurrecting him as the Chainsaw Man. He is recruited by Makima to join the Public Safety Devil Hunters.",
    "score": 8.51,
    "popularity": 19,
    "type": "TV",
    "episodes": 12,
    "status": "Finished Airing",
    "year": 2022,
    "studio": "MAPPA",
    "image": "https://cdn.myanimelist.net/images/anime/1806/126216.jpg"
  },
  {
    "mal_id": 16498,
    "title": "Shingeki no Kyojin",
    "english_title": "Attack on Titan",
    "genres": ["Action", "Drama", "Suspense"],
    "synopsis": "For over a century, humanity has lived inside walled cities to protect themselves from giant, mindless humanoids called Titans. When a Colossal Titan breaks the outermost wall, Eren Yeager's home is destroyed and his mother is eaten. Eren vows to join the Survey Corps and wipe out every last Titan.",
    "score": 8.54,
    "popularity": 2,
    "type": "TV",
    "episodes": 25,
    "status": "Finished Airing",
    "year": 2013,
    "studio": "Wit Studio",
    "image": "https://cdn.myanimelist.net/images/anime/10/47347.jpg"
  },
  {
    "mal_id": 20,
    "title": "Naruto",
    "english_title": "Naruto",
    "genres": ["Action", "Adventure", "Fantasy"],
    "synopsis": "Naruto Uzumaki is a mischievous, orphaned ninja who is shunned by his village due to the Nine-Tailed Fox sealed inside him. Despite his loneliness, Naruto dreams of becoming the Hokage—the village's strongest leader—and proving his worth to everyone.",
    "score": 7.98,
    "popularity": 8,
    "type": "TV",
    "episodes": 220,
    "status": "Finished Airing",
    "year": 2002,
    "studio": "Studio Pierrot",
    "image": "https://cdn.myanimelist.net/images/anime/13/17405.jpg"
  },
  {
    "mal_id": 5040,
    "title": "One Outs",
    "english_title": "One Outs",
    "genres": ["Sports", "Suspense"],
    "synopsis": "Toua Tokuchi is a master of psychological manipulation and a gambler who dominates the street baseball game 'One Outs.' He is recruited by the professional team Lycaons, signing a highly unusual contract: 5 million yen for every out he gets, but he loses 50 million yen for every run he gives up.",
    "score": 8.35,
    "popularity": 625,
    "type": "TV",
    "episodes": 25,
    "status": "Finished Airing",
    "year": 2008,
    "studio": "Madhouse",
    "image": "https://cdn.myanimelist.net/images/anime/1188/94315.jpg"
  },
  {
    "mal_id": 31964,
    "title": "Boku no Hero Academia",
    "english_title": "My Hero Academia",
    "genres": ["Action"],
    "synopsis": "In a world where 80% of humans possess 'Quirks' (superpowers), Izuku Midoriya is born Quirkless. After a chance encounter with the world's number one hero, All Might, Izuku is chosen as the successor to All Might's legendary Quirk, entering the elite UA High School to become a professional hero.",
    "score": 7.89,
    "popularity": 6,
    "type": "TV",
    "episodes": 13,
    "status": "Finished Airing",
    "year": 2016,
    "studio": "Bones",
    "image": "https://cdn.myanimelist.net/images/anime/10/78745.jpg"
  },
  {
    "mal_id": 199,
    "title": "Sen to Chihiro no Kamikakushi",
    "english_title": "Spirited Away",
    "genres": ["Adventure", "Award Winning", "Supernatural"],
    "synopsis": "During her family's move to the suburbs, a sullen 10-year-old girl, Chihiro, wanders into a world ruled by gods, witches, and spirits, and where humans are changed into beasts. When her parents are turned into pigs, she must work in a mysterious bathhouse to buy their freedom and return home.",
    "score": 8.78,
    "popularity": 45,
    "type": "Movie",
    "episodes": 1,
    "status": "Finished Airing",
    "year": 2001,
    "studio": "Studio Ghibli",
    "image": "https://cdn.myanimelist.net/images/anime/6/79597.jpg"
  },
  {
    "mal_id": 32281,
    "title": "Kimi no Na wa.",
    "english_title": "Your Name.",
    "genres": ["Drama", "Supernatural"],
    "synopsis": "Mitsuha Miyamizu, a high school girl in a rural town, and Taki Tachibana, a high school boy in Tokyo, wake up one day to find they have swapped bodies. As they adapt to each other's lives and leave messages to communicate, a deeper bond is forged, leading to a race against time to prevent a cosmic disaster.",
    "score": 8.85,
    "popularity": 11,
    "type": "Movie",
    "episodes": 1,
    "status": "Finished Airing",
    "year": 2016,
    "studio": "CoMix Wave Films",
    "image": "https://cdn.myanimelist.net/images/anime/5/87048.jpg"
  },
  {
    "mal_id": 34599,
    "title": "Made in Abyss",
    "english_title": "Made in Abyss",
    "genres": ["Adventure", "Drama", "Fantasy", "Mystery", "Sci-Fi"],
    "synopsis": "The Abyss is a colossal crater stretching deep into the earth, filled with mysterious relics and dangerous creatures. Riko, a young girl whose mother vanished in its depths, encounters a humanoid robot named Reg. Together, they descend into the deep and beautiful, yet horrifying, layers of the Abyss.",
    "score": 8.67,
    "popularity": 135,
    "type": "TV",
    "episodes": 13,
    "status": "Finished Airing",
    "year": 2017,
    "studio": "Kinema Citrus",
    "image": "https://cdn.myanimelist.net/images/anime/6/86733.jpg"
  },
  {
    "mal_id": 37999,
    "title": "Kaguya-sama wa Kokurasetai: Tensai-tachi no Renai Zunousen",
    "english_title": "Kaguya-sama: Love is War",
    "genres": ["Comedy"],
    "synopsis": "Student council president Miyuki Shirogane and vice president Kaguya Shinomiya appear to be the perfect couple, yet both are too proud to confess their feelings first. Believing that the first to confess loses, they engage in highly elaborate, comedic psychological battles to force the other to confess.",
    "score": 8.41,
    "popularity": 22,
    "type": "TV",
    "episodes": 12,
    "status": "Finished Airing",
    "year": 2019,
    "studio": "A-1 Pictures",
    "image": "https://cdn.myanimelist.net/images/anime/1295/106551.jpg"
  },
  {
    "mal_id": 3470,
    "title": "Toradora!",
    "english_title": "Toradora!",
    "genres": ["Drama", "Romance"],
    "synopsis": "Ryuuji Takasu is a gentle high schooler whose intimidating eyes make him look like a delinquent. He clashes with Taiga Aisaka, a tiny but fierce girl known as the Palmtop Tiger. Discovering that they both have crushes on each other's best friends, they agree to help each other, forming an unlikely alliance.",
    "score": 8.08,
    "popularity": 18,
    "type": "TV",
    "episodes": 25,
    "status": "Finished Airing",
    "year": 2008,
    "studio": "J.C.Staff",
    "image": "https://cdn.myanimelist.net/images/anime/13/14300.jpg"
  },
  {
    "mal_id": 3588,
    "title": "Soul Eater",
    "english_title": "Soul Eater",
    "genres": ["Action", "Fantasy", "Comedy"],
    "synopsis": "At Death Weapon Meister Academy, meisters train along with their human weapons who can transform into arms. Maka Albarn and her scythe partner Soul Eater combat evil souls to transform Soul into a Death Scythe, protecting Death City from malevolent forces.",
    "score": 7.84,
    "popularity": 48,
    "type": "TV",
    "episodes": 51,
    "status": "Finished Airing",
    "year": 2008,
    "studio": "Bones",
    "image": "https://cdn.myanimelist.net/images/anime/1109/118335.jpg"
  },
  {
    "mal_id": 20507,
    "title": "Noragami",
    "english_title": "Noragami",
    "genres": ["Action", "Fantasy"],
    "synopsis": "Yato is a minor god who lacks a shrine or any worshippers, doing odd jobs for 5 yen to save up for his own temple. When high school girl Hiyori Iki pushes him out of the way of a bus, her soul becomes loose. She demands Yato fix her, and they embark on a series of supernatural adventures.",
    "score": 7.95,
    "popularity": 15,
    "type": "TV",
    "episodes": 12,
    "status": "Finished Airing",
    "year": 2014,
    "studio": "Bones",
    "image": "https://cdn.myanimelist.net/images/anime/1886/128143.jpg"
  },
  {
    "mal_id": 14719,
    "title": "JoJo no Kimyou na Bouken (TV)",
    "english_title": "JoJo's Bizarre Adventure (TV)",
    "genres": ["Action", "Adventure", "Fantasy"],
    "synopsis": "In 1880s England, Jonathan Joestar meets his new adoptive brother Dio Brando, who secretly plots to usurp the Joestar fortune. When Dio uses a mysterious Stone Mask to become a vampire, Jonathan must learn the ancient martial art of Hamon to defeat him, initiating a multi-generational bloodline war.",
    "score": 8.08,
    "popularity": 32,
    "type": "TV",
    "episodes": 26,
    "status": "Finished Airing",
    "year": 2012,
    "studio": "David Production",
    "image": "https://cdn.myanimelist.net/images/anime/3/40401.jpg"
  }
];

// Let's add more standard, popular, highly requested titles to ensure a rich and diverse anime ecosystem
const EXTRA_POPULAR_FALLBACK = [
  {
    "mal_id": 1735,
    "title": "Naruto: Shippuuden",
    "english_title": "Naruto Shippuden",
    "genres": ["Action", "Adventure", "Fantasy"],
    "synopsis": "Naruto Uzumaki returns to Konohagakure after two and a half years of intense training with Jiraiya. He is stronger, faster, and more determined than ever. However, the sinister Akatsuki organization is actively hunting down the jinchuuriki hosts of all nine tailed beasts, planning to initiate a global conflict.",
    "score": 8.26,
    "popularity": 4,
    "type": "TV",
    "episodes": 500,
    "status": "Finished Airing",
    "year": 2007,
    "studio": "Studio Pierrot",
    "image": "https://cdn.myanimelist.net/images/anime/1565/111305.jpg"
  },
  {
    "mal_id": 431,
    "title": "Howl no Ugoku Shiro",
    "english_title": "Howl's Moving Castle",
    "genres": ["Adventure", "Award Winning", "Fantasy", "Drama", "Romance"],
    "synopsis": "Sophie, a quiet girl working in a hat shop, finds her life thrown into turmoil when she is literally swept off her feet by a handsome but mysterious wizard named Howl. The vain and vengeful Witch of the Waste, jealous of their association, puts a curse on Sophie, turning her into a ninety-year-old woman.",
    "score": 8.66,
    "popularity": 38,
    "type": "Movie",
    "episodes": 1,
    "status": "Finished Airing",
    "year": 2004,
    "studio": "Studio Ghibli",
    "image": "https://cdn.myanimelist.net/images/anime/1860/120613.jpg"
  },
  {
    "mal_id": 435,
    "title": "Mononoke Hime",
    "english_title": "Princess Mononoke",
    "genres": ["Action", "Adventure", "Award Winning", "Fantasy"],
    "synopsis": "While defending his village from a demonic boar, the young prince Ashitaka is afflicted with a deadly curse. Seeking a cure, he travels to the west, where he lands in the middle of a war between the industrialized Tatara (Iron Town) and the forest spirits, led by San, the wild Princess Mononoke.",
    "score": 8.67,
    "popularity": 43,
    "type": "Movie",
    "episodes": 1,
    "status": "Finished Airing",
    "year": 1997,
    "studio": "Studio Ghibli",
    "image": "https://cdn.myanimelist.net/images/anime/7/75919.jpg"
  },
  {
    "mal_id": 30276,
    "title": "One Punch Man",
    "english_title": "One Punch Man",
    "genres": ["Action", "Comedy", "Sci-Fi"],
    "synopsis": "Saitama is a seemingly ordinary guy who decided to become a hero for fun. After three years of intense training, he has grown so strong that he can defeat any enemy with a single punch. However, this absolute strength has left him bored and unfulfilled, seeking an opponent who can truly challenge him.",
    "score": 8.51,
    "popularity": 5,
    "type": "TV",
    "episodes": 12,
    "status": "Finished Airing",
    "year": 2015,
    "studio": "Madhouse",
    "image": "https://cdn.myanimelist.net/images/anime/12/76049.jpg"
  },
  {
    "mal_id": 19815,
    "title": "No Game No Life",
    "english_title": "No Game, No Life",
    "genres": ["Comedy", "Fantasy", "Suspense"],
    "synopsis": "Sora and Shiro are legendary shut-in gamer siblings known as 'Blank'. They view the real world as a garbage game. Summoned by Tet, the God of Games, to Disboard—a fantasy world where all conflicts, boundaries, and lives are decided through high-stakes games—they plan to conquer all sixteen races.",
    "score": 8.1,
    "popularity": 14,
    "type": "TV",
    "episodes": 12,
    "status": "Finished Airing",
    "year": 2014,
    "studio": "Madhouse",
    "image": "https://cdn.myanimelist.net/images/anime/1074/111944.jpg"
  },
  {
    "mal_id": 33486,
    "title": "Boku no Hero Academia 2nd Season",
    "english_title": "My Hero Academia Season 2",
    "genres": ["Action"],
    "synopsis": "The second season follows Izuku Midoriya and his classmates as they participate in the highly anticipated UA Sports Festival, showcasing their Quirks to the world and attracting the attention of both professional heroes and the sinister Hero Killer, Stain.",
    "score": 8.12,
    "popularity": 16,
    "type": "TV",
    "episodes": 25,
    "status": "Finished Airing",
    "year": 2017,
    "studio": "Bones",
    "image": "https://cdn.myanimelist.net/images/anime/12/85221.jpg"
  },
  {
    "mal_id": 22319,
    "title": "Tokyo Ghoul",
    "english_title": "Tokyo Ghoul",
    "genres": ["Action", "Drama", "Fantasy", "Suspense"],
    "synopsis": "Ken Kaneki is a shy college student who survives a deadly encounter with Rize Kamishiro, a Ghoul who feeds on human flesh. Grafted with her organs to save his life, Kaneki becomes a half-ghoul, caught between the human world and the dark, violent society of Ghouls.",
    "score": 7.79,
    "popularity": 9,
    "type": "TV",
    "episodes": 12,
    "status": "Finished Airing",
    "year": 2014,
    "studio": "Studio Pierrot",
    "image": "https://cdn.myanimelist.net/images/anime/5/64449.jpg"
  },
  {
    "mal_id": 6547,
    "title": "Angel Beats!",
    "english_title": "Angel Beats!",
    "genres": ["Drama", "Supernatural", "Action", "Comedy"],
    "synopsis": "Otonashi wakes up with amnesia in the afterlife, a high school designed for teens who suffered trauma in life before dying. He is recruited by Yuri into the Shinda Sekai Sensen (Afterlife Battlefront) to rebel against the student council president, Angel, and their fate.",
    "score": 8.06,
    "popularity": 21,
    "type": "TV",
    "episodes": 13,
    "status": "Finished Airing",
    "year": 2010,
    "studio": "P.A. Works",
    "image": "https://cdn.myanimelist.net/images/anime/1244/138851.jpg"
  }
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPage(page) {
  const url = `https://api.jikan.moe/v4/top/anime?page=${page}`;
  console.log(`Fetching Jikan page ${page}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const result = await response.json();
  return result.data || [];
}

async function main() {
  let allAnime = [...FALLBACK_ANIME, ...EXTRA_POPULAR_FALLBACK];
  const fetchedIds = new Set(allAnime.map(a => a.mal_id));

  try {
    console.log("Starting Jikan Jikan live fetch...");
    // Let's fetch the first 12 pages (300 more popular anime)
    for (let page = 1; page <= 12; page++) {
      try {
        const items = await fetchPage(page);
        if (items.length === 0) break;

        for (const item of items) {
          if (fetchedIds.has(item.mal_id)) continue;
          
          const anime = {
            mal_id: item.mal_id,
            title: item.title,
            english_title: item.title_english || item.title,
            genres: (item.genres || []).map(g => g.name),
            synopsis: item.synopsis || "No description available.",
            score: item.score || 7.0,
            popularity: item.popularity || 9999,
            type: item.type || "TV",
            episodes: item.episodes || 12,
            status: item.status || "Finished Airing",
            year: item.year || (item.aired && item.aired.prop && item.aired.prop.from && item.aired.prop.from.year) || 2020,
            studio: (item.studios && item.studios[0] && item.studios[0].name) || "Unknown Studio",
            image: (item.images && item.images.jpg && item.images.jpg.image_url) || "https://cdn.myanimelist.net/images/anime/10/78745.jpg"
          };

          allAnime.push(anime);
          fetchedIds.add(anime.mal_id);
        }

        console.log(`Successfully parsed page ${page}. Current total: ${allAnime.length} anime entries.`);
        // Sleep to avoid rate limiting
        await sleep(1500);
      } catch (err) {
        console.warn(`Warning: Failed to fetch page ${page}: ${err.message}. Moving on or ending fetch.`);
        // Sleep a bit more on error
        await sleep(3000);
        if (page > 2) {
          // If we fetched at least a page or two, we can stop and use what we have + fallback
          break;
        }
      }
    }
  } catch (error) {
    console.error("General error during API fetch, using fallback data:", error.message);
  }

  // Deduplicate and clean up synopsis references
  allAnime = allAnime.map(anime => {
    if (anime.synopsis) {
      // Remove MyAnimeList attribution text
      anime.synopsis = anime.synopsis.replace(/\[Written by MAL Rewrite\]/g, '').trim();
    }
    return anime;
  });

  // Sort by popularity index (lower means more popular)
  allAnime.sort((a, b) => a.popularity - b.popularity);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allAnime, null, 2), 'utf-8');
  console.log(`\nSUCCESS! Created compile-ready anime database at: ${OUTPUT_FILE}`);
  console.log(`Total database entries: ${allAnime.length}`);
}

main();
