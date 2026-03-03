-- Automatic cleanup of listing favorites when a listing becomes unavailable
-- Triggered by: Deletion (is_invisible = true), Sold Out (status = 'sold'), or Hidden (status = 'hidden')

CREATE OR REPLACE FUNCTION public.cleanup_listing_favorites_on_hide()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the listing has become "hidden" or "unavailable"
  IF (NEW.is_invisible = true AND (OLD.is_invisible = false OR OLD.is_invisible IS NULL)) OR
     (NEW.status IN ('sold', 'hidden') AND OLD.status = 'active') THEN
    
    -- Delete all favorite records for this listing
    DELETE FROM public.listing_favorites 
    WHERE listing_id = NEW.id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to listings table
DROP TRIGGER IF EXISTS on_listing_hidden_cleanup_favorites ON public.listings;
CREATE TRIGGER on_listing_hidden_cleanup_favorites
  AFTER UPDATE OF is_invisible, status ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_listing_favorites_on_hide();
