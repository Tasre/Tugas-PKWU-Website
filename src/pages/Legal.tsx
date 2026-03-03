import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Scale, Shield, Cookie } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSearchParams } from "react-router-dom";

const sections = [
  { id: "terms", label: "Terms of Service", icon: Scale },
  { id: "privacy", label: "Privacy Policy", icon: Shield },
  { id: "cookies", label: "Cookie Policy", icon: Cookie },
];

const Legal = () => {
  const [searchParams] = useSearchParams();
  const sectionParam = searchParams.get("section") || "terms";
  const [active, setActive] = useState(sectionParam);

  // React to URL param changes (e.g. clicking footer links on same page)
  useEffect(() => {
    setActive(sectionParam);
  }, [sectionParam]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-28 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Scale className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-3">
              Legal <span className="text-gradient">Information</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Please review our policies carefully. By using CYSTON, you agree to the terms outlined below.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 pb-16">
        {/* Section nav */}
        <div className="flex justify-center gap-2 mb-10 flex-wrap">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active === s.id
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "glass border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {s.label}
              </button>
            );
          })}
        </div>

        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto glass rounded-xl p-6 md:p-10 space-y-6 text-sm leading-relaxed text-muted-foreground"
        >
          {active === "terms" && <TermsContent />}
          {active === "privacy" && <PrivacyContent />}
          {active === "cookies" && <CookiesContent />}
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-display text-lg font-semibold text-foreground mt-8 mb-3">{children}</h2>
);

const TermsContent = () => (
  <>
    <h2 className="font-display text-xl font-bold text-foreground">Terms of Service</h2>
    <p className="text-xs text-muted-foreground">Last updated: February 15, 2026</p>

    <SectionTitle>1. Acceptance of Terms</SectionTitle>
    <p>By accessing or using CYSTON ("the Platform"), operated by Acesium ("the Company"), you agree to be bound by these Terms of Service. If you do not agree, you may not access or use the Platform. These terms apply to all visitors, users, sellers, and buyers.</p>

    <SectionTitle>2. Account Registration</SectionTitle>
    <p>To use certain features of the Platform, you must create an account. You agree to provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use.</p>

    <SectionTitle>3. Marketplace Rules</SectionTitle>
    <p>CYSTON is a peer-to-peer marketplace for digital gaming goods. Sellers must accurately represent the items they list. Fraudulent listings, misrepresentation of item quality, or listing items that violate the terms of the underlying game are strictly prohibited. We reserve the right to remove any listing and suspend any account that violates these rules.</p>

    <SectionTitle>4. Transactions & Payments</SectionTitle>
    <p>All transactions are facilitated through the Platform. Prices are set by sellers and displayed in the applicable currency. CYSTON may charge service fees on completed transactions. Buyers agree to pay the listed price plus any applicable fees. All sales are considered final unless covered by our Refund Policy.</p>

    <SectionTitle>5. Prohibited Conduct</SectionTitle>
    <p>You may not: (a) use the Platform for any illegal purpose; (b) attempt to circumvent Platform security or fees; (c) harass, abuse, or threaten other users; (d) create multiple accounts to evade bans or restrictions; (e) use automated tools, bots, or scrapers on the Platform; (f) sell stolen or illegally obtained items; (g) engage in money laundering or fraud.</p>

    <SectionTitle>6. Intellectual Property</SectionTitle>
    <p>All content, branding, and software associated with CYSTON are the property of CYSTON or its licensors. You may not reproduce, distribute, or create derivative works without prior written consent. User-generated content remains the property of the user, but you grant CYSTON a non-exclusive license to display it on the Platform.</p>

    <SectionTitle>7. Limitation of Liability</SectionTitle>
    <p>CYSTON is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform. Our total liability shall not exceed the fees you have paid to CYSTON in the twelve months preceding the claim. We are not responsible for disputes between buyers and sellers beyond providing our dispute resolution process.</p>

    <SectionTitle>8. Account Termination</SectionTitle>
    <p>We reserve the right to suspend or terminate your account at any time for violation of these Terms, fraudulent activity, or any other reason at our sole discretion. Upon termination, you lose access to your account and any associated data. Pending transactions may be cancelled at our discretion.</p>

    <SectionTitle>9. Dispute Resolution</SectionTitle>
    <p>Any disputes between users should first be addressed through our support ticket system. If a resolution cannot be reached, CYSTON staff will mediate the dispute. Our decision in such matters is final. For legal disputes with CYSTON, you agree to attempt informal resolution before pursuing formal proceedings.</p>

    <SectionTitle>10. Changes to Terms</SectionTitle>
    <p>We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the new terms. Material changes will be communicated via email or a prominent notice on the Platform. We encourage you to review these Terms periodically.</p>
  </>
);

