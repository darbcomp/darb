const perfume = ({
  name, arabicName, slug, primaryCategory, alsoIn = [], inspiredBy = "",
  top = [], middle = [], base = [], keyNotes = [], description = "",
  families = [], bestFor = [],
}) => ({
  name, arabicName, slug, primaryCategory, alsoIn, productType: "perfume", inspiredBy,
  scentNotes: { top, middle, base }, keyNotes, description, scentFamilies: families, bestFor,
  concentration: "", sizeLabel: "50 ML", sizeMl: 50,
  price: 1000, stock: 8, lowStockThreshold: 3,
  isActive: true, isPlaceholder: false,
  isFeatured: false, isBestSeller: false, isNewArrival: false,
});

const products = [
  perfume({
    name: "Faris", arabicName: "فارس", slug: "faris", primaryCategory: "men",
    inspiredBy: "Invictus Victory Elixir",
    top: ["Lavender", "Cardamom", "Black Pepper"],
    middle: ["Incense", "Patchouli"],
    base: ["Vanilla Pod", "Tonka Bean"],
    description: "Faris enters with confidence and stays with presence. Spiced lavender and black pepper lead into smoky incense, before warm vanilla and tonka bean take over. Deep, magnetic, and unmistakably masculine — a fragrance made for the man who never needs to ask for attention.",
    families: ["Warm Spicy", "Vanilla", "Amber"],
    bestFor: ["Date Night", "Weddings", "Special Occasions", "Night Out"],
  }),
  perfume({
    name: "Qandeel", arabicName: "قنديل", slug: "qandeel", primaryCategory: "men",
    inspiredBy: "Megamare",
    top: ["Bergamot", "Lemon"],
    middle: ["Seaweed", "Calone", "Hedione"],
    base: ["Musk", "Ambroxan", "Cedar"],
    description: "Qandeel carries the mystery of the open sea. Bright citrus meets an intense marine heart, settling into mineral woods, musk, and ambroxan. Salty, powerful, and unconventional — a scent that leaves its mark long after the tide has passed.",
    families: ["Marine", "Aquatic", "Musky"],
    bestFor: ["Summer Days", "Beach", "Vacation", "Outdoor Gatherings"],
  }),
  perfume({
    name: "Mawg", arabicName: "موج", slug: "mawg", primaryCategory: "men",
    inspiredBy: "Acqua di Giò Profumo",
    top: ["Sea Notes", "Bergamot"],
    middle: ["Rosemary", "Sage", "Geranium"],
    base: ["Incense", "Patchouli"],
    description: "Fresh like the first wave, deeper than expected. Mawg blends crisp bergamot and marine notes with aromatic herbs, then settles into smoky incense and earthy patchouli. Clean, sophisticated, and effortlessly versatile from morning to night.",
    families: ["Aquatic", "Aromatic", "Woody"],
    bestFor: ["Office", "College", "Dinner", "Everyday Wear"],
  }),
  perfume({
    name: "Hazeem", arabicName: "هزيم", slug: "hazeem", primaryCategory: "men",
    inspiredBy: "Roja Elysium",
    top: ["Grapefruit", "Lemon", "Bergamot", "Lime", "Thyme", "Galbanum", "Artemisia"],
    middle: ["Vetiver", "Juniper Berries", "Blackcurrant", "Apple", "Cedar", "Pink Pepper", "Cypriol", "Lily-of-the-Valley", "Jasmine", "Rose"],
    base: ["Ambergris", "Leather", "Vanilla", "Benzoin", "Labdanum"],
    description: "Hazeem is freshness with authority. Vibrant citrus and crisp fruits open the way to refined woods, vetiver, and subtle spice, grounded by leather and ambergris. Polished, confident, and effortlessly distinguished — made for a presence that speaks before you do.",
    families: ["Citrus", "Aromatic", "Woody"],
    bestFor: ["Business Meetings", "Office", "Weddings", "Smart Casual"],
  }),
  perfume({
    name: "Najm", arabicName: "نجم", slug: "najm", primaryCategory: "men", alsoIn: ["unisex"],
    inspiredBy: "Tiziana Terenzi Kirkè",
    top: ["Passion Fruit", "Peach", "Pear", "Raspberry", "Cassis", "Sand"],
    middle: ["Lily-of-the-Valley"],
    base: ["Musk", "Sandalwood", "Vanilla", "Patchouli", "Heliotrope"],
    description: "Some scents are made to blend in. Najm isn't one of them. An addictive burst of passion fruit, peach, pear, and berries melts into smooth vanilla, sandalwood, and musk. Sweet, sensual, and impossible to overlook — made to be remembered.",
    families: ["Fruity", "Sweet", "Musky"],
    bestFor: ["Dates", "Parties", "Social Events", "Vacation"],
  }),
  perfume({
    name: "Naseem", arabicName: "نسيم", slug: "naseem", primaryCategory: "men",
    inspiredBy: "Lorenzo Pazzaglia Dream Sea",
    top: ["Aquatic Notes", "Pink Pepper", "Black Pepper", "Ozone", "Green Notes"],
    middle: ["White Flowers", "Bulgarian Rose", "Ylang-Ylang", "Spices"],
    base: ["Ambergris", "Black Cyprus Salt", "Sandalwood", "Cedarwood", "Vanilla"],
    description: "Naseem feels like a breeze arriving from somewhere far away. Fresh aquatic notes and pepper meet delicate florals, then slowly settle into sea salt, ambergris, warm woods, and vanilla. Airy at first, warm underneath — a quiet escape you can wear.",
    families: ["Aquatic", "Salty", "Woody Vanilla"],
    bestFor: ["Sunset Dates", "Beach", "Vacation", "Spring & Summer Evenings"],
  }),
  perfume({
    name: "Hawas", arabicName: "هوس", slug: "hawas", primaryCategory: "men",
    inspiredBy: "New Notes Mangomina D",
    top: ["Mango", "Mandarin", "Yuzu", "Marine Notes"],
    middle: ["Solar Notes", "Saffron", "Rose"],
    base: ["Patchouli", "Sandalwood", "Cashmere Wood", "Mossy Notes", "Amber", "Musk"],
    description: "Hawas starts with temptation. Juicy mango, mandarin, and yuzu burst through fresh marine notes, warmed by saffron before melting into smooth woods, amber, and musk. Tropical, vibrant, and dangerously addictive — one spray is rarely enough.",
    families: ["Tropical", "Fruity", "Woody"],
    bestFor: ["Summer Dates", "Brunch", "Vacation", "Day Out"],
  }),
  perfume({
    name: "Mazaq", arabicName: "مذاق", slug: "mazaq", primaryCategory: "men", alsoIn: ["unisex"],
    inspiredBy: "Bianco Latte",
    top: ["Caramel"], middle: ["Honey", "Coumarin"], base: ["Vanilla", "White Musk"],
    description: "Mazaq smells almost good enough to taste. Warm caramel melts into golden honey, creamy vanilla, and soft white musk, creating a rich gourmand trail that feels intimate and irresistible. Sweet, cozy, and made for getting closer.",
    families: ["Gourmand", "Vanilla", "Caramel"],
    bestFor: ["Date Night", "Dinner", "Cozy Evenings", "Winter"],
  }),
  perfume({
    name: "Haibah", arabicName: "هيبة", slug: "haibah", primaryCategory: "men",
    inspiredBy: "Montblanc Legend",
    top: ["Lavender", "Pineapple", "Bergamot", "Lemon Verbena"],
    middle: ["Red Apple", "Dried Fruits", "Oakmoss", "Geranium", "Coumarin", "Rose"],
    base: ["Tonka Bean", "Sandalwood"],
    description: "True presence doesn't need to be loud. Haibah opens fresh with lavender, bergamot, and pineapple, develops into aromatic woods and fruits, then settles smoothly into sandalwood and tonka bean. Clean, masculine, and naturally confident — an effortless everyday signature.",
    families: ["Aromatic", "Fruity", "Woody"],
    bestFor: ["Office", "College", "Business Meetings", "Everyday Wear"],
  }),
  perfume({
    name: "Sahm", arabicName: "سهم", slug: "sahm", primaryCategory: "men",
    inspiredBy: "Black XS",
    top: ["Lemon", "Sage"],
    middle: ["Praline", "Cinnamon", "Tolu Balsam", "Black Cardamom"],
    base: ["Patchouli", "Rosewood", "Black Amber"],
    description: "Sahm hits its target from the first impression. Fresh lemon and sage give way to warm cinnamon, cardamom, and addictive praline, before dark amber and patchouli take control. Sweet, spicy, and rebellious — built for nights that aren't meant to end early.",
    families: ["Amber", "Sweet", "Spicy"],
    bestFor: ["Date Night", "Parties", "Night Out", "Winter Evenings"],
  }),
  perfume({
    name: "Barq", arabicName: "برق", slug: "barq", primaryCategory: "men",
    inspiredBy: "Bad Boy",
    top: ["Bergamot", "Pink Pepper", "White Pepper"], middle: ["Cedarwood", "Clary Sage"], base: ["Tonka Bean", "Cocoa"],
    description: "Barq strikes fast and leaves a trace. Bergamot and pepper create an electric opening, sharpened by aromatic sage and cedar before dark cocoa and warm tonka bean emerge. Bold, seductive, and full of contrast — just like the name.",
    families: ["Amber", "Aromatic", "Woody"], bestFor: ["Date Night", "Parties", "Evening Events", "Night Out"],
  }),

  perfume({
    name: "Ghewaa", arabicName: "غوى", slug: "ghewaa", primaryCategory: "women",
    inspiredBy: "Yum Boujee Marshmallow | 81",
    top: ["Freesia", "Italian Lemon", "Nectarine Blossom", "Apple"],
    middle: ["Marshmallow", "Strawberry", "Coconut", "Orange Blossom"],
    base: ["Whipped Cream", "Sugar", "Vanilla", "Musk", "Raspberry", "Ambroxan"],
    description: "Ghewaa is sweetness you willingly surrender to. Juicy fruits and delicate florals melt into fluffy marshmallow, strawberry, and coconut, before settling into whipped vanilla, sugar, and soft musk. Playful, creamy, and deliciously addictive — temptation was never meant to be resisted.",
    families: ["Sweet", "Fruity", "Gourmand"], bestFor: ["Dates", "Girls' Night", "Casual Outings", "Cozy Evenings"],
  }),
  perfume({
    name: "Shaghaf", arabicName: "شغف", slug: "shaghaf", primaryCategory: "women",
    inspiredBy: "Burberry Her",
    top: ["Strawberry", "Raspberry", "Blackberry", "Sour Cherry", "Blackcurrant", "Mandarin", "Lemon"],
    middle: ["Violet", "Jasmine"], base: ["Musk", "Vanilla", "Cashmeran", "Woody Notes", "Amber", "Oakmoss", "Patchouli"],
    description: "Shaghaf is made for the moments you follow your heart. A vibrant rush of berries unfolds into delicate violet and jasmine, wrapped in warm vanilla, musk, and soft woods. Feminine, lively, and effortlessly captivating — passion with a playful side.",
    families: ["Fruity", "Sweet", "Floral"], bestFor: ["College", "Brunch", "Dates", "Everyday Wear"],
  }),
  perfume({
    name: "Ward", arabicName: "ورد", slug: "ward", primaryCategory: "women",
    inspiredBy: "Love Is Heavenly",
    top: ["Mandarin Blossom", "Blackberry", "Orange", "Kiwi"],
    middle: ["Water Lily", "Freesia", "Peony", "Orchid"], base: ["Musk", "Sandalwood", "Ebony Wood", "Mahogany"],
    description: "Ward is femininity in full bloom. Bright fruits meet an airy bouquet of peony, freesia, orchid, and water lily, resting over soft musk and elegant woods. Fresh, graceful, and beautifully delicate — like flowers carried on a gentle breeze.",
    families: ["Floral", "Fruity", "Woody"], bestFor: ["Daytime Dates", "Brunch", "College", "Spring Days"],
  }),
  perfume({
    name: "Ishq", arabicName: "عشق", slug: "ishq", primaryCategory: "women",
    inspiredBy: "Sì Passione",
    top: ["Pear", "Blackcurrant", "Pink Pepper", "Grapefruit"], middle: ["Pineapple", "Rose", "Jasmine", "Heliotrope"], base: ["Vanilla", "Cedar", "Patchouli", "Amberwood"],
    description: "Ishq begins with a spark and grows deeper with every moment. Juicy pear and blackcurrant meet passionate rose and jasmine, before warm vanilla and woods create a sensual finish. Confident, feminine, and magnetic — because some feelings were never meant to stay hidden.",
    families: ["Fruity", "Floral", "Woody Vanilla"], bestFor: ["Romantic Dates", "Weddings", "Dinner", "Special Occasions"],
  }),
  perfume({
    name: "Haneen", arabicName: "حنين", slug: "haneen", primaryCategory: "women",
    inspiredBy: "Vanilla | 28",
    top: ["Vanilla Orchid", "Jasmine"], middle: ["Brown Sugar", "Tonka Bean"], base: ["Amber", "Amberwood", "Musk", "Patchouli"],
    description: "Haneen feels warm, familiar, and impossible to forget. Vanilla orchid and jasmine melt into rich brown sugar and tonka bean, settling over amber, musk, and patchouli. Sweet, intimate, and comforting — like returning to a memory you never wanted to leave.",
    families: ["Vanilla", "Amber", "Sweet"], bestFor: ["Date Night", "Cozy Evenings", "Winter", "Everyday Layering"],
  }),
  perfume({
    name: "Sahar", arabicName: "سهر", slug: "sahar", primaryCategory: "women",
    inspiredBy: "Katy Perry's Mad Love",
    top: ["Sorbet", "Strawberry", "Apple", "Pink Grapefruit"], middle: ["Floral Notes", "Peony", "Jasmine"], base: ["Coconut", "Musk", "Sandalwood"],
    description: "Sahar was made for nights that turn into stories. Juicy strawberry, apple, and sorbet bring a playful sweetness, softened by delicate florals and a creamy trail of coconut, musk, and sandalwood. Fun, flirty, and carefree — the night is still young.",
    families: ["Fruity", "Sweet", "Gourmand"], bestFor: ["Girls' Night", "Casual Dates", "Parties", "Summer Evenings"],
  }),
  perfume({
    name: "Ghazal", arabicName: "غزل", slug: "ghazal", primaryCategory: "women",
    inspiredBy: "Bombshell St. Tropez by Victoria's Secret",
    top: ["Pineapple"], middle: ["Peony"], base: ["Musk"],
    description: "Ghazal is effortless charm under the summer sun. Juicy pineapple brings a bright tropical opening, softened by feminine peony and finished with clean, sensual musk. Fresh, playful, and naturally flirtatious — the kind of charm that never feels rehearsed.",
    families: ["Fruity", "Floral", "Musky"], bestFor: ["Beach Days", "Vacation", "Brunch", "Summer Dates"],
  }),
  perfume({
    name: "Rouh", arabicName: "روح", slug: "rouh", primaryCategory: "women",
    inspiredBy: "Valaya Exclusif",
    top: ["Almond", "Bergamot", "Mandarin"], middle: ["Orange Blossom", "White Flowers"], base: ["White Musk", "Akigalawood", "Sandalwood", "Vanilla"],
    description: "Rouh is elegance felt before it's noticed. Soft almond and luminous citrus open into pure white florals, wrapped in creamy sandalwood, vanilla, and white musk. Refined, graceful, and quietly sensual — a fragrance that feels like a second skin.",
    families: ["Floral", "Musky", "Woody"], bestFor: ["Elegant Dinners", "Weddings", "Formal Events", "Everyday Luxury"],
  }),
  perfume({
    name: "Gharam", arabicName: "غرام", slug: "gharam", primaryCategory: "women",
    inspiredBy: "Sì Passione Red Musk",
    top: ["Strawberry", "Musk"], middle: ["Rose", "Milk"], base: ["Musk", "Vanilla"],
    description: "Gharam is romance with an addictive edge. Juicy strawberry meets a creamy heart of rose and milk, wrapped from beginning to end in soft musk and warm vanilla. Smooth, intimate, and irresistibly feminine — made for getting closer.",
    families: ["Fruity", "Musky", "Creamy Floral"], bestFor: ["Romantic Dates", "Dinner", "Evening Out", "Special Occasions"],
  }),
  perfume({
    name: "Nagham", arabicName: "نغم", slug: "nagham", primaryCategory: "women", alsoIn: ["unisex"],
    inspiredBy: "Escada Tropical Punch",
    top: ["Papaya", "Pear", "Pomegranate"], middle: ["White Peach", "Hibiscus", "Freesia", "Lily-of-the-Valley"], base: ["White Musk", "Amber"],
    description: "Nagham moves with its own rhythm. Tropical fruits and juicy pomegranate dance into soft hibiscus and freesia, before settling into warm amber and clean white musk. Bright, cheerful, and full of life — a fragrance that instantly changes the mood.",
    families: ["Tropical", "Fruity", "Floral"], bestFor: ["Vacation", "Beach", "Day Out", "Summer Parties"],
  }),
  perfume({
    name: "Sehr", arabicName: "سحر", slug: "sehr", primaryCategory: "women",
    inspiredBy: "Very Sexy Now 2016 by Victoria's Secret",
    top: ["Coconut Nectar", "Fruity Notes"], middle: ["Pink Lotus"], base: ["Sand", "Vanilla", "White Musk"],
    description: "Sehr feels like summer temptation on warm skin. Creamy coconut nectar and juicy fruits melt into soft pink lotus, before settling into warm vanilla, white musk, and a unique sandy accord. Tropical, feminine, and effortlessly seductive — a little escape you can wear.",
    families: ["Floral", "Fruity", "Gourmand"], bestFor: ["Summer Dates", "Beach Days", "Vacation", "Summer Evenings"],
  }),
  perfume({
    name: "Hawa", arabicName: "هوى", slug: "hawa", primaryCategory: "women",
    inspiredBy: "Fame Intense by Rabanne",
    top: ["Coconut Water", "Pink Pepper", "Bergamot"], middle: ["Jasmine", "Incense", "Ylang-Ylang"], base: ["Sandalwood", "Musk", "Virginian Cedar"],
    description: "Hawa glows from the moment it touches the skin. Fresh coconut water and bergamot lead into radiant jasmine, smoky incense, and ylang-ylang, resting over creamy sandalwood and musk. Luminous, sensual, and confidently feminine — made to shine after dark.",
    families: ["Floral", "Woody", "Musky"], bestFor: ["Dinner", "Weddings", "Parties", "Evening Dates"],
  }),
  perfume({
    name: "Rahaf", arabicName: "رهف", slug: "rahaf", primaryCategory: "women",
    inspiredBy: "Ginza by Shiseido",
    top: ["Pomegranate", "Pink Pepper"], middle: ["Orchid", "Freesia", "Magnolia", "Jasmine"], base: ["Patchouli", "Hinoki", "Sandalwood"],
    description: "Rahaf balances softness with quiet strength. Sparkling pomegranate and pink pepper reveal an elegant floral heart, grounded by hinoki, sandalwood, and patchouli. Delicate yet confident, graceful yet distinctive — softness was never the same as weakness.",
    families: ["Floral", "Fruity", "Woody"], bestFor: ["Office", "Elegant Daywear", "Dinner", "Special Occasions"],
  }),
  perfume({
    name: "Mahd", arabicName: "مهد", slug: "mahd", primaryCategory: "women", alsoIn: ["unisex"],
    inspiredBy: "Hibiscus Mahajád",
    keyNotes: ["Hibiscus", "Damask Rose", "Blackcurrant", "Spearmint", "Cinnamon", "Vanilla", "Leather", "Ambrette"],
    description: "Mahd is richness in full color. A striking floral heart of hibiscus and rose meets juicy blackcurrant, cool mint, and warm cinnamon, before sinking into sensual vanilla, leather, and musk. Opulent, distinctive, and unforgettable — made for a woman who leaves an impression.",
    families: ["Floral", "Fruity", "Spicy"], bestFor: ["Weddings", "Luxury Events", "Date Night", "Special Occasions"],
  }),
  perfume({
    name: "Layla", arabicName: "ليلى", slug: "layla", primaryCategory: "women",
    inspiredBy: "L'Interdit Eau de Parfum Rouge by Givenchy",
    top: ["Blood Orange", "Ginger"], middle: ["Orange Blossom", "Jasmine", "Pimento"], base: ["Patchouli", "Sandalwood"],
    description: "Layla begins when the ordinary day ends. Blood orange and ginger ignite a sensual heart of jasmine and orange blossom, warmed by spicy pimento and deep woods. Bold, mysterious, and undeniably seductive — some fragrances simply belong to the night.",
    families: ["Floral", "Spicy", "Woody"], bestFor: ["Date Night", "Weddings", "Formal Evenings", "Special Occasions"],
  }),
];

