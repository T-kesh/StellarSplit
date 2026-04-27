import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { draftRegistry } from '../services/draftRegistry';
import type { DraftMetadata } from '../types/draft';
import { Button } from '../components/ui/button';
import { Trash2, FileText, Receipt } from 'lucide-react';

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<DraftMetadata[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setDrafts(draftRegistry.list());
  }, []);

  const handleDelete = (key: string) => {
    draftRegistry.delete(key);
    setDrafts(draftRegistry.list());
  };

  const handleResume = (draft: DraftMetadata) => {
    if (draft.type === 'wizard') {
      navigate('/create-split');
    } else if (draft.type === 'receipt') {
      const splitId = draft.key.replace('receipt:', '');
      navigate(`/split/${splitId}`);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Drafts</h1>
      {drafts.length === 0 ? (
        <p className="text-muted-foreground">No drafts saved.</p>
      ) : (
        <div className="grid gap-4">
          {drafts.map((draft) => (
            <div key={draft.key} className="rounded-2xl border border-theme bg-card-theme p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                {draft.type === 'wizard' ? <FileText className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
                <h3 className="text-lg font-semibold">{draft.title || `${draft.type} draft`}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Last updated: {new Date(draft.updatedAt).toLocaleString()}
              </p>
              <div className="flex gap-2">
                <Button onClick={() => handleResume(draft)} variant="default">
                  Resume
                </Button>
                <Button onClick={() => handleDelete(draft.key)} variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}