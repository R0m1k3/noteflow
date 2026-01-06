import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Rss, RefreshCw, Plus, ExternalLink } from "lucide-react";
import { RssArticle } from "@/services/RssService";

interface RssSectionProps {
    rssArticles: RssArticle[];
    paginatedRssArticles: RssArticle[];
    rssPage: number;
    totalRssPages: number;
    onRefresh: () => void;
    onAddFeed: () => void;
    onPageChange: (page: number) => void;
}

export const RssSection = ({
    paginatedRssArticles,
    rssPage,
    totalRssPages,
    onRefresh,
    onAddFeed,
    onPageChange
}: RssSectionProps) => {
    return (
        <Card className="shadow-lg">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-xl flex items-center gap-2 flex-shrink-0">
                        <Rss className="h-5 w-5" />
                        Flux RSS
                    </CardTitle>
                    <div className="flex gap-1.5 flex-shrink-0">
                        <Button size="sm" variant="outline" onClick={onRefresh}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={onAddFeed}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 max-h-[calc(100vh-500px)] overflow-y-auto">
                    {paginatedRssArticles.length > 0 ? (
                        paginatedRssArticles.map(article => (
                            <div
                                key={article.id}
                                className="p-2.5 border rounded hover:bg-accent/50 transition-colors cursor-pointer"
                                onClick={() => article.link && window.open(article.link, '_blank')}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-sm line-clamp-2 mb-1">{article.title}</h4>
                                        {article.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {article.description.replace(/<[^>]*>/g, '')}
                                            </p>
                                        )}
                                    </div>
                                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground text-sm py-6">
                            Aucun article
                            <br />
                            <Button
                                variant="link"
                                className="mt-2 text-xs"
                                onClick={onAddFeed}
                            >
                                Ajouter un flux RSS
                            </Button>
                        </p>
                    )}
                </div>
                {totalRssPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onPageChange(Math.max(0, rssPage - 1))}
                            disabled={rssPage === 0}
                        >
                            ‹
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            {rssPage + 1}/{totalRssPages}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onPageChange(Math.min(totalRssPages - 1, rssPage + 1))}
                            disabled={rssPage >= totalRssPages - 1}
                        >
                            ›
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default RssSection;
