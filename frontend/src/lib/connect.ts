"use client";

import { createClient } from "@connectrpc/connect";
import type { DescService } from "@bufbuild/protobuf";
import { createConnectTransport } from "@connectrpc/connect-web";

import { getFirebaseAuth } from "@/lib/firebase";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081";

const transport = createConnectTransport({
  baseUrl,
  interceptors: [
    (next) => async (request) => {
      // Firebase のログイン中ユーザーがいれば、全 RPC に ID トークンを付与する。
      const auth = getFirebaseAuth();
      const user = auth?.currentUser;
      if (user) {
        const token = await user.getIdToken();
        request.header.set("Authorization", `Bearer ${token}`);
      }

      return next(request);
    },
  ],
});

export function createConnectClient<T extends DescService>(service: T) {
  return createClient(service, transport);
}
