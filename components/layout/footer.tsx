import { Github } from 'lucide-react';

export function Footer(): React.ReactElement {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
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
      </div>
    </footer>
  );
}
