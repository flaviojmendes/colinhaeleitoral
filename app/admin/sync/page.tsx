import { AdminSyncPanel } from "@/components/admin-sync-panel";
import { PageShell } from "@/components/page-shell";
import { isAdminConfigured } from "@/lib/admin-auth";

export const metadata = {
  title: "Sincronizar cache",
  robots: {
    index: false,
    follow: false,
  },
};

interface AdminSyncPageProps {
  searchParams: Promise<{
    ponte?: string;
  }>;
}

export default async function AdminSyncPage({
  searchParams,
}: AdminSyncPageProps) {
  const { ponte } = await searchParams;
  const ponteMode = ponte === "1";

  const panel = (
    <AdminSyncPanel configured={isAdminConfigured()} ponte={ponteMode} />
  );

  if (ponteMode) {
    return (
      <div className="min-h-screen bg-console-deep text-console-ink">{panel}</div>
    );
  }

  return <PageShell backLabel="Voltar ao início">{panel}</PageShell>;
}
