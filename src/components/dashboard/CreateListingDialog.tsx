import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, Sparkles, Box, Check, ImagePlus, X, ImageIcon } from "lucide-react";
import { useCreateListing, type ListingFormData } from "@/hooks/use-seller-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSupportedGames, useGameTags } from "@/hooks/use-games";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const CreateListingDialog = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const [formData, setFormData] = useState<ListingFormData>({
    title: "",
    description: "",
    game: "",
    category: [],
    price: 0,
    quantity: "",
    image_url: "",
    stock: null,
  });

  const { data: supportedGames, isLoading: loadingGames } = useSupportedGames();
  const { data: gameTags, isLoading: loadingTags } = useGameTags(formData.game);
  const createListing = useCreateListing();

  // CLEANUP: Clean up object URLs when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleCategoryToggle = (tag: string) => {
    setFormData(prev => {
      const category = prev.category.includes(tag)
        ? prev.category.filter(t => t !== tag)
        : [...prev.category, tag];
      return { ...prev, category };
    });
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    // Revoke previous blob if it exists
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setFormData(prev => ({ ...prev, image_url: "" }));
  };

  const handleImageClear = () => {
    setSelectedFile(null);
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl("");
    setFormData(prev => ({ ...prev, image_url: "" }));
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}/${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('listing-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('listing-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.game || formData.category.length === 0) return;
    
    if (formData.stock !== null && formData.stock <= 0) {
      toast({ title: "Validation Error", description: "Stock must be greater than 0", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      let finalImageUrl = formData.image_url;

      if (selectedFile) {
        finalImageUrl = await uploadFile(selectedFile);
      }

      await createListing.mutateAsync({
        ...formData,
        image_url: finalImageUrl
      });

      setOpen(false);
      handleImageClear();
      setFormData({
        title: "",
        description: "",
        game: "",
        category: [],
        price: 0,
        quantity: "",
        image_url: "",
        stock: null,
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const displayUrl = previewUrl || formData.image_url;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) handleImageClear();
      setOpen(val);
    }}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan">
          <Plus className="w-4 h-4 mr-2" />
          Create Listing
        </Button>
      </DialogTrigger>
      <DialogContent className="glass border-border sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            New Listing
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs uppercase tracking-wider text-muted-foreground">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: 500M GTA Cash Package"
              className="bg-background/50 border-border"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Game</Label>
            <Select
              value={formData.game}
              onValueChange={(v) => setFormData({ ...formData, game: v, category: [] })}
              required
            >
              <SelectTrigger className="bg-background/50 border-border">
                <SelectValue placeholder={loadingGames ? "Loading games..." : "Select Game"} />
              </SelectTrigger>
              <SelectContent className="glass border-border">
                {supportedGames?.map((game) => (
                  <SelectItem key={game.name} value={game.name}>{game.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.game && (
            <div className="space-y-3 p-3 rounded-lg border border-border/50 bg-black/20">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                Categories
                <span className="text-[10px] font-normal lowercase opacity-60">(Select one or more)</span>
              </Label>
              {loadingTags ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Fetching categories...
                </div>
              ) : gameTags && gameTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {gameTags.map((tag) => (
                    <div
                      key={tag}
                      onClick={() => handleCategoryToggle(tag)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs cursor-pointer transition-all",
                        formData.category.includes(tag)
                          ? "bg-primary/20 border-primary text-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.1)]"
                          : "bg-background/50 border-border text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      <div className={cn(
                        "w-3 h-3 rounded-sm border flex items-center justify-center transition-colors",
                        formData.category.includes(tag) ? "bg-primary border-primary" : "border-muted-foreground/30"
                      )}>
                        {formData.category.includes(tag) && <Check className="w-2.5 h-2.5 text-primary-foreground stroke-[4px]" />}
                      </div>
                      {tag}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-2 italic">No categories available for this game.</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price" className="text-xs uppercase tracking-wider text-muted-foreground">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={formData.price || ""}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="0.00"
                className="bg-background/50 border-border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-xs uppercase tracking-wider text-muted-foreground">Custom Label</Label>
              <Input
                id="quantity"
                value={formData.quantity}
                maxLength={13}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="Ex: 24/7, Fast"
                className="bg-background/50 border-border"
              />
              <div className="text-[10px] text-right text-muted-foreground px-1">
                {formData.quantity.length}/13
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-primary" />
              <Label htmlFor="stock" className="text-sm font-bold text-foreground">Stock Management</Label>
            </div>
            <div className="space-y-1.5">
              <Input
                id="stock"
                type="number"
                min="1"
                value={formData.stock === null ? "" : formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value === "" ? null : Math.max(1, parseInt(e.target.value)) })}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="Unlimited (Leave empty)"
                className="bg-background/50 border-border h-9 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <p className="text-[10px] text-muted-foreground leading-tight px-1">
                The listing will automatically mark as "Sold" after this many confirmed sales.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Image</Label>
            
            <div className={cn(
              "relative rounded-xl border border-dashed border-border transition-all duration-300 overflow-hidden flex items-center justify-center bg-black/20",
              displayUrl ? "aspect-video" : "h-24"
            )}>
              {displayUrl ? (
                <>
                  <img 
                    src={displayUrl} 
                    alt="Preview" 
                    className="w-full h-full object-cover" 
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={handleImageClear}
                    className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImageIcon className="w-8 h-8 opacity-20" />
                  <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">No Image Selected</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="image"
                  value={formData.image_url}
                  onChange={(e) => {
                    handleImageClear();
                    setFormData({ ...formData, image_url: e.target.value });
                  }}
                  placeholder="Or paste external URL..."
                  className="bg-background/50 border-border pr-10 h-10"
                />
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageSelect}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="shrink-0 border-border bg-background/50 hover:bg-primary/10 hover:text-primary gap-2 h-10"
              >
                <ImagePlus className="w-4 h-4" />
                Select
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs uppercase tracking-wider text-muted-foreground">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your service or item..."
              className="bg-background/50 border-border min-h-[100px]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/30">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createListing.isPending || isUploading || !formData.game || formData.category.length === 0}
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan min-w-[120px]"
            >
              {isUploading || createListing.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isUploading ? "Uploading..." : "Creating..."}
                </>
              ) : (
                "Create Listing"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateListingDialog;
