import { motion } from "framer-motion";
import { Star, ShoppingCart, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

interface ItemCardProps {
  name: string;
  game: string;
  image: string;
  price: number;
  quantity?: string;
  sellerRating: number;
  sellerName: string;
  verified?: boolean;
  category: string | string[];
}

const ItemCard = ({ 
  name, 
  game, 
  image, 
  price, 
  quantity, 
  sellerRating, 
  sellerName, 
  verified = false,
  category 
}: ItemCardProps) => {
  const { formatPrice, t } = useLanguage();
  const categories = Array.isArray(category) ? category : [category];

  return (
    <motion.div
      whileHover={{ y: -8 }}
      className="group relative rounded-xl overflow-hidden glass"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={image} 
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        
        <div className="absolute top-3 left-3 flex flex-wrap gap-1 max-w-[70%]">
          {categories.map((cat) => (
            <Badge key={cat} className="bg-primary/90 text-primary-foreground text-[10px] h-5 px-1.5 whitespace-nowrap">
              {cat}
            </Badge>
          ))}
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/60 backdrop-blur-sm">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan">
            <ShoppingCart className="w-4 h-4 mr-2" />
            {t("item.buyNow")}
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="text-xs text-primary mb-1 font-medium">{game}</div>
        <h3 className="font-display font-semibold text-foreground mb-1 truncate">{name}</h3>
        {quantity && (
          <p className="text-xs text-muted-foreground mb-2">{quantity}</p>
        )}
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            {verified && <Shield className="w-3 h-3 text-primary" />}
            <span className="text-xs text-muted-foreground">{sellerName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-primary text-primary" />
            <span className="text-xs text-muted-foreground">{sellerRating}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="font-display font-bold text-lg text-foreground">{formatPrice(price)}</span>
          <span className="text-xs text-muted-foreground">{t("item.instantDelivery")}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default ItemCard;
