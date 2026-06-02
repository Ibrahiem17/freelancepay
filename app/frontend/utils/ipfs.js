const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export async function uploadToIPFS(file) {
  if (file.size > MAX_BYTES) {
    return { error: "File exceeds the 25 MB limit. Please choose a smaller file." };
  }

  const fd = new FormData();
  fd.append("file", file, file.name);

  let res, data;
  try {
    res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
      method: "POST",
      body: fd,
    });
    data = await res.json();
  } catch {
    return { error: "Network error during upload. Please try again." };
  }

  if (!res.ok) return { error: data.error || "Upload failed." };
  return { cid: data.cid, url: data.url, name: data.name };
}

export function parseSubmission(raw) {
  if (!raw) return { note: "", file: null, name: null };
  try {
    const parsed = JSON.parse(raw);
    return {
      note: typeof parsed.note === "string" ? parsed.note : raw,
      file: typeof parsed.file === "string" ? parsed.file : null,
      name: typeof parsed.name === "string" ? parsed.name : null,
    };
  } catch {
    return { note: raw, file: null, name: null };
  }
}
