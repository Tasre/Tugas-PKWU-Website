import { motion } from "framer-motion";
import { Zap, Shield, BadgeCheck, Headphones } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Features = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: Zap,
      title: t("features.instantDelivery"),
      description: t("features.instantDeliveryDesc"),
    },
    {
      icon: Shield,
      title: t("features.safeTrading"),
      description: t("features.safeTradingDesc"),
    },
    {
      icon: BadgeCheck,
      title: t("features.verifiedSellers"),
      description: t("features.verifiedSellersDesc"),
    },
    {
      icon: Headphones,
      title: t("features.support"),
      description: t("features.supportDesc"),
    },
  ];

  return (
    <section className="py-24" id="support">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
            {t("features.title")} <span className="text-gradient">{t("features.titleHighlight")}</span>
          </h2>
          <p className="text-muted-foreground">{t("features.subtitle")}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="p-6 rounded-xl glass text-center group hover:neon-border transition-all duration-300"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
