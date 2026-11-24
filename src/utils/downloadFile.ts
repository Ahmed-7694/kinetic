export function triggerBlobDownload(
  filename: string,
  content: string,
  mimeType: string = 'application/json;charset=utf-8'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export function downloadJsonFile(filename: string, data: unknown): void {
  triggerBlobDownload(filename, JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
}

export function downloadTextFile(
  filename: string,
  text: string,
  mimeType: string = 'text/plain;charset=utf-8'
): void {
  triggerBlobDownload(filename, text, mimeType);
}
