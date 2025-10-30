import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  featured?: boolean;
}

export const FeatureCard = ({ icon: Icon, title, description, featured = false }: FeatureCardProps) => {
  const iconColor = featured ? "text-staff" : "text-primary";
  const borderColor = featured ? "border-staff/20" : "";

  return (
    <Card className={`group transition-shadow duration-200 hover:shadow-md ${borderColor}`}>
      <CardHeader className="space-y-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${featured ? 'bg-staff/10' : 'bg-primary/10'}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base leading-relaxed">{description}</CardDescription>
      </CardContent>
    </Card>
  );
};
