import { CheckCircle2, Globe, Rocket, ShieldCheck } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

export default function WhyRegisterCard() {
  const benefits = [
    {
      title: 'Tourist Visibility',
      description: 'Get discovered by travelers looking for local experiences.',
      icon: <Globe className="h-4 w-4" />,
    },
    {
      title: 'Verified Badge',
      description: "Build trust with a 'Verified' status on your profile.",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      title: 'Growth Tools',
      description: 'Access marketing hubs and voucher creation systems.',
      icon: <Rocket className="h-4 w-4" />,
    },
  ];

  return (
    <Card className="bg-primary/5 text-foreground shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl font-bold">
          Why register on ilokal?
        </CardTitle>
        <CardDescription className="text-foreground/90">
          Unlock the full potential of your business and reach more customers.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex h-full flex-col space-y-6">
        {benefits.map((benefit, index) => (
          <div key={index} className="flex items-start gap-4">
            <div className="bg-primary/20 mt-1 rounded-full p-2">
              {benefit.icon}
            </div>
            <div>
              <h4 className="text-sm font-semibold">{benefit.title}</h4>
              <p className="text-foreground/90 text-sm leading-tight">
                {benefit.description}
              </p>
            </div>
          </div>
        ))}

        <div className="border-foreground/20 mt-auto border-t pt-4">
          <div className="flex items-center gap-2 text-xs font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Join the community of local shops
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
