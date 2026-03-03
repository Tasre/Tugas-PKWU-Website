import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLanguage, languageConfig, Language } from "@/contexts/LanguageContext";

const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();
  const currentConfig = languageConfig[language];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary gap-2">
          <Globe className="w-4 h-4" />
          <span className="hidden sm:inline">{currentConfig.flag}</span>
          <span className="hidden md:inline text-xs">{currentConfig.currency.code}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {(Object.keys(languageConfig) as Language[]).map((lang) => {
          const config = languageConfig[lang];
          return (
            <DropdownMenuItem
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`flex items-center justify-between cursor-pointer ${
                language === lang ? "bg-accent" : ""
              }`}
            >
              <span className="flex items-center gap-2">
                <span>{config.flag}</span>
                <span>{config.name}</span>
              </span>
              <span className="text-xs text-muted-foreground">{config.currency.code}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
