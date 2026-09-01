import { useState, useRef } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/hooks/useShop";
import { toast } from "sonner";

interface LogoUploaderProps {
  logoUrl: string;
  onLogoChange: (url: string) => void;
}

export default function LogoUploader({ logoUrl, onLogoChange }: LogoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { shopId } = useShop();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File must be under 2MB");
      return;
    }

    if (!shopId) {
      toast.error("Select a shop before uploading a logo");
      return;
    }

    setUploading(true);
    // Storage RLS only allows writes under <shop_id>/, so the shop folder is
    // part of the path, not optional.
    const ext = file.name.split(".").pop();
    const path = `${shopId}/logo-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("business_assets").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("business_assets").getPublicUrl(path);
    onLogoChange(urlData.publicUrl);
    toast.success("Logo uploaded");
    setUploading(false);
  };

  const handleRemove = () => {
    onLogoChange("");
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium flex items-center gap-2">
        <ImageIcon className="h-4 w-4" strokeWidth={1.5} />
        Business Logo
      </label>
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 rounded-2xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
          {logoUrl ? (
            <>
              <img src={logoUrl} alt="Logo" className="h-full w-full object-cover rounded-2xl" />
              <button
                onClick={handleRemove}
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <Upload className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-2xl">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </div>
        <div className="space-y-1">
          <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="h-3.5 w-3.5" />
            {logoUrl ? "Change Logo" : "Upload Logo"}
          </Button>
          <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </div>
    </div>
  );
}
