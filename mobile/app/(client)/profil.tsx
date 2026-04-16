import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import { apiGet } from "@/lib/api";
import ScreenHeader from "@/components/ScreenHeader";
import Card from "@/components/Card";
import { RECLAMATION_STATUTS } from "@/lib/statuts";

type Profile = {
  id: string;
  email: string;
  nom: string | null;
  prenom: string | null;
  telephone: string | null;
  cin: string | null;
  role: string;
};

type Reclamation = {
  id: string;
  sujet: string;
  statut: string;
  created_at: string;
};

type Nouveaute = {
  id: string;
  titre: string;
  contenu: string;
  created_at: string;
};

const REC_COLORS: Record<string, string> = {
  en_attente: "#f59e0b",
  en_cours: "#3b82f6",
  traitee: "#22c55e",
};
const REC_BG: Record<string, string> = {
  en_attente: "#fef3c7",
  en_cours: "#dbeafe",
  traitee: "#dcfce7",
};

export default function ProfilScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reclamations, setReclamations] = useState<Reclamation[]>([]);
  const [nouveautes, setNouveautes] = useState<Nouveaute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const [prof, recs, news] = await Promise.all([
        apiGet<Profile>("/api/profiles/me"),
        apiGet<Reclamation[]>("/api/reclamations"),
        apiGet<Nouveaute[]>("/api/nouveautes"),
      ]);
      setProfile(prof);
      setReclamations(recs);
      setNouveautes(news);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  function confirmSignOut() {
    Alert.alert("Déconnexion", "Voulez-vous vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Se déconnecter", style: "destructive", onPress: signOut },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title="Mon profil" subtitle={user?.email} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#1d4ed8" />}
      >
        {loading ? (
          <ActivityIndicator color="#1d4ed8" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Profile info */}
            <Card style={styles.mb16}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(profile?.prenom?.[0] ?? profile?.email?.[0] ?? "U").toUpperCase()}
                </Text>
              </View>
              <Text style={styles.fullName}>
                {profile?.prenom && profile?.nom
                  ? `${profile.prenom} ${profile.nom}`
                  : profile?.email ?? user?.email}
              </Text>
              <Text style={styles.roleText}>Client</Text>
              <View style={styles.infoGrid}>
                <InfoRow label="Email" value={profile?.email ?? "—"} />
                {profile?.telephone && <InfoRow label="Téléphone" value={profile.telephone} />}
                {profile?.cin && <InfoRow label="CIN" value={profile.cin} />}
              </View>
            </Card>

            {/* Nouveautés */}
            <Text style={styles.sectionTitle}>🔔 Nouveautés ({nouveautes.length})</Text>
            {nouveautes.length === 0 ? (
              <Card style={[styles.mb16, styles.emptySmall]}>
                <Text style={styles.emptySmallText}>Aucune nouveauté</Text>
              </Card>
            ) : (
              nouveautes.slice(0, 3).map((n) => (
                <Card key={n.id} style={styles.mb12}>
                  <Text style={styles.newsTitle}>{n.titre}</Text>
                  <Text style={styles.newsContent} numberOfLines={2}>{n.contenu}</Text>
                  <Text style={styles.newsDate}>
                    {new Date(n.created_at).toLocaleDateString("fr-FR", { dateStyle: "medium" })}
                  </Text>
                </Card>
              ))
            )}

            {/* Réclamations */}
            <Text style={styles.sectionTitle}>✉️ Réclamations ({reclamations.length})</Text>
            {reclamations.length === 0 ? (
              <Card style={[styles.mb16, styles.emptySmall]}>
                <Text style={styles.emptySmallText}>Aucune réclamation</Text>
              </Card>
            ) : (
              reclamations.map((rec) => (
                <Card key={rec.id} style={styles.mb12}>
                  <View style={styles.recRow}>
                    <Text style={styles.recSujet} numberOfLines={1}>{rec.sujet}</Text>
                    <View style={[styles.badge, { backgroundColor: REC_BG[rec.statut] ?? "#f1f5f9" }]}>
                      <Text style={[styles.badgeText, { color: REC_COLORS[rec.statut] ?? "#64748b" }]}>
                        {RECLAMATION_STATUTS[rec.statut] ?? rec.statut}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.recDate}>
                    {new Date(rec.created_at).toLocaleDateString("fr-FR", { dateStyle: "medium" })}
                  </Text>
                </Card>
              ))
            )}

            {/* Sign out */}
            <TouchableOpacity style={styles.signOutBtn} onPress={confirmSignOut}>
              <Text style={styles.signOutText}>Se déconnecter</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  mb16: { marginBottom: 16 },
  mb12: { marginBottom: 12 },
  avatar: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#1d4ed8", alignItems: "center", justifyContent: "center",
    alignSelf: "center", marginBottom: 12,
  },
  avatarText: { fontSize: 26, fontWeight: "700", color: "#fff" },
  fullName: { fontSize: 18, fontWeight: "700", color: "#1e293b", textAlign: "center" },
  roleText: { fontSize: 13, color: "#94a3b8", textAlign: "center", marginBottom: 16 },
  infoGrid: { borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 12, gap: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  infoLabel: { fontSize: 13, color: "#94a3b8", fontWeight: "500" },
  infoValue: { fontSize: 13, color: "#1e293b", fontWeight: "600", flexShrink: 1, textAlign: "right" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#334155", marginBottom: 10, marginTop: 4 },
  emptySmall: { paddingVertical: 20, alignItems: "center" },
  emptySmallText: { fontSize: 13, color: "#94a3b8" },
  newsTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b", marginBottom: 4 },
  newsContent: { fontSize: 13, color: "#64748b", lineHeight: 18, marginBottom: 6 },
  newsDate: { fontSize: 11, color: "#cbd5e1" },
  recRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  recSujet: { fontSize: 14, fontWeight: "600", color: "#1e293b", flex: 1, marginRight: 8 },
  recDate: { fontSize: 11, color: "#cbd5e1" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  signOutBtn: {
    marginTop: 24,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  signOutText: { color: "#ef4444", fontSize: 15, fontWeight: "700" },
});
