import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiGet } from "@/lib/api";
import { DEMANDE_STATUTS, DEMANDE_COLORS, DEMANDE_BG } from "@/lib/statuts";
import ScreenHeader from "@/components/ScreenHeader";
import Card from "@/components/Card";
import StatusBadge from "@/components/StatusBadge";

type Demande = {
  id: string;
  statut: string;
  montant: string;
  duree: string;
  objet: string | null;
  type_credit?: { nom: string } | null;
  created_at: string;
  updated_at: string;
};

export default function DemandeScreen() {
  const [demande, setDemande] = useState<Demande | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const list = await apiGet<Demande[]>("/api/demandes");
      setDemande(list[0] ?? null);
    } catch {
      setDemande(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Ma demande de crédit" subtitle="Suivez le statut de votre dossier" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#1d4ed8" />}
      >
        {loading ? (
          <ActivityIndicator color="#1d4ed8" style={{ marginTop: 40 }} />
        ) : demande ? (
          <>
            <Card style={styles.mb16}>
              <StatusBadge
                label={DEMANDE_STATUTS[demande.statut] ?? demande.statut}
                color={DEMANDE_COLORS[demande.statut] ?? "#64748b"}
                bg={DEMANDE_BG[demande.statut] ?? "#f1f5f9"}
              />
              <Text style={styles.creditType}>
                {demande.type_credit?.nom ?? "Crédit"}
              </Text>
              <View style={styles.row}>
                <InfoItem label="Montant" value={demande.montant} />
                <InfoItem label="Durée" value={demande.duree} />
              </View>
              {demande.objet && (
                <View style={styles.objectif}>
                  <Text style={styles.objLabel}>Objet</Text>
                  <Text style={styles.objValue}>{demande.objet}</Text>
                </View>
              )}
              <View style={styles.dates}>
                <Text style={styles.dateText}>
                  Déposée le {new Date(demande.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
                </Text>
                <Text style={styles.dateText}>
                  Mise à jour le {new Date(demande.updated_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
                </Text>
              </View>
            </Card>

            <Card style={styles.mb16}>
              <Text style={styles.sectionTitle}>Étapes du traitement</Text>
              {[
                { label: "Demande reçue", done: true },
                { label: "Étude en cours", done: ["en_cours_etude", "en_attente_infos", "validee", "refusee"].includes(demande.statut) },
                { label: "Décision finale", done: demande.statut === "validee" || demande.statut === "refusee" },
              ].map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={[styles.dot, step.done && styles.dotDone]} />
                  <Text style={[styles.stepLabel, step.done && styles.stepLabelDone]}>{step.label}</Text>
                </View>
              ))}
            </Card>

            {demande.statut === "en_attente_infos" && (
              <Card style={[styles.mb16, styles.warningCard]}>
                <Text style={styles.warningTitle}>⚠️ Information requise</Text>
                <Text style={styles.warningText}>
                  Votre conseiller attend des informations complémentaires. Veuillez vérifier vos documents ou le prendre en contact.
                </Text>
              </Card>
            )}
          </>
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>Aucune demande en cours</Text>
            <Text style={styles.emptyText}>
              Pour déposer une demande, connectez-vous sur la plateforme web.
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  mb16: { marginBottom: 16 },
  creditType: { fontSize: 20, fontWeight: "700", color: "#1e293b", marginTop: 12, marginBottom: 16 },
  row: { flexDirection: "row", gap: 16, marginBottom: 12 },
  infoItem: { flex: 1, backgroundColor: "#f1f5f9", borderRadius: 12, padding: 12 },
  infoLabel: { fontSize: 11, color: "#94a3b8", fontWeight: "600", marginBottom: 4 },
  infoValue: { fontSize: 16, fontWeight: "700", color: "#1e293b" },
  objectif: { marginBottom: 12 },
  objLabel: { fontSize: 12, fontWeight: "600", color: "#94a3b8", marginBottom: 4 },
  objValue: { fontSize: 14, color: "#334155" },
  dates: { borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 12, gap: 4 },
  dateText: { fontSize: 12, color: "#94a3b8" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#475569", marginBottom: 14 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#e2e8f0" },
  dotDone: { backgroundColor: "#1d4ed8" },
  stepLabel: { fontSize: 14, color: "#94a3b8" },
  stepLabelDone: { color: "#1e293b", fontWeight: "600" },
  warningCard: { borderColor: "#fbbf24", borderWidth: 1, backgroundColor: "#fffbeb" },
  warningTitle: { fontSize: 14, fontWeight: "700", color: "#92400e", marginBottom: 6 },
  warningText: { fontSize: 13, color: "#92400e", lineHeight: 20 },
  emptyCard: { alignItems: "center", padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#334155", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#94a3b8", textAlign: "center", lineHeight: 20 },
});
