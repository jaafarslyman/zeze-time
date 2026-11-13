import { useCallback, useEffect, useState } from "react";
import BoardPage from "@/pages/BoardPage";
import { supabase, supabaseConfigurationIssue, supabaseConfigured } from "@/lib/supabase";
import type {
  BoardItem,
  BoardItemUpdate,
  BoardPageProps,
  CreateNoteInput,
  UploadPhotoInput,
} from "@/lib/board-types";

const BOARD_TABLE = "board_items";
const BOARD_BUCKET = "zeze-board-photos";
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type BoardRow = {
  id: string;
  kind: "photo" | "note";
  note_text: string | null;
  photo_caption: string | null;
  photo_path: string | null;
  note_color: string;
  frame_color: string;
  position_x: number;
  position_y: number;
  created_at: string;
};

function toBoardItem(row: BoardRow, client: NonNullable<typeof supabase>): BoardItem {
  const photoUrl = row.photo_path
    ? client.storage.from(BOARD_BUCKET).getPublicUrl(row.photo_path).data.publicUrl
    : null;

  return {
    id: row.id,
    kind: row.kind,
    noteText: row.note_text,
    photoCaption: row.photo_caption,
    photoPath: row.photo_path,
    photoUrl,
    noteColor: row.note_color,
    frameColor: row.frame_color,
    x: Number(row.position_x),
    y: Number(row.position_y),
    createdAt: row.created_at,
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export default function BoardPageContainer() {
  const [items, setItems] = useState<BoardItem[]>([]);
  const [isLoading, setIsLoading] = useState(supabaseConfigured);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const [reloadCount, setReloadCount] = useState(0);

  const loadItems = useCallback(async (showLoading = true) => {
    const client = supabase;
    if (!client) {
      setIsLoading(false);
      return;
    }

    if (showLoading) setIsLoading(true);
    const { data, error: loadError } = await client
      .from(BOARD_TABLE)
      .select("*")
      .order("created_at", { ascending: true });

    if (loadError) {
      setError(loadError.message);
      if (showLoading) setIsLoading(false);
      return;
    }

    setItems(((data ?? []) as unknown as BoardRow[]).map((row) => toBoardItem(row, client)));
    setError("");
    if (showLoading) setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems, reloadCount]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const channel = client
      .channel("zeze-board-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: BOARD_TABLE },
        () => void loadItems(false),
      )
      .subscribe();

    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadItems(false);
    }, 15_000);

    return () => {
      window.clearInterval(poll);
      void client.removeChannel(channel);
    };
  }, [loadItems]);

  const withBusy = useCallback(async (action: () => Promise<boolean>) => {
    setIsBusy(true);
    setError("");
    try {
      return await action();
    } catch (actionError) {
      setError(errorMessage(actionError));
      return false;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const createNote = useCallback(
    (input: CreateNoteInput) =>
      withBusy(async () => {
        const client = supabase;
        if (!client) return false;
        const noteText = input.noteText.trim();
        if (!noteText || noteText.length > 500) {
          setError("Notes must be between 1 and 500 characters.");
          return false;
        }

        const { data, error: insertError } = await client
          .from(BOARD_TABLE)
          .insert({
            kind: "note",
            note_text: noteText,
            photo_caption: null,
            photo_path: null,
            note_color: input.noteColor,
            frame_color: "#FFFDF8",
            position_x: input.x,
            position_y: input.y,
          })
          .select("*")
          .single();

        if (insertError) {
          setError(insertError.message);
          return false;
        }

        setItems((current) => [...current, toBoardItem(data as unknown as BoardRow, client)]);
        return true;
      }),
    [withBusy],
  );

  const uploadPhoto = useCallback(
    (input: UploadPhotoInput) =>
      withBusy(async () => {
        const client = supabase;
        if (!client) return false;
        if (!ALLOWED_IMAGE_TYPES.has(input.file.type)) {
          setError("Choose a JPEG, PNG, or WebP image.");
          return false;
        }
        if (input.file.size > MAX_PHOTO_BYTES) {
          setError("Photos must be 10 MB or smaller.");
          return false;
        }

        const extension =
          input.file.type === "image/jpeg"
            ? "jpg"
            : input.file.type === "image/png"
              ? "png"
              : "webp";
        const photoPath = `${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await client.storage
          .from(BOARD_BUCKET)
          .upload(photoPath, input.file, {
            cacheControl: "3600",
            contentType: input.file.type,
            upsert: false,
          });

        if (uploadError) {
          setError(uploadError.message);
          return false;
        }

        const { data, error: insertError } = await client
          .from(BOARD_TABLE)
          .insert({
            kind: "photo",
            note_text: null,
            photo_caption: input.photoCaption.trim(),
            photo_path: photoPath,
            note_color: "#FFE3E7",
            frame_color: input.frameColor,
            position_x: input.x,
            position_y: input.y,
          })
          .select("*")
          .single();

        if (insertError) {
          await client.storage.from(BOARD_BUCKET).remove([photoPath]);
          setError(insertError.message);
          return false;
        }

        setItems((current) => [...current, toBoardItem(data as unknown as BoardRow, client)]);
        return true;
      }),
    [withBusy],
  );

  const updateItem = useCallback(
    (id: string, update: BoardItemUpdate) =>
      withBusy(async () => {
        const client = supabase;
        if (!client) return false;

        const patch: Record<string, string | number | null> = {};
        if ("noteText" in update) patch.note_text = update.noteText ?? null;
        if ("photoCaption" in update) patch.photo_caption = update.photoCaption ?? null;
        if ("noteColor" in update) patch.note_color = update.noteColor ?? "";
        if ("frameColor" in update) patch.frame_color = update.frameColor ?? "";
        if ("x" in update) patch.position_x = update.x ?? 0.5;
        if ("y" in update) patch.position_y = update.y ?? 0.5;

        if (Object.keys(patch).length === 0) return true;
        const { error: updateError } = await client
          .from(BOARD_TABLE)
          .update(patch)
          .eq("id", id);

        if (updateError) {
          setError(updateError.message);
          return false;
        }

        setItems((current) =>
          current.map((item) => (item.id === id ? { ...item, ...update } : item)),
        );
        return true;
      }),
    [withBusy],
  );

  const props: BoardPageProps = {
    items,
    isConfigured: supabaseConfigured,
    configMessage: supabaseConfigurationIssue ?? "",
    isLoading,
    isBusy,
    error,
    onRetry: () => setReloadCount((count) => count + 1),
    onCreateNote: createNote,
    onUploadPhoto: uploadPhoto,
    onUpdateItem: updateItem,
  };

  return <BoardPage {...props} />;
}
