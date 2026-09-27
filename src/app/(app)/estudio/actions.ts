"use server";

import { revalidatePath } from "next/cache";
import { updatePostStatus } from "@/lib/db";

export async function approvePostAction(id: string) {
  await updatePostStatus(id, "approved");
  revalidatePath("/estudio");
}

export async function discardPostAction(id: string) {
  await updatePostStatus(id, "draft");
  revalidatePath("/estudio");
}
