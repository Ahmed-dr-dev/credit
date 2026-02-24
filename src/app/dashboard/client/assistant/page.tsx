"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientAssistantRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/#assistant");
  }, [router]);
  return null;
}
