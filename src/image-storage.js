// Keep embedded photos small enough for the browser-only dataset.
export async function optimizeStoredPhoto(url) {
  if (!url.startsWith('data:image/') || url.length <= 200000) return url
  const image = new Image()
  await new Promise((resolve, reject) => {
    image.onload = resolve
    image.onerror = () => reject(new Error('Không đọc được ảnh. Vui lòng chọn lại.'))
    image.src = url
  })
  const scale = Math.min(1, 1200 / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
  const optimized = canvas.toDataURL('image/webp', 0.78)
  return optimized.length < url.length ? optimized : url
}
