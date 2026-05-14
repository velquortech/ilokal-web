'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Building2, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ROUTES } from '@/config/routeConfig';
import { cn } from '@/lib/utils';

const portals = [
  {
    href: ROUTES.AUTH.BUSINESS_LOGIN,
    label: 'Business Portal',
    description: 'Manage your listings, products, and deals',
    icon: Building2,
    iconClass: 'bg-primary text-primary-foreground',
  },
] as const;

export function PortalSelector() {
  return (
    <div className="w-full max-w-sm space-y-6">
      <motion.div
        className="space-y-1.5 text-center"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          Choose your portal to continue
        </p>
      </motion.div>

      <div className="grid gap-3">
        {portals.map((portal, i) => (
          <motion.div
            key={portal.href}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.35,
              delay: 0.12 + i * 0.08,
              ease: 'easeOut',
            }}
          >
            <Link href={portal.href} className="block">
              <Card className="hover:border-foreground/25 cursor-pointer py-0 transition-all duration-200 hover:shadow-md active:scale-[0.99]">
                <CardContent className="flex items-center gap-4 p-5">
                  <div
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                      portal.iconClass,
                    )}
                  >
                    <portal.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <p className="leading-none font-semibold">{portal.label}</p>
                    <p className="text-muted-foreground text-sm">
                      {portal.description}
                    </p>
                  </div>
                  <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <motion.p
        className="text-muted-foreground text-center text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        Don&apos;t have an account?{' '}
        <Link
          href={ROUTES.AUTH.SIGNUP}
          className="text-foreground font-semibold hover:underline"
        >
          Sign up
        </Link>
      </motion.p>
    </div>
  );
}