const perfumePrices = {
  faris: 800, mawg: 700, qandeel: 650, hazeem: 800, mazaq: 750,
  haibah: 750, sahm: 700, naseem: 850, hawas: 800, barq: 750, najm: 800,
  sehr: 700, hawa: 750, sahar: 750, ghazal: 700, rouh: 800,
  gharam: 750, nagham: 650, rahaf: 650, layla: 750, mahd: 850,
  haneen: 750, ishq: 800, ward: 700, ghewaa: 800, shaghaf: 750,
};
const initialBestSellers = new Set(["faris", "mawg", "shaghaf", "gharam"]);

products.forEach((product) => {
  product.price = perfumePrices[product.slug];
  product.isBestSeller = initialBestSellers.has(product.slug);
});

const musks = [
  {
    slug: "marshmallow",
    name: "Marshmallow Musk",
    description: "A soft, comforting blend where the purity of musk meets the sweet, airy warmth of marshmallow. Creamy, smooth, and addictive, with a delicate sweetness that stays close to the skin. Made with raw musk, free from alcohol and additives, for a rich and authentic scent experience.",
  },
  {
    slug: "blueberry",
    name: "Blueberry Musk",
    description: "A fresh and playful take on musk, blending its clean softness with the juicy sweetness of blueberry. Fruity without feeling overly sweet, leaving a smooth and distinctive trail on the skin. Made with raw musk, free from alcohol and additives, preserving its pure and concentrated character.",
  },
  {
    slug: "pomegranate",
    name: "Pomegranate Musk",
    description: "A vibrant blend of pure musk and the juicy, slightly tart character of pomegranate. Fresh, fruity, and beautifully balanced, creating a scent that feels lively yet refined. Made with raw musk, free from alcohol and additives, for a concentrated and authentic fragrance experience.",
  },
  {
    slug: "white",
    name: "White Musk",
    description: "Clean, soft, and effortlessly comforting. White Musk captures the feeling of freshly washed skin with a delicate soapy freshness and a subtle floral touch. Made with raw musk, free from alcohol and additives, giving it a pure, intimate character that sits beautifully on the skin.",
  },
  {
    slug: "vanilla",
    name: "Vanilla Musk",
    description: "Warm vanilla melts into the softness of musk to create a creamy, smooth, and comforting scent. Sweet without becoming overwhelming, it leaves an inviting warmth that feels both familiar and luxurious. Made with raw musk, free from alcohol and additives, for a rich and concentrated experience.",
  },
  {
    slug: "pineapple",
    name: "Pineapple Musk",
    description: "A bright tropical interpretation of musk, combining its smooth character with the fresh, juicy sweetness of pineapple. Vibrant and uplifting at first, then settling into a soft, clean trail. Made with raw musk, free from alcohol and additives, maintaining its pure and concentrated nature.",
  },
];

