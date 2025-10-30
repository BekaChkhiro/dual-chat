import { Card, CardContent } from "@/components/ui/card";
import { Quote, Star } from "lucide-react";

export const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "გიორგი მელაძე",
      role: "CEO, Digital Agency",
      company: "CreativeLab",
      quote: "DualChat-მა შეცვალა ჩვენი კლიენტებთან კომუნიკაციის სპეციფიკა. შიდა შენიშვნები არ ერევა კლიენტის მესიჯებში - ეს არის სიმარტივე და უსაფრთხოება.",
      rating: 5,
    },
    {
      name: "თამარ ბერიძე",
      role: "Project Manager",
      company: "MarketHub",
      quote: "პროექტების მართვის ინსტრუმენტები და კომუნიკაცია ერთ პლატფორმაზე - ეს ზუსტად ის არის, რაც ჩვენს გუნდს სჭირდებოდა. გამოყენება ძალიან მარტივია.",
      rating: 5,
    },
    {
      name: "დავით კვარაცხელია",
      role: "Team Lead",
      company: "TechSolutions",
      quote: "Real-time შეტყობინებები და dual-mode რეჟიმი ძალიან კარგად ერწყმის ერთმანეთს. ჩვენი გუნდი უფრო პროდუქტიული გახდა DualChat-ით.",
      rating: 5,
    },
  ];

  return (
    <section className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-1 w-12 bg-primary rounded-full" />
            <h2 className="text-3xl sm:text-4xl font-bold">
              რას ამბობენ ჩვენი მომხმარებლები
            </h2>
            <div className="h-1 w-12 bg-primary rounded-full" />
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            შეუერთდით 500+ გუნდს, რომლებიც უკვე იყენებენ DualChat-ს
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="relative hover:shadow-lg transition-all duration-300">
              <CardContent className="pt-6">
                {/* Quote icon */}
                <div className="absolute top-4 right-4 opacity-10">
                  <Quote className="w-12 h-12 text-primary" />
                </div>

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg font-semibold text-primary">
                      {testimonial.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
