import { ComponentProps, ReactNode } from 'react';
import { Loader2Icon } from 'lucide-react';
import { Button } from '../ui/button';

interface ButtonTypes extends ComponentProps<'button'> {
  children: ReactNode;
  className?: string;
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  isLoading?: boolean;
}

export function CustomButton({
  children,
  className,
  variant,
  size,
  isLoading = false,
  ...props
}: ButtonTypes) {
  return (
    <Button
      className={`${className} cursor-pointer`}
      variant={variant}
      size={size}
      {...props}
    >
      {isLoading && <Loader2Icon className="animate-spin" />}
      {children}
    </Button>
  );
}
