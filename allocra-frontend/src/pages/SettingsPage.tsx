import { useEffect, useRef, useState } from "react";
import {
  useMe,
  useUpdateMe,
  useUpdateNotificationPrefs,
} from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageSkeleton } from "@/components/states/PageSkeleton";
import { Check, Copy, Upload } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { data: me, isLoading } = useMe();
  const update = useUpdateMe();
  const updateNotifPrefs = useUpdateNotificationPrefs();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [emailPref, setEmailPref] = useState(true);
  const [inAppPref, setInAppPref] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!me) return;
    setName(me.name ?? "");
    setAvatar(me.avatar_url ?? "");
    setEmailPref(me.email_notifications ?? true);
    setInAppPref(me.in_app_notifications ?? true);
  }, [me]);

  if (isLoading) return <PageSkeleton />;

  const save = async () => {
    try {
      await update.mutateAsync({
        name,
        avatar_url: avatar || undefined,
      });
    } catch {
      // toast handled in hook
    }
  };

  const toggleEmail = (v: boolean) => {
    setEmailPref(v);
    updateNotifPrefs.mutate({ email_notifications: v });
  };

  const toggleInApp = (v: boolean) => {
    setInAppPref(v);
    updateNotifPrefs.mutate({ in_app_notifications: v });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setAvatar(result);
        toast.success("Photo updated — remember to save");
      }
    };
    reader.readAsDataURL(file);
  };

  const copyId = async () => {
    if (!me?.id) return;
    try {
      await navigator.clipboard.writeText(me.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  const initials = (name || me?.email || "?").slice(0, 2).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your profile and notification preferences.
        </p>
      </header>

      <Card className="space-y-6 p-6">
        <h2 className="text-lg font-semibold">Profile</h2>

        <div className="flex items-center gap-5">
          <Avatar className="h-20 w-20 ring-2 ring-border">
            <AvatarImage src={avatar} alt={name || me?.email} />
            <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoSelect}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              {avatar ? "Change photo" : "Upload image"}
            </Button>
            <p className="text-xs text-muted-foreground">PNG or JPG, up to 5MB.</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={me?.email ?? ""}
            readOnly
            className="cursor-default bg-muted/40 text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <p className="text-xs text-muted-foreground">Managed via sign-in</p>
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">Notifications</h2>
        {[
          { key: "email", label: "Email notifications", v: emailPref, set: toggleEmail },
          { key: "in_app", label: "In-app notifications", v: inAppPref, set: toggleInApp },
        ].map((row) => (
          <div key={row.key} className="flex items-center justify-between">
            <Label>{row.label}</Label>
            <Switch checked={row.v} onCheckedChange={row.set} />
          </div>
        ))}
      </Card>

      <div className="flex items-center justify-between gap-4">
        {me?.id && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>User ID</span>
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
              {me.display_id ?? me.id}
            </code>
            <button
              type="button"
              onClick={copyId}
              className="inline-flex items-center gap-1 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Copy user ID"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
        <Button onClick={save} disabled={update.isPending} className="ml-auto">
          {update.isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
