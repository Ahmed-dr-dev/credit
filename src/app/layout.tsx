import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import FloatingAssistant from "@/components/FloatingAssistant";

export const metadata: Metadata = {
  title: "Gestion des Demandes de Crédit",
  description: "Plateforme de gestion des demandes et suivi des crédits bancaires",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          {children}
          <FloatingAssistant />
        </AuthProvider>
      </body>
    </html>
  );
}
