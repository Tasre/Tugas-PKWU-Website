import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">{t("hero.badge")}</span>
          </motion.div>

          <h1 className="font-display text-5xl md:text-7xl font-bold mb-6">
            <span className="text-foreground">{t("hero.title1")} </span>
            <span className="text-gradient">{t("hero.title2")}</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t("hero.description")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan font-display"
              onClick={() => navigate("/games")}
            >
              {t("hero.browseGames")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary/50 text-foreground hover:bg-primary/10 group"
              onClick={() => navigate("/dashboard")}
            >
              {t("hero.sellYourItems")}
            </Button>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-border/30"
          >
            {[
              { value: "100K+", label: t("hero.listings") },
              { value: "2M+", label: t("hero.traders") },
              { value: "24/7", label: t("hero.support") },
            ].map((stat, i) => (
              <div key={i}>
                <div className="font-display text-2xl md:text-3xl font-bold text-gradient">{stat.value}</div>
                <div className="text-muted-foreground text-sm">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