for (const musk of musks) {
  products.push({
    name: musk.name,
    arabicName: "",
    slug: musk.slug,
    primaryCategory: "musk",
    alsoIn: [],
    productType: "musk",
    inspiredBy: "",
    scentNotes: { top: [], middle: [], base: [] },
    keyNotes: [],
    description: musk.description,
    scentFamilies: [],
    bestFor: [],
    concentration: "",
    sizeLabel: "6 ML",
    sizeMl: 6,
    price: 200,
    stock: 8,
    lowStockThreshold: 3,
    isActive: true,
    isPlaceholder: false,
    isFeatured: false,
    isBestSeller: false,
    isNewArrival: false,
  });
}

const arabicProductNames = {
  marshmallow: "مسك مارشميلو",
  blueberry: "مسك توت أزرق",
  pomegranate: "مسك رمان",
  white: "مسك أبيض",
  vanilla: "مسك فانيليا",
  pineapple: "مسك أناناس",
};

const arabicDescriptions = {
  faris: "يدخل فارس بثقة ويترك حضورًا لا يُنسى. يبدأ بلافندر متبّل وحب الهال والفلفل الأسود، ثم يكشف عن بخور مدخّن قبل أن تستقر الفانيليا الدافئة وحبوب التونكا. عميق وجذاب وذو طابع رجولي واضح؛ عطر للرجل الذي يلفت الانتباه من دون أن يطلبه.",
  qandeel: "يحمل قنديل غموض البحر المفتوح. تلتقي الحمضيات المشرقة بقلب بحري مكثف، ثم يستقر العطر على أخشاب معدنية ومسك وأمبروكسان. مالح وقوي وغير تقليدي؛ يترك أثره طويلًا بعد انحسار الموج.",
  mawg: "منعش كأول موجة وأعمق مما تتوقع. يمزج موج البرغموت الصافي والنوتات البحرية بالأعشاب العطرية، ثم يستقر على بخور مدخّن وباتشولي ترابي. نظيف وراقٍ ومتعدد الاستخدامات بسهولة من الصباح حتى المساء.",
  hazeem: "هزيم هو الانتعاش بحضور قوي. تفتح الحمضيات النابضة والفواكه المنعشة الطريق لأخشاب راقية ونجيل الهند ولمسة توابل هادئة، ترتكز على الجلد والعنبر الرمادي. أنيق وواثق ومميز بلا تكلّف؛ لحضور يسبق الكلام.",
  najm: "بعض العطور صُنعت لتندمج مع الآخرين، لكن نجم ليس منها. دفعة آسرة من الباشن فروت والخوخ والكمثرى والتوت تذوب في فانيليا ناعمة وخشب الصندل والمسك. حلو وحسي ويصعب تجاهله؛ صُمم ليبقى في الذاكرة.",
  naseem: "يشبه نسيم هواءً قادمًا من مكان بعيد. تلتقي النوتات المائية المنعشة والفلفل بالزهور الرقيقة، ثم تستقر بهدوء على ملح البحر والعنبر الرمادي والأخشاب الدافئة والفانيليا. خفيف في البداية ودافئ في العمق؛ مهرب هادئ ترتديه.",
  hawas: "يبدأ هوس بإغراء واضح. تنطلق المانجو الغنية واليوسفي واليوزو وسط نوتات بحرية منعشة، وتدفئها لمسة الزعفران قبل أن تذوب في أخشاب ناعمة وعنبر ومسك. استوائي وحيوي وآسر بشدة؛ رشة واحدة نادرًا ما تكفي.",
  mazaq: "رائحة مذاق شهية لدرجة تكاد تُتذوق. يذوب الكراميل الدافئ في عسل ذهبي وفانيليا كريمية ومسك أبيض ناعم، ليصنع أثرًا جورماند غنيًا وحميميًا لا يُقاوم. حلو ودافئ ومثالي للحظات القريبة.",
  haibah: "الحضور الحقيقي لا يحتاج إلى ضجيج. يبدأ هيبة بانتعاش اللافندر والبرغموت والأناناس، ثم يتطور إلى فواكه وأخشاب عطرية قبل أن يستقر بنعومة على خشب الصندل وحبوب التونكا. نظيف ورجولي وواثق بطبيعته؛ بصمة يومية بلا مجهود.",
  sahm: "يصيب سهم هدفه من الانطباع الأول. يفسح الليمون المنعش والمريمية المجال لقرفة دافئة وحب الهال وبرالين آسر، قبل أن يفرض العنبر الداكن والباتشولي حضورهما. حلو ومتبل ومتمرّد؛ لليالٍ لا يُفترض أن تنتهي مبكرًا.",
  barq: "يضرب برق سريعًا ويترك أثرًا. يصنع البرغموت والفلفل افتتاحية كهربائية، تزيدها المريمية العطرية وخشب الأرز حدة، قبل ظهور الكاكاو الداكن وحبوب التونكا الدافئة. جريء وجذاب ومليء بالتناقض؛ تمامًا كاسمه.",
  ghewaa: "غوى حلاوة تستسلم لها برضا. تذوب الفواكه الغنية والزهور الرقيقة في مارشميلو هش وفراولة وجوز هند، ثم تستقر على فانيليا مخفوقة وسكر ومسك ناعم. مرحة وكريمية وشهية حد الإدمان؛ فالإغراء لم يُخلق ليُقاوم.",
  shaghaf: "صُنع شغف للحظات التي تتبعين فيها قلبك. موجة نابضة من التوت تتفتح على بنفسج وياسمين رقيقين، وتحتضنها فانيليا دافئة ومسك وأخشاب ناعمة. أنثوي وحيوي وجذاب بلا تكلّف؛ شغف بلمسة مرحة.",
  ward: "ورد هو الأنوثة في كامل تفتحها. تلتقي الفواكه المشرقة بباقة هوائية من الفاوانيا والفريزيا والأوركيد وزنبق الماء، فوق مسك ناعم وأخشاب أنيقة. منعش ورقيق وغاية في النعومة؛ كزهور يحملها نسيم لطيف.",
  ishq: "يبدأ عشق بشرارة ويزداد عمقًا مع كل لحظة. تلتقي الكمثرى الغنية والكشمش الأسود بالورد والياسمين، ثم تمنح الفانيليا الدافئة والأخشاب نهاية حسية. واثق وأنثوي وجذاب؛ فبعض المشاعر لا خُلقت لتبقى خفية.",
  haneen: "يمنح حنين إحساسًا دافئًا ومألوفًا يصعب نسيانه. تذوب أوركيد الفانيليا والياسمين في سكر بني غني وحبوب التونكا، وتستقر فوق العنبر والمسك والباتشولي. حلو وحميمي ومريح؛ كالعودة إلى ذكرى لم ترغب يومًا في مغادرتها.",
  sahar: "صُنع سهر لليالٍ تتحول إلى حكايات. تمنح الفراولة الغنية والتفاح والسوربيه حلاوة مرحة، تلطفها الزهور الرقيقة ويكملها أثر كريمي من جوز الهند والمسك وخشب الصندل. ممتع ودلوع وخفيف الروح؛ فالليل ما زال في بدايته.",
  ghazal: "غزل سحر بلا تكلّف تحت شمس الصيف. يمنح الأناناس الغني افتتاحية استوائية مشرقة، تلطفها الفاوانيا الأنثوية ويكملها مسك نظيف وحسي. منعش ومرح وجذاب بطبيعته؛ سحر لا يبدو مصطنعًا أبدًا.",
  rouh: "روح أناقة تُحس قبل أن تُلاحظ. يفتح اللوز الناعم والحمضيات المضيئة على زهور بيضاء نقية، تحتضنها كريمة خشب الصندل والفانيليا والمسك الأبيض. راقٍ ورشيق وحسي بهدوء؛ عطر يشبه بشرة ثانية.",
  gharam: "غرام رومانسية بطرف آسر. تلتقي الفراولة الغنية بقلب كريمي من الورد والحليب، يحيط به من البداية إلى النهاية مسك ناعم وفانيليا دافئة. ناعم وحميمي وأنثوي بصورة لا تُقاوم؛ صُنع للحظات القريبة.",
  nagham: "يتحرك نغم بإيقاعه الخاص. ترقص الفواكه الاستوائية والرمان الغني مع الكركديه والفريزيا الناعمين، ثم تستقر على عنبر دافئ ومسك أبيض نظيف. مشرق ومبهج ومليء بالحياة؛ عطر يغيّر المزاج فورًا.",
  sehr: "يشبه سحر إغراء الصيف على بشرة دافئة. يذوب رحيق جوز الهند الكريمي والفواكه الغنية في لوتس وردي ناعم، ثم يستقر على فانيليا دافئة ومسك أبيض ولمسة رملية مميزة. استوائي وأنثوي وجذاب بسهولة؛ إجازة صغيرة ترتدينها.",
  hawa: "يتوهج هوى منذ لحظة ملامسته للبشرة. يقود ماء جوز الهند المنعش والبرغموت إلى ياسمين مشرق وبخور مدخّن وإيلنغ إيلنغ، فوق خشب صندل كريمي ومسك. مضيء وحسي وأنثوي بثقة؛ صُنع ليتألق بعد الغروب.",
  rahaf: "يوازن رهف بين النعومة والقوة الهادئة. يكشف الرمان المتلألئ والفلفل الوردي عن قلب زهري أنيق، يرتكز على الهينوكي وخشب الصندل والباتشولي. رقيق وواثق، ناعم ومميز؛ فالنعومة لم تكن يومًا ضعفًا.",
  mahd: "مهد ثراء بألوان كاملة. يلتقي قلب زهري لافت من الكركديه والورد بالكشمش الأسود الغني والنعناع البارد والقرفة الدافئة، ثم يغوص في فانيليا حسية وجلد ومسك. فاخر ومميز ولا يُنسى؛ لامرأة تترك انطباعًا أينما ذهبت.",
  layla: "تبدأ ليلى حين ينتهي اليوم العادي. يشعل البرتقال الأحمر والزنجبيل قلبًا حسيًا من الياسمين وزهر البرتقال، تدفئه الفليفلة الحارة والأخشاب العميقة. جريء وغامض وجذاب بلا شك؛ فبعض العطور تنتمي ببساطة إلى الليل.",
  marshmallow: "مزيج ناعم ومريح يجمع نقاء المسك بحلاوة المارشميلو الخفيفة والدافئة. كريمي وانسيابي وآسر، بحلاوة رقيقة تبقى قريبة من البشرة. مصنوع من المسك الخام من دون كحول أو إضافات، لتجربة عطرية غنية وأصيلة.",
  blueberry: "لمسة منعشة ومرحة من المسك، تمزج نعومته النظيفة بحلاوة التوت الأزرق الغنية. فاكهي من دون حلاوة زائدة، ويترك أثرًا ناعمًا ومميزًا على البشرة. مصنوع من المسك الخام من دون كحول أو إضافات ليحافظ على طابعه النقي والمركز.",
  pomegranate: "مزيج حيوي من المسك النقي وطابع الرمان الغني ذي الحموضة الخفيفة. منعش وفاكهي ومتوازن بأناقة، فيمنح إحساسًا نابضًا وراقيًا. مصنوع من المسك الخام من دون كحول أو إضافات لتجربة عطرية مركزة وأصيلة.",
  white: "نظيف وناعم ومريح بلا تكلّف. يجسّد المسك الأبيض إحساس البشرة النظيفة بانتعاش صابوني رقيق ولمسة زهرية هادئة. مصنوع من المسك الخام من دون كحول أو إضافات، ليمنحه طابعًا نقيًا وحميميًا يستقر بجمال على البشرة.",
  vanilla: "تذوب الفانيليا الدافئة في نعومة المسك لتصنع رائحة كريمية وانسيابية ومريحة. حلوة من دون مبالغة، وتترك دفئًا جذابًا يجمع بين الألفة والفخامة. مصنوعة من المسك الخام من دون كحول أو إضافات لتجربة غنية ومركزة.",
  pineapple: "تفسير استوائي مشرق للمسك، يجمع طابعه الناعم بحلاوة الأناناس المنعشة والغنية. حيوي ويرفع المزاج في البداية، ثم يستقر على أثر ناعم ونظيف. مصنوع من المسك الخام من دون كحول أو إضافات ليحافظ على نقائه وتركيزه.",
};

