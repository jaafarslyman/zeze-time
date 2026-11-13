export type BoardItemKind = "photo" | "note";

export type BoardItem = {
  id: string;
  kind: BoardItemKind;
  noteText: string | null;
  photoCaption: string | null;
  photoPath: string | null;
  photoUrl: string | null;
  noteColor: string;
  frameColor: string;
  x: number;
  y: number;
  createdAt: string;
};

export type BoardItemUpdate = Partial<
  Pick<BoardItem, "noteText" | "photoCaption" | "noteColor" | "frameColor" | "x" | "y">
>;

export type CreateNoteInput = {
  noteText: string;
  noteColor: string;
  x: number;
  y: number;
};

export type UploadPhotoInput = {
  file: File;
  photoCaption: string;
  frameColor: string;
  x: number;
  y: number;
};

export const NOTE_COLORS = [
  { value: "#FFE3E7", label: "Petal pink" },
  { value: "#FFF0A8", label: "Butter yellow" },
  { value: "#D8F3DC", label: "Mint" },
  { value: "#D6EAFF", label: "Sky blue" },
  { value: "#E9D5FF", label: "Lavender" },
  { value: "#FFC9A9", label: "Peach" },
] as const;

export const FRAME_COLORS = [
  { value: "#FFFDF8", label: "Warm white" },
  { value: "#F8E7E8", label: "Blush" },
  { value: "#F1E4C8", label: "Sand" },
  { value: "#DBEAFE", label: "Blue" },
  { value: "#E6F4EA", label: "Mint" },
] as const;

export type BoardPageProps = {
  items: BoardItem[];
  isConfigured: boolean;
  configMessage: string;
  isLoading: boolean;
  isBusy: boolean;
  error: string;
  onRetry: () => void;
  onCreateNote: (input: CreateNoteInput) => Promise<boolean>;
  onUploadPhoto: (input: UploadPhotoInput) => Promise<boolean>;
  onUpdateItem: (id: string, update: BoardItemUpdate) => Promise<boolean>;
};
