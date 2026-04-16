import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiGet } from "@/lib/api";
import { RDV_STATUTS } from "@/lib/statuts";
import ScreenHeader from "@/components/ScreenHeader";
import Card from "@/components/Card";

type RDV = {
  id: string;
  statut: string;
  date_proposee: string | null;
  date_contre: string | null;
  motif: string | null;
  created_at: string;
};

const RDV_COLORS: Record<string, string> = {
  demande: "#f59e0b",
  alt_agent: "#3b82f6",
  contre_client: "#8b5cf6",
  confirme: "#22c55e",
  reporte: "#f97316",
  passe: "#94a3b8",
};
const RDV_BG: Record<string, string> = {
  demande: "#fef3c7",
  alt_agent: "#dbeafe",
  contre_client: "#ede9fe",
  confirme: "#dcfce7",
  reporte: "#ffedd5",
  passe: "#f1f5f9",
};

export default function RendezVousScreen() {
  const [rdvs, setRdvs] = useState<RDV[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const list = await apiGet<RDV[]>("/api/rendez-vous");
      setRdvs(list);
    } catch {
      setRdvs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  const upcoming = rdvs.filter((r) => r.statut === "confirme" || r.statut === "demande" || r.statut === "alt_agent" || r.statut === "contre_client");
  const past = rdvs.filter((r) => r.statut === "passe" || r.statut === "reporte");

  function formatDate(d: string | null) {
    if (!d) return "Date à confirmer";
    return new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Rendez-vous" subtitle="Vos créneaux avec votre conseiller" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#1d4ed8" />}
      >
        {loading ? (
          <ActivityIndicator color="#1d4ed8" style={{ marginTop: 40 }} />
        ) : rdvs.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyTitle}>Aucun rendez-vous</Text>
            <Text style={styles.emptyText}>
              Après avoir soumis vos documents, vous pourrez réserver un rendez-vous depuis la plateforme web.
            </Text>
          </Card>
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <Text style={styles.groupTitle}>À venir</Text>
                {upcoming.map((rdv) => <RDVCard key={rdv.id} rdv={rdv} formatDate={formatDate} />)}
              </>
            )}
            {past.length > 0 && (
              <>
                <Text style={styles.groupTitle}>Passés</Text>
                {past.map((rdv) => <RDVCard key={rdv.id} rdv={rdv} formatDate={formatDate} />)}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RDVCard({ rdv, formatDate }: { rdv: RDV; formatDate: (d: string | null) => string }) {
  const color = RDV_COLORS[rdv.statut] ?? "#64748b";
  const bg = RDV_BG[rdv.statut] ?? "#f1f5f9";

  return (
    <Card style={styles.rdvCard}>
      <View style={styles.rdvTop}>
        <View style={[styles.badge, { backgroundColor: bg }]}>
          <Text style={[styles.badgeText, { color }]}>{RDV_STATUTS[rdv.statut] ?? rdv.statut}</Text>
        </View>
        <Text style={styles.rdvDate}>{formatDate(rdv.date_proposee)}</Text>
      </View>
      {rdv.motif && <Text style={styles.rdvMotif}>{rdv.motif}</Text>}
      {rdv.date_contre && (
        <View style={styles.contraRow}>
          <Text style={styles.contraLabel}>Contre-proposition :</Text>
          <Text style={styles.contraDate}>{formatDate(rdv.date_contre)}</Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  groupTitle: { fontSize: 13, fontWeight: "700", color: "#94a3b8", marginBottom: 10, marginTop: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  rdvCard: { marginBottom: 12 },
  rdvTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  rdvDate: { fontSize: 13, color: "#475569", fontWeight: "500" },
  rdvMotif: { fontSize: 14, color: "#334155", fontWeight: "500", marginBottom: 4 },
  contraRow: { flexDirection: "row", gap: 6, marginTop: 8, backgroundColor: "#f8fafc", borderRadius: 8, padding: 8 },
  contraLabel: { fontSize: 12, color: "#94a3b8", fontWeight: "600" },
  contraDate: { fontSize: 12, color: "#475569" },
  emptyCard: { alignItems: "center", padding: 40, marginTop: 24 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#334155", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#94a3b8", textAlign: "center", lineHeight: 20 },
});
