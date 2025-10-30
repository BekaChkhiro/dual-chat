import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageSquare, Users, ListTodo } from "lucide-react";
import { ChatMockup } from "./ChatMockup";

export const HeroSection = () => {
  const navigate = useNavigate();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden py-20 sm:py-32">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-staff/5" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="space-y-8 animate-fade-in-up">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                დაცული{" "}
                <span className="text-primary">შიდა კომუნიკაცია</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                DualChat-ის Dual-Mode რეჟიმით მართეთ კლიენტებთან კომუნიკაცია და გუნდის შიდა ნოტები ერთ პლატფორმაზე.
                გადართეთ კლიენტისთვის ხილვად მესიჯებსა და staff-only შენიშვნებს შორის.
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="group hover:scale-105 hover:shadow-lg transition-all"
              >
                დაიწყეთ უფასოდ
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => scrollToSection("features")}
                className="group"
              >
                გაიგეთ მეტი
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* Stats/Features */}
            <div className="flex flex-wrap gap-8 pt-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold">Dual-Mode</div>
                  <div className="text-sm text-muted-foreground">ორმხრივი რეჟიმი</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold">Multi-Org</div>
                  <div className="text-sm text-muted-foreground">მრავალი ორგანიზაცია</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ListTodo className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold">Tasks</div>
                  <div className="text-sm text-muted-foreground">პროექტების მართვა</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Hero Image/Mockup */}
          <div className="relative lg:h-[600px] animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-staff/20 rounded-2xl blur-3xl" />
            <div className="relative h-full">
              <div className="h-[400px] sm:h-[500px] lg:h-full">
                <ChatMockup />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
