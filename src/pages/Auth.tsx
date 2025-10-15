import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { MessageSquare, Mail } from "lucide-react";
import { z } from "zod";

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [invitationData, setInvitationData] = useState<{
    email: string;
    chatName: string;
    role: string;
  } | null>(null);

  // Check for invitation token
  useEffect(() => {
    const token = searchParams.get("invitation");
    if (token) {
      // Fetch invitation details
      supabase
        .from("chat_invitations")
        .select("email, role, chats(client_name), expires_at, accepted_at")
        .eq("token", token)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error || !data) {
            toast.error("Invalid or expired invitation");
            return;
          }

          if (data.accepted_at) {
            toast.info("This invitation has already been used");
            return;
          }

          const expiresAt = new Date(data.expires_at);
          if (expiresAt < new Date()) {
            toast.error("This invitation has expired");
            return;
          }

          setInvitationData({
            email: data.email,
            chatName: (data.chats as any)?.client_name || "a chat",
            role: data.role,
          });
        });
    }
  }, [searchParams]);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      fullName: formData.get("fullName") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    try {
      const validated = signupSchema.parse(data);

      // If invitation exists, validate email matches
      if (invitationData && validated.email !== invitationData.email) {
        toast.error(`This invitation is for ${invitationData.email}`);
        setLoading(false);
        return;
      }

      const redirectUrl = `${window.location.origin}/`;

      const { data: authData, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: validated.fullName,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("This email is already registered. Please login instead.");
        } else {
          toast.error(error.message);
        }
      } else if (authData.user) {
        // If there's an invitation, process it
        if (invitationData) {
          const token = searchParams.get("invitation");
          
          // Get invitation details
          const { data: invitation } = await supabase
            .from("chat_invitations")
            .select("*")
            .eq("token", token!)
            .single();

          if (invitation) {
            // Add user to chat
            await supabase.from("chat_members").insert({
              chat_id: invitation.chat_id,
              user_id: authData.user.id,
            });

            // Assign role
            await supabase.from("user_roles").insert({
              user_id: authData.user.id,
              role: invitation.role,
            });

            // Mark invitation as accepted
            await supabase
              .from("chat_invitations")
              .update({ accepted_at: new Date().toISOString() })
              .eq("token", token!);

            toast.success(`Welcome! You've been added to ${invitationData.chatName}`);
          }
        } else {
          toast.success("Account created! Redirecting...");
        }
        navigate("/");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("An error occurred during signup");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    try {
      const validated = loginSchema.parse(data);

      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success("Welcome back!");
        navigate("/");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("An error occurred during login");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-staff/5 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-primary/10 rounded-full">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">DualChat</CardTitle>
          <CardDescription>
            Professional communication platform for marketing teams
          </CardDescription>
        </CardHeader>

        <CardContent>
          {invitationData && (
            <Alert className="mb-4 border-primary/20 bg-primary/5">
              <Mail className="h-4 w-4" />
              <AlertDescription>
                You've been invited to join <strong>{invitationData.chatName}</strong> as a{" "}
                <strong>{invitationData.role === "team_member" ? "Team Member" : "Client"}</strong>.
                Please sign up with <strong>{invitationData.email}</strong> to accept.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue={invitationData ? "signup" : "login"} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    name="fullName"
                    type="text"
                    placeholder="John Doe"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    disabled={loading}
                    defaultValue={invitationData?.email || ""}
                    readOnly={!!invitationData}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="text-center text-sm text-muted-foreground">
          By continuing, you agree to our Terms & Privacy Policy
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;
