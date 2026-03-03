import { Gamepad2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

const Footer = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSupportLink = (tab: string, extra?: string) => {
    const path = `/support?tab=${tab}${extra || ""}`;
    navigate(path);
    // Use setTimeout to ensure navigation completes before scrolling
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const handleRefundPolicy = () => {
    navigate("/support?tab=faq&category=Payments");
    // Don't scroll to top — the FAQ component will scroll to Payments
  };

  const handleLegalLink = (section: string) => {
    navigate(`/legal?section=${section}`);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Gamepad2 className="w-6 h-6 text-primary" />
              <span className="font-display text-lg font-bold text-gradient">CYSTON</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("footer.description")}
            </p>
          </div>

          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">{t("footer.store")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">{t("footer.newReleases")}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t("footer.bestSellers")}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t("footer.dealsSales")}</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">{t("footer.comingSoon")}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">{t("footer.supportTitle")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={() => handleSupportLink("articles")} className="hover:text-primary transition-colors">{t("footer.helpCenter")}</button></li>
              <li><button onClick={() => handleSupportLink("tickets")} className="hover:text-primary transition-colors">{t("footer.contactUs")}</button></li>
              <li><button onClick={handleRefundPolicy} className="hover:text-primary transition-colors">{t("footer.refundPolicy")}</button></li>
              <li><button onClick={() => handleSupportLink("faq")} className="hover:text-primary transition-colors">{t("footer.faq")}</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-foreground mb-4">{t("footer.legal")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><button onClick={() => handleLegalLink("terms")} className="hover:text-primary transition-colors">{t("footer.termsOfService")}</button></li>
              <li><button onClick={() => handleLegalLink("privacy")} className="hover:text-primary transition-colors">{t("footer.privacyPolicy")}</button></li>
              <li><button onClick={() => handleLegalLink("cookies")} className="hover:text-primary transition-colors">{t("footer.cookiePolicy")}</button></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {t("footer.copyright")}
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Twitter</a>
            <a href="#" className="hover:text-primary transition-colors">Discord</a>
            <a href="#" className="hover:text-primary transition-colors">Instagram</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
