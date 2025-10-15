import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProfileSetupForm } from "@/components/setup/ProfileSetupForm";
import { OrganizationSetupForm } from "@/components/setup/OrganizationSetupForm";
import { SetupComplete } from "@/components/setup/SetupComplete";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TOTAL_STEPS = 3;

const Setup = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { createOrganization } = useOrganization();

  // Current step (1-based)
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      toast.error("გთხოვთ შეხვიდეთ სისტემაში");
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Profile data
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Organization data
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  const [orgLogoFile, setOrgLogoFile] = useState<File | null>(null);
  const [orgLogoPreview, setOrgLogoPreview] = useState<string | null>(null);

  const progress = (currentStep / TOTAL_STEPS) * 100;

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate step 1 (no required fields, just move on)
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validate step 2 (organization name is required)
      if (!orgName.trim()) {
        toast.error("გთხოვთ შეიყვანოთ ორგანიზაციის სახელი");
        return;
      }
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep === 1) {
      setCurrentStep(2);
    }
  };

  const handleFinish = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Step 1: Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          phone: phone.trim() || null,
          bio: bio.trim() || null,
          avatar_url: avatarUrl,
          setup_completed: true,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Step 2: Upload organization logo if provided
      let orgLogoUrl: string | null = null;
      if (orgLogoFile) {
        const fileExt = orgLogoFile.name.split(".").pop();
        const fileName = `${user.id}/logo-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("organization-logos")
          .upload(fileName, orgLogoFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Logo upload error:", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from("organization-logos")
            .getPublicUrl(fileName);
          orgLogoUrl = urlData.publicUrl;
        }
      }

      // Step 3: Create organization
      const org = await createOrganization({
        name: orgName.trim(),
        description: orgDescription.trim() || undefined,
        logo_url: orgLogoUrl || undefined,
      });

      if (!org) {
        throw new Error("Failed to create organization");
      }

      // Show success step
      setCurrentStep(3);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      console.error("Setup error:", error);
      toast.error("შეცდომა მონაცემების შენახვისას");
    } finally {
      setSaving(false);
    }
  };

  const handleOrgLogoChange = (file: File | null, preview: string | null) => {
    setOrgLogoFile(file);
    setOrgLogoPreview(preview);
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">იტვირთება...</p>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-staff/5 p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardContent className="pt-8">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">
                ნაბიჯი {currentStep} / {TOTAL_STEPS}
              </span>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            {currentStep === 1 && (
              <ProfileSetupForm
                phone={phone}
                bio={bio}
                avatarUrl={avatarUrl}
                onPhoneChange={setPhone}
                onBioChange={setBio}
                onAvatarChange={setAvatarUrl}
              />
            )}

            {currentStep === 2 && (
              <OrganizationSetupForm
                name={orgName}
                description={orgDescription}
                logoFile={orgLogoFile}
                logoPreview={orgLogoPreview}
                onNameChange={setOrgName}
                onDescriptionChange={setOrgDescription}
                onLogoChange={handleOrgLogoChange}
              />
            )}

            {currentStep === 3 && <SetupComplete />}
          </div>

          {/* Navigation Buttons */}
          {currentStep < 3 && (
            <div className="flex justify-between items-center mt-8 pt-6 border-t">
              <div>
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    disabled={saving}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    უკან
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                {currentStep === 1 && (
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    disabled={saving}
                  >
                    გამოტოვება
                  </Button>
                )}

                <Button onClick={handleNext} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      შენახვა...
                    </>
                  ) : currentStep === 2 ? (
                    "დასრულება"
                  ) : (
                    <>
                      შემდეგი
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Setup;
