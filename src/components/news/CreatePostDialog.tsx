import { useState, useRef, useEffect } from "react";
import { 
  Plus, ImagePlus, X, LinkIcon, AlertTriangle, 
  CheckCircle, Loader2, Layout, Settings2, Eye, 
  ChevronRight, Save, Globe, Type, Image as ImageIcon,
  BookOpen, GripVertical, Trash2, Link as LucideLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useCreatePost, useUploadPostImage } from "@/hooks/use-news";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Reorder, useDragControls } from "framer-motion";

type BlockType = 'text' | 'image';

interface ContentBlock {
  id: string;
  type: BlockType;
  value: string;
}

const CreatePostDialog = () => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [game, setGame] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  
  // Advanced Block Content
  const [blocks, setBlocks] = useState<ContentBlock[]>([
    { id: 'initial-text', type: 'text', value: '' }
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inlineImageRef = useRef<HTMLInputElement>(null);
  const createPost = useCreatePost();
  const uploadImage = useUploadPostImage();

  // CLEANUP
  useEffect(() => {
    return () => {
      if (coverImage?.startsWith('blob:')) URL.revokeObjectURL(coverImage);
    };
  }, [coverImage]);

  const { data: games } = useQuery({
    queryKey: ["supported_games"],
    queryFn: async () => {
      const { data } = await supabase.from("supported_games").select("name").order("name");
      return data || [];
    },
  });

  const addBlock = (type: BlockType) => {
    const newBlock: ContentBlock = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      value: ''
    };
    setBlocks(prev => [...prev, newBlock]);
  };

  const updateBlock = (id: string, value: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, value } : b));
  };

  const removeBlock = (id: string) => {
    if (blocks.length === 1 && blocks[0].type === 'text') {
      updateBlock(id, '');
      return;
    }
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (coverImage?.startsWith('blob:')) URL.revokeObjectURL(coverImage);
    setCoverFile(file);
    setCoverImage(URL.createObjectURL(file));
  };

  const handleInlineImageSelect = async (e: React.ChangeEvent<HTMLInputElement>, blockId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    toast.loading("Uploading image...", { id: "upload" });
    try {
      const url = await uploadImage.mutateAsync(file);
      updateBlock(blockId, url);
      toast.success("Image uploaded", { id: "upload" });
    } catch {
      toast.error("Upload failed", { id: "upload" });
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !game || blocks.every(b => !b.value.trim())) {
      toast.error("Title, Game, and Content are required");
      return;
    }

    let finalCoverUrl = "";
    if (coverFile) {
      try {
        finalCoverUrl = await uploadImage.mutateAsync(coverFile);
      } catch {
        toast.error("Cover upload failed");
        return;
      }
    }

    // Serialize blocks to JSON string for the DB 'content' column
    const serializedContent = JSON.stringify(blocks);

    createPost.mutate(
      { title, content: serializedContent, game, image_url: finalCoverUrl },
      {
        onSuccess: () => {
          toast.success("Blog post published!");
          setTitle("");
          setGame("");
          setBlocks([{ id: 'initial-text', type: 'text', value: '' }]);
          setCoverImage(null);
          setCoverFile(null);
          setOpen(false);
        },
        onError: (e: any) => toast.error("Failed to publish: " + e.message),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="glow-cyan font-display group">
          <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
          Write Post
        </Button>
      </DialogTrigger>
      <DialogContent className="glass border-border sm:max-w-[95vw] md:max-w-[85vw] lg:max-w-[1200px] h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Editor Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-background/50 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Type className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-sm font-bold text-foreground font-display tracking-tight">Block Editor</h2>
          </div>
          
          <div className="flex items-center gap-3">
            <Button onClick={handleSubmit} disabled={createPost.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan h-9 px-6 font-bold text-xs uppercase tracking-widest">
              {createPost.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
              Publish
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Writing Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/5">
            <div className="max-w-[800px] mx-auto py-12 px-8 space-y-8">
              
              {/* Cover Image */}
              <div className={cn("relative w-full rounded-2xl border-2 border-dashed border-border/30 overflow-hidden bg-card/20 transition-all", coverImage ? "aspect-[21/9]" : "h-40")}>
                {coverImage ? (
                  <>
                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                    <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={() => setCoverImage(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                    <ImagePlus className="w-8 h-8 opacity-20" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Set Cover Image</span>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleCoverSelect} className="hidden" />
              </div>

              {/* Title */}
              <input
                type="text"
                placeholder="Story Title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent border-none text-4xl md:text-5xl font-display font-black text-foreground placeholder:text-muted-foreground/10 focus:outline-none focus:ring-0 px-0"
              />

              {/* Blocks */}
              <Reorder.Group axis="y" values={blocks} onReorder={setBlocks} className="space-y-4">
                {blocks.map((block) => (
                  <Reorder.Item 
                    key={block.id} 
                    value={block}
                    className="relative group bg-card/10 rounded-xl border border-transparent hover:border-border/30 transition-all p-2"
                  >
                    <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-5 h-5 text-muted-foreground" />
                    </div>

                    {block.type === 'text' ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          placeholder="Tell your story..."
                          value={block.value}
                          onChange={(e) => updateBlock(block.id, e.target.value)}
                          className="w-full bg-transparent border-none text-lg leading-relaxed text-foreground placeholder:text-muted-foreground/20 focus:outline-none focus:ring-0 min-h-[100px] resize-none px-2 font-serif"
                        />
                      </div>
                    ) : (
                      <div className="space-y-3 p-4">
                        <div className={cn("relative rounded-xl border border-dashed border-border/50 overflow-hidden bg-black/20", block.value ? "aspect-video" : "h-32")}>
                          {block.value ? (
                            <img src={block.value} alt="Inline" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                              <div className="flex gap-2">
                                <Button variant="secondary" size="sm" onClick={() => inlineImageRef.current?.click()} className="text-[10px] uppercase font-bold tracking-widest">
                                  <ImageIcon className="w-3 h-3 mr-2" /> Upload
                                </Button>
                                <div className="w-[1px] h-8 bg-border/50" />
                                <Input 
                                  placeholder="Paste image URL..." 
                                  className="h-8 bg-black/20 text-[10px] w-48 border-border/50"
                                  onBlur={(e) => updateBlock(block.id, e.target.value)}
                                />
                              </div>
                            </div>
                          )}
                          <input 
                            type="file" 
                            ref={inlineImageRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={(e) => handleInlineImageSelect(e, block.id)} 
                          />
                        </div>
                      </div>
                    )}

                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 hover:text-destructive transition-all h-8 w-8"
                      onClick={() => removeBlock(block.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              {/* Block Controls */}
              <div className="flex justify-center gap-4 pt-8 border-t border-border/20">
                <Button variant="outline" size="sm" onClick={() => addBlock('text')} className="border-border hover:bg-primary/5 gap-2 text-[10px] uppercase font-bold tracking-widest">
                  <Plus className="w-3 h-3" /> Add Text
                </Button>
                <Button variant="outline" size="sm" onClick={() => addBlock('image')} className="border-border hover:bg-primary/5 gap-2 text-[10px] uppercase font-bold tracking-widest">
                  <ImagePlus className="w-3 h-3" /> Add Image
                </Button>
              </div>
            </div>
          </div>

          {/* Right Settings */}
          <div className="w-[300px] border-l border-border/50 bg-background/30 p-6 hidden xl:block space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-foreground font-display font-bold text-xs uppercase tracking-wider">
                <Settings2 className="w-4 h-4 text-primary" />
                Settings
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Target Game</label>
                <Select value={game} onValueChange={setGame}>
                  <SelectTrigger className="bg-card/50 border-border h-10 text-xs">
                    <SelectValue placeholder="Select Game" />
                  </SelectTrigger>
                  <SelectContent className="glass border-border">
                    {games?.map((g: any) => (
                      <SelectItem key={g.name} value={g.name} className="text-xs">{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                Drag the handles on the left of any block to reorder your story layout. Use images to break up large walls of text.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostDialog;
