/**
 * M29 — News Bulletin Detail Page
 *
 * Bulletin durumunu, secili haberleri, job linkage'ini ve publish
 * baglantisini gosteren tek sayfa.
 */

import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  fetchNewsBulletinById,
  fetchNewsBulletinSelectedItems,
  fetchNewsBulletinScript,
  fetchNewsBulletinMetadata,
} from "../../api/newsBulletinApi";
import { cn } from "../../lib/cn";

export function NewsBulletinDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();

  const { data: bulletin, isLoading } = useQuery({
    queryKey: ["news-bulletin", itemId],
    queryFn: () => fetchNewsBulletinById(itemId!),
    enabled: !!itemId,
  });

  const { data: selectedItems = [] } = useQuery({
    queryKey: ["bulletin-selected", itemId],
    queryFn: () => fetchNewsBulletinSelectedItems(itemId!),
    enabled: !!itemId,
  });

  const { data: script } = useQuery({
    queryKey: ["bulletin-script", itemId],
    queryFn: () => fetchNewsBulletinScript(itemId!),
    enabled: !!itemId,
  });

  const { data: metadata } = useQuery({
    queryKey: ["bulletin-metadata", itemId],
    queryFn: () => fetchNewsBulletinMetadata(itemId!),
    enabled: !!itemId,
  });

  if (isLoading) {
    return <div className="p-4 text-sm text-neutral-400">Yukleniyor...</div>;
  }

  if (!bulletin) {
    return <div className="p-4 text-sm text-red-500">Bulten bulunamadi.</div>;
  }

  return (
    <div className="max-w-[800px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="m-0 text-xl font-semibold text-neutral-800">
            {bulletin.title || bulletin.topic}
          </h2>
          <p className="m-0 text-sm text-neutral-400">
            ID: {bulletin.id.slice(0, 12)}... | Olusturulma: {new Date(bulletin.created_at).toLocaleString("tr")}
          </p>
        </div>
        <StatusBadge status={bulletin.status} />
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <InfoCard label="Durum" value={bulletin.status} />
        <InfoCard label="Dil" value={bulletin.language || "—"} />
        <InfoCard label="Ton" value={bulletin.tone || "—"} />
        <InfoCard label="Secili Haber" value={String(selectedItems.length)} />
      </div>

      {/* Job linkage */}
      {bulletin.job_id && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="m-0 text-sm">
            <span className="font-medium text-blue-700">Job:</span>{" "}
            <Link to={`/admin/jobs/${bulletin.job_id}`} className="text-blue-600 underline">
              {bulletin.job_id.slice(0, 12)}...
            </Link>
          </p>
        </div>
      )}

      {/* Style/direction info */}
      {(bulletin.composition_direction || bulletin.thumbnail_direction || bulletin.style_blueprint_id) && (
        <div className="mb-4 p-3 bg-neutral-50 border border-border-subtle rounded-md space-y-1 text-sm">
          <p className="m-0 font-medium text-neutral-700">Stil Secimleri</p>
          {bulletin.composition_direction && (
            <Row label="Kompozisyon" value={bulletin.composition_direction} />
          )}
          {bulletin.thumbnail_direction && (
            <Row label="Thumbnail" value={bulletin.thumbnail_direction} />
          )}
          {bulletin.style_blueprint_id && (
            <Row label="Stil Blueprint" value={bulletin.style_blueprint_id.slice(0, 12) + "..."} />
          )}
          {bulletin.template_id && (
            <Row label="Sablon" value={bulletin.template_id.slice(0, 12) + "..."} />
          )}
        </div>
      )}

      {/* Selected items */}
      <div className="mb-4">
        <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">
          Secili Haberler ({selectedItems.length})
        </h3>
        {selectedItems.length === 0 ? (
          <p className="text-sm text-neutral-400 italic">Henuz haber secilmemis.</p>
        ) : (
          <div className="space-y-1.5">
            {selectedItems.map((item, idx) => (
              <div
                key={item.id}
                className="p-2 bg-white border border-neutral-200 rounded-md text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-neutral-700">
                    #{idx + 1} — {item.news_item_id.slice(0, 12)}...
                  </span>
                  {item.used_news_warning && (
                    <span className="text-xs text-amber-500">kullanilmis</span>
                  )}
                </div>
                {item.edited_narration && (
                  <p className="m-0 mt-1 text-xs text-neutral-500">
                    <span className="font-medium">Duzenlenmis narration:</span> {item.edited_narration.slice(0, 150)}
                    {item.edited_narration.length > 150 ? "..." : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Script */}
      {script && (
        <div className="mb-4">
          <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Script</h3>
          <div className="p-3 bg-neutral-50 border border-border-subtle rounded-md text-sm text-neutral-700 max-h-[200px] overflow-y-auto whitespace-pre-wrap">
            {script.content.slice(0, 500)}
            {script.content.length > 500 ? "..." : ""}
          </div>
        </div>
      )}

      {/* Metadata */}
      {metadata && (
        <div className="mb-4">
          <h3 className="m-0 mb-2 text-md font-semibold text-neutral-800">Metadata</h3>
          <div className="p-3 bg-neutral-50 border border-border-subtle rounded-md space-y-1 text-sm">
            {metadata.title && <Row label="Baslik" value={metadata.title} />}
            {metadata.description && <Row label="Aciklama" value={metadata.description.slice(0, 200)} />}
            {metadata.category && <Row label="Kategori" value={metadata.category} />}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-neutral-200">
        {bulletin.status === "draft" && (
          <button
            type="button"
            onClick={() => navigate(`/admin/news-bulletins/wizard?bulletinId=${bulletin.id}`)}
            className="px-4 py-1.5 text-sm font-medium text-white bg-brand-500 border-none rounded-sm cursor-pointer hover:bg-brand-600"
          >
            Wizard ile Devam Et
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate("/admin/news-bulletins")}
          className="px-4 py-1.5 text-sm text-neutral-600 bg-transparent border border-border rounded-sm cursor-pointer hover:bg-neutral-50"
        >
          Listeye Don
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-neutral-100 text-neutral-600",
    selection_confirmed: "bg-amber-100 text-amber-700",
    in_progress: "bg-emerald-100 text-emerald-700",
    rendering: "bg-blue-100 text-blue-700",
    done: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", colors[status] || "bg-neutral-100 text-neutral-500")}>
      {status}
    </span>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 bg-neutral-50 border border-border-subtle rounded-md text-center">
      <p className="m-0 text-xs text-neutral-400">{label}</p>
      <p className="m-0 text-sm font-medium text-neutral-700">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex">
      <span className="w-[120px] shrink-0 text-neutral-500">{label}</span>
      <span className="text-neutral-800">{value}</span>
    </div>
  );
}
