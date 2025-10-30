import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { BenefitsSection } from "@/components/landing/BenefitsSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

const Landing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // If user is authenticated, redirect to app
  useEffect(() => {
    if (!loading && user) {
      navigate("/app");
    }
  }, [user, loading, navigate]);

  const handleNavigateToSection = (section: string) => {
    const element = document.getElementById(section);
    if (!element) return;

    const offset = 80; // Nav height + padding
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">იტვირთება...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingNav onNavigate={handleNavigateToSection} />
      <HeroSection />
      <FeatureGrid />
      <BenefitsSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <LandingFooter />
    </div>
  );
};

export default Landing;
