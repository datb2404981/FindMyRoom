export function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Không đọc được ảnh. Vui lòng chọn lại.'))
    reader.readAsDataURL(file)
  })
}
