import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Tag, Gamepad2, Save, Loader2, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  useSupportedGames, 
  useAddGame, 
  useDeleteGame, 
  useAddGameTag, 
  useDeleteGameTag,
  useUpdateGameImage, 
} from "@/hooks/use-staff";

const GameManagement = () => {
  const { data: games, isLoading } = useSupportedGames();
  const addGame = useAddGame();
  const deleteGame = useDeleteGame();
  const addTag = useAddGameTag();
  const deleteTag = useDeleteGameTag();
  const updateGameImage = useUpdateGameImage();
  const { toast } = useToast();
  
  const [newGame, setNewGame] = useState("");
  const [newTags, setNewTags] = useState<Record<string, string>>({});
  const [gameImageUrls, setGameImageUrls] = useState<Record<string, string>>({});
  
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  
  const [isSavingImage, setIsSavingImage] = useState<Record<string, boolean>>({});
  
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // CLEANUP: Revoke all object URLs when component unmounts
  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  // Initialize gameImageUrls when games data loads
  useEffect(() => {
    if (games) {
      const initialUrls: Record<string, string> = {};
      games.forEach(game => {
        initialUrls[game.id] = game.image_url || "";
      });
      setGameImageUrls(initialUrls);
    }
  }, [games]);

  const handleAddGame = () => {
    if (!newGame.trim()) return;
    addGame.mutate(newGame.trim(), { onSuccess: () => setNewGame("") });
  };

  const handleAddTag = (gameId: string) => {
    const tag = newTags[gameId]?.trim();
    if (!tag) return;
    addTag.mutate({ gameId, tagName: tag }, {
      onSuccess: () => setNewTags((prev) => ({ ...prev, [gameId]: "" })),
    });
  };

  const deleteFromStorage = async (url: string) => {
    if (!url || !url.includes('/game-images/')) return;
    try {
      const path = url.split('/game-images/')[1];
      if (path) {
        await supabase.storage.from('game-images').remove([path]);
      }
    } catch (error) {
      console.error("Error deleting old image:", error);
    }
  };

  const handleImageSelect = (gameId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    // Revoke previous preview if it exists for this specific game
    if (previewUrls[gameId] && previewUrls[gameId].startsWith('blob:')) {
      URL.revokeObjectURL(previewUrls[gameId]);
    }

    setSelectedFiles(prev => ({ ...prev, [gameId]: file }));
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrls(prev => ({ ...prev, [gameId]: objectUrl }));
    setGameImageUrls(prev => ({ ...prev, [gameId]: "" }));
  };

  const handleSaveGameImage = async (gameId: string) => {
    setIsSavingImage(prev => ({ ...prev, [gameId]: true }));
    try {
      const game = games?.find(g => g.id === gameId);
      let finalUrl = gameImageUrls[gameId] || null;

      if (selectedFiles[gameId]) {
        if (game?.image_url) {
          await deleteFromStorage(game.image_url);
        }

        const file = selectedFiles[gameId];
        const fileExt = file.name.split('.').pop();
        const fileName = `${gameId}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('game-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('game-images')
          .getPublicUrl(filePath);
        
        finalUrl = publicUrl;
      } else if (!finalUrl && game?.image_url) {
        await deleteFromStorage(game.image_url);
      }

      updateGameImage.mutate(
        { gameId, imageUrl: finalUrl },
        {
          onSuccess: () => {
            setSelectedFiles(prev => {
              const newState = { ...prev };
              delete newState[gameId];
              return newState;
            });
            setPreviewUrls(prev => {
              if (prev[gameId] && prev[gameId].startsWith('blob:')) {
                URL.revokeObjectURL(prev[gameId]);
              }
              const newState = { ...prev };
              delete newState[gameId];
              return newState;
            });
            toast({ title: "Game updated" });
          },
          onSettled: () => setIsSavingImage(prev => ({ ...prev, [gameId]: false })),
        }
      );
    } catch (error: any) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      setIsSavingImage(prev => ({ ...prev, [gameId]: false }));
    }
  };

  const handleClearImage = (gameId: string) => {
    setSelectedFiles(prev => {
      const newState = { ...prev };
      delete newState[gameId];
      return newState;
    });
    setPreviewUrls(prev => {
      if (prev[gameId] && prev[gameId].startsWith('blob:')) {
        URL.revokeObjectURL(prev[gameId]);
      }
      const newState = { ...prev };
      delete newState[gameId];
      return newState;
    });
    setGameImageUrls(prev => ({ ...prev, [gameId]: "" }));
  };

  if (isLoading) return <div className="text-muted-foreground text-sm">Loading games...</div>;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Input
          placeholder="New game name..."
          value={newGame}
          onChange={(e) => setNewGame(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddGame()}
          className="bg-card/50 border-border"
        />
        <Button onClick={handleAddGame} disabled={addGame.isPending} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
          <Plus className="w-4 h-4 mr-1" /> Add Game
        </Button>
      </div>

      <div className="space-y-4">
        {games?.map((game: any) => {
          const displayUrl = previewUrls[game.id] || gameImageUrls[game.id] || "";
          
          return (
            <div key={game.id} className="glass rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {game.image_url ? (
                    <img src={game.image_url} alt={game.name} className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <Gamepad2 className="w-4 h-4 text-primary" />
                  )}
                  <span className="font-display font-semibold text-foreground">{game.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteGame.mutate(game.id)}
                  className="text-destructive hover:text-destructive h-8 w-8"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Image URL / Upload</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={gameImageUrls[game.id] || ""}
                      onChange={(e) => {
                        handleClearImage(game.id);
                        setGameImageUrls((prev) => ({ ...prev, [game.id]: e.target.value }));
                      }}
                      placeholder="Enter image URL"
                      className="bg-card/50 border-border h-9 text-sm pr-10"
                    />
                    {displayUrl && (
                      <button 
                        onClick={() => handleClearImage(game.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={el => fileInputRefs.current[game.id] = el}
                    onChange={(e) => handleImageSelect(game.id, e)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRefs.current[game.id]?.click()}
                    className="shrink-0 h-9"
                    title="Select Image"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSaveGameImage(game.id)}
                    disabled={isSavingImage[game.id] || (gameImageUrls[game.id] === game.image_url && !selectedFiles[game.id])}
                    className="shrink-0 h-9"
                  >
                    {isSavingImage[game.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </Button>
                </div>
                {selectedFiles[game.id] && (
                  <p className="text-[9px] text-primary animate-pulse font-bold ml-1 uppercase">Pending Apply...</p>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {game.game_tags?.map((tag: any) => (
                  <Badge key={tag.id} variant="secondary" className="text-xs flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {tag.tag_name}
                    <button
                      onClick={() => deleteTag.mutate(tag.id)}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add tag..."
                  value={newTags[game.id] || ""}
                  onChange={(e) => setNewTags((prev) => ({ ...prev, [game.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag(game.id)}
                  className="bg-card/50 border-border h-8 text-sm"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddTag(game.id)}
                  className="shrink-0 h-8"
                >
                  <Plus className="w-3 h-3 mr-1" /> Tag
                </Button>
              </div>
            </div>
          );
        })}

        {!games?.length && (
          <div className="text-center py-10 text-muted-foreground">
            <Gamepad2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No games added yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameManagement;
