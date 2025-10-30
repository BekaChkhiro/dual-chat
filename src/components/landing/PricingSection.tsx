import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, ArrowRight } from "lucide-react";

export const PricingSection = () => {
  const navigate = useNavigate();

  const features = [
    "უშეზღუდავი ორგანიზაციები",
    "უშეზღუდავი ჩატები და წევრები",
    "Dual-mode მესიჯინგი",
    "პროექტების მართვა (Tasks, Kanban, Calendar)",
    "დოკუმენტაცია და ფაილების მართვა",
    "Real-time push შეტყობინებები",
    "როლზე დაფუძნებული წვდომა",
    "24/7 მხარდაჭერა",
  ];

  return (
    <section id="pricing" className="py-24 sm:py-32 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            მზად ხართ დაწყებისთვის?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            დაიწყეთ უფასოდ და გამოსცადეთ WorkChat-ის ყველა შესაძლებლობა
          </p>
        </div>

        <Card className="max-w-3xl mx-auto border-primary/20 shadow-xl">
          <CardContent className="pt-8">
            <div className="text-center space-y-6 mb-8">
              <div>
                <h3 className="text-3xl font-bold mb-2">უფასო გამოცდა</h3>
                <p className="text-muted-foreground">
                  დაიწყეთ დღესვე, საკრედიტო ბარათის გარეშე
                </p>
              </div>

              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold">უფასოდ</span>
                <span className="text-muted-foreground">/რეგისტრაცია</span>
              </div>
            </div>

            {/* CTA - Moved above features */}
            <div className="flex flex-col items-center gap-4 mb-8">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="w-full sm:w-auto group hover:scale-105 hover:shadow-lg transition-all"
              >
                დაიწყეთ უფასოდ
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                არ არის საჭირო საკრედიტო ბარათი • რამდენიმე წუთში დაიწყეთ • გააუქმეთ ნებისმიერ დროს
              </p>
            </div>

            {/* Features list - Moved below CTA */}
            <div className="border-t pt-6">
              <p className="text-center text-sm font-medium mb-4">ყველა შესაძლებლობა შედის:</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
