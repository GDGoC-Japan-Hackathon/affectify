import { createConnectClient } from "@/lib/connect";
import { create, type MessageInitShape } from "@bufbuild/protobuf";
import { GetMeRequestSchema, SyncMeRequestSchema, UserService } from "@/gen/api/v1/user_pb";

const userClient = createConnectClient(UserService);

export async function getMe() {
  return userClient.getMe(create(GetMeRequestSchema, {} satisfies MessageInitShape<typeof GetMeRequestSchema>));
}

export async function syncMe() {
  return userClient.syncMe(create(SyncMeRequestSchema, {} satisfies MessageInitShape<typeof SyncMeRequestSchema>));
}
