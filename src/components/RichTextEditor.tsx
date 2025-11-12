import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code,
  Quote,
  Link as LinkIcon
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [selectedFormat, setSelectedFormat] = useState<string[]>([]);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateContent();
  };

  const updateContent = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Gestion des raccourcis clavier
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          execCommand('underline');
          break;
      }
    }
  };

  const insertLink = () => {
    const url = prompt('Entrez l\'URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const formatButton = (
    icon: React.ReactNode,
    command: string,
    value?: string,
    tooltip?: string
  ) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => execCommand(command, value)}
      title={tooltip}
      className="h-8 w-8 p-0"
    >
      {icon}
    </Button>
  );

  return (
    <div className="space-y-2">
      {/* Barre d'outils */}
      <Card>
        <CardContent className="p-2">
          <div className="flex flex-wrap items-center gap-1">
            {/* Titres */}
            <div className="flex items-center gap-1">
              {formatButton(<Heading1 className="h-4 w-4" />, 'formatBlock', '<h1>', 'Titre 1')}
              {formatButton(<Heading2 className="h-4 w-4" />, 'formatBlock', '<h2>', 'Titre 2')}
              {formatButton(<Heading3 className="h-4 w-4" />, 'formatBlock', '<h3>', 'Titre 3')}
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Formatage de texte */}
            <div className="flex items-center gap-1">
              {formatButton(<Bold className="h-4 w-4" />, 'bold', undefined, 'Gras (Ctrl+B)')}
              {formatButton(<Italic className="h-4 w-4" />, 'italic', undefined, 'Italique (Ctrl+I)')}
              {formatButton(<Underline className="h-4 w-4" />, 'underline', undefined, 'Souligné (Ctrl+U)')}
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Listes */}
            <div className="flex items-center gap-1">
              {formatButton(<List className="h-4 w-4" />, 'insertUnorderedList', undefined, 'Liste à puces')}
              {formatButton(<ListOrdered className="h-4 w-4" />, 'insertOrderedList', undefined, 'Liste numérotée')}
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Alignement */}
            <div className="flex items-center gap-1">
              {formatButton(<AlignLeft className="h-4 w-4" />, 'justifyLeft', undefined, 'Aligner à gauche')}
              {formatButton(<AlignCenter className="h-4 w-4" />, 'justifyCenter', undefined, 'Centrer')}
              {formatButton(<AlignRight className="h-4 w-4" />, 'justifyRight', undefined, 'Aligner à droite')}
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Autres */}
            <div className="flex items-center gap-1">
              {formatButton(<Quote className="h-4 w-4" />, 'formatBlock', '<blockquote>', 'Citation')}
              {formatButton(<Code className="h-4 w-4" />, 'formatBlock', '<pre>', 'Code')}
              <Button
                variant="ghost"
                size="sm"
                onClick={insertLink}
                title="Insérer un lien"
                className="h-8 w-8 p-0"
              >
                <LinkIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zone d'édition */}
      <Card>
        <CardContent className="p-4">
          <div
            ref={editorRef}
            contentEditable
            onInput={updateContent}
            onKeyDown={handleKeyDown}
            dir="ltr"
            className="min-h-[400px] outline-none prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: content }}
            data-placeholder={placeholder || 'Commencez à écrire...'}
            style={{
              fontSize: '16px',
              lineHeight: '1.6',
              direction: 'ltr',
              textAlign: 'left'
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
