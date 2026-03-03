import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Newsletter = () => {
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-muted/20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("newsletter.title")} <span className="text-gradient">{t("newsletter.titleHighlight")}</span>
          </h2>
          <p className="text-muted-foreground mb-8">
            {t("newsletter.description")}
          </p>

          <form className="flex flex-col sm:flex-row gap-4">
            <Input
              type="email"
              placeholder={t("newsletter.placeholder")}
              className="flex-1 bg-card border-border focus:border-primary h-12"
            />
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan h-12 px-8">
              <Send className="w-4 h-4 mr-2" />
              {t("newsletter.subscribe")}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-4">
            {t("newsletter.disclaimer")}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Newsletter;
