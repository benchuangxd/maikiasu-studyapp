import { Github } from 'lucide-react';

export function Footer(): React.ReactElement {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>VibeCoded by</span>
            <a
              href="https://github.com/benchuangxd"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-medium text-primary hover:underline transition-colors"
            >
              <Github className="h-4 w-4" />
              benchuangxd
            </a>
          </div>
          <a
            href="https://github.com/benchuangxd/maikiasu-studyapp"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Github className="h-3.5 w-3.5" />
            Source
          </a>
        </div>
      </div>
    </footer>
  );
}
