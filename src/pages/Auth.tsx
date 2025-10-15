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
  fullName: z.string().trim().min(2, "სახელი უნდა შეიცავდეს მინიმუმ 2 სიმბოლოს").max(100),
  email: z.string().trim().email("არასწორი ელ. ფოსტის მისამართი").max(255),
  password: z.string().min(6, "პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს").max(100),
});

const loginSchema = z.object({
  email: z.string().trim().email("არასწორი ელ. ფოსტის მისამართი"),
  password: z.string().min(1, "პაროლი სავალდებულოა"),
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
            toast.error("არასწორი ან ვადაგასული მოსაწვევი");
            return;
          }

          if (data.accepted_at) {
            toast.info("ეს მოსაწვევი უკვე გამოყენებულია");
            return;
          }

          const expiresAt = new Date(data.expires_at);
          if (expiresAt < new Date()) {
            toast.error("ეს მოსაწვევი ვადაგასულია");
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
        toast.error(`ეს მოსაწვევი განკუთვნილია ${invitationData.email}-ისთვის`);
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
          toast.error("ეს ელ. ფოსტა უკვე რეგისტრირებულია. გთხოვთ შეხვიდეთ სისტემაში.");
        } else {
          toast.error(error.message);
        }
      } else if (authData.user) {
        // Check if email confirmation is required
        if (authData.session) {
          // Auto-confirmed (e.g., if email confirmation is disabled)
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

              toast.success(`მოგესალმებით! თქვენ დამატებული ხართ ${invitationData.chatName}-ში`);
            }
          }

          toast.success("ანგარიში შეიქმნა! გადამისამართება...");
          navigate("/setup");
        } else {
          // Email confirmation required
          toast.success(
            "რეგისტრაცია წარმატებულია! გთხოვთ შეამოწმოთ თქვენი ელ. ფოსტა და დაადასტუროთ ანგარიში.",
            { duration: 5000 }
          );
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("რეგისტრაციის დროს მოხდა შეცდომა");
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
          toast.error("არასწორი ელ. ფოსტა ან პაროლი");
        } else {
          toast.error(error.message);
        }
      } else {
        // Check if user has completed setup
        const { data: profile } = await supabase
          .from("profiles")
          .select("setup_completed")
          .eq("id", (await supabase.auth.getUser()).data.user?.id!)
          .single();

        if (profile && profile.setup_completed === false) {
          toast.success("კეთილი იყოს თქვენი დაბრუნება! დაასრულეთ პროფილის გაკეთება.");
          navigate("/setup");
        } else {
          toast.success("კეთილი იყოს თქვენი დაბრუნება!");
          navigate("/");
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("შესვლის დროს მოხდა შეცდომა");
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
            პროფესიონალური კომუნიკაციის პლატფორმა მარკეტინგის გუნდებისთვის
          </CardDescription>
        </CardHeader>

        <CardContent>
          {invitationData && (
            <Alert className="mb-4 border-primary/20 bg-primary/5">
              <Mail className="h-4 w-4" />
              <AlertDescription>
                თქვენ მოწვეული ხართ შეუერთდეთ <strong>{invitationData.chatName}</strong>-ს როგორც{" "}
                <strong>{invitationData.role === "team_member" ? "გუნდის წევრი" : "კლიენტი"}</strong>.
                გთხოვთ დარეგისტრირდეთ <strong>{invitationData.email}</strong>-ით მოსაწვევის მისაღებად.
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue={invitationData ? "signup" : "login"} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">შესვლა</TabsTrigger>
              <TabsTrigger value="signup">რეგისტრაცია</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">ელ. ფოსტა</Label>
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
                  <Label htmlFor="login-password">პაროლი</Label>
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
                  {loading ? "შესვლა..." : "შესვლა"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">სრული სახელი</Label>
                  <Input
                    id="signup-name"
                    name="fullName"
                    type="text"
                    placeholder="გიორგი ბერიძე"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">ელ. ფოსტა</Label>
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
                  <Label htmlFor="signup-password">პაროლი</Label>
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
                  {loading ? "ანგარიშის შექმნა..." : "რეგისტრაცია"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="text-center text-sm text-muted-foreground">
          გაგრძელებით თქვენ ეთანხმებით ჩვენს წესებსა და კონფიდენციალურობის პოლიტიკას
        </CardFooter>
      </Card>
    </div>
  );
};

export default Auth;
