import { motion } from "framer-motion";
import ItemCard from "./ItemCard";
import { useLanguage } from "@/contexts/LanguageContext";

const trendingItems = [
  {
    name: "10,000 V-Bucks",
    game: "Fortnite",
    image: "https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=400&h=300&fit=crop",
    price: 45.99,
    quantity: "10,000 V-Bucks",
    sellerRating: 4.9,
    sellerName: "TopTrader",
    verified: true,
    category: "Currency",
  },
  {
    name: "Level 100 Account",
    game: "Genshin Impact",
    image: "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400&h=300&fit=crop",
    price: 89.99,
    quantity: "AR 55+ • 20 5-Stars",
    sellerRating: 4.8,
    sellerName: "GenshinPro",
    verified: true,
    category: "Accounts",
  },
  {
    name: "Dragon Lore AWP",
    game: "CS2",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=300&fit=crop",
    price: 1299.99,
    sellerRating: 5.0,
    sellerName: "SkinKing",
    verified: true,
    category: "Skins",
  },
  {
    name: "5M Gold Pack",
    game: "World of Warcraft",
    image: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=300&fit=crop",
    price: 29.99,
    quantity: "5,000,000 Gold",
    sellerRating: 4.7,
    sellerName: "WoWGold",
    verified: false,
    category: "Currency",
  },
  {
    name: "Diamond Rank Boost",
    game: "League of Legends",
    image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop",
    price: 149.99,
    quantity: "Gold → Diamond",
    sellerRating: 4.9,
    sellerName: "BoostMaster",
    verified: true,
    category: "Boosting",
  },
  {
    name: "Legendary Gear Set",
    game: "Diablo IV",
    image: "https://images.unsplash.com/photo-1552820728-8b83bb6b2b0d?w=400&h=300&fit=crop",
    price: 59.99,
    quantity: "Full Set • 925 iLvl",
    sellerRating: 4.6,
    sellerName: "D4Items",
    verified: true,
    category: "Items",
  },
];

const TrendingItems = () => {
  const { t } = useLanguage();

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-12"
        >
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              {t("trending.title")} <span className="text-gradient">{t("trending.titleHighlight")}</span>
            </h2>
            <p className="text-muted-foreground">{t("trending.subtitle")}</p>
          </div>
          <a href="#" className="text-primary hover:text-primary/80 transition-colors font-medium">
            {t("trending.viewAll")}
          </a>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingItems.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(`/games?game=${encodeURIComponent(item.game)}&listingId=${item.id}`)}
              className="cursor-pointer"
            >
              <ItemCard {...item} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrendingItems;