const PrivacyContent = () => (
  <>
    <h2 className="font-display text-xl font-bold text-foreground">Privacy Policy</h2>
    <p className="text-xs text-muted-foreground">Last updated: February 15, 2026</p>

    <SectionTitle>1. Information We Collect</SectionTitle>
    <p>We collect information you provide directly, such as your name, email address, and username when you create an account. We also collect transaction data when you buy or sell items, including payment details processed through our secure payment partners. Additionally, we automatically collect device information, IP addresses, browser type, and usage patterns when you interact with the Platform.</p>

    <SectionTitle>2. How We Use Your Information</SectionTitle>
    <p>We use your information to: (a) provide, maintain, and improve the Platform; (b) process transactions and send related notices; (c) send promotional communications (with your consent); (d) detect and prevent fraud, abuse, and security incidents; (e) personalize your experience, including recommended listings; (f) comply with legal obligations and enforce our Terms of Service.</p>

    <SectionTitle>3. Information Sharing</SectionTitle>
    <p>We do not sell your personal information to third parties. We may share information with: (a) other users as necessary to complete transactions (e.g., seller username displayed on listings); (b) service providers who assist in operating the Platform (payment processors, hosting, analytics); (c) law enforcement when required by law or to protect our rights; (d) in connection with a merger, acquisition, or sale of assets.</p>

    <SectionTitle>4. Data Security</SectionTitle>
    <p>We implement industry-standard security measures including encryption in transit and at rest, access controls, and regular security audits. However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security but commit to promptly notifying affected users in the event of a data breach.</p>

    <SectionTitle>5. Data Retention</SectionTitle>
    <p>We retain your personal data for as long as your account is active or as needed to provide services. Transaction records are retained for a minimum of 5 years for legal and financial compliance. After account deletion, we may retain anonymized data for analytics purposes. You may request deletion of your data by contacting our support team.</p>

    <SectionTitle>6. Your Rights</SectionTitle>
    <p>Depending on your jurisdiction, you may have the right to: (a) access and receive a copy of your personal data; (b) rectify inaccurate data; (c) request deletion of your data; (d) object to or restrict processing; (e) data portability; (f) withdraw consent. To exercise these rights, please submit a request through our support system.</p>

    <SectionTitle>7. Children's Privacy</SectionTitle>
    <p>The Platform is not intended for users under the age of 13 (or the applicable age of digital consent in your jurisdiction). We do not knowingly collect personal information from children. If we learn that we have collected data from a child, we will take steps to delete it promptly.</p>

    <SectionTitle>8. International Transfers</SectionTitle>
    <p>Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for international data transfers, including standard contractual clauses and adequacy decisions where applicable.</p>

    <SectionTitle>9. Updates to This Policy</SectionTitle>
    <p>We may update this Privacy Policy periodically. We will notify you of material changes by email or through a prominent notice on the Platform. Your continued use after changes constitutes acceptance of the updated policy.</p>
  </>
);

const CookiesContent = () => (
  <>
    <h2 className="font-display text-xl font-bold text-foreground">Cookie Policy</h2>
    <p className="text-xs text-muted-foreground">Last updated: February 15, 2026</p>

    <SectionTitle>1. What Are Cookies</SectionTitle>
    <p>Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences, keep you logged in, and understand how you use the site. Similar technologies include local storage, session storage, and pixel tags.</p>

    <SectionTitle>2. How We Use Cookies</SectionTitle>
    <p>We use cookies for: (a) <strong className="text-foreground">Essential cookies</strong> — required for the Platform to function, including authentication, session management, and security; (b) <strong className="text-foreground">Preference cookies</strong> — remembering your settings such as language, theme, and display preferences; (c) <strong className="text-foreground">Analytics cookies</strong> — understanding how users interact with the Platform to improve our services; (d) <strong className="text-foreground">Performance cookies</strong> — monitoring site performance and load times.</p>

    <SectionTitle>3. Essential Cookies</SectionTitle>
    <p>These cookies are strictly necessary and cannot be disabled. They include authentication tokens that keep you logged in, CSRF protection tokens for security, and session identifiers. Without these cookies, the Platform cannot function properly.</p>

    <SectionTitle>4. Analytics & Performance Cookies</SectionTitle>
    <p>We use analytics cookies to collect aggregated, anonymized data about Platform usage. This helps us understand which features are most popular, identify technical issues, and improve user experience. These cookies do not collect personally identifiable information.</p>

    <SectionTitle>5. Third-Party Cookies</SectionTitle>
    <p>Some cookies are placed by third-party services we use, such as payment processors and analytics providers. These third parties have their own privacy policies governing the use of their cookies. We do not control third-party cookies but carefully vet all partners for privacy compliance.</p>

    <SectionTitle>6. Managing Cookies</SectionTitle>
    <p>You can control cookies through your browser settings. Most browsers allow you to block or delete cookies. However, disabling essential cookies may prevent you from using certain features of the Platform. You can also opt out of analytics cookies through our preference settings.</p>

    <SectionTitle>7. Updates to This Policy</SectionTitle>
    <p>We may update this Cookie Policy to reflect changes in our practices or for operational, legal, or regulatory reasons. We will notify you of material changes by posting a notice on the Platform.</p>
  </>
);

export default Legal;
