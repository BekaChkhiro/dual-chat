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
    <section id="features" className="py-20 sm:py-24 lg:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold">
            ყველაფერი, რაც თქვენ გჭირდებათ
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            WorkChat აერთიანებს კომუნიკაციას, პროექტების მართვასა და თანამშრომლობის ინსტრუმენტებს
            ერთ პლატფორმაზე.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              {...feature}
              featured={index === 0}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
