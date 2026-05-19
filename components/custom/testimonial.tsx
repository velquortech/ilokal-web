// components/customer-love.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star } from 'lucide-react';

type Testimonial = {
  id: string;
  name: string;
  role?: string;
  image?: string;
  review: string;
  rating: number;
};

export function Testimonial(testimonial: Testimonial) {
  return (
    <Card className="h-max p-0 shadow-sm transition duration-300 hover:shadow-md">
      <CardContent className="flex h-max flex-col gap-4 p-6">
        {/* ⭐ RATING */}
        <div className="flex gap-1 text-yellow-500">
          {Array.from({ length: testimonial.rating }).map((_, i) => (
            <Star key={i} size={16} fill="currentColor" />
          ))}
        </div>

        {/* 💬 REVIEW */}
        <p className="text-muted-foreground text-sm leading-relaxed italic">
          “{testimonial.review}”
        </p>

        {/* 👤 USER */}
        <div className="mt-2 flex items-center gap-3">
          <Avatar>
            <AvatarImage src={testimonial.image} />
            <AvatarFallback>
              {testimonial.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div>
            <p className="text-sm font-medium">{testimonial.name}</p>
            {testimonial.role && (
              <p className="text-muted-foreground text-xs">
                {testimonial.role}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