const arabicCatalogTerms = {
  "Akigalawood": "خشب أكيغالاوود", "Almond": "لوز", "Amber": "عنبر", "Ambergris": "عنبر رمادي", "Amberwood": "خشب عنبري", "Ambrette": "أمبريت", "Ambroxan": "أمبروكسان", "Apple": "تفاح", "Aquatic": "مائي", "Aquatic Notes": "نوتات مائية", "Aromatic": "عطري", "Artemisia": "أرتميسيا",
  "Beach": "الشاطئ", "Beach Days": "أيام الشاطئ", "Benzoin": "بنزوين", "Bergamot": "برغموت", "Black Amber": "عنبر داكن", "Black Cardamom": "حب هال أسود", "Black Cyprus Salt": "ملح قبرصي أسود", "Black Pepper": "فلفل أسود", "Blackberry": "توت أسود", "Blackcurrant": "كشمش أسود", "Blood Orange": "برتقال أحمر", "Brown Sugar": "سكر بني", "Brunch": "الفطور المتأخر", "Bulgarian Rose": "ورد بلغاري", "Business Meetings": "اجتماعات العمل",
  "Calone": "كالون", "Caramel": "كراميل", "Cardamom": "حب الهال", "Cashmeran": "كشميران", "Cashmere Wood": "خشب الكشمير", "Cassis": "كاسيس", "Casual Dates": "مواعيد كاجوال", "Casual Outings": "خروجات كاجوال", "Cedar": "خشب الأرز", "Cedarwood": "خشب الأرز", "Cinnamon": "قرفة", "Citrus": "حمضي", "Clary Sage": "مريمية كلاري", "Cocoa": "كاكاو", "Coconut": "جوز الهند", "Coconut Nectar": "رحيق جوز الهند", "Coconut Water": "ماء جوز الهند", "College": "الجامعة", "Coumarin": "كومارين", "Cozy Evenings": "الأمسيات الدافئة", "Creamy Floral": "زهري كريمي", "Cypriol": "سيبريول",
  "Damask Rose": "ورد دمشقي", "Date Night": "موعد مسائي", "Dates": "المواعيد", "Day Out": "الخروجات النهارية", "Daytime Dates": "المواعيد النهارية", "Dinner": "العشاء", "Dried Fruits": "فواكه مجففة", "Ebony Wood": "خشب الأبنوس", "Elegant Daywear": "الإطلالات النهارية الأنيقة", "Elegant Dinners": "العشاء الأنيق", "Evening Dates": "المواعيد المسائية", "Evening Events": "المناسبات المسائية", "Evening Out": "الخروجات المسائية", "Everyday Layering": "التنسيق اليومي مع عطور أخرى", "Everyday Luxury": "الفخامة اليومية", "Everyday Wear": "الاستخدام اليومي",
  "Floral": "زهري", "Floral Notes": "نوتات زهرية", "Formal Evenings": "الأمسيات الرسمية", "Formal Events": "المناسبات الرسمية", "Freesia": "فريزيا", "Fruity": "فاكهي", "Fruity Notes": "نوتات فاكهية", "Galbanum": "غالبانوم", "Geranium": "إبرة الراعي", "Ginger": "زنجبيل", "Girls' Night": "سهرة البنات", "Gourmand": "جورماند", "Grapefruit": "جريب فروت", "Green Notes": "نوتات خضراء", "Hedione": "هيديون", "Heliotrope": "هليوتروب", "Hibiscus": "كركديه", "Hinoki": "هينوكي", "Honey": "عسل",
  "Incense": "بخور", "Italian Lemon": "ليمون إيطالي", "Jasmine": "ياسمين", "Juniper Berries": "توت العرعر", "Kiwi": "كيوي", "Labdanum": "لابدانوم", "Lavender": "لافندر", "Leather": "جلد", "Lemon": "ليمون", "Lemon Verbena": "لويزة الليمون", "Lily-of-the-Valley": "زنبق الوادي", "Lime": "ليمون أخضر", "Luxury Events": "المناسبات الفاخرة", "Magnolia": "ماغنوليا", "Mahogany": "ماهوجني", "Mandarin": "يوسفي", "Mandarin Blossom": "زهر اليوسفي", "Mango": "مانجو", "Marine": "بحري", "Marine Notes": "نوتات بحرية", "Marshmallow": "مارشميلو", "Milk": "حليب", "Mossy Notes": "نوتات طحلبية", "Musk": "مسك", "Musky": "مسكي",
  "Nectarine Blossom": "زهر النكتارين", "Night Out": "الخروجات الليلية", "Oakmoss": "طحلب البلوط", "Office": "العمل", "Orange": "برتقال", "Orange Blossom": "زهر البرتقال", "Orchid": "أوركيد", "Outdoor Gatherings": "التجمعات الخارجية", "Ozone": "أوزون", "Papaya": "بابايا", "Parties": "الحفلات", "Passion Fruit": "باشن فروت", "Patchouli": "باتشولي", "Peach": "خوخ", "Pear": "كمثرى", "Peony": "فاوانيا", "Pimento": "فليفلة حارة", "Pineapple": "أناناس", "Pink Grapefruit": "جريب فروت وردي", "Pink Lotus": "لوتس وردي", "Pink Pepper": "فلفل وردي", "Pomegranate": "رمان", "Praline": "برالين",
  "Raspberry": "توت العليق", "Red Apple": "تفاح أحمر", "Romantic Dates": "المواعيد الرومانسية", "Rose": "ورد", "Rosemary": "إكليل الجبل", "Rosewood": "خشب الورد", "Saffron": "زعفران", "Sage": "مريمية", "Salty": "مالح", "Sand": "رمل", "Sandalwood": "خشب الصندل", "Sea Notes": "نوتات بحرية", "Seaweed": "طحالب بحرية", "Smart Casual": "الإطلالات الذكية الكاجوال", "Social Events": "المناسبات الاجتماعية", "Solar Notes": "نوتات شمسية", "Sorbet": "سوربيه", "Sour Cherry": "كرز حامض", "Spearmint": "نعناع أخضر", "Special Occasions": "المناسبات الخاصة", "Spices": "توابل", "Spicy": "متبل", "Spring & Summer Evenings": "أمسيات الربيع والصيف", "Spring Days": "أيام الربيع", "Strawberry": "فراولة", "Sugar": "سكر",
  "Summer Dates": "المواعيد الصيفية", "Summer Days": "أيام الصيف", "Summer Evenings": "أمسيات الصيف", "Summer Parties": "حفلات الصيف", "Sunset Dates": "مواعيد وقت الغروب", "Sweet": "حلو", "Thyme": "زعتر", "Tolu Balsam": "بلسم التولو", "Tonka Bean": "حبوب التونكا", "Tropical": "استوائي", "Vacation": "الإجازات", "Vanilla": "فانيليا", "Vanilla Orchid": "أوركيد الفانيليا", "Vanilla Pod": "قرن الفانيليا", "Vetiver": "نجيل الهند", "Violet": "بنفسج", "Virginian Cedar": "أرز فرجيني", "Warm Spicy": "متبل دافئ", "Water Lily": "زنبق الماء", "Weddings": "حفلات الزفاف", "Whipped Cream": "كريمة مخفوقة", "White Flowers": "زهور بيضاء", "White Musk": "مسك أبيض", "White Peach": "خوخ أبيض", "White Pepper": "فلفل أبيض", "Winter": "الشتاء", "Winter Evenings": "أمسيات الشتاء", "Woody": "خشبي", "Woody Notes": "نوتات خشبية", "Woody Vanilla": "فانيليا خشبية", "Ylang-Ylang": "إيلنغ إيلنغ", "Yuzu": "يوزو",
};

const translateCatalogItems = (items = []) => items.map((item) => {
  const translation = arabicCatalogTerms[item];
  if (!translation) throw new Error(`Missing Arabic catalog translation for: ${item}`);
  return translation;
});

for (const product of products) {
  product.arabicName = product.arabicName || arabicProductNames[product.slug] || "";
  product.arabicDescription = arabicDescriptions[product.slug] || "";
  product.arabicScentFamilies = translateCatalogItems(product.scentFamilies);
  product.arabicBestFor = translateCatalogItems(product.bestFor);
  product.arabicKeyNotes = translateCatalogItems(product.keyNotes);
  product.arabicScentNotes = {
    top: translateCatalogItems(product.scentNotes.top),
    middle: translateCatalogItems(product.scentNotes.middle),
    base: translateCatalogItems(product.scentNotes.base),
  };
}

module.exports = { products };
