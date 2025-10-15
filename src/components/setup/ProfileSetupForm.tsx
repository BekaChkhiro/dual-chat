import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AvatarUpload } from "./AvatarUpload";

interface ProfileSetupFormProps {
  phone: string;
  bio: string;
  avatarUrl: string | null;
  onPhoneChange: (phone: string) => void;
  onBioChange: (bio: string) => void;
  onAvatarChange: (url: string | null) => void;
}

export const ProfileSetupForm = ({
  phone,
  bio,
  avatarUrl,
  onPhoneChange,
  onBioChange,
  onAvatarChange,
}: ProfileSetupFormProps) => {
  const [bioLength, setBioLength] = useState(bio.length);

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newBio = e.target.value;
    if (newBio.length <= 500) {
      onBioChange(newBio);
      setBioLength(newBio.length);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">პროფილის დეტალები</h2>
        <p className="text-muted-foreground">
          შეავსეთ თქვენი პროფილის ინფორმაცია
        </p>
      </div>

      {/* Avatar Upload */}
      <div className="flex justify-center">
        <AvatarUpload avatarUrl={avatarUrl} onAvatarChange={onAvatarChange} />
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">
          ტელეფონის ნომერი <span className="text-muted-foreground">(არასავალდებულო)</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+995 555 12 34 56"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
        />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">
          ჩემ შესახებ <span className="text-muted-foreground">(არასავალდებულო)</span>
        </Label>
        <Textarea
          id="bio"
          placeholder="მოკლე ინფორმაცია თქვენ შესახებ..."
          value={bio}
          onChange={handleBioChange}
          rows={4}
          className="resize-none"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>მაქსიმუმ 500 სიმბოლო</span>
          <span className={bioLength > 450 ? "text-orange-500" : ""}>
            {bioLength}/500
          </span>
        </div>
      </div>
    </div>
  );
};
