import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Login() {
  const { user, login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Redirect if already logged in
  if (user && !isLoading) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);

    try {
      const success = await login(formData.email, formData.password, remember);
      if (success) {
        navigate('/dashboard');
      } else {
        setLoginError('Invalid credentials. Please check your email and password.');
      }
    } catch (error) {
      setLoginError('An error occurred during login. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (loginError) {
      setLoginError('');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4">
      {/* Brand top-left to match main app */}
      <div className="absolute top-4 left-4 flex items-center space-x-2">
        <img
          src="https://cdn.builder.io/api/v1/image/assets%2Fd9af307b1ff14040a7ba27bfc11d5227%2Ffd066184d3bd44f2ab4e38cf3625b126?format=webp&width=800"
          alt="Aether Logo"
          className="w-8 h-8 object-contain"
        />
        <span className="hidden sm:inline font-semibold text-slate-900">AETHER</span>
      </div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2Fd9af307b1ff14040a7ba27bfc11d5227%2Ffd066184d3bd44f2ab4e38cf3625b126?format=webp&width=800"
              alt="Aether Logo"
              className="w-12 h-12 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Project Aether</h1>
          <p className="text-muted-foreground mt-2">Admin Portal Access</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl text-center font-semibold">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the admin dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {loginError && (
                <Alert variant="destructive">
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="admin@projectaether.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="h-11"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="h-11 pr-10"
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" className="h-4 w-4" checked={remember} onChange={(e)=> setRemember(e.target.checked)} />
                  Remember me
                </label>
                <div className="flex items-center gap-3"></div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium mt-2"
                disabled={isSubmitting || !formData.email || !formData.password}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>


            {typeof window !== 'undefined' && localStorage.getItem('show-demo-credentials') === 'true' && (
              <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border/50">
                <p className="text-sm text-muted-foreground text-center">
                  <strong>Demo Credentials:</strong>
                </p>
                <p className="text-sm text-muted-foreground text-center mt-1">
                  Email: admin@projectaether.com<br />
                  Password: admin123
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>© 2024 Project Aether. All rights reserved.</p>
        </div>
      </div>

    </div>
  );
}
