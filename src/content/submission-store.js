export const PENDING_YOUTH_STORAGE_KEY = "xa-me-linh-pending-youth-members-v1";

export function getPendingSubmissions() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PENDING_YOUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addPendingSubmission(data) {
  if (typeof window === "undefined") return [];
  const list = getPendingSubmissions();
  const newItem = {
    id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    name: data.name || "Đoàn viên Mê Linh",
    age: data.age || "Tuổi trẻ",
    school: data.school || "Đoàn Thanh niên Mê Linh",
    imageSrc: data.imageSrc || "",
    altImageSrc: data.altImageSrc || "",
    submittedAt: new Date().toLocaleDateString("vi-VN"),
    status: "pending",
  };
  const updated = [newItem, ...list];
  window.localStorage.setItem(PENDING_YOUTH_STORAGE_KEY, JSON.stringify(updated));
  // Dispatch custom storage event for live reactive updates across tabs
  window.dispatchEvent(new Event("storage"));
  return updated;
}

export function rejectPendingSubmission(id) {
  if (typeof window === "undefined") return [];
  const list = getPendingSubmissions();
  const updated = list.filter((item) => item.id !== id);
  window.localStorage.setItem(PENDING_YOUTH_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("storage"));
  return updated;
}

export function approvePendingSubmission(id, content, saveContent) {
  const list = getPendingSubmissions();
  const item = list.find((t) => t.id === id);
  if (!item) return list;

  // Build new card object
  const newCard = {
    colorVariant: "archive-default",
    id: `member-${Date.now()}`,
    label: item.name,
    year: `${item.age} • ${item.school}`,
    imageAlt: `Đoàn viên ${item.name}`,
    imagePosition: "center 30%",
    imageSrc: item.imageSrc || "",
    altImageSrc: item.altImageSrc || "",
    size: "medium",
  };

  const updatedCards = [...content.villageArchive.cards, newCard];
  const updatedContent = {
    ...content,
    villageArchive: {
      ...content.villageArchive,
      cards: updatedCards,
    },
  };

  // Save to site content immediately
  saveContent(updatedContent);

  // Remove from pending list
  return rejectPendingSubmission(id);
}
