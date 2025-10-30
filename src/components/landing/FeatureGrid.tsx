import { MessageSquare, Building2, ListTodo, Bell } from "lucide-react";
import { FeatureCard } from "./FeatureCard";

export const FeatureGrid = () => {
  const features = [
    {
      icon: MessageSquare,
      title: "Dual-Mode მესიჯები",
      description:
        "გადართეთ კლიენტისთვის ხილვად მესიჯებსა და გუნდის შიდა შენიშვნებს შორის. შეინახეთ შიდა კომუნიკაცია პრივატულად, ხოლო კლიენტებთან ურთიერთობა ღია.",
    },
    {
      icon: Building2,
      title: "მრავალი ორგანიზაცია",
      description:
        "შექმენით და მართეთ რამდენიმე ორგანიზაცია ერთი ანგარიშიდან. თითოეულ ორგანიზაციას აქვს საკუთარი წევრები, ჩატები და პროექტები სრული იზოლაციით.",
    },
    {
      icon: ListTodo,
      title: "პროექტების მართვა",
      description:
        "მართეთ დავალებები kanban დაფით, კალენდარით და ფაილების მიმაგრებით. თვალი ადევნეთ პროგრესს review workflow-ით და განსაზღვრეთ დედლაინები.",
    },
    {
      icon: Bell,
      title: "Real-Time შეტყობინებები",
      description:
        "მიიღეთ instant push შეტყობინებები ახალი მესიჯების შესახებ. შეტყობინებები ავტომატურად ფილტრდება როლის მიხედვით - staff-only მესიჯები მხოლოდ გუნდის წევრებისთვის.",
    },
  ];

  return (
    <section id="features" className="py-24 sm:py-32 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-1 w-12 bg-primary rounded-full" />
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              ყველაფერი, რაც თქვენ გჭირდებათ
            </h2>
            <div className="h-1 w-12 bg-primary rounded-full" />
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            DualChat აერთიანებს კომუნიკაციას, პროექტების მართვასა და თანამშრომლობის ინსტრუმენტებს
            ერთ პლატფორმაზე.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div key={index}>
              {index === 0 ? (
                // First card (Dual-Mode) with staff color accent
                <div className="group hover:shadow-lg transition-all duration-300 border border-staff/30 bg-staff/5 rounded-lg">
                  <div className="p-6">
                    <div className="p-3 bg-staff/20 rounded-lg inline-block group-hover:bg-staff/30 transition-colors">
                      <feature.icon className="w-6 h-6 text-staff" />
                    </div>
                    <h3 className="text-xl font-semibold mt-4 mb-2">{feature.title}</h3>
                    <p className="text-base text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ) : (
                <FeatureCard {...feature} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
