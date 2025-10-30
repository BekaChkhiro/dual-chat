import { Plus, Users, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const HowItWorksSection = () => {
  const steps = [
    {
      icon: Plus,
      number: "01",
      title: "შექმენით ორგანიზაცია",
      description:
        "დაიწყეთ თქვენი პირველი ორგანიზაციის შექმნით და მოიწვიეთ თქვენი გუნდი. ორგანიზაციები საშუალებას გაძლევთ მართოთ რამდენიმე პროექტი და კლიენტი ერთდროულად.",
    },
    {
      icon: Users,
      number: "02",
      title: "დაამატეთ გუნდი და კლიენტები",
      description:
        "მოიწვიეთ გუნდის წევრები და კლიენტები თითოეულ ჩატში. დააყენეთ როლები - გუნდის წევრები ხედავენ staff-only მესიჯებს, კლიენტები მხოლოდ რეგულარულს.",
    },
    {
      icon: MessageCircle,
      number: "03",
      title: "დაიწყეთ კომუნიკაცია",
      description:
        "გამოიყენეთ dual-mode რეჟიმი შიდა ნოტებისა და კლიენტის მესიჯებისთვის. მართეთ დავალებები, ატვირთეთ ფაილები და დარჩით სინქრონში real-time შეტყობინებებით.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 sm:py-32 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-1 w-12 bg-primary rounded-full" />
            <h2 className="text-3xl sm:text-4xl font-bold">
              დაიწყეთ 3 ნაბიჯში
            </h2>
            <div className="h-1 w-12 bg-primary rounded-full" />
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            რამდენიმე წუთში შექმენით თქვენი პირველი პროექტი
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connecting line (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-border" />
              )}

              <Card className="relative hover:shadow-lg transition-all duration-300">
                <CardContent className="pt-6 space-y-4">
                  {/* Step number */}
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-4xl font-bold text-primary/20">{step.number}</span>
                  </div>

                  {/* Title and description */}
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
