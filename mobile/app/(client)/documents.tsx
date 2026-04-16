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
import { DOCUMENT_STATUTS } from "@/lib/statuts";
import ScreenHeader from "@/components/ScreenHeader";
import Card from "@/components/Card";

type Document = {
  id: string;
  nom: string;
  type: string | null;
  statut: string;
  created_at: string;
};

type Demande = { id: string; montant: string; type_credit?: { nom: string } | null };

const DOC_COLORS: Record<string, string> = {
  en_attente: "#f59e0b",
  valide: "#22c55e",
  refuse: "#ef4444",
};
const DOC_BG: Record<string, string> = {
  en_attente: "#fef3c7",
  valide: "#dcfce7",
  refuse: "#fee2e2",
};

export default function DocumentsScreen() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [demande, setDemande] = useState<Demande | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const demandes = await apiGet<Demande[]>("/api/demandes");
      const d = demandes[0] ?? null;
      setDemande(d);
      if (d?.id) {
        const list = await apiGet<Document[]>(`/api/documents?demandeId=${d.id}`);
        setDocs(list);
      } else {
        setDocs([]);
      }
    } catch {
      setDocs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader
        title="Documents"
        subtitle={demande ? `Dossier : ${demande.type_credit?.nom ?? "Crédit"} · ${demande.montant}` : "Vos justificatifs"}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#1d4ed8" />}
      >
        {loading ? (
          <ActivityIndicator color="#1d4ed8" style={{ marginTop: 40 }} />
        ) : !demande ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📁</Text>
            <Text style={styles.emptyTitle}>Aucune demande active</Text>
            <Text style={styles.emptyText}>Déposez d'abord une demande de crédit pour joindre des documents.</Text>
          </Card>
        ) : docs.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📁</Text>
            <Text style={styles.emptyTitle}>Aucun document</Text>
            <Text style={styles.emptyText}>Ajoutez vos justificatifs depuis la plateforme web pour compléter votre dossier.</Text>
          </Card>
        ) : (
          <>
            <View style={styles.summary}>
              <Text style={styles.summaryText}>{docs.length} document(s) déposé(s)</Text>
              <Text style={styles.summaryValidated}>
                {docs.filter((d) => d.statut === "valide").length} validé(s)
              </Text>
            </View>
            {docs.map((doc) => (
              <Card key={doc.id} style={styles.docCard}>
                <View style={styles.docRow}>
                  <Text style={styles.docEmoji}>📄</Text>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName} numberOfLines={2}>{doc.nom}</Text>
                    {doc.type && <Text style={styles.docType}>{doc.type}</Text>}
                    <Text style={styles.docDate}>
                      Ajouté le {new Date(doc.created_at).toLocaleDateString("fr-FR", { dateStyle: "medium" })}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: DOC_BG[doc.statut] ?? "#f1f5f9" }]}>
                    <Text style={[styles.badgeText, { color: DOC_COLORS[doc.statut] ?? "#64748b" }]}>
                      {DOCUMENT_STATUTS[doc.statut] ?? doc.statut}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  summaryText: { fontSize: 14, color: "#64748b", fontWeight: "500" },
  summaryValidated: { fontSize: 14, color: "#22c55e", fontWeight: "600" },
  docCard: { marginBottom: 12 },
  docRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  docEmoji: { fontSize: 28, marginTop: 2 },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: "600", color: "#1e293b", marginBottom: 2 },
  docType: { fontSize: 12, color: "#94a3b8", marginBottom: 2 },
  docDate: { fontSize: 11, color: "#cbd5e1" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start" },
  badgeText: { fontSize: 11, fontWeight: "600" },
  emptyCard: { alignItems: "center", padding: 40, marginTop: 24 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#334155", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#94a3b8", textAlign: "center", lineHeight: 20 },
});
