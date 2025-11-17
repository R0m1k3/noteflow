import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MobileFAB } from "@/components/mobile/MobileFAB";
import { MobileCard } from "@/components/mobile/MobileCard";
import { Plus, RefreshCw, ExternalLink, Rss as RssIcon } from "lucide-react";
import RssService, { RssArticle } from "@/services/RssService";
import { showError, showSuccess } from "@/utils/toast";

const ARTICLES_PER_PAGE = 10;

export default function RssPage() {
  const [articles, setArticles] = useState<RssArticle[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [addFeedModal, setAddFeedModal] = useState(false);
  const [feedUrl, setFeedUrl] = useState("");
  const [feedTitle, setFeedTitle] = useState("");

  const loadArticles = async () => {
    try {
      const data = await RssService.getArticles(100);
      setArticles(data);
    } catch (error) {
      showError("Erreur lors du chargement des articles");
    }
  };

  useEffect(() => {
    loadArticles();
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await RssService.refreshFeeds();
      await loadArticles();
      showSuccess("Flux RSS actualisés");
    } catch (error) {
      showError("Erreur lors de l'actualisation");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeed = async () => {
    if (!feedUrl.trim()) {
      showError("L'URL est requise");
      return;
    }
    try {
      await RssService.addFeed(feedUrl, feedTitle || "Nouveau flux");
      showSuccess("Flux RSS ajouté");
      setFeedUrl("");
      setFeedTitle("");
      setAddFeedModal(false);
      await handleRefresh();
    } catch (error) {
      showError("Erreur lors de l'ajout du flux");
    }
  };

  const totalPages = Math.ceil(articles.length / ARTICLES_PER_PAGE);
  const paginatedArticles = articles.slice(page * ARTICLES_PER_PAGE, (page + 1) * ARTICLES_PER_PAGE);

  return (
    <div className="p-4 pb-24">
      {/* Header Actions */}
      <div className="flex justify-end mb-4">
        <Button
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Articles List */}
      <div className="space-y-3">
        {paginatedArticles.length > 0 ? (
          paginatedArticles.map(article => (
            <MobileCard
              key={article.id}
              onClick={() => article.link && window.open(article.link, '_blank')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium mb-2 line-clamp-2">{article.title}</h4>
                  {article.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {article.description.replace(/<[^>]*>/g, '')}
                    </p>
                  )}
                  {article.pub_date && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(article.pub_date).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                  )}
                </div>
                <ExternalLink className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
            </MobileCard>
          ))
        ) : (
          <div className="text-center text-muted-foreground py-16">
            <RssIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="mb-4">Aucun article</p>
            <Button onClick={() => setAddFeedModal(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Ajouter un flux RSS
            </Button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            ‹ Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
          >
            Suivant ›
          </Button>
        </div>
      )}

      {/* FAB */}
      <MobileFAB icon={Plus} onClick={() => setAddFeedModal(true)} label="Ajouter un flux RSS" />

      {/* Add Feed Modal */}
      <Dialog open={addFeedModal} onOpenChange={setAddFeedModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un flux RSS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="feed-url">URL du flux *</Label>
              <Input
                id="feed-url"
                placeholder="https://example.com/feed.xml"
                value={feedUrl}
                onChange={(e) => setFeedUrl(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="feed-title">Titre (optionnel)</Label>
              <Input
                id="feed-title"
                placeholder="Nom du flux"
                value={feedTitle}
                onChange={(e) => setFeedTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFeedModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddFeed}>Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
