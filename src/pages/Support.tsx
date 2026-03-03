import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, HelpCircle, BookOpen, MessageSquarePlus, ShoppingCart, Store, Package, Shield, Star, Scale, ChevronDown, Send, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFaqItems, useHelpArticles, useMyTickets, useCreateTicket, useTicketReplies, useAddReply } from "@/hooks/use-support";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";

const iconMap: Record<string, any> = {
  ShoppingCart, Store, Package, Shield, Star, Scale, BookOpen, HelpCircle,
};

const ticketStatusColors: Record<string, string> = {
  open: "bg-green-500/20 text-green-400 border-green-500/30",
  in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  resolved: "bg-muted text-muted-foreground border-border",
  closed: "bg-muted text-muted-foreground border-border",
};

const TicketThread = ({ ticketId }: { ticketId: string }) => {
  const { data: replies, isLoading } = useTicketReplies(ticketId);
  const addReply = useAddReply();
  const [message, setMessage] = useState("");

  if (isLoading) return <div className="py-4 text-center text-muted-foreground text-xs">Loading...</div>;

  return (
    <div className="space-y-3 mt-3 pt-3 border-t border-border/50">
      {replies?.map((r: any) => (
        <div key={r.id} className={`p-3 rounded-lg text-sm ${r.is_staff ? "bg-primary/5 border border-primary/20" : "bg-muted/50 border border-border/30"}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-xs">{r.is_staff ? "Staff" : (r.profiles?.username || "You")}</span>
            {r.is_staff && <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1 py-0">Staff</Badge>}
            <span className="text-[10px] text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleString()}</span>
          </div>
          <p className="text-foreground">{r.message}</p>
        </div>
      ))}
      <div className="flex gap-2">
        <Textarea
          placeholder="Write a reply..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="bg-card/50 border-border min-h-[50px] text-sm"
        />
        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/90 self-end"
          disabled={!message.trim() || addReply.isPending}
          onClick={() => { addReply.mutate({ ticketId, message: message.trim(), isStaff: false }); setMessage(""); }}
        >
          <Send className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

const Support = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") || "faq";
  const categoryParam = searchParams.get("category") || "";
  const { data: faqs, isLoading: faqLoading } = useFaqItems();
  const { data: articles, isLoading: articlesLoading } = useHelpArticles();
  const { data: tickets } = useMyTickets();
  const createTicket = useCreateTicket();

  // Reactive tab state driven by URL params
  const [activeTab, setActiveTab] = useState(tabParam);
  const [search, setSearch] = useState("");
  const [newTicket, setNewTicket] = useState({ subject: "", description: "", category: "General" });
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  // Update tab when URL params change (e.g. clicking footer links on same page)
  useEffect(() => {
    setActiveTab(tabParam);
  }, [tabParam]);

  // Scroll to Payments category if category param is set
  useEffect(() => {
    if (categoryParam && activeTab === "faq") {
      setTimeout(() => {
        const el = document.getElementById(`faq-category-${categoryParam}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [categoryParam, activeTab, faqs]);

  const filteredFaqs = faqs?.filter((f: any) =>
    f.published && (
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase())
    )
  );

  const filteredArticles = articles?.filter((a: any) =>
    a.published && (
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase())
    )
  );

  const faqCategories = [...new Set(filteredFaqs?.map((f: any) => f.category) || [])];
  const articleCategories = [...new Set(filteredArticles?.map((a: any) => a.category) || [])];

  const handleSubmitTicket = () => {
    if (!newTicket.subject.trim() || !newTicket.description.trim()) return;
    createTicket.mutate(newTicket, {
      onSuccess: () => setNewTicket({ subject: "", description: "", category: "General" }),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <HelpCircle className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-3">
              How can we <span className="text-gradient">help?</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">
              Browse our FAQ, explore help articles, or submit a support ticket.
            </p>
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search for help..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 glass border-border"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 pb-16">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="glass border-border mx-auto flex w-fit">
            <TabsTrigger value="faq" className="font-display data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              FAQ
            </TabsTrigger>
            <TabsTrigger value="articles" className="font-display data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              Help Center
            </TabsTrigger>
            <TabsTrigger value="tickets" className="font-display data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              Make Tickets
            </TabsTrigger>
          </TabsList>

          {/* FAQ */}
          <TabsContent value="faq">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-8">
              {faqLoading ? (
                <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
              ) : faqCategories.length === 0 ? (
                <p className="text-center text-muted-foreground py-16">No FAQs found.</p>
              ) : (
                faqCategories.map((cat) => (
                  <div key={cat} id={`faq-category-${cat}`}>
                    <h3 className="font-display text-lg font-semibold text-foreground mb-3">{cat}</h3>
                    <Accordion type="multiple" className="space-y-2">
                      {filteredFaqs?.filter((f: any) => f.category === cat).map((faq: any) => (
                        <AccordionItem key={faq.id} value={faq.id} className="glass rounded-xl border-border/50 px-4">
                          <AccordionTrigger className="text-foreground text-sm font-medium hover:text-primary hover:no-underline">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-muted-foreground text-sm">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}</Accordion>
                  </div>
                ))
              )}
            </motion.div>
          </TabsContent>

          {/* Help Articles */}
          <TabsContent value="articles">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-8">
              {articlesLoading ? (
                <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
              ) : articleCategories.length === 0 ? (
                <p className="text-center text-muted-foreground py-16">No articles found.</p>
              ) : (
                articleCategories.map((cat) => (
                  <div key={cat}>
                    <h3 className="font-display text-lg font-semibold text-foreground mb-4">{cat}</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {filteredArticles?.filter((a: any) => a.category === cat).map((article: any) => {
                        const Icon = iconMap[article.icon] || BookOpen;
                        return (
                          <motion.div
                            key={article.id}
                            whileHover={{ y: -2 }}
                            className="glass rounded-xl p-5 space-y-3 cursor-default"
                          >
                            <Icon className="w-8 h-8 text-primary" />
                            <h4 className="font-display font-semibold text-foreground text-sm">{article.title}</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">{article.content}</p>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          </TabsContent>

          {/* Tickets */}
          <TabsContent value="tickets">
            <div className="max-w-3xl mx-auto space-y-8">
              {!user ? (
                <div className="text-center py-16 space-y-4">
                  <MessageSquarePlus className="w-10 h-10 mx-auto text-muted-foreground/30" />
                  <p className="text-muted-foreground">Sign in to submit and view support tickets.</p>
                  <Button onClick={() => navigate("/auth")} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Sign In
                  </Button>
                </div>
              ) : (
                <>
                  {/* New ticket form */}
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-6 space-y-4">
                    <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                      <MessageSquarePlus className="w-5 h-5 text-primary" />
                      Submit a Ticket
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        placeholder="Subject"
                        value={newTicket.subject}
                        onChange={(e) => setNewTicket((p) => ({ ...p, subject: e.target.value }))}
                        className="glass border-border"
                      />
                      <Select value={newTicket.category} onValueChange={(v) => setNewTicket((p) => ({ ...p, category: v }))}>
                        <SelectTrigger className="glass border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass border-border">
                          {["General", "Order Issue", "Payment", "Account", "Bug Report", "Feature Request"].map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      placeholder="Describe your issue in detail..."
                      value={newTicket.description}
                      onChange={(e) => setNewTicket((p) => ({ ...p, description: e.target.value }))}
                      className="glass border-border min-h-[100px]"
                    />
                    <Button
                      onClick={handleSubmitTicket}
                      disabled={createTicket.isPending || !newTicket.subject.trim() || !newTicket.description.trim()}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan"
                    >
                      <Send className="w-4 h-4 mr-2" /> Submit Ticket
                    </Button>
                  </motion.div>

                  {/* Existing tickets */}
                  <div className="space-y-3">
                    <h3 className="font-display text-lg font-semibold text-foreground">Your Tickets</h3>
                    {!tickets?.length ? (
                      <p className="text-muted-foreground text-sm py-8 text-center">No tickets yet.</p>
                    ) : (
                      tickets.map((t: any) => (
                        <motion.div
                          key={t.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="glass rounded-xl overflow-hidden"
                        >
                          <button
                            onClick={() => setExpandedTicket(expandedTicket === t.id ? null : t.id)}
                            className="w-full p-4 flex items-center gap-3 text-left"
                          >
                            {t.status === "open" && <AlertCircle className="w-4 h-4 text-green-400 shrink-0" />}
                            {t.status === "in_progress" && <Clock className="w-4 h-4 text-blue-400 shrink-0" />}
                            {(t.status === "resolved" || t.status === "closed") && <CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground text-sm truncate">{t.subject}</p>
                              <p className="text-xs text-muted-foreground">{t.category} • {new Date(t.created_at).toLocaleDateString()}</p>
                            </div>
                            <Badge className={ticketStatusColors[t.status] || ""}>{t.status.replace("_", " ")}</Badge>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedTicket === t.id ? "rotate-180" : ""}`} />
                          </button>
                          {expandedTicket === t.id && (
                            <div className="px-4 pb-4">
                              <p className="text-sm text-muted-foreground mb-2">{t.description}</p>
                              <TicketThread ticketId={t.id} />
                            </div>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* No Footer on Support page */}
    </div>
  );
};

export default Support;
