import { Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const BenefitsSection = () => {
  const problems = [
    "კლიენტები ხედავენ შიდა შენიშვნებს",
    "გუნდის კომუნიკაცია გაფანტულია",
    "დავალებები გამოტოვებულია",
    "პროექტები არაორგანიზებული",
  ];

  const solutions = [
    "Staff-only რეჟიმი პრივატული ნოტებისთვის",
    "ყველა კომუნიკაცია ერთ პლატფორმაზე",
    "Kanban დაფა და კალენდარი",
    "დოკუმენტაცია და ფაილები ერთად",
  ];

  return (
    <section id="benefits" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-1 w-12 bg-staff rounded-full" />
            <h2 className="text-3xl sm:text-4xl font-bold">
              რატომ DualChat?
            </h2>
            <div className="h-1 w-12 bg-staff rounded-full" />
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            გადავწყვიტეთ ის პრობლემები, რომლითაც გუნდები ყოველდღიურად გადადიან
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Before: Problems */}
          <Card className="border-destructive/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <X className="w-5 h-5 text-destructive" />
                </div>
                <h3 className="text-xl font-semibold">მანამდე</h3>
              </div>
              <ul className="space-y-4">
                {problems.map((problem, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <X className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{problem}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* After: Solutions */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Check className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">DualChat-ით</h3>
              </div>
              <ul className="space-y-4">
                {solutions.map((solution, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="font-medium">{solution}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
