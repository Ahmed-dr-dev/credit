import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import { apiGet } from "@/lib/api";
import { DEMANDE_STATUTS, DEMANDE_COLORS, DEMANDE_BG } from "@/lib/statuts";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";

type Demande = {
  id: string;
  statut: string;
  montant: string;
  duree: string;
  type_credit?: { nom: string } | null;
  created_at: string;
};
type RDV = { id: string; statut: string; date_proposee: string | null; motif: string | null };

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [demande, setDemande] = useState<Demande | null>(null);
  const [docsCount, setDocsCount] = useState(0);
  const [prochainRdv, setProchainRdv] = useState<RDV | null>(null);
  const [nouveautesCount, setNouveautesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      const [demandes, rdvs, nouveautes] = await Promise.all([
        apiGet<Demande[]>("/api/demandes"),
        apiGet<RDV[]>("/api/rendez-vous"),
        apiGet<unknown[]>("/api/nouveautes"),
      ]);
      const d = demandes[0] ?? null;
      setDemande(d);
      const upcoming = rdvs.filter((r) => r.statut === "confirme" || r.statut === "demande");
      setProchainRdv(upcoming[0] ?? null);
      setNouveautesCount(nouveautes.length);
      if (d?.id) {
        const docs = await apiGet<unknown[]>(`/api/documents?demandeId=${d.id}`);
        setDocsCount(docs.length);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const step1Done = !!demande;
  const step2Done = docsCount > 0;
  const step3Done = !!prochainRdv;

  const dateRdv = prochainRdv?.date_proposee
    ? new Date(prochainRdv.date_proposee).toLocaleDateString("fr-FR", { dateStyle: "medium" })
    : null;

  const QUICK = [
    { href: "/(client)/demande", label: "Ma demande", emoji: "📋" },
    { href: "/(client)/documents", label: "Documents", emoji: "📁" },
    { href: "/(client)/rendez-vous", label: "Rendez-vous", emoji: "📅" },
    { href: "/(client)/profil", label: "Profil", emoji: "👤" },
  ] as const;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerBg}>
        <Text style={styles.greeting}>Bonjour 👋</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#1d4ed8" />}
      >
        {loading ? (
          <ActivityIndicator color="#1d4ed8" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Progress */}
            <Card style={styles.mb16}>
              <Text style={styles.sectionTitle}>Avancement de votre dossier</Text>
              <View style={styles.steps}>
                {[
                  { done: step1Done, label: "Demande" },
                  { done: step2Done, label: "Documents" },
                  { done: step3Done, label: "Rendez-vous" },
                ].map((s, i) => (
                  <View key={i} style={styles.stepItem}>
                    <View style={[styles.stepCircle, s.done && styles.stepCircleDone]}>
                      <Text style={[styles.stepNum, s.done && styles.stepNumDone]}>
                        {s.done ? "✓" : i + 1}
                      </Text>
                    </View>
                    <Text style={styles.stepLabel}>{s.label}</Text>
                    {i < 2 && <View style={styles.stepLine} />}
                  </View>
                ))}
              </View>
            </Card>

            {/* Demande card */}
            {demande ? (
              <TouchableOpacity onPress={() => router.push("/(client)/demande")}>
                <Card style={styles.mb16}>
                  <View style={styles.demandeTop}>
                    <StatusBadge
                      label={DEMANDE_STATUTS[demande.statut] ?? demande.statut}
                      color={DEMANDE_COLORS[demande.statut] ?? "#64748b"}
                      bg={DEMANDE_BG[demande.statut] ?? "#f1f5f9"}
                    />
                    <Text style={styles.arrow}>›</Text>
                  </View>
                  <Text style={styles.demandeTitle}>
                    {demande.type_credit?.nom ?? "Crédit"} · {demande.montant}
                  </Text>
                  <Text style={styles.demandeSub}>
                    Durée {demande.duree} · {docsCount} document(s)
                  </Text>
                </Card>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => router.push("/(client)/demande")}>
                <Card style={[styles.mb16, styles.emptyCard]}>
                  <Text style={styles.emptyText}>Aucune demande en cours</Text>
                  <Text style={styles.emptyAction}>Déposer une demande →</Text>
                </Card>
              </TouchableOpacity>
            )}

            {/* Stats */}
            <View style={styles.statsGrid}>
              <TouchableOpacity style={styles.statCard} onPress={() => router.push("/(client)/rendez-vous")}>
                <Text style={styles.statEmoji}>📅</Text>
                <Text style={styles.statLabel}>Prochain RDV</Text>
                <Text style={styles.statValue}>{prochainRdv ? (dateRdv ?? "Demandé") : "Aucun"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statCard} onPress={() => router.push("/(client)/profil")}>
                <Text style={styles.statEmoji}>🔔</Text>
                <Text style={styles.statLabel}>Nouveautés</Text>
                <Text style={styles.statValue}>{nouveautesCount > 0 ? nouveautesCount : "—"}</Text>
              </TouchableOpacity>
            </View>

            {/* Quick links */}
            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Accès rapide</Text>
            <View style={styles.quickGrid}>
              {QUICK.map((q) => (
                <TouchableOpacity
                  key={q.href}
                  style={styles.quickCard}
                  onPress={() => router.push(q.href)}
                >
                  <Text style={styles.quickEmoji}>{q.emoji}</Text>
                  <Text style={styles.quickLabel}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  headerBg: {
    backgroundColor: "#1d4ed8",
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
  },
  greeting: { fontSize: 24, fontWeight: "800", color: "#fff" },
  email: { fontSize: 13, color: "#bfdbfe", marginTop: 2 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  mb16: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#475569", marginBottom: 14 },

  steps: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepItem: { alignItems: "center", flex: 1, position: "relative" },
  stepCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#e2e8f0", alignItems: "center", justifyContent: "center",
  },
  stepCircleDone: { backgroundColor: "#1d4ed8" },
  stepNum: { fontSize: 14, fontWeight: "700", color: "#94a3b8" },
  stepNumDone: { color: "#fff" },
  stepLabel: { fontSize: 11, color: "#64748b", marginTop: 6, textAlign: "center" },
  stepLine: {
    position: "absolute", top: 18, left: "60%", right: "-40%",
    height: 2, backgroundColor: "#e2e8f0", zIndex: -1,
  },

  demandeTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  arrow: { fontSize: 22, color: "#94a3b8" },
  demandeTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  demandeSub: { fontSize: 13, color: "#64748b", marginTop: 4 },

  emptyCard: { alignItems: "center", paddingVertical: 28, borderStyle: "dashed", borderWidth: 2, borderColor: "#e2e8f0" },
  emptyText: { fontSize: 14, color: "#94a3b8" },
  emptyAction: { fontSize: 14, color: "#1d4ed8", fontWeight: "600", marginTop: 6 },

  statsGrid: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center",
  },
  statEmoji: { fontSize: 26, marginBottom: 6 },
  statLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "500" },
  statValue: { fontSize: 15, fontWeight: "700", color: "#1e293b", marginTop: 4, textAlign: "center" },

  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quickCard: {
    width: "47%", backgroundColor: "#fff", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#e2e8f0", alignItems: "center",
  },
  quickEmoji: { fontSize: 28, marginBottom: 8 },
  quickLabel: { fontSize: 13, fontWeight: "600", color: "#334155" },
});
