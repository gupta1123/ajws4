// src/app/(auth)/login/page.tsx

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Eye, EyeOff, Building2, BookOpen, Users, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import { SplashScreen } from '@/components/ui/splash-screen';

export default function LoginPage() {
  const [phone_number, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeRole, setActiveRole] = useState<keyof typeof userCredentials | null>(null);
  const { login, error, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  // Predefined credentials for different user roles
  const userCredentials = useMemo(
    () => ({
      teacher: { phone: '1234567894', password: 'password123' },
      admin: { phone: '1234567890', password: 'Shilpa@123' },
      principal: { phone: '1234567891', password: 'password123' }
    }),
    []
  );

  const handleUserSelect = (userType: keyof typeof userCredentials) => {
    setPhoneNumber(userCredentials[userType].phone);
    setPassword(userCredentials[userType].password);
    setActiveRole(userType);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone_number || !password) return;
    setIsLoading(true);
    
    try {
      await login(phone_number, password);
      router.push('/dashboard'); // Redirect to dashboard after login
    } catch (err) {
      // Error is handled by the auth context
      console.error('Login failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // If already authenticated (or auth context is loading), show splash instead of form
  const showSplash = isLoading || authLoading || isAuthenticated;

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(40rem_40rem_at_20%_-10%,hsl(var(--primary)/0.12),transparent),radial-gradient(30rem_30rem_at_120%_10%,hsl(var(--primary)/0.10),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,hsl(var(--background)/0),hsl(var(--background))_60%)]" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 blur-3xl opacity-40 w-[60rem] h-[60rem] rounded-full bg-primary/10" />
      </div>

      <div className="mx-auto grid min-h-[100dvh] w-full max-w-7xl grid-cols-1 md:grid-cols-2">
        {/* Brand / Story side */}
        <div className="relative hidden md:flex items-center p-10">
          <div className="relative w-full max-w-xl">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              AJWS Teacher Suite
            </div>

            <div className="mb-6 flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground grid place-items-center shadow-md">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold leading-tight">Anil Jindal World School</h1>
                <p className="text-sm text-muted-foreground">Staff Portal • Internal Access</p>
              </div>
            </div>

            <div className="space-y-4">
              <FeatureRow icon={<BookOpen className="h-4 w-4" />} title="Daily tools" desc="Attendance, timetable, classwork and homework in one place." />
              <FeatureRow icon={<Users className="h-4 w-4" />} title="Built‑in messaging" desc="Co‑ordinate with parents and staff from your dashboard." />
              <FeatureRow icon={<ShieldCheck className="h-4 w-4" />} title="Access controlled" desc="Role‑based access for school staff only." />
            </div>

            {/* Stat bubbles */}
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <StatPill label="Fast sign‑in" />
              <StatPill label="Dark/Light ready" />
              <StatPill label="Mobile‑first" />
            </div>
          </div>
        </div>

        {/* Form side */}
        <div className="flex items-center justify-center p-6 md:p-10">
          <Card className="relative w-full max-w-md border-border/60 bg-background/70 backdrop-blur-xl shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
              <CardDescription>Sign in to Anil Jindal World School</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4" aria-live="polite">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Quick role chips */}
              <div className="mb-4">
                <Label htmlFor="user-role" className="text-xs">Test login (development only)</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {([
                    { key: 'teacher', label: 'Teacher' },
                    { key: 'admin', label: 'Admin' },
                    { key: 'principal', label: 'Principal' },
                  ] as const).map((r) => (
                    <Button
                      key={r.key}
                      type="button"
                      variant={activeRole === r.key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleUserSelect(r.key)}
                      className="text-xs"
                      aria-pressed={activeRole === r.key}
                    >
                      {r.label}
                    </Button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone number</Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Enter your phone number"
                    value={phone_number}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-2 flex items-center px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((s) => !s)}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="relative w-full" disabled={isLoading}>
                  <span className={isLoading ? 'opacity-0' : ''}>Sign In</span>
                  {isLoading && <Loader2 className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2" />}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <div className="text-center text-sm text-muted-foreground">
                This system is for authorized staff only. For account help, contact the school administrator.
              </div>
            </CardFooter>

            {/* subtle glow */}
            <div className="pointer-events-none absolute -inset-[1px] -z-10 rounded-2xl bg-gradient-to-b from-primary/20 to-transparent blur-xl" />
          </Card>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="group relative flex items-start gap-3 rounded-xl border bg-background/60 p-3 backdrop-blur transition-colors hover:bg-background">
      <div className="mt-0.5 text-primary">{icon}</div>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function StatPill({ label }: { label: string }) {
  return (
    <div className="rounded-full border bg-background/60 px-3 py-1 backdrop-blur">
      {label}
    </div>
  );
}
