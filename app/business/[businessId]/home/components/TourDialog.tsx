/**
 * Reusable tour dialog component for onboarding
 * Displays a welcome tour for first-time users
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Rocket, CheckCircle } from 'lucide-react';
import { OnboardingCard } from './OnboardingSection';

interface TourDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: () => void;
  title?: string;
  description?: string;
  requireDocuments?: boolean;
  features?: Array<{
    icon?: 'check';
    text: string;
  }>;
}

/**
 * Onboarding tour dialog component
 */
export function TourDialog({
  isOpen,
  onClose,
  onStart,
  title = 'Welcome to your Business Dashboard!',
  description = "Let's get you started with setting up your shop on iLokal.",
  features = [
    { icon: 'check', text: 'Register your business' },
    { icon: 'check', text: 'Upload your products' },
    { icon: 'check', text: 'Start selling to customers' },
  ],
  requireDocuments = true,
}: TourDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex h-140 max-w-5xl! flex-row gap-8"
        showCloseButton={false}
      >
        <div className="bg-primary/10 flex w-1/2 items-center justify-center rounded-xl">
          <OnboardingCard requireDocuments={requireDocuments} />
        </div>
        <div className="flex flex-1 flex-col">
          <DialogHeader>
            <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <Rocket className="text-primary h-6 w-6" />
            </div>
            <DialogTitle className="text-center">{title}</DialogTitle>
            <DialogDescription className="text-center">
              {description}
            </DialogDescription>
          </DialogHeader>
          <div className="my-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="text-primary my-4 flex items-center gap-4"
              >
                {feature.icon === 'check' && (
                  <CheckCircle className="text-success h-5 w-5" />
                )}
                <span className="text-foreground">{feature.text}</span>
              </div>
            ))}
          </div>
          <DialogFooter className="mt-auto flex flex-col gap-2 sm:flex-col">
            <Button onClick={onStart} className="w-full">
              Start Registration
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full">
              I'll do this later
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
