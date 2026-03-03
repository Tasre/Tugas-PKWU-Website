import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import PopularGames from "@/components/FeaturedGames";
import TopSellingListings from "@/components/TopSellingListings";
import Features from "@/components/Features";
import Spotlight from "@/components/Spotlight";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";

const Marketplace = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <TopSellingListings />
      <PopularGames />
      <Features />
      <Spotlight />
      <Footer />
    </div>
  );
};

export default Marketplace;
